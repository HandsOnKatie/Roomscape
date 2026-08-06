# Roomscape roadmap

**Repo version: 0.10 (pre-release scaffold)** — the consumer version ships as **v1.00** when Phase 4 below is done. Engine files carry their own internal versions (conductor.js v4.24-derived).

## Done (v0.10 — this scaffold)
- Engine extracted from the reference install and de-personalized: no LAN IPs, entity ids, personal defaults, or credentials in code or config.
- Secrets moved to env (`HA_TOKEN` was already env-only; `MA_TOKEN`/`MA_URL` now env-first).
- Repo skeleton: docs, MIT licence, security model, Docker packaging, generic kiosk deploy kit.
- Theme-pack **format v1 specified** (docs/THEMES.md).

## Phase 1 — Separation (target v0.2x)
- `config.json` (layout, HA entities, zones, rooms, at-rest mode) split out of `profiles.json`; legacy fallback kept.
- Remove the legacy built-in board-game entries from `app/engine.js` (GAMES/MODES lists still name commercial titles and reference reference-install scene keys; harmless — frames fall back gracefully — but they should go with the config split).
- Strip `settings.music` from all profile-serving endpoints.
- Collapse the 7 superseded ROOMS PHASE blocks; port remaining route blocks to the central router (`modules/`).

## Phase 2 — Portability (target v0.3x–0.4x)
- Finish N-frame layout: derive panorama math from layout (kill `%3` / two-wall assumptions), generate wall hosts, single frame-id source.
- **Roles, not TV names**: `centers` / `corners` / `primary` / `sweepOrder` resolved from layout; games, rules wall, TTS, spatial audio use roles.
- Rename the magic at-rest id (`atRestMode` in config, `dining` kept as alias).
- TV quirks per entity (`samsung-frame` art-mode semantics) instead of name-substring matching.
- Consolidate the duplicated registries (frame kinds ×5, viz styles ×4) to single sources.

## Phase 3 — Theme packs (target v0.5x–0.6x)
- Pack loader (namespace ids, pack-relative media index, semantic-light resolution, MA music query flow).
- `GET /api/theme/export/<id>` + `POST /api/theme/import` + app UI.
- Missing-media placeholders.
- Starter packs (hand-built, CC0/own media): At Rest, Ocean Depths, Fireside Tavern, Game Night, Party. Storm Watch ships as the build-it-yourself tutorial in THEMES.md.

## Phase 4 — First run & auth (target v0.9x → v1.00)
- First-run wizard: room name → HA entity pick → frame layout with identify-flash → starter themes.
- Admin token for mutating endpoints; CORS same-origin default; postMessage origin checks.
- Empty states (zero modes / zero media), visible Design entry, remap built-in Moment presets to starter sounds.
- Acceptance test: fresh Docker + HA → beautiful wall in 10 minutes → community theme zip imports cleanly.

## Explicitly out of scope for v1
Landscape screens (declared in schema, unsupported), data-driven party-game definitions, non-HA installs, internet exposure of any kind.
