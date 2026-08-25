# Using RoomScape

**Doc version 1.05** · A guided tour of the whole app, in the order you'll meet it.

This is the "what do all these buttons do" document. It assumes RoomScape is installed and you can open it in a browser — if not, start with [INSTALL.md](INSTALL.md). It does **not** assume you know Home Assistant, Docker, or anything about the code.

Read it front to back the first time. After that, use the contents to jump.

**Contents**

- [The shape of the thing](#the-shape-of-the-thing) — the one idea you need
- [Your first hour](#your-first-hour) — the setup wizard, then a mode of your own
- [The screen furniture](#the-screen-furniture) — the bits that are always there
- [Play — the family remote](#play--the-family-remote)
  - [🎲 Modes](#-modes) · [♪ Music](#-music) · [💡 Lights](#-lights) · [⏱ Timer](#-timer) · [🏆 Scores](#-scores) · [🎭 Moments](#-moments) · [🎉 Games](#-games)
- [Design — building modes](#design--building-modes)
  - [The canvas](#the-canvas) · [🖼 Wall](#-wall-lens) · [🔊 Sound](#-sound-lens) · [💡 Lighting](#-lighting-lens) · [🎬 Intro](#-intro-lens) · [✨ Motion & FX](#-motion--fx-lens) · [☑ Behaviour](#-behaviour-lens) · [📖 Rules](#-rules-lens)
- [The calendar and autopilot](#the-calendar-and-autopilot)
- [Theme packs](#theme-packs)
- [Settings](#settings)
- [The admin token](#the-admin-token)
- [Things that need more than the app](#things-that-need-more-than-the-app)
- [Keyboard shortcuts and gestures](#keyboard-shortcuts-and-gestures)

---

## The shape of the thing

RoomScape has exactly one big idea, and everything else follows from it.

> **A *mode* is one saved look for the whole room.**

Not one screen — the whole room. A mode holds, all at once:

- what every TV shows (a panorama spanning the wall, individual art, a photo album, a clock, a scoreboard, a music visualiser…)
- what the lights do (a scene, per-zone effects, a flicker)
- what you hear (background music, an entrance sting, occasional owl hoots)
- how it behaves (kid-safe or not, does it show in the family remote, does the calendar allow it)

You tap a mode. The room becomes it. That's the product.

Everything else in the app is either **playing** modes (the Play space) or **building** them (the Design space). There are only those two spaces, and you switch between them with the pills at the top.

<!-- SCREENSHOT: the app on a tablet, Play → Modes, a few mode cards visible -->

**A second idea, worth having early:** *frames*. A frame is one TV, and it has an id like `L1` or `R2`. The id is what everything else refers to — "put the scoreboard on R3", "this sound plays on L2". The Conductor doesn't know or care which physical TV that is; the display PC decides that. This is why you can hand someone else a mode you built and it still makes sense on their wall.

---

## Your first hour

### 1. Open the app

Point a browser at `http://<your-server>:8090`. A tablet is the natural home for it; a laptop is fine.

The top bar shows a small dot next to the RoomScape name. **Green means the app is talking to the Conductor.** Grey means it isn't — if it's grey, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) before going further.

If you get a full-screen card reading *"Can't reach the Conductor"*, the server isn't running or isn't reachable. The card retries by itself every five seconds, so fixing the server is enough — you don't need to reload.

### 2. Get your admin token

RoomScape lets anyone on your network **look**. It only lets people who have the admin token **change** things.

The Conductor generated one the first time it started and printed it in its log:

```bash
docker logs roomscape | grep "admin token"
```

It's also in a file on the server: `data/admin-token`.

You don't have to do anything with it yet. The first time you try to save something, the app will ask for it, and remember it in that browser from then on. But have it to hand — the wizard's very first save will want it.

> **Why this matters:** the token is not just "permission to change things", it's permission to *remove the lock*. Anyone holding it can turn authentication off entirely. Treat it like your Home Assistant password. Full details in [SECURITY.md](../SECURITY.md).

### 3. Run the setup wizard

On a fresh install, a card sits at the top of Play:

> **🚀 Set up your room**
> Name the room, lay out your screens, connect Home Assistant, pick a theme — about two minutes, every step skippable.
> **Start** · **Later**

Press **Start**. Five steps:

| Step | What it asks | Notes |
|---|---|---|
| **1 · Name the room** | `Room name` (e.g. "Dining room") | Used in the app header and by Home Assistant automations. Skip and it stays "Main Room". |
| **2 · Screens on the wall** | How many TVs (1–8), and `One wall` / `Two walls, split evenly` / `Custom…` | **Portrait screens only in v1** — TVs mounted tall, like framed art. Custom lets you type `L: L1, L2, L3` one wall per line. Changing this later is fine; the Conductor will ask for a restart afterwards. |
| **3 · Which TV is which?** | A Home Assistant media player for each frame | The **🔦 Identify** button flashes that frame's id on its TV, so you can walk the wall and match them up. Needs Home Assistant — skip it if you haven't set that up yet. |
| **4 · Lights (optional)** | Each Home Assistant light → `main`, `accent`, or `not used` | Modes drive the **main** zone (ceiling, spots). **accent** is for lamps that should follow more gently. **Note:** this step writes `ha.lightZones` only. The separate flat `ha.lights` list — which the Lights tab's scene cards, Moments light flashes and intro light cues all read — must be set by hand in `config.json`. See [HA-SETUP.md](HA-SETUP.md#4-map-each-frame-to-its-tv). |
| **5 · Theme packs** | Shows what's installed, lets you import a `.zip` | A theme pack is a ready-made mode — scenes, sounds, lighting — in one bundle. See [THEMES.md](THEMES.md). |

Every step has **Skip**. Nothing here is permanent, and you can reopen the whole wizard any time from **⚙ Settings → 🛠 System → 🚀 Setup wizard** (or by adding `?setup=1` to the URL).

The first save asks for your admin token. Enter it once and the rest of the wizard flows.

Finishing toasts **🚀 Setup saved — welcome home**.

<!-- SCREENSHOT: wizard step 3, showing the frame → media player rows and the 🔦 Identify buttons -->

> **If you changed the layout in step 2**, restart the Conductor when convenient: **⚙ Settings → 🛠 System → ⟳ Restart Conductor**. The app will tell you.

### 4. Add some artwork

RoomScape ships with almost no media on purpose — the art is yours. Until you add some, frames show a placeholder.

Drop images and videos into the `media/` folder on your server (subfolders become browsable groups in the scene picker), then in the app: **⚙ Settings → 🛠 System → ↻ Rescan media**.

What works:

| Type | Formats | Notes |
|---|---|---|
| Stills | `.png` `.jpg` `.webp` `.gif` | Portrait images suit portrait frames. Landscape works but gets cropped unless you change Scene fit. |
| Video | `.mp4` `.webm` `.m4v` `.mov` | 4K is fine on decent hardware. See [the edge mirror](INSTALL.md#5-edge-media-mirror-optional) if several 4K streams stutter. |

For a **panorama that spans the whole wall**, you want one very wide image — the frames each show their slice of it. See [Wall layout](#wall-layout) below.

### 5. Make your first mode

Press and hold the **✎ Design** pill (or just tap the **✏️** icon in the top bar — that one's a single tap).

> The hold is deliberate. Design is where things get broken, so it's slightly harder to enter by accident. A quick tap on the pill just toasts *"Hold to open Design"*.

Then:

1. **＋ New mode** in the strip on the left.
2. **Start from** — pick `▢ Blank`, or one of the ready-made starting points (`🎲 Board game night`, `🍽 Dinner ambience`, `❏ Photo wall`, `🎉 Event / party`).
3. **Name it**, pick an accent colour, optionally put it in a Play section.
4. **Create.**

You now have a **draft**. Nothing has reached the TVs.

5. **Double-click a frame** on the canvas → pick a scene from your media.
6. Flick **Preview on TVs** in the save bar to see it for real.
7. **Save.**

That's the loop. Everything below is detail.

---

## The screen furniture

Three things are always on screen regardless of which space you're in.

### The top bar

| Control | What it does |
|---|---|
| **RoomScape** + strapline | Branding. *Note: the strapline reads "Six frames · one room" and is hard-coded — it doesn't follow your room name or screen count.* |
| **▶ Play** / **✎ Design** | The two spaces. Design needs a 600 ms hold from Play. |
| (small dot) | Green = connected to the Conductor. |
| **📅** | The [calendar](#the-calendar-and-autopilot) — the room's year, days and sky. |
| **✏️** | One-tap switch to Design and back. Gets a gold ring while Design is open. |
| **⚙** | [Settings](#settings). |
| *(no 🎭 here)* | Reveal Studio is **not** in the top bar — it's a floating **🎭 Reveal Studio** pill in the **bottom-left corner** of the screen. See [below](#reveal-studio). |
| **🖼 This room** + room pills | Filters Play and Design to modes tagged for that room. *Rough edge: this bar is always shown, and out of the box a stray **🎮 Playroom** pill appears — it comes from a hard-coded fallback room list left over from the original install. Selecting it hides every mode. Ignore it, or set `rooms` in `config.json`.* |

### The Now bar

The strip under the header, showing what the room is doing right now.

| Control | What it does |
|---|---|
| Thumbnail + mode name | Tap the name to open that mode's **dashboard** (see below). |
| Phase / state line | `At rest`, or the current phase, or `connecting…` before the first reply. Appends `· ♪ music` when Music Assistant is holding the room. |
| **TVs** + dots | One dot per frame, green when connected. Tap for the per-screen wake/sleep popover. |
| Phase rail | Only when the live mode has [phases](#phases). Chips to jump between them, plus a gold **▸ next phase** button. |
| **☼ Autopilot** chip | Only when rhythms or weather are on. Opens the autopilot sheet. |
| **🔊** slider | Master volume across all TVs. **This one silently does nothing without an admin token** — see [the admin token](#the-admin-token). |
| **👶 Kid-safe** | Softens scares, lightning flashes and shakes. Room-wide, instant. |
| **■ RESTORE ROOM** | The panic button. Returns the room to its at-rest mode and aborts any running intro. |

### The mode dashboard

Tapping a mode card (or the mode name in the Now bar) opens its **dashboard** — everything you'd want mid-evening without going into Design:

- **Phases** stepper — launch the mode *at* a particular chapter
- **Sound** — album art, transport, separate `♪ Music` and `🔊 Room` volume sliders, `⏹ Off`
- **💡 Lights** — a swatch per scene, a brightness slider, all-off
- **🎭 Moments** — the mode's own theatrical buttons, plus cue cards
- **≋ Reveal** — trigger a reveal on a named frame
- **📖 Rules & tutorial** — show a game's rules on the wall
- **▶ Play from start** — reads **▶ Restart from base** when the mode is already live — and **✎** (edit in Design)

<!-- SCREENSHOT: a mode dashboard open, showing the phases stepper and lights swatches -->

---

## Play — the family remote

Seven tabs. This is the surface you hand to a guest.

### 🎲 Modes

The main event. Cards for every mode, grouped into sections you define.

- **Tap a card** → its dashboard (doesn't launch).
- **Tap the ▶ chip** → launches immediately.
- **Hold a card 600 ms** → toggle ★ Favourite.

Above the grid: a search field (which filters the Design strip at the same time), an `All` chip, and one chip per Play section you've created.

The grid orders itself: the setup card, then **★ Favourites**, then **Recently played** (last 8), then your sections, then anything uncategorised under **More**.

Badges you'll see: `★` favourite, `LIVE` currently playing, `🧩` came from a theme pack.

**Along the bottom**, a sticky room row:

| Button | What it does |
|---|---|
| **💡 Lights** | Popover of every Home Assistant scene. |
| **🖼 Wake TVs** | Wakes every mapped TV that's asleep. |
| **🌙 Art / sleep** | Puts every awake TV into Art Mode. |
| **🖵 Screens** | Per-frame wake / sleep / focus. |
| **❏ Photo wall** | Jumps to the first mode that uses photo frames. |
| **✨ Surprise me** | Fires a reveal on a random frame. |

If the live mode has reveal videos configured, a **Reveal** bar appears with a button per frame. If cue cards are running, a controller appears with `‹`, the current card, `›` and **✕ End cue cards**.

### ♪ Music

Drives [Music Assistant](https://music-assistant.io). **Everything here is hidden until you configure it** — you'll just see a `♪ Set up music` card asking for the Music Assistant address, a room player, and a token.

Once connected:

- **Now playing** — art, track, artist, transport (`⏮ ▶/⏸ ⏭`), shuffle, a volume slider, `⏹ Music off`
- Volume presets: **Dinner** (25) · **Normal** (40) · **Party** (65)
- **Up next** — a peek at the next three tracks
- **Mode music card** — one tap plays the live mode's own playlist
- **Playlists** — grouped automatically from a `Roomscape>Group>Name` naming convention into `★ Pinned`, `Moods`, `Games`, `Themes`, then everything else. Pin with the `☆` corner.
- **Songs** — search your library

When music is playing, a badge appears: *"♪ music is overriding the room's own sounds"*. That's expected — the mode's own soundscape steps aside.

### 💡 Lights

One-tap room lighting: a grid of scene cards, plus a **Whole room** card with a brightness slider and an all-off button.

> **Heads up:** this tab also shows two zone cards labelled **🕯 Chandelier** and **🛋 Console lamps**. Those two zone ids (`chandelier`, `lamps`) are **hard-coded from the original install**. The cards fill in with chips normally — but tapping any of them just toasts *"Zone unavailable"*, because those zones don't exist on your setup. Use the scene grid above and the per-mode [Lighting lens](#-lighting-lens) instead. Known rough edge.

Without Home Assistant the grid reads *"Home Assistant isn't connected (HA_URL / HA_TOKEN) — see HA-SETUP.md."*

### ⏱ Timer

Much more than an egg timer — it's show control.

**The stage** shows the clock in your chosen style, its state, and transport: `▶ Start` / `⏸ Pause`, `↩ Reset`, `+1:00`, `−0:10`.

**Drama — the countdown timeline** is the interesting part. A draggable timeline where **the right edge is zero**. Drop markers on it (up to 12) and each fires something as the clock passes:

- a clock colour change (amber, red)
- a pulse
- a sound
- a wall event (`⚡ Lightning`, `✷ Soft flash`)
- a full takeover of every screen

Drag to move (snaps to 5 s), tap to edit.

**The cards below:**

| Card | What it's for |
|---|---|
| **Presets** | Save a whole timer setup and re-apply it in one tap. Hold a preset for rename / update / delete. Presets can be global or scoped to one mode. |
| **Counter** | `Countdown` / `Count up` / `Time of day` / `♟ Chess`. Quick chips for 0:30 up to 10:00, or type `5:00`, `300`, or `1:02:30`. |
| **♟ Chess clock** | Per-player base time, increment per move, players pulled from your Scores roster. Live, each player gets a tappable card — tap to pass. |
| **Rounds — chained timers** | A list of named durations that run back to back, with loop and auto-start. |
| **Style** | Seven live clock faces: Digital, Minimal, Flip, Analog, Ring, Neon, Sand. Plus colour, and a text label (default `YOUR TURN`). |
| **Background** | A scene behind the clock. |
| **Show on** | Which frames show the clock, and whether hitting zero advances to the next phase. |

Reaching zero on a countdown throws a full-screen burst across the wall reading your label (or `TIME!`).

<!-- SCREENSHOT: the Timer tab with the drama timeline and a couple of markers -->

### 🏆 Scores

A people registry plus live scoring on the wall's Score frames.

1. **👥 People** — add everyone once. Each person gets a name, nickname, colour, a photo (upload, or pick from your Photos folder), and **titles** — free-text badges like *"Destroyer of Friendships (Monopoly)"*.
2. **🎯 Start scoring** — pick who's playing, hit start.
3. Score with `−` / `＋` / `+5` per player. The wall follows live.
4. **🏁 End game — crown the winner.** The leader is pre-picked; ties are allowed.

**🏆 Hall of fame** tracks games logged, most wins, most played, and the last few results. It also computes titles automatically: `👑 House Champion`, `🔥 N-win streak`, `🏅 Champion of <game>`.

There's a full-page scoreboard at `/scores` for putting on a spare screen.

### 🎭 Moments

Two things live here.

**🗣 Announce** — type a line, pick a voice, and the room says it out loud. Repeated lines are cached and play instantly.

> Needs a **Home Assistant TTS entity**. The default is `tts.piper` (the Piper add-on via Wyoming), but any HA TTS entity works — set `settings.tts.engine` to point at it. The control is always visible; with no working TTS it fails with *"TTS failed — is Piper set up in Home Assistant?"*

**🎭 Moments — on demand** — big buttons that fire a sound, a screen effect and a light action together. Each has a 1.5-second cooldown so nobody can machine-gun them.

Six ship by default: **⚡ Lightning**, **😂 Laughter**, **🥁 Punchline**, **🎻 Dramatic**, **👏 Applause**, **🎲 Chaos**.

> Only **⚡ Lightning** makes a sound out of the box — it uses a synthesised thunder clap. The other four sound-carrying defaults point at `sounds/laughter.mp3`, `sounds/rimshot.mp3`, `sounds/dramatic-sting.mp3` and `sounds/applause.mp3`, which are **not** shipped (media isn't). Supply your own files at those paths, or repoint them in the Moments editor.

Edit them from the **✎ Edit** link, or **⚙ Settings → 🔧 Setup → Open the Moments editor**. Per moment you set an icon, a label, a sound (with volume and a max length), a TV visual (`softflash`, `bloom`, `ignite`, `lightning`, `shake`) and a light action (flash, or dip-and-hold).

While kid-safe is on, `lightning` becomes a gentler `✨ Shimmer`.

**🃏 Cue cards** — pick a deck and a frame, and it prompts one item at a time on that TV. *"Pick the one behind your victim's head"*, as the UI puts it. Decks are `.txt` files in `decks/`, one line per item.

### 🎉 Games

Party games where the wall is the board and the tablet is the host console. Four ship:

| Game | How it works |
|---|---|
| **Charades** | Three modes: `🙆 Heads-Up` (word behind the guesser's head), `🎬 Classic` (actor peeks at one TV), `👯 Reverse` (whole team acts). The word shows on the TV *opposite* the guesser. Needs a word deck. |
| **General Knowledge Quiz** | Multiple choice puts A–D on the four corner TVs — stand under your answer. Reveal blacks out the wrong corners and blooms the right one. Needs a question deck (`question\|answer\|A\|B\|C\|D` per line). |
| **Music Quiz** | Plays a snippet from a Music Assistant playlist (5 s, 12 s or 30 s); first to shout it gets the point. |
| **Werewolf Narrator** | Roles dealt by hand; the room narrates the night phases in the voice you pick. Needs at least 4 players. |

Players come from your Scores roster, or you can type names in on the spot.

**🗂 Word decks** — an in-app editor for the deck files. Paste a list, name it, mark it kid-safe. Adding "(kid-safe)" to a deck's name lets charades use it while kid-safe mode is on. Every save backs the old file up first.

The host console survives a tablet refresh — the game state lives on the server, not in your browser.

> If this tab shows *"⚠ Couldn't reach the games engine"*, the Conductor isn't answering `/api/games` — check it's running and see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Design — building modes

Design is where modes are made. **Everything is a draft until you save.** Nothing reaches the TVs unless you press Save or turn on Preview.

The layout: a **mode strip** down one side, a **canvas** of your wall in the middle, a **lens bar** of editing tools, and an **inspector** for whatever's selected.

### The mode strip

Every mode as a card, grouped by section. The live one is tagged `LIVE`; the one you're editing pulses gold while dirty; hidden ones are dimmed.

**Right-click or hold 550 ms** for: `⧉ Duplicate`, `✎ Rename…`, `🧩 Export pack`, `🚫 Hide from Play`, `🗑 Delete…`, and `♻ Show deleted` when the bin isn't empty.

**Deletion is soft.** A deleted mode goes to a bin for 30 days. The toast offers Undo; after that, restore from `♻ Show deleted`.

### The canvas

One labelled column per wall, one portrait frame per screen.

| Gesture | Effect |
|---|---|
| Click | Select a frame |
| Shift / Ctrl-click | Multi-select |
| Click the selected frame again | Deselect |
| **Double-click** | Open the scene picker |
| **Drag one frame onto another** | Copy its type, scene, overlay, effect and reveal video |

Each frame shows its id, a connection dot, and `≋` when an effect layer is active.

### The save bar

Appears whenever there's unsaved work:

| Control | What it does |
|---|---|
| **Preview on TVs** | Pushes the draft to the real wall, live. Toggle it off and the room is restored. |
| **↩ Revert** | Throw the draft away. |
| **Save as new mode…** | Fork it. Asks only for a name. |
| **Save** | Commit. Green flash on success; on failure the local model rolls back so you never think you saved when you didn't. |

`Ctrl+S` saves, but only while Design is open.

---

### 🖼 Wall lens

What each TV shows.

**With nothing selected**, you set the mode-wide defaults:

- **Default scene** — the fallback artwork for every frame
- <a name="wall-layout"></a>**Wall layout** — `Auto`, `Fill each screen (whole)`, or **`Span the wall (panorama)`**. Panorama is the signature look: one very wide image sliced across every frame so the wall reads as a single window.

**With a frame selected**, pick its **content type**:

| Type | What it shows |
|---|---|
| **🖼 Panorama** | Its slice of the wall-spanning image |
| **🧍 Portrait** | Its own individual artwork |
| **❏ Photos** | A photo album, with 19 layout options from `Single print` through `Triptych` to `Mega wall 112` |
| **🎶 Music Viz** | A music visualiser — 14 styles including Cathedral Bars, Aurora Veils, 🌊 Great Wave, Reactive Fireplace, plus **🔀 Shuffle styles** |
| **♪ Playlist** | Now-playing art — 8 displays including Spinning vinyl, Cover flow, Lyric strip |
| **▤ Score** | The live scoreboard |
| **◰ Map** | A map panel |
| **◷ Clock** | The room timer / clock |
| **○ Off** | A dark, quiet panel |

For stills and video you also get **Scene fit** (`Fill & crop (default)`, `Fit inside`, `Stretch to fill`, `Fit to width`, `Fit to height`) and an optional **Overlay** — a transparent PNG framed over the top, with its own fit setting.

Two footer buttons copy the current frame's setup to **this Wall Set** or **All TVs**.

---

### 🔊 Sound lens

Selecting this lens replaces the canvas with the full-width **Sound Studio**.

The idea: **each TV owns its own speaker**, so you can place sound in the room rather than just playing it.

Three columns:

**Left — your sound library.** Everything in `sounds/`, searchable, grouped by folder. `▶` auditions on *your computer*, not the wall. The `▾` menu offers `🚪 Set as intro`, `🚪 Set as outro`, `⏱ Add as accent`.

**Middle — three working lanes** (a fourth is just a signpost pointing at the Wall lens):

| Lane | What it is |
|---|---|
| **🎵 Background playlist** | Loops for the whole session. Order, volume, and which frames carry it. |
| **🚪 Entrance & exit** | One-shots when the mode starts and ends. |
| **⏱ Periodic accents** | *"The room's wildlife."* Recurring one-shots at random-ish intervals — an owl every 60 seconds ±40%, a distant door, a creak. This is what makes a room feel alive rather than looped. |

**Right — room placement.** A tappable map of your TVs. Click the ones that should carry the playlist. The hint explains the trick: *"None lit = every TV (diffuse wash). A subset (e.g. L2 + R2) keeps real music clean — six copies phase against each other."*

**Where** options appear throughout: `All TVs`, `Random TV`, `Sweep →`, `Sweep ←`, or a specific frame.

> **Rough edge:** the placement map's wall labels read `LEFT WALL` / `RIGHT WALL` and are hard-coded. On a one-wall layout they'll be wrong. The map itself still works.

Drop `.mp3` / `.wav` files into `sounds/` (music in `sounds/music/`), then **⚙ → Rescan**. Six CC0 starter sounds ship with the repo.

---

### 💡 Lighting lens

Saved with the mode — the room sets itself like this every time you launch it.

- **Base scene** — the whole room
- Per zone, you can override the scene, set a **Light effect**, and set a brightness

Light effects come in two flavours:

- **Native Hue effects** (`candle`, `fire`, `sparkle`, `prism`, `opal`, `glisten`) run on the bulb itself. Smoothest, no knobs.
- **🔥 flicker** is RoomScape's own, works with any bulb, and gives you **intensity** and **speed** sliders.

**▶ Preview on the room now** tries it immediately without saving.

> Same caveat as the Lights tab: the zone names `chandelier` and `lamps` are hard-coded from the original install, so **▶ Preview on the room now** will toast *"Zone unavailable"*. The **Base scene** dropdown, which is what most modes actually need, works normally.

---

### 🎬 Intro lens

A cue timeline that plays *before* the mode loads. Lights out, a distant rumble, thunder, the room snaps into the haunted manor.

The editor runs full-width below the canvas (it needs the room).

Add cues from the row at the bottom: **🔊 Sound**, **⚡ Screen effect**, **💡 Lights**, **🗣 Voice**, **🖼 Title card on the wall**.

Each cue sits at a time you can nudge with `−.5` / `+.5`, and has:

- **Sound / Voice** — which sound, where, volume
- **Screen** — `⚡ Lightning`, `💥 Shake`, `🌸 Bloom`, `✨ Soft flash`, `⚪ White flash`, `⬛ Blackout`
- **Lights** — `⚡ Flash`, `🔅 Dip & recover`, `⭘ All OFF`, `⭗ All ON`, `🎨 Scene…`
- **Title card** — an image or video held on chosen frames

The `⟓` chain button keeps a cue's gap when the one above it moves — so you can slide a whole sequence without re-timing everything.

**▶ Rehearse** runs the intro in the room right now, without launching the mode at the end.

**Five templates** ship and work out of the box (they use the bundled CC0 sounds): `⛈ Storm & boom`, `🌀 Suspense reveal`, `🚀 Ship boot-up`, `🕯 Blackout séance`, `🎉 Party pop`. **They replace the current cue list**, so start from one rather than adding it to existing work.

**Options** worth knowing: `Skippable` (a `⏭` button appears in Play), what to do when kid-safe is on (skip, or run anyway), and an end time.

> Intros play on **manual launches only**. The calendar and schedule always skip them. Panic aborts one instantly. Hard caps: 60 seconds, 30 cues.

<!-- SCREENSHOT: the intro cue timeline with several cues of different types -->

---

### ✨ Motion & FX lens

**With nothing selected** — how the mode moves:

- **Transition** between scenes (17 options: crossfade, rackfocus, dipblack, wipe, iris, glitch, ripple, morph…)
- **Ambient** motion that runs continuously (kenburns, breathe, flicker, rain, snow, embers, fog, starfield, grain, caustics)
- A **Change event** and **Sound** that fire on every scene change
- **Matte & print tone** — put a picture-frame mount around the art, with a colour, width and texture. This is what makes a TV read as a framed print rather than a screen.

**With a frame selected** — its **effect layer** (a rain / fog / snow loop over the art), its **reveal video**, and whether reveals fire randomly as well as on button press.

---

### ☑ Behaviour lens

How the mode behaves in the room.

| Group | Toggle | Default |
|---|---|---|
| Safety | **Kid-safe** — softens scares, flashes and shakes | off |
| On the frames | **Scene captions** | off |
| | **Show now-playing track** — a song pill for ~10 s per track change | off |
| | **Accent halo glow** — a soft inner glow in the mode's colour | **on** |
| TV power | **Screens sleep in this mode** | off |
| Automation | **Ambient mode** — the calendar may switch to and from this mode on its own | off |
| | **Live weather on windows** — real rain / snow / fog fills empty effect slots | off |
| In Play | **Show in Play** — untick to hide from the family remote | **on** |

Below the toggles:

<a name="phases"></a>**Phases — the mode's chapters.** This is one of the most useful features and the easiest to miss.

A phase is a variation on the mode you can jump to mid-evening. The example the UI gives is the right one: *"Add 'Boss fight' and give it dungeon lighting, a dragon scene and battle music — then advance to it from Play, mid-game."*

Each phase can override the lighting, the default scene, an entry sound, a background track, and an entry event. It can auto-advance after N seconds, or wait for you.

When a mode has phases, the Now bar grows a rail of chips and a **▸ next phase** button.

**Moments — this mode's own buttons.** Per-mode theatrical buttons, on top of the global ones.

**📖 Rules & tutorial.** Link the mode to a board game so the wall can show its rules.

---

### 📖 Rules lens

A three-column editor for putting a board game's rules on the wall while you play.

- **Facts** — game name, player count, play time, a YouTube tutorial (with playback speed), a rulebook PDF link
- **Wall panels** — four text areas: `📋 Setup`, `🎲 Your turn`, `🏆 Winning`, `💡 Table tips`
- **Screen layout** — which panel lands on which frame

> **This lens has its own Save** — it writes to `rules-data.json` and is *not* part of the mode draft.
>
> **Rough edge:** the default frame layout is hard-coded to `L1 L2 L3 R1 R2 R3`. On any other layout every frame starts as `◻ Blank` and you'll need to set them yourself.

---

### Reveal Studio

The floating **🎭 Reveal Studio** button in the bottom-left corner of the screen. Builds per-frame reveal *reels*.

The effect: a frame shows a still, then occasionally flicks to a short clip and settles back. A portrait blinks. A window has someone walk past. Add 2–3 clips per frame and each trigger plays a random one.

Set it to fire on a timer (with a **Spread %** so frames don't fire in lockstep), on button press from Play, or both.

> Like the Rules lens, this has **its own Save** and isn't part of the Design draft.

---

## The calendar and autopilot

The **📅** icon. This is how the room runs itself.

| Card | What it does |
|---|---|
| **Autopilot on** | The master switch. Off, nothing here does anything. |
| **🗓 Weekly schedule** | Rules like *"Mo Tu We · 18:00 → Movie night"*. |
| **🌇 Sunset shift** | Anchor the schedule to real sunset ± up to 4 hours. Needs Home Assistant's `sun.sun`. |
| **Today / Tomorrow** | Read-only 24-hour bars coloured by each mode's accent. |
| **The year** | A month grid — give each month a resting mode. |
| **Special days** | `12-25` → a Christmas mode. |
| **Daily rituals** | *"sat,sun 07:00–10:30 → Breakfast photos."* |
| **⛅ The sky** | Windows follow real weather. Rain outside, rain on the wall. `Try it now` chips let you test each condition. |

Only modes with **Ambient mode** ticked (in the Behaviour lens) are eligible for automatic switching — so the calendar can't surprise you with your Halloween mode.

**Hold the room** (from the ☼ Autopilot chip) pauses all of it for 1 hour, 3 hours, or until tomorrow. While held, rhythms and weather leave the room exactly as it is.

---

## Theme packs

A theme pack is a whole mode — art, sounds, lighting, effects — in one shareable folder or zip.

**⚙ Settings → 🛠 System → 🧩 Theme packs**, or wizard step 5.

- **⇪ Import theme…** — pick a `.zip`. If a pack with that id already exists you're asked to confirm; the old copy is kept in `themes/.trash`, never deleted.
- **⇩ Export** — download an installed pack.

Packs that are missing files show a `⚠ N missing` expander listing exactly which — the wall shows a 🧩 placeholder until you add them.

To build one, see [THEMES.md](THEMES.md).

> **Not yet:** exporting a *hand-built* mode as a pack. The menu item exists but is greyed out — it toasts *"Export for hand-built modes arrives with the pack builder."* Only modes that came from a pack can currently be exported.

---

## Settings

Three tabs behind the **⚙** icon.

### 🏠 Room

- **Displays** — wake / sleep / focus each Frame TV, and `🎯 Grab focus — all TVs → HDMI`
- **Display PCs — media sync** — per-PC sync status with progress, plus `⟳ Sync`, `Clean up`, and **⇄ Arrange screens** (drag output tiles into physical left-to-right order, set rotation per screen, show frame IDs to identify them)
- **Audio — all TVs volume**

### 🔧 Setup

- **Overlay green-screen** and **drop shadow** — global overlay treatment
- **Library & previews** — refresh the library, capture mode thumbnails, rebuild auto thumbnails
- **Moments** — open the Moments editor
- **Audio — PC HDMI port map** — map each HDMI port to a frame. `🔦 ID` flashes the frame id on its TV *and* plays a tone through that port at the same time, so you can walk the wall and match ports to screens. `🔦 Identify all TVs` steps through every port automatically.
- **NFC tags** — map a tag id to a mode, so tapping a box on the table launches its game

### 🛠 System

`↻ Rescan media` · `▦ Make video thumbnails` · `↻ Reload all frames` · `⟳ Restart Conductor` · `🧩 Theme packs` · `🚀 Setup wizard` · `🔑 Admin token…` · `Wall test ↗` · `Health ↗`

A status line shows whether Home Assistant is connected and which Conductor version you're on.

> **Why does it say v5.04 when the release is 1.04?** Two different numbers. `1.04` is the *release* version of the whole project (README, CHANGELOG, docs). `5.04` is the Conductor's own internal build number, which has been counting since long before the public release. They move together — 1.04 ships conductor 5.04 — but they aren't the same number.

---

## The admin token

RoomScape's security model in one line: **anyone on your network can look; only the token can change.**

The token lives in your browser's local storage. The app attaches it to every write request automatically — and only ever to your own server, never anywhere else.

**Getting prompted:** the first time a change is rejected, a dialog appears asking for the token. Enter it once and it's remembered in that browser. Cancel and the action just doesn't happen (a red banner reports the underlying 401).

**Set or rotate it any time:** ⚙ Settings → 🛠 System → **🔑 Admin token…**

**One thing to know about:** the **master volume slider** in the Now bar (and the Design style picker) work over the WebSocket rather than normal requests. Without a stored token, the socket is read-only and **these two controls silently do nothing, with no error message at all**. Entering a token anywhere in the app fixes it immediately — no reload needed. If your volume slider seems dead, this is why.

Full model, including what deliberately stays open: [SECURITY.md](../SECURITY.md).

---

## Things that need more than the app

Several features are visible but inert until something else exists. Nothing here is broken — it's just waiting.

| Feature | Needs | What you see without it |
|---|---|---|
| Lights, TV wake/sleep, weather, sun times | **Home Assistant** (`HA_URL` + `HA_TOKEN`) | *"Home Assistant isn't connected — see HA-SETUP.md"* |
| Per-frame TV control | HA **and** a media player mapped to each frame | *"`<id>` has no TV mapped in Home Assistant"* |
| The whole ♪ Music tab, Music Quiz | **Music Assistant** + a chosen room player | Only the `♪ Set up music` card renders |
| 🗣 Announce, Werewolf narration, voice cues | **any HA TTS entity** (defaults to `tts.piper`) | Controls look fine; toast *"TTS failed"* |
| Display PC sync, HDMI port map, Arrange screens | one or more Linux **edge** mini-PCs | *"No display PCs configured."* |
| 📂 file-reveal icons in Design | a Windows-only `rsreveal:` protocol handler that isn't in this repo | The icon is there; clicking does nothing |
| Cue cards, extra game decks | `.txt` files in `decks/` | Eight decks ship, so this only bites once you delete them |
| 📖 Rules on the wall | entries in `rules-data.json` | The chip never appears |
| Master volume, Design style picker | a stored **admin token** | **Nothing at all — silently inert** |

---

## Keyboard shortcuts and gestures

The app is pointer-driven by design (it lives on a tablet). The complete list:

| Input | Effect |
|---|---|
| `Ctrl+S` / `Cmd+S` | Save — **only while Design is open** |
| `Esc` | Close the open sheet; clear the mode search; cancel a dialog |
| `Enter` | Confirm a dialog; submit 🗣 Announce, the Games name field, deck naming |
| **600 ms hold** on a Play card | Toggle ★ Favourite |
| **600 ms hold** on the ✎ Design pill | Enter Design |
| **550 ms hold / right-click** on a Design strip card | Context menu |
| **Hold** a timer preset | Rename / update / delete menu |
| **Double-click** a Design frame | Open the scene picker |
| **Shift / Ctrl-click** frames | Multi-select |
| **Drag** frame onto frame | Copy its setup |

**Idle return:** after 10 minutes with no input the app goes back to Play → Modes — but never while you have unsaved work or a live preview.

---

## Where to go next

- Something's wrong → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Common questions → [FAQ.md](FAQ.md)
- Building a theme pack → [THEMES.md](THEMES.md)
- Every setting, API route and environment variable → [REFERENCE.md](REFERENCE.md)
- Connecting Home Assistant → [HA-SETUP.md](HA-SETUP.md)
