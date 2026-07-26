# Project notes (source of truth across sessions)

This file is the durable, cross-session record of scope, architecture decisions, and task progress for this repo. Update it at the end of every sub-task.

**Note on `CLAUDE.md`:** the project-root [CLAUDE.md](./CLAUDE.md) in this repo **is git-tracked and committed** (confirmed 2026-07-26, commits `f437484`/`c79f292`) and is the source of truth for the Mac mini dev/deploy workflow specifically (SSH, docker-compose paths, container quirks). An earlier version of this note warned that "CLAUDE.md doesn't sync across environments" — that was about a *different, unrelated* machine's global `~/.claude/CLAUDE.md` config encountered during an early session, not this file. Don't assume this repo's `CLAUDE.md` is stale or machine-local without checking `git log CLAUDE.md` first.

## Working Agreement

Standing practice for every session that works on this project — applies for the life of the project, not just one task.

Before porting/writing any code:
1. Always check the real upstream source (`0x5e/homebridge-tuya-platform` branch `develop_1.7.0`, `tuya/tuya-homebridge`) before deciding on architecture or copying any structure/logic. Never rely on memory or assumption alone, no matter how confident it feels.

After editing any file the end user sees directly (README, config.schema.json, NOTICE, SUPPORTED_DEVICES.md):
2. Verify every field's description/default matches what the code actually does at that point in time. No field's description may claim something "works" while the code doesn't implement it yet (lesson from the `enableLocal` case, fixed in commit `d18049f`) — if it's not implemented, say so plainly.

Before saying a task is done or pushed:
3. Always `build` + `lint` locally first. Never assume they pass.
4. After pushing, confirm by pulling the real code back from GitHub (fresh `git pull` or `gh api` without going through a cache) — don't just trust that push succeeded because the command didn't error. If checking via a cached web/API path (e.g. `raw.githubusercontent.com`), be aware it can serve stale data.

At the end of every sub-task:
5. Update NOTES.md immediately to match the latest real state (this file is the one thing that actually persists across sessions — not anyone's local `~/.claude/CLAUDE.md`).

Constraints to keep in mind for the whole project:
6. Never claim "tested against real hardware" unless it was actually tested on a real Homebridge instance with access to the user's home LAN — the sandbox can only make Cloud calls through a proxy.
7. If you hit uncertainty or conflicting information while working, report it immediately instead of guessing and silently moving on.

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
  - **Decision:** local LAN control stays a roadmap item, not implemented now. `enableLocal` in [config.schema.json](./config.schema.json) now defaults to `false` with a description stating it's not yet implemented (fixed — it previously defaulted `true` with a description implying it already worked, which was misleading). Don't flip the default or claim it works until local control is actually built (and researched separately, e.g. against `tuyapi`'s local protocol, since neither credited upstream has it). Starting point when this gets picked up: [homebridge-tuya-local](https://www.npmjs.com/package/homebridge-tuya-local) (user-suggested 2026-07-26) — not yet evaluated, just a lead to check against `tuyapi`'s local protocol before copying anything from it.
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
- [x] **Cloud/local core** — ported `TuyaOpenAPI` (auth + signed REST client), `TuyaOpenMQ` (MQTT push, message decrypt/reorder), `TuyaDevice`/`TuyaDeviceManager`/`TuyaHomeDeviceManager`/`TuyaCustomDeviceManager` (device model + discovery for both Tuya project types), `util/Logger` (PrefixLogger). `platform.ts` now logs in (Custom or Smart Home project type, per `options.projectType`), starts MQTT, and fetches the device/scene list — but does not yet register HomeKit accessories for them (that's "Device services" below). `tsconfig.json` needed `"noImplicitAny": false` added to match upstream's own tsconfig — the ported code relies on it throughout for the loosely-typed Tuya API responses. Cloud + MQTT only — local LAN excluded per above. `npm run build` and `npm run lint` both pass clean (0 errors).
- [x] **Dev deploy loop (Mac mini)** — verified working end-to-end: `git pull` → `npm install`+`npm run build` inside the `homebridge-dev` container → `npm install /plugin --save` into `/var/lib/homebridge` (not a raw symlink, and not `/homebridge` — see [CLAUDE.md](./CLAUDE.md) for why the naive approach silently fails on this image) → `docker restart homebridge-dev`. Confirmed via container logs: `Loaded plugin: homebridge-tuya-unified@0.1.0`, `Registering platform 'homebridge-tuya-unified.TuyaUnified'` (2026-07-26). `~/hb-dev/deploy.sh` on the mini implements this; not committed to this repo (machine-local tooling).
- [x] **DP mapping + Device services** — ported and wired together (they were inseparable in practice — upstream's DP-mapping helpers live inside the accessory handler classes). Verified against upstream (0x5e, `develop_1.7.0`) file-by-file, not from memory:
  - `src/accessory/BaseAccessory.ts` — plain `BaseAccessory` only. Upstream's `OverridedBaseAccessory` (per-device `deviceOverrides` config with `eval()`-based onGet/onSet transforms) was **not** ported — no config surface for it exists in this plugin, and porting an eval-based override system without deciding on/reviewing that config surface first felt like the wrong order. Roadmap item if ever needed.
  - `src/accessory/characteristic/{Name,On,EnergyUsage,CurrentTemperature,CurrentRelativeHumidity,Light,MotionDetected}.ts` — ported. `Light.ts`'s adaptive lighting hook was stripped (`accessory.platform.getDeviceConfig(...)` doesn't exist here — same `deviceOverrides` dependency as above).
  - `src/accessory/{SwitchAccessory,OutletAccessory,LightAccessory,DimmerAccessory,WindowCoveringAccessory,GarageDoorAccessory}.ts` — ported near-verbatim. `DimmerAccessory` was added beyond the original MVP list after checking its actual code: an earlier note here said `tgq`/`tgkg` (dimmers) could reuse `LightAccessory`, but `DimmerAccessory` turns out to have real dimmer-specific behavior (runtime brightness-range remap from `brightness_min`/`brightness_max`) that `LightAccessory` doesn't handle — routing dimmers through `LightAccessory` would have been wrong, so it got its own file instead (correction to the 2026-07-21 note).
  - `src/accessory/AccessoryFactory.ts` — adapted: category switch trimmed to MVP-scope codes only (`kg`/`tdq`→Switch, `cz`/`pc`→Outlet, light categories→Light, `tgq`/`tgkg`→Dimmer, `cl`/`clkg`→WindowCovering, `ckmkzq`→GarageDoor); everything else falls back to plain `BaseAccessory` with a warning log rather than being silently skipped.
  - `src/util/util.ts` (`limit`/`remap`) and `src/util/color.ts` (`kelvinToHSV`/`kelvinToMired`/`miredToKelvin`, needs `color-convert` + `kelvin-to-rgb`) ported verbatim.
  - `src/platform.ts` — now actually registers/updates/removes HomeKit accessories: `addAccessory()`/`removeAccessory()` wired to `AccessoryFactory`, `handlers: Map<deviceID, BaseAccessory>` added for routing `DEVICE_STATUS_UPDATE`/`DEVICE_INFO_UPDATE` events to the right handler, stale cached accessories pruned on startup.
  - Added a real `options.debug` boolean to `config.schema.json`/`src/config.ts` (honest, implemented — gates `PrefixLogger` verbosity). Did not port upstream's per-device `debugLevel` string filter; not worth the config surface for what it does.
  - Not ported (upstream feature, no equivalent here, all `deviceOverrides`-dependent or out of MVP scope): schema overrides/eval, adaptive lighting, category/unbridged overrides, the `TuyaDeviceList.<uid>.json` debug dump under `persistPath`, IR hub/remote accessories, all non-MVP category handlers.
  - `npm run build` and `npm run lint` both pass clean (0 errors, warnings only, all pre-existing patterns) — not yet tested against a real Tuya device or on the Mac mini dev sandbox.
- [ ] **Homebridge v1.8+/v2 compat** — verify against both engine ranges declared in package.json.
- [ ] **Docs** — DP mapping table in SUPPORTED_DEVICES.md once implemented; keep README.md (EN, source of truth) and README.th.md (TH mirror) in sync.
- [ ] **Verify + push** — `npm run build` and `npm run lint` clean before every push.
