# Pre-publication review — roomscape-public

**Date:** 2026-08-25 · **Reviewed at:** v1.03 (`package.json` 1.0.3, conductor v5.03) · **Commit:** `ef7d556`
**Scope:** all 149 tracked files, ~22k LOC of JS, all docs, deploy scripts, Docker packaging, git history.
**Verification:** `node --check` clean on every JS file; `bash -n` clean on every shell script; `node scripts/smoke.js` → **SMOKE PASS — 173 checks**.

---

> ## Status: actioned in v1.04 and v1.05
>
> **Fixed in 1.04** — §1.1 (SECURITY.md port), §1.3 (both duplicate declarations), §1.4 (scoreboard escaping), plus the `overlays/` packaging bug, the `<you>` clone placeholders, the audit-count and at-rest-mode contradictions, and a full documentation rewrite ([GUIDE.md](GUIDE.md) is new).
>
> **Fixed in 1.05** — both **High** findings in §2: the unbounded WebSocket fragment accumulator (plus continuation-frame policing, unmasked-frame rejection, and a 64-client cap) and the uncapped synchronous theme export (now stat-sized, refused over 200 MB, single-flighted and yielded). Also added: CI, issue and PR templates, and `license`/`author` in `package.json`.
>
> `scripts/smoke.js` now runs **208 checks**, including a live attempt at the fragment attack against a running Conductor rather than a source-level assertion about it.
>
> **Deliberately deferred** — §1.2 (`deploy/edge.js` binding and auth). The exposure is unchanged and is documented in [SECURITY.md](../SECURITY.md); the port number in that warning is now correct, which was the part that actively misled.
>
> Everything else in §2 and §3 below is still open unless noted. The Medium items — the ungated `/api/ha/room?all=1` and `/api/music/*` reads, MQTT being an ungated control channel, the `s += chunk` UTF-8 corruption, Docker running as root — are worth working through, but none of them block publication.

---

## 0. Verdict

**Privacy: clean. Safe to publish as far as personal data goes.** No secrets, no real IPs, no hostnames, no MAC addresses, no credentials, no absolute paths from your machine, in the working tree *or* in any of the 16 commits of git history. `_backups/` (73 files of your real profile history) is correctly git-ignored and untracked and will not ship.

**Code: not ready to publish today**, but close. There are four things that should be fixed first — two security, two functional. Everything else can be follow-up issues.

The security engineering in this repo is well above hobby-project standard. The auth gate's chain-capture architecture, `contained()` in `media.js`, the zip reader, `rsSafeKey`, the `Vary: Origin` handling, and the honesty of `SECURITY.md`'s "Known open surfaces" section are all genuinely good. The findings below are mostly gaps in an otherwise careful sweep, not an absence of care.

---

## 1. Fix before you publish

### 1.1 `SECURITY.md` names the wrong port for the edge service — **HIGH**

`SECURITY.md:156,165` says the edge service runs on **8093** and tells readers to firewall 8093. The actual default is **8090** (`deploy/edge.js:64`, `deploy/immersion-edge.service:11`, `deploy/install-edge.sh:55`, `docs/INSTALL.md:105`).

Anyone following your security advice firewalls a closed port and leaves the real one open. One-line fix, highest value in the repo.

### 1.2 `deploy/edge.js` binds all interfaces with no auth and `ACAO: *` — **CRITICAL**

```js
// deploy/edge.js:488
server.listen(PORT, () => { log('listening on http://localhost:' + PORT); ...
```

`listen(PORT, cb)` with no host binds **0.0.0.0** — the log line claiming `localhost` is wrong. Every `/edge/*` route answers with `Access-Control-Allow-Origin: *` and no auth. Unauthenticated from any LAN host:

| Route | Method | Effect |
|---|---|---|
| `/edge/screens` | POST | Rewrites `~/.xinitrc`, then `sudo systemctl restart getty@tty1` |
| `/edge/cleanup` | **GET** | Recursive `unlinkSync` across the media cache |
| `/edge/prewarm` | **GET** | Starts a full-library download |
| everything else | any | Open reverse proxy to the Conductor |

The GET routes fire from `<img src="http://kiosk:8090/edge/cleanup">` on **any web page anyone in the house opens**. The POST is a CORS *simple request* with `Content-Type: text/plain` — no preflight, side effect lands.

`SECURITY.md:164` advises "bind it to the kiosk's LAN interface rather than 0.0.0.0 if you can" — **there is no env var or config to do this.** The one mitigation offered doesn't exist.

Minimum fix before publishing: add `BIND` (default `127.0.0.1`), a shared-secret header check on `/edge/*`, require `Content-Type: application/json` on the POST, and make `/edge/cleanup` and `/edge/prewarm` POST-only.

**On the "unauthenticated RCE" wording** (`SECURITY.md:158`): I could not find an injection path. `setScreens()` at `edge.js:405-420` validates thoroughly — output names against `/^[A-Za-z0-9_-]+$/`, rotations against an allow-list. Arbitrary content cannot currently reach `.xinitrc`. But an unauthenticated network service holds write access to a login-time shell script, run by a user with `NOPASSWD` sudo for `reboot`/`poweroff`. Honest wording: *"unauthenticated remote reconfiguration and session restart of the display PC — one validation bug away from code execution."* Still severe, and the LAN-segment warning stands.

### 1.3 Two duplicate function declarations silently break shipped features — **HIGH**

Both pairs sit in the **same IIFE** (`app.js:432`–`5579`), so the later declaration wins for every call site.

**`recordRecent`** — `app.js:929` (modes) vs `app.js:1149` (music):

```js
929:  function recordRecent(id) { ... rsSaveIds('rs-recent', a.slice(0, 8)); }
1149: function recordRecent(uri, label, image) { ... persist().catch(...); }
```

`playModeAt` (2791) and `launch` (2913) call `recordRecent(id)` → they hit the **music** version. Consequences: (a) **`profiles.json` is POSTed to the server on every single mode launch** via `persist()`, on the hot path; (b) "Recently played" in Play never appears, because `rs-recent` is never written; (c) the Music tab's recents get polluted with mode ids. Fix: rename the 1149 one to `recordRecentMusic` (two call sites).

**`edBase`** — `app.js:3336` vs `app.js:4272`:

```js
3336: function edBase(fn){ fn(draft); dirty=true; updateDirtyUI(); paintCanvas(); if(previewOn) schedPreview(); }
4272: function edBase(fn) { fn(draft); dirty = true; updateDirtyUI(); }   /* intro is mode-level ... */
```

The 4272 comment shows you believed you were adding a new function, not shadowing one. Every `edBase` caller loses `paintCanvas()` and the preview push. So **changing a phase's Lighting or Default scene does not update the wall canvas or the live TV preview** (`app.js:4637`, `4640`, plus the Section change at 3767 and the hide-from-Play toggle at 4579). Phase reorder/delete still work because they call `paintCanvas()` themselves — which is exactly why this is hard to catch. Fix: delete the 4272 declaration.

### 1.4 Player names render unescaped on every Frame TV — **HIGH**

`fx.js:633, 634, 642` — `scorePanel()` renders `state.scores.players[].name` and `.nick` raw:

```js
633: '<div style="font:700 8.5cqmin Georgia,serif;color:' + g0.accent + '">' + (w.name || '') + '</div>'
642: '...">' + (p.name || '') + ... (p.nick ? '<div ...>“' + p.nick + '”</div>' : '') + '</span>'
```

Five lines up, the avatar helper *does* escape (`escA(p.photo)`, `escA(col)` at line 626) — this is a miss in the B7 sweep, not a design choice. `app.js`'s own `scAvatar` (2054, 2071) escapes correctly, so the app and the wall disagree and the app is right.

A player named `<img src=x onerror="...">` executes on all six kiosk TVs the moment a score frame paints, same-origin, with `localStorage['rs-admin-token']` readable. Adding a player is the least-privileged write in the product, so this is the most reachable XSS in the codebase. Fix: `escA()` on all four values.

---

## 2. Should fix soon (not blocking)

### Backend

| Sev | Where | Issue |
|---|---|---|
| **High** | `conductor-lib/ws.js:108` | `client.frag.push(payload)` has **no cumulative cap**. `WS_MAX_BUF` bounds the receive buffer and declared frame length, but an unauthenticated client sending N ~4MB frames with `FIN=0` grows `frag` without limit. 1000 frames ≈ 4 GB. WS upgrades are deliberately open and the origin check passes for a client that sends no `Origin`. Add `client.fragLen` and drop over cap. |
| **High** | `conductor.js:5515-5537` | `GET /api/theme/export/<pack>` is unauthenticated, uncapped, and **fully synchronous** — `readFileSync` every file into RAM, then `deflateRawSync` each one. The *import* path got a 100 MB cap and a pre-inflate budget; the unauthenticated export half got neither. A pack with a few hundred MB of video blocks the event loop and stalls every TV. |
| Med | `conductor.js:1680` | `GET /api/ha/room?all=1` returns the full HA light/media_player inventory **ungated**, while its twin `/api/ha/entities` is gated. `SECURITY.md:63` claims the inventory is protected. |
| Med | `conductor.js:1590,1614,1985` | `/api/music/*` and `/api/ma/players` are ungated proxies into Music Assistant — playlist library, track search, now-playing. Each call opens a **new** authenticated WS to MA with no concurrency limit. Undocumented read surface *and* unauthenticated amplification. |
| Med | `conductor.js:762-767` | MQTT is a completely ungated control channel (`game/start`, `room/mode`, `room/panic` → `applyProfile`), absent from the threat model. Separately: subscriptions are **unprefixed** while publishes use `MQTT_PREFIX`, so two installs on one broker control each other. |
| Med | ×15 in `conductor.js` | Body readers do `s += chunk` — `Buffer.toString()` per chunk, so a UTF-8 character split across a TCP boundary becomes U+FFFD **on both sides**. Bites `/api/profiles`, `/api/games/deck`, `/api/modeposters`. `/api/theme/import` (5635) does it right with `Buffer.concat`. Also `s.length > 2e6` counts UTF-16 units, not bytes. |
| Med | `conductor.js:1390` vs `1419` | In-memory `profiles` is replaced **before** the disk write. When the wipe-guard throws, the client gets a correct 500 but memory now holds the rejected map, and the next write from any other path persists it. Write first, assign second. |
| Med | `conductor.js:1256,1260,1266,1288` | `SECURITY.md:206` claims post-symlink containment re-checks on *all* file-serving endpoints. True for `/media/`, `/photos/`, `/thumb/?p=`; **not** for `/overlays/`, `/decks/`, `/sounds/`, or the un-`?p` `/thumb/` path. Traversal is correctly blocked on all four — the gap is symlinks specifically. |
| Low | `conductor.js:1231, 2437` | The log scrubber sanitises the ring-buffer copy then forwards the **original** to the real console, so `?token=…` reaches `docker logs` in cleartext. `MQTT_URL` (which conventionally embeds credentials) is printed in full at `762`/`1755` and is not in the scrubber's list. |
| Low | `modules/probe.js` | Self-described throwaway ("Delete once the refactor is confirmed") that ships an ungated GET returning `__dirname` and `pid`. Under bare Node that's your real filesystem path. **Delete before publishing.** Also note the dispatcher `require`s every `.js` in `modules/` at boot — worth a `SECURITY.md` line. |
| Low | `conductor.js:863,873`, `music.js:55` | `fetchJSON`/`postJSON`/`maCall` buffer outbound responses unbounded. `ha.js` was fixed for exactly this (4 MB cap + 20s deadline); port that pattern across. |
| Low | `ws.js:79` | No cap on concurrent WS clients. Every one gets a full state serialisation every 2s. Refuse at ~64. |

### Frontend

| Sev | Where | Issue |
|---|---|---|
| High | `app.js:2835` | Mode poster URL raw inside a `style="…"` attribute. Two lines up (2833) the *same value* gets the correct `esc(poster.replace(/'/g,'%27'))` treatment. |
| Med | `app.js:6373` | `<a href="' + esc(rec.pdfUrl) + '">` — `esc()` stops attribute breakout but not a `javascript:` scheme. `rec.pdfUrl` is a stored free-text field. Add an `^https?://` check. |
| Med | `engine.js:736-1071`, `fx.js:1806` | `buildControlDeck` / `mountStylePanel` are **dead code** (nothing calls them; `conductor.js:1754` even notes the page was removed) but still exported on `window.IE`, and render HA entity ids, friendly names, source lists and scene names entirely unescaped. ~360 lines. Delete them. Same for `modeInspector` (`app.js:3953`) and `audioEditorHTML` (`app.js:3843`). |
| Med | ~20 sites | Colour strings (`p.accent`, `matte.color`, `haloColor`, `person.color`) interpolated raw into `style=` and `value=` attributes — `app.js:2022,2168,2826,2832,3754,3943,4005`, `engine.js:492-557`, `fx.js:619,637,729`. Free strings from `POST /api/profiles`/`/api/scores`/theme packs. Best fix: validate `^#[0-9a-f]{3,8}$` at the boundary. Your own timer code (`app.js:1433,1546`) already does `esc(col)`. |
| Med | `fx.js:995` | `message` listener with **no `e.origin` check** — any cross-origin document with a window handle can paint a full-screen timer overlay across the app and every TV. `engine.js:671-685` gets this right; mirror it. |
| Med | `app.js:5729,5736,5763` | Reveal Studio `<option>` builder — mode names/ids raw into content and `value=`. |
| Med | `fx.js:1404` | `phUrl` drops an unencoded filename into a URL path. A photo named `Bob & Sue.jpg` renders blank. `app.js:2204` does it correctly. |
| Low | `app.js:805-806, 828, 1113, 4655` | Unguarded `localStorage` on the **boot path**. If it throws (kiosk with site data blocked, corrupt profile, quota), `boot()`'s catch shows *"Can't reach the Conductor"* and retries in 5s — **infinite boot loop with a completely wrong error message**, on a healthy server. Eight other call sites are correctly `try`-wrapped. |
| Low | `fx-audio.js:26` | `A.buffers` is never evicted. Every distinct sound URL holds a decoded `AudioBuffer` (raw PCM) for the page's life. On a 24/7 kiosk with a big `sounds/` library this is the likeliest long-run memory problem. `fx.js:1283` caps `_ckCache` at 6 — do the same here. |
| Low | `fx.js:1958-2754`, `engine.js:1046` | Eight `setInterval` pollers in appended blocks that never stop and don't check `document.hidden` — and several run in `app.html` too. Your `__rsTick` scheduler (`app.js:5589`) exists for exactly this. |
| Low | `app.js:809-810` | `setInterval(pollHealth,12000)` / `setInterval(renderAuto,60000)` inside `boot()`, no handle, no clear. `boot()` is re-entrant (5s retry + Retry button) → duplicate timers forever. |
| Info | `app.js:6576` | `f.src='rsreveal:'+enc` — a Windows-only protocol handler registered by an installer not in this repo. Silent no-op on Linux; the 📂 button just does nothing. Feature-detect, document, or remove. |
| Info | — | Container queries / `cqmin` (`fx.js:241` + ~120 sites) and `:has()` (`app.js:8066`) set a **hard minimum of Chromium 105**. Below that every `cqmin` length is invalid and the whole matte/bevel geometry collapses. Worth one line in INSTALL. |

---

## 3. Packaging & docs

### Docker
- **No `USER` directive** — container runs as root with five writable host mounts, so everything it writes is root-owned on the host. `node:22-bookworm-slim` already ships a `node` user. (Medium)
- `FROM node:22-bookworm-slim` is an unpinned mutable tag; `RUN npm install sharp mqtt` ignores `package.json`'s declared versions, has no lockfile, no `--omit=dev`, no `--ignore-scripts`. Builds aren't reproducible. (Medium)
- No `read_only`, `cap_drop`, `no-new-privileges`, `mem_limit` in compose. (Medium)
- `overlays/` and `Photos/` resolve inside `/app/web` (`:ro`) and aren't mounted — the same EROFS class v1.03 hunted down for `sounds/`, `themes/`, `people/`. (Medium)
- **Done well:** the mount design itself is correct and each mount's `:ro`/`:rw` choice is commented with the bug that motivated it. Real `HEALTHCHECK`. `/dev/null:/app/web/.env:ro` is a nice belt-and-braces.

### Shell & systemd
- `deploy/setup.sh:121` **reboots unconditionally** after 10s. Make it `--reboot` opt-in.
- `deploy/setup.sh:77,79` — `$SERVER`/`$FRAMES` go into `sed -i` replacements unescaped; `$FRAMES` isn't validated at all. A `|`, `&` or `\` injects into `~/.xinitrc`.
- `deploy/xinitrc:41,136` hard-codes `W=2160; H=3840` and `--mode 3840x2160`. There's an `--auto` fallback for the mode but the browser window size/position aren't derived from actual resolution — on 1080p portrait TVs every kiosk window is wrong. Nothing in INSTALL says 4K is assumed.
- `immersion-music.service:11` hard-codes `XDG_RUNTIME_DIR=/run/user/1000`. `install-music.sh` already templates `__USER__`/`__HOME__` — template the UID too.
- Neither systemd unit has any hardening directives (`NoNewPrivileges`, `PrivateTmp`, `ProtectSystem`). For `immersion-edge` the *reason* is the smell: it needs to write `~/.xinitrc` and shell out to sudo.
- `deploy/edge.js:431` copies `~/.xinitrc` to a timestamped backup on **every** POST, never pruned → unauthenticated disk fill. `edge.log` likewise never rotates.
- **Done well:** `set -euo pipefail` in the three main scripts, no `curl | bash` anywhere, no `rm -rf $VAR` anywhere, `configure-screens.sh` verifies its edits landed and restores the backup if not, `music-player.sh:34` derives a stable MAC with the correct `02:` locally-administered prefix.

### Doc ↔ code contradictions

| Sev | Doc | Code |
|---|---|---|
| **High** | `SECURITY.md:156,165` edge port **8093** | **8090** everywhere |
| **High** | `SECURITY.md:188` *"the app directory holds nothing writable at all"*; `ARCHITECTURE.md:59` `data/profiles.json` | `conductor.js:183-184` default `STATE_FILE`/`PROFILES_FILE` to `<APP_DIR>/`. Docker overrides them (`compose.yaml:29-30`) so the claim holds *there*, but it's stated absolutely and is false for bare-node. |
| **High** | `HA-SETUP.md:28` map TVs by editing `profiles.json` | Under Docker that file is `/app/data/profiles.json`; the repo-root `profiles.json` a reader finds is never read. |
| Med | `REFERENCE.md:240` vs `REFERENCE.md:253` | Internally contradictory about the same two defaults. |
| Med | `config.example.json:4` `atRestMode: "atrest"` | Shipped `profiles.json` has only `dining`; `conductor.js:196` defaults to `'dining'`. Copy the example as instructed and at-rest points at nothing. |
| Med | `config.example.json:43` rooms `[{id:'main'}]` | `conductor.js:1872` `FALLBACK_ROOMS` is `dining` + `playroom`. |
| Med | `config.example.json` documents `ha.tvs`/`tvQuirks`/`lightZones` only | `ha.lights` is live and separately consumed (`conductor.js:938,1116,1588,1707`); without it `/api/lightscene` returns *"no lights configured"*. `HA-SETUP.md:36` does show it. |
| Med | `CHANGELOG.md:116`, `REFERENCE.md:331`, `FAQ.md:128` — *"two independent penetration audits"* | `SECURITY-AUDIT-2026-08.md:4` — *"three independent adversarial reviews… A fourth pass"* |
| Low | `REFERENCE.md:105` *"five small modules"* then names six | six files in `conductor-lib/` |
| Low | `.env.example:43`, `HA-SETUP.md:104` `MQTT_PREFIX=roomscape` | default is `'immersion'` (`conductor.js:756`) |
| Low | `THEMES.md:128` vs `:131` | Two different UI paths given for importing a theme |

### Open-source readiness
- **`README.md:44` and `docs/INSTALL.md:17` both say `git clone https://github.com/<you>/roomscape`** — an unfilled placeholder in the primary quick-start of both docs.
- **No `.github/` directory at all.** Biggest easy win: a workflow running `node scripts/smoke.js` — you have a 173-check suite that nothing runs automatically. Then an issue template built from `TROUBLESHOOTING.md:152-157` (you already wrote the content). Also missing: `package-lock.json`, `.nvmrc`, `.editorconfig`, `CODE_OF_CONDUCT.md`, `dependabot.yml`.
- `SECURITY.md:241` directs reporters to a GitHub security advisory — that requires **enabling private vulnerability reporting** in repo settings. `CONTRIBUTING.md:6` mentions Discussions — those need turning on too.
- **`overlays/README.txt` will not ship.** `.gitignore:31` is `overlays/*` with `!overlays/.gitkeep`, and there is no `.gitkeep` — only `README.txt`, which `git check-ignore` confirms is ignored. So the folder won't exist in a fresh clone. Its content is stale anyway: it points at `localhost:8090/editor.html`, deliberately removed from the allow-list in v1.03. Add `overlays/.gitkeep`; rewrite or delete the README.
- `SECURITY-AUDIT-2026-08.md:5` — *"this repository has never been pushed anywhere"* is self-invalidating on publication. Reword to *"was never deployed publicly prior to release"*.
- `ROADMAP.md:31,41` cite a DECISIONS document that isn't in the repo.
- `package.json` has no `license`, `repository`, `author` or `bugs` field despite shipping MIT; `"name": "immersion-engine-conductor"` while everything else says roomscape. The UI uses both **Roomscape** (46×) and **RoomScape** (19×, user-visible). Pick one.
- **Asset licensing checks out.** I verified `sounds/starter/LICENSES.md`: all six WAVs are exactly 1ch/44100Hz/16-bit with no `LIST`/`INFO` vendor chunks — consistent with bare Python `wave` output, inconsistent with any DAW export. The per-file descriptions are specific enough to be falsifiable. Credible. (`tick.wav` is described as 5ms but is ~25ms; shipping the generating script would make the claim self-proving.) `themes/ocean-depths/LICENSES.md` is equally specific and matches the folder contents.

---

## 4. Privacy — the full sweep

Swept every tracked file, and all 16 commits of history, for IPv4/IPv6 literals, MAC addresses, JWTs, API-key shapes, private keys, `password`/`secret`/`token` assignments, Windows and UNC paths, `.local`/NAS/hostname patterns, and your name/brand/email.

**Nothing found.** Specifically confirmed clean:
- No real IPs — only `192.168.1.20` / `192.168.1.50` as usage examples in `setup.sh:21` and `install-music.sh:21`.
- No credentials anywhere. `.env.example` has empty values throughout; `config.example.json` explicitly says "NO SECRETS".
- `_backups/` (73 files of your real profile history), `state.json`, `config.json`, `media/`, `people/`, `Photos/` — all git-ignored, all untracked, never in history.
- `profiles.json` is tracked but reduced to one generic `dining` entry; `DEFAULT_TAGMAP = {}`, `EDGES_DEFAULT = []`.
- `homeassistant.local:8123`/`:8095` are the generic HA add-on defaults, not your host.

Three judgement calls, none urgent:

1. **"Dining Room" / "Playroom" survive as defaults and in UI copy** — `conductor.js:1872-1874` `FALLBACK_ROOMS`, and `app.js:1250,1255` / `conductor.js:295` all say *"the dining room"* in user-facing help text. These describe your actual home layout in a product that `README.md:68` says was "generalized for other people's rooms". Genericize the display strings to "this room". Leave the mode **id** `dining` alone — it's load-bearing as the at-rest default and documented as such.
2. **`LICENSE:3` attributes to `Hands On Katie (handsonkatie.com)`** — presumably deliberate. Flagging only that it links a public identity to a repo that documents your home in some detail: `REFERENCE.md:65` gives screen count, wall arrangement, TV model, NAS brand and mini-PC brand. Fine if intended; worth a conscious decision.
3. **`CONTRIBUTING.md:19` asks issue-filers to attach `GET /api/health` *and* `GET /api/log` output.** `TROUBLESHOOTING.md:159` already warns about redaction — the same warning belongs in CONTRIBUTING, since a `/api/profiles` dump in a bug report would carry HA entity ids, schedules and NFC tag maps.
4. `ROADMAP.md:31` — *"Starter packs — waiting on D"*. Private shorthand; expand or remove.

---

## 5. Suggested order

**Before the repo goes public**
1. `SECURITY.md` 8093 → 8090
2. `edge.js`: `BIND` default `127.0.0.1` + token check + POST-only for cleanup/prewarm
3. Rename the second `recordRecent`; delete the second `edBase`
4. `escA()` the four player-name sites in `fx.js`
5. Delete `modules/probe.js`, `buildControlDeck`, `mountStylePanel`, `modeInspector`, `audioEditorHTML`
6. Fill in `<you>` in both clone URLs; add `overlays/.gitkeep`; fix or drop `overlays/README.txt`
7. Reword the `SECURITY-AUDIT` "never been pushed" line and the "two audits" / "three reviews" mismatch

**First week after**
8. `ws.js` fragment cap; WS client cap
9. Cap + async the theme export
10. `USER node` in the Dockerfile; digest-pin; commit a lockfile
11. `.github/workflows/smoke.yml` + issue template
12. Gate or document `/api/ha/room?all=1` and `/api/music/*`; document MQTT in the threat model
13. The `s += chunk` → `Buffer.concat` sweep

**Backlog**
14. Colour-string escaping sweep (or boundary validation)
15. `localStorage` guards, `fx-audio.js` buffer cap, `__rsTick` migration for the appended pollers
16. Genericize "Dining Room"/"Playroom" strings
17. Remaining doc contradictions in the §3 table

---

*Review by Claude, 2026-08-25. Findings verified against source; smoke suite re-run clean (173/173). No files were modified.*
