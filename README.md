# Roomscape

**Turn a wall of TVs into an immersive room.** Roomscape drives portrait screens, smart lights, and music together as one-tap "modes" — a calm gallery at rest, an ocean floor at dinner, a haunted manor on games night.

**Version: 1.05** — feature-complete first release, plus three pre-release fix passes and a full pre-publication review (see [CHANGELOG](CHANGELOG.md) and [SECURITY.md](SECURITY.md)). (Starter theme packs are still being hand-produced; the shipped `ocean-depths` pack demonstrates the format.)

---

> ## ⚠️ Read this before installing
>
> Roomscape is a **LAN-only home tool**. It has no user accounts and only lightweight
> admin-token protection. **Never expose it to the internet. Never port-forward it.**
> If you want remote access, use a VPN (WireGuard, Tailscale). Do not run it on a
> network with untrusted users. It can control your lights, speakers, TVs, and play
> speech through your house — treat access to it like access to your Home Assistant.

---

## What it does

- **Modes** — one tap sets every screen's content, the lighting scene, and the music together. Modes are grouped into sections (Moods, Game Night, Seasonal…).
- **A wall of frames** — portrait TVs showing panoramas that span the wall, individual art, photo albums, music visualisers, clocks, scoreboards.
- **Effects & overlays** — weather layers, particle effects, transparent frame overlays, "reveal" moments where a still comes alive.
- **Lighting** — per-mode scenes and zone effects via Home Assistant (native Hue effects supported; a built-in flicker engine works with any bulb).
- **Music** — via [Music Assistant](https://music-assistant.io); modes can follow with a matching playlist.
- **Extras** — room timers, scoreboards with player profiles, party games (charades, quiz, music quiz, werewolf), cinematic mode intros, TTS announcements, NFC tag triggers.
- **Theme packs** — drop a theme folder into `themes/` to add a mode: art, sounds, lighting, effects in one shareable bundle. See [docs/THEMES.md](docs/THEMES.md).
- **First-run wizard** — a fresh install offers a 🚀 setup card in the app: name the room, lay out your screens, map Home Assistant TVs (with per-frame Identify) and lights, pick a theme — every step skippable, reopenable from ⚙ Settings → System.

## What you need

| Required | Notes |
|---|---|
| A server for the Conductor | Anything that runs Docker (NAS, Pi, mini PC) — or bare Node ≥16 |
| *Strongly recommended:* **Home Assistant** | Lights, TV power and NFC triggers route through HA. RoomScape runs without it, but that's where most of the magic is |
| *Optional:* portrait TVs + a PC to drive them | Kiosk scripts provided for Ubuntu mini PCs. The wizard supports 1–8 frames; six in two walls of three is the classic wall. Any browser can be a frame |
| *Optional:* Music Assistant | For music + visualisers. Everything else works without it |

**v1 supports portrait screens only.** The classic layout is two walls of three portrait frames, but smaller setups work.

## Quick start

```bash
git clone https://github.com/HandsOnKatie/roomscape
cd roomscape
cp .env.example .env          # add your HA_URL + HA_TOKEN (and MA_TOKEN if using Music Assistant)
cd docker
docker compose up -d
# open http://<server>:8090
```

The Conductor prints an **admin token** in its log on first boot — grab it with
`docker logs roomscape | grep "admin token"`. The app asks for it the first time
you save anything.

Then a **🚀 Set up your room** card walks you through the rest. Full walkthrough:
**[docs/INSTALL.md](docs/INSTALL.md)**.

## Documentation

**New here? Read these two, in this order:**

| Doc | What's in it |
|---|---|
| **[INSTALL.md](docs/INSTALL.md)** | **Start here.** Getting the Conductor running, the setup wizard, adding your artwork, then (optionally) display PCs, per-TV audio and the edge mirror. Ends with a checklist. |
| **[GUIDE.md](docs/GUIDE.md)** | **Then here.** A guided tour of every feature — what a *mode* is, the Play tabs, building modes in Design, phases, intros, the calendar, theme packs. Written for non-developers. |

**Then, as you need them:**

| Doc | What's in it |
|---|---|
| [HA-SETUP.md](docs/HA-SETUP.md) | Connecting Home Assistant: the token, mapping TVs and lights, NFC tags, the MQTT bridge |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Symptom → cause → fix |
| [FAQ.md](docs/FAQ.md) | "Do I need six TVs?", "Why no artwork?", "Can I use it remotely?" |
| [THEMES.md](docs/THEMES.md) | The theme-pack format, and how to build and share one |
| [REFERENCE.md](docs/REFERENCE.md) | The complete reference — every config key, environment variable, API route and WebSocket message, plus limits and known constraints |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces fit together (for contributors) |
| [SECURITY.md](SECURITY.md) · [SECURITY-AUDIT-2026-08.md](docs/SECURITY-AUDIT-2026-08.md) | The security model · the pre-release audits and what they found |

## Project status

Roomscape was extracted from a live private installation (the original six-frame dining-room build) and generalized for other people's rooms. The engine is battle-tested; the packaging is new, and nothing has been deployed publicly yet.

**Done and in the box:**

- N-frame layouts — any number of portrait screens, any wall grouping, configured in `config.json` or through the wizard (the six-frame two-wall room is just the default).
- Screen *roles* rather than hard-coded TV names, so modes written for someone else's wall still make sense on yours.
- The theme-pack loader, plus export and import as a zip from inside the app.
- The first-run setup wizard: name the room, lay out the screens, map Home Assistant TVs (with per-frame Identify) and lights, pick a theme.
- Docker packaging, a bare-Node path, and the display-PC kiosk scripts.
- Three rounds of pre-release security work, a documentation-inventory pass and a full pre-publication review — see [SECURITY.md](SECURITY.md), the [audit report](docs/SECURITY-AUDIT-2026-08.md) and the [CHANGELOG](CHANGELOG.md).
- A 209-check smoke suite (`node scripts/smoke.js`) that boots the Conductor six times against scratch paths and asserts on security behaviour, not just happy paths — run in CI on every push.

**Genuinely still pending:**

- **Hand-built starter theme packs.** Only `ocean-depths` ships today, and it exists mainly to demonstrate the format. Making good packs is art production, not code.
- **Landscape screens.** v1 is portrait-only. Landscape and mixed-orientation walls need real layout work, not a config flag.
- **A browser test rig.** `scripts/smoke.js` covers the server and asserts on the bytes served to a client, but nothing yet drives the actual app or frame pages in a browser.
- **A few reference-install assumptions** still leak through: the hard-coded `chandelier` / `lamps` light zones, a stray fallback room pill, and the `LEFT WALL` / `RIGHT WALL` labels in the Sound Studio. All documented in [GUIDE.md](docs/GUIDE.md); none of them break anything.

See [ROADMAP.md](ROADMAP.md) for the longer view.

## License

[MIT](LICENSE). Theme packs carry their own media licences — see each pack's `LICENSES.md`.
