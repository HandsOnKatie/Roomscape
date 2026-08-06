# Changelog

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
