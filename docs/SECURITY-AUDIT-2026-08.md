# Pre-release security audit — August 2026

**Scope:** Roomscape v1.00 (the first feature-complete build), audited before any public release.
**Method:** three independent adversarial reviews — backend auth/CORS/zip/import, theme-loader/config/path handling, and the frontend — each writing working exploits against a live instance rather than reading code alone. A fourth pass (documentation inventory) found two more issues.
**Outcome:** everything found was fixed in v1.01, v1.02 and v1.03. **Roomscape was never deployed publicly and this repository has never been pushed anywhere**, so there was no exposure window.

This document exists because a project that asks for your Home Assistant token should show its working.

---

## Critical findings (all fixed)

| # | Finding | Impact | Fixed in |
|---|---|---|---|
| 1 | **The static file server served any file under the app directory.** `GET /.env` returned the Home Assistant token; `GET /data/admin-token` returned the admin token itself; `GET /profiles.json` returned the unredacted store. Under Docker the app directory was the whole repository. | Total bypass of the auth layer. | v1.01 |
| 2 | **`GET /api/log` leaked the first-run admin token.** The log ring buffer captured the boot line that prints the generated token, and the endpoint was open. | Same as above, on a fresh install. | v1.03 |
| 3 | **WebSocket clients could replace room state** with no token and no origin check. WebSockets aren't subject to browser CORS, so any web page open on the network could drive the room — including Home Assistant side effects. | Drive-by room takeover. | v1.01 |
| 4 | **Mutating endpoints responded to GET** (`/api/game/…`, `/api/panic`, `/api/kid`, `/api/rescan`…), so an `<img>` tag on any page changed the room. | Trivial CSRF. | v1.01 |
| 5 | **Prototype pollution in `POST /api/config`** — a `__proto__` key in the deep-merge disabled the auth gate for the life of the process. | Auth bypass (needed the token first, then permanent). | v1.01 |
| 6 | **Stored XSS via theme packs and layout ids.** Mode ids, frame ids, pack metadata and media filenames were interpolated raw into HTML attributes; the admin token lives in `localStorage`. A malicious pack could exfiltrate it. | Full admin takeover from an imported pack. | v1.02 |

## High and medium findings (all fixed)

- **Symlink escape** — a link inside a media folder or a hand-unzipped pack was followed out of its containment root, allowing arbitrary file reads. Paths are now re-checked after symlink resolution.
- **`/api/tag/*` open by default** — the NFC exemption was a path *prefix* and granted the same power as a mode change. Now closed by default and matched exactly.
- **Layout wizard could only add screens** — `layout.walls` merged instead of replacing, so a 6-frame room asked to become 1 frame became 7.
- **A corrupt `config.json` was silently wiped** by the next save, which then reported success.
- **A blocked profiles write reported success** while memory and disk diverged.
- **Internal loopback calls didn't carry the token**, silently breaking party-game narration, automatic score posting and the entire Time Machine restore.
- **Writable state was written into a read-only mount** under Docker (backups, scores, thumbnails), failing silently. All writable state now lives under a single `DATA_DIR` with a migration from legacy paths.
- **Zip decompression allocated before checking the size budget** (memory spike on a crafted pack).
- **Unbounded Home Assistant response buffering** with an inactivity-only timeout.
- **Frontend fetch wrapper attached the admin token to cross-origin requests** — latent token-exfiltration channel.
- Frame ids accepted spaces, emoji and markup; music worked only when Music Assistant was configured one particular way; the weather poll interval setting was dead; schedule rules accepted non-existent modes.

## What was verified as sound

Worth recording, because a lot of the design held up under direct attack:

- **The auth gate logic itself** resisted every bypass attempt: unusual HTTP verbs, header smuggling, duplicate headers, request smuggling, empty-token configurations, and ordering attacks against later-registered routes. Its chain-capture design genuinely prevents unauthorized requests from reaching any handler.
- **The zip reader** rejected every traversal variant, encrypted entries, zip64, symlink entries, entry-count and size bombs, and truncated/corrupt structures.
- **Theme import staging** cleaned up after every error path tested (23 hostile imports left zero temp directories), never deleted user data, and never created a symlink.
- **`/api/upload`** rejected every traversal and encoding trick tried, and wrote nothing without a token.
- **CORS** defaulted correctly to no header at all, never reflected arbitrary origins, and couldn't be bypassed via preflight.
- **Theme modes never touch your `profiles.json`** — proved by round-tripping the full API response back into a save and inspecting the disk.
- **The Home Assistant token appears in no API response and no log line.**

## Known open surfaces (deliberate, documented)

These are not bugs; they're the stated design, and they're why the LAN-only rule is absolute:

- **The read surface is open on the LAN.** State, layout, media, and the profile endpoints (which include HA entity ids, your room layout, schedules and the NFC tag map — only the music token is redacted). Theme packs are downloadable via their export endpoint.
- **Anyone with the token can disable the token** (`auth.enabled: false` persists to config). The token is permission to remove the lock.
- **`deploy/edge.js` has no authentication at all** and permits any origin — including an endpoint that rewrites the kiosk's X session config. Trusted LAN segment only.
- **WebSocket read access is open**, so anything on the LAN can watch room state. Publishing requires the token.

See [SECURITY.md](../SECURITY.md) for the full model.

---

## Verification

Every fix carries at least one automated check in `scripts/smoke.js`, which grew from 63 to **173 checks** across the audit. Those include real exploit attempts: a tokenless WebSocket state-push, a cross-origin handshake, the `__proto__` gate-disable, a symlink escape, a traversal zip, and a first-run install proving the admin token is absent from the log buffer while still present in the boot output.

```bash
node scripts/smoke.js     # 173 checks, no HA/MA needed
```

*If you find something this audit missed, please report it privately via a GitHub security advisory rather than a public issue.*
