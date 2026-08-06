# Changelog

## 1.01 — 2026-08-06 (conductor v5.01 · app v3.83 · engine v0.91 · fx v1.61)

**Security fixes.** Two independent penetration audits were run against v1.00
*before* any public release. Everything below was found in that pre-release
review — Roomscape has never been deployed publicly, and there is no evidence
of, or opportunity for, real-world exploitation. If you are already running a
copy on your own LAN, updating is still worth doing: several of these are
reachable by any device or browser tab on your network.

**Critical**

- **The web server was handing out your secrets.** The built-in file server
  served *any* file inside the app folder — and under Docker the app folder is
  the whole repository. `GET /.env` returned your Home Assistant token,
  `GET /data/admin-token` returned the admin token itself (a complete bypass of
  the token gate), `GET /profiles.json` returned the raw settings store without
  the usual redaction, and backups under `_backups/` were downloadable. It now
  serves only the app's own pages and assets; everything else answers 404. The
  Docker compose file also moves writable runtime data (including the token) to
  `/app/data`, outside the served folder, and masks `.env` inside the container.
- **Any web page could take over the room.** The WebSocket accepted a
  "here is the new room state" message from any client, with no token and no
  check on where the connection came from — so a page in a browser tab on your
  network could switch modes, change lights and drive Home Assistant. Publishing
  state now requires the admin token on the connection URL, and connections from
  a different origin are refused. Screens and frames are unaffected: they only
  ever listen.
- **Room controls could be triggered by a link or an image.** `/api/panic`,
  `/api/kid`, `/api/rescan`, `/api/warmthumbs`, `/api/game/…` and `/api/mode/…`
  all acted on a plain GET, so an `<img>` tag on any web page could change your
  room. They now require the admin token like every other change.

**High**

- **NFC tag taps are token-protected by default.** `auth.tagOpen` now defaults
  to `false`, and the exemption only ever applies to an exactly-shaped
  `/api/tag/<id>` path. Add the `x-rs-token` header to your Home Assistant
  `rest_command` (see `docs/HA-SETUP.md`); set `tagOpen: true` only if you truly
  cannot.
- **A crafted settings save could switch the admin token off entirely.** A
  `__proto__` key inside `POST /api/config` poisoned JavaScript's base object
  and made the auth gate read as disabled for the whole process. All the
  deep-merge paths now skip `__proto__`/`constructor`/`prototype`.
- **A symlink could read the rest of the machine.** A shortcut placed in the
  media folder, or shipped inside a hand-unzipped theme pack, was followed out
  of the folder. Media, theme and photo paths are now re-checked *after*
  resolving symlinks.
- **The layout wizard could only ever add screens.** Saving a new wall layout
  merged with the old one instead of replacing it, so a 6-frame room asked to
  become 1 frame became 7. `layout.walls`, `layout.roles`, `ha.tvs`,
  `ha.lightZones`, `ha.tvQuirks`, `rooms` and `edges` now replace.
- **A broken config.json was silently wiped.** If `config.json` had a typo in
  it, the next settings save quietly replaced the whole file — losing every
  setting — and reported success. It now refuses with a clear error and leaves
  the file alone.

**Medium**

- A profiles save that the anti-wipe guard blocked used to report success while
  memory and disk had drifted apart; it now reports the failure honestly.
- Theme-pack zips are checked against the size budget *before* anything is
  decompressed, and each entry is capped at the budget that actually remains.
- Mode music works again when Music Assistant is configured through `.env`
  only (the check looked at the wrong setting). Music search terms shorter than
  three characters no longer trigger the fuzzy playlist fallback.
- Screen (frame) ids are validated — no spaces, emoji, markup, duplicates, or
  empty layouts.
- The Home Assistant client caps how much it will buffer from a reply (4 MB)
  and gives up after 20 seconds even if data is trickling in.

**Low / housekeeping**

- Admin-token comparison is constant-time.
- The boot banner said v4.74 for two releases; it now matches the real version.
- `Vary: Origin` is sent whenever a CORS allow-list is configured.
- An oversize request body gets a proper `413` instead of a dropped connection.
- Theme pack ids must contain at least one letter or digit (`-` and `--` were
  accepted).
- `config.json.*.bak` is git-ignored, and only the ten newest are kept.
- Docker: the theme folder is mounted writable so "Import theme…" works
  (it was read-only, which failed), and the README's `.env` path now matches
  what compose actually reads.
- Smoke test v1.8: **109 checks** (was 63) — one or more per fix above,
  including a real tokenless WebSocket hijack attempt, a cross-origin
  handshake, the `__proto__` auth-gate exploit, and a symlink escape.

**Frontend follow-ups still required** (deliberately not changed here): the app
must connect its WebSocket with `?token=` for the master-volume slider and the
Design style picker to keep working, and `/api/kid` must be called with the
token (it is currently a bare GET).

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
