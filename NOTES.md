# Project notes (source of truth across sessions)

This file — not any assistant's local `CLAUDE.md`, which is per-machine and does **not** sync across environments — is the durable record of scope, architecture decisions, and task progress for this repo. Update it at the end of every sub-task.

## MVP scope

- Switch / Socket → HomeKit `Switch` / `Outlet`
- Light / Bulb → HomeKit `Lightbulb`
- Curtain / Garage Door → HomeKit `WindowCovering` / `GarageDoorOpener`

See [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md) for the full category table.

## Approach

Port the cloud/local core from **[homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) (0x5e), branch `develop_1.7.0`**, as the base — not a merge/copy of both upstream repos. `tuya-homebridge` (official Tuya plugin) is credited in [NOTICE](./NOTICE) as prior art but is not being ported line-for-line; it was cross-checked once (see below) and found architecturally equivalent to 0x5e's Cloud+MQTT approach.

## Verified findings (checked against upstream source directly, 2026-07-21)

Do not take these as given without re-checking if upstream moves — they were confirmed by fetching `develop_1.7.0` via the GitHub API, not carried over secondhand:

- **No local LAN control exists in either upstream project.** Both `0x5e/homebridge-tuya-platform` and `tuya/tuya-homebridge` are **Cloud API + MQTT push only** — no UDP/TCP local-device code in either repo. `TuyaDevice.ip` is cloud metadata only, never used to open a local connection.
  - **Decision:** local LAN control stays a roadmap item, not implemented now. `enableLocal` in [config.schema.json](./config.schema.json) describes a not-yet-built feature — do not imply it works until it's actually built (and researched separately, e.g. against `tuyapi`'s local protocol, since neither credited upstream has it).
- **Push transport is plain MQTT (`mqtt` npm package), not Apache Pulsar.** The original scaffold's `package.json` depended on `pulsar-client`, which is unrelated tech (Apache Pulsar, native bindings) that neither upstream uses anywhere. Fixed: `pulsar-client` removed, `mqtt` added. `ws` was also removed — it was never used by anything and isn't what either upstream uses for MQTT (`ws` is a websocket library; Tuya's local protocol, when it's eventually built, uses raw TCP, not websockets).
- **`src/schema/` does not exist upstream** — the real structure is `src/core/` (`TuyaOpenAPI.ts`, `TuyaOpenMQ.ts`), `src/device/` (`TuyaDevice.ts`, `TuyaDeviceManager.ts` + `TuyaHomeDeviceManager.ts`/`TuyaCustomDeviceManager.ts` subclasses for the two Tuya IoT project types), `src/accessory/` (per-category handlers + `AccessoryFactory.ts` category→handler switch).
- **MVP category codes confirmed against `AccessoryFactory.ts` and `SUPPORTED_DEVICES.md`** (`develop_1.7.0`):
  - Switch: `kg`, `tdq` (also `dlq`, `qjdcz`, `szjqr` map to Switch upstream but are out of MVP scope)
  - Outlet: `cz`, `pc` (`wkcz` also maps upstream, out of scope)
  - Lightbulb: `dj`, `dsd`, `xdd`, `fwd`, `dc`, `dd`, `gyd`, `tyndj`, `sxd` (general light categories); `tgq`, `tgkg` (dimmers → also Lightbulb upstream)
  - WindowCovering: `cl`, `clkg`
  - GarageDoorOpener: `ckmkzq`

## Task checklist

- [x] **Scaffold** — package.json, tsconfig, ESLint flat config, config.schema.json, CI workflow, platform lifecycle stub that loads cleanly (commit `50abb33`)
- [ ] **Cloud/local core** — port `TuyaOpenAPI` (auth + signed REST client), `TuyaOpenMQ` (MQTT push, message decrypt/reorder), `TuyaDevice`/`TuyaDeviceManager`/`TuyaHomeDeviceManager`/`TuyaCustomDeviceManager` (device model + discovery for both Tuya project types). Cloud + MQTT only — local LAN excluded per above.
- [ ] **DP mapping** — data-point → HomeKit characteristic mapping for the 3 MVP categories, cross-checked against `BaseAccessory.ts` + category accessory files upstream.
- [ ] **Device services** — `AccessoryFactory` + `SwitchAccessory`/`OutletAccessory`/`LightAccessory`/`WindowCoveringAccessory`/`GarageDoorAccessory` handlers, scoped to MVP categories only (not the full upstream category list).
- [ ] **Homebridge v1.8+/v2 compat** — verify against both engine ranges declared in package.json.
- [ ] **Docs** — DP mapping table in SUPPORTED_DEVICES.md once implemented; keep README.md (EN, source of truth) and README.th.md (TH mirror) in sync.
- [ ] **Verify + push** — `npm run build` and `npm run lint` clean before every push.
