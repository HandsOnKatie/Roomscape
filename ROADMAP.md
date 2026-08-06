# Roomscape roadmap

**Repo version: 0.10 (pre-release scaffold)** — the consumer version ships as **v1.00** when Phase 4 below is done. Engine files carry their own internal versions (conductor.js v4.24-derived).

## Done (v0.10 — this scaffold)
- Engine extracted from the reference install and de-personalized: no LAN IPs, entity ids, personal defaults, or credentials in code or config.
- Secrets moved to env (`HA_TOKEN` was already env-only; `MA_TOKEN`/`MA_URL` now env-first).
- Repo skeleton: docs, MIT licence, security model, Docker packaging, generic kiosk deploy kit.
- Theme-pack **format v1 specified** (docs/THEMES.md).

## Phase 1 — Separation ✅ DONE in v0.20
- ✅ `config.json` split out of `profiles.json` (layout/ha/rooms/edges/atRestMode); legacy fallback kept.
- ✅ Legacy built-in board-game entries removed from `engine.js`.
- ✅ Music token stripped/redacted on all profile-serving endpoints; secrets env-only.
- ✅ Superseded ROOMS PHASE blocks removed (−657 lines), runtime-verified dead; smoke harness added.
- ➡ Carried to Phase 2: port remaining route blocks to the central router (`modules/`); delete the dead ASSET UPLOAD + RULES & SCORES blocks and **re-implement `POST /api/upload` via the router** (it is currently dead at runtime — pre-existing bug found during the collapse).

## Phase 2 — Portability ✅ DONE in v0.30
- ✅ N-frame layout: panorama/wall math derived from layout; dynamic wall hosts; single frame-id source; frame pages accept any id.
- ✅ Roles (`primary`/`centers`/`corners`/`sweepOrder`) derived + config-overridable; games, rules wall, TTS, cue cards, sweeps all role-based. Classic-layout behaviour verified byte-identical.
- ✅ `atRestMode` wired end to end (`dining` stays the shipped default id).
- ✅ TV quirks per entity via `config.ha.tvQuirks` (legacy fallback kept).
- ✅ Registries consolidated (IE.KINDS / IE.VIZ_STYLES / IE.PLAYLIST_DISPLAYS); engine.js missing-`photos` renderer bug fixed.
- ✅ Router: dead blocks removed, `/api/upload` revived (pre-existing prod bug), 4 more blocks ported.
- ➡ Carried to Phase 3+: remaining prependListener blocks that wrap functions or chain responses (VARIANTS+PLAYLISTS shim, RULES SOUND/EDIT middleware, SCENE DIMS, REVEAL REEL) — port only with a router middleware concept; Sound Studio dead VIZ_STYLES variable cleanup.

## Phase 3 — Theme packs ✅ CODE DONE in v0.40
- ✅ Pack loader (namespaced dot ids, in-place media serving, semantic lights, MA music-query fallback, sections).
- ✅ Export/import over zip (pure-node, .trash safety net) + app UI (Theme packs sheet, badges, ctx-menu export).
- ✅ Missing-media placeholders (loader-flagged + generic onerror).
- ⏳ **Starter packs — waiting on D** (hand-built per locked decision 3): At Rest, Ocean Depths (demo pack ships, needs real media), Fireside Tavern, Game Night, Party. Storm Watch = build-it-yourself tutorial in THEMES.md.
- ➡ Later: export of Design-authored (non-pack) modes — needs media ref-walking of the host library ("pack builder").

## Phase 4 — First run & auth (target v0.9x → v1.00)
- First-run wizard: room name → HA entity pick → frame layout with identify-flash → starter themes.
- Admin token for mutating endpoints; CORS same-origin default; postMessage origin checks.
- Empty states (zero modes / zero media), visible Design entry, remap built-in Moment presets to starter sounds.
- Acceptance test: fresh Docker + HA → beautiful wall in 10 minutes → community theme zip imports cleanly.

## Explicitly out of scope for v1
Landscape screens (declared in schema, unsupported), data-driven party-game definitions, non-HA installs, internet exposure of any kind.
