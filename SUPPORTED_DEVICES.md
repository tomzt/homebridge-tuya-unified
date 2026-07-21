# Supported Devices

## MVP (current)

| Category | HomeKit Service | Status |
| --- | --- | --- |
| Switch / Socket (wall switch, smart plug, power strip) | `Switch` / `Outlet` | In progress |
| Light / Bulb (dimmer, LED strip, color bulb) | `Lightbulb` | In progress |
| Curtain / Garage Door | `WindowCovering` / `GarageDoorOpener` | In progress |

Exact Tuya category codes and data-point (DP) mappings for each of the above are being verified against both upstream projects' device tables and will be documented here once implemented (tracked separately from this initial scaffold).

## Roadmap (not yet supported)

Sensors (motion/contact/temperature-humidity), locks, IR remote control, cameras, thermostats/climate, and the remaining 50+ categories that `homebridge-tuya-platform` and `tuya-homebridge` cover between them. These will be added incrementally after the MVP categories are stable and tested against real hardware.
