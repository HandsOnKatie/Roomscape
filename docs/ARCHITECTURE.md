# Architecture

**Doc version 0.10** · Engine: conductor v4.24-derived · Repo: v0.10

Roomscape is a hub-and-spokes system: one Node process (the **Conductor**) owns all state; everything else — control app, TV frames, Home Assistant, edge mirrors — is a client of it.

```
                 ┌────────────────────────────┐
  phone/tablet ──┤        CONDUCTOR           ├── Home Assistant (REST + optional MQTT)
  control app    │  conductor.js + lib        ├── Music Assistant (WS)
                 │  state · WS relay · REST   │
                 └──────┬──────────┬──────────┘
                        │ WebSocket│ (state broadcast)
              ┌─────────┴──┐    ┌──┴─────────┐
              │ display PC │    │ display PC │      each PC: optional edge.js
              │ frames L1-3│    │ frames R1-3│      media mirror + per-TV audio
              └────────────┘    └────────────┘
```

## The Conductor owns state

`conductor.js` holds the single authoritative room state: the active mode, what every frame shows, lighting, music, timers, party-game overlays. Clients never talk to each other — they send intents to the Conductor, it resolves them against the mode definitions, and broadcasts the new state to everyone. State survives restarts (`data/state.json`), so a rebooted TV rejoins the current scene.

**Zero-dependency core.** The Conductor uses only Node built-ins — including a hand-rolled WebSocket server — so `node conductor.js` just runs. Two npm packages are optional accelerators, loaded only if present: `sharp` (fast thumbnails) and `mqtt` (HA MQTT bridge). Separable subsystems live in `conductor-lib/` (`media.js`, `ws.js`, `ha.js`, `music.js`), loaded via a `ctx` injection object; lib modules never require npm packages.

## WebSocket relay to frames

Every page connects with `?ws=auto`, meaning "sync through whichever server served me". The relay pushes the full state on connect and on every change; frames auto-reconnect with backoff (1s→30s), so a Conductor restart needs no kiosk restarts. The relay also caches the last state, which is what makes power-cycled hardware self-healing.

## REST API (grouped overview, not exhaustive)

- **Health & state** — `GET /api/health`, `GET /api/state`, `GET /api/manifest` (media list for edge mirrors).
- **Modes & triggers** — `POST /api/mode/<id>` launch a mode, `POST /api/tag/<id>` NFC tap → mapped mode, `POST /api/panic` restore the at-rest room.
- **Room hardware** — light scene/brightness, TV power/input/volume (proxied to Home Assistant server-side; tokens never reach browsers).
- **Media & profiles** — scenes/overlay listings, thumbnails (`/thumb/...`), rescan, profile CRUD used by the editor.
- **Extras** — timers, scoreboard, party games, TTS announcements, music control.

Anything a finger can do in the app, HA can do over REST — that's the automation surface.

## Frame pages

A frame is just a browser at `frame.html?frame=<id>&ws=auto`, fullscreen on one portrait TV. `engine.js` renders the assigned content (scene image/video, panorama slice, clock, scoreboard, visualiser); `fx.js` layers transitions, ambient motion, weather/particle effects, and overlays. Frames sharing a panorama on one wall each render their slice of the same image, so the wall reads as one window. The kiosk kit (`deploy/`) boots a Linux PC straight into one such browser per connected TV.

## Edge mirror (optional, per display PC)

`deploy/edge.js` splits the two planes: **control** (HTML, `/api/*`, WebSocket) is reverse-proxied through to the Conductor, while **media** (`/media`, `/overlays`, `/photos`) is served from a local disk cache, pre-warmed from `/api/manifest`. Result: 4K video plays from local SSD, state stays centralized. A live-guard holds background syncing while the wall is active. The edge also exposes small local endpoints for screen arrangement and per-TV audio testing.

## Data files

| File / folder | Role |
|---|---|
| `data/profiles.json` | The editable heart: mode definitions, per-frame content, transitions, tag map, settings (HA entity map, audio port map). Backed up before every overwrite. |
| `data/state.json` | Current room state; restores on boot. |
| `decks/` | Plain-text card decks (charades, quiz, conversation starters) — one item per line. |
| `themes/` | Drop-in theme packs (art + sounds + lighting in one folder) — see THEMES.md. |
| `media/`, `sounds/` | Your scene library and sound cues; scanned on start and on rescan. |
| `.env` | Secrets: HA/MA URLs and tokens. Never committed, never in JSON. |

## Design invariants

1. **One source of truth** — no client-side state that matters; the Conductor resolves everything.
2. **Degrade gracefully** — no HA? screens still work. No Music Assistant? music features hide. Edge missing? kiosks talk to the Conductor directly. Fewer TVs plugged in? fewer kiosks launch.
3. **Files are the database** — human-readable JSON + folders of media; a backup is a folder copy.
4. **LAN-only trust model** — no accounts; treat network access as admin access (see SECURITY.md).
