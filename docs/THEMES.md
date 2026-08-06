# Theme packs — format specification

**Format version: 1** · **Doc version 0.10**
Status: format is FINAL for v1; the loader/importer that consumes it is in progress (see ROADMAP.md). Feedback welcome before it freezes.

One folder = one theme. Drop it in `themes/`, rescan, and it appears in Play.

```
themes/haunted-manor/
  theme.json          # the manifest — the one file you edit by hand
  cover.jpg           # poster shown in the Play grid
  scenes/             # wall art & video
  overlays/           # transparent PNG frame overlays
  effects/            # effect clips (particles, weather, smoke…)
  sounds/             # intro cues, ambient loops, sfx
  prompts.md          # optional: AI-generation prompts for the art (see below)
  LICENSES.md         # where every media file came from + its licence
```

## Rules that make packs portable

1. **All paths are pack-relative.** `scenes/foyer.mp4` means the file in *this pack*.
   Packs cannot reference media outside their folder, other packs, or absolute paths.
2. **No device identifiers.** A pack may never contain Home Assistant entity ids,
   IPs, hostnames, or MAC addresses. Lighting is expressed *semantically* (below)
   and resolved against the host's own configuration.
3. **Namespaced ids.** A mode's full id is `<pack-folder>/<mode-id>` — collisions
   between packs are impossible.
4. **Music is a query, not a playlist.** The pack suggests; the host's Music
   Assistant resolves; the user confirms once and their choice is cached locally.
5. **Media is optional.** A pack may ship `prompts.md` instead of (or alongside)
   media — "prompts, not pixels". Missing media renders a labelled placeholder,
   never a blank screen.

## `theme.json`

```jsonc
{
  "format": 1,
  "name": "Haunted Manor",
  "author": "your-name",
  "version": "1.00",
  "license": "media: see LICENSES.md",
  "kidSafe": false,
  "requires": { "framesMin": 1, "orientation": "portrait" },

  "section": { "id": "seasonal", "name": "Seasonal", "icon": "🎃" },

  "modes": {
    "main": {
      "name": "Haunted Manor",
      "accent": "#7a5cff",
      "ambience": "Creaking corridors",

      // Wall content. "wall" is the default for every frame; "roles" overrides
      // by role, resolved against the host's layout (centers, corners, primary).
      "wall": { "kind": "pano", "scene": "scenes/manor_pano.mp4" },
      "roles": {
        "centers": { "kind": "portrait", "scene": "scenes/ghost_portrait.mp4" }
      },

      "overlay": "overlays/cobweb_frame.png",       // optional, all frames
      "effect": "effects/dust_motes.mp4",           // optional, all frames
      "transition": { "style": "blurfade", "durationMs": 1600 },

      // Semantic lighting — resolved against the HOST's zone->entity map.
      // A pack may define the scene payload (portable); never the bulbs.
      "light": {
        "scene": { "brightness_pct": 14, "color_temp_kelvin": 2000, "transition": 3 },
        "zones": { "main": { "effect": "candle" } }   // host decides which lights "main" is
      },

      "music": { "query": "haunted mansion ambient instrumental" },
      "audio": { "loop": "sounds/wind_loop.mp3", "gain": 0.35 },

      // Optional cinematic intro (cue timeline)
      "intro": {
        "skippable": true, "kidSafeAlt": "skip", "endAtMs": 9000,
        "music": { "src": "sounds/intro_organ.mp3", "gain": 0.5 },
        "cues": [
          { "at": 0,    "type": "lights", "action": "off" },
          { "at": 1200, "type": "sound",  "src": "sounds/door_creak.mp3", "where": "sweep" },
          { "at": 4000, "type": "screen", "event": "lightning" },
          { "at": 6500, "type": "lights", "action": "scene" }
        ]
      },

      // Optional: reveal moments (still comes alive)
      "reveal": { "videos": ["scenes/portrait_blinks.mp4"], "trigger": "random", "everyS": 240 }
    }
  }
}
```

Notes:
- `kind` is one of the frame content types: `pano`, `portrait`, `photos`, `viz`,
  `playlist`, `score`, `map`, `clock`, `off`.
- Everything except `name` and `wall` is optional. Start tiny; grow.
- `requires.framesMin` lets the host warn before install rather than break after.

## Making the art — "prompts, not pixels"

Themed packs (a favourite film, a board game) usually cannot legally redistribute
media. Ship the *structure* and the *prompts* instead: `prompts.md` lists one
image/video-generation prompt per scene slot, and the pack's `theme.json` references
the filenames the user will drop in after generating them with their own tools.
Roomscape shows a labelled placeholder for each missing file until they do.

`LICENSES.md` is required for any pack that ships media: one line per file — source,
licence, attribution if the licence demands it. CC0/own-work keeps life simple.

## Sharing

Zip the folder, share the zip. Import via the app (Play → Import theme) or by
unzipping into `themes/` and hitting Rescan.
