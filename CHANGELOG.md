# Changelog

## 1.03 — 2026-08-06 (conductor v5.03)

**More pre-release fixes.** While writing the reference documentation for v1.02
— going through every API route, every environment variable and every file the
Conductor writes, one at a time — a further batch of real bugs fell out. As with
1.01, all of this was found *before* any public release: Roomscape has never
been deployed publicly and there is no opportunity for real-world exploitation.
If you are running a copy on your own LAN, update: the first item defeats the
admin token completely on a fresh install, and the second and third mean several
features simply do not work out of the box.

*(There is no 1.02 entry here — 1.02 was the frontend half of the 1.01 security
pass and is described in that entry.)*

**Critical**

- **The diagnostic log handed out the admin token.** The Conductor keeps the
  last 500 console lines in memory and serves them at `GET /api/log` — and that
  route had no token check at all. The buffer starts capturing *before* the
  point where a fresh install prints its generated admin token, so on a
  first-run install `GET /api/log?q=admin` returned the admin token to any
  unauthenticated device on the network: a complete bypass of the whole gate.
  Both ends are fixed. The first-run token is now printed by a route that the
  buffer does not capture (you still see it in the boot log and in
  `docker logs roomscape`, which is where you read it from), every line kept in
  the buffer is scrubbed of the live Home Assistant, Music Assistant and admin
  tokens, and `GET /api/log` now requires the admin token like
  `GET /api/ha/entities`.

**High**

- **The Conductor could not talk to itself.** Three features work by the
  Conductor sending a request to its own API: the party-game narrator's speech,
  the automatic "save the result" when a game ends with scores, and the whole
  Time Machine profile-restore. None of them sent the admin token, so with
  authentication on — which is the default — they were all quietly refused.
  Party games narrated silently, results were never banked, and every restore
  failed with "apply failed (401)". They now authenticate like any other client.
- **A stock install pointed at a media folder that doesn't exist.** The code
  defaulted to a folder called `Images & Videos` (a leftover from the original
  private build) while `.env.example` and the Docker compose file both say
  `media/`. Out of the box the Conductor therefore scanned nothing and found
  zero scenes. The default is now `media/`, and the repository ships that folder
  so a fresh clone works. If you have an existing install using the old name it
  keeps working: the old folder is used automatically when it is the one that
  exists, and the boot banner now says which folder it picked.
- **Several things the Conductor saves had nowhere to save to.** Scores, game
  rules, per-mode playlists, custom effects, visualiser settings, image grades,
  mode posters, frame variants and the scene-dimension cache were being written
  either into the app folder (which Docker mounts read-only, so every write
  failed silently) or into a folder inside the container (which is wiped every
  time the container is recreated). Backups and the thumbnail cache had the same
  problem. All of it now lives under one writable folder — `DATA_DIR`, which
  Docker already maps to `data/` next to the repository — and anything found in
  an old location is copied across automatically on the first boot after
  updating, with a line in the log saying so.
- **A failed backup no longer pretends to have worked.** `backupFile()` swallowed
  every error, so saving your modes could report success having written no
  backup at all — the one safety net for that file, gone without a word. It now
  logs the failure loudly, and a profiles save that could not be backed up
  returns a `warning` alongside the success so the interface can say so.
- **The TTS cache and score-card portraits can be written again.** Both wrote
  into read-only Docker mounts. The compose file now mounts `sounds/` writable
  (that's where generated speech is cached) and adds a `people/` mount for
  scoreboard portraits.

**Medium**

- **The weather poll interval setting did nothing.** `settings.weather.pollMinutes`
  was read once from the built-in defaults and never again, so changing it had no
  effect even after a restart. The live value is now read on every poll.
- **Schedule rules accepted modes that don't exist.** A typo in a scheduled mode
  id saved happily and then fired every day into nothing. Unknown mode ids are
  now refused with a clear message.
- **Two dead pages removed from the web server's allow-list.** `/control.html`
  and `/editor.html` were dropped from this repository before v1.00 but were
  still listed as servable, and a missing `app.html` fell back to serving
  `control.html` — producing a bare 404 with no explanation. A missing
  `app.html` now returns a page that says so and tells you where it looked.
- **The screens' liveness ping gets a reply.** Frame pages ping the Conductor
  every 20 seconds and force a reconnect after 90 seconds of silence; the server
  ignored the ping entirely and the watchdog only worked by accident, because
  the two-second clock broadcast kept the connection noisy. Pings are now
  answered with a pong.

**Documentation**

- SECURITY.md gains a "Known open surfaces" section stating plainly, rather than
  leaving to be discovered: that the admin token can be used to switch
  authentication off permanently; that theme-pack export is an ungated bulk
  download; exactly what the open profile reads expose (Home Assistant entity
  ids, room layout, schedules, the NFC tag map — only the music token is
  redacted); and that `deploy/edge.js` has no authentication whatsoever, allows
  every origin, and can rewrite the kiosk startup script and restart the
  session — so it must never leave a trusted LAN segment.
- The README's "Project status" section was two releases out of date, listing
  the theme loader, the setup wizard and N-frame layouts as "still to land" when
  all three had shipped. Rewritten honestly: what's done, and what is genuinely
  pending (hand-built starter theme packs, landscape screens, a browser test
  rig).
- `docs/ARCHITECTURE.md` still carried a v0.10 header. Every version surface —
  `package.json`, README, CHANGELOG, `/api/health`, the boot banner, SECURITY.md
  and the architecture doc — now agrees.

**Testing**

- `scripts/smoke.js` v2.0 — 133 checks to 173, one or more per fix above, including
  two new boots: a stock install with no `MEDIA_DIR` and no `DATA_DIR` (proving
  the defaults and the store migration), and an install with only the legacy
  media folder (proving the fallback). The token-leak fix is proved end to end
  against a genuine first-run install.

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
