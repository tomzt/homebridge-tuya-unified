# homebridge-tuya-unified

Unified [Homebridge](https://homebridge.io) plugin for Tuya smart home devices, merging the capabilities of [homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) and the official [tuya-homebridge](https://github.com/tuya/tuya-homebridge) plugin into one package that targets current Homebridge versions (v1.8 LTS and v2).

> **Status: early development (MVP).** Only switch/socket, light/bulb, and curtain/garage door categories are supported so far. See [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md) for scope and roadmap.

## Why this exists

Both source plugins cover Tuya device categories thoroughly between them, but neither has kept pace with recent Homebridge releases. This project ports their Cloud + Local hybrid architecture (Tuya IoT Cloud API + local LAN control + MQTT push) into a single actively maintained plugin. Both upstream projects are MIT licensed — see [NOTICE](./NOTICE) for attribution.

## Requirements

- Homebridge `>=1.8.0` (v1.8 LTS or v2)
- Node.js 18.20+, 20.18+, or 22.10+
- An existing [Tuya IoT Platform](https://iot.tuya.com/) Cloud Project (Access ID/Secret) linked to your Tuya Smart / Smart Life app account — the same credentials used by the plugins above can be reused as-is.

## Installation

```
npm install -g homebridge-tuya-unified
```

Then configure the `TuyaUnified` platform via Homebridge Config UI X, or manually in `config.json` — see [config.schema.json](./config.schema.json) for the full set of options.

## Supported devices

See [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md).

## Credits

- [homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) by 0x5e (MIT)
- [tuya-homebridge](https://github.com/tuya/tuya-homebridge) by Tuya Inc. (MIT)

## License

MIT © tomzt — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
