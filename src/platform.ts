import { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TuyaUnifiedPlatformConfig, ProjectType } from './config';
import TuyaOpenAPI, { LOGIN_ERROR_MESSAGES } from './core/TuyaOpenAPI';
import TuyaDevice, { TuyaDeviceStatus } from './device/TuyaDevice';
import TuyaDeviceManager from './device/TuyaDeviceManager';
import TuyaHomeDeviceManager from './device/TuyaHomeDeviceManager';
import TuyaCustomDeviceManager from './device/TuyaCustomDeviceManager';
import AccessoryFactory from './accessory/AccessoryFactory';
import BaseAccessory from './accessory/BaseAccessory';

/**
 * Cloud login (both Custom and Smart Home Tuya IoT project types), device
 * discovery, and MQTT push are wired up here, along with DP-to-HomeKit
 * mapping for the MVP categories (see NOTES.md "MVP scope") via
 * AccessoryFactory. Devices outside that category set still get a bare
 * accessory (info + battery service, no controls) rather than being skipped.
 */
export class TuyaUnifiedPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // Cached/registered PlatformAccessory instances, keyed by HomeKit UUID.
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  // Live accessory handlers (DP mapping + HomeKit wiring), keyed by Tuya device ID.
  public readonly handlers: Map<string, BaseAccessory> = new Map();

  public readonly options: TuyaUnifiedPlatformConfig;
  public deviceManager?: TuyaDeviceManager;
  public devices: TuyaDevice[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
    this.options = this.config as TuyaUnifiedPlatformConfig;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  async discoverDevices(): Promise<void> {
    const projectType = this.options.options?.projectType ?? ProjectType.HOME;

    const devices = (projectType === ProjectType.CUSTOM)
      ? await this.initCustomProject()
      : await this.initHomeProject();

    if (!devices || !this.deviceManager) {
      return;
    }

    this.devices = devices;
    this.log.info(`Got ${devices.length} device(s) and scene(s) from Tuya Cloud.`);

    // Register/refresh an accessory for every device, then drop cached
    // accessories that no longer correspond to a known device.
    const staleUUIDs = new Set(this.accessories.keys());
    for (const device of devices) {
      this.addAccessory(device);
      staleUUIDs.delete(this.api.hap.uuid.generate(device.id));
    }
    for (const uuid of staleUUIDs) {
      const accessory = this.accessories.get(uuid)!;
      this.log.info('Removing unused accessory from cache:', accessory.displayName);
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.delete(uuid);
    }

    this.deviceManager.on(TuyaDeviceManager.Events.DEVICE_ADD, (device: TuyaDevice) => {
      this.log.info('Device added:', device.name);
      this.devices.push(device);
      this.addAccessory(device);
    });
    this.deviceManager.on(TuyaDeviceManager.Events.DEVICE_DELETE, (deviceID: string) => {
      this.log.info('Device removed:', deviceID);
      this.devices = this.devices.filter(device => device.id !== deviceID);
      this.removeAccessory(deviceID);
    });
    this.deviceManager.on(TuyaDeviceManager.Events.DEVICE_STATUS_UPDATE, (device: TuyaDevice, status: TuyaDeviceStatus[]) => {
      this.log.debug('Device status updated:', device.name);
      this.handlers.get(device.id)?.onDeviceStatusUpdate(status);
    });
    this.deviceManager.on(TuyaDeviceManager.Events.DEVICE_INFO_UPDATE, (device: TuyaDevice, info) => {
      this.log.debug('Device info updated:', device.name);
      this.handlers.get(device.id)?.onDeviceInfoUpdate(info);
    });
  }

  /**
   * Create (or reuse a cached) PlatformAccessory for a device, wire it up
   * via AccessoryFactory, and register it with Homebridge if it's new.
   */
  addAccessory(device: TuyaDevice) {
    const uuid = this.api.hap.uuid.generate(device.id);
    let accessory = this.accessories.get(uuid);
    let isNew = false;

    if (!accessory) {
      isNew = true;
      accessory = new this.api.platformAccessory(device.name, uuid);
    }
    accessory.context.deviceID = device.id;

    const handler = AccessoryFactory.createAccessory(this, accessory, device);
    this.handlers.set(device.id, handler);
    this.accessories.set(uuid, accessory);

    if (isNew) {
      this.log.info('Adding new accessory:', device.name);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  removeAccessory(deviceID: string) {
    const handler = this.handlers.get(deviceID);
    if (!handler) {
      return;
    }

    this.handlers.delete(deviceID);
    this.accessories.delete(handler.accessory.UUID);
    this.log.info('Removing accessory:', handler.accessory.displayName);
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [handler.accessory]);
  }

  private async initHomeProject(): Promise<TuyaDevice[] | undefined> {
    const { endpoint, accessId, accessSecret, countryCode, username, password, appSchema } = this.options;
    const countryCodeNumber = Number(countryCode);

    const api = new TuyaOpenAPI(
      endpoint || TuyaOpenAPI.getDefaultEndpoint(countryCodeNumber),
      accessId,
      accessSecret,
      this.log,
    );
    const deviceManager = new TuyaHomeDeviceManager(api);

    this.log.info('Logging in to Tuya Cloud (Smart Home project)...');
    let res = await api.homeLogin(countryCodeNumber, username, password, appSchema);
    if (res.success === false) {
      this.log.error(`Login failed. code=${res.code}, msg=${res.msg}`);
      if (LOGIN_ERROR_MESSAGES[res.code]) {
        this.log.error(LOGIN_ERROR_MESSAGES[res.code]);
      }
      return undefined;
    }

    this.log.info('Starting MQTT connection...');
    deviceManager.mq.start();

    this.log.info('Fetching home list...');
    res = await deviceManager.getHomeList();
    if (res.success === false) {
      this.log.error(`Fetching home list failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }

    const homeIDList: number[] = res.result.map(({ home_id, name }) => {
      this.log.info(`Got home_id=${home_id}, name=${name}`);
      return home_id;
    });

    if (homeIDList.length === 0) {
      this.log.warn('Home list is empty.');
    }

    this.log.info('Fetching device list...');
    deviceManager.ownerIDs = homeIDList.map(homeID => homeID.toString());
    const devices = await deviceManager.updateDevices(homeIDList);

    this.log.info('Fetching scene list...');
    for (const homeID of homeIDList) {
      const scenes = await deviceManager.getSceneList(homeID);
      devices.push(...scenes);
    }

    this.deviceManager = deviceManager;
    return devices;
  }

  private async initCustomProject(): Promise<TuyaDevice[] | undefined> {
    const DEFAULT_USER = 'homebridge';
    const DEFAULT_PASS = 'homebridge';

    const { endpoint, accessId, accessSecret } = this.options;
    const api = new TuyaOpenAPI(endpoint, accessId, accessSecret, this.log);
    const deviceManager = new TuyaCustomDeviceManager(api);

    this.log.info('Getting token (Custom project)...');
    let res = await api.getToken();
    if (res.success === false) {
      this.log.error(`Get token failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }

    this.log.info(`Searching default user "${DEFAULT_USER}"...`);
    res = await api.customGetUserInfo(DEFAULT_USER);
    if (res.success === false) {
      this.log.error(`Search user failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }

    if (!res.result.user_name) {
      this.log.info(`Creating default user "${DEFAULT_USER}"...`);
      res = await api.customCreateUser(DEFAULT_USER, DEFAULT_PASS);
      if (res.success === false) {
        this.log.error(`Create default user failed. code=${res.code}, msg=${res.msg}`);
        return undefined;
      }
    }
    const uid = res.result.user_id;

    this.log.info('Fetching asset list...');
    res = await deviceManager.getAssetList();
    if (res.success === false) {
      this.log.error(`Fetching asset list failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }

    const assetIDList: string[] = res.result.list.map(({ asset_id, asset_name }) => {
      this.log.info(`Got asset_id=${asset_id}, asset_name=${asset_name}`);
      return asset_id;
    });

    if (assetIDList.length === 0) {
      this.log.warn('Asset list is empty.');
      return undefined;
    }

    this.log.info('Authorizing asset list...');
    res = await deviceManager.authorizeAssetList(uid, assetIDList, true);
    if (res.success === false) {
      this.log.error(`Authorize asset list failed. code=${res.code}, msg=${res.msg}`);
      return undefined;
    }

    this.log.info(`Logging in with user "${DEFAULT_USER}"...`);
    res = await api.customLogin(DEFAULT_USER, DEFAULT_USER);
    if (res.success === false) {
      this.log.error(`Login failed. code=${res.code}, msg=${res.msg}`);
      if (LOGIN_ERROR_MESSAGES[res.code]) {
        this.log.error(LOGIN_ERROR_MESSAGES[res.code]);
      }
      return undefined;
    }

    this.log.info('Starting MQTT connection...');
    deviceManager.mq.start();

    this.log.info('Fetching device list...');
    deviceManager.ownerIDs = assetIDList;
    const devices = await deviceManager.updateDevices(assetIDList);

    this.deviceManager = deviceManager;
    return devices;
  }
}

export { PLATFORM_NAME, PLUGIN_NAME };
