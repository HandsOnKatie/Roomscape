# Roomscape

**Turn a wall of TVs into an immersive room.** Roomscape drives portrait screens, smart lights, and music together as one-tap "modes" — a calm gallery at rest, an ocean floor at dinner, a haunted manor on games night.

**Version: 1.01** — feature-complete first release plus a security fix pass (see [CHANGELOG](CHANGELOG.md#101--2026-08-06-conductor-v501--app-v383--engine-v091--fx-v161) and [SECURITY.md](SECURITY.md)). (Starter theme packs are still being hand-produced; the shipped `ocean-depths` pack demonstrates the format.)

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
| **Home Assistant** | The baseline. Lights, TV power, and NFC triggers route through HA |
| A server for the Conductor | Anything that runs Docker (NAS, Pi, mini PC) — or bare Node ≥16 |
| 1–6 portrait TVs + a PC to drive them | Kiosk scripts provided for Ubuntu mini PCs. One TV works; six is the classic wall |
| *Optional:* Music Assistant | For music + visualisers. Everything else works without it |

**v1 supports portrait screens only.** The classic layout is two walls of three portrait frames, but smaller setups work.

## Quick start

```bash
git clone https://github.com/<you>/roomscape
cd roomscape
cp .env.example .env          # add your HA_URL + HA_TOKEN (and MA_TOKEN if using Music Assistant)
cd docker
docker compose up -d
# open http://<server>:8090
```

Then see [docs/INSTALL.md](docs/INSTALL.md) for display-PC kiosk setup, and [docs/HA-SETUP.md](docs/HA-SETUP.md) for the Home Assistant bridge.

## Project status

This is a pre-release scaffold extracted from a live private installation (the original six-frame dining-room build). The engine is battle-tested; the packaging is new. See [ROADMAP.md](ROADMAP.md) for what's done and what's in flight — headline items still to land: the theme-pack loader/importer, the first-run wizard, and N-frame layout generalization.

## License

[MIT](LICENSE). Theme packs carry their own media licences — see each pack's `LICENSES.md`.
