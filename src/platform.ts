import { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

/**
 * Cloud/local device discovery, DP-to-HomeKit mapping, and per-category
 * accessory handlers are ported and implemented incrementally in follow-up
 * work (see project task list) — this class currently only wires up the
 * platform lifecycle so the plugin loads cleanly under Homebridge 1.8+/2.x.
 */
export class TuyaUnifiedPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: Map<string, PlatformAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

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

  discoverDevices(): void {
    // TODO: authenticate against the Tuya Cloud Project (accessId/accessSecret),
    // enumerate devices, and register MVP-category accessories
    // (switch/socket, light/bulb, curtain/garage door).
  }
}

export { PLATFORM_NAME, PLUGIN_NAME };
