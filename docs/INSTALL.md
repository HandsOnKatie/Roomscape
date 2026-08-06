# Installing Roomscape

**Doc version 0.20** · Applies to the Conductor container + Ubuntu display-PC kiosk kit. (0.20: First-run wizard section.)

Two halves to install:

1. **The Conductor** — one server process (Docker or bare Node) that owns all state and serves everything.
2. **Display PCs** — one small Linux PC per wall of TVs, booting straight into fullscreen kiosk browsers.

> **Security first:** Roomscape is LAN-only. Never port-forward it. See `SECURITY.md`.

## 1. Conductor — Docker quick start (recommended)

Anything that runs Docker works: NAS, Raspberry Pi, mini PC, home server.

```bash
git clone https://github.com/<you>/roomscape
cd roomscape
cp .env.example .env          # fill in HA_URL + HA_TOKEN (see docs/HA-SETUP.md)
cd docker
docker compose up -d
```

Open `http://<server-ip>:8090` — the control app loads. The compose file mounts the repo read-only as the served web root, and keeps writable state in `data/` (mapped to `/app/data`, deliberately **outside** the web root) and thumbnails in `media/.thumbs/`; see `docker/compose.yaml` for the exact mapping.

### First run — the setup wizard

On its very first boot the Conductor prints an **admin token** in its log (also
written to `data/admin-token` — `<DATA_DIR>/admin-token` if you set `DATA_DIR`);
any change you save from the app asks for it once. Grab it with
`docker logs roomscape | grep "admin token"` (bare Node: it's in the console
output).

Keep that token handy: it is also what your Home Assistant `rest_command` needs
for NFC tag taps (see [HA-SETUP.md](HA-SETUP.md)), since `auth.tagOpen` defaults
to `false` from 1.01 onward.

Then open the app: a **🚀 Set up your room** card sits at the top of Play. It
walks you through — room name, how many screens and on which walls, which Home
Assistant `media_player` sits behind each frame (the 🔦 Identify button flashes
a frame's ID on its TV so you can tell them apart), light zones, and theme
packs. Every step is skippable; "Later" tucks it away, and **⚙ Settings →
System → 🚀 Setup wizard** (or adding `?setup=1` to the URL) brings it back
anytime. Layout changes advise a Conductor restart when they're done.

Updating: `git pull`, then `docker restart roomscape` (content/web files apply instantly; `conductor.js` needs the restart).

**Bare Node alternative** (no Docker): Node ≥16, then from the repo root: `node conductor.js`. Optional extras: `npm install sharp` (fast thumbnails) and `npm install mqtt` (HA MQTT bridge).

## 2. Display PCs — Ubuntu kiosk setup

One PC drives up to three portrait TVs. Reference build: AMD mini-PCs on Ubuntu Server 26.04; anything 24.04+ should work (newer kernels help with recent iGPUs — if the installer black-screens, try a newer release).

### 2a. Install Ubuntu Server

- Minimal server install, no desktop.
- Username: `kiosk` (the scripts default to the user that runs them via sudo).
- Tick **Install OpenSSH server**.
- Note the PC's IP (`ip a`) and give it a DHCP reservation in your router.

### 2b. Run the setup script

Copy the deploy kit to the PC and run it with your frame list and server URL:

```bash
scp -r deploy kiosk@<pc-ip>:~/
ssh kiosk@<pc-ip>
sudo bash ~/deploy/setup.sh "L1 L2 L3" http://<server-ip>:8090
```

- First argument: the frame ids this PC shows, **left to right** (`"L1 L2 L3"` for the left wall, `"R1 R2 R3"` for the right).
- Second argument: your Conductor URL.

The script installs X + a browser, deploys `~/.xinitrc`, sets console auto-login and auto-start, disables all sleep/blanking, and adds passwordless `systemctl restart getty@tty1` / `reboot` / `poweroff` for remote control. It reboots at the end — the TVs should come up showing frames.

For smooth 4K, install Google Chrome (deb) on the PC; the kiosk falls back to snap chromium (CPU video decode) otherwise.

### 2c. Map TVs to frames

If frames appear on the wrong TVs (or you add/move a TV):

```bash
sudo bash ~/deploy/configure-screens.sh L     # or R — your frame-id prefix
```

It detects connected outputs, asks for their left-to-right order and rotation, rewrites `~/.xinitrc` (timestamped backup first), and restarts the kiosk with corner frame-id labels on so you can verify by eye. Re-run as often as you like.

### 2d. TV settings (Samsung Frame and similar)

- Correct HDMI input, normal TV mode (Art Mode won't show HDMI).
- Rename the input to "PC" — enables PC mode (4:4:4 chroma, no motion smoothing).
- Turn off auto power-off / eco sleep.
- In the PC's BIOS: "Restore on AC Power Loss" → Power On.
- Frame TVs take HDMI only — DisplayPort outputs need **active DP→HDMI 2.0 (4K@60)** adapters; passive ones cap at 4K@30 and stutter.

## 3. Edge media mirror (optional — recommended for 3+ TVs per PC)

Streaming several 4K videos over the LAN at once can stutter. The edge mirror (`deploy/edge.js`) runs on each display PC, caches the whole media library on local disk, and serves it to the kiosks while proxying state/HTML/WebSocket through to the Conductor — the room keeps one source of truth.

```bash
ssh kiosk@<pc-ip>
sudo bash ~/deploy/install-edge.sh http://<server-ip>:8090
```

That installs Node if needed, copies `edge.js` + `frame-sink.js` to `~/immersion-edge/`, and starts the `immersion-edge` service on port 8090. Then point the kiosk at it: set `SERVER="http://localhost:8090"` in `~/.xinitrc` and `sudo systemctl restart getty@tty1` (setup.sh does this automatically on re-runs once the edge is installed).

Verify:

```bash
curl -s http://localhost:8090/edge/status     # prewarm progress, cache hits/misses
journalctl -u immersion-edge -f
```

Check disk space first: `df -h /` vs the library size reported by `/api/manifest`. Tuning (env in `/etc/systemd/system/immersion-edge.service`): `PREWARM=0` for cache-on-first-play, `CONCURRENCY`, `CACHE_DIR`. The cache (`~/framecache`) is safe to delete; it refills.

## 4. Audio routing (summary)

Per-TV audio lets each TV play the sound of the scene it shows:

1. On each display PC run `sh ~/deploy/install-audio.sh` (as the kiosk user) — installs PipeWire as a lingering user service.
2. The kiosk session (`deploy/xinitrc`) switches the GPU's HDMI audio card to the PipeWire **pro-audio** profile so every HDMI output is its own sink, and unmutes the IEC958 pins.
3. In the app: Settings → "Audio — PC HDMI port map" — map each frame id to its HDMI port. `frame-sink.js` resolves that map at kiosk launch and pins each browser (and the optional music player) to its own TV's sink.

Optional synced music through a TV's speakers via Music Assistant:

```bash
sh ~/deploy/install-music.sh L2 <ma-server-ip> http://<server-ip>:8090
```

## 5. Day-to-day

```bash
ssh kiosk@<pc-ip> "sudo systemctl restart getty@tty1"   # restart the frames
ssh kiosk@<pc-ip> "sudo reboot"                          # reboot a display PC
docker logs --tail 50 roomscape                          # conductor logs (on the server)
docker restart roomscape                                 # after editing conductor.js
```

Frames auto-reconnect to the Conductor with backoff, so a server restart never needs a kiosk restart.

## Troubleshooting quick hits

- **Scene sideways** → flip `ROTATE` in `~/.xinitrc` (or re-run configure-screens.sh).
- **Wrong TV shows the wrong frame** → re-run configure-screens.sh; reorder, don't re-plug.
- **Only one kiosk window launches** ("Opening in existing browser session") → snap chromium profile issue; the shipped xinitrc handles it — make sure the deployed `~/.xinitrc` is current.
- **~1 fps / CPU pegged** → browser fell back to software GL; the shipped xinitrc forces GPU flags — install Chrome (deb) if it persists.
- **Stuck at 4K@30 / washed-out colour** → the cable/adapter isn't HDMI 2.0.
- **`/bin/bash^M` errors** → Windows line endings; fix with `sed -i 's/\r$//' <file>`.
