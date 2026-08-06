# Security model — read before deploying

**Version 1.01**

## What Roomscape is, security-wise

A trusted-LAN home appliance, like a smart-home hub admin page. It assumes every
device on your network is yours. An admin token guards all mutating API calls,
but the *read* surface (state, media, screens) stays open on the LAN by design.

## What it must NOT be used for

- **Never expose it to the internet.** No port-forwarding, no reverse proxy to the
  outside, no "just while I'm on holiday". The admin token is a single shared
  secret over plain HTTP — fine on your LAN, trivially sniffable beyond it — and
  anyone who reaches the API can still watch your walls and pull your media.
- **Never run it on a network with untrusted users** (shared flats with strangers,
  public/guest WiFi, offices). Anyone on the LAN can see everything and, with the
  token, control everything.
- **Not a commercial/venue product.** It has no authentication tiers, no audit log,
  no rate limiting. Don't run it in a bar, escape room, or classroom without putting
  real access control in front of it yourself.
- **Remote access:** use a VPN (WireGuard, Tailscale) so your phone joins the home
  network. That is the only supported remote path.

## The admin token (RS-AUTH v1)

Every mutating request — any method other than GET/HEAD/OPTIONS — requires the
admin token, sent as an `x-rs-token: <token>` header (or `?token=<token>` in the
query string for tools that can't set headers).

Token source, first match wins:

1. `ADMIN_TOKEN` environment variable (see `.env.example`)
2. `<DATA_DIR>/admin-token` (one line; `DATA_DIR` defaults to `data/` beside
   the app, and the Docker compose file sets it to `/app/data` — deliberately
   *outside* the directory served over HTTP)
3. **generated on first run** — printed once in the boot log
   (`admin token (first run): …`) and written to `data/admin-token`
   (mode 600 attempted; that's a no-op on Windows/SMB filesystems).

The Play & Design app asks for the token the first time a change is rejected,
stores it in the browser's localStorage, and retries. You can (re)enter or
rotate it any time under **⚙ Settings → System → 🔑 Admin token…**.

- **Rotate:** delete `data/admin-token` and restart (a fresh token is generated),
  or set `ADMIN_TOKEN` in the environment — the env var always wins.
- **Disable:** `config.json` → `"auth": { "enabled": false }` turns the gate off
  entirely (the pre-0.50 behaviour, for installs that predate the token and sit
  on a genuinely private network).

### What's protected

- Every POST: modes, profiles, uploads, theme import, TTS, audio, restart, …
- **Mutating routes that answer GET.** A handful of endpoints change the room but
  are reachable with a plain GET — which means a page in any browser tab on the
  LAN could fire one with `<img src="http://conductor:8090/api/panic">`, no
  JavaScript and no CORS involved. These require the token whatever the verb:
  `/api/game/*`, `/api/mode/*`, `/api/panic`, `/api/kid`, `/api/rescan`,
  `/api/warmthumbs`.
- `GET /api/ha/entities` — the **one gated read**: it lists your Home Assistant
  entity inventory (for the setup wizard), which is worth a token even read-only.
- **`/api/tag/*` — gated by default since v1.01.** NFC tag taps arrive via Home
  Assistant's `rest_command`, so add the header there (see
  [docs/HA-SETUP.md](docs/HA-SETUP.md)):

  ```yaml
  rest_command:
    roomscape_tag:
      url: "http://<conductor>:8090/api/tag/{{ tag_id }}"
      method: post
      headers:
        x-rs-token: !secret roomscape_token
  ```

  If your automation platform genuinely cannot send a header, `config.json` →
  `"auth": { "tagOpen": true }` re-opens the route (exactly-shaped
  `/api/tag/<id>` paths only). That is the **opt-out**, and it means anyone on
  the LAN can launch any tagged mode.
- **WebSocket state pushes.** A socket may only send `{type:"state"}` — the
  message that replaces the whole room state, persists it, rebroadcasts it and
  drives Home Assistant — if it presented the admin token on the handshake URL
  (`ws://…/?token=<token>`). Sockets without it are read-only consumers, which
  is all a frame kiosk ever needs. Cross-origin WebSocket handshakes are refused
  outright: a browser always sends `Origin`, and it must match `Host`. (Clients
  that send no `Origin` at all — kiosk shells, scripts — are allowed; there is
  nothing to compare.)

### What stays open (LAN conveniences, each deliberate)

- **All other GETs** — state, layout, scenes, media, thumbnails, health. Anyone
  on the LAN can *watch*; they can't *change* anything.
- **WebSocket connections themselves** (frame kiosks): upgrades need no token to
  *receive* state. Gating that would break every wall TV on each restart for no
  mutation-protection gain — and pushing state is separately gated, above.
- **There is no localhost exemption.** Behind Docker port-mapping the client
  address the server sees is the Docker bridge, not the real caller — a
  localhost bypass would quietly become an everyone bypass. Local scripts should
  use the token like everything else.

## CORS

By default the API sends **no** `Access-Control-Allow-Origin` header. The app
and the frames are served by the conductor itself (same origin) and are
unaffected; a web page on some other origin can no longer read API responses
from a browser on your LAN. `config.json` → `"cors"`:

- omitted — same-origin only (the default, recommended)
- `"*"` — the pre-0.50 wide-open behaviour
- `["http://conductor.local:8090", …]` — allow-list; the request Origin is
  echoed back when listed

## What the web server will serve

The static file server does **not** serve "anything inside the app directory".
It serves an explicit allow-list: the app and frame pages
(`app.html`, `app.js`, `engine.js`, `fx.js`, `fx-audio.js`, `frame.html`,
`scores.html`), plus files under `app/` and `people/` with a safe extension.
Media, sounds, decks, photos, overlays and thumbnails have their own dedicated,
containment-checked routes.

Everything else under the app directory — `.env`, `config.json`,
`profiles.json`, `data/`, `_backups/`, `docs/`, `scripts/`, `docker/`,
`node_modules/`, `.git/`, any `*.bak` — returns **404**. This matters most under
Docker, where `docker/compose.yaml` mounts the whole repository as the web root.
The compose file additionally keeps writable runtime data at `/app/data`,
outside the web root, and masks the host `.env` inside the container.

## Other protections

- Secrets (`HA_TOKEN`, `MA_TOKEN`, `ADMIN_TOKEN`) live in environment variables
  (or `<DATA_DIR>/admin-token`), are never written to JSON config files, and are
  never returned by any API (profile endpoints redact the music token). The
  token comparison is constant-time.
- Path traversal is rejected on all file-serving and upload endpoints, and
  containment is re-checked *after* resolving symlinks — a symlink planted in
  the media folder or shipped inside a theme pack cannot read the rest of the
  host.
- Uploads and theme imports are extension-whitelisted; theme zips are checked
  against an uncompressed-size budget *before* anything is decompressed.
- Profile writes are guarded against accidental mass deletion, and a refused
  write is reported as a failure rather than silently succeeding.
- `POST /api/config` whitelists top-level keys, validates frame ids, refuses to
  overwrite a `config.json` it cannot parse, writes a timestamped `.bak` first
  (keeping the last ten), and skips `__proto__`/`constructor`/`prototype` keys
  so a crafted body cannot pollute `Object.prototype` (which, before v1.01,
  could switch the auth gate off process-wide).
- The in-page message bus (engine.js) accepts `postMessage` only from its own
  origin, and targets its own origin rather than `*` (file:// dev pages keep
  working — they have no usable origin).

## Reporting

Found a vulnerability? Open a GitHub security advisory or contact the maintainer
privately rather than filing a public issue.
