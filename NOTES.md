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

### Scope correction (2026-07-26): a third source is in scope — `@milo526/homebridge-tuya-web`

During real-device testing, some of the user's devices weren't discoverable through the official Tuya Cloud API path (0x5e/tuya-homebridge architecture) at all — only through `@milo526/homebridge-tuya-web`, which the user confirmed (with a screenshot of their live production Homebridge instance) they run **alongside** `@0x5e/homebridge-tuya-platform` specifically because neither one alone sees their full device list. This wasn't recorded anywhere in this file before now; earlier text here and in README only named two sources. Treat this correction as authoritative — it's based on the user's own confirmed production setup, not a guess.

What's different about this third source, verified against its repo (`milo526/homebridge-tuya-web`, MIT, actively maintained — pushed 2026-07-22, verified-by-homebridge + certified-by-hoobs):
- **Different auth entirely**: a private/reverse-engineered "Tuya Web API" (same one Home Assistant's legacy Tuya integration used, via the `tuyaha` approach) — just `username`/`password`/`countryCode`/`platform` (`tuya`/`smart_life`/`jinvoo_smart`) against the app account directly. **No Tuya IoT Cloud Project, no Access ID/Secret, no "Link App Account" step at all.** This is precisely why it can see devices the Cloud-API path can't: it bypasses Cloud Project device-linking/authorization scope entirely.
- Own device/DP model, unrelated to the `TuyaDeviceSchema` structure ported from 0x5e this session — integrating it is not "add another config option," it's a second parallel device-discovery + status/control pipeline.
- Has features not in our current plugin: configurable polling interval, per-device type override, device hiding, scene whitelisting.
- Real risk to weigh: it's an **unofficial** API with no support contract — could break without notice if Tuya changes it, unlike the officially documented signed Cloud API this plugin is otherwise built on.

**Not yet designed or implemented.** This needs its own architecture pass (how the two device-discovery paths coexist, how to de-dupe devices reported by both, config schema shape) before writing code — do not start porting from it without that design step, same rule as everything else in this file.

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

## Bugs found + fixed during first real-device testing (2026-07-26)

- **`countryCode` scroll-wheel bug**: was a plain `"type": "integer"` field in config.schema.json. Homebridge UI renders that as an `<input type="number">`, which browsers silently increment/decrement on mouse-wheel scroll while the field has focus — user typed `66` (Thailand), it silently became `64` on save. Fixed: `countryCode` is now `"type": "string"` with a `"pattern": "^[0-9]+$"`; `src/platform.ts` converts it to a number at the point of use (`Number(countryCode)`) before calling `TuyaOpenAPI`. Considered a `oneOf` dropdown of country codes but couldn't verify a complete official Tuya-specific list without an authenticated API call (`GET /v3.0/iot-03/all-countries` only returns data live, not published statically) — decided against guessing a list from memory, kept it as a validated text field instead.
- **`endpoint` labels mismatched real Tuya region names, causing login to fail with `code=1106, msg=permission deny`**: the original labels ("America", "America (Azure)", "Europe (MS)") were carried over from upstream's internal enum names, not Tuya's actual data center names. Confirmed via [Tuya's data center docs](https://developer.tuya.com/en/docs/iot/Data_Center_Introduction?id=Kav2hlac2ppnw): "America (Azure)" is actually the **Eastern** America Data Center, while plain "America" is the **Western** America Data Center — the opposite of what the label wording suggests. A user whose Cloud Project is on the Western America Data Center selected "America (Azure)" (reasonable guess from the label) and got a permission-denied login failure despite fully correct credentials and a properly linked app account — wrong regional endpoint, not a credentials problem. Fixed: `config.schema.json`'s `endpoint` options now use Tuya's exact current data-center names ("Western America Data Center", "Eastern America Data Center", etc., per the picker on iot.tuya.com) instead of the old short labels, plus a description telling users to match whatever their Cloud Project's console shows. Lesson: don't carry over upstream's internal/legacy naming into user-facing labels without checking what users actually see in Tuya's own UI.

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
  - `npm run build` and `npm run lint` both pass clean (0 errors, warnings only, all pre-existing patterns).
  - **Verified against real devices (2026-07-26, Mac mini dev sandbox)**: logged in successfully (Smart Home project, Western America Data Center), fetched 19 real devices/scenes from the user's home ("บ้านขวัญต้นข้าว"), and registered/restored HomeKit accessories for them without error. Devices outside MVP scope (`jtmspro` smart lock, `ktkzq` air conditioner x2, `kj` air purifier) correctly fell back to bare `BaseAccessory` with a logged warning instead of erroring — working as designed.
  - **Known non-blocking issue found during real testing**: HAP-NodeJS's `Name` characteristic validator warns on Thai-language device names (e.g. "ไฟห้องครัว") — `Please ensure the name starts and ends with a letter or number... Only letters, numbers, spaces, apostrophes, and common punctuation are supported.` This is a HAP-NodeJS-level limitation (its validator appears Latin-alphabet-centric), not specific to this plugin's code — affects any Homebridge plugin exposing non-Latin device names. Not fixed, not blocking (devices still function); worth a closer look later if it turns out to actually prevent Home App pairing rather than just warn.
  - **Two real bugs found and fixed via this testing**: (1) `EnergyUsage.ts`'s Amperes getter divided by 0 instead of 1 for non-mA current schemas (upstream bug, ported verbatim, only caught empirically) — fixed, and the getter now guards against any non-finite result (logs full context and reports 0 instead of letting Infinity/NaN reach HomeKit). (2) See "Bugs found + fixed" section above for the `countryCode` and `endpoint` config bugs.
- [ ] **Homebridge v1.8+/v2 compat** — verify against both engine ranges declared in package.json.
- [ ] **Docs** — DP mapping table in SUPPORTED_DEVICES.md once implemented; keep README.md (EN, source of truth) and README.th.md (TH mirror) in sync.
- [ ] **Verify + push** — `npm run build` and `npm run lint` clean before every push.
