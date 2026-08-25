# Installing RoomScape

**Doc version 1.05** · Conductor (Docker or bare Node) + the optional Ubuntu display-PC kiosk kit.

> ### ⚠️ Before you start
>
> RoomScape is a **LAN-only home tool**. Never port-forward it, never put it behind a public reverse proxy. If you want it from outside the house, use a VPN (WireGuard, Tailscale). It can control your lights, TVs and speakers and speak through your house — treat access to it like access to your Home Assistant. See [SECURITY.md](../SECURITY.md).

---

## What you're actually installing

RoomScape is two halves, and **you only strictly need the first one**:

1. **The Conductor** — one small Node process on a server somewhere. It owns all the state, serves the app and the TV pages, and talks to Home Assistant. This is the install.
2. **Display PCs** — one small Linux PC per wall of TVs, booting straight into fullscreen browsers. Optional in the sense that any device with a browser can show a frame — a spare laptop, a tablet, a Fire Stick with a browser. The kiosk kit just makes it automatic and reliable.

**Start with the Conductor and a browser tab.** Get a mode looking right on your laptop before you buy anything.

### What you need

| | Requirement |
|---|---|
| **Required** | A machine that runs Docker — a NAS, a Raspberry Pi, a mini PC, an always-on desktop. Or bare Node ≥16. It's a light process; thumbnail generation is the only spiky part. |
| **Strongly recommended** | [Home Assistant](https://www.home-assistant.io/). Lights, TV power and NFC triggers all route through it. RoomScape runs without it, but you lose lighting and TV control. |
| **Optional** | Portrait TVs and something to drive them — the wizard supports 1–8 frames. One screen is a valid install. |
| **Optional** | [Music Assistant](https://music-assistant.io) for music and visualisers. |
| **Optional** | A Home Assistant TTS entity, if you want the room to speak. The default is `tts.piper` (the Piper add-on via Wyoming); any HA TTS entity works. |

**v1 supports portrait screens only** — TVs mounted tall, like framed art. Landscape needs real layout work and isn't in this release.

---

## 1. Install the Conductor (Docker — recommended)

```bash
git clone https://github.com/HandsOnKatie/roomscape
cd roomscape
cp .env.example .env
```

Now open `.env` in a text editor. At minimum, fill in:

```bash
HA_URL=http://homeassistant.local:8123
HA_TOKEN=            # ← paste a long-lived access token here
```

Getting that token takes thirty seconds and is covered in [HA-SETUP.md](HA-SETUP.md#1-get-a-long-lived-access-token). If you don't have Home Assistant yet, leave both blank — RoomScape starts fine without them, and you can come back.

Then:

```bash
cd docker
docker compose up -d
```

Open `http://<your-server-ip>:8090`. The control app should load.

<!-- SCREENSHOT: the app on first load, showing the 🚀 Set up your room card -->

### Get your admin token

The Conductor generated one on first boot and printed it in the log:

```bash
docker logs roomscape | grep "admin token"
```

It's also saved to `data/admin-token` on the server.

**Keep this.** The app asks for it the first time you save anything, and Home Assistant needs it for NFC tag taps.

### Then: run the setup wizard

A **🚀 Set up your room** card sits at the top of the app. It walks you through naming the room, laying out your screens, mapping TVs and lights, and installing a theme. Every step is skippable and you can reopen it any time.

The full walkthrough is in [GUIDE.md → Your first hour](GUIDE.md#your-first-hour).

### Adding your artwork

RoomScape ships with almost no media — the art is yours.

1. Drop images and videos into the `media/` folder **in the repo root**. Subfolders become browsable groups.
2. In the app: **⚙ Settings → 🛠 System → ↻ Rescan media**.

Formats: `.png` `.jpg` `.webp` `.gif` for stills; `.mp4` `.webm` `.m4v` `.mov` for video.

### Updating

```bash
git pull
docker restart roomscape
```

Web files (the app, the frame page) apply instantly on reload. `conductor.js` needs the restart.

### Where things get written

Worth understanding once, because it explains the folder layout:

| Folder | What lives there |
|---|---|
| `data/` | What the Conductor writes: the admin token, backups, the thumbnail cache, and — under Docker — your modes (`profiles.json`) and room state too. Mounted at `/app/data`, deliberately *outside* the folder served over HTTP. See the note below for the bare-Node difference. |
| `media/` | Your scene library. |
| `people/` | Score-card portraits. |
| `sounds/` | Audio. `sounds/starter/` ships with six CC0 sounds so the intro templates work out of the box. |
| `decks/` | Word and question decks (`.txt`, one item per line). |
| `themes/` | Installed theme packs. |
| `overlays/` | Transparent PNGs to frame over artwork. |

**Back up `data/`.** That's your modes, your people, your scores, your schedule. Everything else is replaceable.

> **Where your modes actually live.** Under Docker, `compose.yaml` sets `PROFILES_FILE=/app/data/profiles.json`, so the Conductor writes `data/profiles.json` from its built-in defaults on first boot. The `profiles.json` in the repo root is a **sample only** and is never read — editing it does nothing.
>
> On **bare Node** it's the other way round: `profiles.json` and `state.json` default to the repo root, and only the admin token, backups and thumbnail cache go under `data/`. If you want everything in one place, set `PROFILES_FILE` and `STATE_FILE` the way the compose file does.

---

## 2. Install the Conductor (bare Node — no Docker)

Node 16 or newer:

```bash
git clone https://github.com/HandsOnKatie/roomscape
cd roomscape
cp .env.example .env      # fill in HA_URL + HA_TOKEN
node conductor.js
```

Two optional extras that are worth installing:

```bash
npm install sharp    # much faster thumbnail generation
npm install mqtt     # the Home Assistant MQTT bridge
```

RoomScape has **zero required npm dependencies** — those two are the only ones, both optional, and it degrades gracefully without either.

To keep it running, write a systemd unit or use your process manager of choice.

> **Careful with paths on bare Node.** `DATA_DIR` defaults to `<app>/data` and covers the admin token, backups and the thumbnail cache — but `STATE_FILE` and `PROFILES_FILE` default to the **app directory itself**, so your modes land in `./profiles.json` and room state in `./state.json`. To get everything under `data/` (which is what the Docker install does), set them explicitly:
>
> ```dotenv
> PROFILES_FILE=/path/to/roomscape/data/profiles.json
> STATE_FILE=/path/to/roomscape/data/state.json
> ```
>
> Every environment variable is listed in [REFERENCE.md](REFERENCE.md).

---

## 3. Showing frames on screens

A "frame" is one TV. Any browser can be one. The URL is:

```
http://<your-server>:8090/frame.html?frame=L1&ws=auto
```

Change `L1` to whichever frame id you want that screen to show.

**Try this first**, on a laptop or a tablet, before setting up dedicated hardware. Open two browser windows with `?frame=L1` and `?frame=L2` and you can see the whole system working.

For a permanent installation you want a machine that boots straight into fullscreen browsers with no desktop, no screensaver, and no power management. That's what section 4 sets up.

---

## 4. Display PCs — the Ubuntu kiosk kit

One PC typically drives three portrait TVs — that's what the reference build uses and what the cabling on a small machine allows. The kiosk script itself loops over however many outputs it finds.

**Reference build:** AMD mini-PCs on Ubuntu Server 26.04. Anything 24.04+ should work — newer kernels help with recent integrated GPUs. If the installer black-screens, try a newer release.

### 4a. Install Ubuntu Server

- Minimal server install, **no desktop**.
- Username `kiosk` (the scripts default to whoever runs them via sudo).
- Tick **Install OpenSSH server** — you'll want it.
- Note the PC's IP (`ip a`) and give it a DHCP reservation in your router so it doesn't move.

### 4b. Run the setup script

From your own machine, copy the deploy kit over and run it:

```bash
scp -r deploy kiosk@<pc-ip>:~/
ssh kiosk@<pc-ip>
sudo bash ~/deploy/setup.sh "L1 L2 L3" http://<server-ip>:8090
```

- **First argument:** the frame ids this PC shows, **left to right** as you face the wall. `"L1 L2 L3"` for the left wall, `"R1 R2 R3"` for the right.
- **Second argument:** your Conductor's URL.

The script installs X and a browser, deploys `~/.xinitrc`, sets console auto-login and auto-start, masks the system sleep targets (the kiosk session itself disables screen blanking and DPMS at start-up), and grants passwordless `systemctl restart getty@tty1` / `reboot` / `poweroff` so you can manage it remotely.

> **It reboots at the end**, after a ten-second warning. If you're evaluating this over SSH on a machine you'd rather not restart, press Ctrl-C during the countdown and reboot yourself when ready.

After the reboot, the TVs should come up showing frames.

**For smooth 4K, install Google Chrome (the .deb)** on the display PC. The kiosk falls back to snap Chromium otherwise, which uses CPU video decode and struggles.

### 4c. Get the right frame on the right TV

If frames land on the wrong screens — which they will, the first time:

```bash
sudo bash ~/deploy/configure-screens.sh L      # your frame-id prefix
```

It detects the connected outputs, asks you for their left-to-right order and rotation, rewrites `~/.xinitrc` (taking a timestamped backup first), and restarts the kiosk **with frame-id labels showing in the corners** so you can check by eye.

Re-run it as often as you like. Reorder in software — don't go re-plugging HDMI cables.

There's also a drag-and-drop version in the app: **⚙ Settings → 🏠 Room → ⇄ Arrange screens**.

### 4d. TV settings

Things that matter, learned the hard way:

- **Correct HDMI input, normal TV mode.** Art Mode won't show an HDMI source.
- **Rename the input to "PC"** — on Samsung sets this enables PC mode: 4:4:4 chroma and no motion smoothing. The difference on text and fine art detail is large.
- **Turn off auto power-off and eco sleep**, or the TVs will quietly go dark mid-dinner.
- **In the PC's BIOS: "Restore on AC Power Loss" → Power On.** Otherwise a power cut means walking round pressing buttons.
- **Frame TVs are HDMI-only.** If your PC has DisplayPort outputs you need **active DP→HDMI 2.0 (4K@60)** adapters. Passive ones cap at 4K@30 and stutter visibly.

> The shipped `deploy/xinitrc` assumes **4K portrait screens** (it sets a 3840×2160 mode and sizes each browser window 2160×3840). There's an `--auto` fallback for the display mode, but the window geometry is fixed. On 1080p TVs you'll want to edit `W` and `H` near the top of `~/.xinitrc` to `1080` and `1920`.

---

## 5. Edge media mirror (optional)

**Worth it if:** one PC is driving three TVs playing 4K video, and you see stuttering.

Streaming several 4K files over the LAN simultaneously is genuinely demanding. The edge mirror runs on each display PC, caches the whole media library on local disk, and serves it to the kiosks locally — while still proxying state and the WebSocket through to the Conductor, so the room keeps one source of truth.

```bash
ssh kiosk@<pc-ip>
sudo bash ~/deploy/install-edge.sh http://<server-ip>:8090
```

That installs Node if needed, copies `edge.js` and `frame-sink.js` to `~/immersion-edge/`, and starts the `immersion-edge` service **on port 8090**.

Then point the kiosk at itself: set `SERVER="http://localhost:8090"` in `~/.xinitrc` and `sudo systemctl restart getty@tty1`. (Re-running `setup.sh` does this for you once the edge is installed.)

Check it's working:

```bash
curl -s http://localhost:8090/edge/status     # prewarm progress, cache hits/misses
journalctl -u immersion-edge -f
```

**Check disk space first** — compare `df -h /` against your library size. The cache lives in `~/framecache` and is safe to delete at any time; it refills.

Tuning lives in `/etc/systemd/system/immersion-edge.service`: `PREWARM=0` switches to cache-on-first-play, plus `CONCURRENCY` and `CACHE_DIR`.

> ### 🔴 Security warning — read this one
>
> **The edge service has no authentication at all**, answers every request with a wide-open CORS header, and **binds all network interfaces**. Anyone who can reach that PC on port 8090 can prune its media cache, start a full-library download, or **rewrite its startup script and restart the kiosk session**. (The cache prune is bounded — it only removes files the Conductor no longer lists — but the startup-script rewrite is not.)
>
> It exists on the assumption that display PCs sit on a physically-controlled network. If you install it:
>
> - keep the display PCs on a trusted LAN segment, ideally a separate VLAN where only the Conductor can reach them
> - firewall port 8090 **on every display PC**, not just on the Conductor host
> - never expose it beyond that segment under any circumstances
>
> If you're running one PC and one TV, you probably don't need the edge mirror. Skip it.

---

## 6. Per-TV audio (optional)

The point: each TV plays the sound of the scene *it* is showing. An owl hoots on the frame with the forest, not everywhere.

1. On each display PC, as the kiosk user:
   ```bash
   sh ~/deploy/install-audio.sh
   ```
   This installs PipeWire as a lingering user service.

2. The kiosk session switches the GPU's HDMI audio card to PipeWire's **pro-audio** profile, so every HDMI output becomes its own independent sink, and unmutes the IEC958 pins.

3. In the app: **⚙ Settings → 🔧 Setup → Audio — PC HDMI port map**. Map each frame id to its HDMI port. The **🔦 ID** button flashes the frame id on the TV *and* plays a tone through that port simultaneously, so you can walk the wall and match them without guessing. **🔦 Identify all TVs** steps through every port automatically.

`frame-sink.js` reads that map at kiosk launch and pins each browser to its own TV's sink.

**Optional:** synced music through a specific TV's speakers via Music Assistant:

```bash
sh ~/deploy/install-music.sh L2 <ma-server-ip> http://<server-ip>:8090
```

> The music service hard-codes `XDG_RUNTIME_DIR=/run/user/1000`. If your kiosk user isn't UID 1000, edit `/etc/systemd/system/immersion-music.service` after install or audio will silently go to the default sink.

---

## 7. Day-to-day operations

```bash
# on the server
docker logs --tail 50 roomscape      # what's the Conductor doing
docker restart roomscape             # after editing conductor.js

# display PCs
ssh kiosk@<pc-ip> "sudo systemctl restart getty@tty1"    # restart the frames
ssh kiosk@<pc-ip> "sudo reboot"                          # reboot the PC
```

Frames reconnect to the Conductor automatically with backoff, so **restarting the server never requires touching the display PCs**.

From inside the app, **⚙ Settings → 🛠 System** has `↻ Reload all frames` and `⟳ Restart Conductor` if you'd rather not use a terminal.

---

## Installation checklist

Work down this list; each step should visibly work before the next.

- [ ] `docker compose up -d` and the app loads at `http://<server>:8090`
- [ ] The status dot in the top bar is **green**
- [ ] You've retrieved the admin token from the log
- [ ] `.env` has `HA_URL` and `HA_TOKEN`, and ⚙ Settings → System says **"Home Assistant: connected"**
- [ ] The setup wizard has run — room named, screens laid out
- [ ] Artwork is in `media/` and a Rescan has found it
- [ ] `frame.html?frame=L1&ws=auto` shows something in a browser tab
- [ ] You've built and saved one mode of your own
- [ ] *(if using TVs)* Display PCs boot into frames unattended
- [ ] *(if using TVs)* Each frame id is on the physically correct TV
- [ ] `data/` is included in whatever backs up that machine

---

## Common first-install problems

| Symptom | Cause | Fix |
|---|---|---|
| App won't load at all | Container not running, or wrong IP | `docker ps`, `docker logs roomscape` |
| Status dot stays grey | The browser can reach the page but not the WebSocket | Check for a proxy between you and the server |
| "Home Assistant not configured" | `HA_URL` / `HA_TOKEN` missing or wrong | [HA-SETUP.md](HA-SETUP.md); restart the Conductor after editing `.env` |
| Every frame shows a placeholder | No media yet | Add files to `media/`, then ⚙ → Rescan |
| Saving does nothing | No admin token stored | ⚙ Settings → System → 🔑 Admin token… |
| Master volume slider does nothing | Same — the slider works over the WebSocket and fails silently | Enter the token; it fixes itself without a reload |
| Scene appears sideways | Rotation | Re-run `configure-screens.sh`, or ⚙ → Room → ⇄ Arrange screens |
| Wrong TV shows the wrong frame | Output order | Re-run `configure-screens.sh` — reorder in software, don't re-plug |
| Only one kiosk window opens | Snap Chromium profile clash | Make sure the deployed `~/.xinitrc` is the current one |
| ~1 fps, CPU pegged | Browser fell back to software GL | Install Google Chrome (.deb) on the display PC |
| Stuck at 4K@30, washed-out colour | Cable or adapter isn't HDMI 2.0 | Use an active DP→HDMI 2.0 adapter |
| `/bin/bash^M` errors | Windows line endings | `sed -i 's/\r$//' <file>` |

More symptoms in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Next

- **[GUIDE.md](GUIDE.md)** — the guided tour of every feature. Read this next.
- [HA-SETUP.md](HA-SETUP.md) — connecting Home Assistant properly
- [THEMES.md](THEMES.md) — building and sharing theme packs
- [REFERENCE.md](REFERENCE.md) — every environment variable, config key and API route
