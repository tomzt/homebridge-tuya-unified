import { PlatformAccessory } from 'homebridge';
import TuyaDevice from '../device/TuyaDevice';
import { TuyaUnifiedPlatform } from '../platform';

import BaseAccessory from './BaseAccessory';
import SwitchAccessory from './SwitchAccessory';
import OutletAccessory from './OutletAccessory';
import LightAccessory from './LightAccessory';
import DimmerAccessory from './DimmerAccessory';
import WindowCoveringAccessory from './WindowCoveringAccessory';
import GarageDoorAccessory from './GarageDoorAccessory';

/**
 * Category -> handler mapping, scoped to the MVP categories only (see
 * NOTES.md "MVP scope"). Category codes verified against upstream
 * AccessoryFactory.ts + SUPPORTED_DEVICES.md (0x5e/homebridge-tuya-platform,
 * develop_1.7.0). Anything outside this list falls back to plain
 * BaseAccessory (accessory info + battery service only, no controls) with a
 * warning — that's a visible "unsupported" state, not a silent failure.
 */
export default class AccessoryFactory {
  static createAccessory(
    platform: TuyaUnifiedPlatform,
    accessory: PlatformAccessory,
    device: TuyaDevice,
  ): BaseAccessory {

    let handler: BaseAccessory | undefined;
    switch (device.category) {

      // Lighting
      case 'dj':
      case 'dsd':
      case 'xdd':
      case 'fwd':
      case 'dc':
      case 'dd':
      case 'gyd':
      case 'tyndj':
      case 'sxd':
        handler = new LightAccessory(platform, accessory);
        break;
      case 'tgq':
      case 'tgkg':
        handler = new DimmerAccessory(platform, accessory);
        break;

      // Electrical Products
      case 'kg':
      case 'tdq':
        handler = new SwitchAccessory(platform, accessory);
        break;
      case 'cz':
      case 'pc':
        handler = new OutletAccessory(platform, accessory);
        break;

      // Curtain / Garage Door
      case 'ckmkzq':
        handler = new GarageDoorAccessory(platform, accessory);
        break;
      case 'cl':
      case 'clkg':
        handler = new WindowCoveringAccessory(platform, accessory);
        break;
    }

    if (handler && !handler.checkRequirements()) {
      handler = undefined;
    }

    if (!handler) {
      platform.log.warn(`Unsupported device: ${device.name} (category: ${device.category}).`);
      handler = new BaseAccessory(platform, accessory);
    }

    handler.configureServices();
    handler.configureStatusActive();
    handler.updateAllValues();
    handler.intialized = true;

    return handler;
  }
}
