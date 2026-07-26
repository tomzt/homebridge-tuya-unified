# homebridge-tuya-unified

Unified [Homebridge](https://homebridge.io) plugin for Tuya smart home devices, built on [homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform)'s Cloud API + MQTT architecture, that targets current Homebridge versions (v1.8 LTS and v2). A second device-discovery path — covering devices the official Cloud API can't see on its own — is planned but not yet built; see [Project status](#project-status).

> **This file is the source of truth for the project's description and setup.** A Thai translation is kept in [README.th.md](./README.th.md) for convenience — if the two ever disagree, this file wins. For task-by-task build progress across sessions, see [NOTES.md](./NOTES.md) instead — that's the authoritative, continuously-updated checklist.

> **Status: early development.** Cloud authentication, device discovery, and MQTT push are wired up, but no HomeKit accessories are registered yet. See [Project status](#project-status) below.

## Why this exists

[homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) (0x5e) is the actively maintained core this project is built on — its Cloud API + MQTT push architecture is ported and verified directly against its source. The official [tuya-homebridge](https://github.com/tuya/tuya-homebridge) plugin covers the same ground architecturally, but as of 2026 appears superseded: its own README credits 0x5e as the maintainer of the actively developed continuation, and it hasn't been pushed to in two years. It's credited in [NOTICE](./NOTICE) for historical reasons, not because code was copied from it.

In practice, the official Tuya Cloud API only sees devices explicitly linked to a Tuya Cloud Project — some real-world setups have devices that never got linked and only show up through Tuya's separate, unofficial "Web API" (the same one Home Assistant's legacy Tuya integration and [homebridge-tuya-web](https://github.com/milo526/homebridge-tuya-web) use). Covering that gap is planned but **not yet implemented** — see [Project status](#project-status) and [NOTES.md](./NOTES.md) for the current design status.

Neither upstream project implements local LAN device control — despite this project's package name, "local" control is a roadmap item, not a current feature; see [NOTES.md](./NOTES.md) for what was verified and why.

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

## Project status

Full detail and the live task checklist live in [NOTES.md](./NOTES.md); summary:

- **Scaffolding** — package/build/lint/CI setup, MIT license and [NOTICE](./NOTICE) attribution. Done.
- **Cloud/local core** — `TuyaOpenAPI` (signed REST client, Custom + Smart Home project login), `TuyaOpenMQ` (MQTT push), and the `TuyaDevice`/`TuyaDeviceManager` device layer are ported from [homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) (0x5e) and verified directly against its source. `src/platform.ts` authenticates, starts MQTT, and fetches the device/scene list. Done — Cloud + MQTT only, local LAN control is not implemented by either upstream project so it stays a roadmap item (`options.enableLocal` in [config.schema.json](./config.schema.json) describes a not-yet-built feature).
- **DP mapping + device services** — translating Tuya data points to HomeKit characteristics and registering actual accessories for the MVP categories (`Switch`/`Outlet`, `Lightbulb`/`Dimmer`, `WindowCovering`/`GarageDoorOpener`). Done and verified against real devices; other categories get a bare accessory (info only) with a logged warning rather than being silently skipped.
- **Second device-discovery path (unofficial Tuya Web API)** — covers devices that never got linked to a Tuya Cloud Project and so are invisible to the official Cloud API above. Not started — no config surface or code exists for this yet; see [NOTES.md](./NOTES.md) for the design status.
- **Tests** — Jest/ts-jest are configured but there are no test files yet.

See [NOTES.md](./NOTES.md) for the full task checklist and the reasoning behind each architecture decision.

## Credits

- [homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) by 0x5e (MIT)
- [tuya-homebridge](https://github.com/tuya/tuya-homebridge) by Tuya Inc. (MIT)

## License

MIT © tomzt — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
