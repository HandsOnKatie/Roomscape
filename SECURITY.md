# Security model — read before deploying

**Version 0.50**

## What Roomscape is, security-wise

A trusted-LAN home appliance, like a smart-home hub admin page. It assumes every
device on your network is yours. Since v0.50 an admin token guards all mutating
API calls, but the *read* surface (state, media, screens) stays open on the LAN
by design.

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
2. `data/admin-token` (one line, inside the app directory)
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
- `GET /api/ha/entities` — the **one gated GET**: it lists your Home Assistant
  entity inventory (for the setup wizard), which is worth a token even read-only.
- `/api/tag/*` when `auth.tagOpen` is `false` — see below.

### What stays open (LAN conveniences, each deliberate)

- **All other GETs** — state, layout, scenes, media, thumbnails, health. Anyone
  on the LAN can *watch*; they can't *change* anything.
- **WebSocket connections** (frame kiosks): upgrades carry no token. The frames
  are read-only consumers of state broadcasts; gating them would break every
  wall TV on each restart for no mutation-protection gain.
- **`POST /api/tag/*` by default** — NFC tag taps arrive via Home Assistant's
  `rest_command`, which predates the token. To close it: add the header in HA —

  ```yaml
  rest_command:
    roomscape_tag:
      url: "http://<conductor>:8090/api/tag/{{ tag_id }}"
      method: post
      headers:
        x-rs-token: "<your token>"
  ```

  — then set `config.json` → `"auth": { "tagOpen": false }`. (The tag route
  answers GET as well as POST, so `tagOpen: false` gates both verbs.)
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

## Other protections

- Secrets (`HA_TOKEN`, `MA_TOKEN`, `ADMIN_TOKEN`) live in environment variables
  (or `data/admin-token`), are never written to JSON config files, and are never
  returned by any API (profile endpoints redact the music token).
- Path traversal is rejected on all file-serving and upload endpoints; uploads
  and theme imports are extension-whitelisted; profile writes are guarded
  against accidental mass deletion; `POST /api/config` whitelists top-level
  keys and writes a timestamped `.bak` before touching `config.json`.
- The in-page message bus (engine.js) accepts `postMessage` only from its own
  origin, and targets its own origin rather than `*` (file:// dev pages keep
  working — they have no usable origin).

## Reporting

Found a vulnerability? Open a GitHub security advisory or contact the maintainer
privately rather than filing a public issue.
