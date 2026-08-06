# Changelog

## 1.00 — 2026-08-06 (conductor v5.00 · app v3.83 · engine v0.91 · fx v1.61)
**First feature-complete release.** Phases 4a+4b on top of 0.40:
- **Admin token (RS-AUTH v1)** — every mutating call requires `x-rs-token` (env `ADMIN_TOKEN`, `data/admin-token`, or generated + printed at first boot). Chain-capture gate: unauthorized requests never reach a handler. `auth.enabled:false` opt-out; `/api/tag/*` open by default for HA NFC (closable). No localhost bypass (Docker makes it meaningless).
- **CORS locked to same-origin by default** (`config.cors` re-opens deliberately); engine.js postMessage now origin-checked both directions.
- **First-run wizard** — 🚀 setup card on fresh installs: room name → screen layout (1–8 frames, wall arrangements) → HA TV mapping with per-frame Identify flash → light zones → theme packs. Every step skippable; reopenable from Settings. Backed by new `POST /api/config` (whitelisted, .bak'd, live layout re-derive) and token-gated `GET /api/ha/entities`.
- **Empty states fixed**: zero modes now shows a proper invitation (was: blank screen + a phantom "undefined" mode in Design); visible ✏️ Design button (long-press kept).
- **Starter sounds**: six synthesized CC0 WAVs in `sounds/starter/`; all Moments/intro presets and the party-games sound map remapped — zero references to private library files remain, and no preset claims a sound it doesn't have.
- Smoke v1.7: 63 checks incl. auth 401/200 paths, token generation boot, config live-apply, wizard canaries, starter-sound integrity.

**Known gaps at v1.00** (tracked in ROADMAP): starter theme packs are hand-produced content, landing as they're made; landscape screens unsupported; a handful of legacy prependListener blocks remain by design (response-chaining middleware).

## 0.40 — 2026-08-06 (conductor v4.64 · app v3.63 · engine v0.90 · fx v1.61)
**Phase 3 — Theme packs.** The headline feature, end to end.
- **Loader (RS-THEMES v1)**: packs in `themes/` scan at boot/rescan; modes register in-memory under namespaced dot ids (`ocean-depths.main`) — never written to profiles.json; pack media serves in place (`__theme__/` pseudo-rels, containment-checked); semantic lights resolve against the host's zone map; `music: {query}` matches MA playlists with substring fallback; pack sections auto-merge into Play.
- **Export/import**: `GET /api/theme/export/<pack>` (zip) and `POST /api/theme/import` (validated, whitelisted, 409+overwrite staging, replaced packs kept in `themes/.trash` — nothing ever deleted). Pure-node zip reader/writer (`conductor-lib/zip.js`), zip-bomb and traversal guarded.
- **App UI**: Settings → 🧩 Theme packs sheet (list, missing-file expandables, import with conflict dialog, per-pack export); 🧩 badges on theme mode cards; Design context-menu export.
- **Missing media renders labelled 🧩 placeholders** (never blanks), plus a generic onerror fallback for any dead media element.
- `themes/ocean-depths` is now a working demo pack (placeholder scene ships; absent effect/sound files demonstrate the missing-file flow).
- `/api/health` version string unstuck (was hardcoded '4.24').
- Smoke v1.5: 39 checks incl. export magic-bytes/content parse, import 409/overwrite/.trash, traversal zip rejection.

## 0.30 — 2026-08-06 (conductor v4.44 · app v3.53 · engine v0.89 · fx v1.51)
**Phase 2 — Portability.** Any wall layout, roles instead of TV names, single-source registries.
- **N-frame layouts**: all wall-of-3 math (`%3`, two-wall assumptions, `width:300%`, GL shader slots) now derives from the layout; Design canvas generates wall hosts dynamically (1..N walls); frame pages accept any frame id and adopt the server layout before fx modules load.
- **Roles**: `/api/layout` always serves derived roles (`primary`, `centers`, `corners`, `sweepOrder` — config-overridable). Party games, rules wall, cue cards, TTS speaker, rules-sound and audio sweeps all resolve roles, not literals. Byte-identical behaviour on the classic 6-frame layout (verified by equivalence harness).
- **At-rest**: `atRestMode` (config) wired through conductor + frontend; `dining` remains the shipped default id.
- **TV quirks**: Samsung Frame art-mode wake shim now keyed by `config.ha.tvQuirks` entity map (legacy substring fallback kept).
- **Router migration**: dead ASSET UPLOAD + RULES & SCORES blocks deleted; **`POST /api/upload` re-implemented via the router (fixes a pre-existing prod bug — the endpoint was dead at runtime)**; mediafx/modeposters/social-config/viz routes ported to the route table.
- **Registries consolidated**: frame kinds → single `IE.KINDS` (fixes missing `photos` renderer in engine.js); `IE.VIZ_STYLES` + `IE.PLAYLIST_DISPLAYS` single-sourced with drift warnings; unknown kinds/displays render labelled placeholders instead of blanks.
- Smoke test v1.2: 22 checks incl. custom-layout boot, roles derivation, upload round-trip, traversal rejection.

## 0.20 — 2026-08-06 (conductor v4.34)
- **`config.json`** — layout (walls/frames/roles/orientation), HA entities, rooms, edges, and `atRestMode` split out of `profiles.json`. Absent file = legacy behaviour. `/api/layout` now serves `roles`, `orientation`, `atRest`.
- **Security:** Music Assistant token is redacted from every profile-serving endpoint (`/api/profiles`, `-history`, `-live`, `-baks`); POST round-trips preserve a stored token instead of wiping it. Secrets are env-only (`MA_URL`/`MA_TOKEN`).
- **Dead code removed:** the five superseded ROOMS phase blocks (runtime-verified dead) — conductor.js −657 lines. `FALLBACK_ROOMS` consolidated to one definition.
- engine.js legacy built-in game registries trimmed to the at-rest entry (commercial titles removed from code).
- Smoke-test harness (`scripts/smoke.js`, 11 checks) — gates all refactors.
- Known issue found during the collapse: `POST /api/upload` has been dead at runtime (its listener was nuked by the 2.4 consolidation) — re-implementation via the router is on the roadmap.

## 0.10 — 2026-08-06
- Initial pre-release scaffold, extracted from the reference installation.
- Engine: conductor (v4.24-derived) + conductor-lib + web app + kiosk frame pages.
- De-personalized: all LAN IPs, hostnames, HA entity ids, personal media references, and credentials removed from code and shipped config; `MA_TOKEN`/`MA_URL` read from environment.
- Docs: README, INSTALL, HA-SETUP, ARCHITECTURE, THEMES (pack format v1), SECURITY, ROADMAP.
- Docker packaging and generic display-PC kiosk kit.
- Example theme skeleton (`themes/ocean-depths/`) pending hand-built starter packs.
