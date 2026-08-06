# Roomscape — Complete Reference

**Doc version 1.03** · Conductor v5.03 · Repo v1.03
The single deepest document in the project. If you want the short version, read the [README](../README.md). If you want to *understand the system*, read this.

**Contents**
1. [What Roomscape is (and isn't)](#1-what-roomscape-is-and-isnt)
2. [Requirements](#2-requirements)
3. [Assumptions the design makes](#3-assumptions-the-design-makes)
4. [Architecture](#4-architecture)
5. [Feature reference](#5-feature-reference)
6. [Configuration reference](#6-configuration-reference)
7. [Environment variables](#7-environment-variables)
8. [Files and directories](#8-files-and-directories)
9. [Mode (profile) schema](#9-mode-profile-schema)
10. [HTTP API](#10-http-api)
11. [WebSocket protocol](#11-websocket-protocol)
12. [Security model](#12-security-model)
13. [Limits and hard caps](#13-limits-and-hard-caps)
14. [Known constraints and rough edges](#14-known-constraints-and-rough-edges)

---

## 1. What Roomscape is (and isn't)

Roomscape turns a wall of screens, your smart lights and your music into a single tap. It's a **room mood engine**: you pick a *mode* — "Ocean Depths", "Game Night", "At rest" — and the screens, lighting scene, music and ambient audio all change together as one coordinated moment.

**It IS:**
- A self-hosted, LAN-only home appliance, in the same spirit as Home Assistant itself.
- A **coordinator**, not a media player: it decides what each screen shows and tells Home Assistant and Music Assistant what to do.
- Zero-npm-dependency Node. One process. No database. Human-readable JSON on disk.
- Designed around *portrait* TVs on a wall, but works with anything from one screen upward.

**It is NOT:**
- Internet-facing. There are no user accounts, no TLS, no rate limiting. See [§12](#12-security-model).
- A commercial/venue product. No audit log, no multi-tenant, no support contract.
- A replacement for Plex/Jellyfin/Frigate. It doesn't transcode, catalogue or stream on demand.
- Dependent on the cloud. Everything runs on your LAN. (Music Assistant may itself reach Spotify; that's MA's business, not Roomscape's.)

---

## 2. Requirements

### Hard requirements

| Thing | Detail |
|---|---|
| **Home Assistant** | The baseline. Lights, TV power, TTS and NFC triggers all route through HA. Roomscape runs without it, but you get screens only — no lighting, no TV power control, no speech. You need a **long-lived access token**. |
| **A server for the Conductor** | Anything that runs Docker: a NAS, a Raspberry Pi 4/5, a mini PC, an always-on desktop. Or bare Node ≥16 (the Docker image uses Node 22). RAM: ~150 MB idle; thumbnail generation is the spiky part. |
| **At least one screen** | Any device with a modern Chromium browser that can display a full-screen page. |
| **A LAN you trust** | See [§12](#12-security-model). This is not optional advice. |

### Optional, but transformative

| Thing | What you gain without/with |
|---|---|
| **Music Assistant** | Without: no music, no music visualisers, no music quiz. The UI hides those features rather than erroring. With: per-mode playlists, visualisers, synced multi-room audio. |
| **Dedicated display PCs** | Without: any tablet/TV browser pointed at a frame URL works. With: proper kiosk mode, hardware video decode, per-TV audio. The reference build uses Ubuntu mini PCs driving three TVs each. |
| **`sharp`** (auto-installed in Docker) | Without: no thumbnails (originals are served instead — slow pickers) and scene-dimension detection disables itself. With: fast pickers, resolution-aware scene selection. |
| **`mqtt`** | Only needed if you want the MQTT bridge to HA. |
| **Samsung Frame TVs** | Nothing is Samsung-specific except an optional art-mode quirk flag. Any screen works. |

### Reference hardware (what the design was built and tested on)

Six 43" portrait Samsung Frame TVs in two walls of three, driven by two Minisforum mini PCs (Ubuntu, three HDMI outputs each), Conductor in Docker on a QNAP NAS, Hue lighting, Music Assistant with squeezelite players per TV. **You do not need any of this.** One screen and Home Assistant is a valid install.

---

## 3. Assumptions the design makes

These are the beliefs baked into the code. If your situation contradicts one, expect friction.

1. **Everything is on one trusted LAN.** No NAT traversal, no auth tiers, plain HTTP.
2. **Screens are portrait.** `orientation` exists in config and is reported by the API, but **nothing branches on it yet** — the CSS and the panorama maths assume tall screens. Landscape is post-v1.
3. **Screens are grouped into "walls".** A wall is a set of adjacent frames that a panorama spans. One wall of one frame is fine; a wall of three is the reference.
4. **Home Assistant owns the physical world.** Roomscape never talks to a bulb, a TV or a speaker directly — always via HA (or Music Assistant for audio).
5. **Media lives on the host filesystem**, not in a database, and filenames are meaningful. A scene "key" is a filename without its extension.
6. **The room has one authoritative state**, held by the Conductor. Screens are dumb renderers that reconnect and resync.
7. **Content is yours.** Roomscape ships almost no media by design — the maintainer's own library is licensed content that can't be redistributed. Theme packs are the sharing mechanism; see [THEMES.md](THEMES.md).
8. **A mode change is a single atomic moment.** Screens, lights and music move together, with crossfades — not a sequence of independent effects.
9. **Restarting is cheap.** State persists to disk; frames auto-reconnect with backoff; the room resumes where it was.

---

## 4. Architecture

### The pieces

```
                          ┌──────────────────────────────┐
   Tablet / phone ───────►│                              │
   (Play & Design app)    │        CONDUCTOR             │──► Home Assistant
                          │   (conductor.js, Node)       │      lights · TV power
   Frame TV 1 ◄──WS───────│                              │      scenes · scripts
   Frame TV 2 ◄──WS───────│   • authoritative state      │      TTS · NFC
   Frame TV N ◄──WS───────│   • REST API + WS relay      │
                          │   • media & thumbnails       │──► Music Assistant
   NFC tag ──(via HA)────►│   • theme packs              │      playlists · players
                          └──────────────┬───────────────┘      volume · queue
                                         │
                          media/ · themes/ · sounds/ · data/
```

- **Conductor** (`conductor.js`, ~5,800 lines): one Node process. Holds room state, serves the app and frame pages, exposes the REST API, relays WebSocket state to every screen, scans media, generates thumbnails, drives HA and MA.
- **`conductor-lib/`**: five small modules injected with a context object — `ha.js` (HA REST), `music.js` (hand-rolled MA WebSocket client), `ws.js` (hand-rolled WebSocket server), `media.js` (path safety, scanning, thumbnails), `themes.js` (pack scan + expansion), `zip.js` (pure-Node zip reader/writer). **These may only require Node builtins** — never npm packages — because the app directory may live on a Windows share while the runtime is a Linux container.
- **The app** (`app.html` + `app.js` + `engine.js` + `fx.js`): the tablet UI. Two "spaces": **Play** (tap a mode) and **Design** (build modes).
- **Frame pages** (`frame.html` + `engine.js` + `fx.js` + `fx-audio.js`): what each TV runs. Pure consumers of state.
- **Edge mirror** (`deploy/edge.js`, optional): a local media cache on each display PC so 4K video plays off local disk instead of streaming from the NAS.

### How a mode change flows

1. Tablet taps a card → `POST /api/game/<mode-id>` with the admin token.
2. Conductor's `applyProfile()` resolves the mode: scene keys → real file paths, per-frame content kinds, overlays, effects, transition, light scene, music.
3. State is mutated, persisted to `state.json`, and **broadcast over WebSocket** to every connected frame.
4. In parallel: HA gets a light-scene call (and TV power if configured); Music Assistant gets a playlist command.
5. Each frame's `fx.js` diffs the new state against what it's showing and runs the transition — its slice of the panorama, its overlay, its effect layer.
6. The mode passes through a brief `arrival` phase (1.6 s) then settles into `immersion`.

### Request dispatch (the honest version)

`conductor.js` grew by appending self-contained blocks, and **three dispatch mechanisms coexist**:

1. **Core handler** — the original if-chain. Everything unclaimed falls through to it.
2. **The router** (`RS-ROUTE-DISPATCH`) — a proper `add(method, path, fn)` table, auto-loads `modules/*.js`. Newer routes live here.
3. **Legacy prepend-listeners** — ~16 blocks that intercept requests before the core handler. Two of them (`RS-PROFILES-GUARD` and `RS-AUTH`) *capture the entire listener chain* and replay it, which is how the auth gate guarantees nothing runs before it.

This is technical debt with a reason: each block was added to a live system without touching working code. It's being migrated to the router incrementally (see ROADMAP). **If you're contributing: add new routes to the router, not a new listener.**

### Design invariants (please don't break these)

- **Zero required npm dependencies** in the Conductor core. `sharp` and `mqtt` are optional and degrade cleanly.
- **`conductor-lib/` requires Node builtins only.**
- **No hardcoded frame ids, counts, IPs or entity ids** — everything resolves from `config.json`/layout/roles.
- **Single-source registries** — frame kinds, viz styles and playlist displays each have exactly one definition (in `engine.js`, exported on `IE`).
- **Secrets live in the environment**, never in JSON, never in an API response.

---

## 5. Feature reference

### Modes
The core unit. A mode bundles: per-frame content, a scene (or scenes), an overlay, an effect layer, a transition, a light scene and zone effects, a music playlist, ambient audio, and optional extras (intro, reveal, moments, photos). Modes are grouped into **sections** (Moods, Game Night, Seasonal…) that become tabs in Play.

Every mode passes through **phases** on activation: `arrival` (1.6 s) → `immersion`. Other phases (`intermission`, `boss`, `victory`, `defeat`, `cleanup`) can be triggered manually; `boss` and `defeat` are blocked while kid-safe mode is on.

**At rest** is the special mode (id from `config.atRestMode`, default `dining`) used as the default state and by the panic button.

### Frame content kinds (9)

| Kind | Shows |
|---|---|
| `pano` | One image/video spanning the whole wall — each frame renders its own slice |
| `portrait` | A single whole image fitted to this frame |
| `photos` | Photo-album slideshow (auto / single / stack / collage layouts) |
| `viz` | Audio-reactive music visualiser |
| `playlist` | Now-playing / queue / album-art card |
| `score` | Live scoreboard |
| `map` | Map panel |
| `clock` | Clock (6 styles) |
| `off` | Black |

### Visual effects
- **Transitions (17):** crossfade, blurfade, rackfocus, dipblack, dipwhite, dipaccent, cut, pushleft, pushright, wipe, iris, zoomblur, blinds, glitch, pixelate, ripple\*, morph\* (\* WebGL, auto-degrades per frame).
- **Ambients (11):** none, kenburns, breathe, flicker, rain, snow, embers, fog, starfield, grain, caustics.
- **Screen events (7):** lightning, bloom, drain, shake, ignite, softflash.
- **Synth SFX (10):** thunder, boom, whoosh, riser, chime, toll, zap, shatter, pageturn — generated in the browser, no files needed.
- **Overlays**: transparent PNG frames (window mullions, arches, mats) layered over the scene.
- **Matte, halos, chroma key, art tones**: per-mode or global finishing.

### Music visualisers
15 styles (cathedral, ribbon, fountain, aurora, pond, vinyl, mandala, fireflies, skyline, fireplace, plus 4 panorama-spanning: wave, stadium, beatsweep, constellation, plus shuffle), 12 colour palettes (gold, VU, sunset, ocean, aurora, fire, ice, neon, rainbow, viridis, plasma, magma). 8 playlist display styles.

### Lighting
13 built-in light scenes (gallery, daylight, dawn, carriage, forest, tavern, dungeon, moonlight, gaslight, clinical, storm, victory, candle). **Zones** group your bulbs (`main`, `accent`, or whatever you name them) and can carry effects: candle, fire, sparkle, prism, opal, glisten (native Hue effects) plus `flicker`, which the Conductor drives itself and therefore works with *any* bulb.

### Ambient intelligence
- **Weather layer** — polls an HA weather entity and dresses whatever mode is showing: rain/snow/fog clips, storm lightning, sun-elevation tone shifts. A *layer*, not a mode, so it never duplicates your library.
- **Room rhythms / calendar** — time-of-day, day-of-week, date and month rules that gently switch ambient modes (Christmas on 25 Dec, evening warmth at 18:00). Only ever switches when the room is idle, always with a silent crossfade.
- **Schedule + sun-shift** — weekly rules and sunset-relative triggers.

### Moments & cinematic
- **Moments / social SFX** — one-tap punctuation: lightning, laughter, rimshot, dramatic, applause, chaos. Each fires a sound, a screen event and a lighting flash/dip together. Up to 24 custom ones.
- **Intros** — cue timelines that play when you launch a mode manually: sound, voice, screen events, title-card takeovers and lighting cues on a millisecond timeline. Up to 30 cues, 60 s max.
- **Reveal** — a still that comes alive: plays a video once and crossfades back. Manual or on a random timer.

### Interactive
- **Party games (4):** Charades, Music Quiz, Quiz (multiple choice on the corner screens with a blackout reveal), Werewolf (TTS narration, real lights-out for night). Decks are plain text files you can write yourself.
- **Cue cards / prompter** — decks of prompts (conversation starters, rules, trivia) shown museum-placard style on a chosen screen.
- **Timer** — room-wide countdown with 6 clock styles, triggers and chains.
- **Scores & people** — player registry with photos, live scoreboard, game history.
- **TTS** — speak anything in the room through HA's TTS, from one chosen speaker.
- **NFC tags** — tap a tag (via an HA automation) to launch a mode.

### Content management
- **Theme packs** — the sharing format. One folder = one theme. See [THEMES.md](THEMES.md).
- **Photo albums** — slideshow from a photo folder tree, including an "on this day" virtual album.
- **Media library** — recursive scan (6 levels), thumbnails, resolution-aware scene selection, variants.
- **Time Machine** — hourly profile snapshots with restore.
- **Multi-room** — additional rooms driven purely through HA (lights, scripts, covers, media players) with no screens of their own.

---

## 6. Configuration reference

`config.json` at the app root (or `CONFIG_FILE`). **Absent file = sensible defaults.** Copy `config.example.json` to start. **Never put secrets here** — they go in the environment.

| Key | Type | Default | Effect |
|---|---|---|---|
| `atRestMode` | string | `"dining"` | Mode id used as default state and by panic |
| `layout.walls` | object | `{L:[L1,L2,L3],R:[R1,R2,R3]}` | Wall name → ordered frame ids. **Replaces** on save, never merges |
| `layout.roles` | object | *derived* | `primary`, `centers[]`, `corners[]`, `sweepOrder[]`. Omit to auto-derive |
| `layout.orientation` | string | `"portrait"` | Metadata only in v1 |
| `ha.tvs` | object | `{}` | Frame id → HA `media_player` entity (for TV power) |
| `ha.tvQuirks` | object | `{}` | Entity id → `"samsung-frame"` (art-mode wake behaviour) |
| `ha.lightZones` | object | `{}` | Zone name → array of HA light entities |
| `auth.enabled` | bool | `true` | **`false` disables the admin token entirely** |
| `auth.tagOpen` | bool | `false` | `true` lets `/api/tag/<id>` work without a token |
| `cors` | string/array | *omitted* | Omitted = same-origin only. `"*"` = wide open. Array = allow-list |
| `rooms` | array | `[{id:'main',…}]` | Multi-room registry. Replaces on save |
| `edges` | array | `[]` | Display-PC edge mirrors. Replaces on save |

**Replace-not-merge keys:** `layout.walls`, `layout.roles`, `ha.tvs`, `ha.lightZones`, `ha.tvQuirks`, `rooms`, `edges`. Everything else deep-merges.

A second, larger settings block lives inside `profiles.json` under `settings` (chroma, matte, overlay shadow, art tones, social effects, prompter decks, rhythms, weather, music, schedule, sun shift, timer presets, audio map, play sections). `config.json` values **override** the matching `settings` keys at boot. Edit these through the app, not by hand.

---

## 7. Environment variables

| Var | Default | Effect |
|---|---|---|
| `PORT` | `8090` | HTTP + WebSocket port |
| `APP_DIR` | script dir | Web root (Docker: `/app/web`) |
| `DATA_DIR` | `<APP_DIR>/data` | **All writable state**: admin token, backups, thumbnails, JSON stores |
| `CONFIG_FILE` | `<APP_DIR>/config.json` | Config path |
| `MEDIA_DIR` | `<APP_DIR>/media` | Scene library (falls back to a legacy `Images & Videos` folder if that exists and `media/` doesn't) |
| `THEMES_DIR` | `<APP_DIR>/themes` | Theme packs |
| `PHOTOS_DIR` | `<APP_DIR>/Photos` | Photo albums |
| `OVERLAY_DIR` | `<APP_DIR>/overlays` | Overlay art |
| `STATE_FILE` / `PROFILES_FILE` | `<APP_DIR>/…` | Room state / mode store |
| **`ADMIN_TOKEN`** | *generated* | Pins or rotates the admin token; overrides the file |
| **`HA_URL` / `HA_TOKEN`** | — | Home Assistant. Both needed or HA is disabled |
| `MA_URL` / `MA_TOKEN` | — | Music Assistant. Absent = music features hide |
| `MQTT_URL` / `MQTT_PREFIX` | — / `immersion` | Optional MQTT bridge |

---

## 8. Files and directories

| Path | Written by | Contents |
|---|---|---|
| `config.json` | you / wizard | Install config (§6). Timestamped `.bak` on every save, 10 kept |
| `profiles.json` | app | **All your modes** + `settings` + NFC tag map. The important file |
| `data/admin-token` | conductor | The generated admin token |
| `data/state.json` | conductor | Live room state (rebuildable) |
| `data/_backups/` | conductor | Profile backups: everything <48 h, first-of-day for 60 d, cap 400 |
| `data/*.json` | conductor | Scores, rules, playlists, variants, viz, social effects, posters |
| `data/.thumbs/` | conductor | Thumbnail cache (safe to delete) |
| `media/` | you | Scene library. Scanned 6 levels deep; skips `_backups`, `_to_delete`, dotfolders |
| `themes/` | you / import | Theme packs. `.trash/` holds replaced packs — never auto-deleted |
| `sounds/` | you | Audio. `sounds/starter/` ships 6 CC0 synthesized files; `sounds/voice/` caches TTS |
| `decks/` | you | Cue-card and game decks (plain text) |
| `people/` | app | Player photos |
| `Photos/` | you | Photo albums (3 levels deep) |

**Backup advice:** `profiles.json` + `config.json` + `themes/` + your media. Everything else regenerates.

---

## 9. Mode (profile) schema

Modes live in `profiles.json` keyed by id. Theme-pack modes use a dotted id (`ocean-depths.main`) and are **in-memory only** — never written to your store.

**Core:** `name`, `accent` (hex), `ambience` (label), `kidSafe`, `category` (section id), `icon`, `order`, `hidden`.
**Screens:** `scene` (default scene key), `frames[]` (content kind per frame), `frameScenes[]`, `overlays[]`, `effects[]`, `ovlFit[]`, `wallFit`, `matte`, `halo`/`haloColor`/`haloSize`, `artTone`, `frameViz[]`, `framePlaylist[]`.
**Behaviour:** `transition {style, ambient, durationMs}`, `light` (scene name), `lightZones {zone: {scene, effect, brightness_pct}}`, `music` (playlist name or query), `audio`, `ambient` (bool — eligible for auto-switching), `weatherFx`, `nowPlaying`, `tvSleep`.
**Extras:** `intro` (cue timeline), `reveal {videos[], trigger, everyS}`, `moments[]`, `photos {dir, layout, intervalS…}`, `phases[]`, `variantOf`/`variantLabel`, `room`, `script`, `haActions[]`, `rules {game}`.

Per-frame arrays are sized from your layout. A mode authored for six frames renders sensibly on one.

---

## 10. HTTP API

Base: `http://<server>:8090`. JSON in, JSON out. **Mutating calls need `x-rs-token: <admin token>`** (or `?token=`).

### State & modes
| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Version, client count, current mode. Open |
| GET | `/api/state` | Full room state. Open |
| GET | `/api/layout` | frames, walls, roles, orientation, atRest. Open |
| GET | `/api/profiles` | All modes + settings (music token redacted). Open |
| POST | `/api/profiles` | Replace the mode map. Wipe-guarded |
| **POST** | `/api/game/<id>` | **Set the mode** — the main verb 🔑 |
| POST | `/api/mode/<id>` | Set the phase 🔑 |
| POST | `/api/panic` | Stop everything, return to at-rest 🔑 |
| POST | `/api/kid` | Kid-safe toggle 🔑 |
| POST | `/api/tag/<id>` | NFC tap → mode (token unless `auth.tagOpen`) |

### Media, themes, content
`GET /api/scenes`, `/api/overlays`, `/api/photos`, `/api/manifest`, `/media/<rel>`, `/thumb`; `POST /api/upload` 🔑, `/api/rescan` 🔑.
`GET /api/themes`; `POST /api/themes/rescan` 🔑; `GET /api/theme/export/<pack>` (open — see §12); `POST /api/theme/import[?overwrite=1]` 🔑.

### Everything else
Music (`/api/music/*`), lighting (`/api/ha/lightzone`, `/api/lightscenes`), games (`/api/games/*`), timer, scores, TTS (`/api/tts`), rules/prompter, weather, schedule, edges, `/api/identify`, `/api/reveal`, `/api/social/<id>`, `/api/config` 🔑, `/api/ha/entities` 🔑(gated GET), `/api/log` 🔑(gated GET).

🔑 = admin token required.

---

## 11. WebSocket protocol

`ws://<server>:8090/?ws=auto`. Frames connect tokenless (read-only). The app appends `?token=` so it may publish.

**Server → client:** `state` (full room state, the main one), `social`, `reveal`, `identify`, `reload`, `clock`, `pong`.
**Client → server:** `hello` (identifies the frame), `ping`, `state` (**requires the token on the connection URL**).

Connections from a *different* origin are refused. Reconnect is automatic with 1 s→30 s backoff; the server caches last state so a rebooted screen rejoins mid-scene. Client pings every 20 s; force-close after 90 s of silence.

---

## 12. Security model

**Read [SECURITY.md](../SECURITY.md) before deploying — it is short and it matters.** Summary:

- **LAN-only. Never port-forward. Never reverse-proxy to the internet.** Use a VPN (WireGuard/Tailscale) for remote access.
- An **admin token** guards every mutating call. It's generated at first boot, printed once in the log, stored at `data/admin-token`, and enterable in the app.
- **The read surface is deliberately open** on the LAN: state, layout, media, and the profile endpoints (which expose HA entity ids, your layout, schedules and the NFC tag map — only the music token is redacted). Theme packs are downloadable. Anyone on your LAN can *watch*; only token-holders can *change*.
- **CORS is same-origin by default.** WebSocket publishing requires the token; cross-origin upgrades are refused.
- **Two independent penetration audits** were run before release; everything found was fixed in v1.01–v1.03 (see CHANGELOG). Nothing was ever deployed publicly.
- **`deploy/edge.js` has no auth at all** — trusted LAN segment only.

---

## 13. Limits and hard caps

| Thing | Cap |
|---|---|
| JSON request body | 2 MB (10 MB on router routes) |
| Theme zip import | 100 MB, 500 entries, 200 MB uncompressed |
| Person photo / video poster | 8 MB / 4 MB |
| Deck text | 256 KB |
| Intro cues | 30 cues, 60 s |
| Social effects | 24 |
| Schedule rules | 100 |
| Log ring buffer | 500 lines |
| Profile snapshots / backups | 200 / 400 |
| Media scan depth | 6 levels |
| Volume | 0–150% |

**Poll intervals:** WS clock 2 s · MA track 5 s · weather 10 min (configurable) · rhythms 60 s · timer tick 250 ms · client ping 20 s.

---

## 14. Known constraints and rough edges

Honest list. None of these will surprise you later.

- **Portrait only.** `orientation` is metadata; the CSS and panorama maths assume tall screens.
- **Surviving 6-frame assumptions** in older subsystems: variants, per-frame playlists, reveal reels and the viz frame whitelist still assume up to 6 frames. Core mode playback is fully N-frame; these extras are not.
- **Three dispatch mechanisms** in `conductor.js` (§4) — a migration in progress.
- **`/api/variants` GET returns a compatibility shape**, not what its own doc comment describes.
- **No browser-based test rig.** The 173-check smoke suite is HTTP-only; UI flows are canary-checked, not driven.
- **Theme packs shadow same-named light scenes.** A pack registering `theme:x` wins over a user scene of that name.
- **The starter theme packs are still being hand-produced** — `ocean-depths` ships as a working format demo with deliberately missing files.
- **Chromium recommended.** WebGL transitions, container queries and Web Audio are all used; hardware video decode matters for 4K.

---

*Found something wrong here? The code is the truth — file an issue with the file:line that disagrees.*
