# FAQ

**Doc version 1.05.** Questions people ask before, during and after installing. If yours isn't here, try [GUIDE.md](GUIDE.md) (the guided tour), [REFERENCE.md](REFERENCE.md) (the deep dive) or [TROUBLESHOOTING.md](TROUBLESHOOTING.md) (when something's broken).

---

## Before you start

**Do I need six TVs?**
No. One screen works. The layout is configurable from the first-run wizard — pick how many frames you have and how they're grouped. Six in two walls of three is what the reference build uses, not a requirement.

**Do I need Home Assistant?**
Yes, realistically. It's the baseline requirement. Roomscape will run and drive screens without it, but lights, TV power, speech and NFC all route through HA. If you have a smart home already, you almost certainly have HA.

**Do I need Music Assistant?**
No. Without it, music features simply hide — no errors, no broken UI. With it you get per-mode playlists, audio-reactive visualisers and the music quiz.

**Will this work with LG / Sony / Hisense / a projector / an old monitor?**
Yes. Roomscape doesn't care what the screen is — it serves a web page. The only Samsung-specific thing in the whole system is an optional "art mode" quirk flag for Frame TVs. Anything that runs a modern Chromium browser full-screen will work.

**Does it need to be portrait?**
For v1, yes. The layout maths and CSS assume tall screens. Landscape is on the roadmap but not supported — a landscape screen will render, but panorama slicing and text sizing will look wrong.

**Can I run it on a Raspberry Pi?**
The Conductor, yes — it's a lightweight Node process. Driving 4K video on multiple screens from one Pi is a different question; a Pi 5 handles one screen comfortably. The reference build uses mini PCs for the screens and a NAS for the Conductor.

**Can I use it outside my house — from work, on holiday?**
Only via a VPN (WireGuard, Tailscale) so your phone joins the home network. **Never port-forward it.** It has no user accounts, no TLS and a single shared token; on the open internet it would be trivially abused. This isn't caution-for-caution's-sake — read [SECURITY.md](../SECURITY.md).

**Is it free? What's the licence?**
MIT for the software. Theme packs carry their own media licences — see each pack's `LICENSES.md`.

**Does it phone home / collect anything?**
No. There's no telemetry, no analytics, no update check. It talks to your Home Assistant and (optionally) your Music Assistant. That's it.

---

## Content and theme packs

**Why does it ship with almost no artwork?**
Because the maintainer's own library is built from licensed and purchased material — stock footage, generated art from film and game themes — that legally can't be redistributed. Shipping it would be handing you someone else's copyright problem. Instead, theme packs can ship **prompts instead of pixels**: the structure, the lighting, the sounds and a `prompts.md` telling you exactly what to generate. See [THEMES.md](THEMES.md).

**So where do I get artwork?**
Three routes: generate your own (any image/video AI — the packs include prompts), buy stock, or use CC0 sources. A pack with missing files still installs and runs — each missing file shows a labelled 🧩 placeholder telling you what to drop in.

**What makes good scene artwork?**
For panoramas: wide, roughly 3× the width of one portrait screen, with the interesting content spread across rather than centred. For portraits: tall, 9:16. Video loops beat stills for atmosphere. Dark, low-contrast scenes read better in a lit room than bright busy ones.

**How do I share a theme I've made?**
⚙ Settings → 🧩 Theme packs → **Export** gives you a `.zip`. Share that. Others import it through the same sheet. Check the media you're including is yours to share, and list it in `LICENSES.md`.

**Can I export a mode I built in Design?**
Not yet. Export currently works for theme packs only — exporting a Design-built mode means walking all its media references out of your personal library, which is the "pack builder" feature on the roadmap. For now, build shareable content as a theme pack from the start.

**What happens if two packs use the same name?**
Nothing bad. Every pack's modes are namespaced by its folder (`ocean-depths.main`), so collisions are impossible.

**Can a theme pack mess with my lights or run code?**
No. Packs can only express lighting *semantically* — "candle effect on the main zone" — and your config decides which bulbs "main" means. Packs may never contain entity ids, IPs or scripts. Imports are extension-whitelisted (no HTML, no JS, no SVG) and can't escape their folder.

---

## Setup and configuration

**Where's the admin token?**
Printed once in the boot log (`docker compose logs roomscape | grep "admin token"`) and saved to `data/admin-token`. The app asks for it the first time you change something, then remembers it. Re-enter or rotate it any time via ⚙ Settings → System → 🔑 Admin token.

**Can I turn the token off?**
Yes — `config.json` → `"auth": {"enabled": false}`. Only do this on a network where you'd be comfortable with anyone changing your lights. It's there for people upgrading from pre-1.00 installs.

**How do I map which TV is which?**
The wizard's screen step has an **Identify** button per frame — it flashes that TV's id on screen so you can match physical position to entity. You can rerun the wizard any time from ⚙ Settings → System.

**Can I change the layout later?**
Yes — rerun the wizard, or edit `config.json`. Changing wall shape rewrites your layout (it replaces, not merges). Existing modes adapt: per-frame arrays resize to your new layout.

**Do I have to use "walls"?**
A wall is just a group of adjacent screens that a panorama spans. One wall of one screen is a perfectly valid layout.

**What are "roles"?**
Named positions derived from your layout: `primary` (where speech comes from), `centers`, `corners`, `sweepOrder` (for audio that travels across the room). Features like the quiz and rules cards target roles, not specific TVs, so they work on any layout. Override them in `config.json` if the automatic choice isn't what you want.

**Where does my stuff live? What do I back up?**
`profiles.json` (all your modes), `config.json`, `themes/` and your media. Everything else regenerates. See [REFERENCE.md §8](REFERENCE.md#8-files-and-directories).

---

## Running it

**How much does it cost to run?**
The Conductor is negligible — ~150 MB RAM, near-zero CPU when idle. The screens are the power draw: six 43" TVs is real electricity. Modes can turn screens off (`at rest` does), and room rhythms can do it on a schedule.

**Will it hammer my NAS streaming 4K to six screens?**
It can, which is why the optional **edge mirror** exists: each display PC caches media locally and plays off its own disk. Small installs don't need it.

**Does it work offline?**
Yes, apart from features that reach out by design: YouTube tutorial embeds in the rules wall, and whatever Music Assistant streams. Everything else is local.

**What happens when the Conductor restarts?**
Screens reconnect automatically (1 s→30 s backoff) and resume the current scene — state is cached server-side and persisted to disk. No kiosk restart needed.

**Can two people use the app at once?**
Yes. State is server-authoritative and broadcast, so both tablets stay in sync.

**Does it support multiple rooms?**
Partially. The room with screens is the main event; additional rooms are driven through HA only (lights, scripts, covers, media players) with no screens of their own.

---

## Development and contributing

**Why is `conductor.js` 5,800 lines with three different routing mechanisms?**
Honest answer: it grew by appending self-contained blocks to a system that was running in a live house, where "don't touch working code" beat "keep it tidy". It's being migrated to a proper router incrementally. New routes should use the router. See [REFERENCE.md §4](REFERENCE.md#4-architecture).

**Why zero npm dependencies?**
Deliberate. It makes the thing installable anywhere, immune to supply-chain churn, and trivially auditable. There's a hand-rolled WebSocket server and a hand-rolled zip reader/writer for exactly this reason. `sharp` and `mqtt` are optional and degrade cleanly. **Please don't add required dependencies.**

**How do I test changes?**
`node scripts/smoke.js` — 173 checks covering the whole API surface, auth paths, theme round-trips and layout derivation. No HA or MA needed; it boots the Conductor on a scratch port. It should stay green.

**Is there a UI test suite?**
No, and that's the biggest gap. Smoke is HTTP-only; UI flows are checked by canaries (does the served page contain the expected hook) rather than driven in a browser. A real browser rig is on the roadmap — a genuinely welcome contribution.

**What would you most like help with?**
In order: theme packs (the community flywheel), hardware reports from layouts that aren't six portrait TVs, landscape support, and a browser test rig.

**Has the code been security-reviewed?**
Yes — three independent adversarial reviews, a documentation-inventory pass, and a full pre-publication review, all before release. Between them they found and fixed several critical issues including a secret-leaking static handler, an unauthenticated WebSocket takeover path, an admin token leaking through an open log endpoint, and a stored-XSS hole in the scoreboard. See the v1.01–v1.04 entries in [CHANGELOG.md](../CHANGELOG.md) and the [audit report](SECURITY-AUDIT-2026-08.md). It's still a LAN-only tool by design; the reviews sharpened it, they didn't make it internet-safe.
