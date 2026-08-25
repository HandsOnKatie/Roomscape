# Troubleshooting

**Doc version 1.05.** Symptom → cause → fix. Start with the two commands that answer most questions:

```bash
curl http://<server>:8090/api/health          # is it alive, what version, how many screens connected
docker compose logs --tail=100 roomscape      # what did it say at boot
```

`/api/health` returns `{ok, name, version, repo, clients, phase, frames[], game, mode, scenes, overlays, thumbs, ha}` — `clients` is how many screens are connected, `ha` tells you whether Home Assistant is configured. Note `version` is the Conductor's internal build number (5.x) and `repo` is the release version (1.x); they are different numbers on purpose.

---

## It won't start

**"app.html is missing" error page**
`APP_DIR` isn't pointing at the code. Under Docker check the `..:/app/web:ro` volume in `docker/compose.yaml` — if you moved the repo, that relative path breaks.

**Container restarts in a loop**
`docker compose logs roomscape` will show the throw.

Note that **broken JSON is *not* the cause** — a `config.json` that won't parse is swallowed and replaced with `{}`, and an unparseable `profiles.json` gets overwritten with defaults. Neither crashes the Conductor.

**My settings vanished after I hand-edited a JSON file**
That's the symptom to look for instead. Validate the file, and check the boot log for the `[config] config.json loaded` line — if it's absent, your `config.json` didn't parse and every value in it was ignored. Roomscape refuses to *overwrite* an unparseable `config.json`, so the file itself is still there to fix.

**Port 8090 already in use**
Set `PORT` in `.env`, or change the compose port mapping. Note the display-PC edge mirror also defaults to 8090 — on separate machines that's fine.

---

## The app loads but nothing works

**Every change says "not allowed" or silently fails**
You need the admin token. Find it:
```bash
docker compose logs roomscape | grep -i "admin token"
cat data/admin-token
```
Enter it at ⚙ Settings → System → 🔑 Admin token. The app stores it and retries automatically after that.

**I've lost the token**
Delete `data/admin-token` and restart — a new one is generated and printed. Or pin one yourself with `ADMIN_TOKEN=` in `.env` (the env var always wins).

**Changes work from one device but not another**
The token is stored per-browser. Enter it on each device.

---

## Things that fail silently

A short list, because these are the ones that waste an afternoon.

**The master volume slider does nothing. No error, no toast.**
This is the big one. The volume slider in the Now bar (and the Design style picker) publish over the WebSocket rather than making a normal request. Without a stored admin token the socket is **read-only**, so these two controls are inert — and because nothing is rejected, nothing is reported.

Enter the token anywhere in the app (⚙ Settings → 🛠 System → 🔑 Admin token…) and it fixes itself immediately; the app re-dials the socket for you, no reload needed.

**A control is visible but doesn't respond.**
Several features are always rendered but need something else to exist. Check the table in [GUIDE.md → Things that need more than the app](GUIDE.md#things-that-need-more-than-the-app). The usual suspects: 🗣 Announce needs Piper TTS in Home Assistant; the whole ♪ Music tab needs Music Assistant; the 📂 icons on Design frames need a Windows-only protocol handler that isn't in this repo and will never do anything on Linux or macOS.

**The 🕯 Chandelier / 🛋 Console lamps chips toast "Zone unavailable".**
Those two zone ids (`chandelier` and `lamps`) are hard-coded from the original install and don't exist on your setup. The cards fill in with chips normally — it's the tap that fails. Known rough edge; the scene grid above them and the per-mode Lighting lens both work. Use those instead.

**Editing a phase's lighting or scene doesn't change the preview.**
Fixed in **1.04**. If you're on 1.03 or earlier, a duplicate function declaration meant phase edits skipped the canvas repaint and the live preview push. The edit *was* being recorded — it just didn't show until you reselected the phase. Update.

**Player names or nicknames render oddly on the TVs.**
Also 1.04. Before that, scoreboard names went onto the wall unescaped, so a name containing `<`, `>` or a quote could break the panel's layout (and worse — see the CHANGELOG). Update, and the names render literally.

**"Recently played" never appears in Play.**
1.04 again — the list was never being written. Update, launch a few modes, and it fills in.

---

## Screens

**A screen shows nothing / a blank page**
1. Is the URL right? `http://<server>:8090/frame.html?frame=L1` — the frame id must match one in your layout (`curl /api/layout`).
2. Is it connected? `/api/health` → `clients` and `frames[]`.
3. Any console errors on the screen device? A frame that can't reach `/api/layout` boots with the default layout and logs it.

**A screen shows the wrong slice of the panorama**
Its frame id is in the wrong wall position, or it adopted a stale layout. Check `/api/layout`, then reload that screen. Frames that received a layout late now auto-reload once when they notice the mismatch.

**"🧩 missing media" placeholder on screen**
Exactly what it says: a theme pack references a file that isn't there. `GET /api/themes` lists every missing file per pack, and the placeholder names the file. Drop the file in and rescan.

**A screen shows a red "not in layout" badge**
Its `?frame=` id isn't in your configured layout. Either fix the URL or add that id in the wizard.

**Video stutters / tears**
Use Chrome/Chromium proper (not the snap build) for hardware decode; check the display PC's GPU driver. On a NAS-backed library, install the edge mirror so playback is local. 4K on three screens from one machine is genuinely demanding.

**Screens fall out of sync**
They sync via WebSocket, not local storage — a screen that can't reach the server drifts. Check `clients` in `/api/health`; look for origin-refusal lines in the log if you're serving from an unusual hostname.

---

## Home Assistant

**Lights don't respond**
1. `curl /api/health` → `"ha": true`? If false, `HA_URL`/`HA_TOKEN` aren't both set.
2. Are zones mapped? `config.json` → `ha.lightZones`. An empty zone map means nothing to control.
3. Test the token: `curl -H "Authorization: Bearer $HA_TOKEN" $HA_URL/api/` should return a JSON message.

**TVs don't turn on/off**
`ha.tvs` maps frame ids to `media_player` entities and is empty by default. Fill it in the wizard. For Samsung Frame TVs, `turn_off` means "art mode", not "off" — that's the TV, not Roomscape. Set `ha.tvQuirks: {"<entity>": "samsung-frame"}` if wake behaves oddly.

**NFC taps stopped working after upgrading**
Expected — as of v1.01 `/api/tag/*` requires the admin token by default. Add the header to your HA `rest_command`:
```yaml
rest_command:
  roomscape_tag:
    url: "http://<server>:8090/api/tag/{{ tag_id }}"
    method: post
    headers:
      x-rs-token: "<your token>"
```
Or set `"auth": {"tagOpen": true}` in `config.json` to restore the old behaviour.

**The wizard shows no HA entities**
`GET /api/ha/entities` needs HA configured *and* the admin token. If HA is unset you get a friendly explanation card instead — that's not a bug.

---

## Music

**No music, and the music UI is missing**
Music Assistant isn't configured. Set `MA_URL` (and `MA_TOKEN` for MA ≥2.5) in `.env` and restart. The UI hides rather than errors by design.

**Modes don't change the music**
Check the mode has a playlist/query set, and that a matching playlist exists in MA. Roomscape matches by exact name first, then by "all search terms present". **If any single term in the query is shorter than 3 characters, the whole substring fallback is skipped** and nothing plays — the log says so explicitly. Watch it when you switch modes.

**A theme pack's music doesn't match anything**
Packs suggest a *search query*, not a playlist — deliberately, so packs are portable. If nothing in your library matches, pick a playlist yourself in Design; your choice is stored locally.

---

## Theme packs

**Import fails**
- **409 "exists"** → a pack with that id is installed. Confirm the replace prompt; the old copy goes to `themes/.trash` (nothing is deleted).
- **400 with file names** → the zip contains disallowed types. Only images, video, audio, `md`, `json`, `txt` are accepted (no HTML/JS/SVG, by design).
- **Read-only filesystem** → under Docker, `themes/` must be mounted writable. v1.01+ compose does this; older ones mounted `:ro`.

**A pack installs but doesn't appear in Play**
`GET /api/themes` shows per-pack `errors`. Most common: `format` isn't `1`, or the folder name has illegal characters (lowercase `a-z`, `0-9`, `-` only).

**Lighting in a pack does nothing**
The pack names zones (`main`, `accent`); *you* map zones to bulbs in `config.json` → `ha.lightZones`. Unknown zone names are dropped with a boot log line.

---

## Data and recovery

**I lost my modes / a save went wrong**
Backups are in `data/_backups/` (everything from the last 48 h, first-of-day for 60 days). The app also has a **Time Machine** with hourly snapshots and restore.

**"Blocked a profiles write" in the log**
The anti-wipe guard stopped a save that would have deleted most of your modes — usually a client bug or a bad bulk edit. Your data is intact on disk. As of v1.03 this reports an honest error to the app rather than a false success.

**A save reported "no backup written"**
The backup folder isn't writable. Under Docker, check the `../data:/app/data` mount. The save still happened — but fix this, it's your safety net.

---

## Performance

**Media pickers are slow / no thumbnails**
neither `sharp` nor `jimp` is installed, so originals are served instead of thumbnails. Docker installs it automatically; on bare Node run `npm install sharp`. Then ⚙ → Rescan.

**Rescan takes forever**
It walks 6 levels deep. Keep the library tidy, and note that `_backups`, `_to_delete` and dot-folders are skipped automatically.

**High memory after long uptime**
Check `clients` — orphaned WebSocket connections from screens that came and went. Restarting the Conductor is safe and screens reconnect on their own.

---

## Still stuck?

Open an issue with:
1. `curl http://<server>:8090/api/health` output
2. Your layout — `curl http://<server>:8090/api/layout`
3. Relevant log lines (`docker compose logs --tail=200 roomscape`)
4. What you did, what you expected, what happened
5. Server platform, HA version, and what the screens are

The logs redact secrets (admin/HA/MA tokens) automatically, but skim before pasting — entity ids and file paths are still in there.
