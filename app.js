/* ===================================================================
   RoomScape — Play & Design app (app.js)  v3.63
   v3.63 (Phase 3c, RS-THEMES-UI): theme packs land in the app —
   (a) Play cards whose id is namespaced (pack.mode) carry a small 🧩 badge
   (title = pack id); (b) ⚙ Settings → System grows a "🧩 Theme packs" button
   opening a sheet (openThemesSheet) that lists /api/themes: per pack —
   name/author/version, mode count, ⚠ expandable missing-file list, errors in
   red, warnings, ⇩ Export (plain download of /api/theme/export/<id>) — plus a
   header "⇪ Import theme…" (static #themesImport file input → raw zip POST to
   /api/theme/import; 409 → askConfirm replace → retry ?overwrite=1; success →
   toast + repaint sheet + reloadProfilesLight, the boot()-shaped profile
   refresh); (c) the Design strip context menu grows 🧩 Export pack for theme
   modes (legacy modes get the same entry disabled-looking with a tooltip —
   the pack builder will bring their export).
   v3.53 (Phase 2d): registry consolidation — VIZ_STYLES / PLAYLIST_DISPLAYS are
   now thin views over IE.VIZ_STYLES / IE.PLAYLIST_DISPLAYS (engine.js single
   source; the Sound Studio lane's '(panorama)' suffix derives from the pan
   flag); the frame inspector's content-type tiles build from IE.KINDS
   (appOrder keeps the historical tile order).
   v3.52 (Phase 2c): layout ROLES + configurable at-rest id + TV quirk map —
   party-game mockups/guesser TV, cue-card default frame, rules SEC map and
   rules-sound segments all flow from layout.roles (primary/centers/corners)
   instead of L1..R3 literals; every at-rest-semantic 'dining' literal reads
   layout.atRest (served by /api/layout); the Samsung-Frame TV wake shim keys
   on settings.ha.tvQuirks ({entity_id:'samsung-frame'}) with the legacy
   'dining'-substring match kept as fallback.
   v3.42 (Phase 2a): N-frame layouts — buildCanvas creates the wall hosts
   (label + row per wall key, grid = one column per wall) from the conductor's
   /api/layout instead of the fixed Left/Right pair in app.html; boot calls
   IE.setLayout so engine wall helpers follow; appended blocks fall back to
   the live IE.FRAME_IDS, never a static six-frame literal.
   v3.41: ⏹ Stop all sounds — button in 🗣 Moments (next to Announce) and in the
   ⚙ Room audio card, both POST /api/audio/stop (conductor v4.24 + fx v1.39).
   v3.40: 🎉 GAMES TAB (RS-GAMES, conductor v4.23, fx v1.38) — a new top-level
   Play tab per GAMES-TAB-MOCKUP.html: game card gallery → per-game setup
   sheets (players from the Scores roster + free chips, deck picker, guesser-TV
   picker for charades, playlist picker for the music quiz, roles + narrator
   voice for werewolf) → live host consoles with giant round buttons posting
   /api/games/action. The tab rides the state bus (state.partyGame.v) so the
   console repaints on every server-side change and survives tablet refresh.
   Deck manager: list/edit/create decks (POST /api/games/deck, kid-safe via
   the "(kid-safe)" filename convention).
   v3.30: 🎭 MOMENTS TAB — Moments graduate from the foot of the Modes tab to
   their own top-level Play tab (Modes · Music · Lights · Timer · Scores ·
   Moments), with a 🗣 Announce card on top: type any one-off line, pick a
   voice, the room speaks it via /api/tts (Enter key announces). renderSocial
   is unchanged — its #socialwrap/#socialbar simply moved into #ptMoments.
   v3.29: INTRO ON THE MAIN STAGE + 🗣 SAY
   v3.29: INTRO ON THE MAIN STAGE + 🗣 SAY (conductor v4.13, RS-TTS) — the Intro
   editor moves out of the cramped right inspector into #intromain, a full-width
   panel injected below the wall canvas (removed on lens change; hidden with the
   Design view). Cue cards flow in a responsive grid, the timeline strip gets
   real width. New 🗣 Say panel: type a line, pick a voice (GET /api/tts/voices),
   "Say in room" speaks it now, "Render + add cue" saves sounds/voice/… and
   appends it as a voice cue. bindIntroLens selectors rescoped #insp→#introroot.
   v3.19: 🎬 INTRO PHASE 2
   v3.19: 🎬 INTRO PHASE 2 (conductor v4.03, fx v1.28) — the Intro lens grows:
   screen cues gain ⬛ Blackout (hold seconds, blank = until launch) and ⚪ White
   flash; NEW 🖼 Title card cue (scene via the real picker + frame chips + hold);
   ⧉ Copy-from-mode select clones another mode's whole intro; a Templates chip
   row (⛈ Thunderstorm · 🥁 Drumroll · 🚀 Ship boot-up · 🕯 Séance · 🎉 Party pop)
   pre-fills the cue list from sounds already in sounds/. Solo-▶ of a title-card
   cue auto-clears after 6s so rehearsing one cue can't strand a takeover.
   v3.09: SCENE FIT
   v3.09: SCENE FIT (conductor v3.93, fx v1.18) — pano/portrait frames gain a
   "Scene fit" select in the frame inspector (Fill & crop default | Fit inside |
   Stretch | Fit width | Fit height; profile.scnFit[], always visible — unlike
   Overlay fit it does not hide when empty). Applies when the frame shows the
   WHOLE image; spanned panoramas keep their slices. Copy-to-frame carries it.
   v3.08: 🎬 INTRO LENS (conductor v3.92, RS-INTRO; INTRO-TAB-PLAN.md Phase 1) —
   Design gains an Intro lens: per-mode cue timelines (sound / voice / screen fx /
   lights + a music bed) that play on manual launch, then the mode loads. Vertical
   cue cards with ±0.5s nudge steppers and ⟓ after-prev chaining (nudging a cue
   drags chained followers), a colour-coded mini-timeline dot strip, per-cue ▶
   fires that cue in the room via /api/intro/preview {cueIx}, ▶ Rehearse runs the
   whole UNSAVED draft (no launch at the end), options for skippable / kid-safe.
   Intro edits always target the BASE mode (edBase bypasses phase patches — the
   v2.88 guard family). Play view: while state.intro runs, a full-screen overlay
   (mode name + progress + ⏭ Skip → /api/intro/skip).
   v2.98: MUSIC TAB PACK (conductor v3.82) — the ♪ Music tab is rebuilt for
   speed-in-the-room: (1) playlists group by the Roomscape>Group>Name scheme
   into Moods / Games / Themes sections with the prefix stripped from cards;
   (2) a ★-pin corner on every card plus a Pinned row and a Recently-played
   chip row (stored in settings.music.pins / .recents, capped at 8); (3) a
   highlighted "Mode music" card plays the live mode's own playlist in one
   tap; (4) Dinner 25 · Normal 40 · Party 65 volume preset buttons beside the
   slider; (7) the tab rides the room bus — musicHold / musicNow changes
   repaint now-playing instantly instead of waiting for the 5s poll; (8) a
   🔀 shuffle toggle (persisted; conductor only force-shuffles playlists while
   it's on) and an "Up next" peek of the next three queued tracks.
   v2.88: PHASE PATCH GUARD (bug fix). Editing a mode with a phase chip selected
   wrote the mode's whole `phases` array into that phase's own patch, because
   __rsDiff clones arrays wholesale. Three symptoms, one cause: "Remove phase"
   never shrank the list (the removal lived in the patch, not in draft.phases);
   each chip rendered a different stale snapshot of the rail, so phases seemed to
   duplicate and reorder; and every further edit nested another copy, ballooning
   profiles.json. Fix: __RS_NOPATCH strips 'phases'/'name' from every patch ed()
   writes, and phase add / remove / reorder now go through the new edBase() so
   structure always lands on the base draft. Found live on `alienfate` (4 phases,
   2 contaminated patches, 3 levels of nesting) — repaired in profiles.json,
   backup in _backups/profiles.backup.2026-07-29-120340.json.
   Also: #phaserail no longer shows a native horizontal scrollbar (app.html).
   v2.86: TIMER FEATURE PACK (conductor v3.72) — the Timer tab grows from "set a
   countdown" into a small show-control surface. (1) Colour is a row of swatches
   (live mode accent first, then a curated palette) with the native picker kept as
   a ＋ custom swatch. (2) The big display card now renders in the SELECTED STYLE —
   the miniature builder was factored out as timerFace(style,size,…) and is shared
   by the style grid, the #tdisp face and the preset tiles. (3) Drama triggers are
   a draggable TIMELINE (right edge = 0) instead of five fixed chips: markers carry
   visual/pulse/sound/event/takeover, drag snaps to 5s, tap opens a per-trigger
   editor sheet. (4) A countdown reaching 0 fires a fullscreen "TIME!" podium on the
   tablet (CSS-only burst, reduced-motion aware, 6s auto-dismiss) unless a chain is
   continuing. (5) Named presets (/api/timer/presets) as tiles — tap to apply,
   600ms hold for rename/update/delete, global or per-mode. (6) A /api/sounds picker
   sheet (grouped by folder, ▶ preview) wherever a trigger's sfx is set. (7) CHESS
   CLOCK type: setup panel (players from the Scores people list, per-player base
   time, increment) + live tappable per-player cards driven by the 250ms tick.
   (8) CHAINED ROUNDS: step list with reorder/loop/auto-start and a Skip →, with
   "Round 2 of 3" beside the big face. (9) New 'sand' hourglass style (fx.js) whose
   bulbs fill from the remaining fraction, plus a one-tap "take over all screens at
   0" chip. CSS in app.html (tsw, ttl-, tpres-, trnd-, tch-, tsndrow, tpodium).
   v2.76: TIMER TAB VISUAL OVERHAUL — style picker is now a grid of live animated
   miniatures (mini portrait "TVs" reproducing fx.js's six clock styles — digital,
   minimal, flip, analog, ring, neon — ticking with the REAL timer value in the
   chosen colour, driven by the existing 250ms tab tick); "Show on" is a tappable
   wall map (layout-driven, matches the Design canvas mental model; auto mode dims
   it); background picker shows a scene thumbnail; label text appears inside the
   miniatures. CSS in app.html (.tstyles/.tprev/.tpv/.twmap/.twfr/.tbgthumb).
   v2.66: SEARCH BACK IN DESIGN + SCORES 404 — (a) the v2.54 search move made the
   filter Play-only; Design lost the strip filter the old header pill provided.
   New #scsearch tile at the start of the strip, sharing the query/mechanism with
   #pcsearch (RS-MODE-SEARCH v3 filters .pcard AND #strip .scard, fields synced).
   (b) renderScores fired a fire-and-forget GET at POST-only /api/scores/live —
   always 404'd since v2.29, surfaced by honest error toasts; probe removed
   (it also duplicated the /api/scores fetch).
   v2.65: LEGACY SCENE-KEY FALLBACK — the 07-19 "file-per-card" library change
   (rs-ungroup, conductor c138468) orphaned base keys stored by modes saved before
   it (214 references, e.g. 'wingspan_grasslandk' vs library 'wingspan_grasslandk_v0').
   The conductor's sceneFiles() substring fallback kept the TVs working, but the
   app's exact byKey lookups rendered blank canvases/thumbs. resolveSceneKey()
   now mirrors the server rule (prefix first, then substring, cached; cache
   cleared on scene reload) at sceneThumb/previewState/bgPreviewUrl + the
   AUTO-THUMBS sceneImage. Data migration to full keys deliberately NOT done.
   v2.64 (2026-07-24): architecture + scheduler/phase/on-this-day UIs.
   ARCHITECTURE — (a) wall layout now comes from the conductor: boot() fetches
   GET /api/layout (v2.62) and every 6-frame / 3-per-wall assumption in the app
   (normalize padding, buildCanvas, the L/R pano cache key, random-frame picks,
   the appended blocks' own ['L1'…] lists) flows from `layout` instead — engine.js
   IE.FRAME_IDS stays only as the static boot fallback. (b) the ~16 independent
   setInterval DOM-poll loops in the appended blocks now ride ONE master 400ms
   scheduler (window.__rsTick.every) that skips all work while the tab is hidden.
   (c) the core toast() is exported as window.__rsToast; the Reveal Studio toast
   and the thumbnail banner route through it (the sentry's red SAVE-FAILED banner
   stays intentionally separate). (d) RS-PLAYLIST-UI's per-frame playlist card now
   edits draft.framePlaylists[] through the normal ed()/Save path (dirty flag,
   preview, phase patches) instead of instant POST /api/playlists; the legacy
   store is read once as a migration seed ("from legacy playlist — Save to adopt").
   FEATURES — Autopilot v2 UI in the 📅 calendar sheet: Weekly schedule editor
   (day chips Su–Sa · HH:MM · mode · optional name) + Sunset shift (toggle,
   ±h:mm offset stepper, "Sunset today ≈") via GET/POST /api/schedule, with the
   next matching rule surfaced read-only in the ☼ Autopilot sheet. Phases gain an
   optional ⏱ "Auto-advance after N s" (phase.autoS). Photos: the conductor's
   virtual 📅 "On this day" album is pickable everywhere albums are, and Play
   toasts once when the live mode fell back to another album.
   v2.54 (UX round 2, 2026-07-24, from UX-REVIEW-2026-07-24 §3+§5): browser prompt()/
   confirm() are GONE — in-app askText/askConfirm dialogs (sheet design language,
   44px buttons, Esc/scrim dismiss, red danger OK) re-house every flow: rename mode,
   add phase, add Play section, timer custom time, Save-as name, deletes, all
   dirty-discard confirms (incl. selectMode's own), edge clean-up and Conductor
   restart. Person photo gets a real album→photo picker (thumbnails via
   /thumb?src=photos) instead of two typed prompts. The 🔍 mode search moves from
   the header pill into the #pcats chip row (44px, same data-rshide mechanism) and
   the chip row scrolls horizontally with an edge fade instead of wrapping. Mode
   delete is SOFT: p.deleted timestamp hides it everywhere, an Undo toast
   (toast(msg,{label,fn})) restores it, a "Show deleted" bin lives in the strip
   context menu (Restore / Delete forever), and boot purges modes deleted >30 days.
   Scores: end-game asks "Who won?" (leader pre-picked, ties allowed — fixes
   lowest-wins games) and the latest results are editable/deletable (full-doc
   POST /api/scores; the server backs up first). ✎ Design in the header is a
   smaller ghost button needing a 600ms hold from Play (tap hints; programmatic
   entries bypass). "· PREVIEW" in the Now bar is a tap target that ends the
   preview exactly like the savebar toggle. Moments terminology unified: the Play
   row, mode dashboard and RS-EFFECTS-UI editor/settings card all say 🎭 Moments
   (frame VFX stays "Effect layer"; Hue zone effects say "Light effect"). Delight:
   ✨ Surprise me (random reveal on a random live frame), kid-safe ON shimmers the
   card grid (reduced-motion aware), live-accent section headers in Play.
   v2.44 (UX round 1, 2026-07-24, from UX-REVIEW-2026-07-24): dirty-confirm on the three
   silent draft-discard paths (new mode / duplicate / ✎ Edit-in-Design); ▶ instant-play
   chip on Play cards (revives the orphaned launch ripple) + honest caption; sticky
   #roomrow under the grid; 44px phase-rail/autochip targets; client-side ★ Favourites
   (long-press a card) + Recently-played sections; Save-as-new is ONE name prompt (id
   derived); Now-bar TV dots and mode name are tap targets; kid-safe/panic toasts wait
   for the server; persistent boot-failure card with Retry; #now wraps, RESTORE ROOM
   never clips; Lights tab marks the live scene; prefers-reduced-motion; 10-min idle
   return to Play·Modes; superseded RS-REFRESH-LIB block deleted; appended-patch gold
   unified on var(--gold); RS-PLAYLIST-UI card badged "applies immediately".
   v2.34 (QA round 2, 2026-07-24): boot() retries every 5s instead of bricking on a
   conductor outage; Save / Save-as roll back the local model when the server rejects
   (rejected content could be laundered into a later save); esc() escapes &<>"' and
   all url('...') style sites %27-encode apostrophes; "NaN-win streak" fixed;
   Refresh-library button mojibake repaired (was CP1252-mangled emoji).
   v2.33: PREVIEW-TIMER FIX (QA review 2026-07-24) — the debounced pushDraft timer
   is now cancelled on Save / Save-as / Revert / preview-off / mode switch, and
   pushDraft re-checks previewOn. Previously an edit followed within 700ms by Save
   (or preview-off) let the stale timer rewrite _draft and silently flip the room
   back to the draft while the savebar showed saved.
   v2.32: 🎶 MUSIC VISUALS become Wall content types — the Design → Wall lens gains two
   new per-frame content types: 🎶 Music Viz (style, background image/video, portrait or
   panorama appearance, colour, sensitivity, now-playing) and ♪ Playlist (8 now-playing /
   album-art display styles). Config rides per-frame in the mode draft (profiles.json:
   frameViz[] / framePlaylist[]) alongside scene/overlay/effect. The old per-mode 🎶 lane
   was removed from the 🔊 Sound lens (Sound now owns audio placement only). Rendered by
   fx.js v1.06 / conductor v2.49. (Legacy viz.json overlays still render for old modes.)
   Music Viz colour is now a palette dropdown (Gold/auto, VU meter green→red, Sunset,
   Ocean, Aurora, Fire, Ice, Neon, Rainbow, Viridis, Plasma, Magma, or a custom solid)
   with a live gradient swatch. The app's Design canvas draws a per-style, palette-aware
   animated preview (fx.js RS-VIZ-PREVIEW) + the chosen background, since the real
   audio-reactive engine only runs on the kiosk TVs.
   v2.31: 💡 LIGHTING gets its own Design lens — base scene + per-zone scene/effect/
   brightness, custom 🔥 flicker with INTENSITY + SPEED sliders (conductor v2.48 loop;
   native Hue effects have no knobs), per-zone live preview + follow-base reset. Zones
   card moved out of Behaviour. All of it saves with the mode and applies on launch.
   v2.30: 💡 LIGHTING ZONES — chandelier vs console lamps independently: per-mode
   overrides in Behaviour (scene + native Hue effect (candle/fire/…) + brightness per
   zone; "(as base)" follows the mode's main Lighting), and zone quick-controls in the
   Lights tab. Conductor v2.47 wires the two NEW chandelier bulbs + Lamp left/right
   into every scene change and applies zone overrides in haApplyRoom.
   v2.29: 🏆 SCORES Play tab — people registry (name/nickname/colour/photo via upload or
   Photos folder/manual + auto titles), live match scoring on the wall's Score frames
   (start/±/end-game winner crown → result saved), hall-of-fame stats + /scores page link.
   Revives the dead Rules&Scores server half via the route dispatcher (conductor v2.46).
   v2.28: ⏱ TIMER Play tab — full control for the room timer (countdown / count-up /
   time-of-day; any value + presets; start/pause/reset/±; 6 styles; colour + label;
   image/video background via the scene picker; drama triggers; which-frames; phase
   auto-advance; per-mode save/load). Drives conductor v2.45 /api/timer + fx.js v1.04.
   v2.27: Behaviour → "Show now-playing track" toggle (profile.nowPlaying) — per-mode
   control of the frame song pill, DEFAULT OFF (conductor v2.44 gates state.musicNow on it).
   v2.26: scene picker gains ▯ Portrait / ▭ Landscape shape filter (scene.ori from
   conductor v2.41's sharp dimension probe) and a ×N badge on grouped tiles — keyOf
   collapses filename variants (foo_v1_00005_ → foo) into ONE scene whose files the
   wall rotates at random; the badge + tooltip make that visible.
   v2.25: scene-picker category chips now render INSIDE the picker (its container was
   id="pcats", colliding with the Play page's #pcats section chips — the folder chips
   were painting onto the Play screen behind the sheet; picker container is now #pkcats).
   v2.24: FOLDER CATEGORIES — the media library's own folder structure now drives
   filtering: top-level folder = category chip, next folder = sub-chip (Sets → Board
   Games → …), in both the Design tray and the Choose-a-scene picker. Root-level files
   fall back to the old filename-prefix themes. Conductor v2.40 sends scene.dir.
   v2.23: (a) FOCUS FIX — the Design header name box lost focus on every keystroke
   (its oninput fired renderStrip -> renderModeHeader, rebuilding the bar under the
   cursor; the bar now never rebuilds while an input inside it is focused); (b) halo
   customisation — Behaviour gains colour / size / opacity controls + reset
   (profile.haloColor/haloSize/haloOpacity; conductor v2.39 broadcasts state.halo,
   fx.js v1.03 renders it — defaults keep the original accent look).
   v2.22: two new Behaviour toggles — 'Accent halo glow' (per-mode control of the
   inset accent-colour glow the conductor previously forced on for every live mode;
   untick to remove the blue tint on blue-accent modes) and 'Screens sleep in this
   mode' (per-mode TV power-off, replacing the hardcoded At-rest force-sleep;
   conductor v2.38 honours profile.halo / profile.tvSleep).
   v2.21: dashboard Moments (+ Cue cards) become square touch tiles like the light
   swatches — bigger finger targets for tablet control.
   v2.20: mode dashboard polish — content now fills the modal width (dropped the 480px
   cap; Sound card is a 2-col transport|volumes split, cards laid out across the width),
   and Lights become colour swatch tiles (scene colour + brightness/temp) with a live
   brightness override slider + all-off.
   v2.19: mode dashboard REDESIGN — accent-tinted hero with LIVE badge, phases as a
   stepper, one consolidated Sound card (transport + album art + music/room volumes),
   Lights + Moments in two columns, rules one-liner, and a sticky Play/Edit footer.
   v2.18: mode dashboard gains a Rules & tutorial section — Show on wall / Hide for the
   mode's linked game (from its Design rules config), reachable straight from Play.
   v2.17: RULES & TUTORIAL Design element — under a mode's ☑ Behaviour lens, link the
   mode to a game (rules-data.json), set/override a YouTube tutorial video, and tick
   which panels (setup/turn/win/tips) show on the wall. Saved to profile.rules; "Show
   on wall" posts /api/rules/show {game, videoId, sections} (Conductor v2.37 honours the
   override + sections; frame.html v1.2 hides unticked side panels).
   v2.16: MODE DASHBOARD — a Play-card click now opens a compact per-mode control
   sheet (launch · phases · music · room volume · lights · moments · reveal) instead
   of launching instantly. All controls reuse existing endpoints; per-frame effect
   layers remain a Design concept, reachable via the sheet's "Edit in Design".
   v2.15: photos Order gains 'Shuffle — show all before repeating' (order:'norepeat',
   one global deck across the wall — fx.js v1.02).
   v2.14: STATE-AWARE TV power — Samsung turn_on is a no-op (no WoL) and turn_off is a
   POWER TOGGLE, so Wake/Sleep/Focus now read the TV's reported state first and send the
   toggle only when the TV disagrees with the request (no more blink-off on Wake).
   v2.13: photos 'Frame style' control — Print on mat (default) vs Behind mat
   (recessed window-mount look; photos.matStyle -> fx.js .ie-phcell.rec).
   v2.12: 🎯 GRAB FOCUS — per-TV and all-TVs 'wake + switch back to HDMI 4' via HA
   media_player.select_source (source picked from each TV's own source_list), for
   when something knocks a Frame off the room's HDMI input.
   v2.11: music volume slider reflects the player's REAL volume (status.volume),
   isn't repainted mid-drag, and re-syncs shortly after a change.
   v2.10: PLAY TABS — 🎲 Modes (the existing remote) · ♪ Music (Music Assistant:
   playlists, song search, transport + volume; playing music quiets the room's own
   soundscape but leaves scenes/lights/TVs alone — "⏹ Music off" brings them back)
   · 💡 Lights (preset light scenes as glowing swatch cards + brightness + all-off).
   v2.02: Arrange screens gains PER-SCREEN rotation — each tile carries a rotation
   chip (wall default / ↺ left / ↻ right / ⟲ 180°) written to ROTATE_MAP in the
   PC's .xinitrc via edge v1.11 (needs edge.js + xinitrc redeployed to the PCs).
   v2.01: Play filter changes animate — FLIP glide for surviving cards, staggered
   rise-in for newcomers, fading ghosts for leavers (no more hard flick).
   v2.00 "GROWN-UP DESIGN" (UX-REDESIGN-2.md): Design lens bar (Wall / Sound / Motion
   / Behaviour) with the canvas always on screen; mode header (accent/name/lighting/
   section) extracted from the rail; Audio Director rebuilt full-width in the Sound
   lens with per-frame canvas badges + ▶ audition-on-the-wall; Behaviour lens with
   grouped toggle rows; PHASES (chapters of a mode — override patches, /api/phase,
   Now Playing phase rail replaces the old Advance button); per-mode MOMENT buttons
   on the Social row; Play sections (settings.playSections + profile.category) with
   filter chips + grouped grid; Show-in-Play (profile.hidden); ＋New mode pinned first
   in the strip with a template sheet; strip context menu (duplicate/rename/hide/
   delete); tabbed ⚙ (Room/Setup/System); friendly names everywhere (niceName).
   v1.93 (prior):
   v1.93: ⚙ "Audio — PC HDMI port map" card. Per mini-PC, a table of every HDMI audio
   output with a ▶ test-tone button (hear which TV it is) and a "Maps to TV" dropdown.
   Saved to settings.audioMap[PC][card,dev]=frame — the basis for routing sound per TV.
   v1.92: Arrange screens shows only connected outputs + a "Show frame IDs" toggle so
   you can walk the wall and identify each TV after applying.
   v1.91: ⚙ Display PCs → "Arrange screens" — drag-and-drop the physical screens into
   left-to-right order + rotation, applied via Conductor /api/edges/screens → edge.
   v1.90: mode-level "Wall layout" (auto | fill each screen | span the wall) in the
   inspector → state.wallFit, respected by fx.js render + design preview.
   v1.89: fix per-TV wake/sleep card showing "[object Object]" (HA state is an object);
   sync "failed" label reads "so far" while running, "last pass" when idle.
   v1.88: Clean-up buttons show live orphan count + size (from edge /status.orphans);
   disabled when nothing to clean; "Clean up all" shows the combined total.
   v1.87: sync card gains per-PC + all "Clean up" buttons (prune display-PC files
   removed from the NAS, via Conductor /api/edges/cleanup → edge /edge/cleanup).
   v1.86: sync card gains video/image split, transfer speed + ETA, byte-based
   progress bar, and blip-tolerant status (holds last-good through brief timeouts).
   v1.85: ⚙ "Display PCs — media sync" card — per-PC (edge mirror) copy progress
   bars + Sync buttons, polled via the Conductor's /api/edges + /api/edges/sync.
   v1.84: per-frame TV wake/sleep — 🖵 Screens button in Play opens a popover with
   six per-frame Wake / Art-sleep rows (live HA state); same controls as a "Displays"
   card in ⚙ Settings. Uses /api/ha/service per mapped media_player entity.
   v1.83: media tray RETIRED — overlay picker sheet (checker background, None,
   search) completes the inspector, which now covers everything the tray did;
   canvas takes the reclaimed space (height cap 100vh-235px).
   v1.82: canvas frames height-capped to the viewport (no more overlapping the tray
   on short/wide screens); tray made collapsible (superseded by v1.83).
   v1.81: theme chips in the scene picker + tray — categories derived automatically
   from filename prefixes (wtr_/wx_/nat_/…, CATNAMES map for friendly labels; any new
   prefix becomes its own chip). Filter combines with Images/Videos and search.
   v1.80: 📅 Calendar — rhythms + weather move OUT of ⚙ into a dedicated calendar
   sheet: Today/Tomorrow 24 h timelines (computed from all rules, mode-accent
   coloured), tappable 12-month thumbnail year grid with special-day dots, special
   days & daily rituals editors, and "The sky" section. ⚙ is purely technical again.
   v1.70: AUTOMATIONS release (conductor v2.0, fx v1.00, AUTOMATIONS-DESIGN.md v1.2) —
   🎭 Social row (cooldown buttons, kid-safe morphing, Chaos), 🃏 Cue Cards (deck+frame
   picker sheet, prompter controller with next-preview + panic-hide), ☼ Autopilot chip
   (status, Hold-the-room, Room diary), ⚙ Rhythms card (months/special days/daily
   rituals), ⚙ Weather card (follow real sky, daylight sync, tap-to-preview + pin),
   mode inspector gains Ambient + Live-weather checkboxes.
   v1.54: per-frame Overlay fit select (stretch / fill&crop / fit inside / fit width /
   fit height — profile.ovlFit, conductor v1.91, fx v0.98).
   v1.53: ⓘ help tips on every inspector/settings control (hover or tap the ? dot);
   per-mode "Caption text on frames" checkbox (default off, conductor v1.63).
   v1.43: "Make video thumbnails" button (Settings > System) — browser frame-grabs each
   video and uploads the poster to Conductor (POST /api/poster); no ffmpeg on the host.
   v1.42: video tiles show a poster frame (+ play badge) in the tray and scene picker
   instead of a bare triangle (posters served by Conductor v1.8 from .thumbs/poster_*.jpg).
   v1.41: reveal video included in "Copy to this Wall Set" / "Copy to All TVs" (renamed from
   "Copy to this wall" / "Copy to all frames") and in drag-copy between frames.
   v1.4: REVEAL — per-frame trigger buttons in Play (POST /api/reveal) + per-mode
   reveal setup in the inspector (per-frame video + manual/random trigger + frequency).
   v1.3: canvas repaint fix (positional child — renderer renames the container
   class), real-file hover tooltips on tray/picker tiles, ≋ effect badge on
   canvas frames, per-mode "Caption text on frames" toggle (default off).
   v1.1: Images/Videos filters in the media tray + scene picker; ▶ tiles for videos.
   v1.2: ≋ Effects — per-frame looping VFX layer (tray tab + frame inspector select).
   One app, two spaces, one truth bar.
   - PLAY: tablet remote — mode cards, room controls, phase button
   - DESIGN: studio — canvas + selection-driven inspector + media tray,
     draft -> preview-on-TVs -> save / save-as-new-mode
   Draft preview uses a hidden '_draft' profile via the existing
   /api/profiles + /api/game APIs (server unchanged). Ids starting '_'
   are hidden everywhere.
   =================================================================== */
(function () {
  'use strict';
  var D = document;
  var $ = function (s) { return D.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(D.querySelectorAll(s)); };
  /* v2.64: the wall layout is the CONDUCTOR'S truth (GET /api/layout, v2.62).
     engine.js IE.FRAME_IDS is only the static fallback until boot()'s fetch lands.
     Everything frame-count-shaped in this file flows from `layout` / FRAME_IDS. */
  function wallsFromFrames(fr) { var w = {}; fr.forEach(function (f) { var k = String(f).charAt(0); (w[k] = w[k] || []).push(f); }); return w; }
  var layout = { frames: IE.FRAME_IDS.slice(), walls: wallsFromFrames(IE.FRAME_IDS) };
  /* Phase 2c: roles (primary/centers/corners/sweepOrder) + at-rest mode id ride
     the layout. Until boot()'s /api/layout lands we derive the same defaults the
     conductor would (engine.js IE.deriveRoles = shared algorithm). */
  layout.roles = IE.deriveRoles ? IE.deriveRoles(layout.walls, layout.frames) : null;
  layout.atRest = 'dining';
  function layoutRoles() { return layout.roles || {}; }
  function atRestId() { return layout.atRest || 'dining'; }
  var FRAME_IDS = layout.frames;
  window.__rsLayout = layout;   // appended blocks read this instead of their own ['L1'…] lists
  function wallOfIdx(i) { var f = FRAME_IDS[i], ks = Object.keys(layout.walls); for (var k = 0; k < ks.length; k++) { if (layout.walls[ks[k]].indexOf(f) >= 0) return ks[k]; } return ks[0] || 'L'; }
  function wallIdxs(i) { return layout.walls[wallOfIdx(i)].map(function (f) { return FRAME_IDS.indexOf(f); }).filter(function (x) { return x >= 0; }); }
  function allIdxs() { return FRAME_IDS.map(function (f, i) { return i; }); }
  function nullPerFrame() { return FRAME_IDS.map(function () { return null; }); }

  /* ---------------- state ---------------- */
  var profiles = {}, tagmap = {}, settings = {};
  var scenes = [], byKey = {}, overlays = [], albums = [], effects = [], social = [], decks = [], auto = null, sounds = [];
  var haRoom = { configured: false };
  var health = null;
  var live = { state: null };
  var space = null;
  var curId = null, draft = null, dirty = false, previewOn = false, prevGame = null;
  var sel = [];                      // selected frame indices (ordered)
  var trayTab = 'scenes', trayQ = '', trayKind = 'all', trayCat = null, traySub = null;   // all | img | vid (Scenes tab sub-filter) + folder category / sub-folder chips
  var lens = 'wall';                 // v2.0 Design lens: wall | sound | motion | behaviour
  var phaseSel = null;               // v2.0 phase being edited in Design (null = base mode)
  var playCat = 'all';               // v2.0 Play section filter
  /* v2.32: 🎶 Music Visualiser + ♪ Playlist are per-frame Wall content types.
     Phase 2d: the catalogues moved to engine.js (IE.VIZ_STYLES / IE.PLAYLIST_DISPLAYS,
     single source of truth) — these are thin [id, label(, desc)] views for the
     inspector's existing tuple-shaped consumers. */
  var VIZ_STYLES = (IE.VIZ_STYLES || []).map(function (s) { return [s.id, s.label]; });
  var PLAYLIST_DISPLAYS = (IE.PLAYLIST_DISPLAYS || []).map(function (d) { return [d.id, d.label, d.desc]; });
  function defVizCfg() { return { style: 'cathedral', ori: 'portrait', color: 'auto', sens: 1, nowPlaying: true, shuffleMin: 5, bg: null }; }
  function defPlaylistCfg() { return { display: 'nowplaying', ori: 'portrait', color: 'auto', sens: 1, bg: null }; }

  /* v1.81 themes — derived from filename prefixes (wtr_/wx_/nat_/…); self-maintaining */
  var CATNAMES = { wtr: '💧 Water', wx: '⛅ Sky & weather', nat: '🌿 Nature', arc: '🏛 Places', alch: '⚗️ Alchemy', med: '🏰 Medieval', medieval: '🏰 Medieval', land: '🏞 Landscapes', sp: '🌌 Space', ast: '🌌 Space', web: '▶ Video', wan2: '▶ Video', flux2: '✨ Renders', pano: '🌄 Panoramas', scf: '🚀 Sci-fi', ssn: '🎃 Seasonal', fan: '🐉 Fantasy', cty: '🏙 Cities', coz: '🕯 Cosy', wall: '🧱 Wall art', gme: '🎲 Games', map: '🗺 Antique maps', abs: '🎨 Abstract',
    sea: '🌊 Sea', pass: '🏇 Passing scenes', bg: '🎲 Board games', his: '📜 Historical', spc: '🌌 Space', veh: '🚂 Vantage', lmk: '🗽 Landmarks', tap: '🍺 Taproom', heat: '🏎 Heat', myth: '🏛 Mythology', ship: '🚀 Starship', ark: '🦁 Ark Nova', mys: '🔮 Mysterium', port: '🧍 Portraits', greek: '🏛 Greek gods', glass: '🪟 Stained glass', train: '🚞 Train windows', aq: '🐠 Aquariums', alien: '👽 Alien', ghost: '👻 Ghosts', vic: '🎩 Victorian', pirate: '🏴‍☠️ Pirates', witch: '🧹 Witches', vamp: '🦇 Vampires', knight: '⚔️ Knights', wiz: '🧙 Wizards', steam: '⚙️ Steampunk', cyber: '🌃 Cyberpunk', rome: '🏛 Rome', masq: '🎭 Masquerade', praph: '🖼 Pre-Raphaelite', bp: '📐 Blueprints', dv: '✏️ Da Vinci', fos: '🦴 Fossils', bot: '🌱 Botanical', ana: '🫀 Anatomy', star: '✨ Star charts', bird: '🐦 Bird prints', illum: '📖 Illuminated', pat: '🔷 Patterns' };
  /* v2.24 folder categories — the library's own folder structure is the categorisation.
     catFor = top-level folder (from s.dir, sent by conductor v2.40); subFor = the next
     folder down (Sets/Board Games/Alien → cat "Sets", sub "Board Games"). Root-level files
     fall back to the old filename-prefix themes so nothing lands in one giant bucket. */
  function catFor(s) {
    var d = (s && typeof s === 'object') ? s.dir : null;
    if (d) return String(d).replace(/\\/g, '/').split('/')[0];
    var key = (s && typeof s === 'object') ? s.key : s;
    var m = /^([a-z0-9]{2,9})[_\-]/i.exec(key || '');
    var t = m ? m[1].toLowerCase() : 'other';
    return CATNAMES[t] || (t.charAt(0).toUpperCase() + t.slice(1));
  }
  function subFor(s) {
    var d = (s && s.dir) ? String(s.dir).replace(/\\/g, '/').split('/') : [];
    return d.length > 1 ? d[1] : null;
  }
  function catChipsHTML(cur, curSub) {
    var counts = {}, subCounts = {};
    scenes.forEach(function (s) {
      var c = catFor(s); counts[c] = (counts[c] || 0) + 1;
      if (cur && c === cur) { var sb = subFor(s); if (sb) subCounts[sb] = (subCounts[sb] || 0) + 1; }
    });
    var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    if (cats.length < 2) return '';
    var h = '<div class="chips" style="margin:0 0 10px">'
      + '<button class="chip' + (!cur ? ' on' : '') + '" data-cat="">All · ' + scenes.length + '</button>'
      + cats.map(function (c) { return '<button class="chip' + (c === cur ? ' on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + ' · ' + counts[c] + '</button>'; }).join('') + '</div>';
    var subs = Object.keys(subCounts).sort(function (a, b) { return subCounts[b] - subCounts[a]; });
    if (cur && subs.length > 1) {
      h += '<div class="chips" style="margin:-4px 0 10px;padding-left:12px">'
        + '<button class="chip' + (!curSub ? ' on' : '') + '" data-subcat="">All ' + esc(cur) + '</button>'
        + subs.map(function (c) { return '<button class="chip' + (c === curSub ? ' on' : '') + '" data-subcat="' + esc(c) + '">' + esc(c) + ' · ' + subCounts[c] + '</button>'; }).join('') + '</div>';
    }
    return h;
  }

  /* ---------------- utils ---------------- */
  /* v2.0 friendly names — one display-name function for files, scenes and sounds */
  function niceName(s) {
    if (!s) return '';
    s = String(s).split('/').pop().replace(/\.[a-z0-9]{2,4}$/i, '');
    s = s.replace(/_+\d{4,}_*$/g, '').replace(/[_ ]v\d+$/i, '').replace(/_+$/, '');
    var m = /^([a-z0-9]{2,9})[_\-](.+)$/i.exec(s);
    if (m && CATNAMES[m[1].toLowerCase()]) s = m[2];
    s = s.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return s.replace(/(^|\s)[a-z]/g, function (c) { return c.toUpperCase(); });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return (s == null ? '' : ('' + s)).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }   // v2.34: full escape — a quote/apostrophe in an album or file name used to break attributes and url('...') styles
  /* v2.54: soft-deleted modes (p.deleted = timestamp) are hidden EVERYWHERE vids() feeds
     (Play grid, strip, selects, calendar) — same exclusion pattern as the '_' draft ids.
     deletedIds() is the bin's accessor; boot purges anything >30 days gone. */
  function vids() { return Object.keys(profiles).filter(function (k) { return k.charAt(0) !== '_' && !(profiles[k] && profiles[k].deleted); }); }
  function deletedIds() { return Object.keys(profiles).filter(function (k) { return k.charAt(0) !== '_' && profiles[k] && profiles[k].deleted; }); }
  /* v2.65: resolve legacy scene keys. The 07-19 "file-per-card" change (rs-ungroup)
     stopped grouping variant suffixes, so modes saved before it store base keys
     (e.g. 'wingspan_grasslandk') that no longer exist as exact library keys
     ('wingspan_grasslandk_v0'). The conductor's sceneFiles() has a substring
     fallback — the TVs kept working — but the app's exact byKey lookups went
     blank (canvas, thumbs). Mirror the server's fallback here, cached. */
  var _skCache = {};
  function resolveSceneKey(k) {
    if (!k || byKey[k]) return k;
    if (_skCache[k] !== undefined) return _skCache[k] || k;
    var hit = null, i, key;
    for (i = 0; i < scenes.length; i++) { key = scenes[i].key; if (key.lastIndexOf(k, 0) === 0) { hit = key; break; } }        // old grouped key → its first variant
    if (!hit) for (i = 0; i < scenes.length; i++) { key = scenes[i].key; if (key.indexOf(k) >= 0 || k.indexOf(key) >= 0) { hit = key; break; } }   // server's substring rule
    _skCache[k] = hit;
    return hit || k;
  }
  function sceneThumb(k) { var s = byKey[resolveSceneKey(k)]; return s ? (s.thumb || s.sample) : ''; }
  /* v2.54: toast optionally carries one action button — toast('Deleted', {label:'Undo', fn:...}).
     Plain toast(msg) calls behave exactly as before. */
  function toast(m, action) {
    var t = $('#toast');
    if (action && action.label) {
      t.innerHTML = '<span>' + esc(m) + '</span><button style="margin-left:14px;padding:7px 16px;border-radius:9px;border:1px solid var(--gold);background:none;color:var(--gold2);font-weight:700;font-size:13px;cursor:pointer">' + esc(action.label) + '</button>';
      t.querySelector('button').onclick = function () { clearTimeout(t._t); t.classList.remove('on'); if (action.fn) action.fn(); };
    } else t.textContent = m;
    t.classList.add('on'); clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('on'); }, action ? 6000 : 2400);
  }
  window.__rsToast = toast;   /* v2.64: appended patch blocks reuse the ONE core toast instead of hand-rolling banners */
  /* v2.54: in-app ask dialogs — replace every browser prompt()/confirm() (UX review §3.6).
     They live on their OWN overlay above the sheet scrim (z-index 80), so a confirm can
     float over an open sheet (person editor, mode dashboard) without destroying it. */
  function askDismiss() { var o = $('#rsask'); if (o) o.remove(); D.removeEventListener('keydown', askKey, true); }
  function askKey(e) { if (e.key === 'Escape') { e.stopPropagation(); askDismiss(); } }
  function askOpen(inner, wide) {
    askDismiss();
    var o = D.createElement('div'); o.id = 'rsask';
    o.style.cssText = 'position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(6,7,10,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)';
    o.innerHTML = '<div style="width:' + (wide ? 'min(780px,94vw)' : 'min(430px,92vw)') + ';max-height:86vh;display:flex;flex-direction:column;background:#12141a;border:1px solid var(--line);border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.6);padding:20px 22px;animation:sheetin .22s var(--ease)">' + inner + '</div>';
    o.addEventListener('click', function (e) { if (e.target === o) askDismiss(); });
    D.body.appendChild(o);
    D.addEventListener('keydown', askKey, true);
    return o;
  }
  function askText(title, placeholder, initial, cb) {
    askOpen('<div style="font-family:Georgia,serif;font-size:17px;margin-bottom:14px">' + esc(title) + '</div>'
      + '<input type="text" id="rsaskin" placeholder="' + esc(placeholder || '') + '" value="' + esc(initial || '') + '" style="height:44px;font-size:15px">'
      + '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn gh" id="rsaskno" style="flex:1;min-height:44px">Cancel</button><button class="btn p" id="rsaskok" style="flex:1;min-height:44px">OK</button></div>');
    var inp = $('#rsaskin');
    function go() { var v = (inp.value || '').trim(); if (!v) { inp.focus(); return; } askDismiss(); cb(v); }
    $('#rsaskok').onclick = go;
    $('#rsaskno').onclick = askDismiss;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } e.stopPropagation(); });
    setTimeout(function () { inp.focus(); inp.select(); }, 60);
  }
  function askConfirm(title, body, okLabel, cb, danger) {
    askOpen('<div style="font-family:Georgia,serif;font-size:17px;margin-bottom:8px">' + esc(title) + '</div>'
      + (body ? '<div class="hint" style="font-size:12.5px;line-height:1.5;margin-bottom:6px">' + esc(body) + '</div>' : '')
      + '<div style="display:flex;gap:10px;margin-top:14px"><button class="btn gh" id="rsaskno" style="flex:1;min-height:44px">Cancel</button>'
      + '<button class="btn' + (danger ? '' : ' p') + '" id="rsaskok" style="flex:1;min-height:44px' + (danger ? ';background:linear-gradient(180deg,#e0655f,#b64840);color:#fff;border:none;font-weight:700' : '') + '">' + esc(okLabel || 'OK') + '</button></div>');
    $('#rsaskok').onclick = function () { askDismiss(); cb(); };
    $('#rsaskno').onclick = askDismiss;
    setTimeout(function () { var b = $('#rsaskok'); if (b) b.focus(); }, 60);
  }
  function opt(list, cur) { return list.map(function (o) { var v = o.v != null ? o.v : o, l = o.l != null ? o.l : o; return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>'; }).join(''); }
  function api(p, opts) { return fetch(p, opts).then(function (r) { if (r.ok) return r.json(); return r.text().then(function (t) { var m = t; try { m = (JSON.parse(t).error) || t; } catch (e) {} try { window.dispatchEvent(new CustomEvent('rs-api-error', { detail: { path: p, status: r.status, msg: String(m).slice(0, 300) } })); } catch (e) {} var err = new Error(String(m).slice(0, 300)); err.status = r.status; throw err; }); }); } /* rs-harden api v1 */
  function post(p, body) { return api(p, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method: 'POST' }); }
  /* v2.64: per-frame arrays pad to layout.frames.length (from /api/layout) — no
     hardcoded 6s. On-disk profiles stay length-6 today because that IS the layout. */
  function padArr(a, n, fill) { a = Array.isArray(a) ? a.slice(0, n) : []; while (a.length < n) a.push(fill !== undefined ? fill : null); return a; }
  function normalize(p) {
    var n = layout.frames.length;
    p.frames = padArr(p.frames, n, 'pano');
    p.frameScenes = padArr(p.frameScenes, n);
    p.overlays = padArr(p.overlays, n);
    p.effects = padArr(p.effects, n);
    p.frameViz = padArr(p.frameViz, n);          // v2.32: per-frame 🎶 music-visualiser content type
    p.framePlaylist = padArr(p.framePlaylist, n); // v2.32: per-frame ♪ playlist / now-playing content type
    if (p.framePlaylists) p.framePlaylists = padArr(p.framePlaylists, n);   // v2.64: per-frame media playlists (conductor v2.62; overrides the legacy /api/playlists store)
    p.transition = p.transition || {};
    p.audio = p.audio || {};
    return p;
  }

  /* ---------------- bus (room truth) ---------------- */
  var wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  var bus = IE.createBus('app', { ws: wsUrl });
  var _lastGame = null;
  bus.onState(function (s) {
    live.state = s; renderNow(); renderPlayLive();
    /* v3.40: 🎉 Games rides the bus — any state.partyGame change repaints the console */
    var _pgv = s.partyGame ? (s.partyGame.id + ':' + (s.partyGame.v || 0)) : 'off';
    if (playTab === 'games' && bus._pgv !== undefined && _pgv !== bus._pgv && (s.partyGame || bus._pgv !== 'off')) renderGames();
    bus._pgv = _pgv;
    /* v2.98 (7): the Music tab rides the bus — hold/track/mode flips repaint instantly */
    var _mh = !!s.musicHold, _mt = (s.musicNow && s.musicNow.title) || '';
    if (playTab === 'music' && (bus._mh !== _mh || bus._mt !== _mt)) setTimeout(pollMusicStatus, 150);
    if (playTab === 'music' && bus._mg !== s.game) paintMusicQuick();
    bus._mh = _mh; bus._mt = _mt; bus._mg = s.game;
    /* v2.64 📅 On this day — if the live mode's photos use the virtual album and the
       conductor fell back to a real album (nothing matches today's date), say so once. */
    if (s.game && s.game !== window.__rsOtdGame) {
      window.__rsOtdGame = s.game;
      var otp = profiles[s.game];
      if (otp && otp.photos && otp.photos.dir === '_onthisday') {
        api('/api/photos?dir=_onthisday').then(function (pj) { if (pj && pj.fallback) toast('No photos match today — showing ' + pj.fallback); }).catch(function () {});
      }
    }
    if (s.game !== _lastGame || (Date.now() - (window.__rsSocT || 0)) > 15000) { window.__rsSocT = Date.now();                 // v2.0: per-mode Moment buttons ride /api/social
      _lastGame = s.game;
      api('/api/social').then(function (j) { if (j && j.social) { social = j.social; renderSocial(); } }).catch(function () {});
    }
  });

  /* ---------------- boot ---------------- */
  function bootFailCard() {   // v2.44 (QW9): a 2.4s toast over a blank shell wasn't an honest state
    if ($('#bootfail')) return;   // don't stack duplicates on repeated failures
    var d = D.createElement('div');
    d.id = 'bootfail';
    d.style.cssText = 'position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:rgba(6,7,10,.55)';
    d.innerHTML = '<div style="background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:26px 32px;text-align:center;max-width:340px;box-shadow:0 24px 60px rgba(0,0,0,.6)">'
      + '<div style="font-family:Georgia,serif;font-size:17px;margin-bottom:6px">Can’t reach the Conductor</div>'
      + '<div class="hint" style="margin-bottom:16px">Retrying automatically…</div>'
      + '<button class="btn p" id="bootretry">Retry now</button></div>';
    D.body.appendChild(d);
    $('#bootretry').onclick = function () { boot(); };
  }
  function boot() {
    Promise.all([
      api('/api/profiles'), api('/api/scenes'), api('/api/overlays'),
      api('/api/photodirs').catch(function () { return { dirs: [] }; }),
      api('/api/effects').catch(function () { return { effects: [] }; }),
      api('/api/ha/room').catch(function () { return { configured: false }; }),
      api('/api/health').catch(function () { return null; }),
      api('/api/social').catch(function () { return { social: [] }; }),
      api('/api/decks').catch(function () { return { decks: [] }; }),
      api('/api/sounds').catch(function () { return { sounds: [] }; }),
      api('/api/layout').catch(function () { return null; })   // v2.64: wall shape from the conductor; null = keep the static fallback (older conductor)
    ]).then(function (r) {
      var bf = $('#bootfail'); if (bf) bf.remove();   // v2.44 (QW9)
      var lj = r[10];   // v2.64: adopt the conductor's layout BEFORE any normalize/render below
      if (lj && lj.ok && Array.isArray(lj.frames) && lj.frames.length) {
        layout.frames = lj.frames.slice();
        layout.walls = (lj.walls && Object.keys(lj.walls).length) ? lj.walls : wallsFromFrames(layout.frames);
        layout.roles = (lj.roles && lj.roles.primary) ? lj.roles
          : (IE.deriveRoles ? IE.deriveRoles(layout.walls, layout.frames) : layout.roles);   /* Phase 2c: server roles win, else derive */
        layout.atRest = lj.atRest || layout.atRest;                                          /* Phase 2c */
        FRAME_IDS = layout.frames;
        window.__rsLayout = layout;
        if (IE.setLayout) IE.setLayout(layout);   /* Phase 2a: engine helpers (slotOf/wallKeyOf/…) follow the adopted layout */
        if ($$('#walls .fr').length && $$('#walls .fr').length !== FRAME_IDS.length) $$('#walls .fr').forEach(function (f) { f.remove(); });   // boot retry after a layout change: force a canvas rebuild
      }
      profiles = r[0].profiles || {}; tagmap = r[0].tagmap || {}; settings = r[0].settings || {};
      window.__rsSettings = settings;   /* Phase 2c: appended blocks (TV wake shim) read settings.ha.tvQuirks from here */
      /* v2.54: purge modes soft-deleted more than 30 days ago — single pass, persist only if something went */
      var purged = 0;
      Object.keys(profiles).forEach(function (k) { var d = profiles[k] && profiles[k].deleted; if (d && (Date.now() - d) > 30 * 86400000) { delete profiles[k]; purged++; } });
      if (purged) persist();
      scenes = r[1].scenes || []; byKey = {}; scenes.forEach(function (s) { byKey[s.key] = s; }); _skCache = {};   /* v2.65 */
      overlays = r[2].overlays || [];
      albums = r[3].dirs || [];
      effects = r[4].effects || [];
      haRoom = r[5] || { configured: false };
      health = r[6];
      social = (r[7] && r[7].social) || []; decks = (r[8] && r[8].decks) || [];
      sounds = (r[9] && r[9].sounds) || [];
      var first = vids()[0];
      selectMode(first, true);
      setSpace(localStorage.getItem('ie-space') || 'play');
      setPlayTab(localStorage.getItem('ie-playtab') || 'modes');
      renderPlay(); renderNow(); renderHealth(); renderSocial(); renderAuto();
      setInterval(pollHealth, 12000);
      setInterval(renderAuto, 60000);
    }).catch(function (e) {
      // v2.34: a conductor restart during page load used to brick the tablet —
      // one toast, empty shell, no retry. Now we retry every 5s until it works.
      // v2.44 (QW9): plus a persistent centered card with a Retry-now button.
      bootFailCard();
      setTimeout(boot, 5000);
    });
  }
  function pollHealth() { api('/api/health').then(function (h) { health = h; renderHealth(); }).catch(function () { health = null; renderHealth(); }); }
  function renderHealth() {
    $('#hdot').classList.toggle('ok', !!(health && health.ok));
    var frames = (health && health.frames) || [];
    $('#tvdots').innerHTML = FRAME_IDS.map(function (f) { return '<i class="' + (frames.indexOf(f) >= 0 ? 'on' : '') + '" title="' + f + '"></i>'; }).join('');
  }

  /* ---------------- spaces ---------------- */
  function setSpace(sp) {
    space = sp; localStorage.setItem('ie-space', sp);
    $$('#spaces button').forEach(function (b) { b.classList.toggle('on', b.dataset.space === sp); });
    $('#vplay').classList.toggle('on', sp === 'play');
    $('#vdesign').classList.toggle('on', sp === 'design');
    if (sp === 'design') { renderStrip(); paintCanvas(); renderInspector(); renderTray(); updateDirtyUI(); }
  }
  /* v2.54: Design is a guarded destination — from Play it needs a 600ms hold (the same
     long-press the strip and Play cards already use); a quick tap just hints. Design→Play
     stays a normal tap, and programmatic setSpace('design') calls (New mode, ✎ Edit in
     Design) bypass the hold entirely. */
  $$('#spaces button').forEach(function (b) {
    if (b.dataset.space === 'design') {
      var lp = null, fired = false;
      b.addEventListener('pointerdown', function () {
        if (space === 'design') return;
        fired = false; clearTimeout(lp);
        lp = setTimeout(function () { fired = true; setSpace('design'); }, 600);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, function () { clearTimeout(lp); }, { passive: true }); });
      b.onclick = function () { if (space === 'design' || fired) { fired = false; return; } toast('Hold to open Design'); };
    } else b.onclick = function () { setSpace(b.dataset.space); };
  });

  /* ---------------- NOW PLAYING bar ---------------- */
  function renderNow() {
    var s = live.state; if (!s) return;
    var isDraft = s.game === '_draft';
    var p = isDraft ? draft : profiles[s.game];
    /* v2.54: "· PREVIEW" is a tap target — ends the preview exactly like the savebar toggle's off-branch */
    if (isDraft) {
      $('#nowname').innerHTML = esc((draft && draft.name) || 'Draft')
        + ' · <span id="pvend" title="Tap to end the preview and restore the room" style="color:#f0a09a;padding:2px 8px;border:1px solid rgba(224,101,95,.55);border-radius:11px;font-size:13px;cursor:pointer;text-decoration:underline dashed;text-underline-offset:3px">PREVIEW ✕</span>';
      var pe = $('#pvend'); if (pe) pe.onclick = function (e) { e.stopPropagation(); endPreview(); };
    } else {
      $('#nowname').textContent = p ? (p.name || s.game) : s.game;
    }
    /* v2.54 (delight 9b): kid-safe flipping ON shimmers the card grid — visible confirmation the room got gentler */
    var kidNow = !!s.kid;
    if (renderNow._kid === false && kidNow) kidRipple();
    renderNow._kid = kidNow;
    var m = IE.MODES[s.mode];
    var phName = null;
    if (s.phaseId && s.phases) s.phases.forEach(function (p2) { if (p2.id === s.phaseId) phName = p2.name; });
    $('#nowphase').textContent = (s.game === atRestId() ? 'At rest' : (phName || (m ? m.name : s.mode))) + (s.musicHold ? ' · ♪ music' : '');   /* Phase 2c */
    var th = p ? sceneThumb(p.scene) : '';
    $('#nowthumb').style.backgroundImage = th ? 'url("' + th + '")' : 'none';
    var accent = (p && p.accent) || '#c9a35e';
    D.documentElement.style.setProperty('--accent', accent);
    $('#now').style.background = 'linear-gradient(90deg,' + accent + '18,transparent 45%)';
    if (!$('#vol')._drag) $('#vol').value = (s.channels && s.channels.master != null) ? s.channels.master : 70;
    $('#kidtgl').classList.toggle('on', !!s.kid);
    renderPhaseBtn(s);
    /* v3.08 🎬 intro overlay — while the conductor runs a cue timeline */
    var io = $('#introov'), sI = s.intro;
    if (sI && sI.on && !sI.preview) {
      if (!io) {
        io = D.createElement('div'); io.id = 'introov';
        io.innerHTML = '<div class="cap">Now entering</div><div class="mn"></div><div class="pb"><i></i></div>'
          + '<button class="btn" id="inskip" style="border-color:var(--gold);color:var(--gold2)">⏭ Skip intro</button>';
        D.body.appendChild(io);
        var sk = $('#inskip'); if (sk) sk.onclick = function () { post('/api/intro/skip'); };
      }
      io.querySelector('.mn').textContent = '🎬 ' + (sI.name || sI.game);
      var skb = $('#inskip'); if (skb) skb.style.display = (sI.skippable === false) ? 'none' : '';
      if (io._sig !== sI.startedTs) {
        io._sig = sI.startedTs;
        var bar = io.querySelector('.pb i'), total = Math.max(500, sI.endAtMs || 1), done = Math.max(0, Math.min(total, Date.now() - sI.startedTs));
        bar.style.transition = 'none'; bar.style.width = ((done / total) * 100) + '%';
        requestAnimationFrame(function () { bar.style.transition = 'width ' + (total - done) + 'ms linear'; bar.style.width = '100%'; });
      }
    } else if (io) io.remove();
  }
  $('#vol').addEventListener('input', function () { $('#vol')._drag = true; });
  $('#vol').addEventListener('change', function () {
    $('#vol')._drag = false;
    if (!live.state) return;
    var s = clone(live.state); s.channels = s.channels || {}; s.channels.master = +$('#vol').value; s.rev = (s.rev || 0) + 1;
    bus.publish(s);
  });
  /* v2.44 (QW8): toasts only after the server answers — the optimistic toast lied on failure */
  $('#kidtgl').onclick = function () { var on = !(live.state && live.state.kid); fetch('/api/kid?on=' + (on ? 1 : 0)).then(function (r) { toast(r.ok ? 'Kid-safe ' + (on ? 'on' : 'off') : 'Could not reach the Conductor'); }).catch(function () { toast('Could not reach the Conductor'); }); };
  $('#panic').onclick = function () { post('/api/panic').then(function () { toast('⟲ Restoring Dining Mode'); }).catch(function () { toast('Could not reach the Conductor'); }); };
  /* v2.44 (QW7): the truth bar is also the door — tap the live mode's name for its dashboard */
  $('#nowname').onclick = function () { var s = live.state; if (!s || !s.game || s.game === '_draft' || !profiles[s.game]) return; openModeDash(s.game); };

  /* ---------------- PLAY ---------------- */
  function playSections() { return Array.isArray(settings.playSections) ? settings.playSections.filter(Boolean) : []; }
  function playableIds() { return vids().filter(function (k) { return !profiles[k].hidden; }); }
  /* v2.44 (exec4): client-side Recents + ★ Favourites for the 133-mode gallery */
  function rsIds(k) { try { var a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function rsSaveIds(k, a) { try { localStorage.setItem(k, JSON.stringify(a)); } catch (e) {} }
  function recordRecent(id) { if (!id || id.charAt(0) === '_' || !profiles[id]) return; var a = rsIds('rs-recent').filter(function (x) { return x !== id; }); a.unshift(id); rsSaveIds('rs-recent', a.slice(0, 8)); }
  function isFav(id) { return rsIds('rs-favs').indexOf(id) >= 0; }
  function toggleFav(id) {
    var a = rsIds('rs-favs'), ix = a.indexOf(id);
    if (ix >= 0) a.splice(ix, 1); else a.push(id);
    rsSaveIds('rs-favs', a);
    renderPlay();
    if (ix < 0) { toast(localStorage.getItem('rs-favhint') ? '★ Added to Favourites' : '★ Favourite — long-press to remove'); try { localStorage.setItem('rs-favhint', '1'); } catch (e) {} }
    else toast('Removed from Favourites');
  }
  function pcardHTML(id) {
    var p = profiles[id], th = sceneThumb(p.scene);
    var pk = id.indexOf('.') > 0 ? id.slice(0, id.indexOf('.')) : null;   /* Phase 3c: namespaced id = theme-pack mode */
    return '<div class="pcard" data-id="' + id + '"' + (th ? ' style="background-image:url(\'' + th.replace(/'/g, '%27') + '\')"' : '') + '>'
      + '<div class="shade"></div><span class="livebdg">LIVE</span>' + (isFav(id) ? '<span class="pfav">★</span>' : '')
      + (pk ? '<span class="pbadge" title="Theme pack: ' + esc(pk) + '">🧩</span>' : '')
      + '<div style="position:relative;width:100%"><div class="nm">' + esc(p.name || id) + '</div><div class="ds">' + esc(p.ambience || '') + '</div></div>'
      + '<div class="pplay" title="Play this mode now">▶</div></div>';   // v2.44 (QW2): instant play — revives the launch ripple
  }
  /* v2.01 — masonry-style reflow when the Play filter changes: surviving cards
     glide to their new spot (FLIP), newcomers rise in with a stagger, leavers
     ghost out in place. */
  function capturePlayCards() {
    var map = {};
    $$('#pcards .pcard').forEach(function (c) {
      map[c.dataset.id] = { rect: c.getBoundingClientRect(), bg: c.style.backgroundImage || '' };
    });
    return map;
  }
  function animatePlayReflow(old) {
    var seen = {};
    var cards = $$('#pcards .pcard');
    var enterN = 0;
    cards.forEach(function (c) {
      var id = c.dataset.id; seen[id] = 1;
      var o = old[id], nr = c.getBoundingClientRect();
      if (o) {
        var dx = o.rect.left - nr.left, dy = o.rect.top - nr.top;
        var sx = nr.width ? (o.rect.width / nr.width) : 1;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(sx - 1) > 0.02) {
          c.style.transformOrigin = 'top left';
          c.style.transition = 'none';
          c.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ')';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              c.style.transition = 'transform .42s var(--ease)';
              c.style.transform = '';
              setTimeout(function () { c.style.transition = ''; c.style.transformOrigin = ''; }, 480);
            });
          });
        }
      } else {
        c.classList.add('enter');
        c.style.animationDelay = Math.min(enterN * 26, 340) + 'ms'; enterN++;
        setTimeout(function () { c.classList.remove('enter'); c.style.animationDelay = ''; }, 900);
      }
    });
    var ghosts = 0;
    Object.keys(old).forEach(function (id) {
      if (seen[id] || ghosts >= 24) return;
      ghosts++;
      var o = old[id], g = D.createElement('div');
      g.className = 'pghost';
      g.style.left = o.rect.left + 'px'; g.style.top = o.rect.top + 'px';
      g.style.width = o.rect.width + 'px'; g.style.height = o.rect.height + 'px';
      if (o.bg) g.style.backgroundImage = o.bg;
      D.body.appendChild(g);
      requestAnimationFrame(function () { g.style.opacity = '0'; g.style.transform = 'scale(.93)'; });
      setTimeout(function () { g.remove(); }, 320);
    });
    var pc = $('#pcards'); if (pc) { pc.classList.add('anim'); setTimeout(function () { pc.classList.remove('anim'); }, 700); }
  }
  function renderPlay(animate) {
    var oldCards = animate ? capturePlayCards() : null;
    var secs = playSections(), ids = playableIds();
    /* v2.54: the 🔍 mode search lives at the START of the chip row (44px), wired to the
       existing data-rshide mechanism (RS-MODE-SEARCH block below exposes the setter).
       The old header pill is gone. */
    var chips = '<input type="search" id="pcsearch" placeholder="🔍 Search modes…" autocomplete="off" spellcheck="false" value="' + esc(window.__rsModeSearchQ || '') + '">';
    if (secs.length) {
      chips += '<button class="chip' + (playCat === 'all' ? ' on' : '') + '" data-pc="all">All</button>'
        + secs.map(function (s2) { return '<button class="chip' + (playCat === s2.id ? ' on' : '') + '" data-pc="' + esc(s2.id) + '">' + (s2.icon ? s2.icon + ' ' : '') + esc(s2.name) + '</button>'; }).join('');
    }
    var pcEl = $('#pcats'); if (pcEl) {
      pcEl.innerHTML = chips;
      $$('#pcats [data-pc]').forEach(function (b) { b.onclick = function () { playCat = b.dataset.pc; renderPlay(true); }; });
      var se = $('#pcsearch');
      if (se) {
        se.oninput = function () { if (window.__rsSetModeSearch) window.__rsSetModeSearch(se.value); };
        se.onkeydown = function (e) { if (e.key === 'Escape') { se.value = ''; if (window.__rsSetModeSearch) window.__rsSetModeSearch(''); se.blur(); } e.stopPropagation(); };
      }
    }
    /* v2.44 (exec4): ★ Favourites + Recently played, synthesized ahead of the sections
       (shown in the unfiltered "All" view; ids validated against current profiles) */
    var pre = '';
    if (playCat === 'all' || !secs.length) {
      var favIds = rsIds('rs-favs').filter(function (id) { return ids.indexOf(id) >= 0; });
      var recIds = rsIds('rs-recent').filter(function (id) { return ids.indexOf(id) >= 0 && favIds.indexOf(id) < 0; });
      if (favIds.length) pre += '<div class="psec"><div class="zt">★ Favourites</div><div class="cards">' + favIds.map(pcardHTML).join('') + '</div></div>';
      if (recIds.length) pre += '<div class="psec"><div class="zt">Recently played</div><div class="cards">' + recIds.map(pcardHTML).join('') + '</div></div>';
    }
    var html = '';
    if (!secs.length) html = '<div class="cards">' + ids.map(pcardHTML).join('') + '</div>';
    else {
      var used = {};
      secs.forEach(function (s2) {
        var group = ids.filter(function (id) { return (profiles[id].category || '') === s2.id; });
        group.forEach(function (id) { used[id] = 1; });
        if (!group.length || (playCat !== 'all' && playCat !== s2.id)) return;
        html += '<div class="psec"><div class="zt">' + (s2.icon ? s2.icon + ' ' : '') + esc(s2.name) + '</div><div class="cards">' + group.map(pcardHTML).join('') + '</div></div>';
      });
      var rest = ids.filter(function (id) { return !used[id]; });
      if (rest.length && (playCat === 'all')) html += '<div class="psec">' + (Object.keys(used).length ? '<div class="zt">More</div>' : '') + '<div class="cards">' + rest.map(pcardHTML).join('') + '</div></div>';
    }
    if (!html) {
      var secName = ''; secs.forEach(function (s2) { if (s2.id === playCat) secName = s2.name; });
      html = '<div class="psec" style="text-align:center;padding:46px 20px;border:1.5px dashed var(--line);border-radius:16px;color:var(--dim)">'
        + '<div style="font-size:26px;margin-bottom:10px">🪄</div>'
        + '<div style="font-size:14px;color:var(--ink);margin-bottom:6px">Nothing in ' + esc(secName || 'this section') + ' yet</div>'
        + '<div class="hint">Open a mode in Design and pick \u201c' + esc(secName || 'a section') + '\u201d in the Section dropdown above the wall — it\u2019ll appear here.</div></div>';
    }
    $('#pcards').innerHTML = pre + html;
    if (oldCards) animatePlayReflow(oldCards);
    $$('#pcards .pcard').forEach(function (c) {
      c.onclick = function (e) {
        if (c._lpDone) { c._lpDone = false; return; }                 // a long-press already handled this touch
        if (e.target && e.target.closest && e.target.closest('.pplay')) { e.stopPropagation(); launch(c.dataset.id); return; }   // v2.44 (QW2)
        openModeDash(c.dataset.id);
      };
      /* v2.44 (exec4): 600ms long-press toggles ★ — same gesture the strip cards already use */
      c.addEventListener('pointerdown', function () { c._lpDone = false; clearTimeout(c._lp); c._lp = setTimeout(function () { c._lpDone = true; toggleFav(c.dataset.id); }, 600); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { c.addEventListener(ev, function () { clearTimeout(c._lp); }, { passive: true }); });
    });
    // light scene chips
    var scNames = (haRoom && haRoom.scenes) || Object.keys((settings.ha && settings.ha.lightScenes) || {});
    $('#lightchips').innerHTML = scNames.map(function (s2) { return '<button class="chip" data-ls="' + s2 + '">' + s2 + '</button>'; }).join('') || '<span class="hint">Home Assistant not configured</span>';
    $$('#lightchips [data-ls]').forEach(function (b) { b.onclick = function () { post('/api/ha/lightscene', { scene: b.dataset.ls }).then(function (j) { toast(j.ok ? 'Lights: ' + b.dataset.ls : 'Lights unavailable'); }); }; });
    renderPlayLive();
  }
  function renderPlayLive() {
    renderReveal();
    renderCue();
    if (!live.state) return;
    $$('#pcards .pcard').forEach(function (c) { c.classList.toggle('live', c.dataset.id === live.state.game); });
    /* v2.54 (delight 9c): the section header holding the live mode takes its accent —
       same --accent custom property renderNow sets on the bar */
    $$('#pcards .psec').forEach(function (sec) {
      var zt = sec.querySelector('.zt'); if (!zt) return;
      zt.style.color = sec.querySelector('.pcard.live') ? 'var(--accent)' : '';
    });
  }
  /* v2.54 (delight 9b): ripple the card grid with the existing shimmer/ripple mechanic
     when kid-safe flips ON (reduced-motion aware; reuses .pcard.rip from launch()) */
  function kidRipple() {
    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    $$('#pcards .pcard').forEach(function (c, i) {
      setTimeout(function () { c.classList.add('rip'); setTimeout(function () { c.classList.remove('rip'); }, 950); }, Math.min(i * 50, 1400));
    });
  }
  /* ==================== v2.10 PLAY TABS: Modes / Music / Lights ==================== */
  var playTab = 'modes', musicPoll = null;
  var musStatus = null, musTrackQ = '', musPls = [];   /* v2.98: musPls = loaded MA playlists */
  function setPlayTab(t) {
    playTab = t; localStorage.setItem('ie-playtab', t);
    $$('#playtabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.pt === t); });
    ['modes', 'music', 'lights', 'timer', 'scores', 'moments', 'games'].forEach(function (k) {
      var el = $('#pt' + k.charAt(0).toUpperCase() + k.slice(1));
      if (el) el.classList.toggle('on', k === t);
    });
    if (musicPoll) { clearInterval(musicPoll); musicPoll = null; }
    if (timerTick) { clearInterval(timerTick); timerTick = null; }
    if (gmTick) { clearInterval(gmTick); gmTick = null; }   /* v3.40 */
    if (t === 'music') { renderMusic(); musicPoll = setInterval(pollMusicStatus, 5000); }
    if (t === 'lights') renderLights();
    /* v2.86: #tdisp is now a STYLED FACE, not a text node — the tick can no longer
       clobber it with textContent. One tickTimer() drives face + state + chess + the
       zero-podium watch. */
    if (t === 'timer') { tZeroPrev = null; renderTimer(); timerTick = setInterval(tickTimer, 250); }
    if (t === 'scores') { scDoc = null; renderScores(); }
    if (t === 'moments') { renderSocial(); renderMomentsSay(); }   /* v3.30 */
    if (t === 'games') renderGames();   /* v3.40 */
  }
  $$('#playtabs button').forEach(function (b) { b.onclick = function () { setPlayTab(b.dataset.pt); }; });

  /* ---- ♪ Music (Music Assistant) ---- */
  function pollMusicStatus() {
    if (playTab !== 'music') return;
    api('/api/music/status').then(function (j) { musStatus = j; paintMusicNow(); }).catch(function () {});
  }
  /* v2.98: settings.music grows pins / recents / shuffle — musMeta() normalises in place */
  function musMeta() { settings.music = settings.music || {}; var m = settings.music; if (!Array.isArray(m.pins)) m.pins = []; if (!Array.isArray(m.recents)) m.recents = []; return m; }
  function plParse(n) { var m = /^Roomscape>([^>]+)>(.+)$/.exec(n || ''); return m ? { grp: m[1], short: m[2] } : { grp: 'Other', short: n || '' }; }
  function musPlay(uri, label, image) {
    post('/api/music/play', { uri: uri, label: label }).then(function (r) {
      toast(r.ok ? '♪ ' + label + ' — room sounds paused' : (r.error || 'Couldn’t start playback'));
      if (r.ok !== false) recordRecent(uri, label, image);
      setTimeout(pollMusicStatus, 700);
    });
  }
  function recordRecent(uri, label, image) {
    var m = musMeta();
    m.recents = [{ uri: uri, label: label, image: image || null, ts: Date.now() }].concat(m.recents.filter(function (r) { return r.uri !== uri; })).slice(0, 8);
    persist().catch(function () {});
    paintMusicQuick();
  }
  function renderMusic() {
    var el = $('#ptMusic'); if (!el) return;
    el.innerHTML = '<div class="mwrap">'
      + '<div id="musnow"></div><div id="mussetup"></div>'
      + '<div id="musquick"></div>'
      + '<div id="musplay"><span class="hint">Loading…</span></div>'
      + '<div class="zt" style="margin:24px 0 10px">Songs</div>'
      + '<input type="text" id="mussearch" placeholder="Search your library…" style="max-width:420px;margin-bottom:6px" value="' + esc(musTrackQ) + '">'
      + '<div id="mustracks" class="hint">Loading…</div></div>';
    $('#mussearch').oninput = function () { musTrackQ = this.value; clearTimeout(renderMusic._t); renderMusic._t = setTimeout(loadTracks, 450); };
    api('/api/music/status').then(function (j) { musStatus = j; paintMusicNow(); paintMusicSetup(); }).catch(function () {});
    loadPlaylists(); loadTracks();
  }
  /* v2.98 (2+3): quick strip — the live mode's own playlist as a one-tap card, plus recently-played chips */
  function paintMusicQuick() {
    var box = $('#musquick'); if (!box) return;
    var h = '', m = musMeta();
    var g = live.state && live.state.game;
    var want = g && g !== '_draft' && profiles[g] && profiles[g].music && profiles[g].music !== '—' ? profiles[g].music : null;
    var mpl = null;
    if (want) musPls.some(function (pl) { if ((pl.name || '').toLowerCase() === want.toLowerCase()) { mpl = pl; return true; } return false; });
    if (mpl) {
      var pr = plParse(mpl.name);
      h += '<div class="modemus" id="musmode"><span class="ic"' + (mpl.image ? ' style="background-image:url(\'' + mpl.image.replace(/'/g, '%27') + '\')"' : '') + '>' + (mpl.image ? '' : '♪') + '</span>'
        + '<span style="flex:1;min-width:0"><b>' + esc(pr.short) + '</b><br><span style="font-size:11.5px;color:var(--dim)">' + esc((profiles[g].name || g)) + '’s own music — one tap</span></span><span style="color:var(--gold2);font-size:18px">▶</span></div>';
    }
    if (m.recents.length) {
      h += '<div class="zt" style="margin:14px 0 8px">Recently played</div><div style="display:flex;gap:7px;flex-wrap:wrap">'
        + m.recents.map(function (r, i) { return '<button class="recchip" data-rec="' + i + '" title="' + esc(r.label) + '">♪ ' + esc(plParse(r.label).short || r.label) + '</button>'; }).join('') + '</div>';
    }
    box.innerHTML = h;
    var mm = $('#musmode'); if (mm && mpl) mm.onclick = function () { musPlay(mpl.uri, plParse(mpl.name).short, mpl.image); };
    $$('#musquick [data-rec]').forEach(function (b) { b.onclick = function () { var r = m.recents[+b.dataset.rec]; if (r) musPlay(r.uri, r.label, r.image); }; });
  }
  function paintMusicNow() {
    var box = $('#musnow'); if (!box || !musStatus) return;
    if (document.activeElement && document.activeElement.id === 'musvol') return;   // v2.11: don't yank the slider mid-drag
    var j = musStatus;
    if (!j.configured || j.ok === false || !j.player) { box.innerHTML = ''; paintMusicSetup(); return; }
    var q = j.queue, cur = q && q.current;
    var playing = q && q.state === 'playing';
    box.innerHTML = '<div class="nowmus">'
      + '<div class="art"' + (cur && cur.image ? ' style="background-image:url(\'' + cur.image.replace(/'/g, '%27') + '\')"' : '') + '>' + (cur && cur.image ? '' : '♪') + '</div>'
      + '<div style="flex:1;min-width:180px"><div class="tt">' + esc(cur ? cur.name : 'Nothing playing') + '</div>'
      + '<div class="ar">' + esc(cur ? cur.artist : 'Pick a playlist or a song below') + '</div>'
      + (j.hold ? '<span class="hchip">♪ music is overriding the room\u2019s own sounds</span>' : '') + '</div>'
      + '<button class="mbtn" data-mc="previous" title="Previous">⏮</button>'
      + '<button class="mbtn big" data-mc="' + (playing ? 'pause' : 'play') + '">' + (playing ? '⏸' : '▶') + '</button>'
      + '<button class="mbtn" data-mc="next" title="Next">⏭</button>'
      + '<button class="mbtn tog' + (q && q.shuffle ? ' on' : '') + '" id="musshuf" title="Shuffle the queue">🔀</button>'
      + '<div style="display:flex;align-items:center;gap:8px;min-width:170px">🔊 <input type="range" id="musvol" min="0" max="100" value="' + (j.volume != null ? Math.round(j.volume) : 35) + '" style="flex:1;accent-color:var(--gold)"></div>'
      + '<div style="display:flex;gap:5px;flex:0 0 auto">' + [['Dinner', 25], ['Normal', 40], ['Party', 65]].map(function (p2) { return '<button class="vpre" data-vp="' + p2[1] + '" title="Volume ' + p2[1] + '">' + p2[0] + '</button>'; }).join('') + '</div>'
      + '<button class="btn" data-mc="stop" title="Stop the music — the room\u2019s own soundscape returns">⏹ Music off</button>'
      + '</div>'
      + (q && q.upNext && q.upNext.length ? '<div class="upnext">Up next · ' + q.upNext.map(function (t) { return esc(t.artist ? t.artist + ' — ' + t.name : t.name); }).join(' · ') + '</div>' : '');
    /* v2.98 (8): shuffle toggle — flips the live queue AND persists, so playlist-play respects it */
    var shb = $('#musshuf');
    if (shb) shb.onclick = function () {
      var want = !(q && q.shuffle);
      musMeta().shuffle = want; persist().catch(function () {});
      post('/api/music/cmd', { action: 'shuffle', value: want }).then(function (r) {
        if (r.ok === false) return toast(r.error || 'Music Assistant didn’t answer');
        toast(want ? '🔀 Shuffle on' : 'Shuffle off — queue plays in order');
        setTimeout(pollMusicStatus, 500);
      });
    };
    /* v2.98 (4): one-tap volume presets */
    $$('#musnow [data-vp]').forEach(function (b) {
      b.onclick = function () {
        var v = +b.dataset.vp, mv2 = $('#musvol'); if (mv2) mv2.value = v;
        post('/api/music/cmd', { action: 'volume', value: v }).then(function (r) {
          if (r && r.ok === false) return toast(r.error || 'Music Assistant didn’t answer');
          toast('🔊 ' + b.textContent + ' — volume ' + v);
          setTimeout(pollMusicStatus, 700);
        });
      };
    });
    $$('#musnow [data-mc]').forEach(function (b) {
      b.onclick = function () {
        post('/api/music/cmd', { action: b.dataset.mc }).then(function (r) {
          if (r.ok === false) return toast(r.error || 'Music Assistant didn\u2019t answer');
          if (b.dataset.mc === 'stop') toast('⏹ Music off — room sounds return');
          setTimeout(pollMusicStatus, 500);
        });
      };
    });
    var mv = $('#musvol');
    if (mv) mv.oninput = function () { clearTimeout(mv._t); var v = +mv.value; mv._t = setTimeout(function () { post('/api/music/cmd', { action: 'volume', value: v }).then(function () { setTimeout(pollMusicStatus, 700); }); }, 300); };
  }
  function paintMusicSetup() {
    var box = $('#mussetup'); if (!box || !musStatus) return;
    var j = musStatus;
    var needs = !j.configured || j.ok === false || !j.player;
    var players = (j.players || []).map(function (pl) { return { v: pl.id, l: pl.name + (pl.available ? '' : ' (offline)') }; });
    var inner = '<div class="r2"><label class="fld"><span>Music Assistant address' + T('Where your Music Assistant server lives. As a Home Assistant add-on that\u2019s the HA machine on port 8095.') + '</span><input type="text" id="musurl" value="' + esc((settings.music && settings.music.url) || j.url || 'http://homeassistant.local:8095') + '"></label>'
      + '<label class="fld"><span>Room player' + T('The Music Assistant player the dining room listens through.') + '</span><select id="musplayer">' + opt([{ v: '', l: '— choose a player —' }].concat(players), (settings.music && settings.music.player) || j.player || '') + '</select></label></div>'
      + '<label class="fld"><span>Access token' + T('Newer Music Assistant servers need a token: open the Music Assistant web interface \u2192 Settings \u2192 your user / security \u2192 create a long-lived API token, and paste it here. It stays on the Conductor.') + '</span><input type="password" id="mustoken" placeholder="' + ((settings.music && settings.music.token) ? '•••••• (saved)' : 'paste a Music Assistant token') + '"></label>'
      + '<div style="display:flex;gap:8px;align-items:center"><button class="btn" id="mussave">Save &amp; connect</button>'
      + (j.ok === false ? '<span class="hint" style="color:#e8886f">' + esc(j.error || 'Couldn\u2019t reach Music Assistant') + '</span>' : '') + '</div>';
    box.innerHTML = needs
      ? '<div class="card"><div class="zt">♪ Set up music' + T('One-time: point RoomScape at your Music Assistant and pick which player fills the dining room.') + '</div>' + inner + '</div>'
      : '<details class="adv" style="margin-bottom:16px"><summary>Music settings</summary><div class="body">' + inner + '</div></details>';
    var sv = $('#mussave');
    if (sv) sv.onclick = function () {
      var tok = $('#mustoken').value.trim();
      var keep = musMeta();   /* v2.98: don't clobber pins / recents / shuffle on re-save */
      settings.music = { url: ($('#musurl').value || '').trim().replace(/\/+$/, ''), player: $('#musplayer').value,
        token: tok || keep.token || '', pins: keep.pins, recents: keep.recents, shuffle: keep.shuffle };
      persist().then(function () { toast('Music settings saved'); renderMusic(); });
    };
  }
  function loadPlaylists() {
    api('/api/music/playlists').then(function (j) {
      var box = $('#musplay'); if (!box) return;
      if (j.ok === false) { box.innerHTML = '<span class="hint">Couldn\u2019t reach Music Assistant — check the address in Music settings above.</span>'; return; }
      musPls = j.playlists || [];
      paintMusicQuick();
      renderPlaylistSections();
    }).catch(function () {});
  }
  /* v2.98 (1+2): the flat playlist wall becomes Pinned + Moods / Games / Themes
     sections — the Roomscape>Group>Name prefix is parsed for grouping and
     stripped from the cards. ★ pins live in settings.music.pins. */
  function renderPlaylistSections() {
    var box = $('#musplay'); if (!box) return;
    if (!musPls.length) { box.innerHTML = '<span class="hint">No playlists in your Music Assistant library yet.</span>'; return; }
    var m = musMeta(), pins = m.pins;
    function card(pl, i) {
      var pr = plParse(pl.name), on = pins.indexOf(pl.uri) >= 0;
      return '<div class="plcard" data-pli="' + i + '"><div class="art"' + (pl.image ? ' style="background-image:url(\'' + pl.image.replace(/'/g, '%27') + '\')"' : '') + '>' + (pl.image ? '' : '♪') + '</div>'
        + '<button class="pin' + (on ? ' on' : '') + '" data-pin="' + i + '" title="' + (on ? 'Unpin' : 'Pin to the top') + '">' + (on ? '★' : '☆') + '</button>'
        + '<div class="nm" title="' + esc(pl.name) + '">' + esc(pr.short) + '</div></div>';
    }
    var groups = {};   // group name -> [index]
    musPls.forEach(function (pl, i) { var g = plParse(pl.name).grp; (groups[g] = groups[g] || []).push(i); });
    var order = ['Moods', 'Games', 'Themes'].filter(function (g) { return groups[g]; })
      .concat(Object.keys(groups).filter(function (g) { return ['Moods', 'Games', 'Themes', 'Other'].indexOf(g) < 0; }).sort())
      .concat(groups.Other ? ['Other'] : []);
    var pinned = musPls.map(function (pl, i) { return i; }).filter(function (i) { return pins.indexOf(musPls[i].uri) >= 0; });
    var bySh = function (a, b) { return plParse(musPls[a].name).short.localeCompare(plParse(musPls[b].name).short); };
    var h = '';
    if (pinned.length) h += '<div class="zt plsec">★ Pinned</div><div class="plgrid">' + pinned.sort(bySh).map(function (i) { return card(musPls[i], i); }).join('') + '</div>';
    order.forEach(function (g) {
      h += '<div class="zt plsec">' + esc(g === 'Other' ? 'Other playlists' : g) + '</div><div class="plgrid">'
        + groups[g].sort(bySh).map(function (i) { return card(musPls[i], i); }).join('') + '</div>';
    });
    box.innerHTML = h;
    $$('#musplay [data-pin]').forEach(function (b) {
      b.onclick = function (ev) {
        ev.stopPropagation();
        var pl = musPls[+b.dataset.pin]; if (!pl) return;
        var mm = musMeta(), at = mm.pins.indexOf(pl.uri);
        if (at >= 0) mm.pins.splice(at, 1); else mm.pins.push(pl.uri);
        persist().catch(function () {});
        renderPlaylistSections();
        toast(at >= 0 ? 'Unpinned ' + plParse(pl.name).short : '★ Pinned ' + plParse(pl.name).short);
      };
    });
    $$('#musplay [data-pli]').forEach(function (c) {
      c.onclick = function () { var pl = musPls[+c.dataset.pli]; if (pl) musPlay(pl.uri, plParse(pl.name).short, pl.image); };
    });
  }
  function loadTracks() {
    api('/api/music/tracks' + (musTrackQ ? '?search=' + encodeURIComponent(musTrackQ) : '')).then(function (j) {
      var box = $('#mustracks'); if (!box) return;
      if (j.ok === false) { box.className = 'hint'; box.innerHTML = 'Music Assistant unreachable.'; return; }
      var ts = j.tracks || [];
      box.className = '';
      box.innerHTML = ts.length ? ts.map(function (t, i) {
        return '<div class="trkrow" data-ti="' + i + '"><div class="ta"' + (t.image ? ' style="background-image:url(\'' + t.image.replace(/'/g, '%27') + '\')"' : '') + '>' + (t.image ? '' : '♪') + '</div>'
          + '<div style="flex:1;min-width:0"><div class="tn">' + esc(t.name) + '</div><div class="tar">' + esc(t.artist) + (t.album ? ' · ' + esc(t.album) : '') + '</div></div><span style="color:var(--gold2)">▶</span></div>';
      }).join('') : '<span class="hint">' + (musTrackQ ? 'Nothing matches.' : 'Your library\u2019s newest songs appear here — or search above.') + '</span>';
      $$('#mustracks [data-ti]').forEach(function (r2) {
        r2.onclick = function () {
          var t = ts[+r2.dataset.ti];
          if (t) musPlay(t.uri, t.name, t.image);   /* v2.98: records a Recently-played chip */
        };
      });
    }).catch(function () {});
  }

  /* ---- 💡 Lights ---- */
  function lightSwatch(sc) {
    if (sc.rgb_color) return 'rgb(' + sc.rgb_color.join(',') + ')';
    if (sc.color_temp_kelvin) { var k = sc.color_temp_kelvin; if (k <= 2300) return '#ff9a3c'; if (k <= 3000) return '#ffc07a'; if (k <= 4000) return '#ffe0b0'; if (k <= 5000) return '#fdf4e0'; return '#dcebff'; }
    return '#c9a35e';
  }
  function renderLights() {
    var el = $('#ptLights'); if (!el) return;
    el.innerHTML = '<div class="lpgrid" id="lpcards"><span class="hint">Loading…</span></div>'
      + '<div class="mwrap" style="margin-top:22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;max-width:1100px;margin-left:auto;margin-right:auto">'
      + '<div class="card" style="margin:0" id="lzchand"><div class="zt">🕯 Chandelier</div><div class="chips" data-lzone="chandelier"><span class="hint">Loading…</span></div></div>'
      + '<div class="card" style="margin:0" id="lzlamps"><div class="zt">🛋 Console lamps</div><div class="chips" data-lzone="lamps"><span class="hint">Loading…</span></div></div>'
      + '<div class="card" style="margin:0">'
      + '<div class="zt">Whole room</div>'
      + '<label class="fld"><span>Brightness</span><input type="range" id="lbr" min="1" max="100" value="60"></label>'
      + '<button class="btn" id="loff" style="width:100%">○ All lights off</button></div></div>';
    api('/api/ha/lightzones').then(function (z) {
      if (!z || !z.ok) return;
      ['chandelier', 'lamps'].forEach(function (zn) {
        var box = $('[data-lzone="' + zn + '"]'); if (!box) return;
        box.innerHTML = (z.scenes || []).slice(0, 14).map(function (s) { return '<button class="chip" data-lzq="' + zn + '|s|' + s + '">' + s + '</button>'; }).join('')
          + (z.effects || []).filter(function (ef) { return ef !== 'none'; }).map(function (ef) { return '<button class="chip" style="border-color:var(--gold)" data-lzq="' + zn + '|e|' + ef + '">✨ ' + ef + '</button>'; }).join('')
          + '<button class="chip" data-lzq="' + zn + '|off|1">○ off</button>';
        $$('[data-lzone="' + zn + '"] [data-lzq]').forEach(function (b) {
          b.onclick = function () {
            var pp = b.dataset.lzq.split('|');
            var body = { zone: pp[0] };
            if (pp[1] === 's') body.scene = pp[2]; else if (pp[1] === 'e') { body.effect = pp[2]; } else body.off = true;
            post('/api/ha/lightzone', body).then(function (r) { toast(r.ok ? '💡 ' + pp[0] + ' → ' + (pp[2] || 'off') : (r.error || 'Zone unavailable')); });
          };
        });
      });
    }).catch(function () {});
    api('/api/lightscenes').then(function (j) {
      var box = $('#lpcards'); if (!box) return;
      if (!j.configured) { box.innerHTML = '<span class="hint">Home Assistant isn\u2019t connected (HA_URL / HA_TOKEN) — see HA-SETUP.md.</span>'; return; }
      var names = Object.keys(j.scenes || {});
      /* v2.44 (QW12): mark the live mode's light scene — same accent treatment the mode dashboard gives p.light */
      var liveLight = null;
      if (live.state) liveLight = live.state.light || ((live.state.game === '_draft' ? (draft || {}) : (profiles[live.state.game] || {})).light) || null;
      box.innerHTML = names.map(function (n) {
        var sc = j.scenes[n] || {};
        var ds = (sc.brightness_pct != null ? sc.brightness_pct + '%' : '') + (sc.color_temp_kelvin ? ' · ' + (sc.color_temp_kelvin / 1000).toFixed(1) + 'k' : '') + (sc.rgb_color ? ' · colour' : '');
        return '<div class="lpcard" data-lsc="' + esc(n) + '"' + (n === liveLight ? ' style="border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);background:rgba(201,163,94,.10)"' : '') + '><div class="sw" style="--swc:' + lightSwatch(sc) + '"></div><div class="nm">' + esc(n) + '</div><div class="ds">' + ds + '</div></div>';
      }).join('');
      $$('#lpcards [data-lsc]').forEach(function (c) {
        c.onclick = function () { post('/api/ha/lightscene', { scene: c.dataset.lsc }).then(function (r) { toast(r.ok ? '💡 ' + c.dataset.lsc : 'Lights unavailable'); }); };
      });
    }).catch(function () {});
    $('#lbr').onchange = function () { post('/api/ha/service', { domain: 'light', service: 'turn_on', data: { entity_id: (settings.ha && settings.ha.lights) || [], brightness_pct: +this.value, transition: 1 } }); };
    $('#loff').onclick = function () { post('/api/ha/service', { domain: 'light', service: 'turn_off', data: { entity_id: (settings.ha && settings.ha.lights) || [], transition: 1 } }).then(function () { toast('Lights off'); }); };
  }

  /* ---- ⏱ Timer (v2.28) — full control for the server-owned room timer (/api/timer) ----
     v2.86 "timer feature pack" — see the file header. Conductor contract: v3.72
     (triggers[] / chain{} / chess{} / takeover{} on the snapshot; /api/timer/presets;
     /api/sounds). NOTE: trigger indices are NOT stable across a save — the server
     re-sorts by atMs DESC — so every write sends the whole array and every read
     comes back out of the POST response. */
  var timerState = null, timerTick = null;
  var tPresets = [], tSounds = null, tPeople = null, tAudio = null, tZeroPrev = null, tChessDraft = null;
  /* curated palette (the live mode's accent is prepended at render time) */
  var TCOLS = [['#c9a35e', 'Gold'], ['#f2e6cf', 'Warm white'], ['#e0655f', 'Red'], ['#e8a33d', 'Amber'], ['#73c990', 'Green'], ['#5ec8c8', 'Teal'], ['#a98cf0', 'Violet']];
  var TSTYLES = [['digital', 'Digital'], ['minimal', 'Minimal'], ['flip', 'Flip'], ['analog', 'Analog'], ['ring', 'Ring'], ['neon', 'Neon'], ['sand', 'Sand']];
  function tFmt(ms) { var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; function p(n) { return (n < 10 ? '0' : '') + n; } return h > 0 ? (h + ':' + p(m) + ':' + p(ss)) : (m + ':' + p(ss)); }
  function tVal(T) { if (!T) return 0; var est = Date.now() + (T._off || 0), el = (T.baseElapsedMs || 0) + (T.running ? est - T.startMs : 0); if (T.type === 'down') return Math.max(0, (T.durationMs || 0) - el); if (T.type === 'up') return el; return 0; }
  function tDisp() { var T = timerState; if (!T) return '0:00'; if (T.type === 'clock') { var d = new Date(), hh = d.getHours(), mm = d.getMinutes(); if (!T.h24) hh = hh % 12 || 12; return ((T.h24 && hh < 10) ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; } if (T.type === 'chess') return tFmt(tChessLive((T.chess && T.chess.turn) || 0)); return tFmt(tVal(T)); }
  function tStore(r) { if (r && r.timer) timerState = Object.assign({}, r.timer, { _off: (r.timer.serverNow ? r.timer.serverNow - Date.now() : 0) }); if (r && r.presets) tPresets = r.presets; }
  /* v2.86: chess live maths — the same server-clock skew (_off) the rest of the tab uses. */
  function tChessLive(i) {
    var T = timerState, c = T && T.chess; if (!c || !c.players || !c.players[i]) return 0;
    var p = c.players[i];
    if (i === c.turn && c.running && c.turnStartMs) return Math.max(0, (p.ms || 0) - (Date.now() - c.turnStartMs + (T._off || 0)));
    return Math.max(0, p.ms || 0);
  }
  function tChessFlagged(i) { var c = timerState && timerState.chess; if (!c) return false; if (c.flagged === i) return true; if (c.flagged === true && i === c.turn) return true; if (c.players && c.players[i] && c.players[i].flagged) return true; return tChessLive(i) <= 0; }
  function tAccent() { var g = live.state && live.state.game; return (g && profiles[g] && profiles[g].accent) || (D.documentElement.style.getPropertyValue('--accent') || '').trim() || '#c9a35e'; }
  function tStateLabel() { var T = timerState; if (!T) return ''; if (T.type === 'clock') return 'live clock'; if (T.type === 'chess') { var c = T.chess; return !c ? 'not set up' : (c.running ? ((c.players[c.turn] || {}).name || 'player') + '’s move' : 'paused'); } return T.running ? 'running' : 'paused'; }
  /* the full span the drama timeline represents (left edge). Falls back to the
     furthest existing trigger so a never-configured timer still draws something. */
  function tSpanMs() {
    var T = timerState, d = (T.type === 'down' ? T.durationMs : T.targetMs) || 0;
    if (!d) { (T.triggers || []).forEach(function (x) { if ((x.atMs || 0) > d) d = x.atMs || 0; }); d = d ? Math.round(d * 1.25) : 0; }
    return d || 300000;
  }
  function postTimer(body, reRender) { post('/api/timer', body).then(function (r) { tStore(r); if (reRender !== false) renderTimer(); else { var d = $('#tstart'); if (d && timerState && timerState.type !== 'clock') d.textContent = timerState.running ? '⏸ Pause' : '▶ Start'; } }); }
  /* v2.86: tTrigFlags/tBuildTrig (the five fixed drama chips) are GONE — the timeline
     below is the editor now, and it round-trips arbitrary triggers instead of five
     hardcoded shapes.

     ONE face builder for every clock miniature in the tab:
       timerFace(style, size, colour, label, staticMs, id)
     size = 'tiny' (preset tile) | 'mini' (style grid) | 'big' (#tdisp card).
     staticMs === null  → the face carries data-tp* hooks and tickTimerPreviews
                          animates it with the REAL timer value.
     staticMs is a number → the face is baked (no hooks) so the tick leaves it alone;
                          that's what preset tiles need (their own colour + duration). */
  function tFlipHTML(txt, col) { return txt.split('').map(function (ch) { return ch === ':' ? '<span class="k" style="color:' + esc(col) + '">:</span>' : '<span class="c" style="color:' + esc(col) + '">' + esc(ch) + '</span>'; }).join(''); }
  function tSandPts(frac) {
    var f = Math.max(0, Math.min(1, frac)), g = 1 - f;
    return {
      t: (50 - 27 * f).toFixed(1) + ',' + (48 - 31 * f).toFixed(1) + ' ' + (50 + 27 * f).toFixed(1) + ',' + (48 - 31 * f).toFixed(1) + ' 50,48',
      b: '23,85 77,85 ' + (50 + 27 * (1 - g)).toFixed(1) + ',' + (85 - 31 * g).toFixed(1) + ' ' + (50 - 27 * (1 - g)).toFixed(1) + ',' + (85 - 31 * g).toFixed(1)
    };
  }
  function tSandSVG(col, frac, lv) {
    var p = tSandPts(frac), c = esc(col);
    return '<svg viewBox="0 0 100 100">'
      + '<polygon points="' + p.t + '" fill="' + c + '" opacity=".92"' + (lv ? ' data-tpsandt' : '') + '/>'
      + '<polygon points="' + p.b + '" fill="' + c + '" opacity=".92"' + (lv ? ' data-tpsandb' : '') + '/>'
      + '<line x1="50" y1="49" x2="50" y2="78" stroke="' + c + '" stroke-width="1.4" opacity=".55"/>'
      + '<path d="M23 13 L77 13 L50 49 L77 85 L23 85 L50 49 Z" fill="none" stroke="#3a3d4a" stroke-width="3" stroke-linejoin="round"/>'
      + '<path d="M20 11 H80 M20 87 H80" stroke="#3a3d4a" stroke-width="5" stroke-linecap="round"/>'
      + '</svg>';
  }
  function timerFace(st, size, col, lab, staticMs, id) {
    var lv = (staticMs == null), txt = lv ? '0:00' : tFmt(staticMs || 0), c = esc(col || '#c9a35e');
    var d = function (n) { return lv ? ' data-' + n : ''; };
    var frac = lv ? 0.72 : 0.66, C = 2 * Math.PI * 42;
    var h = lab ? '<div class="tplab">' + esc(lab) + '</div>' : '';
    if (st === 'analog') {
      h += '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#3a3d4a" stroke-width="3"/>'
        + '<line x1="50" y1="50" x2="50" y2="16" stroke="' + c + '" stroke-width="4" stroke-linecap="round"' + d('tphand') + '/></svg>'
        + '<div class="tpv-sub" style="color:' + c + '"' + d('tpnum') + '>' + esc(txt) + '</div>';
    } else if (st === 'ring') {
      h += '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#2a2d38" stroke-width="7"/>'
        + '<circle cx="50" cy="50" r="42" fill="none" stroke="' + c + '" stroke-width="7" stroke-linecap="round" transform="rotate(-90 50 50)"'
        + ' stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - frac)).toFixed(1) + '"' + d('tpring') + '/></svg>'
        + '<div class="tpv-sub tpv-mid" style="color:' + c + '"' + d('tpnum') + '>' + esc(txt) + '</div>';
    } else if (st === 'sand') {
      h += tSandSVG(c, frac, lv) + '<div class="tpv-sub" style="color:' + c + '"' + d('tpnum') + '>' + esc(txt) + '</div>';
    } else if (st === 'flip') {
      h += '<div class="tpv-flip"' + d('tpflip') + '>' + (lv ? '' : tFlipHTML(txt, c)) + '</div>';
    } else if (st === 'minimal') h += '<div class="tpv-num min" style="color:' + c + '"' + d('tpnum') + '>' + esc(txt) + '</div>';
    else if (st === 'neon') h += '<div class="tpv-num neon" style="color:' + c + '"' + d('tpnum') + '>' + esc(txt) + '</div>';
    else h += '<div class="tpv-num" style="color:' + c + '"' + d('tpnum') + '>' + esc(txt) + '</div>';
    return '<div class="tpv ' + size + '"' + (id ? ' id="' + id + '"' : '') + '>' + h + '</div>';
  }
  /* v2.76: animate the style miniatures with the real timer value + colour.
     Runs on the existing 250ms timer-tab tick; cheap (a handful of nodes). */
  function tickTimerPreviews() {
    var T = timerState; if (!T || !$('#ptTimer .tpv')) return;
    var txt = tDisp(), col = T.color || '#c9a35e';
    /* v2.86: $$ (not $) everywhere — the SAME hooks now live in the style grid AND
       in the big #tdisp face, so every one of them has to be driven. */
    $$('#ptTimer [data-tpnum]').forEach(function (n) { if (n.textContent !== txt) n.textContent = txt; if (n._c !== col) { n._c = col; n.style.color = col; } });
    $$('#ptTimer [data-tpflip]').forEach(function (fl) { var k = txt + '|' + col; if (fl._t === k) return; fl._t = k; fl.innerHTML = tFlipHTML(txt, col); });
    var valMs = (T.type === 'clock' || T.type === 'chess') ? 0 : tVal(T);
    var frac = 0.72;   // idle default: show a mostly-full ring/hourglass so the style reads
    if (T.type === 'down' && T.durationMs > 0) frac = Math.max(0, Math.min(1, valMs / T.durationMs));
    else if (T.type === 'up' && T.targetMs > 0) frac = Math.max(0, Math.min(1, valMs / T.targetMs));
    var C = 2 * Math.PI * 42;
    $$('#ptTimer [data-tpring]').forEach(function (ring) { ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C * (1 - frac); ring.style.stroke = col; });
    var sp = tSandPts(frac);
    $$('#ptTimer [data-tpsandt]').forEach(function (p) { p.setAttribute('points', sp.t); p.setAttribute('fill', col); });
    $$('#ptTimer [data-tpsandb]').forEach(function (p) { p.setAttribute('points', sp.b); p.setAttribute('fill', col); });
    var ang;
    if (T.type === 'clock') { var dd = new Date(); ang = ((dd.getMinutes() + dd.getSeconds() / 60) / 60) * 360; }
    else ang = ((Math.floor(valMs / 1000) % 60) / 60) * 360;
    $$('#ptTimer [data-tphand]').forEach(function (hand) { hand.setAttribute('transform', 'rotate(' + ang + ' 50 50)'); hand.setAttribute('stroke', col); });
  }
  /* v2.86: the single 250ms tab tick. */
  function tickTimer() {
    if (!timerState) return;
    var s = $('#tstate'); if (s) { var lb = tStateLabel(); if (s.textContent !== lb) s.textContent = lb; }
    tickTimerPreviews();
    tickChess();
    tZeroWatch();
  }
  function tickChess() {
    var T = timerState; if (!T || T.type !== 'chess' || !T.chess) return;
    $$('#ptTimer [data-tchms]').forEach(function (n) {
      var i = +n.dataset.tchms, v = tFmt(tChessLive(i));
      if (n.textContent !== v) n.textContent = v;
      var card = n.closest ? n.closest('.tchcard') : null;
      if (card) card.classList.toggle('flag', tChessFlagged(i));
    });
  }
  /* v2.86: the podium moment. Fires once on the 0 crossing of a COUNTDOWN, on the
     tablet only, and never for a chain that is about to roll into the next round
     (that would be a party popper between every set of rounds). Chess flags get the
     quieter red-card treatment in the chess panel instead. */
  function tZeroWatch() {
    var T = timerState;
    if (!T || T.type !== 'down') { tZeroPrev = null; return; }
    var v = tVal(T), prev = tZeroPrev;
    tZeroPrev = v;
    if (prev == null || prev <= 0 || v > 0) return;
    var ch = T.chain, steps = (ch && ch.steps) || [];
    if (ch && ch.active && steps.length && (ch.loop || (ch.idx || 0) < steps.length - 1)) return;
    tPodium();
  }
  function tPodium() {
    if ($('#tpodium')) return;
    var T = timerState || {}, acc = esc(T.color || tAccent()), bits = '';
    for (var i = 0; i < 24; i++) bits += '<i style="left:' + (2 + i * 4.1).toFixed(1) + '%;animation-delay:' + ((i % 8) * 0.11).toFixed(2) + 's;background:' + (i % 3 === 0 ? acc : (i % 3 === 1 ? '#f2e6cf' : '#e8a33d')) + '"></i>';
    var o = D.createElement('div'); o.id = 'tpodium';
    o.innerHTML = '<div class="tpbursts">' + bits + '</div>'
      + '<div class="tppanel" style="--tpa:' + acc + '"><div class="tpbig">' + esc((T.label || 'TIME!').toUpperCase()) + '</div><div class="tpsub">tap anywhere to dismiss</div></div>';
    o.onclick = function () { o.remove(); };
    D.body.appendChild(o);
    setTimeout(function () { if (o.parentNode) o.remove(); }, 6000);
  }
  /* ---- v2.86 sub-builders: swatches / timeline / rounds / chess / presets ---- */
  function tSwatchHTML(cur) {
    var acc = tAccent(), list = [], seen = {};
    list.push([acc, 'Mode accent']); seen[acc.toLowerCase()] = 1;
    TCOLS.forEach(function (c) { if (!seen[c[0].toLowerCase()]) { seen[c[0].toLowerCase()] = 1; list.push(c); } });
    var lc = (cur || '').toLowerCase(), known = !!seen[lc];
    return list.map(function (c, i) {
      return '<button class="tsw' + (lc === c[0].toLowerCase() ? ' on' : '') + (i === 0 ? ' acc' : '') + '" data-tcol="' + esc(c[0]) + '" title="' + esc(c[1]) + '" style="--tswc:' + esc(c[0]) + '"></button>';
    }).join('')
      + '<label class="tsw cust' + (known ? '' : ' on') + '" title="Custom colour" style="--tswc:' + esc(cur || '#c9a35e') + '"><span>＋</span><input type="color" id="tcolor" value="' + esc(cur || '#c9a35e') + '"></label>';
  }
  function tTrigIcon(t) {
    if (t.takeover) return '📺';
    if (t.event === 'lightning') return '⚡';
    if (t.event === 'softflash') return '✷';
    if (t.sfx) return '🔔';
    if (t.visual === 'red') return '🔴';
    if (t.visual === 'amber') return '🟠';
    return '◆';
  }
  function tTrigDesc(t) {
    var p = [];
    if (t.visual) p.push(t.visual);
    if (t.pulse) p.push('pulse');
    if (t.sfx) p.push('🔔 ' + t.sfx);
    if (t.event) p.push(t.event);
    if (t.takeover) p.push('takeover');
    return p.length ? p.join(' · ') : 'nothing yet';
  }
  /* The drama timeline. Right edge = 0, left edge = tSpanMs(). Markers are absolutely
     positioned buttons; wireTimeline() gives them pointer-drag (5s snap) and tap-to-edit.
     data-tix indexes THE ARRAY AS RENDERED — never cached past the next save. */
  function tTimelineHTML() {
    var T = timerState, trg = (T.triggers || []).slice(), span = tSpanMs();
    var zero = null; trg.forEach(function (x) { if ((x.atMs || 0) === 0) zero = x; });
    var h = '<div class="card tspan"><div class="zt">Drama — the countdown timeline</div>'   /* v2.87: spans the grid — dragging markers wants width */
      + '<div class="ttlwrap"><div class="ttl" id="ttl"><div class="ttlbar"></div><div class="ttllive" id="ttllive">0:00</div>'
      + trg.map(function (t, i) {
        var at = Math.max(0, Math.min(span, t.atMs || 0)), pc = 100 * (1 - at / span);
        return '<button class="ttlm' + (t.visual === 'red' ? ' red' : (t.visual === 'amber' ? ' amber' : '')) + '" data-tix="' + i + '" data-tat="' + at + '" style="left:' + pc.toFixed(2) + '%" title="' + esc(tFmt(at) + ' — ' + tTrigDesc(t)) + '"><span class="ic">' + tTrigIcon(t) + '</span><span class="at">' + esc(tFmt(at)) + '</span></button>';
      }).join('')
      + '</div><div class="ttlends"><span>' + esc(tFmt(span)) + '</span><span>0:00</span></div></div>'
      + '<div class="chips" style="margin-top:10px"><button class="chip" id="ttladd">＋ Add trigger</button>'
      + '<button class="chip' + (zero && zero.takeover ? ' on' : '') + '" id="tttake">📺 Take over all screens at 0</button></div>'
      + '<div class="hint" style="margin-top:8px">' + (trg.length ? 'Drag a marker to move it (snaps to 5s) · tap it to edit. ' : 'Nothing set yet. ') + 'Colour/pulse show on the clock frames; sound + wall events fire room-wide, once.</div></div>';
    return h;
  }
  function tSaveTrigs(arr) { postTimer({ set: { triggers: arr.slice(0, 12) } }); }
  /* Rounds = the conductor's chain{}. Every mutation posts the WHOLE step list;
     an empty list sends chain:null (which clears it server-side). */
  function tChainHTML() {
    var ch = timerState.chain || {}, steps = (ch.steps || []).slice();
    var h = '<div class="card"><div class="zt">Rounds — chained timers</div>';
    if (!steps.length) h += '<div class="hint" style="margin-bottom:10px">No rounds yet. Add a few and the timer runs them back to back.</div>';
    h += '<div class="trnds">' + steps.map(function (s, i) {
      return '<div class="trnd' + (ch.active && i === (ch.idx || 0) ? ' cur' : '') + '"><span class="n">' + (i + 1) + '</span>'
        + '<button class="lb" data-trlab="' + i + '">' + esc(s.label || 'Round ' + (i + 1)) + '</button>'
        + '<button class="btn gh sm" data-trdur="' + i + '">' + esc(tFmt(s.durationMs || 0)) + '</button>'
        + '<button class="btn gh sm" data-trup="' + i + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>'
        + '<button class="btn gh sm" data-trdn="' + i + '"' + (i === steps.length - 1 ? ' disabled' : '') + '>↓</button>'
        + '<button class="btn gh sm" data-trdel="' + i + '">✕</button></div>';
    }).join('') + '</div>';
    h += '<div class="chips" style="margin-top:10px"><button class="chip" id="tradd">＋ Add round</button>'
      + '<button class="chip' + (ch.loop ? ' on' : '') + '" id="trloop">🔁 Loop</button>'
      + '<button class="chip' + (ch.autoStart ? ' on' : '') + '" id="trauto">▶ Auto-start next</button>'
      + (ch.active ? '<button class="chip" id="trskip2">Skip →</button>' : '') + '</div></div>';
    return h;
  }
  function tSaveChain(steps, loop, auto) { postTimer({ set: { chain: (steps && steps.length) ? { steps: steps, loop: !!loop, autoStart: !!auto } : null } }); }
  function tChessHTML() {
    var T = timerState, C = T.chess;
    if (!C || !C.players || !C.players.length) {
      var dr = tChessDraft || (tChessDraft = { players: [{ name: 'Player 1', ms: 300000 }, { name: 'Player 2', ms: 300000 }], incrementMs: 0 });
      var BASE = [60000, 180000, 300000, 600000];
      return '<div class="card"><div class="zt">♟ Chess clock — set up</div>'
        + dr.players.map(function (p, i) {
          return '<div class="tchset"><div class="nm">' + esc(p.name) + '</div><div class="chips">'
            + BASE.map(function (ms) { return '<button class="chip' + (p.ms === ms ? ' on' : '') + '" data-tchbase="' + i + '|' + ms + '">' + tFmt(ms) + '</button>'; }).join('')
            + '<button class="chip' + (BASE.indexOf(p.ms) < 0 ? ' on' : '') + '" data-tchcust="' + i + '">⌨ ' + (BASE.indexOf(p.ms) < 0 ? esc(tFmt(p.ms)) : 'Custom') + '</button>'
            + '<button class="chip" data-tchdel="' + i + '">✕</button></div></div>';
        }).join('')
        + '<div class="chips" style="margin-top:8px"><button class="chip" id="tchadd">＋ Add player</button></div>'
        + '<div class="zt" style="margin-top:14px">Increment per move</div><div class="chips">'
        + [0, 2000, 5000, 10000].map(function (ms) { return '<button class="chip' + (dr.incrementMs === ms ? ' on' : '') + '" data-tchinc="' + ms + '">' + (ms ? '+' + (ms / 1000) + 's' : 'None') + '</button>'; }).join('') + '</div>'
        + '<button class="btn p" id="tchstart" style="width:100%;height:48px;margin-top:14px"' + (dr.players.length < 2 ? ' disabled' : '') + '>♟ Start the clocks</button></div>';
    }
    return '<div class="card"><div class="zt">♟ Chess clock</div><div class="tchgrid">'
      + C.players.map(function (p, i) {
        var act = (i === C.turn), fl = tChessFlagged(i);
        return '<button class="tchcard' + (act ? ' act' : '') + (fl ? ' flag' : '') + '" data-tchpass="' + i + '">'
          + '<div class="nm">' + esc(p.name || ('Player ' + (i + 1))) + '</div>'
          + '<div class="ms" data-tchms="' + i + '">' + esc(tFmt(tChessLive(i))) + '</div>'
          + '<div class="cap">' + (fl ? 'flagged' : (act ? (C.running ? 'their move — tap to pass' : 'to move') : '&nbsp;')) + '</div></button>';
      }).join('') + '</div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'
      + '<button class="btn p" id="tchtoggle" style="flex:1;min-width:130px;height:48px;font-size:16px">' + (C.running ? '⏸ Pause' : '▶ Start') + '</button>'
      + '<button class="btn" id="tchreset" style="height:48px">↩ Reset</button>'
      + '<button class="btn gh" id="tchsetup" style="height:48px">⚙ Players</button></div>'
      + '<div class="hint" style="margin-top:8px">Increment ' + (C.incrementMs ? '+' + Math.round(C.incrementMs / 1000) + 's per move' : 'off') + ' · +1:00 / −0:10 don’t apply to chess.</div></div>';
  }
  function tPresetList() { var g = (live.state && live.state.game) || null; return (tPresets || []).filter(function (p) { return !p.mode || p.mode === g; }); }
  function tCurCfg() {
    var T = timerState, ch = T.chain, cc = T.chess;
    return {
      type: T.type, durationMs: T.durationMs, targetMs: T.targetMs, style: T.style, color: T.color, label: T.label, h24: T.h24,
      bg: { type: (T.bg && T.bg.type) || 'none', key: (T.bg && T.bg.key) || '' },
      triggers: (T.triggers || []).slice(),
      chain: (ch && ch.steps && ch.steps.length) ? { steps: ch.steps.slice(), loop: !!ch.loop, autoStart: !!ch.autoStart } : null,
      chess: (cc && cc.players && cc.players.length) ? { players: cc.players.map(function (p) { return { name: p.name, ms: (p.baseMs != null ? p.baseMs : p.ms) }; }), incrementMs: cc.incrementMs || 0 } : null,
      advancePhase: T.advancePhase
    };
  }
  function tAskScope(title, cb) {
    var g = (live.state && live.state.game) || null, gn = g ? ((profiles[g] || {}).name || g) : '';
    askOpen('<div style="font-family:Georgia,serif;font-size:17px;margin-bottom:6px">' + esc(title) + '</div>'
      + '<div class="hint" style="margin-bottom:14px">Where should this preset show up?</div>'
      + '<div style="display:flex;gap:10px"><button class="btn" id="tscg" style="flex:1;min-height:48px">🌐 All modes</button>'
      + '<button class="btn p" id="tscm" style="flex:1;min-height:48px"' + (g ? '' : ' disabled') + '>🎭 ' + esc(gn || 'no live mode') + '</button></div>');
    $('#tscg').onclick = function () { askDismiss(); cb(null); };
    $('#tscm').onclick = function () { if (!g) return; askDismiss(); cb(g); };
  }
  function tSavePreset(id, name, mode) {
    post('/api/timer/presets', { preset: { id: id || undefined, name: name, mode: mode || null, cfg: tCurCfg() } })
      .then(function (r) { if (r && r.presets) tPresets = r.presets; renderTimer(); toast('Preset “' + name + '” saved'); })
      .catch(function (e) { toast('Preset save failed — ' + e.message); });
  }
  /* ---- v2.86 sound picker (/api/sounds), cached after the first fetch ---- */
  function tOpenSounds(cur, cb) {
    function draw() {
      var groups = {}, order = [];
      (tSounds || []).forEach(function (p) { var i = p.indexOf('/'), g = i > 0 ? p.slice(0, i) : 'sounds'; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(p); });
      var h = '<div class="shead"><h2>Sound</h2><div class="sp"></div><button class="btn gh" id="tsclose">Close</button></div><div class="sbody">'
        + '<div class="tsndrow' + (!cur ? ' on' : '') + '" data-tsnd=""><span class="nm">— None —</span></div>'
        + '<div class="tsndrow' + (cur === 'buzzer' ? ' on' : '') + '" data-tsnd="buzzer"><span class="nm">🔔 Buzzer (built-in)</span></div>';
      order.sort().forEach(function (g) {
        h += '<div class="zt" style="margin:16px 0 6px">' + esc(g) + '</div>'
          + groups[g].map(function (p) {
            return '<div class="tsndrow' + (cur === p ? ' on' : '') + '" data-tsnd="' + esc(p) + '"><span class="nm">' + esc(p.slice(p.indexOf('/') + 1)) + '</span><button class="btn gh sm" data-tsprev="' + esc(p) + '">▶</button></div>';
          }).join('');
      });
      if (!(tSounds || []).length) h += '<div class="hint" style="margin-top:14px">No files under /sounds yet.</div>';
      openSheet(h + '</div>');
      $('#tsclose').onclick = function () { tStopPreview(); closeSheet(); };
      $$('#sheet [data-tsnd]').forEach(function (r) {
        r.onclick = function (e) { if (e.target.closest('[data-tsprev]')) return; tStopPreview(); closeSheet(); cb(r.dataset.tsnd || null); };
      });
      $$('#sheet [data-tsprev]').forEach(function (b) {
        b.onclick = function (e) { e.stopPropagation(); tStopPreview(); try { tAudio = new Audio('/sounds/' + b.dataset.tsprev); tAudio.play(); } catch (x) { toast('Can’t preview that one'); } };
      });
    }
    if (tSounds) return draw();
    openSheet('<div class="shead"><h2>Sound</h2></div><div class="sbody"><div class="hint">Loading sounds…</div></div>');
    api('/api/sounds').then(function (j) { tSounds = (j && j.sounds) || []; draw(); }).catch(function () { tSounds = []; draw(); });
  }
  function tStopPreview() { if (tAudio) { try { tAudio.pause(); } catch (x) {} tAudio = null; } }
  /* ---- v2.86 per-trigger editor. Edits a LOCAL copy and only posts on Done/Delete,
     so the server's re-sort can never scramble the index mid-edit. ---- */
  function tTrigEdit(ix) {
    var arr = (timerState.triggers || []).map(function (x) { return Object.assign({}, x); });
    var t = arr[ix]; if (!t) return;
    var span = tSpanMs();
    function draw() {
      var h = '<div class="shead"><h2>Trigger at ' + esc(tFmt(t.atMs || 0)) + '</h2><div class="sp"></div><button class="btn gh" id="teclose">Cancel</button></div><div class="sbody">'
        + '<div class="zt">When</div><div class="tchips"><button class="btn" id="tenm">− 5s</button><span style="font:700 20px/1 ui-monospace,monospace;padding:0 8px" id="teat">' + esc(tFmt(t.atMs || 0)) + '</span><button class="btn" id="tenp">＋ 5s</button><button class="btn gh sm" id="tezero">At 0</button></div>'
        + '<div class="zt" style="margin-top:16px">Clock colour</div><div class="tchips">'
        + [['', 'None'], ['amber', '🟠 Amber'], ['red', '🔴 Red']].map(function (v) { return '<button class="chip' + ((t.visual || '') === v[0] ? ' on' : '') + '" data-tev="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>'
        + '<div class="zt" style="margin-top:16px">Pulse</div><div class="tchips"><button class="chip' + (t.pulse ? ' on' : '') + '" id="tepulse">' + (t.pulse ? '✓ Pulsing' : 'Off') + '</button></div>'
        + '<div class="zt" style="margin-top:16px">Sound</div><div class="tchips"><button class="btn" id="tesfx" style="max-width:100%;overflow:hidden;text-overflow:ellipsis">🔔 ' + esc(t.sfx || 'None') + '</button>' + (t.sfx && t.sfx !== 'buzzer' ? '<button class="btn gh sm" id="tesfxp">▶</button>' : '') + '</div>'
        + '<div class="zt" style="margin-top:16px">Wall event</div><div class="tchips">'
        + [['', 'None'], ['lightning', '⚡ Lightning'], ['softflash', '✷ Soft flash']].map(function (v) { return '<button class="chip' + ((t.event || '') === v[0] ? ' on' : '') + '" data-tee="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>'
        + '<div class="zt" style="margin-top:16px">Takeover</div><div class="tchips"><button class="chip' + (t.takeover ? ' on' : '') + '" id="tetake">' + (t.takeover ? '✓ Takes over every screen' : 'Clock frames only') + '</button></div>'
        + '<div style="display:flex;gap:10px;margin-top:22px"><button class="btn dg" id="tedel" style="min-height:46px">🗑 Delete</button><button class="btn p" id="tedone" style="flex:1;min-height:46px">Done</button></div>'
        + '</div>';
      openSheet(h);
      $('#teclose').onclick = closeSheet;
      function at(v) { t.atMs = Math.max(0, Math.min(span, Math.round(v / 5000) * 5000)); draw(); }
      $('#tenm').onclick = function () { at((t.atMs || 0) - 5000); };
      $('#tenp').onclick = function () { at((t.atMs || 0) + 5000); };
      $('#tezero').onclick = function () { at(0); };
      $$('#sheet [data-tev]').forEach(function (b) { b.onclick = function () { t.visual = b.dataset.tev || null; draw(); }; });
      $$('#sheet [data-tee]').forEach(function (b) { b.onclick = function () { t.event = b.dataset.tee || null; draw(); }; });
      $('#tepulse').onclick = function () { t.pulse = !t.pulse; draw(); };
      $('#tetake').onclick = function () { t.takeover = !t.takeover; draw(); };
      $('#tesfx').onclick = function () { tOpenSounds(t.sfx || null, function (v) { t.sfx = v || null; draw(); }); };
      var pv = $('#tesfxp'); if (pv) pv.onclick = function () { tStopPreview(); try { tAudio = new Audio('/sounds/' + t.sfx); tAudio.play(); } catch (x) {} };
      $('#tedel').onclick = function () { closeSheet(); arr.splice(ix, 1); tSaveTrigs(arr); toast('Trigger removed'); };
      $('#tedone').onclick = function () { closeSheet(); tSaveTrigs(arr); };
    }
    draw();
  }
  function renderTimer() {
    var el = $('#ptTimer'); if (!el) return;
    if (!timerState) { el.innerHTML = '<div class="hint" style="text-align:center;padding:30px">Loading timer…</div>'; api('/api/timer').then(function (r) { tStore(r); renderTimer(); }); return; }
    /* v2.86: the tab is much taller now and every control posts + re-renders, so
       hold the scroll position of whatever is actually scrolling around us. */
    var sc = el.parentNode, sy = 0;
    while (sc && sc.nodeType === 1 && sc.scrollHeight <= sc.clientHeight + 2) sc = sc.parentNode;
    if (sc && sc.nodeType === 1) sy = sc.scrollTop || 0; else sc = null;
    var T = timerState, STYLES = TSTYLES;
    var PRE = [30, 60, 180, 300, 600];
    var isCd = (T.type === 'down' || T.type === 'up');
    var col = T.color || '#c9a35e';
    var h = '';
    /* -- the STAGE: face + transport together (v2.87) ------------------------
       Previously the face sat alone in a full-width card with the transport in
       another full-width card below — on a desktop that read as two stretched
       bars around a small ring. They are one hero now: face left, controls right,
       stacking on narrow screens. */
    var ch = T.chain || null, chSteps = (ch && ch.steps) || [];
    h += '<div class="card tbigcard"><div class="therof">'
      + timerFace(T.style || 'digital', 'big', col, T.label || '', null, 'tdisp')
      + '<div class="hint" id="tstate" style="margin-top:6px;letter-spacing:1px">' + esc(tStateLabel()) + '</div>'
      + (ch && ch.active && chSteps.length
        ? '<div class="tchain"><span class="rd">Round ' + (((ch.idx || 0) + 1)) + ' of ' + chSteps.length + '</span>'
          + (chSteps[ch.idx || 0] && chSteps[ch.idx || 0].label ? '<span class="lb">' + esc(chSteps[ch.idx || 0].label) + '</span>' : '')
          + '<button class="btn gh sm" id="tskip">Skip →</button></div>' : '')
      + '</div>'
      + (T.type !== 'chess'
        ? '<div class="therot">'
          + '<button class="btn p" id="tstart">' + (T.type === 'clock' ? '▶ Show clock' : (T.running ? '⏸ Pause' : '▶ Start')) + '</button>'
          + (isCd ? '<div class="therow"><button class="btn" id="treset">↩ Reset</button><button class="btn" data-tadd="60000">+1:00</button><button class="btn" data-tadd="-10000">−0:10</button></div>' : '')
          + '</div>' : '')
      + '</div>';
    /* v2.87: the drama timeline goes directly under the stage, full width —
       dragging markers wants horizontal room, and it is the most-used control. */
    if (isCd) h += tTimelineHTML();
    /* v2.87: everything below flows into MASONRY COLUMNS (.tcols). A CSS grid
       aligned rows, so a tall card (Style) left a column of dead space beside
       every short one — exactly the "gappy" complaint. Columns pack by height. */
    h += '<div class="tcols">';
    /* -- presets (a normal card now — it was a near-empty full-width band) ---- */
    var pl = tPresetList();
    h += '<div class="card"><div class="zt">Presets</div><div class="tpres">'
      + pl.map(function (p) {
        var cfg = p.cfg || {};
        return '<button class="tpretile" data-tpid="' + esc(p.id) + '">' + timerFace(cfg.style || 'digital', 'tiny', cfg.color || '#c9a35e', '', cfg.durationMs || 0)
          + '<div class="nm">' + esc(p.name || 'Preset') + '</div><div class="ds">' + esc(tFmt(cfg.durationMs || 0)) + (p.mode ? ' · this mode' : '') + '</div></button>';
      }).join('')
      + '<button class="tpretile add" id="tpresave"><div class="pl">＋</div><div class="nm">Save current…</div></button></div>'
      + '<div class="hint" style="margin-top:8px">Tap to apply · hold for rename / update / delete</div></div>';
    /* -- counter type -------------------------------------------------------- */
    h += '<div class="card"><div class="zt">Counter</div><div class="chips">' + [['down', 'Countdown'], ['up', 'Count up'], ['clock', 'Time of day'], ['chess', '♟ Chess']].map(function (v) { return '<button class="chip' + (T.type === v[0] ? ' on' : '') + '" data-ttype="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>'
      + (isCd ? ('<div class="zt" style="margin-top:12px">' + (T.type === 'down' ? 'Start value' : 'Target (optional)') + '</div><div class="chips">' + PRE.map(function (s) { return '<button class="chip' + (((T.type === 'down' ? T.durationMs : T.targetMs) === s * 1000) ? ' on' : '') + '" data-tpre="' + (s * 1000) + '">' + tFmt(s * 1000) + '</button>'; }).join('') + '<button class="chip" data-tcustom>⌨ Type…</button></div>') : '') + '</div>';
    /* -- transport moved INTO the stage above (v2.87); chess keeps its own --- */
    if (T.type === 'chess') h += tChessHTML();
    /* -- rounds (chained timers) --------------------------------------------- */
    if (isCd) h += tChainHTML();
    /* v2.76: style picker = live animated miniatures of the real TV rendering
       (fx.js clockPanel structures, shrunk). The 250ms tab tick drives them with
       the ACTUAL current timer value in the chosen colour — what you see is what
       the wall gets. v2.86: built by the shared timerFace(), + the 'sand' hourglass. */
    h += '<div class="card"><div class="zt">Style</div><div class="tstyles">' + STYLES.map(function (s) {
      return '<button class="tprev' + (T.style === s[0] ? ' on' : '') + '" data-tstyle="' + s[0] + '">' + timerFace(s[0], 'mini', col, T.label || '', null) + '<div class="tpn">' + s[1] + '</div></button>';
    }).join('') + '</div>'
      /* v2.86: colour is a swatch row (live mode accent first) — the raw picker
         survives as the last "＋ custom" swatch so nothing is lost. */
      + '<div class="zt" style="margin-top:14px">Colour</div><div class="tsws">' + tSwatchHTML(col) + '</div>'
      + '<label class="fld" style="margin-top:12px"><span>Label</span><input type="text" id="tlabel" maxlength="40" value="' + esc(T.label || '') + '" placeholder="YOUR TURN"></label>'
      + (T.type === 'clock' ? '<label class="chk"><input type="checkbox" id="th24" ' + (T.h24 ? 'checked' : '') + '> 24-hour clock</label>' : '') + '</div>';
    var bt = (T.bg && T.bg.type) || 'none';
    var bgThumbUrl = (bt !== 'none' && T.bg && T.bg.key) ? sceneThumb(T.bg.key) : '';
    h += '<div class="card"><div class="zt">Background</div><div style="display:flex;gap:10px;align-items:center">'
      + '<div class="tbgthumb"' + (bgThumbUrl ? ' style="background-image:url(\'' + bgThumbUrl.replace(/'/g, '%27') + '\')"' : '') + '>' + (bgThumbUrl ? '' : '') + '</div>'
      + '<button class="btn" id="tbg" style="flex:1;text-align:left">🖼 ' + (bt === 'none' ? 'None (dark)' : (bt === 'video' ? '▶ ' : '') + esc(niceName(T.bg.key || ''))) + '</button><button class="btn gh" id="tbgclear">Clear</button></div></div>';
    /* v2.76: "Show on" = a little wall map instead of text chips — mirrors the
       Design canvas mental model. Auto mode dims the map (the mode decides). */
    h += '<div class="card"><div class="zt">Show on</div>'
      + '<div class="chips" style="margin-bottom:10px"><button class="chip' + (!T.frames ? ' on' : '') + '" data-tframe="">✨ Mode’s clock frames</button></div>'
      + '<div class="twmap">' + Object.keys(layout.walls).map(function (wk) {
        return '<div class="twgrp"><div class="twlab">' + (wk === 'L' ? 'Left wall' : wk === 'R' ? 'Right wall' : esc(wk)) + '</div><div class="twrow">'
          + layout.walls[wk].map(function (fr) { var on = T.frames && T.frames.indexOf(fr) >= 0; return '<button class="twfr' + (on ? ' on' : '') + (!T.frames ? ' auto' : '') + '" data-tframe="' + fr + '" title="' + fr + '">' + fr + '</button>'; }).join('')
          + '</div></div>';
      }).join('') + '</div>'
      + '<label class="chk" style="margin-top:10px"><input type="checkbox" id="tadv" ' + (T.advancePhase ? 'checked' : '') + '> Advance to next phase when it reaches 0</label>'
      + '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn gh sm" id="tloadmode">↓ Load mode default</button><button class="btn gh sm" id="tsavemode">↑ Save as mode default</button></div></div>';
    h += '</div>';   /* v2.87: close .tcols */
    el.innerHTML = h; wireTimer(); tickTimerPreviews(); tickChess();   /* v2.76: previews live immediately, not after first tick */
    if (sc && sy) sc.scrollTop = sy;
  }
  function wireTimer() {
    $$('#ptTimer [data-ttype]').forEach(function (b) { b.onclick = function () { postTimer({ set: { type: b.dataset.ttype } }); }; });
    $$('#ptTimer [data-tpre]').forEach(function (b) { b.onclick = function () { var ms = +b.dataset.tpre; postTimer({ set: timerState.type === 'down' ? { durationMs: ms } : { targetMs: ms } }); }; });
    var cu = $('#ptTimer [data-tcustom]'); if (cu) cu.onclick = function () { askText('Custom time', 'm:ss or seconds', '5:00', function (v) { var ms = tParseMs(v); if (ms > 0) postTimer({ set: timerState.type === 'down' ? { durationMs: ms } : { targetMs: ms } }); }); };   /* v2.54: in-app dialog */
    var st = $('#tstart'); if (st) st.onclick = function () { if (timerState.type === 'clock') { postTimer({ action: 'start' }, false); toast('Clock on the wall'); return; } postTimer({ action: 'toggle' }, false); };
    var rs = $('#treset'); if (rs) rs.onclick = function () { postTimer({ action: 'reset' }); };
    $$('#ptTimer [data-tadd]').forEach(function (b) { b.onclick = function () { postTimer({ add: +b.dataset.tadd }, false); }; });
    $$('#ptTimer [data-tstyle]').forEach(function (b) { b.onclick = function () { postTimer({ set: { style: b.dataset.tstyle } }); }; });
    /* v2.86: swatch row + the custom picker share ONE debounced write path. The
       optimistic timerState.color assignment makes every miniature (and the big
       face) recolour on the next 250ms tick, before the POST lands. */
    function tSetColor(v, instant) {
      timerState.color = v; tickTimerPreviews();
      var known = false;
      $$('#ptTimer .tsw[data-tcol]').forEach(function (s) { var m = (s.dataset.tcol || '').toLowerCase() === v.toLowerCase(); s.classList.toggle('on', m); if (m) known = true; });
      var cs = $('#ptTimer .tsw.cust'); if (cs) { cs.style.setProperty('--tswc', v); cs.classList.toggle('on', !known); }
      clearTimeout(wireTimer._c); wireTimer._c = setTimeout(function () { postTimer({ set: { color: v } }, false); }, instant ? 0 : 200);
    }
    $$('#ptTimer [data-tcol]').forEach(function (b) { b.onclick = function () { tSetColor(b.dataset.tcol, true); }; });
    var tc = $('#tcolor'); if (tc) tc.oninput = function () { tSetColor(tc.value, false); };
    var tl = $('#tlabel'); if (tl) tl.oninput = function () { clearTimeout(tl._t); tl._t = setTimeout(function () { postTimer({ set: { label: tl.value } }, false); }, 400); };
    var h24 = $('#th24'); if (h24) h24.onchange = function () { postTimer({ set: { h24: h24.checked } }); };
    var bg = $('#tbg'); if (bg) bg.onclick = function () { openScenePicker(false, function (k) { var sc = (scenes || []).find(function (s) { return s.key === k; }); postTimer({ set: { bg: { type: (sc && sc.video) ? 'video' : 'image', key: k } } }); }); };
    var bgc = $('#tbgclear'); if (bgc) bgc.onclick = function () { postTimer({ set: { bg: { type: 'none', key: '' } } }); };
    wireTimeline(); wireChain(); wireChess(); wirePresets();
    var sk = $('#tskip'); if (sk) sk.onclick = function () { postTimer({ action: 'skip' }); };
    $$('#ptTimer [data-tframe]').forEach(function (b) { b.onclick = function () { var v = b.dataset.tframe, fr = (timerState.frames || []).slice(); if (!v) { fr = null; } else { var ix = fr.indexOf(v); if (ix >= 0) fr.splice(ix, 1); else fr.push(v); if (!fr.length) fr = null; } postTimer({ set: { frames: fr } }); }; });
    var adv = $('#tadv'); if (adv) adv.onchange = function () { postTimer({ set: { advancePhase: adv.checked } }, false); };
    var lm = $('#tloadmode'); if (lm) lm.onclick = function () { var g = (live.state && live.state.game), cfg = g && profiles[g] && profiles[g].timer; if (!cfg) return toast('No saved timer for this mode'); postTimer({ set: cfg }); toast('Loaded ' + ((profiles[g] || {}).name || g) + ' timer'); };
    var sm = $('#tsavemode'); if (sm) sm.onclick = function () { var g = (live.state && live.state.game); if (!g || !profiles[g]) return toast('No live mode to save to'); var T = timerState, cfg = { type: T.type, durationMs: T.durationMs, targetMs: T.targetMs, style: T.style, color: T.color, label: T.label, h24: T.h24, bg: { type: (T.bg && T.bg.type) || 'none', key: (T.bg && T.bg.key) || '' }, triggers: T.triggers, advancePhase: T.advancePhase }; api('/api/profiles').then(function (pr) { pr.profiles[g].timer = cfg; return post('/api/profiles', { profiles: pr.profiles, tagmap: pr.tagmap, settings: pr.settings }); }).then(function () { profiles[g].timer = cfg; toast('Saved timer to ' + ((profiles[g] || {}).name || g)); }); };
  }
  /* v2.86: one "5:00" / "300" / "1:02:30" parser for every time prompt in the tab. */
  function tParseMs(v) {
    v = ('' + (v || '')).trim();
    if (v.indexOf(':') >= 0) { var p = v.split(':'); if (p.length >= 3) return (((+p[0] || 0) * 3600) + ((+p[1] || 0) * 60) + (+p[2] || 0)) * 1000; return ((+p[0] || 0) * 60 + (+p[1] || 0)) * 1000; }
    return (+v || 0) * 1000;
  }
  /* ---- v2.86: the drama TIMELINE. Markers are pointer-dragged (mouse AND touch —
     .ttlm sets touch-action:none so the page doesn't steal the gesture) with a 5s
     snap and a live time label; a drag under 5px counts as a TAP and opens the
     per-trigger editor instead. The editor also carries −5s/＋5s nudges, so the
     feature is fully usable if a drag ever feels fiddly on a given tablet. ---- */
  function wireTimeline() {
    var bar = $('#ttl'); if (!bar) return;
    var span = tSpanMs(), lbl = $('#ttllive');
    $$('#ttl .ttlm').forEach(function (m) {
      var pid = null, moved = false, x0 = 0, at0 = 0;
      m.addEventListener('pointerdown', function (e) {
        pid = e.pointerId; moved = false; x0 = e.clientX; at0 = +m.dataset.tat || 0;
        m.classList.add('drag'); try { m.setPointerCapture(pid); } catch (x) {}
        e.preventDefault();
      });
      m.addEventListener('pointermove', function (e) {
        if (pid == null || e.pointerId !== pid) return;
        var dx = e.clientX - x0; if (!moved && Math.abs(dx) < 5) return;
        moved = true;
        var w = bar.clientWidth || 1;
        var at = Math.max(0, Math.min(span, Math.round((at0 - dx / w * span) / 5000) * 5000));
        m.dataset.tat = at;
        var pc = (100 * (1 - at / span)).toFixed(2) + '%';
        m.style.left = pc;
        var a = m.querySelector('.at'); if (a) a.textContent = tFmt(at);
        if (lbl) { lbl.textContent = tFmt(at); lbl.style.left = pc; lbl.classList.add('on'); }
      });
      function end() {
        if (pid == null) return; pid = null;
        m.classList.remove('drag'); if (lbl) lbl.classList.remove('on');
        var ix = +m.dataset.tix;
        if (!moved) return tTrigEdit(ix);
        var arr = (timerState.triggers || []).map(function (x) { return Object.assign({}, x); });
        if (arr[ix]) { arr[ix].atMs = +m.dataset.tat || 0; tSaveTrigs(arr); }
      }
      m.addEventListener('pointerup', end);
      m.addEventListener('pointercancel', end);
    });
    var add = $('#ttladd');
    if (add) add.onclick = function () {
      var arr = (timerState.triggers || []).map(function (x) { return Object.assign({}, x); });
      if (arr.length >= 12) return toast('12 triggers is the limit');
      var used = arr.map(function (x) { return x.atMs || 0; }), at = null;
      var cands = [span * 0.5, span * 0.25, 60000, 30000, 10000, 0, span * 0.75, span * 0.1];
      for (var i = 0; i < cands.length && at === null; i++) {
        var c = Math.max(0, Math.min(span, Math.round(cands[i] / 5000) * 5000));
        var clash = used.some(function (u) { return Math.abs(u - c) < 5000; });
        if (!clash) at = c;
      }
      if (at === null) at = Math.max(0, Math.min(span, Math.round(Math.random() * span / 5000) * 5000));
      arr.push({ atMs: at, visual: 'amber' });
      tSaveTrigs(arr); toast('Trigger at ' + tFmt(at) + ' — tap it to set the drama');
    };
    var tk = $('#tttake');
    if (tk) tk.onclick = function () {
      var arr = (timerState.triggers || []).map(function (x) { return Object.assign({}, x); }), z = null;
      arr.forEach(function (x) { if ((x.atMs || 0) === 0) z = x; });
      if (z) { z.takeover = !z.takeover; if (!z.takeover && !z.visual && !z.sfx && !z.event && !z.pulse) arr.splice(arr.indexOf(z), 1); }
      else { if (arr.length >= 12) return toast('12 triggers is the limit'); arr.push({ atMs: 0, takeover: true }); }
      tSaveTrigs(arr);
    };
  }
  function wireChain() {
    var ch = timerState.chain || {}, steps = (ch.steps || []).map(function (s) { return { durationMs: s.durationMs || 0, label: s.label || '' }; });
    function save(st) { tSaveChain(st, ch.loop, ch.autoStart); }
    $$('#ptTimer [data-trdel]').forEach(function (b) { b.onclick = function () { steps.splice(+b.dataset.trdel, 1); save(steps); }; });
    $$('#ptTimer [data-trup]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.trup; if (i <= 0) return; var t = steps[i - 1]; steps[i - 1] = steps[i]; steps[i] = t; save(steps); }; });
    $$('#ptTimer [data-trdn]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.trdn; if (i >= steps.length - 1) return; var t = steps[i + 1]; steps[i + 1] = steps[i]; steps[i] = t; save(steps); }; });
    $$('#ptTimer [data-trlab]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.trlab; askText('Round name', 'e.g. Bidding', steps[i].label || '', function (v) { steps[i].label = v; save(steps); }); }; });
    $$('#ptTimer [data-trdur]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.trdur; askText('Round length', 'm:ss or seconds', tFmt(steps[i].durationMs), function (v) { var ms = tParseMs(v); if (ms > 0) { steps[i].durationMs = ms; save(steps); } }); }; });
    var ad = $('#tradd'); if (ad) ad.onclick = function () { askText('Round length', 'm:ss or seconds', tFmt(steps.length ? steps[steps.length - 1].durationMs : (timerState.durationMs || 300000)), function (v) { var ms = tParseMs(v); if (ms > 0) { steps.push({ durationMs: ms, label: '' }); save(steps); } }); };
    var lp = $('#trloop'); if (lp) lp.onclick = function () { if (!steps.length) return toast('Add a round first'); tSaveChain(steps, !ch.loop, ch.autoStart); };
    var au = $('#trauto'); if (au) au.onclick = function () { if (!steps.length) return toast('Add a round first'); tSaveChain(steps, ch.loop, !ch.autoStart); };
    var sk = $('#trskip2'); if (sk) sk.onclick = function () { postTimer({ action: 'skip' }); };
  }
  function wireChess() {
    if (!timerState || timerState.type !== 'chess') return;
    var dr = tChessDraft || { players: [], incrementMs: 0 };
    $$('#ptTimer [data-tchbase]').forEach(function (b) { b.onclick = function () { var p = b.dataset.tchbase.split('|'); dr.players[+p[0]].ms = +p[1]; renderTimer(); }; });
    $$('#ptTimer [data-tchcust]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.tchcust; askText('Starting time', 'm:ss or seconds', tFmt(dr.players[i].ms), function (v) { var ms = tParseMs(v); if (ms > 0) { dr.players[i].ms = ms; renderTimer(); } }); }; });
    $$('#ptTimer [data-tchdel]').forEach(function (b) { b.onclick = function () { if (dr.players.length <= 1) return toast('You need at least one player'); dr.players.splice(+b.dataset.tchdel, 1); renderTimer(); }; });
    $$('#ptTimer [data-tchinc]').forEach(function (b) { b.onclick = function () { dr.incrementMs = +b.dataset.tchinc; renderTimer(); }; });
    var ad = $('#tchadd'); if (ad) ad.onclick = tAddChessPlayer;
    var go = $('#tchstart'); if (go) go.onclick = function () { postTimer({ set: { chess: { players: dr.players.map(function (p) { return { name: p.name, ms: p.ms }; }), incrementMs: dr.incrementMs || 0 } } }); };
    /* live panel */
    $$('#ptTimer [data-tchpass]').forEach(function (b) {
      b.onclick = function () {
        var C = timerState.chess; if (!C) return;
        var i = +b.dataset.tchpass;
        if (i !== C.turn) return toast('It’s ' + ((C.players[C.turn] || {}).name || 'the other player') + '’s move');
        if (!C.running) return toast('Press ▶ Start first');
        postTimer({ action: 'pass' });
      };
    });
    var tg = $('#tchtoggle'); if (tg) tg.onclick = function () { postTimer({ action: 'toggle' }); };
    var rs2 = $('#tchreset'); if (rs2) rs2.onclick = function () { postTimer({ action: 'reset' }); };
    var su = $('#tchsetup'); if (su) su.onclick = function () {
      var C = timerState.chess || { players: [] };
      tChessDraft = { players: (C.players || []).map(function (p) { return { name: p.name, ms: (p.baseMs != null ? p.baseMs : p.ms) }; }), incrementMs: C.incrementMs || 0 };
      postTimer({ set: { chess: null } });
    };
  }
  function tAddChessPlayer() {
    var dr = tChessDraft; if (!dr) return;
    function pick(list) {
      var used = {}; dr.players.forEach(function (p) { used[p.name] = 1; });
      var opts = (list || []).filter(function (p) { return p && p.name && !used[p.name]; });
      openSheet('<div class="shead"><h2>Add player</h2><div class="sp"></div><button class="btn gh" id="tpxclose">Close</button></div><div class="sbody"><div class="tchips">'
        + opts.map(function (p) { return '<button class="chip" data-tpname="' + esc(p.name) + '">' + esc(p.name) + '</button>'; }).join('')
        + '<button class="chip" id="tpxtype">⌨ Type a name…</button></div>'
        + (opts.length ? '' : '<div class="hint" style="margin-top:10px">No one left in the Scores people list.</div>') + '</div>');
      $('#tpxclose').onclick = closeSheet;
      function addP(n) { dr.players.push({ name: n, ms: (dr.players[0] && dr.players[0].ms) || 300000 }); renderTimer(); }
      $$('#sheet [data-tpname]').forEach(function (b) { b.onclick = function () { closeSheet(); addP(b.dataset.tpname); }; });
      $('#tpxtype').onclick = function () { closeSheet(); askText('Player name', 'Name', '', addP); };
    }
    if (tPeople) return pick(tPeople);
    api('/api/scores').then(function (d) { tPeople = (d && d.players) || []; pick(tPeople); }).catch(function () { tPeople = []; pick([]); });
  }
  function wirePresets() {
    /* v2.44/v2.54 long-press pattern: 600ms hold opens the context sheet and swallows
       the click that follows. */
    $$('#ptTimer [data-tpid]').forEach(function (b) {
      b.addEventListener('pointerdown', function () { b._lpDone = false; clearTimeout(b._lp); b._lp = setTimeout(function () { b._lpDone = true; tPresetMenu(b.dataset.tpid); }, 600); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, function () { clearTimeout(b._lp); }, { passive: true }); });
      b.onclick = function () { if (b._lpDone) { b._lpDone = false; return; } postTimer({ preset: b.dataset.tpid }); };
    });
    var sv = $('#tpresave');
    if (sv) sv.onclick = function () {
      askText('Name this preset', 'e.g. Speed round', timerState.label || '', function (nm) {
        tAskScope('“' + nm + '”', function (mode) { tSavePreset(null, nm, mode); });
      });
    };
  }
  function tPresetMenu(id) {
    var p = (tPresets || []).find(function (x) { return x.id === id; }); if (!p) return;
    openSheet('<div class="shead"><h2>' + esc(p.name || 'Preset') + '</h2><div class="sp"></div><button class="btn gh" id="tpmclose">Close</button></div><div class="sbody">'
      + '<div class="hint" style="margin-bottom:14px">' + esc(tFmt((p.cfg || {}).durationMs || 0)) + ' · ' + esc((p.cfg || {}).style || 'digital') + ' · ' + (p.mode ? esc((profiles[p.mode] || {}).name || p.mode) + ' only' : 'all modes') + '</div>'
      + '<button class="btn" id="tpmren" style="width:100%;min-height:48px;margin-bottom:10px;text-align:left">✎ Rename</button>'
      + '<button class="btn" id="tpmupd" style="width:100%;min-height:48px;margin-bottom:10px;text-align:left">↑ Save the current timer into this preset</button>'
      + '<button class="btn dg" id="tpmdel" style="width:100%;min-height:48px;text-align:left">🗑 Delete</button></div>');
    $('#tpmclose').onclick = closeSheet;
    $('#tpmren').onclick = function () {
      closeSheet();
      askText('Rename preset', 'Name', p.name || '', function (v) {
        post('/api/timer/presets', { preset: { id: p.id, name: v, mode: p.mode || null, cfg: p.cfg } })
          .then(function (r) { if (r && r.presets) tPresets = r.presets; renderTimer(); toast('Renamed'); })
          .catch(function (e) { toast('Rename failed — ' + e.message); });
      });
    };
    $('#tpmupd').onclick = function () { closeSheet(); tSavePreset(p.id, p.name, p.mode || null); };
    $('#tpmdel').onclick = function () {
      closeSheet();
      askConfirm('Delete “' + (p.name || 'preset') + '”?', 'The preset disappears from every mode. The live timer is untouched.', 'Delete', function () {
        post('/api/timer/presets', { delete: p.id })
          .then(function (r) { if (r && r.presets) tPresets = r.presets; renderTimer(); toast('Preset deleted'); })
          .catch(function (e) { toast('Delete failed — ' + e.message); });
      }, true);
    };
  }

  /* ---- 🏆 Scores (v2.29) — live scoring + people + hall of fame (/api/scores*) ---- */
  var scDoc = null, scLive = null;
  function scAvatar(p, size, i) {
    var PAL = ['#c9a35e', '#5ec8c8', '#73c990', '#e0655f', '#b46cc9', '#e0b04a'];
    var col = (p && p.color) || PAL[(i || 0) % PAL.length];
    if (p && p.photo) return '<span style="display:inline-block;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:url(\'' + p.photo.replace(/'/g, '%27') + '\') center/cover;flex:none;box-shadow:0 0 0 2px ' + col + '"></span>';
    return '<span style="display:inline-flex;align-items:center;justify-content:center;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + col + ';color:#14151a;font:700 ' + Math.round(size * 0.44) + 'px sans-serif;flex:none">' + ((p && p.name) || '?').charAt(0).toUpperCase() + '</span>';
  }
  function scAutoTitles() {
    var out = {};   // name -> [titles]
    if (!scDoc) return out;
    var res = (scDoc.results || []).slice().sort(function (a, b) { return a.dateISO < b.dateISO ? -1 : 1; });
    var wins = {}, cur = {}, gwins = {};
    res.forEach(function (r) { (r.players || []).forEach(function (p) { if (p.won) { wins[p.name] = (wins[p.name] || 0) + 1; cur[p.name] = (cur[p.name] || 0) + 1; gwins[r.game] = gwins[r.game] || {}; gwins[r.game][p.name] = (gwins[r.game][p.name] || 0) + 1; } else cur[p.name] = 0; }); });
    function push(n, t) { (out[n] = out[n] || []).push(t); }
    var champ = Object.keys(wins).sort(function (a, b) { return wins[b] - wins[a]; })[0];
    if (champ && wins[champ] >= 2) push(champ, '👑 House Champion');
    Object.keys(cur).forEach(function (n) { if (cur[n] >= 3) push(n, '🔥 ' + cur[n] + '-win streak'); });   // v2.34: ('🔥 3')-0 was NaN — every streak title read "NaN-win streak"
    Object.keys(gwins).forEach(function (g) { var w = Object.keys(gwins[g]).sort(function (a, b) { return gwins[g][b] - gwins[g][a]; })[0]; if (w && gwins[g][w] >= 2) push(w, '🏅 Champion of ' + niceName(g)); });
    return out;
  }
  function renderScores() {
    var el = $('#ptScores'); if (!el) return;
    /* v2.66: dropped the fire-and-forget GET probe of /api/scores/live — the route is
       POST-only, so the probe ALWAYS 404'd ("unknown endpoint" toast) and it also
       duplicated the /api/scores fetch. Pre-existing since v2.29; surfaced by the
       honest error toasts. */
    if (!scDoc) { el.innerHTML = '<div class="hint" style="text-align:center;padding:30px">Loading scores…</div>'; api('/api/scores').then(function (d) { scDoc = d; scLive = (live.state && live.state.scores) || null; renderScores(); }); return; }
    scLive = (live.state && live.state.scores) || scLive;
    var people = scDoc.players || [], auto = scAutoTitles(), h = '';
    // -- live match
    if (scLive && scLive.on) {
      var rows = scLive.players.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
      var top = rows[0] && rows[0].score;
      h += '<div class="card"><div class="zt">🎯 Scoring now — ' + esc(niceName(scLive.game || '')) + '</div>'
        + scLive.players.map(function (p, i) {
          var lead = p.score === top && scLive.players.length > 1;
          return '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)">' + scAvatar(p, 38, i)
            + '<div style="flex:1;min-width:0"><span style="font-size:15px">' + esc(p.name) + (lead ? ' 👑' : '') + '</span>' + (p.nick ? '<div class="hint">“' + esc(p.nick) + '”</div>' : '') + '</div>'
            + '<button class="btn" data-scd="' + esc(p.name) + '|-1" style="width:46px;height:46px;font-size:17px">−</button>'
            + '<span style="font:700 26px/1 ui-monospace,monospace;min-width:64px;text-align:center">' + (p.score || 0) + '</span>'
            + '<button class="btn" data-scd="' + esc(p.name) + '|1" style="width:46px;height:46px;font-size:17px">＋</button>'
            + '<button class="btn gh sm" data-scd="' + esc(p.name) + '|5">+5</button></div>';
        }).join('')
        + '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn p" id="scend" style="flex:1;height:46px">🏁 End game — crown the winner</button><button class="btn gh" id="sccancel">✕ Cancel</button></div></div>';
    } else {
      h += '<div class="card"><div class="zt">🎯 Start scoring</div><div class="hint" style="margin-bottom:8px">Pick who’s playing — scores show live on the wall’s Score frames.</div>'
        + '<div class="chips" id="scpick">' + people.map(function (p, i) { return '<button class="chip" data-scp="' + esc(p.name) + '">' + esc(p.name) + '</button>'; }).join('') + (people.length ? '' : '<span class="hint">No people yet — add someone below.</span>') + '</div>'
        + '<button class="btn p" id="scstart" style="width:100%;height:46px;margin-top:10px">▶ Start scoring' + (live.state && live.state.game ? ' — ' + esc((profiles[live.state.game] || {}).name || live.state.game) : '') + '</button></div>';
    }
    // -- people
    h += '<div class="card"><div class="zt">👥 People</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">'
      + people.map(function (p, i) {
        var tl = (p.titles || []).concat(auto[p.name] || []);
        return '<button data-sced="' + esc(p.name) + '" style="background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;text-align:center">' + scAvatar(p, 52, i)
          + '<span style="font-size:14px;color:var(--ink)">' + esc(p.name) + '</span>' + (p.nick ? '<span class="hint">“' + esc(p.nick) + '”</span>' : '')
          + (tl.length ? '<span style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center">' + tl.slice(0, 3).map(function (t) { return '<span style="font-size:9.5px;padding:2px 7px;border-radius:10px;background:rgba(201,163,94,.15);color:var(--gold2)">' + esc(t) + '</span>'; }).join('') + '</span>' : '')
          + '</button>';
      }).join('')
      + '<button id="scadd" style="border:1.5px dashed var(--line);border-radius:12px;background:none;color:var(--dim);padding:12px 8px;min-height:110px;cursor:pointer"><div style="font-size:22px">＋</div><div style="font-size:12px;margin-top:4px">Add person</div></button></div></div>';
    // -- hall of fame
    var res = scDoc.results || [];
    if (res.length) {
      var wins = {}, plays = {}, gplays = {};
      res.forEach(function (r) { gplays[r.game] = (gplays[r.game] || 0) + 1; (r.players || []).forEach(function (p) { plays[p.name] = (plays[p.name] || 0) + 1; if (p.won) wins[p.name] = (wins[p.name] || 0) + 1; }); });
      var topW = Object.keys(wins).sort(function (a, b) { return wins[b] - wins[a]; })[0];
      var topG = Object.keys(gplays).sort(function (a, b) { return gplays[b] - gplays[a]; })[0];
      h += '<div class="card"><div class="zt">🏆 Hall of fame</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">'
        + '<div style="background:var(--panel2);border-radius:10px;padding:10px"><div class="hint">Games logged</div><div style="font-size:20px;font-weight:700">' + res.length + '</div></div>'
        + (topW ? '<div style="background:var(--panel2);border-radius:10px;padding:10px"><div class="hint">Most wins</div><div style="font-size:16px;font-weight:700">' + esc(topW) + ' · ' + wins[topW] + '</div></div>' : '')
        + (topG ? '<div style="background:var(--panel2);border-radius:10px;padding:10px"><div class="hint">Most played</div><div style="font-size:16px;font-weight:700">' + esc(niceName(topG)) + ' · ' + gplays[topG] + '</div></div>' : '') + '</div>'
        /* v2.54: recent results are tap-to-edit (change winner / delete) — data-scres carries the real index into scDoc.results */
        + '<div class="hint" style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">Latest: ' + res.map(function (r, i) { return { r: r, i: i }; }).slice(-3).reverse().map(function (x) { var r = x.r, w = (r.players || []).filter(function (p) { return p.won; }).map(function (p) { return p.name; }).join(' + '); return '<button class="chip" data-scres="' + x.i + '" title="Tap to edit this result" style="min-height:36px">' + esc(niceName(r.game)) + (w ? ' → ' + esc(w) : '') + ' <span style="opacity:.6">✎</span></button>'; }).join('') + '</div>'
        + '<a class="btn" href="/scores" target="_blank" style="display:block;text-align:center;margin-top:10px;text-decoration:none">📊 Open the full scoreboard page</a></div>';
    } else {
      h += '<div class="card"><div class="zt">🏆 Hall of fame</div><div class="hint">No results yet — finish a scored game and it starts filling in. <a href="/scores" target="_blank" style="color:var(--gold2)">Full page ↗</a></div></div>';
    }
    el.innerHTML = h; wireScores();
  }
  var scSel = [];
  function wireScores() {
    $$('#scpick [data-scp]').forEach(function (b) { var on = scSel.indexOf(b.dataset.scp) >= 0; b.classList.toggle('on', on); b.onclick = function () { var ix = scSel.indexOf(b.dataset.scp); if (ix >= 0) scSel.splice(ix, 1); else scSel.push(b.dataset.scp); b.classList.toggle('on', ix < 0); }; });
    var st = $('#scstart'); if (st) st.onclick = function () { if (!scSel.length) return toast('Pick at least one player'); post('/api/scores/live', { start: { game: (live.state && live.state.game) || '', names: scSel } }).then(function (r) { scLive = r.scores; renderScores(); toast('Scoring live on the wall'); }); };
    $$('#ptScores [data-scd]').forEach(function (b) { b.onclick = function () { var pp = b.dataset.scd.split('|'); post('/api/scores/live', { add: { name: pp[0], delta: +pp[1] } }).then(function (r) { scLive = r.scores; renderScores(); }); }; });
    var en = $('#scend'); if (en) en.onclick = openWhoWonSheet;   /* v2.54: no more auto-crowning the highest score */
    var ca = $('#sccancel'); if (ca) ca.onclick = function () { post('/api/scores/live', { off: true }).then(function () { scLive = null; renderScores(); }); };
    var ad = $('#scadd'); if (ad) ad.onclick = function () { openPersonSheet(null); };
    $$('#ptScores [data-sced]').forEach(function (b) { b.onclick = function () { var p = (scDoc.players || []).find(function (x) { return x.name === b.dataset.sced; }); openPersonSheet(p); }; });
    $$('#ptScores [data-scres]').forEach(function (b) { b.onclick = function () { openResultEdit(+b.dataset.scres); }; });   /* v2.54: tap a recent result to fix or delete it */
  }
  /* v2.54: "Who won?" — the winner is a one-step choice before recording, pre-selected
     to the current leader(s); ties allowed. Fixes every lowest-wins game (§3.5). */
  function openWhoWonSheet() {
    if (!scLive || !scLive.players || !scLive.players.length) return;
    var rows = scLive.players.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var top = rows[0] ? (rows[0].score || 0) : 0;
    var picked = {};
    scLive.players.forEach(function (p) { if ((p.score || 0) === top) picked[p.name] = true; });
    askOpen('<div style="font-family:Georgia,serif;font-size:17px;margin-bottom:6px">🏁 Who won?</div>'
      + '<div class="hint" style="margin-bottom:12px">The leader is pre-picked — tap to change. Ties allowed.</div>'
      + '<div class="selchips" id="wwchips">' + scLive.players.map(function (p) { return '<button class="chip" data-ww="' + esc(p.name) + '" style="min-height:44px;font-size:13px">' + esc(p.name) + ' · ' + (p.score || 0) + '</button>'; }).join('') + '</div>'
      + '<div style="display:flex;gap:10px;margin-top:14px"><button class="btn gh" id="wwno" style="flex:1;min-height:44px">Cancel</button><button class="btn p" id="wwok" style="flex:1;min-height:44px">👑 Record result</button></div>');
    function paint() { $$('#wwchips [data-ww]').forEach(function (b) { b.classList.toggle('on', !!picked[b.dataset.ww]); }); }
    $$('#wwchips [data-ww]').forEach(function (b) { b.onclick = function () { picked[b.dataset.ww] = !picked[b.dataset.ww]; paint(); }; });
    paint();
    $('#wwno').onclick = askDismiss;
    $('#wwok').onclick = function () {
      var winners = scLive.players.map(function (p) { return p.name; }).filter(function (n) { return picked[n]; });
      if (!winners.length) return toast('Pick at least one winner');
      askDismiss();
      post('/api/scores/live', { finish: true }).then(function () {
        return post('/api/scores/result', { game: scLive.game || (live.state && live.state.game) || 'game', players: scLive.players.map(function (p) { return { name: p.name, score: p.score, won: winners.indexOf(p.name) >= 0 }; }) });
      }).then(function () { toast('👑 ' + winners.join(' + ') + ' wins!'); setTimeout(function () { post('/api/scores/live', { off: true }); scLive = null; scDoc = null; renderScores(); }, 8000); });
    };
  }
  /* v2.54: edit / delete a recorded result. scores.json is client-editable via the
     full-document POST /api/scores (the server backs the file up before replacing). */
  function openResultEdit(ix) {
    var res = (scDoc && scDoc.results) || [];
    var r = res[ix]; if (!r) return;
    var picked = {};
    (r.players || []).forEach(function (p) { if (p.won) picked[p.name] = true; });
    askOpen('<div style="font-family:Georgia,serif;font-size:17px;margin-bottom:6px">✎ ' + esc(niceName(r.game)) + '</div>'
      + '<div class="hint" style="margin-bottom:12px">' + esc((r.dateISO || '').slice(0, 10)) + ' — tap to change who won, or delete the entry.</div>'
      + '<div class="selchips" id="rechips">' + (r.players || []).map(function (p) { return '<button class="chip" data-re="' + esc(p.name) + '" style="min-height:44px;font-size:13px">' + esc(p.name) + (p.score != null ? ' · ' + p.score : '') + '</button>'; }).join('') + '</div>'
      + '<div style="display:flex;gap:10px;margin-top:14px"><button class="btn gh dg" id="redel" style="min-height:44px">🗑 Delete entry</button><div class="sp"></div><button class="btn gh" id="reno" style="min-height:44px">Cancel</button><button class="btn p" id="reok" style="min-height:44px">Save</button></div>');
    function paint() { $$('#rechips [data-re]').forEach(function (b) { b.classList.toggle('on', !!picked[b.dataset.re]); }); }
    $$('#rechips [data-re]').forEach(function (b) { b.onclick = function () { picked[b.dataset.re] = !picked[b.dataset.re]; paint(); }; });
    paint();
    $('#reno').onclick = askDismiss;
    function pushDoc(msg) {
      post('/api/scores', { players: scDoc.players || [], results: scDoc.results || [] })
        .then(function () { toast(msg); scDoc = null; renderScores(); })
        .catch(function () { toast('⚠ Could not save the change'); scDoc = null; renderScores(); });
    }
    $('#reok').onclick = function () {
      (r.players || []).forEach(function (p) { p.won = !!picked[p.name]; });
      askDismiss(); pushDoc('Result updated');
    };
    $('#redel').onclick = function () {
      askConfirm('Delete this result?', niceName(r.game) + ' · ' + (r.dateISO || '').slice(0, 10) + ' — this cannot be undone.', 'Delete', function () {
        res.splice(ix, 1); pushDoc('Result deleted');
      }, true);
    };
  }
  function openPersonSheet(p) {
    var isNew = !p; p = p || { name: '', nick: '', color: '#c9a35e', titles: [] };
    var titles = (p.titles || []).slice();
    openSheet('<div class="shead"><h2>' + (isNew ? '＋ Add person' : '✎ ' + esc(p.name)) + '</h2><div class="sp"></div><button class="btn gh" id="pclose9">Close</button></div><div class="sbody">'
      + '<div class="card"><div style="display:flex;gap:14px;align-items:center;margin-bottom:12px"><span id="pavatar">' + scAvatar(p, 64, 0) + '</span>'
      + '<div style="flex:1"><div class="r2"><label class="fld"><span>Name</span><input type="text" id="pname" value="' + esc(p.name) + '"></label>'
      + '<label class="fld"><span>Nickname</span><input type="text" id="pnick" value="' + esc(p.nick || '') + '" placeholder="Dice Goblin"></label></div>'
      + '<label class="fld" style="margin:0"><span>Colour</span><input type="color" id="pcolor" value="' + (p.color || '#c9a35e') + '"></label></div></div>'
      + '<div class="zt">Photo</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="pupload">📷 Upload photo</button><input type="file" id="pfile" accept="image/*" style="display:none"><button class="btn sm" id="pfromphotos">🖼 From Photos folder</button>' + (p.photo ? '<button class="btn sm gh" id="pnophoto">✕ Remove photo</button>' : '') + '</div></div>'
      + '<div class="card"><div class="zt">Titles — earned &amp; bestowed' + T('Funny honorifics shown on their card and the winner screen. Auto-titles (House Champion, streaks, per-game champions) appear automatically from results.') + '</div>'
      + '<div class="chips" id="ptitles">' + titles.map(function (t, i) { return '<span class="chip">' + esc(t) + ' <b data-tdel="' + i + '" style="cursor:pointer;margin-left:4px">✕</b></span>'; }).join('') + '</div>'
      + '<div style="display:flex;gap:6px;margin-top:8px"><input type="text" id="pnewtitle" placeholder="Destroyer of Friendships (Monopoly)" style="flex:1"><button class="btn sm" id="paddtitle">＋ Add</button></div></div>'
      + '<div style="display:flex;gap:8px"><button class="btn p" id="psave" style="flex:1">Save</button>' + (isNew ? '' : '<button class="btn gh dg" id="pdel">Delete person</button>') + '</div></div>');
    $('#pclose9').onclick = closeSheet;
    function redrawTitles() { $('#ptitles').innerHTML = titles.map(function (t, i) { return '<span class="chip">' + esc(t) + ' <b data-tdel="' + i + '" style="cursor:pointer;margin-left:4px">✕</b></span>'; }).join(''); $$('#ptitles [data-tdel]').forEach(function (x) { x.onclick = function () { titles.splice(+x.dataset.tdel, 1); redrawTitles(); }; }); }
    redrawTitles();
    $('#paddtitle').onclick = function () { var v = $('#pnewtitle').value.trim(); if (v) { titles.push(v); $('#pnewtitle').value = ''; redrawTitles(); } };
    var pendingPhoto = null;
    $('#pupload').onclick = function () { $('#pfile').click(); };
    $('#pfile').onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { pendingPhoto = rd.result; toast('Photo ready — hits the wall on Save'); }; rd.readAsDataURL(f);
    };
    /* v2.54: a real picture picker (album grid → photo thumbnails) — was two typed prompts */
    $('#pfromphotos').onclick = function () {
      openPersonPhotoPicker(function (url) { p.photo = url; toast('Photo chosen'); $('#pavatar').innerHTML = scAvatar(p, 64, 0); });
    };
    var np = $('#pnophoto'); if (np) np.onclick = function () { p.photo = null; pendingPhoto = null; $('#pavatar').innerHTML = scAvatar(p, 64, 0); };
    var del = $('#pdel'); if (del) del.onclick = function () { askConfirm('Remove ' + (p.name || 'this person') + '?', 'Past results keep their name.', 'Remove', function () { post('/api/people', { delete: p.name }).then(function () { closeSheet(); scDoc = null; renderScores(); }); }, true); };   /* v2.54 */
    $('#psave').onclick = function () {
      var nm = $('#pname').value.trim(); if (!nm) return toast('Give them a name');
      var body = { person: { name: nm, nick: $('#pnick').value.trim(), color: $('#pcolor').value, titles: titles, photo: p.photo || undefined } };
      if (!isNew && nm !== p.name) { body.person.rename = p.name; body.person.name = nm; }
      post('/api/people', body).then(function () {
        if (pendingPhoto) return post('/api/people/photo', { name: nm, b64: pendingPhoto });
      }).then(function () { closeSheet(); scDoc = null; renderScores(); toast('Saved ' + nm); });
    };
  }
  /* v2.54: person photo picker — album grid, then a thumbnail grid; tap to choose.
     Same /api/photodirs + /api/photos the photos inspector uses, thumbnails via the
     conductor's /thumb?src=photos resizer. Rides the ask overlay (above the person
     sheet, which stays intact behind it). done(url) receives the same value the old
     prompt flow stored: the photo's /photos/... URL string. */
  function photoThumbUrl(u) {
    var rel = String(u).replace(/^\/photos\//, '').split('/').map(function (s2) { try { return decodeURIComponent(s2); } catch (e) { return s2; } }).join('/');
    return '/thumb/' + encodeURIComponent(rel.split('/').pop()) + '?src=photos&w=240&p=' + encodeURIComponent(rel);
  }
  function openPersonPhotoPicker(done) {
    api('/api/photodirs').then(function (j) {
      var dirs = (j && j.dirs) || []; if (!dirs.length) return toast('No albums in Photos/');
      askOpen('<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex:none"><div style="font-family:Georgia,serif;font-size:17px" id="ppphead">Pick an album</div><div class="sp"></div>'
        + '<button class="btn gh" id="pppback" style="display:none;min-height:44px">‹ Albums</button><button class="btn gh" id="pppclose" style="min-height:44px">Close</button></div>'
        + '<div id="pppbody" style="overflow-y:auto;min-height:120px"></div>', true);
      $('#pppclose').onclick = askDismiss;
      var back = $('#pppback');
      function showAlbums() {
        $('#ppphead').textContent = 'Pick an album';
        back.style.display = 'none';
        $('#pppbody').innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px">'
          + dirs.map(function (d, i) { var dn = d.dir || d, nm = d.name || dn, ct = d.count != null ? d.count : ''; return '<button class="btn" data-pppd="' + i + '" style="min-height:52px;text-align:left;white-space:normal">📁 ' + esc(nm) + (ct !== '' ? ' <span class="hint">· ' + ct + '</span>' : '') + '</button>'; }).join('') + '</div>';
        $$('#pppbody [data-pppd]').forEach(function (b) { b.onclick = function () { var d = dirs[+b.dataset.pppd]; showPhotos(d.dir || d, d.name || d.dir || d); }; });
      }
      function showPhotos(dir, nm) {
        $('#ppphead').textContent = nm;
        back.style.display = ''; back.onclick = showAlbums;
        $('#pppbody').innerHTML = '<div class="hint" style="padding:16px">Loading photos…</div>';
        api('/api/photos?dir=' + encodeURIComponent(dir)).then(function (r) {
          var ph = (r && r.photos) || [];
          if (!ph.length) { $('#pppbody').innerHTML = '<div class="hint" style="padding:16px">Album is empty.</div>'; return; }
          $('#pppbody').innerHTML = '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">'
            + ph.map(function (it, i) { var u = it.url || it; return '<div class="cell" data-pppp="' + i + '"><img loading="lazy" src="' + photoThumbUrl(u).replace(/'/g, '%27') + '" style="aspect-ratio:1;object-fit:cover"></div>'; }).join('') + '</div>';
          $$('#pppbody [data-pppp]').forEach(function (c) { c.onclick = function () { var it = ph[+c.dataset.pppp]; askDismiss(); done(it.url || it); }; });
        }).catch(function () { $('#pppbody').innerHTML = '<div class="hint" style="padding:16px">Couldn’t read this album.</div>'; });
      }
      showAlbums();
    }).catch(function () { toast('Couldn’t reach the Conductor'); });
  }

  /* v1.4 reveal — per-frame trigger buttons for the live mode's reveal videos */
  function renderReveal() {
    var w = $('#revealwrap'); if (!w) return;
    var rv = live.state && live.state.reveal;
    var vv = rv && rv.videos ? rv.videos : null;
    if (!vv || !vv.some(function (v) { return !!v; })) { w.style.display = 'none'; return; }
    w.style.display = 'block';
    $('#revealbar').innerHTML = vv.map(function (v, i) { return v ? '<button class="btn sm" data-rev="' + FRAME_IDS[i] + '">▶ ' + FRAME_IDS[i] + '</button>' : ''; }).join('')
      + '<button class="btn sm" data-rev="all">▶ All frames</button>'
      + (rv.trigger === 'random' ? '<span class="hint" style="margin-left:8px">+ auto ~every ' + rv.everyS + 's</span>' : '');
    $$('#revealbar [data-rev]').forEach(function (b) { b.onclick = function () { post('/api/reveal', { frame: b.dataset.rev }).then(function (j) { toast('Reveal → ' + b.dataset.rev); }); }; });
  }

  /* ============ v1.70 AUTOMATIONS: Social DLC · Cue Cards · Autopilot ============ */
  var KIDMORPH = { lightning: { icon: '✨', label: 'Shimmer' } };
  /* v3.30 🗣 Announce — one-off lines through the room voice */
  function renderMomentsSay() {
    var go = $('#momsaygo'); if (!go) return;
    var sel2 = $('#momsayvoice');
    function fill() { if (sel2 && inVoices) sel2.innerHTML = inVoices.map(function (v, i) { return '<option value="' + esc(v) + '"' + (i === 0 ? ' selected' : '') + '>' + esc(v.replace(/-/g, ' ')) + '</option>'; }).join(''); }
    if (inVoices) fill();
    else api('/api/tts/voices').then(function (j) { if (j && j.voices) { inVoices = j.voices; fill(); } }).catch(function () {});
    go.onclick = function () {
      var t = ($('#momsaytext') && $('#momsaytext').value || '').trim();
      if (!t) return toast('Type something to announce');
      go.disabled = true;
      post('/api/tts', { text: t, voice: (sel2 && sel2.value) || undefined, speak: true }).then(function (r) {
        go.disabled = false;
        toast(r.ok ? '🗣 ' + t.slice(0, 44) : (r.error || 'TTS failed — is Piper set up in Home Assistant?'));
      }).catch(function () { go.disabled = false; toast('Conductor didn’t answer'); });
    };
    var tx = $('#momsaytext'); if (tx) tx.onkeydown = function (e) { if (e.key === 'Enter') go.click(); };
    var st = $('#momstopall'); if (st) st.onclick = function () {   /* v3.41 */
      post('/api/audio/stop', {}).then(function (r) { toast(r && r.ok ? '⏹ All sounds stopped' : ((r && r.error) || 'Stop failed')); })
        .catch(function () { toast('Conductor didn’t answer'); });
    };
  }
  /* ==================== v3.40 🎉 GAMES TAB (RS-GAMES, conductor v4.23) ==================== */
  var gmDefs = null, gmDecks = [], gmView = 'home', gmGame = null, gmCfg = null, gmTick = null;
  var gmRoster = null, gmPls = null, gmVoices = null, gmDeckSel = null, gmDeckKid = false;

  function gmPg() { return (live.state && live.state.partyGame) || null; }
  function gmWrap(inner) { return '<div style="max-width:1100px;margin:0 auto">' + inner + '</div>'; }
  function gmAct(action, extra) {
    return post('/api/games/action', Object.assign({ action: action }, extra || {}))
      .catch(function (e) { toast('⚠ ' + (e.message || 'action failed')); });
  }
  function gmRefresh(cb) {
    api('/api/games').then(function (j) { gmDefs = j.games || []; gmDecks = j.decks || []; if (cb) cb(); })
      .catch(function () { if (cb) cb(); });
  }
  function renderGames() {
    var el = $('#ptGames'); if (!el) return;
    if (gmTick) { clearInterval(gmTick); gmTick = null; }
    if (!gmDefs) {
      el.innerHTML = gmWrap('<div class="hint" style="text-align:center;padding:30px">Loading games…</div>');
      api('/api/games').then(function (j) { gmDefs = j.games || []; gmDecks = j.decks || []; renderGames(); })
        .catch(function () { el.innerHTML = gmWrap('<div class="hint" style="text-align:center;padding:30px">⚠ Couldn’t reach the games engine — conductor v4.23+ needed</div>'); });
      return;
    }
    var pg = gmPg();
    if (pg) return gmConsole(el, pg);
    if (gmView === 'decks') return gmDeckMgr(el);
    if (gmView === 'setup' && gmGame) return gmSetupView(el);
    gmView = 'home'; gmHome(el);
  }

  /* ---------- home: card gallery ---------- */
  function gmHome(el) {
    var h = '<div class="gmgrid">';
    (gmDefs || []).forEach(function (g) {
      h += '<div class="gmcard" data-gmgo="' + esc(g.id) + '"><div class="ic">' + (g.icon || '🎲') + '</div><div class="nm">' + esc(g.name) + '</div>'
        + '<div class="meta">' + g.players[0] + '–' + g.players[1] + ' players' + (g.deck ? ' · needs a deck' : '') + (g.playlists ? ' · uses your playlists' : '') + '</div>'
        + '<div class="hint" style="margin-top:6px">' + esc(g.blurb || '') + '</div></div>';
    });
    var wd = gmDecks.filter(function (d) { return d.kind === 'words'; }).length;
    h += '<div class="gmcard" data-gmgo="decks" style="border-style:dashed"><div class="ic">🗂</div><div class="nm">Word decks</div>'
      + '<div class="meta">' + wd + ' word · ' + (gmDecks.length - wd) + ' question decks</div>'
      + '<div class="hint" style="margin-top:6px">Paste a list, name it, mark it kid-safe — every game can use it</div></div>';
    h += '</div>';
    el.innerHTML = gmWrap(h);
    $$('#ptGames [data-gmgo]').forEach(function (c) {
      c.onclick = function () {
        if (c.dataset.gmgo === 'decks') { gmView = 'decks'; gmDeckSel = null; return renderGames(); }
        gmGame = c.dataset.gmgo; gmCfg = null; gmView = 'setup'; renderGames();
      };
    });
  }

  /* ---------- setup sheets ---------- */
  function gmKid() { return !!(live.state && live.state.kid); }
  function gmDeckOpts(kind, sel, charadesKid) {
    var ds = gmDecks.filter(function (d) { return d.kind === kind && (!charadesKid || d.kidSafe); });
    return ds.map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === sel ? ' selected' : '') + '>' + esc(d.name) + ' (' + d.count + ')</option>'; }).join('');
  }
  function gmDefCfg(id) {
    var picks = (gmRoster || []).slice(0, id === 'werewolf' ? 7 : 4);
    var c = { players: picks };
    if (id === 'charades') {
      c.variant = 'headsup'; c.guesserTv = layoutRoles().primary || (FRAME_IDS.indexOf('R2') >= 0 ? 'R2' : FRAME_IDS[0]); c.roundS = 90;   /* Phase 2c: primary role (R2 on the reference layout) */
      var d0 = gmDecks.find(function (d) { return d.kind === 'words' && (!gmKid() || d.kidSafe); });
      c.deck = d0 ? d0.id : null;
    }
    if (id === 'quiz') { var q0 = gmDecks.find(function (d) { return d.kind === 'quiz'; }); c.deck = q0 ? q0.id : null; c.count = 20; }
    if (id === 'musicquiz') { c.playlist = null; c.snippetS = 12; }
    if (id === 'werewolf') { c.roles = { wolves: 2, seer: true, healer: true }; c.voice = null; }
    return c;
  }
  function gmPlayersHtml() {
    var all = (gmRoster || []).slice();
    gmCfg.players.forEach(function (n) { if (all.indexOf(n) < 0) all.push(n); });
    return '<div class="zt">Players <span class="hint" style="text-transform:none">· from the Scores roster · tap to toggle · type to add</span></div>'
      + '<div class="chips">' + all.map(function (n) { return '<button class="chip' + (gmCfg.players.indexOf(n) >= 0 ? ' on' : '') + '" data-gmp="' + esc(n) + '">' + esc(n) + '</button>'; }).join('')
      + '<input type="text" id="gmpnew" placeholder="+ name ⏎" style="width:110px"></div>';
  }
  function gmBindPlayers() {
    $$('#ptGames [data-gmp]').forEach(function (c) {
      c.onclick = function () { var n = c.dataset.gmp, ix = gmCfg.players.indexOf(n); if (ix >= 0) gmCfg.players.splice(ix, 1); else gmCfg.players.push(n); renderGames(); };
    });
    var inp = $('#gmpnew');
    if (inp) inp.onkeydown = function (e) { if (e.key === 'Enter') { var v = inp.value.trim().slice(0, 24); if (v && gmCfg.players.indexOf(v) < 0) { gmCfg.players.push(v); if (gmRoster && gmRoster.indexOf(v) < 0) gmRoster.push(v); } renderGames(); } };
  }
  function gmStart() {
    post('/api/games/start', { id: gmGame, cfg: gmCfg })
      .then(function () { gmView = 'home'; toast('▶ Game on — the wall is live'); })
      .catch(function (e) { toast('⚠ ' + (e.message || 'could not start')); });
  }
  function gmSetupView(el) {
    if (!gmRoster) { el.innerHTML = gmWrap('<div class="hint" style="text-align:center;padding:30px">Loading players…</div>'); api('/api/scores').then(function (d) { gmRoster = (d.players || []).map(function (p) { return p.name; }); renderGames(); }).catch(function () { gmRoster = []; renderGames(); }); return; }
    if (!gmCfg) gmCfg = gmDefCfg(gmGame);
    var def = gmDefs.find(function (g) { return g.id === gmGame; }) || {};
    var h = '', startLabel = '▶ Start';

    if (gmGame === 'charades') {
      var V = { headsup: '🙆 Heads-Up — word behind the guesser’s head', classic: '🎬 Classic — actor peeks at one TV, everyone guesses', reverse: '👯 Reverse — whole team acts, one player guesses' };
      h += '<div class="zt">How to play it</div><div class="chips">'
        + Object.keys(V).map(function (k) { return '<button class="chip' + (gmCfg.variant === k ? ' on' : '') + '" data-gmv="' + k + '">' + V[k] + '</button>'; }).join('') + '</div>';
      /* Phase 2c: the mockup wall is built from the live layout — per wall the
         first frame is the rules card, the last the scores, and the centers role
         carries the game screens (identical to the old L1/L2/L3 · R1/R2/R3 map). */
      var chCT = (layoutRoles().centers || []).slice();
      if (!chCT.length) chCT = [gmCfg.guesserTv || FRAME_IDS[0]];
      if (chCT.indexOf(gmCfg.guesserTv) < 0) gmCfg.guesserTv = layoutRoles().primary || chCT[0];
      var wordTv = gmCfg.variant === 'classic' ? gmCfg.guesserTv : (chCT.filter(function (f) { return f !== gmCfg.guesserTv; })[0] || gmCfg.guesserTv);
      function tv(id, slotRole) {
        if (slotRole === 'game') {
          var isW = id === wordTv, isG = id === gmCfg.guesserTv && gmCfg.variant !== 'classic';
          return '<div class="gmtv ' + (isW ? 'word' : 'guesser') + '" data-gmtv="' + id + '">' + id + '<span class="w">' + (isW ? 'WORD' : '😶 ' + (gmCfg.variant === 'reverse' ? 'guesser' : 'guesser')) + '</span></div>';
        }
        return '<div class="gmtv">' + id + '<span class="w">' + (slotRole === 'rules' ? '📜 RULES' : '🏆 SCORES') + '</span></div>';
      }
      h += '<div class="zt">' + (gmCfg.variant === 'classic' ? 'Which TV does the actor peek at?' : 'The wall has fixed roles — tap the game screen behind the guesser') + '</div>'
        + '<div class="gmwall">' + Object.keys(layout.walls).map(function (wk) {
            var w = layout.walls[wk] || [];
            return '<div class="grp">' + w.map(function (id, ix) {
              var slotRole = chCT.indexOf(id) >= 0 ? 'game' : (ix === 0 ? 'rules' : (ix === w.length - 1 ? 'scores' : 'game'));
              return tv(id, slotRole);
            }).join('') + '</div>';
          }).join('') + '</div>'
        + '<div class="hint" style="text-align:center;margin-top:-4px">First TV of each wall: how-to-play · centre TVs: game screens (word shows OPPOSITE the guesser) · last TV: live scores</div>';
      h += '<div class="gmr2" style="margin-top:14px"><label class="gmfld"><span>Deck' + (gmKid() ? ' · kid-safe only' : '') + '</span><select id="gmdeck">' + gmDeckOpts('words', gmCfg.deck, gmKid()) + '</select></label>'
        + '<label class="gmfld"><span>Round length</span><select id="gmround">' + [60, 90, 120, 180].map(function (s) { return '<option value="' + s + '"' + (s === gmCfg.roundS ? ' selected' : '') + '>' + (s < 120 ? s + 's' : (s / 60) + ' min') + '</option>'; }).join('') + '</select></label></div>';
      h += gmPlayersHtml();
      startLabel = '▶ Start' + (gmCfg.players[0] ? ' — ' + esc(gmCfg.players[0]) + ' first' : '');
    }

    if (gmGame === 'quiz') {
      h += '<div class="gmr2"><label class="gmfld"><span>Question pack <span class="hint">(question|answer|A|B|C|D per line — add your own in 🗂 Decks)</span></span><select id="gmdeck">' + gmDeckOpts('quiz', gmCfg.deck, false) + '</select></label>'
        + '<label class="gmfld"><span>Questions</span><select id="gmcount">' + [10, 20, 30].map(function (n) { return '<option value="' + n + '"' + (n === gmCfg.count ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>'
        + '<div class="hint" style="margin-top:8px">Multiple choice puts A–D on the four corner TVs — stand under your answer. Reveal blacks out the wrong corners and blooms the right one.</div>'
        + gmPlayersHtml().replace('Players <span', 'Players or teams <span');
    }

    if (gmGame === 'musicquiz') {
      if (!gmPls) { api('/api/music/playlists').then(function (j) { gmPls = (j && j.playlists) || []; renderGames(); }).catch(function () { gmPls = []; renderGames(); }); h += '<div class="hint">Loading playlists…</div>'; }
      else {
        h += '<div class="gmr2"><label class="gmfld"><span>Playlist</span><select id="gmpl">' + (gmPls.length ? gmPls.map(function (p2, i) { return '<option value="' + i + '"' + (gmCfg.playlist && gmCfg.playlist.uri === p2.uri ? ' selected' : '') + '>' + esc(p2.name) + '</option>'; }).join('') : '<option value="">— no playlists (check Music tab) —</option>') + '</select></label>'
          + '<label class="gmfld"><span>Snippet</span><select id="gmsnip">' + [[5, '5s — brutal'], [12, '12s'], [30, '30s — generous']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === gmCfg.snippetS ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></div>'
          + '<div class="hint" style="margin-top:8px">A snippet plays through Music Assistant, first shout wins — you award the point on this console. Reveal lets the track play out and names it on the wall.</div>'
          + gmPlayersHtml();
      }
    }

    if (gmGame === 'werewolf') {
      if (!gmVoices) { api('/api/tts/voices').then(function (j) { gmVoices = (j && j.voices) || []; renderGames(); }).catch(function () { gmVoices = []; renderGames(); }); }
      var n = gmCfg.players.length, maxW = Math.max(1, Math.floor(n / 3));
      h += '<div class="hint">The room is the narrator: TTS reads the night script, the lights actually go out, dawn reveals the victim on the wall. This tablet just tracks who’s who — host eyes only.</div>'
        + gmPlayersHtml()
        + '<div class="zt">Roles</div><div class="chips">'
        + [1, 2, 3].map(function (w) { return w <= maxW ? '<button class="chip' + (gmCfg.roles.wolves === w ? ' on' : '') + '" data-gmww="' + w + '">🐺 Werewolves ×' + w + '</button>' : ''; }).join('')
        + '<button class="chip' + (gmCfg.roles.seer ? ' on' : '') + '" data-gmwr="seer">🔮 Seer</button>'
        + '<button class="chip' + (gmCfg.roles.healer ? ' on' : '') + '" data-gmwr="healer">🧪 Healer</button></div>'
        + '<div class="gmr2" style="margin-top:12px"><label class="gmfld"><span>Role dealing</span><select disabled><option>Deal cards by hand (classic)</option></select></label>'
        + '<label class="gmfld"><span>Narrator voice</span><select id="gmvoice">' + ((gmVoices || []).map(function (v) { return '<option value="' + esc(v) + '"' + (v === gmCfg.voice ? ' selected' : '') + '>' + esc(v.replace(/-/g, ' ')) + '</option>'; }).join('') || '<option value="">room default</option>') + '</select></label></div>';
      startLabel = '🌙 Deal roles & gather the village';
    }

    h = '<div class="card"><h2 style="margin:0 0 4px">' + (def.icon || '') + ' ' + esc(def.name || gmGame) + ' — set up</h2>' + h
      + '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn p" id="gmstart" style="flex:1;font-size:16px;padding:14px">' + startLabel + '</button>'
      + '<button class="btn" id="gmcancel">Cancel</button></div></div>';
    el.innerHTML = gmWrap(h);

    gmBindPlayers();
    $$('#ptGames [data-gmv]').forEach(function (c) { c.onclick = function () { gmCfg.variant = c.dataset.gmv; renderGames(); }; });
    $$('#ptGames [data-gmtv]').forEach(function (c) { c.onclick = function () { gmCfg.guesserTv = c.dataset.gmtv; renderGames(); }; });   /* Phase 2c: only centers-role TVs carry data-gmtv, so the tapped id is always valid */
    $$('#ptGames [data-gmww]').forEach(function (c) { c.onclick = function () { gmCfg.roles.wolves = +c.dataset.gmww; renderGames(); }; });
    $$('#ptGames [data-gmwr]').forEach(function (c) { c.onclick = function () { var k = c.dataset.gmwr; gmCfg.roles[k] = !gmCfg.roles[k]; renderGames(); }; });
    var dsel = $('#gmdeck'); if (dsel) dsel.onchange = function () { gmCfg.deck = dsel.value; };
    var rsel = $('#gmround'); if (rsel) rsel.onchange = function () { gmCfg.roundS = +rsel.value; };
    var csel = $('#gmcount'); if (csel) csel.onchange = function () { gmCfg.count = +csel.value; };
    var ssel = $('#gmsnip'); if (ssel) ssel.onchange = function () { gmCfg.snippetS = +ssel.value; };
    var vsel = $('#gmvoice'); if (vsel) vsel.onchange = function () { gmCfg.voice = vsel.value || null; };
    var psel = $('#gmpl'); if (psel) { if (gmPls && gmPls.length && !gmCfg.playlist) gmCfg.playlist = { uri: gmPls[0].uri, name: gmPls[0].name }; psel.onchange = function () { var p2 = gmPls[+psel.value]; gmCfg.playlist = p2 ? { uri: p2.uri, name: p2.name } : null; }; }
    $('#gmstart').onclick = function () {
      if ((gmGame === 'charades' || gmGame === 'quiz') && !gmCfg.deck) return toast('Pick a deck first');
      if (gmGame === 'musicquiz' && !gmCfg.playlist) return toast('Pick a playlist first');
      if (gmGame === 'werewolf' && gmCfg.players.length < 4) return toast('Werewolf needs at least 4 players');
      if (gmCfg.players.length < 2) return toast('Pick at least 2 players');
      gmStart();
    };
    $('#gmcancel').onclick = function () { gmView = 'home'; renderGames(); };
  }

  /* ---------- host consoles ---------- */
  function gmScoresList(pg, ww) {
    return '<ul class="gmscores">' + pg.players.slice().sort(function (a, b) { return ww ? 0 : b.score - a.score; }).map(function (p) {
      if (ww) return '<li' + (p.alive === false ? ' style="opacity:.45;text-decoration:line-through"' : '') + '><span>' + esc(p.name) + '</span><b>' + (p.alive === false ? '☠' : '') + '</b></li>';
      return '<li><span>' + esc(p.name) + '</span><b>' + p.score + '</b></li>';
    }).join('') + '</ul>';
  }
  function gmEndBtn() { return '<button class="btn dg" id="gmend">⏹ End game</button>'; }
  function gmBindEnd() { var b = $('#gmend'); if (b) b.onclick = function () { post('/api/games/end').then(function () { gmView = 'home'; toast('⏹ Game over — results saved to Scores'); renderGames(); }).catch(function () {}); }; }
  function gmFmt(ms) { var t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }

  function gmConsole(el, pg) {
    if (pg.id === 'charades') return gmChConsole(el, pg);
    if (pg.id === 'musicquiz') return gmMqConsole(el, pg);
    if (pg.id === 'quiz') return gmQzConsole(el, pg);
    if (pg.id === 'werewolf') return gmWwConsole(el, pg);
    el.innerHTML = gmWrap('<div class="card"><div class="hint">Unknown game “' + esc(pg.id) + '” running</div>' + gmEndBtn() + '</div>'); gmBindEnd();
  }

  function gmChConsole(el, pg) {
    var cur = pg.players[pg.turnIx] || {}, vlab = { headsup: 'Heads-Up', classic: 'Classic', reverse: 'Reverse' }[pg.variant] || 'Charades';
    var paused = pg.phase === 'paused', between = pg.phase === 'between';
    var h = '<div class="gmcon"><div class="card">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0">🎭 ' + vlab + ' · Round ' + pg.round + ' — <span style="color:var(--teal)">' + esc(cur.name || '') + '</span> at ' + pg.guesserTv + '</h2><span class="hint">' + esc(pg.deckName || '') + '</span></div>'
      + '<div class="gmtimer" id="gmtimer">' + (paused ? '⏸' : between ? '0:00' : (pg.endsAt ? gmFmt(pg.endsAt - Date.now()) : '—')) + '</div>'
      + '<div class="gmword">' + (between ? 'Time’s up!' : esc((pg.card && pg.card.text) || '…')) + '</div>'
      + '<div class="hint" style="text-align:center;margin-top:6px">' + (pg.variant === 'classic' ? '…shows ONLY on ' + pg.wordTv + '.' : '…is on ' + pg.wordTv + ' — opposite ' + esc(cur.name || 'the guesser') + '.') + ' Angle this tablet away!</div>'
      + '<div class="gmbrow"><button class="btn p" id="gmgot"' + (pg.phase !== 'round' ? ' disabled' : '') + '>✓ Got it</button><button class="btn" id="gmpass"' + (pg.phase !== 'round' ? ' disabled' : '') + '>⏭ Pass (−1)</button></div>'
      + '<div style="display:flex;gap:10px;margin-top:10px">'
      + '<button class="btn" id="gmpause" style="flex:1">' + (paused ? '▶ Resume' : '⏸ Pause') + '</button>'
      + '<button class="btn" id="gmnextp" style="flex:1">↷ Next player</button>' + gmEndBtn() + '</div></div>'
      + '<div class="card"><div class="zt" style="margin-top:0">This round</div><ul class="gmscores">'
      + (pg.log || []).map(function (l2) { return '<li><span>' + esc(l2.s + ' ' + l2.text) + '</span><b>' + (l2.s === '✓' ? '+1' : l2.s === '⏭' ? '−1' : '') + '</b></li>'; }).join('')
      + '</ul><div class="zt">Totals</div>' + gmScoresList(pg)
      + '<div class="hint" style="margin-top:10px">🗣 “Thirty seconds left!” — the room voice calls the warnings automatically</div></div></div>';
    el.innerHTML = gmWrap(h);
    $('#gmgot').onclick = function () { gmAct('got'); };
    $('#gmpass').onclick = function () { gmAct('pass'); };
    $('#gmpause').onclick = function () { gmAct(paused ? 'resume' : 'pause'); };
    $('#gmnextp').onclick = function () { gmAct('nextplayer'); };
    gmBindEnd();
    if (pg.phase === 'round' && pg.endsAt) gmTick = setInterval(function () {
      var t2 = $('#gmtimer'), p2 = gmPg(); if (!t2 || !p2 || !p2.endsAt) return;
      var rem = p2.endsAt - Date.now();
      t2.textContent = gmFmt(rem); t2.classList.toggle('low', rem <= 10000);
    }, 250);
  }

  function gmMqConsole(el, pg) {
    var tr = pg.track || {};
    var stateLine = tr.revealed ? '💿 <b style="color:var(--gold2)">' + esc(tr.title || 'Revealed — on the wall') + '</b>'
      : tr.playing ? '🔊 Snippet playing… (' + pg.snippetS + 's)' : '🎵 Ready — ▶ plays ' + pg.snippetS + 's from the playlist';
    var h = '<div class="gmcon"><div class="card">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0">🎵 Music Quiz · Track ' + (tr.n || 1) + '</h2><span class="hint">' + esc((pg.playlist && pg.playlist.name) || '') + '</span></div>'
      + '<div class="gmword" style="font-size:20px;color:var(--dim)">' + stateLine + '</div>'
      + '<div class="gmbrow"><button class="btn p" id="gmplay">▶ Play snippet</button><button class="btn" id="gmmore">＋5s more</button><button class="btn" id="gmrev">💡 Reveal</button></div>'
      + '<div class="zt">Who shouted it first?</div><div class="chips">'
      + pg.players.map(function (p2) { return '<button class="chip" data-gmaw="' + esc(p2.name) + '">' + esc(p2.name) + ' +1</button>'; }).join('')
      + '<button class="chip" data-gmnb="1">Nobody</button></div>'
      + '<div style="display:flex;gap:10px;margin-top:12px"><button class="btn" id="gmnext" style="flex:1">⏭ Next track</button>' + gmEndBtn() + '</div></div>'
      + '<div class="card"><div class="zt" style="margin-top:0">Scores</div>' + gmScoresList(pg)
      + '<div class="hint" style="margin-top:10px">Reveal lets the track play out and names it on the wall. Wrong guesses cost nothing — speed is everything.</div></div></div>';
    el.innerHTML = gmWrap(h);
    $('#gmplay').onclick = function () { gmAct('play'); };
    $('#gmmore').onclick = function () { gmAct('more', { s: 5 }); };
    $('#gmrev').onclick = function () { gmAct('reveal'); };
    $('#gmnext').onclick = function () { gmAct('next'); };
    $$('#ptGames [data-gmaw]').forEach(function (c) { c.onclick = function () { gmAct('award', { name: c.dataset.gmaw }); toast('🏆 +1 ' + c.dataset.gmaw); }; });
    var nb = $('#ptGames [data-gmnb]'); if (nb) nb.onclick = function () { toast('No point this round'); };
    gmBindEnd();
  }

  function gmQzConsole(el, pg) {
    var q = pg.question, over = pg.phase === 'over';
    var wall = '';
    if (q && q.opts) {
      var TVIX = {};   /* Phase 2c: A–D live on the corners role (was the L1/L3/R1/R3 literal map) */
      (layoutRoles().corners || []).forEach(function (f, i) { if (i < 4) TVIX[f] = i; });
      function ctv(id) {
        var ix = TVIX[id];
        if (ix == null) return '<div class="gmtv">' + id + '<span class="w">question</span></div>';
        var right = q.revealed && ix === q.correctIx, wrong = q.revealed && ix !== q.correctIx;
        return '<div class="gmtv' + (right ? ' word' : '') + '"' + (wrong ? ' style="opacity:.3"' : '') + '>' + id + '<span class="w">' + 'ABCD'.charAt(ix) + ' · ' + esc(q.opts[ix] || '') + '</span></div>';
      }
      wall = '<div class="gmwall">' + Object.keys(layout.walls).map(function (wk) {
        return '<div class="grp">' + (layout.walls[wk] || []).map(ctv).join('') + '</div>';
      }).join('') + '</div>';
    }
    var h = '<div class="gmcon"><div class="card">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0">🧠 Quiz' + (q ? ' · Question ' + q.n + ' of ' + q.total : '') + '</h2><span class="hint">' + esc(pg.deckName || '') + '</span></div>'
      + '<div class="gmword" style="font-size:22px">' + (over ? '🏆 That’s the quiz!' : esc((q && q.q) || '…')) + (q && q.revealed ? '<br><span style="font-size:15px;color:var(--green)">✓ ' + esc(q.answer) + '</span>' : '') + '</div>'
      + wall
      + (q && q.opts && !q.revealed ? '<div class="hint" style="text-align:center;margin-top:-4px">Answers live on the corner TVs — players stand under their pick</div>' : '')
      + '<div class="gmbrow">' + (over ? '' : '<button class="btn p" id="gmrev"' + (!q || q.revealed ? ' disabled' : '') + '>💡 Reveal — wrong TVs black out, right one blooms</button>') + '</div>'
      + '<div class="zt">Award the point</div><div class="chips">'
      + pg.players.map(function (p2) { return '<button class="chip" data-gmaw="' + esc(p2.name) + '">' + esc(p2.name) + ' +1</button>'; }).join('')
      + '<button class="chip" data-gmnb="1">Nobody</button></div>'
      + '<div style="display:flex;gap:10px;margin-top:12px"><button class="btn" id="gmnext" style="flex:1"' + (over ? ' disabled' : '') + '>⏭ Next question</button>' + gmEndBtn() + '</div></div>'
      + '<div class="card"><div class="zt" style="margin-top:0">Scores</div>' + gmScoresList(pg)
      + '<div class="hint" style="margin-top:10px">Question packs are decks too — paste your own in 🗂 Decks (question|answer|A|B|C|D per line).</div></div></div>';
    el.innerHTML = gmWrap(h);
    var rv = $('#gmrev'); if (rv) rv.onclick = function () { gmAct('reveal'); };
    var nx = $('#gmnext'); if (nx) nx.onclick = function () { gmAct('next'); };
    $$('#ptGames [data-gmaw]').forEach(function (c) { c.onclick = function () { gmAct('award', { name: c.dataset.gmaw }); toast('🏆 +1 ' + c.dataset.gmaw); }; });
    var nb = $('#ptGames [data-gmnb]'); if (nb) nb.onclick = function () { toast('No point — moving on'); };
    gmBindEnd();
  }

  function gmWwConsole(el, pg) {
    var ROLEIC = { werewolf: '🐺', seer: '🔮', healer: '🧪', villager: '🧑‍🌾' };
    var alive = pg.players.filter(function (p2) { return p2.alive !== false; });
    var main = '';
    if (pg.phase === 'setup') {
      main = '<div class="hint">Deal the roles below by hand (host eyes only!), then send the village to sleep.</div>'
        + '<div class="gmbrow"><button class="btn p" id="gmnight">🌙 Begin night 1</button></div>';
    } else if (pg.phase === 'night') {
      main = '<div class="zt" style="margin-top:0">Narration script — 🗣 speaks each line, then wait for the action</div>'
        + (pg.script || []).map(function (l2, i) {
            var done2 = i < pg.scriptIx;
            return '<div class="gmscript' + (done2 ? ' done' : '') + '"><div class="t">“' + esc(l2) + '”</div>'
              + (done2 ? '' : '<div style="display:flex;gap:8px;margin-top:7px"><button class="btn sm" data-gmsay="' + i + '">🗣 Narrate</button></div>') + '</div>';
          }).join('')
        + '<div class="zt">Dawn — who did the wolves take?</div><div class="chips">'
        + alive.map(function (p2) { return '<button class="chip" data-gmkill="' + esc(p2.name) + '">' + esc(p2.name) + '</button>'; }).join('')
        + '<button class="chip" data-gmheal="1">No one (healed) 🧪</button></div>';
    } else if (pg.phase === 'day') {
      main = '<div class="gmword" style="font-size:20px">☀️ ' + (pg.victim ? esc(pg.victim) + ' didn’t survive the night' : 'Everyone survived the night!') + '</div>'
        + '<div class="zt">Day vote — who does the village banish?</div><div class="chips">'
        + alive.map(function (p2) { return '<button class="chip" data-gmvote="' + esc(p2.name) + '">' + esc(p2.name) + '</button>'; }).join('')
        + '<button class="chip" data-gmnovote="1">No one</button></div>';
    } else if (pg.phase === 'dusk') {
      main = '<div class="gmword" style="font-size:20px">The village sleeps uneasily…</div>'
        + '<div class="gmbrow"><button class="btn p" id="gmnight">🌙 Begin night ' + (pg.night + 1) + '</button></div>';
    } else if (pg.phase === 'over') {
      main = '<div class="gmword">' + (pg.winner === 'wolves' ? '🐺 The wolves win!' : '🏡 The village wins!') + '</div>';
    }
    var h = '<div class="gmcon"><div class="card">'
      + '<h2 style="margin:0">🐺 ' + (pg.phase === 'night' ? 'Night ' + pg.night + ' <span class="hint">· lights are OUT · ambience playing</span>' : pg.phase === 'over' ? 'Game over' : pg.phase === 'day' ? 'Day ' + pg.night : 'The village gathers') + '</h2>'
      + '<div style="margin-top:10px">' + main + '</div>'
      + '<div style="display:flex;gap:10px;margin-top:14px">' + gmEndBtn() + '</div></div>'
      + '<div class="card"><div class="zt" style="margin-top:0">The village · host eyes only</div>'
      + pg.players.map(function (p2) {
          return '<div class="gmrole' + (p2.alive === false ? ' dead' : '') + '" data-gmtoggle="' + esc(p2.name) + '">' + (ROLEIC[p2.role] || '🧑‍🌾') + ' <b>' + esc(p2.name) + '</b><span class="hint">' + esc(p2.role || '') + (p2.alive === false ? ' · dead' : '') + '</span></div>';
        }).join('')
      + '<div class="hint" style="margin-top:8px">Tap a player to mark dead / alive. Win check runs automatically.</div></div></div>';
    el.innerHTML = gmWrap(h);
    var ng = $('#gmnight'); if (ng) ng.onclick = function () { gmAct('night'); };
    $$('#ptGames [data-gmsay]').forEach(function (c) { c.onclick = function () { gmAct('narrate', { ix: +c.dataset.gmsay }); }; });
    $$('#ptGames [data-gmkill]').forEach(function (c) { c.onclick = function () { gmAct('dawn', { name: c.dataset.gmkill }); }; });
    var hl = $('#ptGames [data-gmheal]'); if (hl) hl.onclick = function () { gmAct('dawn'); };
    $$('#ptGames [data-gmvote]').forEach(function (c) { c.onclick = function () { gmAct('lynch', { name: c.dataset.gmvote }); }; });
    var nv = $('#ptGames [data-gmnovote]'); if (nv) nv.onclick = function () { gmAct('lynch'); };
    $$('#ptGames [data-gmtoggle]').forEach(function (c) {
      c.onclick = function (e) {
        if (e.target && e.target.closest && e.target.closest('[data-gmsay],[data-gmkill],[data-gmvote]')) return;
        var p2 = pg.players.find(function (x) { return x.name === c.dataset.gmtoggle; });
        gmAct('kill', { name: c.dataset.gmtoggle, alive: p2 ? p2.alive === false : false });
      };
    });
    gmBindEnd();
  }

  /* ---------- deck manager ---------- */
  function gmDeckMgr(el) {
    var editable = gmDecks.filter(function (d) { return d.file; });
    var d = gmDeckSel === '_new' ? null : (gmDeckSel ? editable.find(function (x) { return x.id === gmDeckSel; }) : null);
    var h = '<div class="gmcon"><div class="card"><h2 style="margin:0 0 6px">🗂 Word decks</h2>'
      + '<div class="zt">Your decks · tap to edit</div><div class="chips">'
      + editable.map(function (x) { return '<button class="chip' + (gmDeckSel === x.id ? ' on' : '') + '" data-gmdk="' + esc(x.id) + '">' + (x.kind === 'quiz' ? '🧠' : '🃏') + ' ' + esc(x.name) + ' · ' + x.count + '</button>'; }).join('')
      + '<button class="chip' + (gmDeckSel === '_new' ? ' on' : '') + '" data-gmdk="_new" style="border-style:dashed">＋ New deck</button></div>';
    if (gmDeckSel) {
      var nm = d ? d.name.replace(/\s*\((kid-safe)\)\s*/i, '') : '';
      h += '<div class="zt">' + (d ? 'Editing: ' + esc(d.name) : 'New deck') + '</div>'
        + '<div class="gmr2"><label class="gmfld"><span>Name</span><input type="text" id="gmdname" value="' + esc(nm) + '" placeholder="People we know"></label>'
        + '<label class="gmfld"><span>Safety</span><label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dim);margin-top:8px"><input type="checkbox" id="gmdkid"' + (gmDeckKid ? ' checked' : '') + '> kid-safe</label></label></div>'
        + '<label class="gmfld" style="margin-top:10px"><span>One entry per line — words for charades, question|answer|A|B|C|D for quizzes</span>'
        + '<textarea id="gmdtext" style="width:100%;min-height:160px;resize:vertical;font-family:inherit" placeholder="Uncle Pete · Mrs Hughes next door · The postman…">' + '</textarea></label>'
        + '<div style="display:flex;gap:10px;margin-top:12px"><button class="btn p" id="gmdsave">💾 Save deck</button>'
        + (d ? '<button class="btn dg" id="gmddel">🗑 Delete</button>' : '') + '</div>';
    }
    h += '<div style="margin-top:14px"><button class="btn gh" id="gmback">← All games</button></div></div>'
      + '<div class="card"><div class="zt" style="margin-top:0">How decks work</div>'
      + '<div class="hint" style="line-height:1.7">One deck = one .txt in <b>decks/</b> — drop a file in that folder and it appears here.<br><br>Charades decks: one word per line. Quiz packs: <b>question|answer|A|B|C|D</b> per line (the answer must match one of the options).<br><br>Add “(kid-safe)” to the name and charades will allow it while kid-safe mode is on. Every save backs the old file up to _backups/ first.</div></div></div>';
    el.innerHTML = gmWrap(h);
    $$('#ptGames [data-gmdk]').forEach(function (c) {
      c.onclick = function () {
        gmDeckSel = c.dataset.gmdk;
        var dd = editable.find(function (x) { return x.id === gmDeckSel; });
        gmDeckKid = !!(dd && dd.kidSafe);
        renderGames();
        if (dd) fetch('/decks/' + encodeURIComponent(dd.file)).then(function (r) { return r.text(); }).then(function (t) { var ta = $('#gmdtext'); if (ta && gmDeckSel === dd.id) ta.value = t; }).catch(function () {});
      };
    });
    if (gmDeckSel && d) fetch('/decks/' + encodeURIComponent(d.file)).then(function (r) { return r.text(); }).then(function (t) { var ta = $('#gmdtext'); if (ta && !ta.value) ta.value = t; }).catch(function () {});
    var sv = $('#gmdsave');
    if (sv) sv.onclick = function () {
      var name = ($('#gmdname').value || '').trim(), kid2 = $('#gmdkid').checked, text = $('#gmdtext').value || '';
      if (!name) return toast('Name the deck first');
      if (kid2 && !/kid-safe/i.test(name)) name += ' (kid-safe)';
      post('/api/games/deck', { name: name, text: text })
        .then(function (r) { toast('💾 Saved — ' + r.count + ' entries in ' + r.name); gmDeckSel = r.id; gmRefresh(renderGames); })
        .catch(function (e) { toast('⚠ ' + (e.message || 'save failed')); });
    };
    var dl = $('#gmddel');
    if (dl) dl.onclick = function () {
      askConfirm('Delete “' + (d ? d.name : '') + '”?', 'A backup goes to _backups/ first.', 'Delete', function () {
        post('/api/games/deck', { name: d.name, delete: true })
          .then(function () { toast('🗑 Deck deleted (backed up)'); gmDeckSel = null; gmRefresh(renderGames); })
          .catch(function (e) { toast('⚠ ' + (e.message || 'delete failed')); });
      }, true);
    };
    $('#gmback').onclick = function () { gmView = 'home'; renderGames(); };
  }

  function renderSocial() {
    var w = $('#socialwrap'); if (!w) return;
    var kid = !!(live.state && live.state.kid);
    w.style.display = social.length ? 'block' : 'none';
    $('#socialbar').innerHTML = social.map(function (b) {
      var mo = kid && b.event && KIDMORPH[b.id];
      return '<button class="socialbtn" data-soc="' + b.id + '"><span class="ic">' + ((mo && mo.icon) || b.icon || '🎭') + '</span>' + esc((mo && mo.label) || b.label || b.id) + '</button>';
    }).join('') + '<button class="socialbtn" data-cue="1"><span class="ic">🃏</span>Cue cards</button>';
    $$('#socialbar [data-soc]').forEach(function (b) {
      b.onclick = function () {
        b.classList.add('cool'); setTimeout(function () { b.classList.remove('cool'); }, 1500);
        $$('#walls .fr').forEach(function (f) { f.style.boxShadow = '0 0 0 2px var(--gold)'; setTimeout(function () { f.style.boxShadow = ''; }, 500); });
        post('/api/social/' + encodeURIComponent(b.dataset.soc));
      };
    });
    var cb = $('#socialbar [data-cue]'); if (cb) cb.onclick = openCueSheet;
  }
  function openCueSheet() {
    var frames = FRAME_IDS.map(function (f) { return '<button class="chip" data-cf="' + f + '">' + f + '</button>'; }).join('');
    openSheet('<div class="shead"><h2>🃏 Cue cards</h2><div class="sp"></div><button class="btn gh" id="pclose2">Close</button></div><div class="sbody">'
      + '<div class="card"><div class="zt">1 · Pick a deck <span class="hint">(add .txt files to the decks/ folder — one line per item, img: for pictures)</span></div>'
      + '<div class="chips">' + (decks.length ? decks.map(function (d) { return '<button class="chip" data-cd="' + esc(d.id) + '">' + (d.icon || '🃏') + ' ' + esc(d.name) + ' · ' + d.count + '</button>'; }).join('') : '<span class="hint">No decks yet — drop a .txt into the decks/ folder and Rescan</span>') + '</div></div>'
      + '<div class="card"><div class="zt">2 · Which frame? <span class="hint">(pick the one behind your victim’s head)</span></div><div class="chips" id="cueframes">' + frames + '</div></div>'
      + '<div class="card"><button class="btn" id="cuego" style="width:100%">Start prompting</button></div></div>');
    $('#pclose2').onclick = closeSheet;
    var selDeck = decks.length ? decks[0].id : null, selFrame = layoutRoles().primary || (FRAME_IDS.indexOf('R2') >= 0 ? 'R2' : FRAME_IDS[0]);   /* v2.64: default frame must exist in the layout · Phase 2c: primary role */
    function paint() {
      $$('#sheet [data-cd]').forEach(function (c) { c.classList.toggle('on', c.dataset.cd === selDeck); });
      $$('#sheet [data-cf]').forEach(function (c) { c.classList.toggle('on', c.dataset.cf === selFrame); });
    }
    $$('#sheet [data-cd]').forEach(function (c) { c.onclick = function () { selDeck = c.dataset.cd; paint(); }; });
    $$('#sheet [data-cf]').forEach(function (c) { c.onclick = function () { selFrame = c.dataset.cf; paint(); }; });
    paint();
    $('#cuego').onclick = function () {
      if (!selDeck) { toast('Pick a deck first'); return; }
      post('/api/prompter', { deck: selDeck, frame: selFrame, index: 0 }).then(function () { closeSheet(); toast('Cue cards live on ' + selFrame); });
    };
  }
  function renderCue() {
    var w = $('#cuewrap'); if (!w) return;
    var pr = live.state && live.state.prompter;
    if (!pr) { w.style.display = 'none'; w.innerHTML = ''; return; }
    w.style.display = 'block';
    w.innerHTML = '<div class="cuebox">'
      + '<button class="btn sm" id="cueprev">‹</button>'
      + '<div class="cur"><b style="color:var(--gold2)">' + esc(pr.frame) + ' · ' + (pr.index + 1) + '/' + pr.count + '</b><br>' + (pr.img ? '🖼 (image)' : esc(pr.text || '')) + '</div>'
      + '<div class="nxt">NEXT: ' + esc((pr.next || '').slice(0, 110)) + '</div>'
      + '<button class="btn sm" id="cuenext">›</button>'
      + '<button class="btn sm dg" id="cueoff" title="Panic-hide — fades in 400ms">Hide</button></div>';
    $('#cuenext').onclick = function () { post('/api/prompter', { action: 'next' }); };
    $('#cueprev').onclick = function () { post('/api/prompter', { action: 'prev' }); };
    $('#cueoff').onclick = function () { post('/api/prompter', { action: 'off' }); };
  }
  function renderAuto() {
    api('/api/auto').then(function (a) {
      auto = a; var chip = $('#autochip'); if (!chip) return;
      var on = a.rhythmsOn || (a.weather && a.weather.on);
      chip.style.display = on ? 'inline-block' : 'none';
      if (!on) return;
      var held = a.holdUntil && a.holdUntil > Date.now();
      chip.classList.toggle('held', !!held);
      chip.textContent = held ? '⏸ Held until ' + new Date(a.holdUntil).toTimeString().slice(0, 5)
        : '☼ Autopilot' + (a.target ? ' · ' + (profiles[a.target.mode] ? (profiles[a.target.mode].name || a.target.mode) : a.target.mode) : '')
          + (a.next ? ' until ' + new Date(a.next.at).toTimeString().slice(0, 5) : '');
      chip.onclick = openAutoSheet;
      if (a.special) toast('Today: ' + a.special);
    }).catch(function () {});
  }
  function openAutoSheet() {
    var a = auto || {};
    var held = a.holdUntil && a.holdUntil > Date.now();
    api('/api/diary').then(function (dj) {
      var rows = ((dj && dj.diary) || []).slice(0, 8).map(function (e) {
        return '<div style="display:flex;gap:10px;font-size:12px;color:var(--dim);padding:3px 0"><span style="color:var(--faint)">' + new Date(e.t).toTimeString().slice(0, 5) + '</span><span>' + esc(e.kind) + '</span><span style="color:var(--ink)">' + esc(e.text) + '</span></div>';
      }).join('') || '<span class="hint">Nothing yet</span>';
      openSheet('<div class="shead"><h2>☼ Autopilot</h2><div class="sp"></div><button class="btn gh" id="pclose3">Close</button></div><div class="sbody">'
        + '<div class="card"><div style="font-size:13.5px;line-height:1.6">'
        + 'Now: <b style="color:var(--gold2)">' + esc(a.target ? a.target.mode : a.game || '—') + '</b>' + (a.target ? ' <span class="hint">(' + esc(a.target.why || '') + ')</span>' : '')
        + (a.next ? '<br>Then: <b>' + esc(a.next.mode) + '</b> at ' + new Date(a.next.at).toTimeString().slice(0, 5) + ' <span class="hint">(' + esc(a.next.why || '') + ')</span>' : '')
        + (a.weather && a.weather.on ? '<br>Weather: <b>' + esc(a.weather.cond || 'unknown') + '</b>' + (a.weather.effect ? ' → ' + esc(a.weather.effect.split('/').pop()) : ' (no effect)') : '')
        + (function () {   /* v2.64: next weekly-schedule rule, read-only (GET /api/auto now carries schedule) */
            var nx = schedNextRule(a.schedule || (schedDoc && schedDoc.schedule));
            return nx ? '<br>Next: <b>' + esc(nx.rule.name || modeName(nx.rule.mode)) + '</b> ' + SCHED_DAYS[nx.at.getDay()] + ' ' + nx.at.toTimeString().slice(0, 5) + ' <span class="hint">(weekly schedule)</span>' : '';
          })()
        + '</div></div>'
        + '<div class="card"><div class="zt">Hold the room ' + '</div><div class="chips">'
        + (held ? '<button class="chip on" id="hrel">▶ Release hold</button>'
          : '<button class="chip" data-hold="60">1 hour</button><button class="chip" data-hold="180">3 hours</button><button class="chip" data-hold="tomorrow">Until tomorrow</button>')
        + '</div><div class="hint" style="margin-top:6px">While held, rhythms and weather leave the room exactly as it is.</div></div>'
        + '<div class="card"><div class="zt">Room diary</div>' + rows + '</div></div>');
      $('#pclose3').onclick = closeSheet;
      $$('#sheet [data-hold]').forEach(function (b) {
        b.onclick = function () {
          var mins = b.dataset.hold === 'tomorrow' ? Math.round((new Date(new Date().setHours(30, 0, 0, 0)) - Date.now()) / 60000) : +b.dataset.hold;
          post('/api/hold', { minutes: mins }).then(function () { closeSheet(); renderAuto(); toast('Room held'); });
        };
      });
      var hr = $('#hrel'); if (hr) hr.onclick = function () { post('/api/hold', {}).then(function () { closeSheet(); renderAuto(); toast('Autopilot resumed'); }); };
    });
  }
  /* v2.14 MODE DASHBOARD — a Play-card click opens a compact per-mode control
     sheet (launch · phases · music · room volume · lights · moments · reveal)
     instead of launching instantly. Every control reuses an existing endpoint;
     nothing new server-side. Per-frame effect LAYERS stay a Design concept —
     surfaced via "Edit in Design". */
  function mdPoster(id) {
    var u = (typeof RS !== 'undefined' && RS && RS.posters && RS.posters[id]) || sceneThumb((profiles[id] || {}).scene);
    return u || '';
  }
  function mdRulesSummary(r) {
    var sec = r.sections || {}, on = [];
    [['setup', 'Setup'], ['turn', 'How-to'], ['win', 'Winning'], ['tips', 'Tips']].forEach(function (s) { if (sec[s[0]] !== false) on.push(s[1]); });
    return (r.game || 'game') + ' · ' + (on.length ? on.join(', ') : 'no panels') + (r.videoId ? ' · custom video' : '');
  }
  function playModeAt(id, phaseId) {
    recordRecent(id);   // v2.44 (exec4)
    post('/api/game/' + encodeURIComponent(id)).then(function () {
      if (phaseId) setTimeout(function () { post('/api/phase', { phase: phaseId }); }, 450);
    });
    toast('▶ ' + ((profiles[id] || {}).name || id) + (phaseId ? ' · phase' : ''));
  }
  function mdMusicRefresh() {
    api('/api/music/status').then(function (j) {
      var now = $('#mdnow'), big = $('#mdbig'), mv = $('#mdmusvol'), art = $('#mdart'); if (!now) return;
      if (!j || j.configured === false || !j.player) { now.innerHTML = '<div style="font-size:12px;color:var(--faint)">No music player set (Music tab)</div>'; return; }
      var q = j.queue, cur = q && q.current, playing = q && q.state === 'playing';
      now.innerHTML = cur ? ('<div style="font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(cur.name || '') + '</div><div style="font-size:11px;color:var(--faint)">' + esc(cur.artist || '') + '</div>') : '<div style="font-size:12px;color:var(--faint)">Nothing playing</div>';
      if (art) { if (cur && cur.image) { art.style.backgroundImage = "url('" + String(cur.image).replace(/'/g, '%27') + "')"; art.textContent = ''; } else { art.style.backgroundImage = ''; art.textContent = '♪'; } }
      if (big) { big.textContent = playing ? '⏸' : '▶'; big.dataset.mc = playing ? 'pause' : 'play'; }
      if (mv && j.volume != null && !mv._t) mv.value = Math.round(j.volume);
    }).catch(function () {});
  }
  function openModeDash(id) {
    var p = profiles[id]; if (!p) return;
    var poster = mdPoster(id);
    var phs = Array.isArray(p.phases) ? p.phases : [];
    var rev = p.reveal || null, revFrames = [];
    if (rev) {
      var vv = rev.videos || [], rl = rev.reels || [];
      FRAME_IDS.forEach(function (f, i) { if (vv[i] || (rl[i] && rl[i].length)) revFrames.push(f); });
    }
    var meta = [p.ambience || '', p.kidSafe ? 'kid-safe' : ''].filter(Boolean).join(' · ');
    var roomVol = (live.state && live.state.audio && live.state.audio.volume != null) ? Math.round(live.state.audio.volume)
      : ((settings.audio && settings.audio.volume != null) ? settings.audio.volume : 70);
    var acc = p.accent || '#c9a35e';
    var isLive = !!(live.state && live.state.game === id && live.state.live);
    var curPhase = isLive ? (live.state.phaseId || '') : null;
    var steps = [{ id: '', name: '● Base' }].concat(phs.map(function (p2) { return { id: p2.id, name: (p2.icon ? p2.icon + ' ' : '') + p2.name }; }));
    var stepH = steps.map(function (s, i) {
      var on = isLive && ((s.id || '') === (curPhase || ''));
      var chip = '<button class="chip" data-phz="' + esc(s.id) + '" style="flex:none;white-space:nowrap' + (on ? ';border-color:' + acc + ';background:' + acc + ';color:#1a1407' : '') + '">' + esc(s.name) + '</button>';
      return chip + (i < steps.length - 1 ? '<span style="height:2px;width:12px;background:var(--line);flex:none"></span>' : '');
    }).join('');
    var momentTile = function (icon, label, attr) { return '<button ' + attr + ' style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:74px;padding:10px 6px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);cursor:pointer"><span style="font-size:22px;line-height:1">' + icon + '</span><span style="font-size:11px;text-align:center;line-height:1.15">' + label + '</span></button>'; };
    var socialChips = (social || []).map(function (b) { return momentTile((b.icon || '🎭'), esc(b.label || b.id), 'data-soc="' + esc(b.id) + '"'); }).join('');
    var h = ''
      + '<div style="position:relative;flex:none;height:104px;background:linear-gradient(90deg,' + acc + '55,' + acc + '10)">'
      +   (poster ? '<div style="position:absolute;inset:0;background:url(\'' + poster.replace(/'/g, '%27') + '\') center/cover;opacity:.22"></div>' : '')
      +   '<div style="position:absolute;left:18px;right:14px;bottom:12px;display:flex;align-items:flex-end;gap:12px">'
      +     '<div style="width:54px;height:54px;border-radius:12px;flex:none;background:' + acc + ' center/cover no-repeat' + (poster ? ";background-image:url('" + poster + "')" : '') + ';box-shadow:0 4px 14px rgba(0,0,0,.5)"></div>'
      +     '<div style="flex:1;min-width:0">'
      +       '<div style="display:flex;align-items:center;gap:8px"><span style="font-family:Georgia,serif;font-size:20px;color:#fff;text-shadow:0 1px 4px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.name || id) + '</span>'
      +         (isLive ? '<span style="font-size:10px;font-weight:700;letter-spacing:.5px;color:#0c1f0c;background:var(--green);padding:2px 8px;border-radius:20px;flex:none">● LIVE</span>' : '') + '</div>'
      +       (meta ? '<div style="font-size:12px;color:#e8e6df;opacity:.85;text-shadow:0 1px 3px #000">' + esc(meta) + '</div>' : '')
      +     '</div>'
      +     '<button class="btn gh sm" id="mdclose" style="flex:none">Close</button>'
      +   '</div>'
      + '</div>'
      + '<div class="sbody">'
      +   (phs.length ? '<div style="margin-bottom:14px"><div class="zt" style="margin-bottom:8px">Phases</div><div id="mdphases" style="display:flex;align-items:center;overflow-x:auto;padding-bottom:3px">' + stepH + '</div></div>' : '')
      +   '<div class="card"><div style="display:grid;grid-template-columns:minmax(280px,1fr) minmax(280px,1fr);gap:22px;align-items:center">'
      +     '<div style="display:flex;align-items:center;gap:10px;min-width:0">'
      +       '<div id="mdart" style="width:44px;height:44px;border-radius:8px;flex:none;background:var(--panel3) center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:var(--gold)">♪</div>'
      +       '<div id="mdnow" style="flex:1;min-width:0"><div style="font-size:12px;color:var(--faint)">…</div></div>'
      +       '<button class="mbtn" data-mc="previous" title="Previous">⏮</button>'
      +       '<button class="mbtn big" id="mdbig" data-mc="play">▶</button>'
      +       '<button class="mbtn" data-mc="next" title="Next">⏭</button></div>'
      +     '<div style="display:flex;gap:18px;align-items:flex-end">'
      +       '<label class="fld" style="flex:1;margin:0"><span>♪ Music</span><input type="range" id="mdmusvol" min="0" max="100" value="50"></label>'
      +       '<label class="fld" style="flex:1;margin:0"><span>🔊 Room</span><input type="range" id="mdroomvol" min="0" max="100" value="' + roomVol + '"></label>'
      +       '<button class="btn gh sm" data-mc="stop" style="flex:none;margin-bottom:2px">⏹ Off</button></div>'
      +   '</div></div>'
      +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">'
      +     '<div class="card" style="margin:0"><div class="zt">💡 Lights</div><div id="mdlights" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px"><span class="hint">Loading…</span></div>'
      +       '<label class="fld" style="margin:14px 0 0"><span>Brightness <b id="mdlbrv" style="color:var(--gold2)">60%</b></span><input type="range" id="mdlbr" min="1" max="100" value="60"></label>'
      +       '<button class="btn gh sm" id="mdloff" style="margin-top:8px">○ All lights off</button></div>'
      +     '<div class="card" style="margin:0"><div class="zt">🎭 Moments</div><div id="mdmoments" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px">' + socialChips + momentTile('🃏', 'Cue cards', 'id="mdcue"') + '</div>'
      +       (revFrames.length ? '<div class="zt" style="margin-top:16px">≋ Reveal</div><div class="chips" id="mdreveal">' + revFrames.map(function (f) { return '<button class="chip" data-rev="' + f + '">▶ ' + f + '</button>'; }).join('') + '<button class="chip" data-rev="all">▶ All</button></div>' : '') + '</div>'
      +   '</div>'
      +   '<div class="card" style="display:flex;align-items:center;gap:10px;margin-top:14px"><div style="flex:1;min-width:0"><div class="zt" style="margin:0 0 3px">📖 Rules &amp; tutorial</div><div class="hint">' + ((p.rules && p.rules.game) ? esc(mdRulesSummary(p.rules)) : 'Not linked — set a game in ✎ Edit in Design → ☑ Behaviour') + '</div></div>'
      +     ((p.rules && p.rules.game) ? '<button class="chip" id="mdrulesshow" style="flex:none">▶ Show on wall</button><button class="chip" id="mdruleshide" style="flex:none">Hide</button>' : '') + '</div>'
      + '</div>'
      + '<div style="flex:none;border-top:1px solid var(--line);background:#12141a;padding:12px 18px;display:flex;gap:8px">'
      +   '<button class="btn p" id="mdplay" style="flex:1;height:44px">▶ ' + (isLive ? 'Restart from base' : 'Play from start') + '</button>'
      +   '<button class="btn" id="mddesign" style="width:52px" title="Edit in Design">✎</button>'
      + '</div>';
    openSheet(h);
    $('#mdclose').onclick = closeSheet;
    $('#mdplay').onclick = function () { playModeAt(id, null); closeSheet(); };
    $$('#mdphases [data-phz]').forEach(function (b) { b.onclick = function () { playModeAt(id, b.dataset.phz || null); closeSheet(); }; });
    $$('#sheet [data-mc]').forEach(function (b) { b.onclick = function () { post('/api/music/cmd', { action: b.dataset.mc }).then(function (r) { if (r && r.ok === false) return toast(r.error || 'Music Assistant didn’t answer'); if (b.dataset.mc === 'stop') toast('⏹ Music off'); setTimeout(mdMusicRefresh, 500); }); }; });
    var mmv = $('#mdmusvol'); if (mmv) mmv.oninput = function () { clearTimeout(mmv._t); var v = +mmv.value; mmv._t = setTimeout(function () { post('/api/music/cmd', { action: 'volume', value: v }).then(function () { mmv._t = null; }); }, 300); };
    var rv2 = $('#mdroomvol'); if (rv2) rv2.oninput = function () { clearTimeout(rv2._t); var v = +rv2.value; rv2._t = setTimeout(function () { post('/api/volume', { pct: v }); }, 250); };
    $$('#mdmoments [data-soc]').forEach(function (b) { b.onclick = function () { b.classList.add('cool'); setTimeout(function () { b.classList.remove('cool'); }, 1500); post('/api/social/' + encodeURIComponent(b.dataset.soc)); }; });
    var cue = $('#mdcue'); if (cue) cue.onclick = openCueSheet;
    $$('#mdreveal [data-rev]').forEach(function (b) { b.onclick = function () { post('/api/reveal', { frame: b.dataset.rev }).then(function () { toast('Reveal → ' + b.dataset.rev); }); }; });
    $('#mddesign').onclick = function () {   // v2.44 (QW3): no more silent draft discard · v2.54: in-app confirm
      if (id === curId) { closeSheet(); setSpace('design'); return; }              // same mode — keep any in-progress draft
      var go = function () { closeSheet(); selectMode(id, true); setSpace('design'); };
      if (dirty) askConfirm('Discard unsaved changes?', 'Unsaved changes to “' + ((draft && draft.name) || curId) + '” will be lost.', 'Discard', go, true); else go();
    };
    var _mdrs = $('#mdrulesshow'); if (_mdrs) _mdrs.onclick = function () { var r = p.rules || {}; post('/api/rules/show', { game: r.game, videoId: r.videoId || undefined, sections: r.sections || undefined }).then(function (x) { toast(x && x.ok ? '📖 Rules on the wall' : ((x && x.error) || 'Could not show rules')); }); };
    var _mdrh = $('#mdruleshide'); if (_mdrh) _mdrh.onclick = function () { post('/api/rules/show', { off: true }).then(function () { toast('Rules hidden'); }); };
    api('/api/lightscenes').then(function (j) {
      var box = $('#mdlights'); if (!box) return;
      if (!j || !j.configured) { box.innerHTML = '<span class="hint">Home Assistant not connected</span>'; return; }
      var scenes = j.scenes || {};
      box.innerHTML = Object.keys(scenes).map(function (n) {
        var sc = scenes[n] || {}, sw = lightSwatch(sc), onSel = (n === p.light);
        var ds = (sc.brightness_pct != null ? sc.brightness_pct + '%' : '') + (sc.color_temp_kelvin ? (sc.brightness_pct != null ? ' · ' : '') + (sc.color_temp_kelvin / 1000).toFixed(1) + 'k' : '') + (sc.rgb_color ? ((sc.brightness_pct != null || sc.color_temp_kelvin) ? ' · ' : '') + 'colour' : '');
        return '<button data-lsc="' + esc(n) + '" title="' + esc(n) + '" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 5px;border-radius:12px;border:1px solid ' + (onSel ? acc : 'var(--line)') + ';background:' + (onSel ? 'rgba(201,163,94,.10)' : 'var(--panel2)') + ';cursor:pointer">'
          + '<span style="width:26px;height:26px;border-radius:50%;background:' + sw + ';box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 1px 3px rgba(0,0,0,.45)"></span>'
          + '<span style="font-size:11px;color:var(--ink);line-height:1.1;text-align:center">' + esc(n) + '</span>'
          + (ds ? '<span style="font-size:9px;color:var(--faint)">' + esc(ds) + '</span>' : '')
          + '</button>';
      }).join('');
      $$('#mdlights [data-lsc]').forEach(function (c) { c.onclick = function () { post('/api/ha/lightscene', { scene: c.dataset.lsc }).then(function (r) { toast(r.ok ? '💡 ' + c.dataset.lsc : 'Lights unavailable'); }); }; });
    }).catch(function () {});
    var _mdlbr = $('#mdlbr');
    if (_mdlbr) {
      _mdlbr.oninput = function () { var v = $('#mdlbrv'); if (v) v.textContent = this.value + '%'; };
      _mdlbr.onchange = function () { post('/api/ha/service', { domain: 'light', service: 'turn_on', data: { entity_id: (settings.ha && settings.ha.lights) || [], brightness_pct: +this.value, transition: 1 } }).then(function () { toast('Brightness ' + _mdlbr.value + '%'); }); };
    }
    $('#mdloff').onclick = function () { post('/api/ha/service', { domain: 'light', service: 'turn_off', data: { entity_id: (settings.ha && settings.ha.lights) || [], transition: 1 } }).then(function () { toast('Lights off'); }); };
    mdMusicRefresh();
  }
  function launch(id) {
    recordRecent(id);   // v2.44 (exec4)
    var cards = $$('#pcards .pcard');
    var start = cards.findIndex(function (c) { return c.dataset.id === id; });
    cards.forEach(function (c, i) {
      var d = Math.abs(i - (start < 0 ? 0 : start));
      setTimeout(function () { c.classList.add('rip'); setTimeout(function () { c.classList.remove('rip'); }, 950); }, d * 70);
    });
    post('/api/game/' + encodeURIComponent(id));
  }
  /* v2.0 PHASES — the Now Playing bar carries the mode's own chapters (state.phases
     from the conductor). Tap a chip to jump; the gold button advances. Replaces the
     old hardcoded "Advance phase — next: Intermission" engine-mode button. */
  function renderPhaseBtn(s) {
    var rail = $('#phaserail'); if (!rail) return;
    var phs = s.phases;
    var on = !!s.live && s.game !== '_draft' && phs && phs.length;
    if (!on) { rail.classList.remove('show'); rail.innerHTML = ''; return; }
    var curIx = -1;
    phs.forEach(function (p2, i) { if (p2.id === s.phaseId) curIx = i; });
    var baseName = (profiles[s.game] && profiles[s.game].name) || s.game;
    var h = '<span class="pdot' + (s.phaseId ? '' : ' on') + '" data-phz="" title="Back to the base mode">● ' + esc(baseName) + '</span>'
      + phs.map(function (p2) { return '<span class="pdot' + (p2.id === s.phaseId ? ' on' : '') + '" data-phz="' + esc(p2.id) + '">' + (p2.icon ? p2.icon + ' ' : '') + esc(p2.name) + '</span>'; }).join('');
    var next = (curIx < phs.length - 1) ? phs[curIx + 1] : null;
    if (next) h += '<button class="pnext" data-phz="' + esc(next.id) + '">▸ ' + (next.icon ? next.icon + ' ' : '') + esc(next.name) + '</button>';
    rail.innerHTML = h; rail.classList.add('show');
    $$('#phaserail [data-phz]').forEach(function (el) { el.onclick = function () { post('/api/phase', { phase: el.dataset.phz || null }); }; });
  }
  function tvIds() { return haRoom && haRoom.tvs ? Object.keys(haRoom.tvs).map(function (k) { return haRoom.tvs[k]; }).filter(Boolean) : []; }
  function setAllTvs(on) {                       // v2.14: toggle only the TVs whose state disagrees
    refreshHaRoom().then(function () {
      var ids = [];
      FRAME_IDS.forEach(function (f) { var e = tvEnt(f); if (e && ((tvStateOf(f) === 'on') !== on)) ids.push(e); });
      if (!ids.length) return toast(on ? 'All TVs are already awake' : 'All TVs are already asleep');
      post('/api/ha/service', { domain: 'media_player', service: 'turn_off', data: { entity_id: ids } });
      toast((on ? 'Waking ' : 'Art / sleep — ') + ids.length + ' TV' + (ids.length > 1 ? 's' : ''));
      setTimeout(function () { refreshHaRoom().then(renderScreenRows); }, 2600);
    });
  }
  $('#rtvon').onclick = function () { setAllTvs(true); };
  $('#rtvart').onclick = function () { setAllTvs(false); };
  /* ---- per-frame TV wake/sleep (Play popover + ⚙ Displays card) ---- */
  function tvEnt(fid) { return haRoom && haRoom.tvs ? haRoom.tvs[fid] : ''; }
  function tvState(fid) { var e = tvEnt(fid); return e && haRoom.states ? haRoom.states[e] : null; }
  function refreshHaRoom() { return api('/api/ha/room').then(function (j) { if (j) haRoom = j; return haRoom; }).catch(function () { return haRoom; }); }
  function tvStateOf(fid) { var sob = tvState(fid); return (sob && typeof sob === 'object') ? sob.state : sob; }
  /* v2.14 Samsung quirk: turn_on does nothing (no Wake-on-LAN) and turn_off is really the
     POWER TOGGLE — so read the TV's actual state first and only toggle when it disagrees. */
  function setTv(fid, on) {
    var e = tvEnt(fid);
    if (!e) return toast(fid + ' has no TV mapped in Home Assistant');
    refreshHaRoom().then(function () {
      var isOn = tvStateOf(fid) === 'on';
      if (on === isOn) return toast(fid + (on ? ' is already awake' : ' is already asleep'));
      post('/api/ha/service', { domain: 'media_player', service: 'turn_off', data: { entity_id: e } });
      toast(fid + (on ? ' — waking' : ' — art / sleep'));
      setTimeout(function () { refreshHaRoom().then(renderScreenRows); }, 2600);
    });
  }
  function focusTv(fid) {                        // v2.14: state-aware wake + drag the TV back to the room's HDMI input
    var ids = fid ? [tvEnt(fid)].filter(Boolean) : tvIds();
    if (!ids.length) return toast(fid ? fid + ' has no TV mapped in Home Assistant' : 'No TVs mapped in Home Assistant yet');
    refreshHaRoom().then(function () {
    var wake = [];
    (fid ? [fid] : FRAME_IDS).forEach(function (f) { var e = tvEnt(f); if (e && tvStateOf(f) !== 'on') wake.push(e); });
    if (wake.length) post('/api/ha/service', { domain: 'media_player', service: 'turn_off', data: { entity_id: wake } });   // power toggle = wake
    toast((fid || 'All TVs') + ' — grabbing focus\u2026');
    setTimeout(function () {
      ids.forEach(function (en) {
        var sob = haRoom.states && haRoom.states[en];
        var list = (sob && sob.source_list) || [];
        var src = null;
        for (var i = 0; i < list.length; i++) if (/hdmi\s*_?-?\s*4/i.test(list[i])) { src = list[i]; break; }
        if (!src) for (var j = 0; j < list.length; j++) if (/hdmi/i.test(list[j])) { src = list[j]; break; }
        post('/api/ha/service', { domain: 'media_player', service: 'select_source', data: { entity_id: en, source: src || 'HDMI' } });
      });
      setTimeout(function () { refreshHaRoom().then(renderScreenRows); }, 1600);
    }, wake.length ? 4200 : 1400);
    });
  }
  function screenRowsHTML() {
    if (!haRoom || !haRoom.configured) return '<div class="hint">Home Assistant not configured — see HA-SETUP.md</div>';
    return FRAME_IDS.map(function (f) {
      var e = tvEnt(f), sob = tvState(f);
      var st = (sob && typeof sob === 'object') ? sob.state : sob;   // /api/ha/room returns {state,name,…} per entity
      var on = st === 'on';
      return '<div class="screenrow"><span class="sfid"><i class="' + (on ? 'on' : '') + '"></i>' + f + '</span>'
        + '<span class="sfst">' + (e ? esc(st || 'unknown') : 'not mapped') + '</span>'
        + '<button class="btn sm" data-screenwake="' + f + '">🖼 Wake</button>'
        + '<button class="btn sm gh" data-screensleep="' + f + '">🌙 Sleep</button>'
        + '<button class="btn sm gh" data-screenfocus="' + f + '" title="Wake + switch this TV back to the room\u2019s HDMI input">🎯</button></div>';
    }).join('');
  }
  function renderScreenRows() {
    ['#screenrows', '#cfgscreens'].forEach(function (sq) {
      var box = $(sq); if (!box) return;
      box.innerHTML = screenRowsHTML() + '<div style="margin-top:10px"><button class="btn sm" id="' + sq.slice(1) + 'focusall">🎯 Grab focus — all TVs → HDMI</button></div>';
      var fa = $(sq + 'focusall'); if (fa) fa.onclick = function () { focusTv(null); };
      $$(sq + ' [data-screenwake]').forEach(function (b) { b.onclick = function () { setTv(b.dataset.screenwake, true); }; });
      $$(sq + ' [data-screensleep]').forEach(function (b) { b.onclick = function () { setTv(b.dataset.screensleep, false); }; });
      $$(sq + ' [data-screenfocus]').forEach(function (b) { b.onclick = function () { focusTv(b.dataset.screenfocus); }; });
    });
  }
  var rscreensBtn = $('#rscreens');
  if (rscreensBtn) rscreensBtn.onclick = function (e) {
    var pop = $('#screensPop'); var r = e.currentTarget.getBoundingClientRect();
    pop.style.position = 'absolute';   // v2.44: the Now-bar TV dots may have switched it to fixed
    pop.style.left = Math.max(8, r.left) + 'px'; pop.style.top = (r.top - 10) + 'px'; pop.style.transform = 'translateY(-100%)';
    pop.classList.toggle('on');
    if (pop.classList.contains('on')) refreshHaRoom().then(renderScreenRows);
  };
  D.addEventListener('click', function (e) { if (!e.target.closest('#screensPop') && !e.target.closest('#rscreens') && !e.target.closest('#tvstat')) { var sp = $('#screensPop'); if (sp) sp.classList.remove('on'); } });
  /* v2.44 (QW6): the TV dots in the truth bar are a tap target — a grey dot gets a one-tap remedy */
  var tvStat = $('#tvstat');
  if (tvStat) {
    tvStat.style.cursor = 'pointer';
    tvStat.title = 'Tap — wake / sleep / focus each screen';
    tvStat.onclick = function () {
      var pop = $('#screensPop'); if (!pop) return;
      var r = tvStat.getBoundingClientRect();
      pop.style.position = 'fixed';   // the bar lives outside the scrolling view the popover is normally absolute in
      pop.style.left = Math.max(8, r.left) + 'px'; pop.style.top = (r.bottom + 8) + 'px'; pop.style.transform = 'none';
      pop.classList.toggle('on');
      if (pop.classList.contains('on')) refreshHaRoom().then(renderScreenRows);
    };
  }
  /* ---- Display-PC media-sync status (⚙ Display PCs card) ---- */
  var edgePoll = null, edgeLast = {}, edgeFail = {};
  function fmtGB(b) { return b ? (b / 1e9).toFixed(1) + ' GB' : ''; }
  function fmtSpeed(bps) { if (!bps || bps < 1) return ''; return bps >= 1e6 ? (bps / 1e6).toFixed(1) + ' MB/s' : Math.max(1, Math.round(bps / 1e3)) + ' KB/s'; }
  function fmtETA(s) { if (s == null || !isFinite(s) || s < 0) return ''; if (s < 90) return '~' + Math.round(s) + ' s'; var m = Math.round(s / 60); if (m < 90) return '~' + m + ' min'; return '~' + Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
  function fmtSize(b) { if (!b) return '0'; if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'; if (b >= 1e6) return (b / 1e6).toFixed(0) + ' MB'; return Math.max(1, Math.round(b / 1e3)) + ' KB'; }
  function renderEdges() {
    var box = $('#edgerows');
    if (!box) { if (edgePoll) { clearInterval(edgePoll); edgePoll = null; } return; }   // sheet closed → stop polling
    api('/api/edges').then(function (j) {
      if (!$('#edgerows')) return;
      var edges = (j && j.edges) || [];
      if (!edges.length) { box.className = 'hint'; box.innerHTML = 'No display PCs configured.'; return; }
      box.className = '';
      box.innerHTML = edges.map(function (cur) {
        // Keep the last good snapshot through transient timeouts (a busy syncing PC
        // sometimes replies late over congested WiFi) so the row doesn't flash "offline".
        // Only actually show offline after several consecutive misses, or if never seen.
        var e = cur, stale = false;
        if (cur.ok) { edgeLast[cur.url] = cur; edgeFail[cur.url] = 0; }
        else { edgeFail[cur.url] = (edgeFail[cur.url] || 0) + 1; if (edgeLast[cur.url] && edgeFail[cur.url] < 4) { e = edgeLast[cur.url]; stale = true; } }
        if (!e.ok) return '<div class="edgerow"><div class="er-h"><b>' + esc(cur.name) + '</b><span class="er-st er-off">offline</span></div><div class="hint">' + esc(cur.error || 'unreachable') + '</div><button class="btn sm gh" data-edgesync="' + esc(cur.url) + '">⟳ Retry</button></div>';
        var lib = e.library, pw = e.prewarm || {};
        var total = lib ? lib.total : (pw.total || 0);
        var present = lib ? lib.present : 0;
        // progress by BYTES when available (videos dominate size, so this tracks time far better than file count)
        var bytePct = (lib && lib.bytes) ? Math.min(100, Math.round((lib.bytesPresent || 0) / lib.bytes * 100)) : null;
        var pct = bytePct != null ? bytePct : (total ? Math.min(100, Math.round(present / total * 100)) : (pw.running ? 0 : 100));
        var running = !!pw.running;
        var st;
        if (running) { var sp = fmtSpeed(pw.speedBps), eta = fmtETA(pw.etaS); st = 'Syncing… ' + pct + '%' + (sp ? ' · ' + sp : '') + (eta ? ' · ' + eta + ' left' : ''); }
        else if (total && present >= total) st = '✓ Up to date · ' + total + ' files';
        else if (total) st = (total - present) + ' of ' + total + ' missing';
        else st = 'Idle';
        var sub = '';
        if (pw.videos || pw.images) {
          var v = pw.videos || { total: 0, done: 0 }, im = pw.images || { total: 0, done: 0 };
          if (v.total || im.total) sub = 'Videos ' + v.done + ' / ' + v.total + ' · Images ' + im.done + ' / ' + im.total;
        }
        var orph = e.orphans;
        var orTxt = (orph && orph.count) ? (orph.count + ' orphan' + (orph.count === 1 ? '' : 's') + ' · ' + fmtSize(orph.bytes)) : (orph ? 'no orphans' : '');
        var cleanDis = running || !(orph && orph.count);
        return '<div class="edgerow"><div class="er-h"><b>' + esc(e.name) + '</b><span class="er-st">' + st + (lib && lib.bytes ? ' · ' + fmtGB(lib.bytes) : '') + (stale ? ' <span style="opacity:.55">· updating…</span>' : '') + '</span></div>'
          + '<div class="er-bar"><i class="' + (running ? 'on' : '') + '" style="width:' + pct + '%"></i></div>'
          + (sub ? '<div class="hint" style="margin:-1px 0 5px">' + sub + '</div>' : '')
          + (pw.failed ? '<div class="hint" style="color:#e8886f">' + pw.failed + ' failed' + (running ? ' so far' : ' last pass') + '</div>' : '')
          + (e.lastCleanup && e.lastCleanup.removed ? '<div class="hint">last clean-up removed ' + e.lastCleanup.removed + ' file' + (e.lastCleanup.removed === 1 ? '' : 's') + '</div>' : '')
          + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm gh" data-edgesync="' + esc(e.url) + '"' + (running ? ' disabled' : '') + '>⟳ Sync this PC</button>'
          + '<button class="btn sm gh" data-edgeclean="' + esc(e.url) + '"' + (cleanDis ? ' disabled' : '') + '>Clean up</button>'
          + '<button class="btn sm gh" data-edgescreens="' + esc(e.url) + '">⇄ Arrange screens</button>'
          + (orTxt ? '<span class="hint">' + orTxt + '</span>' : '') + '</div></div>';
      }).join('');
      box.querySelectorAll('[data-edgesync]').forEach(function (b) { b.onclick = function () { syncEdge(b.dataset.edgesync); }; });
      box.querySelectorAll('[data-edgeclean]').forEach(function (b) { b.onclick = function () { cleanEdge(b.dataset.edgeclean); }; });
      box.querySelectorAll('[data-edgescreens]').forEach(function (b) { b.onclick = function () { openScreensSheet(b.dataset.edgescreens); }; });
      var totO = edges.reduce(function (a, e) { return a + ((e.ok && e.orphans) ? (e.orphans.count || 0) : 0); }, 0);
      var totB = edges.reduce(function (a, e) { return a + ((e.ok && e.orphans) ? (e.orphans.bytes || 0) : 0); }, 0);
      var eca = $('#edgecleanall'); if (eca) { eca.textContent = totO ? ('Clean up all · ' + totO + ' · ' + fmtSize(totB)) : 'Clean up all'; eca.disabled = !totO; }
    }).catch(function () { if ($('#edgerows')) { box.className = 'hint'; box.innerHTML = 'Couldn’t reach the Conductor.'; } });
  }
  function syncEdge(url) { post('/api/edges/sync', url ? { url: url } : {}).then(function () { toast(url ? 'Sync started' : 'Sync started on all PCs'); setTimeout(renderEdges, 800); }).catch(function () { toast('Sync failed'); }); }
  function cleanEdge(url) {
    /* v2.54: in-app confirm */
    askConfirm('Clean up display PC' + (url ? '' : 's') + '?', 'Removes local copies of files that no longer exist on the NAS. Nothing on the NAS/share is touched.', 'Clean up', function () {
      post('/api/edges/cleanup', url ? { url: url } : {}).then(function (j) {
        var r = (j && j.results) || [];
        var removed = r.reduce(function (a, x) { return a + (x.removed || 0); }, 0);
        var bad = r.filter(function (x) { return !x.ok; });
        toast(bad.length ? 'Clean-up: ' + bad.length + ' PC(s) unreachable' : ('Removed ' + removed + ' orphan file' + (removed === 1 ? '' : 's')));
        setTimeout(renderEdges, 800);
      }).catch(function () { toast('Clean-up failed'); });
    }, true);
  }
  /* ---- Audio: per-PC HDMI port map (⚙ Audio card) ----
     Lists every HDMI audio output on each mini-PC. ▶ plays a test tone out that port
     (so you can hear WHICH TV it is); the dropdown records port → TV. Saved to
     settings.audioMap[PC name][card,dev] = frame — the basis for routing sound. */
  var PORTMAP_CSS = '<style>.portmap{width:100%;border-collapse:collapse;margin-top:4px}'
    + '.portmap th{text-align:left;font-weight:600;opacity:.5;padding:3px 6px;font-size:11px;text-transform:uppercase;letter-spacing:.04em}'
    + '.portmap td{padding:5px 6px;border-top:1px solid rgba(255,255,255,.07);vertical-align:middle;font-size:13px}'
    + '.portmap select{width:100%;min-width:96px}.portmap .pmhw{opacity:.55;white-space:nowrap}</style>';
  function allFrames() { return (settings.ha && settings.ha.tvs && Object.keys(settings.ha.tvs).length) ? Object.keys(settings.ha.tvs) : FRAME_IDS.slice(); }   /* v2.64: fallback from layout, not a literal */
  function renderAudioPorts() {
    var box = $('#audiorows'); if (!box) return;
    settings.audioMap = settings.audioMap || {};
    var frames = allFrames();
    api('/api/edges/audio').then(function (j) {
      if (!$('#audiorows')) return;
      var edges = (j && j.edges) || [];
      if (!edges.length) { box.className = 'hint'; box.innerHTML = 'No display PCs configured.'; return; }
      box.className = '';
      var fopts = [{ v: '', l: '— unassigned —' }].concat(frames.map(function (f) { return { v: f, l: f }; }));
      box.innerHTML = PORTMAP_CSS + edges.map(function (e) {
        if (!e.ok) return '<div class="edgerow"><div class="er-h"><b>' + esc(e.name) + '</b><span class="er-st er-off">offline</span></div><div class="hint">' + esc(e.error || 'unreachable') + '</div></div>';
        var devs = e.devices || [];
        if (!devs.length) return '<div class="edgerow"><div class="er-h"><b>' + esc(e.name) + '</b></div><div class="hint">No HDMI audio ports detected (are the TVs on and awake?).</div></div>';
        var map = settings.audioMap[e.name] || {};
        var rows = devs.map(function (d) {
          var key = d.card + ',' + d.dev, cur = map[key] || '';
          return '<tr><td class="pmhw">hw:' + d.card + ',' + d.dev + '</td><td>' + esc(d.name) + '</td>'
            + '<td style="white-space:nowrap"><button class="btn sm gh" data-tone="' + esc(e.url) + '␟' + key + '">▶ Play</button> '
            + '<button class="btn sm gh" data-ident="' + esc(e.name) + '␟' + key + '␟' + esc(e.url) + '">🔦 ID</button></td>'
            + '<td><select data-map="' + esc(e.name) + '␟' + key + '">' + opt(fopts, cur) + '</select></td></tr>';
        }).join('');
        return '<div class="edgerow"><div class="er-h"><b>' + esc(e.name) + '</b><span class="hint">' + devs.length + ' HDMI port' + (devs.length === 1 ? '' : 's') + '</span></div>'
          + '<table class="portmap"><thead><tr><th>Port</th><th>Device</th><th>Test</th><th>Maps to TV</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      }).join('');
      box.querySelectorAll('[data-tone]').forEach(function (b) {
        b.onclick = function () {
          var p = b.dataset.tone.split('␟'), url = p[0], cd = p[1].split(',');
          b.textContent = '♪ …'; b.disabled = true;
          post('/api/edges/tone', { url: url, card: cd[0], dev: cd[1] })
            .then(function (r) { toast((r && r.ok === false) ? ('Tone failed: ' + (r.error || '?')) : ('Tone on hw:' + p[1] + ' — listen for the TV')); })
            .catch(function () { toast('Could not reach the PC'); })
            .then(function () { setTimeout(function () { b.textContent = '▶ Play'; b.disabled = false; }, 2200); });
        };
      });
      box.querySelectorAll('[data-map]').forEach(function (s) {
        s.onchange = function () {
          var p = s.dataset.map.split('␟'), name = p[0], key = p[1];
          settings.audioMap[name] = settings.audioMap[name] || {};
          if (s.value) settings.audioMap[name][key] = s.value; else delete settings.audioMap[name][key];
          persist().then(function () { toast('Port map saved'); });
        };
      });
      box.querySelectorAll('[data-ident]').forEach(function (b) {
        b.onclick = function () {
          var p = b.dataset.ident.split('␟'), name = p[0], key = p[1], url = p[2];
          var frame = settings.audioMap[name] && settings.audioMap[name][key];
          if (!frame) { toast('Assign this port to a TV first'); return; }
          identifyOne(url, key, frame, b);
        };
      });
    }).catch(function () { if ($('#audiorows')) { box.className = 'hint'; box.innerHTML = 'Couldn’t reach the Conductor.'; } });
  }
  // flash a frame's ID on its TV + tone that port, together (audio↔video cross-check)
  function identifyOne(url, key, frame, btn) {
    var cd = key.split(',');
    if (btn) { var o = btn.textContent; btn.disabled = true; btn.textContent = '🔦 ' + frame; setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 2600); }
    post('/api/identify', { frame: frame });
    post('/api/edges/tone', { url: url, card: +cd[0], dev: +cd[1] });
  }
  // one click: walk every mapped TV in frame order, ~2.8s apart
  function walkIdentify() {
    api('/api/edges/audio').then(function (j) {
      var edges = (j && j.edges) || [], order = allFrames(), seq = [];
      edges.forEach(function (e) {
        if (!e.ok || !e.devices) return;
        var map = settings.audioMap[e.name] || {};
        e.devices.forEach(function (d) { var k = d.card + ',' + d.dev, f = map[k]; if (f) seq.push({ url: e.url, key: k, frame: f }); });
      });
      seq.sort(function (a, b) { return order.indexOf(a.frame) - order.indexOf(b.frame); });
      if (!seq.length) { toast('No ports mapped to TVs yet'); return; }
      toast('Walking the wall — watch & listen to each TV');
      seq.forEach(function (it, i) { setTimeout(function () { identifyOne(it.url, it.key, it.frame, null); toast('Identifying ' + it.frame); }, i * 2800); });
    }).catch(function () { toast('Couldn’t reach the Conductor.'); });
  }
  /* ---- drag-and-drop screen (physical output) reorder + rotation ---- */
  var scrUrl = '', scrOrder = [], scrFrames = [], scrRotate = 'left', scrConnected = [], scrLabels = true;
  var scrRots = {}, scrRotSupported = false;   // v2.02 per-screen rotation overrides (output -> left|right|inverted|'')
  function openScreensSheet(url) {
    scrUrl = url;
    openSheet('<div class="shead"><h2 id="scrnhead">Arrange screens</h2><div class="sp"></div><button class="btn gh" id="pclose">Close</button></div><div class="sbody"><div id="scrnwrap" class="hint">Reading screens…</div></div>');
    $('#pclose').onclick = closeSheet;
    api('/api/edges/screens').then(function (j) {
      var pc = ((j && j.edges) || []).filter(function (e) { return e.url === url; })[0];
      if (!pc || !pc.ok || !pc.config) { $('#scrnwrap').innerHTML = 'Could not read this PC (' + esc((pc && pc.error) || 'offline') + ').'; return; }
      var h = $('#scrnhead'); if (h) h.textContent = 'Arrange screens — ' + (pc.name || '');
      scrFrames = pc.config.frames || [];
      scrRotate = pc.config.rotate || 'left';
      scrRotSupported = pc.config.rotations !== undefined;   // old edge.js (< v1.11) doesn't report it
      scrRots = pc.config.rotations || {};
      scrConnected = pc.connected || [];
      // show only outputs that are actually connected (drop stale placeholder names), keeping configured order
      scrOrder = (pc.config.outputs || []).filter(function (o) { return scrConnected.indexOf(o) >= 0; });
      scrConnected.forEach(function (o) { if (scrOrder.indexOf(o) < 0) scrOrder.push(o); });
      paintScreens();
    }).catch(function () { $('#scrnwrap').innerHTML = 'Could not reach the Conductor.'; });
  }
  function paintScreens() {
    var wrap = $('#scrnwrap'); if (!wrap) return;
    var ROTCYCLE = ['', 'left', 'right', 'inverted'];
    function rotLabel(r) { return r === 'left' ? '↺ left' : r === 'right' ? '↻ right' : r === 'inverted' ? '⟲ 180°' : '↻ wall default'; }
    var tiles = scrOrder.map(function (o, i) {
      var live = scrConnected.indexOf(o) >= 0, frame = scrFrames[i] || ('#' + (i + 1));
      var rot = scrRots[o] || '';
      var rbtn = scrRotSupported
        ? '<button class="btn sm' + (rot ? '' : ' gh') + '" data-srot="' + esc(o) + '" title="This screen\u2019s own rotation — tap to cycle. Wall default follows the setting below; use left/right/180\u00b0 for a TV mounted the other way." style="margin-top:7px;width:100%;font-size:10.5px' + (rot ? ';border-color:var(--gold);color:var(--gold2)' : '') + '">' + rotLabel(rot) + '</button>'
        : '';
      return '<div class="scrntile" draggable="true" data-o="' + esc(o) + '"><div class="sfrm">' + esc(frame) + '</div><div class="sonm">' + esc(o) + '</div><div class="sstat ' + (live ? 'on' : 'off') + '">' + (live ? 'connected' : 'not detected') + '</div>' + rbtn + '</div>';
    }).join('');
    wrap.className = '';
    wrap.innerHTML = '<div class="hint" style="margin:0 0 10px">Only the screens that are actually connected are shown. Drag them into their real left-to-right order — each slot shows the frame it will display. Keep “Show frame IDs” on, hit Apply, then walk the wall: each TV shows its id (R1, R2…) in a corner so you can see which is which and whether the order &amp; rotation are right. Re-open and re-drag until they line up.</div>'
      + '<div class="scrnrow" id="scrnrow">' + tiles + '</div>'
      + '<label class="fld" style="margin-top:14px"><span>Wall default rotation' + T('Portrait rotation for the whole wall. A screen\u2019s own rotation chip (on its tile above) overrides this for just that TV — for the one mounted the other way round.') + '</span><select id="scrnrot">' + opt([{ v: 'left', l: 'Portrait — rotate left' }, { v: 'right', l: 'Portrait — rotate right' }], scrRotate) + '</select></label>'
      + (scrRotSupported ? '' : '<div class="hint" style="margin-top:8px">⚠ Per-screen rotation needs the updated edge on this PC (deploy/edge.js + deploy/xinitrc, then restart immersion-edge) — until then only the wall-wide rotation applies.</div>')
      + '<label class="chk" style="margin-top:10px"><input type="checkbox" id="scrnlbl"' + (scrLabels ? ' checked' : '') + '> Show frame IDs on the screens (to identify each TV)</label>'
      + '<div style="display:flex;gap:8px;margin-top:14px;align-items:center"><button class="btn" id="scrnapply">Apply &amp; restart this wall</button><span class="hint" id="scrnmsg"></span></div>';
    $('#scrnrot').onchange = function () { scrRotate = this.value; };
    $('#scrnlbl').onchange = function () { scrLabels = this.checked; };
    $('#scrnapply').onclick = applyScreens;
    $$('#scrnrow [data-srot]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var o = b.dataset.srot, cur = scrRots[o] || '';
        var nx = ROTCYCLE[(ROTCYCLE.indexOf(cur) + 1) % ROTCYCLE.length];
        if (nx) scrRots[o] = nx; else delete scrRots[o];
        paintScreens();
      };
    });
    var dragO = null;
    $$('#scrnrow .scrntile').forEach(function (t) {
      t.addEventListener('dragstart', function () { dragO = t.dataset.o; t.style.opacity = '.4'; });
      t.addEventListener('dragend', function () { t.style.opacity = ''; });
      t.addEventListener('dragover', function (e) { e.preventDefault(); t.classList.add('drop'); });
      t.addEventListener('dragleave', function () { t.classList.remove('drop'); });
      t.addEventListener('drop', function (e) {
        e.preventDefault(); t.classList.remove('drop');
        var from = scrOrder.indexOf(dragO), to = scrOrder.indexOf(t.dataset.o);
        if (from >= 0 && to >= 0 && from !== to) { scrOrder.splice(to, 0, scrOrder.splice(from, 1)[0]); paintScreens(); }
      });
    });
  }
  function applyScreens() {
    var msg = $('#scrnmsg'); if (msg) msg.textContent = 'Applying…';
    var rotBody = {};
    if (scrRotSupported) { scrOrder.forEach(function (o) { rotBody[o] = scrRots[o] || ''; }); }
    post('/api/edges/screens', { url: scrUrl, order: scrOrder, rotate: scrRotate, labels: scrLabels, rotations: scrRotSupported ? rotBody : undefined }).then(function (j) {
      if (msg) msg.textContent = (j && j.ok) ? 'Applied — this wall is restarting; the frame ids flash so you can check.' : ('Failed: ' + ((j && j.error) || '?'));
    }).catch(function () { if (msg) msg.textContent = 'Failed to reach the Conductor.'; });
  }
  $('#rlights').onclick = function (e) {
    var pop = $('#lightsPop'); var r = e.currentTarget.getBoundingClientRect();
    pop.style.left = r.left + 'px'; pop.style.top = (r.top - 10) + 'px'; pop.style.transform = 'translateY(-100%)';
    pop.classList.toggle('on');
  };
  $('#rphotos').onclick = function () {
    var id = vids().find(function (k) { return (profiles[k].frames || []).indexOf('photos') >= 0; });
    if (id) launch(id); else toast('No mode uses Photo frames yet — set one up in Design');
  };
  /* v2.54 (delight 9a): ✨ Surprise me — a random reveal on a random live frame.
     Same POST /api/reveal body the reveal bar / mode dashboard use ({frame:'L1'|'all'});
     the frame comes from the health list of connected frames when we have one. */
  var rsurBtn = $('#rsurprise');
  if (rsurBtn) rsurBtn.onclick = function () {
    var pool = (health && health.frames && health.frames.length) ? health.frames.slice() : FRAME_IDS.slice();
    var f = pool[Math.floor(Math.random() * pool.length)] || 'all';
    post('/api/reveal', { frame: f }).then(function () { toast('✨ Keep an eye on ' + f + '…'); }).catch(function () { toast('Could not reach the Conductor'); });
  };
  D.addEventListener('click', function (e) { if (!e.target.closest('#lightsPop') && !e.target.closest('#rlights')) $('#lightsPop').classList.remove('on'); });

  /* ---------------- DESIGN: draft machinery ---------------- */
  function selectMode(id, silent) {
    var go = function () {
      cancelPreviewPush();   // v2.33: pending push of the OLD mode's draft must not fire after switching
      curId = id;
      draft = normalize(clone(profiles[id] || { name: id }));
      dirty = false; sel = []; phaseSel = null;
      if (space === 'design') { renderStrip(); paintCanvas(); renderInspector(); updateDirtyUI(); }
    };
    /* v2.54: in-app confirm (was browser confirm) — callers never used the return value */
    if (dirty && !silent) askConfirm('Discard unsaved changes?', 'Unsaved changes to “' + ((draft && draft.name) || curId) + '” will be lost.', 'Discard', go, true); else go();
  }
  function __rsEq(a,b){ try{ return JSON.stringify(a)===JSON.stringify(b); }catch(e){ return a===b; } }
  function __rsClone(x){ try{ return x==null?x:JSON.parse(JSON.stringify(x)); }catch(e){ return x; } }
  function __rsDiff(base,cur){ if(__rsEq(base,cur)) return undefined; if(Array.isArray(cur)) return __rsClone(cur); if(cur===null||typeof cur!=='object') return cur; if(base===null||typeof base!=='object'||Array.isArray(base)) return __rsClone(cur); var out={},any=false; Object.keys(cur).forEach(function(k){ var d=__rsDiff(base[k],cur[k]); if(d!==undefined){ out[k]=d; any=true; } }); return any?out:undefined; }
  function __rsActivePhase(){ if(!phaseSel||!draft||!Array.isArray(draft.phases)) return null; var ph=null; draft.phases.forEach(function(x){ if(x&&x.id===phaseSel) ph=x; }); return ph; }
  /* v2.88 PHASE PATCH GUARD. A phase patch says what THIS phase overrides INSIDE the
     mode — it must never carry the mode's own STRUCTURE. __rsDiff clones whole arrays,
     so before this guard any edit made while a phase chip was selected serialised
     draft.phases into that phase's own patch. Consequences seen live on alienfate:
       · "Remove phase" never shrank the list — the removal only happened inside the
         patch, while draft.phases (what gets saved) kept every phase;
       · each chip then rendered a DIFFERENT stale snapshot of the rail (the wrapped
         renderInspector below shows effDraft(), and mergePatchC replaces arrays
         wholesale), so phases appeared to vanish, duplicate and reorder;
       · every further edit re-snapshotted, nesting phases-inside-patches-inside-
         phases and ballooning profiles.json.
     Keys listed here are stripped from every patch we write. 'phases' is the
     recursion. 'name' is the mode's own title — a phase renaming the mode is never
     what anyone meant, and it poisons the merged draft the inspector renders from.
     Also listed: category / hidden / order / room / icon — where a mode SITS in Play
     and whether it is visible are properties of the mode, never of one chapter of it.
     Their handlers use edBase() now; this list is the belt to that pair of braces. */
  var __RS_NOPATCH = ['phases', 'name', 'category', 'hidden', 'order', 'room', 'icon'];
  function __rsStripStructural(np){ if(!np||typeof np!=='object'||Array.isArray(np)) return np; __RS_NOPATCH.forEach(function(k){ delete np[k]; }); return np; }
  /* edBase = "this edit is about the mode itself, not the phase I happen to be
     looking at" — add / remove / reorder phases MUST use it. Routing them through
     ed() was the delete bug: with the phase selected, ed() wrote the shortened list
     into that phase's patch and left the real list untouched. */
  function edBase(fn){ fn(draft); dirty=true; updateDirtyUI(); paintCanvas(); if(previewOn) schedPreview(); }
  function ed(fn){ var ph=__rsActivePhase(); if(ph){ var merged=__rsClone(effDraft()); fn(merged); var np=__rsDiff(draft,merged); np=(np===undefined)?{}:np; try{ if(JSON.stringify(mergePatchC(draft,np))!==JSON.stringify(merged)) np=__rsClone(merged); }catch(e){} ph.patch=__rsStripStructural(np); dirty=true; updateDirtyUI(); paintCanvas(); if(previewOn) schedPreview(); return; } fn(draft); dirty=true; updateDirtyUI(); paintCanvas(); if(previewOn) schedPreview(); }
  /* v2.64: draft bridge for the appended RS-PLAYLIST-UI / RS-SHEET-NAV blocks — their
     per-frame playlist card now edits draft.framePlaylists[] through the NORMAL ed()
     path (dirty flag, preview, phase patches, Save persists via profiles) instead of
     instant-POSTing /api/playlists. Read-only accessors + the one mutator, nothing else. */
  window.__rsDraft = {
    ed: function (fn) { if (draft) ed(fn); },
    get: function () { return draft; },
    id: function () { return curId; },
    frameCount: function () { return FRAME_IDS.length; }
  };
  window.__rsPhase={ get sel(){ return phaseSel; }, setSel:function(v){ phaseSel=v||null; try{renderStrip();}catch(e){} paintCanvas(); renderInspector(); }, list:function(){ return (draft&&draft.phases)||[]; }, modeName:function(){ return draft&&(draft.name||''); }, add:function(name){ if(!draft) return null; if(!Array.isArray(draft.phases)) draft.phases=[]; var b=(name||'phase').replace(/[^a-z0-9]/gi,'').toLowerCase()||'phase',id=b,n=2,has=function(x){ return draft.phases.some(function(p){return p&&p.id===x;}); }; while(has(id)){ id=b+n; n++; } draft.phases.push({id:id,name:name||('Phase '+(draft.phases.length+1)),patch:{}}); dirty=true; updateDirtyUI(); phaseSel=id; try{renderStrip();}catch(e){} paintCanvas(); renderInspector(); return id; }, rename:function(id,name){ (draft.phases||[]).forEach(function(p){ if(p&&p.id===id) p.name=name; }); dirty=true; updateDirtyUI(); try{renderStrip();}catch(e){} renderInspector(); }, del:function(id){ if(!draft||!draft.phases) return; draft.phases=draft.phases.filter(function(p){return p&&p.id!==id;}); if(phaseSel===id) phaseSel=null; dirty=true; updateDirtyUI(); try{renderStrip();}catch(e){} paintCanvas(); renderInspector(); }, repaint:function(){ try{renderStrip();}catch(e){} paintCanvas(); renderInspector(); } };
  try{ var __rsOrigRI=renderInspector; renderInspector=function(){ var __s=draft, __p=__rsActivePhase(); if(__p){ draft=__rsClone(effDraft()); } try{ return __rsOrigRI.apply(this,arguments); } finally{ draft=__s; } }; }catch(e){}
  function updateDirtyUI() {
    $('#savebar').classList.toggle('show', dirty || previewOn);
    $('#dirtynote').textContent = dirty ? 'Unsaved changes to “' + (draft.name || curId) + '”' : (previewOn ? 'Previewing draft on the TVs' : '');
    $$('#strip .scard').forEach(function (c) { c.classList.toggle('dirty', dirty && c.dataset.id === curId); });
  }
  var _pv = null;
  function schedPreview() { clearTimeout(_pv); _pv = setTimeout(pushDraft, 700); }
  function cancelPreviewPush() { clearTimeout(_pv); _pv = null; }   // v2.33: kill any pending draft push
  function pushDraft() {
    if (!previewOn) return;   // v2.33: a stale timer must never push the draft after Save/preview-off/revert
    var payload = clone(profiles); payload._draft = clone(draft); payload._draft.name = (draft.name || curId);
    post('/api/profiles', { profiles: payload, tagmap: tagmap, settings: settings }).then(function () {
      if (!live.state || live.state.game !== '_draft') return post('/api/game/_draft');
    });
  }
  /* v2.54: the off-branch is factored out so the Now bar's "· PREVIEW" tap target can share it */
  function endPreview() {
    previewOn = false; $('#pvw').classList.remove('on');
    cancelPreviewPush(); post('/api/game/' + encodeURIComponent(prevGame || atRestId())); toast('Preview off — room restored');   /* Phase 2c */
    updateDirtyUI();
  }
  $('#pvw').onclick = function () {
    if (previewOn) { endPreview(); return; }
    previewOn = true;
    $('#pvw').classList.add('on');
    prevGame = (live.state && live.state.game !== '_draft') ? live.state.game : atRestId();   /* Phase 2c */
    pushDraft(); toast('● Draft is live on the TVs');
    updateDirtyUI();
  };
  function persist(extra) {
    var payload = clone(profiles); delete payload._draft;
    return post('/api/profiles', { profiles: payload, tagmap: tagmap, settings: settings }).then(function (j) { return j; });
  }
  $('#save').onclick = function () {
    cancelPreviewPush();   // v2.33: edit→Save within 700ms used to fire the pending pushDraft AFTER save, flipping the room back to _draft
    // v2.34: don't commit to the local model until the server accepts. Previously a
    // rejected save (409/outage) left the unsaved content in `profiles`, where any
    // LATER unrelated persist() (rename, hide) would launder it past the guard.
    var prevProfile = profiles[curId];
    profiles[curId] = clone(draft);
    var rollback = function () {
      profiles[curId] = prevProfile;
      renderStrip(); renderPlay(); updateDirtyUI();
      toast('⚠ Save failed — your changes are still unsaved');
    };
    persist().then(function (j) {
      if (!j || !j.ok) return rollback();
      dirty = false;
      var wasPreview = previewOn; previewOn = false; $('#pvw').classList.remove('on');
      if (wasPreview) post('/api/game/' + encodeURIComponent(curId));
      renderStrip(); renderPlay(); updateDirtyUI();
      $('#savebar').classList.add('saved'); setTimeout(function () { $('#savebar').classList.remove('saved'); }, 1200);
      toast('✓ Saved “' + (draft.name || curId) + '”');
    }).catch(rollback);
  };
  $('#saveas').onclick = function () {
    /* v2.44 (QW4): ONE ask for a display name — the internal id is derived, never asked for.
       v2.54: re-housed in the askText sheet (same logic, no browser prompt). */
    askText('Name the new mode', 'Halloween dinner…', (draft.name || curId) + ' variant', function (name) {
    var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'mode';
    var id = freshId(slug);
    cancelPreviewPush();   // v2.33
    var prevId = curId;   // v2.34: rollback support
    draft.name = name; profiles[id] = clone(draft);
    curId = id; dirty = false;
    var rollback = function () {
      delete profiles[id]; curId = prevId; dirty = true;
      renderStrip(); renderPlay(); renderInspector(); updateDirtyUI();
      toast('⚠ Save failed — new mode not created');
    };
    persist().then(function (j) {
      if (!j || !j.ok) return rollback();
      var wasPreview = previewOn; previewOn = false; $('#pvw').classList.remove('on');
      if (wasPreview) post('/api/game/' + encodeURIComponent(id));
      renderStrip(); renderPlay(); renderInspector(); updateDirtyUI();
      toast('✓ Saved as new mode “' + name + '”');
    }).catch(rollback);
    });   // v2.54: end askText callback
  };
  $('#revert').onclick = function () { cancelPreviewPush(); draft = normalize(clone(profiles[curId])); dirty = false; sel = []; paintCanvas(); renderInspector(); updateDirtyUI(); toast('Reverted'); };   // v2.33: cancel pending push
  D.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (space === 'design') $('#save').click(); }
    if (e.key === 'Escape') { $('#scrim').classList.remove('on'); $('#lightsPop').classList.remove('on'); }
  });

  /* ---------------- DESIGN: mode strip (v2.0 — ＋New pinned first, grouped, context menu) ---------------- */
  function stripCard(id) {
    var p = profiles[id], th = sceneThumb(p.scene);
    var isLive = !!(live.state && live.state.game === id);
    return '<div class="scard' + (id === curId ? ' sel' : '') + (p.hidden ? ' hid' : '') + '" data-id="' + id + '"' + (th ? ' style="background-image:url(\'' + th.replace(/'/g, '%27') + '\')"' : '') + '>'
      + '<div class="shade"></div>' + (p.hidden ? '<span class="hidtag">hidden</span>' : '') + (isLive ? '<span class="livetag">LIVE</span>' : '')
      + '<div class="nm">' + esc(p.name || id) + '</div></div>';
  }
  function renderStrip() {
    var secs = playSections(), ids = vids();
    /* v2.66: search in Design too — the old header pill filtered BOTH spaces; the
       v2.54 move into #pcats made it Play-only. Same query, same mechanism. */
    var h = '<div class="scard srch"><input type="search" id="scsearch" placeholder="🔍 Search" autocomplete="off" spellcheck="false" value="' + esc(window.__rsModeSearchQ || '') + '" style="width:100%;height:100%;background:none;border:0;color:inherit;font:inherit;text-align:center;outline:none"></div>';
    h += '<div class="scard add" id="addmode" title="Create a new mode">＋ New<br>mode</div>';
    if (secs.length) {
      var used = {};
      secs.forEach(function (s2) {
        var group = ids.filter(function (id) { return (profiles[id].category || '') === s2.id; });
        group.forEach(function (id) { used[id] = 1; });
        if (group.length) h += '<div class="sdivide">' + esc(s2.name) + '</div>' + group.map(stripCard).join('');
      });
      var rest = ids.filter(function (id) { return !used[id]; });
      if (rest.length) h += (Object.keys(used).length ? '<div class="sdivide">More</div>' : '') + rest.map(stripCard).join('');
    } else h += ids.map(stripCard).join('');
    $('#strip').innerHTML = h;
    $$('#strip .scard[data-id]').forEach(function (c) {
      c.onclick = function () { selectMode(c.dataset.id); };
      c.oncontextmenu = function (e) { e.preventDefault(); openCtxMenu(e, c.dataset.id); };
      var lp;
      c.addEventListener('touchstart', function (e) { var t0 = e.touches ? e.touches[0] : e; lp = setTimeout(function () { openCtxMenu(t0, c.dataset.id); }, 550); }, { passive: true });
      ['touchend', 'touchmove', 'touchcancel'].forEach(function (ev) { c.addEventListener(ev, function () { clearTimeout(lp); }, { passive: true }); });
    });
    $('#addmode').onclick = openNewModeSheet;
    var ss = $('#scsearch');   /* v2.66: wire Design search (mirrors #pcsearch) */
    if (ss) {
      ss.oninput = function () { if (window.__rsSetModeSearch) window.__rsSetModeSearch(ss.value); };
      ss.onkeydown = function (e) { if (e.key === 'Escape') { ss.value = ''; if (window.__rsSetModeSearch) window.__rsSetModeSearch(''); ss.blur(); } e.stopPropagation(); };
      ss.onclick = function (e) { e.stopPropagation(); };
    }
    updateDirtyUI();
    renderModeHeader();
  }
  /* right-click / long-press a strip card */
  function openCtxMenu(e, id) {
    var m = $('#ctxmenu'); if (!m) return;
    var nDel = deletedIds().length;   /* v2.54: the bin lives here */
    m.innerHTML = '<button data-cx="dup">⧉ Duplicate</button>'
      + '<button data-cx="ren">✎ Rename…</button>'
      /* Phase 3c: theme modes (namespaced pack.mode ids) export their whole pack as a zip;
         legacy hand-built modes can't yet — the pack builder phase brings that. */
      + (id.indexOf('.') > 0
        ? '<button data-cx="exp" title="Download this mode’s theme pack (' + esc(id.slice(0, id.indexOf('.'))) + '.roomscape-theme.zip)">🧩 Export pack</button>'
        : '<button data-cx="expno" title="Export for hand-built modes arrives with the pack builder" style="opacity:.45">🧩 Export pack</button>')
      + '<button data-cx="hide">' + (profiles[id].hidden ? '👁 Show in Play' : '🚫 Hide from Play') + '</button>'
      + '<button data-cx="del" class="dg">🗑 Delete…</button>'
      + (nDel ? '<button data-cx="bin" style="border-top:1px solid var(--line);border-radius:0 0 8px 8px">♻ Show deleted (' + nDel + ')</button>' : '');
    m.style.left = Math.max(8, Math.min(e.clientX, window.innerWidth - 200)) + 'px';
    m.style.top = Math.max(8, Math.min(e.clientY, window.innerHeight - 190)) + 'px';
    m.classList.add('on');
    $$('#ctxmenu [data-cx]').forEach(function (b) {
      b.onclick = function () {
        m.classList.remove('on');
        var act = b.dataset.cx;
        if (act === 'dup') duplicateMode(id);
        else if (act === 'exp') exportThemePack(id.slice(0, id.indexOf('.')));   /* Phase 3c */
        else if (act === 'expno') toast('Export for hand-built modes arrives with the pack builder');   /* Phase 3c */
        else if (act === 'ren') { askText('Rename mode', '', profiles[id].name || id, function (n) { profiles[id].name = n; if (id === curId) draft.name = n; persist().then(function () { renderStrip(); renderPlay(); renderNow(); toast('Renamed'); }); }); }   /* v2.54 */
        else if (act === 'hide') { profiles[id].hidden = !profiles[id].hidden; if (id === curId) draft.hidden = profiles[id].hidden; persist().then(function () { renderStrip(); renderPlay(); toast(profiles[id].hidden ? 'Hidden from Play — still editable here' : 'Shown in Play'); }); }
        else if (act === 'del') softDeleteMode(id);   /* v2.54: soft delete + undo */
        else if (act === 'bin') openDeletedSheet();
      };
    });
  }
  D.addEventListener('click', function (e) { var m = $('#ctxmenu'); if (m && !e.target.closest('#ctxmenu')) m.classList.remove('on'); });
  function freshId(base) { base = String(base || 'mode').replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'mode'; if (base.charAt(0) === '_') base = 'm' + base; var id = base, n = 2; while (profiles[id]) id = base + (n++); return id; }
  function duplicateMode(srcId) {
    var go = function () {   // v2.44 (QW3) guard BEFORE the copy exists · v2.54 in-app confirm
      var id = freshId(srcId + '2');
      profiles[id] = clone(profiles[srcId]);
      profiles[id].name = (profiles[srcId].name || srcId) + ' copy';
      persist().then(function () { selectMode(id, true); renderStrip(); renderPlay(); toast('Duplicated — now make it yours'); });
    };
    if (dirty) askConfirm('Discard unsaved changes?', 'Unsaved changes to “' + ((draft && draft.name) || curId) + '” will be lost.', 'Discard', go, true); else go();
  }
  /* v2.54: SOFT delete — the mode moves to a hidden Deleted group (p.deleted = now),
     the toast carries Undo, the strip context menu grows a ♻ Show deleted bin with
     Restore / Delete forever, and boot purges anything older than 30 days. */
  function softDeleteMode(id) {
    var nm = (profiles[id] && profiles[id].name) || id;
    askConfirm('Delete mode “' + nm + '”?', 'It moves to Deleted and is kept for 30 days — Undo from the toast, or restore it later via ♻ Show deleted (long-press any mode in the Design strip).', 'Delete', function () {
      if (!profiles[id]) return;
      profiles[id].deleted = Date.now();
      persist().then(function () {
        if (id === curId) selectMode(vids()[0], true);
        renderStrip(); renderPlay();
        toast('“' + nm + '” deleted', { label: 'Undo', fn: function () {
          if (!profiles[id]) return;
          delete profiles[id].deleted;
          persist().then(function () { renderStrip(); renderPlay(); toast('“' + nm + '” is back'); });
        } });
      });
    }, true);
  }
  function openDeletedSheet() {
    openSheet('<div class="shead"><h2>♻ Deleted modes</h2><div class="sp"></div><button class="btn gh" id="pclosedel">Close</button></div><div class="sbody" id="delbody"></div>');
    $('#pclosedel').onclick = closeSheet;
    function paint() {
      var ids = deletedIds();
      $('#delbody').innerHTML = ids.length ? ids.map(function (id) {
        var p = profiles[id], days = Math.max(0, 30 - Math.floor((Date.now() - (p.deleted || Date.now())) / 86400000));
        return '<div class="card" style="display:flex;align-items:center;gap:12px"><div style="flex:1;min-width:0"><b>' + esc(p.name || id) + '</b><div class="hint">gone for good in ' + days + ' day' + (days === 1 ? '' : 's') + '</div></div>'
          + '<button class="btn" data-rest="' + esc(id) + '" style="min-height:44px">↩ Restore</button><button class="btn gh dg" data-perma="' + esc(id) + '" style="min-height:44px">Delete forever</button></div>';
      }).join('') : '<div class="hint" style="text-align:center;padding:36px">Nothing here — deleted modes wait 30 days before they’re gone for good.</div>';
      $$('#delbody [data-rest]').forEach(function (b) { b.onclick = function () { var id = b.dataset.rest; if (!profiles[id]) return; delete profiles[id].deleted; persist().then(function () { renderStrip(); renderPlay(); toast('“' + ((profiles[id] || {}).name || id) + '” restored'); paint(); }); }; });
      $$('#delbody [data-perma]').forEach(function (b) { b.onclick = function () {
        var id = b.dataset.perma, nm = (profiles[id] && profiles[id].name) || id;
        askConfirm('Delete “' + nm + '” forever?', 'This cannot be undone.', 'Delete forever', function () { delete profiles[id]; persist().then(function () { renderStrip(); renderPlay(); toast('Gone'); paint(); }); }, true);
      }; });
    }
    paint();
  }
  /* v2.0 ＋New mode — a 3-step sheet, not a bare prompt */
  var MODE_TEMPLATES = [
    { id: 'dup', icon: '⧉', name: 'Duplicate current', hint: 'Start from the mode you have open and change what you like' },
    { id: 'blank', icon: '▢', name: 'Blank', hint: 'Six panorama frames, everything default' },
    { id: 'game', icon: '🎲', name: 'Board game night', hint: 'Scene wall + score & map panels, dungeon lighting' },
    { id: 'dinner', icon: '🍽', name: 'Dinner ambience', hint: 'Calm panoramas, warm light, gallery matte, ambient' },
    { id: 'photos', icon: '❏', name: 'Photo wall', hint: 'All six frames become a living photo wall' },
    { id: 'event', icon: '🎉', name: 'Event / party', hint: 'Bold scenes, bright light, entrance bloom' }
  ];
  function buildTemplate(kind) {
    var s0 = scenes[0] ? scenes[0].key : '';
    if (kind === 'dup' && draft) return clone(draft);
    var base = { name: '', accent: '#c9a35e', light: 'gallery', ambience: '', music: '', kidSafe: true, scene: s0, frames: FRAME_IDS.map(function () { return 'pano'; }), frameScenes: nullPerFrame(), overlays: nullPerFrame(), effects: nullPerFrame(), transition: { style: 'blurfade', ambient: 'kenburns', durationMs: 1100 } };   /* v2.64: sized from layout */
    if (kind === 'game') { base.light = 'dungeon'; base.frames = ['pano', 'pano', 'score', 'pano', 'pano', 'map']; base.transition.style = 'dipblack'; }
    if (kind === 'dinner') { base.light = 'gallery'; base.ambient = true; base.matte = { on: true, color: '#f2eee4', width: 7, texture: 'paper' }; base.transition = { style: 'crossfade', ambient: 'kenburns', durationMs: 1600 }; }
    if (kind === 'photos') { base.ambient = true; base.frames = ['photos', 'photos', 'photos', 'photos', 'photos', 'photos']; base.photos = { dir: (albums[0] ? albums[0].dir : ''), order: 'random', intervalS: 15, layout: 'wall', fadeS: 1.2, swap: 'sparkle' }; }
    if (kind === 'event') { base.light = 'victory'; base.transition = { style: 'blurfade', ambient: 'kenburns', durationMs: 900, event: 'bloom' }; }
    return normalize(base);
  }
  function openNewModeSheet() {
    var pick = 'dup';
    openSheet('<div class="shead"><h2>＋ New mode</h2><div class="sp"></div><button class="btn gh" id="pclose">Close</button></div><div class="sbody">'
      + '<div class="card"><div class="zt">1 · Start from</div><div class="grid" id="nmtpl" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">'
      + MODE_TEMPLATES.map(function (t) { return '<div class="cell' + (t.id === pick ? ' on' : '') + '" data-tpl="' + t.id + '" style="padding:13px;cursor:pointer"><div style="font-size:22px">' + t.icon + '</div><div style="font-size:13px;margin:5px 0 3px;color:var(--ink)">' + t.name + '</div><div class="hint">' + t.hint + '</div></div>'; }).join('') + '</div></div>'
      + '<div class="card"><div class="zt">2 · Name it</div><div class="r2"><label class="fld"><span>Name</span><input type="text" id="nmname" placeholder="Halloween dinner…"></label>'
      + '<label class="fld"><span>Accent colour</span><input type="color" id="nmaccent" value="#c9a35e"></label></div>'
      + '<label class="fld"><span>Play section (optional)</span><select id="nmcat">' + catSelOpts('') + '</select></label></div>'
      + '<div class="card"><button class="btn p" id="nmgo" style="width:100%">Create — opens as a draft in Design</button><div class="hint" style="margin-top:8px">Nothing reaches the TVs until you Save (or flick Preview on TVs).</div></div></div>');
    $('#pclose').onclick = closeSheet;
    $$('#sheet [data-tpl]').forEach(function (c) { c.onclick = function () { pick = c.dataset.tpl; $$('#sheet [data-tpl]').forEach(function (x) { x.classList.toggle('on', x === c); }); }; });
    setTimeout(function () { var ni = $('#nmname'); if (ni) ni.focus(); }, 60);
    $('#nmgo').onclick = function () {
      var name = ($('#nmname').value || '').trim();
      if (!name) { toast('Give it a name first'); $('#nmname').focus(); return; }
      var go = function () {   // v2.44 (QW3): guard BEFORE the new profile exists · v2.54: in-app confirm
        var id = freshId(name.replace(/\s+/g, '').slice(0, 18) || 'mode');
        var p = buildTemplate(pick);
        p.name = name; p.accent = $('#nmaccent').value || '#c9a35e';
        var cat = $('#nmcat').value; if (cat && cat !== '__new') p.category = cat;
        profiles[id] = p;
        closeSheet();
        setSpace('design');
        selectMode(id, true); dirty = true; updateDirtyUI(); renderStrip();
        toast('Draft created — style the wall, then Save');
      };
      if (dirty) askConfirm('Discard unsaved changes?', 'Unsaved changes to “' + ((draft && draft.name) || curId) + '” will be lost.', 'Discard', go, true); else go();
    };
  }
  function catSelOpts(cur) {
    var secs = playSections();
    return '<option value="">— none —</option>' + secs.map(function (s2) { return '<option value="' + esc(s2.id) + '"' + (s2.id === cur ? ' selected' : '') + '>' + esc(s2.name) + '</option>'; }).join('') + '<option value="__new">＋ New section…</option>';
  }
  function freshSectionId(name) { var b = String(name).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'sec'; var id = b, n = 2, secs = playSections(); function has(x) { return secs.some(function (s2) { return s2.id === x; }); } while (has(id)) id = b + (n++); return id; }
  function addPlaySection(cb) {
    askText('New Play section', 'Board Games\u2026', '', function (name) {   /* v2.54: in-app dialog */
      var id = freshSectionId(name);
      settings.playSections = playSections().concat([{ id: id, name: name, icon: '' }]);
      persist().then(function () { renderPlay(); toast('Section \u201c' + name + '\u201d added'); if (cb) cb(id); });
    });
  }

  /* ---------------- DESIGN: canvas ---------------- */
  function previewState() {
    var p = effDraft() || draft, cache = {};
    var frameImages = p.frames.map(function (k, i) {
      if (k !== 'pano' && k !== 'portrait') return null;
      var key = p.frameScenes[i] || p.scene, ck = wallOfIdx(i) + key;   /* v2.64: wall from layout, not i<3 */
      if (!(ck in cache)) { var s = byKey[resolveSceneKey(key)]; cache[ck] = s ? s.sample : null; }   /* v2.65: legacy-key fallback */
      return cache[ck];
    });
    var overlayImages = p.frames.map(function (k, i) { var f = p.overlays[i]; if (!f) return null; var o = overlays.find(function (x) { return x.file === f; }); return o ? o.url : '/overlays/' + encodeURIComponent(f); });
    var effectImages = p.frames.map(function (k, i) { var f = p.effects && p.effects[i]; return f ? '/media/' + f.split('/').map(encodeURIComponent).join('/') : null; });
    var tr = p.transition || {};
    IE.GAMES.__design = { name: p.name || curId, glyph: '▦', accent: p.accent || '#c9a35e', pano: 'linear-gradient(160deg,#1c1e26,#0f1117)', desc: p.desc || p.name || '', music: p.music || '—', ambience: p.ambience || '—', light: p.light || 'gallery', frames: p.frames };
    return { game: '__design', mode: 'immersion', phase: 'immersion', _noRoomSim: true, captions: !!p.captions, brightness: 92, warmth: 28, light: p.light || 'gallery',
      zones: { Main: true }, channels: {}, mutes: {}, frames: p.frames, wallFit: p.wallFit || 'auto', frameImages: frameImages, overlayImages: overlayImages,
      overlayFits: p.frames.map(function (k, i) { return (p.ovlFit && p.ovlFit[i]) || 'stretch'; }),
      sceneFits: p.frames.map(function (k, i) { return (p.scnFit && p.scnFit[i]) || 'cover'; }),   /* v3.09 */
      audio: Object.assign({}, p.audio || {}, { volume: (p.audio && p.audio.volume != null) ? p.audio.volume : ((settings.audio && settings.audio.volume != null) ? settings.audio.volume : 70) }),
      chroma: settings.chroma, fx: { style: tr.style || 'blurfade', durationMs: Math.min(tr.durationMs != null ? tr.durationMs : 900, 900), easing: 'cubic-bezier(.4,0,.2,1)', ambient: tr.ambient || 'kenburns', event: null, sfx: null, stagger: 0 },
      kid: !!p.kidSafe, live: true,
      matte: (p.matte !== undefined ? p.matte : settings.matte) || null,
      ovlShadow: p.overlayShadow || settings.overlayShadow || null,
      artTone: null, photos: p.photos || null, effectImages: effectImages,
      frameViz: (p.frameViz || []).map(function (c) { return c ? Object.assign({}, c, { bgUrl: bgPreviewUrl(c.bg) }) : null; }),
      framePlaylist: (p.framePlaylist || []).map(function (c) { return c ? Object.assign({}, c, { bgUrl: bgPreviewUrl(c.bg) }) : null; }) };
  }
  function bgPreviewUrl(bg) { if (!bg || !bg.key) return null; var s = byKey[resolveSceneKey(bg.key)]; return s ? (s.sample || s.thumb || null) : null; }   /* v2.65 */
  function buildCanvas() {
    /* v2.64: walls & frames come from the conductor's layout — no two-walls-of-three
       literal. Phase 2a: the wall hosts themselves are created here (app.html ships
       an empty #walls) — one label + row per wall key, grid sized to the wall count,
       so a single-wall layout renders one full-width column. */
    var wallKeys = Object.keys(layout.walls);
    var wallsBox = $('#walls');
    wallsBox.innerHTML = '';
    wallsBox.style.gridTemplateColumns = 'repeat(' + Math.max(1, wallKeys.length) + ', 1fr)';
    wallKeys.forEach(function (wk) {
      var wrap = D.createElement('div');
      var lab = D.createElement('div'); lab.className = 'wlab';
      lab.textContent = wk === 'L' ? 'Left wall' : wk === 'R' ? 'Right wall' : 'Wall ' + wk;
      var host = D.createElement('div'); host.className = 'wrow'; host.id = 'wall' + wk;
      wrap.appendChild(lab); wrap.appendChild(host); wallsBox.appendChild(wrap);
      layout.walls[wk].forEach(function (fid) {
        var fidx = FRAME_IDS.indexOf(fid); if (fidx < 0) return;
        (function (i) {
        var fr = D.createElement('div'); fr.className = 'fr'; fr.dataset.fi = i; fr.draggable = true;
        fr.innerHTML = '<div class="badge">' + FRAME_IDS[i] + ' <i></i><em title="Effect layer active" style="display:none;font-style:normal;color:var(--teal)">≋</em></div><div class="inner"></div>';
        host.appendChild(fr);
        fr.addEventListener('click', function (e) {
          var i2 = +fr.dataset.fi;
          if (e.shiftKey || e.ctrlKey || e.metaKey) { var ix = sel.indexOf(i2); if (ix >= 0) sel.splice(ix, 1); else sel.push(i2); }
          else sel = (sel.length === 1 && sel[0] === i2) ? [] : [i2];
          refreshSel(); renderInspector();
        });
        fr.addEventListener('dblclick', function () { sel = [+fr.dataset.fi]; refreshSel(); renderInspector(); openScenePicker(); });
        fr.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/ie-frame', fr.dataset.fi); });
        fr.addEventListener('dragover', function (e) { e.preventDefault(); fr.classList.add('droptarget'); });
        fr.addEventListener('dragleave', function () { fr.classList.remove('droptarget'); });
        fr.addEventListener('drop', function (e) {
          e.preventDefault(); fr.classList.remove('droptarget');
          var i2 = +fr.dataset.fi;
          var t = e.dataTransfer.getData('text/ie-tray'); var f = e.dataTransfer.getData('text/ie-frame');
          if (t) applyTrayItem(JSON.parse(t), [i2]);
          else if (f !== '' && +f !== i2) ed(function (d) { var s2 = +f; d.frames[i2] = d.frames[s2]; d.frameScenes[i2] = d.frameScenes[s2]; d.overlays[i2] = d.overlays[s2]; d.effects[i2] = d.effects[s2]; if (d.reveal && d.reveal.videos) d.reveal.videos[i2] = d.reveal.videos[s2]; });
        });
        })(fidx);
      });
    });
  }
  function refreshSel() { $$('#walls .fr').forEach(function (f) { f.classList.toggle('sel', sel.indexOf(+f.dataset.fi) >= 0); }); }
  function paintCanvas() {
    if (!$$('#walls .fr').length) buildCanvas();   /* v2.64: layout-agnostic emptiness check */
    var st = previewState();
    $$('#walls .fr').forEach(function (f) {
      var i = +f.dataset.fi;
      // children[1] not querySelector('.inner') — renderFrame renames the container's class on first paint
      try { IE.renderFrame(f.children[1], FRAME_IDS[i], st); } catch (e) { console.warn('paint', FRAME_IDS[i], e); }
      var dot = f.querySelector('.badge i');
      var frames = (health && health.frames) || [];
      if (dot) dot.className = frames.indexOf(FRAME_IDS[i]) >= 0 ? 'on' : '';
      var em = f.querySelector('.badge em');
      if (em) em.style.display = (draft && draft.effects && draft.effects[i]) ? 'inline' : 'none';
      var ab = f.querySelector('.abadge');   // v2.0 Sound lens — the wall becomes a spatial audio map
      if (lens === 'sound' && space === 'design') {
        if (!ab) { ab = D.createElement('div'); ab.className = 'abadge'; f.appendChild(ab); }
        ab.innerHTML = soundBadges(i);
      } else if (ab) ab.remove();
    });
    refreshSel();
  }

  /* ---------------- DESIGN v2.0: lenses ----------------
     The canvas stays on screen; the lens changes what it (and the inspector) are
     about: Wall = content, Sound = the spatial audio map, Motion = transitions/
     effects/reveals/matte, Behaviour = toggles, phases, moments. */
  function setLens(l) {
    lens = l;
    if (l !== 'intro') { var _im = $('#intromain'); if (_im) _im.remove(); }   /* v3.29 */
    $$('#lensbar button').forEach(function (b) { b.classList.toggle('on', b.dataset.lens === l); });
    paintCanvas(); renderInspector();
  }
  $$('#lensbar button').forEach(function (b) { b.onclick = function () { setLens(b.dataset.lens); }; });
  /* merged view of the draft while a phase is selected (mirrors the conductor) */
  function mergePatchC(base, patch) {
    if (patch == null) return base;
    if (Array.isArray(base) && patch && typeof patch === 'object' && !Array.isArray(patch)) {
      var out = base.slice();
      Object.keys(patch).forEach(function (k) { var i = +k; if (!isNaN(i)) out[i] = patch[k]; });
      return out;
    }
    if (Array.isArray(patch)) return patch.slice();
    if (base && typeof base === 'object' && typeof patch === 'object') {
      var o2 = {}; Object.keys(base).forEach(function (k) { o2[k] = base[k]; });
      Object.keys(patch).forEach(function (k) {
        o2[k] = (patch[k] && typeof patch[k] === 'object' && base[k] && typeof base[k] === 'object') ? mergePatchC(base[k], patch[k]) : patch[k];
      });
      return o2;
    }
    return patch;
  }
  function effDraft() {
    if (!phaseSel || !draft || !Array.isArray(draft.phases)) return draft;
    var ph = null;
    draft.phases.forEach(function (x) { if (x && x.id === phaseSel) ph = x; });
    return (ph && ph.patch) ? mergePatchC(draft, ph.patch) : draft;
  }
  function phaseName(pid) { var nm = pid; (draft.phases || []).forEach(function (x) { if (x && x.id === pid) nm = x.name || pid; }); return nm; }
  /* the always-visible mode header: accent · name · lighting · section */
  function renderModeHeader() {
    var el = $('#mhdr'); if (!el) return;
    if (!draft || space !== 'design') { el.innerHTML = ''; return; }
    // v2.23 FOCUS FIX: typing in the header name box fired renderStrip() -> renderModeHeader(),
    // which rebuilt #mhdr and destroyed the focused input on EVERY keystroke. Never rebuild
    // this bar while the user is typing in it — it re-syncs on the next render after blur.
    if (el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    var LIGHTS = Object.keys(IE.LIGHT_SCENES);
    el.innerHTML = '<input type="color" data-mh="accent" title="Accent colour — glows, highlights and the mode card trim" value="' + (draft.accent || '#c9a35e') + '">'
      + '<input type="text" data-mh="name" value="' + esc(draft.name || curId) + '" placeholder="Mode name" title="The mode\u2019s display name">'
      + '<span class="mlab">Lighting</span><select data-mh="light" title="Room lighting scene launched with this mode">' + opt(LIGHTS, draft.light || 'gallery') + '</select>'
      + '<span class="mlab">Section</span><select data-mh="category" title="Which Play section this mode lives in">' + catSelOpts(draft.category || '') + '</select>'
      + '<div class="sp"></div>'
      + (phaseSel ? '<span class="mlab" style="color:var(--gold2);letter-spacing:.6px">✎ editing phase: ' + esc(phaseName(phaseSel)) + '</span>' : '');
    $$('#mhdr [data-mh]').forEach(function (el2) {
      el2.oninput = el2.onchange = function () {
        var k = el2.dataset.mh;
        if (k === 'category') {
          /* v2.88: which Play section a mode lives in is structural — via ed() with a
             phase selected it landed in that phase's patch, so the mode appeared to
             move while live and snapped back on deselect, never reaching the base. */
          if (el2.value === '__new') { addPlaySection(function (nid) { edBase(function (d) { d.category = nid; }); renderModeHeader(); }); return; }
          edBase(function (d) { if (el2.value) d.category = el2.value; else delete d.category; });
          return;
        }
        ed(function (d) { d[k] = el2.value; });
        if (k === 'name' || k === 'accent') { renderStrip(); renderNow(); }
      };
    });
  }
  function renderInspector() {
    var el = $('#insp');
    if (!draft) { el.innerHTML = ''; return; }
    renderModeHeader();
    if (lens === 'sound') el.innerHTML = soundInspector();
    else if (lens === 'intro') { el.innerHTML = '<h2>🎬 Intro</h2><div class="ctx">The intro editor is on the main stage below the wall — the timeline needs the width.</div>'; renderIntroMain(); return; }   /* v3.29 (was inspector-hosted in v3.08) */
    else if (lens === 'lighting') el.innerHTML = lightingInspector();
    else if (lens === 'motion') el.innerHTML = motionInspector();
    else if (lens === 'behaviour') el.innerHTML = behaviourInspector();
    else el.innerHTML = (sel.length ? frameInspector() : wallInspector());
    bindInspector();
  }
  /* Wall lens, nothing selected — just the wall-wide content settings */
  function wallInspector() {
    var p = draft;
    return '<h2>' + esc(p.name || curId) + '</h2><div class="ctx">The wall — click a frame to dress it, shift-click to multi-select</div>'
      + '<div class="fld"><span>Default scene' + T('The image or video every frame shows unless that frame has its own scene set. Frames on one wall sharing the default render it as one wide panorama.') + '</span><button class="btn" id="defscene" style="width:100%;text-align:left">🖼 ' + esc(p.scene ? niceName(p.scene) : '(choose)') + '</button></div>'
      + '<label class="fld"><span>Wall layout' + T('How scene frames fill the wall. Fill each screen = every TV shows the whole image. Span the wall = one image stretched across the screens as a panorama. Auto = span only when neighbouring screens share the same scene.') + '</span><select data-k="wallFit">' + opt([{ v: 'auto', l: 'Auto' }, { v: 'fill', l: 'Fill each screen (whole)' }, { v: 'span', l: 'Span the wall (panorama)' }], p.wallFit || 'auto') + '</select></label>'
      + '<div class="hint" style="margin-top:16px;line-height:1.6">Name, colour and lighting live in the header above the wall.<br>🔊 Sound, ✨ Motion &amp; FX and ☑ Behaviour are tabs of their own.</div>';
  }
  function selChips() {
    return '<div class="selchips">' + FRAME_IDS.map(function (f, i) { return '<button class="chip' + (sel.indexOf(i) >= 0 ? ' on' : '') + '" data-selc="' + i + '">' + f + '</button>'; }).join('') + '</div>';
  }
  function T(t) { return '<i class="tip" tabindex="0" data-tip="' + esc(t) + '">?</i>'; }
  /* v1.81 floating tooltip — escapes scroll containers, clamps to the viewport */
  (function () {
    var fly = document.createElement('div'); fly.id = 'tipfly'; document.body.appendChild(fly);
    function show(tip) {
      fly.textContent = tip.dataset.tip || '';
      fly.style.left = '-9999px'; fly.style.top = '0';
      var h = fly.offsetHeight, w = fly.offsetWidth;      // sync measure (forces reflow — cheap here)
      var r = tip.getBoundingClientRect();
      var left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
      var top = r.top - h - 9; if (top < 8) top = r.bottom + 9;
      fly.style.left = left + 'px'; fly.style.top = top + 'px'; fly.classList.add('on');
    }
    function hide() { fly.classList.remove('on'); }
    document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('.tip'); if (t) show(t); });
    document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('.tip')) hide(); });
    document.addEventListener('focusin', function (e) { var t = e.target.closest && e.target.closest('.tip'); if (t) show(t); });
    document.addEventListener('focusout', hide, true);
    document.addEventListener('scroll', hide, true);
  })();
  function spOpts(sel) {
    return opt([{ v: 'all', l: 'All TVs' }, { v: 'random', l: 'Random TV' }, { v: 'sweep', l: 'Sweep →' }, { v: 'sweeprev', l: 'Sweep ←' }]
      .concat(FRAME_IDS.map(function (f) { return { v: f, l: f }; })), sel || 'all');   /* v2.64: frames from layout */
  }
  function sndOpts(sel) {
    return '<option value="">— none —</option>' + sounds.map(function (s) { return '<option value="sounds/' + esc(s) + '"' + (sel === ('sounds/' + s) ? ' selected' : '') + '>' + esc(niceName(s)) + '</option>'; }).join('');
  }
  function periRow(pd, i) {
    return '<div class="perirow" style="border:1px solid var(--line);border-radius:10px;padding:8px;margin-bottom:8px">'
      + '<div class="r2"><label class="fld"><span>Sound</span><select data-pd="' + i + '|sound">' + sndOpts(pd.sound) + '</select></label>'
      + '<label class="fld"><span>Where</span><select data-pd="' + i + '|spatial">' + spOpts(pd.spatial || 'random') + '</select></label></div>'
      + '<div class="r3" style="margin-top:6px"><label class="fld"><span>Every (s)</span><input type="number" data-pd="' + i + '|everyS" min="2" value="' + (pd.everyS || 60) + '"></label>'
      + '<label class="fld"><span>Random %</span><input type="number" data-pd="' + i + '|jitter" min="0" max="100" value="' + Math.round((pd.jitter || 0) * 100) + '"></label>'
      + '<label class="fld"><span>Vol %</span><input type="number" data-pd="' + i + '|gain" min="0" max="100" value="' + Math.round((pd.gain != null ? pd.gain : 1) * 100) + '"></label></div>'
      + '<button class="btn sm gh" data-ptest="' + i + '" style="margin-top:6px;margin-right:6px">▶ Try it</button><button class="btn sm gh dg" data-perirm="' + i + '" style="margin-top:6px">✕ Remove</button></div>';
  }
  function audioEditorHTML(p) {
    var au = p.audio || {}, pl = au.playlist || {}, intro = au.intro || {}, peri = au.periodicals || [];
    var h = '<details class="adv"><summary>Audio director</summary><div class="body">';
    h += '<label class="chk"><input type="checkbox" data-a="volOn" ' + (au.volume != null ? 'checked' : '') + '> Set this mode’s own master volume' + T('On entry, this mode sets every TV to this level. Off = use the global master volume from Settings.') + '</label>'
      + (au.volume != null ? '<label class="fld"><span>Master volume <b id="amv" style="color:var(--gold2)">' + au.volume + '%</b></span><input type="range" data-a="volume" min="0" max="100" value="' + au.volume + '"></label>' : '');
    h += '<div class="zt" style="margin-top:12px">Playlist — constant background' + T('Songs / ambient loops that play continuously (wind, music…), in order or shuffled, looping forever. Pick which TVs carry it — a subset (e.g. L2 + R2) is best for real music so the six screens don’t phase against each other; leave all off for a diffuse wash on every TV.') + '</div>'
      + '<div id="pltracks">' + ((pl.tracks || []).length ? (pl.tracks || []).map(function (t, i) { return '<div class="row" style="gap:8px;align-items:center;margin-bottom:4px"><span style="flex:1;font-size:13px">' + (i + 1) + '. ' + esc(t.split('/').pop()) + '</span><button class="btn sm gh" data-plrm="' + i + '">✕</button></div>'; }).join('') : '<div class="hint">No tracks yet.</div>') + '</div>'
      + '<div class="row" style="gap:6px;margin-top:6px"><select id="pladd" style="flex:1">' + sndOpts('') + '</select><button class="btn sm" data-pladdbtn>+ Add</button></div>'
      + '<div class="r2" style="margin-top:6px"><label class="fld"><span>Order</span><select data-pl="order">' + opt([{ v: 'sequence', l: 'In order' }, { v: 'shuffle', l: 'Shuffle' }], pl.order || 'sequence') + '</select></label>'
      + '<label class="fld"><span>Volume %</span><input type="number" data-pl="gain" min="0" max="100" value="' + Math.round((pl.gain != null ? pl.gain : 0.5) * 100) + '"></label></div>'
      + '<div class="fld" style="margin-top:6px"><span>Plays on' + T('Which TVs carry the playlist. None selected = all TVs (diffuse). Select a few for clean music without phasing.') + '</span><div class="row" style="gap:5px" id="plframes">'
      + FRAME_IDS.map(function (f) { var on = pl.frames && pl.frames.indexOf(f) >= 0; return '<button class="btn sm' + (on ? '' : ' gh') + '" data-plf="' + f + '">' + f + '</button>'; }).join('') + '</div></div>';
    h += '<div class="zt" style="margin-top:12px">Intro — on entering the mode' + T('A one-shot flourish when the mode starts (trumpets, a gong…).') + '</div>'
      + '<div class="r3"><label class="fld"><span>Sound</span><select data-ai="sound">' + sndOpts(intro.sound) + '</select></label>'
      + '<label class="fld"><span>Where</span><select data-ai="spatial">' + spOpts(intro.spatial || 'all') + '</select></label>'
      + '<label class="fld"><span>Vol %</span><input type="number" data-ai="gain" min="0" max="100" value="' + Math.round((intro.gain != null ? intro.gain : 1) * 100) + '"></label></div>';
    h += '<div class="zt" style="margin-top:12px">Periodicals — recurring effects' + T('Sounds that fire on a cycle (birds, thunder…). Every = average seconds between; Random % spreads the timing so it never feels mechanical; Where places each hit (random TV = a bird from somewhere; sweep = it travels).') + '</div>'
      + '<div id="perilist">' + peri.map(function (pd, i) { return periRow(pd, i); }).join('') + '</div>'
      + '<button class="btn sm" data-periadd>+ Add periodical</button>';
    h += '</div></details>';
    return h;
  }
  /* ---------------- v2.0 SOUND lens ---------------- */
  function auditionSound(sound, spatial, gain) {
    if (!sound) return toast('Pick a sound first');
    var body = { sound: sound, gain: (gain != null ? gain : 1) };
    if (spatial === 'sweep') body.mode = 'sweep';
    else if (spatial === 'sweeprev') { body.mode = 'sweep'; body.reverse = true; }
    else if (spatial === 'random') { body.mode = 'one'; body.frame = FRAME_IDS[Math.floor(Math.random() * FRAME_IDS.length)]; }
    else if (spatial && spatial !== 'all') { body.mode = 'one'; body.frame = spatial; }
    else body.mode = 'all';
    post('/api/sfx', body); toast('♪ Playing on the wall');
  }
  function soundBadges(i) {
    var au = (draft && draft.audio) || {}, out = [], fid = FRAME_IDS[i];
    var pl = au.playlist || {};
    if ((pl.tracks || []).length && (!pl.frames || !pl.frames.length || pl.frames.indexOf(fid) >= 0)) out.push('<span>♪ music</span>');
    function hits(sp) { return !sp || sp === 'all' || sp === 'random' || sp === 'sweep' || sp === 'sweeprev' || sp === fid; }
    if (au.intro && au.intro.sound && hits(au.intro.spatial)) out.push('<span>🔔 intro</span>');
    (au.periodicals || []).forEach(function (pd) {
      if (pd && pd.sound && hits(pd.spatial)) out.push('<span>' + (pd.spatial === 'sweep' ? '→' : pd.spatial === 'sweeprev' ? '←' : pd.spatial === 'random' ? '☄' : '⟳') + ' ' + esc(niceName(pd.sound)).slice(0, 16) + '</span>');
    });
    return out.join('');
  }
  function soundInspector() {
    var p = draft, au = p.audio || {}, pl = au.playlist || {}, intro = au.intro || {}, outro = au.outro || {}, peri = au.periodicals || [];
    var silent = !(pl.tracks || []).length && !intro.sound && !outro.sound && !peri.length;
    var h = '<h2>🔊 Sound</h2><div class="ctx">Each TV owns its own speaker — place sound in the room</div>';
    if (silent) h += '<div class="card" style="text-align:center;padding:22px 14px"><div style="font-size:24px;margin-bottom:8px">🔇</div>'
      + '<div style="font-size:13.5px;margin-bottom:5px">This mode is silent.</div>'
      + '<div class="hint" style="line-height:1.5">Add background music, an entrance sound or recurring effects below.<br>Drop .mp3 / .wav files into <b>sounds/</b> (music in <b>sounds/music/</b>), then ⚙ → Rescan.</div></div>';
    h += '<div class="card"><label class="chk" style="margin:0"><input type="checkbox" data-a="volOn" ' + (au.volume != null ? 'checked' : '') + '> This mode sets its own master volume' + T('On entry, this mode sets every TV to this level. Off = the global master volume from Settings applies.') + '</label>'
      + (au.volume != null ? '<label class="fld" style="margin-top:10px"><span>Master volume <b id="amv" style="color:var(--gold2)">' + au.volume + '%</b></span><input type="range" data-a="volume" min="0" max="100" value="' + au.volume + '"></label>' : '') + '</div>';
    h += '<div class="card"><div class="zt">♪ Playlist — constant background' + T('Songs / ambient loops that play continuously, in order or shuffled, looping forever. Pick which TVs carry it — a subset (e.g. L2 + R2) is best for real music so the six screens don\u2019t phase; none selected = a diffuse wash on every TV.') + '</div>'
      + '<div id="pltracks">' + ((pl.tracks || []).length ? (pl.tracks || []).map(function (t, i) { return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:5px"><button class="btn sm gh" data-plt="' + i + '" title="Hear it on the wall">▶</button><span style="flex:1;font-size:13px">' + (i + 1) + '. ' + esc(niceName(t)) + '</span><button class="btn sm gh" data-plrm="' + i + '">✕</button></div>'; }).join('') : '<div class="hint">No tracks yet — add one below.</div>') + '</div>'
      + '<div style="display:flex;gap:6px;margin-top:8px"><select id="pladd" style="flex:1">' + sndOpts('') + '</select><button class="btn sm" data-pladdbtn>＋ Add</button></div>'
      + '<div class="r2" style="margin-top:10px"><label class="fld"><span>Order</span><select data-pl="order">' + opt([{ v: 'sequence', l: 'In order' }, { v: 'shuffle', l: 'Shuffle' }], pl.order || 'sequence') + '</select></label>'
      + '<label class="fld"><span>Volume %</span><input type="number" data-pl="gain" min="0" max="100" value="' + Math.round((pl.gain != null ? pl.gain : 0.5) * 100) + '"></label></div>'
      + '<div class="fld" style="margin:4px 0 0"><span>Plays on' + T('Which TVs carry the playlist — badges on the wall above show where the music lives.') + '</span><div style="display:flex;gap:5px;flex-wrap:wrap" id="plframes">'
      + FRAME_IDS.map(function (fid) { var on = pl.frames && pl.frames.indexOf(fid) >= 0; return '<button class="btn sm' + (on ? '' : ' gh') + '" data-plf="' + fid + '">' + fid + '</button>'; }).join('') + '</div></div></div>';
    h += '<div class="card"><div class="zt">🔔 Entrance & exit' + T('One-shot flourishes when the mode starts (trumpets, a gong…) and when it ends.') + '</div>'
      + '<div class="r3"><label class="fld"><span>Entry sound</span><select data-ai="sound">' + sndOpts(intro.sound) + '</select></label>'
      + '<label class="fld"><span>Where</span><select data-ai="spatial">' + spOpts(intro.spatial || 'all') + '</select></label>'
      + '<label class="fld"><span>Vol % <button class="btn sm gh" data-aitest style="padding:2px 8px;margin-left:4px">▶</button></span><input type="number" data-ai="gain" min="0" max="100" value="' + Math.round((intro.gain != null ? intro.gain : 1) * 100) + '"></label></div>'
      + '<div class="r3" style="margin-top:6px"><label class="fld"><span>Exit sound</span><select data-ao="sound">' + sndOpts(outro.sound) + '</select></label>'
      + '<label class="fld"><span>Where</span><select data-ao="spatial">' + spOpts(outro.spatial || 'all') + '</select></label>'
      + '<label class="fld"><span>Vol % <button class="btn sm gh" data-aotest style="padding:2px 8px;margin-left:4px">▶</button></span><input type="number" data-ao="gain" min="0" max="100" value="' + Math.round((outro.gain != null ? outro.gain : 1) * 100) + '"></label></div></div>';
    h += '<div class="card"><div class="zt">☄ Periodicals — the room\u2019s wildlife' + T('Sounds that fire on a cycle (birds, thunder, creaks…). Every = average seconds between; Random % spreads the timing so it never feels mechanical; Where places each hit — random TV = a bird from somewhere, sweep = it travels along the wall.') + '</div>'
      + '<div id="perilist">' + peri.map(function (pd, i) { return periRow(pd, i); }).join('') + '</div>'
      + '<button class="btn sm" data-periadd>＋ Add periodical</button></div>';
    return h;
  }
  /* ---------------- v2.0 MOTION & FX lens ---------------- */
  function motionInspector() {
    var p = draft, tr = p.transition || {}, mt = p.matte || {}, mtOn = !!(p.matte && p.matte.on !== false);
    var h = '<h2>✨ Motion &amp; FX</h2>';
    if (sel.length) {
      h = '<h2>✨ ' + sel.map(function (i) { return FRAME_IDS[i]; }).join(' + ') + '</h2><div class="ctx">Effects for the selected frame' + (sel.length > 1 ? 's' : '') + ' — click empty wall for the whole-mode motion</div>' + selChips();
      var cf = p.effects[sel[0]];
      h += '<div class="fld"><span>Effect layer (rain / fog / snow loops)' + T('A looping weather/atmosphere video blended over the scene. Black areas vanish, so rain, fog or snow glows over the art — under any window overlay.') + '</span><select data-eff><option value="">None</option>'
        + effects.map(function (e) { return '<option value="' + esc(e.file) + '"' + (cf === e.file ? ' selected' : '') + '>' + esc(niceName(e.name)) + '</option>'; }).join('') + '</select></div>';
      var pr = p.reveal || null;
      var cv = (pr && pr.videos) ? pr.videos[sel[0]] : null;
      h += '<div class="fld" style="margin-top:12px"><span>Reveal video' + T('A cinemagraph moment: this frame plays the chosen video once when triggered, then settles back to its still scene.') + '</span><select data-rev><option value="">None</option>'
        + scenes.filter(function (s) { return s.video; }).map(function (s) { var fl = decodeURIComponent((s.sample || '').slice(7)); return '<option value="' + esc(fl) + '"' + (cv === fl ? ' selected' : '') + '>' + esc(niceName(s.key)) + '</option>'; }).join('') + '</select></div>';
      var trg = (pr && pr.trigger) || 'manual';
      h += '<div class="fld" style="margin-top:8px"><span>Reveal trigger (whole mode)' + T('Manual: reveals fire only from the button in Play. Random: they also fire on their own — ambient surprise.') + '</span><select data-rvt><option value="manual"' + (trg === 'manual' ? ' selected' : '') + '>Manual — buttons only</option><option value="random"' + (trg === 'random' ? ' selected' : '') + '>Random + manual</option></select></div>';
      if (trg === 'random') h += '<label class="fld" style="margin-top:8px"><span>Average seconds between random reveals</span><input type="number" data-rvs min="15" value="' + ((pr && pr.everyS) || 180) + '"></label>';
      return h;
    }
    h += '<div class="ctx">Whole mode — select a frame for its effect layer &amp; reveal</div>';
    h += '<div class="card"><div class="zt">Transition &amp; motion</div>'
      + '<div class="r3"><label class="fld"><span>Transition' + T('Animation used whenever a frame changes scene — crossfade, push, wipe, ripple…') + '</span><select data-t="style">' + opt(IE.FX.TRANSITIONS, tr.style || 'blurfade') + '</select></label>'
      + '<label class="fld"><span>Ambient' + T('Constant subtle motion on the art: kenburns = slow drift &amp; zoom, breathe = gentle scale. Choose none for perfectly still art.') + '</span><select data-t="ambient">' + opt(IE.FX.AMBIENTS, tr.ambient || 'kenburns') + '</select></label>'
      + '<label class="fld"><span>Dur ms' + T('Transition length in milliseconds — 1000 = one second.') + '</span><input type="number" data-t="durationMs" step="50" value="' + (tr.durationMs != null ? tr.durationMs : 1100) + '"></label></div>'
      + '<div class="r2"><label class="fld"><span>Change event' + T('A one-off flourish fired when the scene changes — lightning flash, bloom, shake…') + '</span><select data-t="event">' + opt(IE.FX.EVENTS, tr.event || 'none') + '</select></label>'
      + '<label class="fld"><span>Sound' + T('Synthesised sound effect played on scene change (thunder, chime…).') + '</span><select data-t="sfx">' + opt(IE.FX.SFXNAMES, tr.sfx || 'none') + '</select></label></div></div>';
    h += '<div class="card"><div class="zt">Matte &amp; print tone</div>'
      + '<label class="chk"><input type="checkbox" data-m="on" ' + (mtOn ? 'checked' : '') + '> Matte (picture-frame mount)' + T('Draws a gallery mount (passe-partout) with bevel shadow around the art — makes the TV read as a framed print.') + '</label>'
      + '<div class="r3"' + (mtOn ? '' : ' style="opacity:.4;pointer-events:none"') + '>'
      + '<label class="fld"><span>Colour</span><input type="color" data-m="color" value="' + (mt.color || '#f2eee4') + '"></label>'
      + '<label class="fld"><span>Width' + T('Mount border thickness, as % of the screen\u2019s shorter edge. 5–9 looks like a real mount.') + '</span><input type="number" data-m="width" min="0" max="20" step="0.5" value="' + (mt.width != null ? mt.width : 7) + '"></label>'
      + '<label class="fld"><span>Texture</span><select data-m="texture">' + opt(['paper', 'linen', 'none'], mt.texture || 'paper') + '</select></label></div>'
      + '<label class="chk"><input type="checkbox" data-tn="on" ' + (p.artTone ? 'checked' : '') + '> Custom print tone (else automatic per lighting)' + T('Print tone dims/desaturates the art slightly on the TVs so screens read as printed art. Automatic follows the Lighting scene; tick to set your own.') + '</label>'
      + (p.artTone ? '<div class="r3">'
      + '<label class="fld"><span>Bright</span><input type="number" data-tn="brightness" min="0.3" max="1.5" step="0.02" value="' + (p.artTone.brightness != null ? p.artTone.brightness : 0.84) + '"></label>'
      + '<label class="fld"><span>Contrast</span><input type="number" data-tn="contrast" min="0.5" max="1.5" step="0.02" value="' + (p.artTone.contrast != null ? p.artTone.contrast : 0.96) + '"></label>'
      + '<label class="fld"><span>Saturate</span><input type="number" data-tn="saturate" min="0" max="1.6" step="0.02" value="' + (p.artTone.saturate != null ? p.artTone.saturate : 0.88) + '"></label></div>' : '') + '</div>';
    return h;
  }
  function modeInspector() {
    var p = draft, tr = p.transition || {}, mt = p.matte || {}, mtOn = !!(p.matte && p.matte.on !== false);
    var au = p.audio || {};
    var LIGHTS = Object.keys(IE.LIGHT_SCENES);
    return '<h2>' + esc(p.name || curId) + '</h2><div class="ctx">Mode — click a frame on the wall to edit it</div>'
      + '<label class="fld"><span>Name' + T('The mode’s display name — shown on its card in Play, on the mode strip, and in the Now Playing bar.') + '</span><input type="text" data-k="name" value="' + esc(p.name || '') + '"></label>'
      + '<div class="r2"><label class="fld"><span>Accent' + T('Theme colour for this mode — used for glows, highlights, the phase clock and halo effects on the TVs, and the mode card trim.') + '</span><input type="color" data-k="accent" value="' + (p.accent || '#c9a35e') + '"></label>'
      + '<label class="fld"><span>Lighting' + T('Room lighting scene launched with this mode (via Home Assistant once connected). Also picks the automatic print tone applied to the art.') + '</span><select data-k="light">' + opt(LIGHTS, p.light || 'gallery') + '</select></label></div>'
      + '<div class="r2"><label class="fld"><span>Ambience label' + T('A text note only — describes the soundscape that suits this mode (e.g. “Rain on canvas”). Shown in Play view; it does not play audio itself.') + '</span><input type="text" data-k="ambience" value="' + esc(p.ambience) + '"></label>'
      + '<label class="fld"><span>Music label' + T('A text note only — the playlist or album you put on for this mode. Shown in Play view as a reminder; does not control playback.') + '</span><input type="text" data-k="music" value="' + esc(p.music) + '"></label></div>'
      + '<label class="chk"><input type="checkbox" data-k="kidSafe" ' + (p.kidSafe ? 'checked' : '') + '> Kid-safe (soften scares &amp; flashes)' + T('Replaces harsh cuts, lightning, shake and glitch effects with gentler versions while this mode runs.') + '</label>'
      + '<label class="chk"><input type="checkbox" data-k="captions" ' + (p.captions ? 'checked' : '') + '> Caption text on frames' + T('Shows the mode’s description text along the bottom of scene frames (e.g. “At Rest”). Off keeps the art completely clean.') + '</label>'
      + '<label class="chk"><input type="checkbox" data-k="ambient" ' + (p.ambient ? 'checked' : '') + '> Ambient mode' + T('Marks this as a resting mode (like Dining). Room rhythms and weather may only switch the wall while an ambient mode is showing — a running game is never interrupted.') + '</label>'
      + '<label class="chk"><input type="checkbox" data-k="weatherFx" ' + (p.weatherFx ? 'checked' : '') + '> Live weather on windows' + T('Lets real-sky weather effects (rain/snow/fog from Home Assistant) fill any frame whose effect slot is empty in this mode. Dining has this on by default.') + '</label>'
      + '<div class="fld"><span>Default scene' + T('The image or video every frame shows unless that frame has its own scene set. Frames on one wall sharing the default render it as one wide panorama.') + '</span><button class="btn" id="defscene" style="width:100%;text-align:left">🖼 ' + esc(p.scene || '(choose)') + '</button></div>'
      + '<label class="fld"><span>Wall layout' + T('How scene frames fill the wall. Fill each screen = every TV shows the whole image (best for one subject, e.g. a portrait). Span the wall = one image stretched across the screens as a panorama. Auto = span only when neighbouring screens share the same scene.') + '</span><select data-k="wallFit">' + opt([{ v: 'auto', l: 'Auto' }, { v: 'fill', l: 'Fill each screen (whole)' }, { v: 'span', l: 'Span the wall (panorama)' }], p.wallFit || 'auto') + '</select></label>'
      + '<details class="adv"><summary>Matte &amp; print tone</summary><div class="body">'
      +   '<label class="chk"><input type="checkbox" data-m="on" ' + (mtOn ? 'checked' : '') + '> Matte (picture-frame mount)' + T('Draws a gallery mount (passe-partout) with bevel shadow around the art — makes the TV read as a framed print, like Samsung’s Art Mode.') + '</label>'
      +   '<div class="r3"' + (mtOn ? '' : ' style="opacity:.4;pointer-events:none"') + '>'
      +   '<label class="fld"><span>Colour' + T('Mount colour. Ivory / warm paper tones look most like a real gallery mount.') + '</span><input type="color" data-m="color" value="' + (mt.color || '#f2eee4') + '"></label>'
      +   '<label class="fld"><span>Width' + T('Mount border thickness, as % of the screen’s shorter edge. 5–9 looks like a real mount.') + '</span><input type="number" data-m="width" min="0" max="20" step="0.5" value="' + (mt.width != null ? mt.width : 7) + '"></label>'
      +   '<label class="fld"><span>Texture' + T('Faint paper or linen grain on the mount surface.') + '</span><select data-m="texture">' + opt(['paper', 'linen', 'none'], mt.texture || 'paper') + '</select></label></div>'
      +   '<label class="chk"><input type="checkbox" data-tn="on" ' + (p.artTone ? 'checked' : '') + '> Custom print tone (else automatic per lighting)' + T('Print tone dims/desaturates the art slightly on the TVs so screens read as printed art, not glowing displays. Automatic follows the Lighting scene; tick to set your own values. Editor previews always show full clarity.') + '</label>'
      +   (p.artTone ? '<div class="r3">'
      +     '<label class="fld"><span>Bright</span><input type="number" data-tn="brightness" min="0.3" max="1.5" step="0.02" value="' + (p.artTone.brightness != null ? p.artTone.brightness : 0.84) + '"></label>'
      +     '<label class="fld"><span>Contrast</span><input type="number" data-tn="contrast" min="0.5" max="1.5" step="0.02" value="' + (p.artTone.contrast != null ? p.artTone.contrast : 0.96) + '"></label>'
      +     '<label class="fld"><span>Saturate</span><input type="number" data-tn="saturate" min="0" max="1.6" step="0.02" value="' + (p.artTone.saturate != null ? p.artTone.saturate : 0.88) + '"></label></div>' : '')
      + '</div></details>'
      + '<details class="adv"><summary>Transition &amp; motion</summary><div class="body">'
      +   '<div class="r3"><label class="fld"><span>Transition' + T('Animation used whenever a frame changes scene — crossfade, push, wipe, ripple…') + '</span><select data-t="style">' + opt(IE.FX.TRANSITIONS, tr.style || 'blurfade') + '</select></label>'
      +   '<label class="fld"><span>Ambient' + T('Constant subtle motion on the art: kenburns = slow drift &amp; zoom, breathe = gentle scale, plus weather overlays. Choose none for perfectly still art.') + '</span><select data-t="ambient">' + opt(IE.FX.AMBIENTS, tr.ambient || 'kenburns') + '</select></label>'
      +   '<label class="fld"><span>Dur ms' + T('Transition length in milliseconds — 1000 = one second.') + '</span><input type="number" data-t="durationMs" step="50" value="' + (tr.durationMs != null ? tr.durationMs : 1100) + '"></label></div>'
      +   '<div class="r2"><label class="fld"><span>Change event' + T('A one-off flourish fired when the scene changes — lightning flash, bloom, shake…') + '</span><select data-t="event">' + opt(IE.FX.EVENTS, tr.event || 'none') + '</select></label>'
      +   '<label class="fld"><span>Sound' + T('Synthesised sound effect played on scene change (thunder, chime…). Needs one tap/click on the page first — browsers block audio until then.') + '</span><select data-t="sfx">' + opt(IE.FX.SFXNAMES, tr.sfx || 'none') + '</select></label></div>'
      + '</div></details>'
      + audioEditorHTML(p)
      + '<button class="btn dg gh sm" id="delmode" style="width:100%">Delete this mode…</button>';
  }
  /* ---------------- v2.0 BEHAVIOUR lens ---------------- */
  function trow(key, title, desc, on) {
    return '<button type="button" class="trow' + (on ? ' on' : '') + '" data-tr="' + key + '"><span class="tsw"></span><span style="flex:1"><span class="tt">' + title + '</span><div class="td">' + desc + '</div></span></button>';
  }
  function behaviourInspector() {
    var p = draft;
    var h = '<h2>☑ Behaviour</h2><div class="ctx">How this mode behaves in the room</div>';
    h += '<div class="tgroup"><div class="zt">Safety</div>'
      + trow('kidSafe', 'Kid-safe', 'Softens scares, lightning flashes and shakes for young eyes', !!p.kidSafe) + '</div>';
    h += '<div class="tgroup"><div class="zt">On the frames</div>'
      + trow('captions', 'Scene captions', 'Show caption text along the bottom of scene frames', !!p.captions)
      + trow('nowPlaying', 'Show now-playing track', 'Pops a subtle song pill on the TVs for ~10s each time the music changes track. Off for most modes; nice for Party.', !!p.nowPlaying)
      + trow('halo', 'Accent halo glow', 'A soft inner glow on every TV in this mode’s accent colour — untick if it tints the art', p.halo !== false)
      + (p.halo !== false ? '<div class="r3" style="margin-top:8px">'
        + '<label class="fld"><span>Halo colour' + T('Defaults to the mode’s accent. Pick any colour to glow independently of the accent.') + '</span><input type="color" data-hl="haloColor" value="' + (p.haloColor || p.accent || '#c9a35e') + '"></label>'
        + '<label class="fld"><span>Size (vmin)' + T('How far the glow reaches in from the TV edges. 18 = the original look; smaller = a subtle rim, larger = a deep wash.') + '</span><input type="number" data-hl="haloSize" min="2" max="50" step="1" value="' + (p.haloSize != null ? p.haloSize : 18) + '"></label>'
        + '<label class="fld"><span>Opacity %' + T('Glow strength. 33 = the original look; 0 hides it entirely.') + '</span><input type="number" data-hl="haloOpacity" min="0" max="100" step="1" value="' + (p.haloOpacity != null ? p.haloOpacity : 33) + '"></label>'
        + '</div><button class="btn sm gh" data-hlreset style="margin-bottom:8px">↩ Reset halo to accent defaults</button>' : '') + '</div>';
    h += '<div class="tgroup"><div class="zt">TV power</div>'
      + trow('tvSleep', 'Screens sleep in this mode', 'Turns all six TVs off when this mode starts (they need a manual wake after). Off = leave TV power alone', !!p.tvSleep) + '</div>';
    h += '<div class="hint" style="margin:4px 0 10px">💡 Lighting (zones, effects, flicker) has its own tab above the wall.</div>';
    h += '<div class="tgroup"><div class="zt">Automation</div>'
      + trow('ambient', 'Ambient mode', 'The calendar (rhythms & weather) may switch to and from this mode on its own', !!p.ambient)
      + trow('weatherFx', 'Live weather on windows', 'Real rain / snow / fog fills any frame whose effect slot is empty', !!p.weatherFx) + '</div>';
    h += '<div class="tgroup"><div class="zt">In Play</div>'
      + trow('shown', 'Show in Play', 'Untick to hide this mode from the family remote — it stays here in Design', !p.hidden) + '</div>';
    h += '<div class="card"><div class="zt">Labels' + T('Text notes shown on the mode\u2019s card in Play — a reminder of the soundscape / album that suits this mode. They don\u2019t control playback.') + '</div>'
      + '<div class="r2"><label class="fld"><span>Ambience label</span><input type="text" data-k="ambience" value="' + esc(p.ambience || '') + '"></label>'
      + '<label class="fld"><span>Music label</span><input type="text" data-k="music" value="' + esc(p.music || '') + '"></label></div></div>';
    h += '<div class="card">' + phasesEditorHTML() + '</div>';
    h += '<div class="card">' + momentsEditorHTML() + '</div>';
    h += '<div class="card">' + rulesEditorHTML() + '</div>';
    h += '<button class="btn dg gh sm" id="delmode" style="width:100%;margin-top:4px">Delete this mode…</button>';
    return h;
  }
  /* phases = the mode's chapters (override patches; conductor v2.2) */
  function phasesEditorHTML() {
    var phs = draft.phases || [];
    var h = '<div class="zt">Phases — the mode\u2019s chapters' + T('Chapters of one evening: Setup → Play → Boss fight → Victory. Each phase changes only what you set (lighting, scene, music, an entry sting) — everything else stays as the base mode. While the mode is live, the Now Playing bar grows an advance control.') + '</div>';
    h += '<div class="phrail"><span class="phchip' + (phaseSel ? '' : ' on') + '" data-phsel="">● Base</span>'
      + phs.map(function (ph) { return '<span class="phchip' + (phaseSel === ph.id ? ' on' : '') + '" data-phsel="' + esc(ph.id) + '">' + (ph.icon ? ph.icon + ' ' : '') + esc(ph.name || ph.id) + (ph.autoS ? ' <span style="font-size:10px;color:var(--gold2)">⏱' + (+ph.autoS) + 's</span>' : '') + '</span>'; }).join('')
      + '<button class="btn sm gh" data-phadd>＋ Add phase</button></div>';
    if (phaseSel) {
      var ph = null; phs.forEach(function (x) { if (x && x.id === phaseSel) ph = x; });
      if (ph) {
        var pt = ph.patch || {};
        var evs = []; IE.FX.EVENTS.forEach(function (e) { if (e !== 'none') evs.push(e); });
        h += '<div class="phbox">'
          + '<div class="hint" style="margin-bottom:9px">The wall preview shows this phase. Anything left \u201c(as base)\u201d follows the base mode.</div>'
          + '<div class="r2"><label class="fld"><span>Phase name</span><input type="text" data-php="name" value="' + esc(ph.name || '') + '"></label>'
          + '<label class="fld"><span>Icon (emoji)</span><input type="text" data-php="icon" value="' + esc(ph.icon || '') + '"></label></div>'
          + '<div class="r2"><label class="fld"><span>Lighting</span><select data-phl><option value="">(as base)</option>' + opt(Object.keys(IE.LIGHT_SCENES), pt.light || '') + '</select></label>'
          + '<label class="fld"><span>Entry event' + T('A one-off flourish when this phase begins — lightning, bloom, shake…') + '</span><select data-phe><option value="">(none)</option>' + opt(evs, (pt.transition && pt.transition.event) || '') + '</select></label></div>'
          + '<div class="fld"><span>Default scene</span><button class="btn" data-phscene style="width:calc(100% - 74px);text-align:left">🖼 ' + esc(pt.scene ? niceName(pt.scene) : '(as base)') + '</button>' + (pt.scene ? '<button class="btn sm gh" data-phscenex style="margin-left:6px">↩</button>' : '') + '</div>'
          + '<div class="r2"><label class="fld"><span>Entry sound' + T('A one-shot sting when this phase begins.') + '</span><select data-phis>' + sndOpts(pt.audio && pt.audio.intro && pt.audio.intro.sound) + '</select></label>'
          + '<label class="fld"><span>Background track' + T('Replaces the playlist during this phase. Blank keeps the base playlist playing.') + '</span><select data-phbt>' + sndOpts(pt.audio && pt.audio.playlist && pt.audio.playlist.tracks && pt.audio.playlist.tracks[0]) + '</select></label></div>'
          + '<label class="fld" style="margin-top:8px"><span>⏱ Auto-advance after (seconds)' + T('Advances to the next phase automatically — great for dinners that drift from aperitif to dessert. Blank = advance by hand from Play.') + '</span><input type="number" data-phauto min="5" step="5" placeholder="manual" value="' + (ph.autoS ? +ph.autoS : '') + '"></label>'
          + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px"><button class="btn sm gh" data-phmove="-1">◂ Earlier</button><button class="btn sm gh" data-phmove="1">Later ▸</button><div class="sp"></div><button class="btn sm gh dg" data-phdel>✕ Remove phase</button></div>'
          + '</div>';
      }
    } else if (phs.length) {
      h += '<div class="hint" style="margin-bottom:6px">Playing order: <b style="color:var(--gold2)">Base → ' + phs.map(function (ph) { return esc(ph.name || ph.id); }).join(' → ') + '</b>. Tap a chip to edit that phase; the wall previews it.</div>';
    } else {
      h += '<div class="hint">No phases yet. Add \u201cBoss fight\u201d and give it dungeon lighting, a dragon scene and battle music — then advance to it from Play, mid-game.</div>';
    }
    return h;
  }
  /* moments = per-mode Social-row buttons */
  function momentsEditorHTML() {
    var ms = draft.moments || [];
    var EVS = [{ v: '', l: '(none)' }, { v: 'lightning', l: 'lightning' }, { v: 'softflash', l: 'soft flash' }, { v: 'bloom', l: 'bloom' }, { v: 'shake', l: 'shake' }];
    var h = '<div class="zt">Moments — this mode\u2019s own buttons' + T('Extra 🎭 Moments buttons that appear in Play only while this mode is live — a dragon roar for Gloomhaven, a fanfare for birthdays. Sound + screen event, fire-and-forget; the room settles back by itself.') + '</div>';
    h += ms.map(function (m, i) {
      return '<div class="phbox" style="border-color:var(--line);background:none">'
        + '<div class="r2"><label class="fld"><span>Label</span><input type="text" data-mo="' + i + '|label" value="' + esc(m.label || '') + '"></label>'
        + '<label class="fld"><span>Icon (emoji)</span><input type="text" data-mo="' + i + '|icon" value="' + esc(m.icon || '') + '"></label></div>'
        + '<div class="r2"><label class="fld"><span>Sound</span><select data-mo="' + i + '|sfx">' + sndOpts(m.sfx) + '</select></label>'
        + '<label class="fld"><span>Screen event</span><select data-mo="' + i + '|event">' + opt(EVS, m.event || '') + '</select></label></div>'
        + '<div style="display:flex;gap:8px"><button class="btn sm gh" data-motest="' + i + '">▶ Try it</button><div class="sp"></div><button class="btn sm gh dg" data-morm="' + i + '">✕ Remove</button></div></div>';
    }).join('');
    h += '<button class="btn sm" data-moadd>＋ Add a moment button</button>';
    return h;
  }
  /* v2.17 RULES & TUTORIAL — link a mode to a game in rules-data.json, override the
     tutorial video and pick which panels show on the wall. Stored on profile.rules =
     { game, videoId, sections:{setup,turn,win,tips} }. "Show on wall" POSTs
     /api/rules/show {game, videoId, sections}; the games list comes from GET /api/rules. */
  function ytId(s) { s = String(s || '').trim(); var m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/); if (m) return m[1]; return /^[\w-]{6,}$/.test(s) ? s : s; }
  function rulesEditorHTML() {
    var r = draft.rules || {};
    var games = window.__rulesGames;
    var sec = r.sections || {};
    /* Phase 2c: panel homes come from the layout — wall 1 carries setup (first
       frame) + how-to (last frame), wall 2 carries winning + tips; single-wall
       layouts fold everything onto the one wall. Same map as frame.html's
       rules-overlay roleFor(). */
    var wkeys = Object.keys(layout.walls);
    var rw1 = layout.walls[wkeys[0]] || [], rw2 = (wkeys.length > 1 ? layout.walls[wkeys[1]] : layout.walls[wkeys[0]]) || [];
    var SEC = [['setup', 'Setup', rw1[0]], ['turn', 'How to play', rw1[rw1.length - 1]], ['win', 'Winning', rw2[0]], ['tips', 'Tips', rw2[rw2.length - 1]]];
    var h = '<div class="zt">📖 Rules &amp; tutorial' + T('Point this mode at a game’s rules (from rules-data.json). The ticked panels show as rules cards on the outer TVs (first and last of each wall); the tutorial video plays on the centre TVs. Show on wall displays them now; the choice saves with the mode.') + '</div>';
    if (!games) { h += '<div class="hint" id="rulesloading">Loading games…</div>'; return h; }
    var keys = Object.keys(games).sort(function (a, b) { return String((games[a] && games[a].name) || a).localeCompare(String((games[b] && games[b].name) || b)); });
    h += '<label class="fld"><span>Rules source (game)</span><select data-rules="game"><option value="">— none —</option>'
      + keys.map(function (k) { return '<option value="' + esc(k) + '"' + (r.game === k ? ' selected' : '') + '>' + esc((games[k] && games[k].name) || k) + '</option>'; }).join('') + '</select></label>';
    if (r.game) {
      var def = (games[r.game] && games[r.game].videoId) || '';
      h += '<label class="fld" style="margin-top:8px"><span>Tutorial video (YouTube link or ID)</span><input type="text" data-rules="videoId" placeholder="' + esc(def || 'youtu.be/…') + '" value="' + esc(r.videoId || '') + '"></label>';
      h += '<div class="fld" style="margin-top:8px"><span>Show which panels</span><div class="row" style="gap:5px;flex-wrap:wrap">'
        + SEC.map(function (s) { var on = sec[s[0]] !== false; return '<button class="btn sm' + (on ? '' : ' gh') + '" data-rulesec="' + s[0] + '">' + s[1] + (s[2] ? ' · ' + s[2] : '') + '</button>'; }).join('') + '</div></div>';   /* Phase 2c: frame id from the layout (may be absent on tiny layouts) */
      h += '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm" id="rulesshow">▶ Show on wall</button><button class="btn sm gh" id="ruleshide">Hide</button></div>';
    } else {
      h += '<div class="hint" style="margin-top:6px">Pick a game to set its video and panels. Leave as “none” for modes without rules.</div>';
    }
    return h;
  }
  /* v2.31 💡 LIGHTING lens — the mode's whole light story in one tab: base scene +
     per-zone overrides (scene / effect incl. custom flicker w/ intensity+speed / bright)
     + live preview. Everything saves with the mode and auto-applies on launch. */
  function lightingInspector() {
    var p = draft;
    var LZ = [['chandelier', '🕯 Chandelier'], ['lamps', '🛋 Console lamps']];
    var LZEFF = [['none', '(none)'], ['candle', 'candle · native Hue'], ['fire', 'fire · native Hue'], ['sparkle', 'sparkle · native Hue'], ['prism', 'prism · native Hue'], ['opal', 'opal · native Hue'], ['glisten', 'glisten · native Hue'], ['flicker', '🔥 flicker · custom (intensity + speed)']];
    var lzScenes = Object.keys(IE.LIGHT_SCENES || {}); if (lzScenes.indexOf('candle') < 0) lzScenes.push('candle');
    var h = '<h2>💡 Lighting</h2><div class="ctx">Saved with the mode — the room sets itself like this every time you launch it</div>';
    h += '<div class="card"><label class="fld"><span>Base scene — the whole room' + T('Every dining-room light (chandelier + both console lamps) follows this unless a zone below overrides it.') + '</span><select data-k="light">' + opt(lzScenes, p.light || 'gallery') + '</select></label></div>';
    LZ.forEach(function (z) {
      var c = (p.lightZones || {})[z[0]] || {};
      var isFlicker = c.effect === 'flicker';
      h += '<div class="card"><div class="zt">' + z[1] + (c.scene || c.effect || c.brightness_pct != null ? '' : ' <span class="hint">— following base</span>') + '</div>'
        + '<div class="r3" style="align-items:end"><label class="fld"><span>Scene</span><select data-lzs="' + z[0] + '"><option value="">(as base)</option>' + lzScenes.map(function (s) { return '<option value="' + s + '"' + (c.scene === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>'
        + '<label class="fld"><span>Light effect</span><select data-lze="' + z[0] + '">' + LZEFF.map(function (ef) { return '<option value="' + ef[0] + '"' + ((c.effect || 'none') === ef[0] ? ' selected' : '') + '>' + ef[1] + '</option>'; }).join('') + '</select></label>'
        + '<label class="fld"><span>Bright %</span><input type="number" data-lzb="' + z[0] + '" min="1" max="100" placeholder="(scene)" value="' + (c.brightness_pct != null ? c.brightness_pct : '') + '"></label></div>'
        + (isFlicker ? '<div class="r2" style="margin-top:8px"><label class="fld"><span>Flicker intensity <b style="color:var(--gold2)">' + (c.flickerInt != null ? c.flickerInt : 50) + '</b>' + T('How far the light sways around the base brightness. Low = a gentle breathing candle; high = a storm-lantern gutter.') + '</span><input type="range" data-lzi="' + z[0] + '" min="1" max="100" value="' + (c.flickerInt != null ? c.flickerInt : 50) + '"></label>'
          + '<label class="fld"><span>Flicker speed <b style="color:var(--gold2)">' + (c.flickerSpeed != null ? c.flickerSpeed : 50) + '</b>' + T('How often it moves. Low = slow, lazy sway; high = restless, agitated flame.') + '</span><input type="range" data-lzp="' + z[0] + '" min="1" max="100" value="' + (c.flickerSpeed != null ? c.flickerSpeed : 50) + '"></label></div>' : '')
        + '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm" data-lzprev="' + z[0] + '">▶ Preview on the room now</button>' + ((c.scene || c.effect || c.brightness_pct != null) ? '<button class="btn sm gh" data-lzclear="' + z[0] + '">↩ Follow base</button>' : '') + '</div></div>';
    });
    h += '<div class="hint">Native Hue effects run on the bulb (smoothest, no knobs). 🔥 flicker is RoomScape’s own — it has the intensity and speed sliders. Save the mode to keep all of this.</div>';
    return h;
  }
  /* v2.32 shared controls for the viz + playlist content types */
  function orientationHTML(ori) {
    ori = ori || 'portrait';
    return '<div class="fld" style="margin-top:10px"><span>Appearance' + T('Portrait keeps the visual self-contained on this one TV. Panorama makes this frame draw its slice of a single visual spanning its wall — frames on the same wall sharing the same style join into one wide piece.') + '</span>'
      + '<div class="typetiles" style="grid-template-columns:1fr 1fr">'
      + '<button class="tile' + (ori === 'portrait' ? ' on' : '') + '" data-ori="portrait"><span class="ic">▯</span><span class="lb">Portrait</span></button>'
      + '<button class="tile' + (ori === 'panorama' ? ' on' : '') + '" data-ori="panorama"><span class="ic">▭</span><span class="lb">Panorama</span></button></div></div>';
  }
  function vizColorHTML(vz) {
    var pals = (window.IE && IE.VIZ_PALETTES) || [];
    var isPal = vz.color && String(vz.color).indexOf('pal:') === 0;
    var isCustom = vz.color && vz.color !== 'auto' && !isPal;
    var cur = vz.color === 'auto' ? 'auto' : (isPal ? vz.color : 'custom');
    var opts = '<option value="auto"' + (cur === 'auto' ? ' selected' : '') + '>Gold (auto)</option>';
    pals.forEach(function (p) { if (p.id === 'gold') return; opts += '<option value="pal:' + p.id + '"' + (cur === 'pal:' + p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; });
    opts += '<option value="custom"' + (cur === 'custom' ? ' selected' : '') + '>Custom colour…</option>';
    var stops = isCustom ? [vz.color, vz.color] : ((window.IE && IE.palStops) ? IE.palStops(vz.color) : ['#c9a24a', '#ffe6a8']);
    var h = '<div class="r2" style="margin-top:10px"><label class="fld"><span>Colour' + T('The palette that drives the visual. Solid colours use one tone; gradient palettes (VU meter, Sunset, Viridis…) spread across the spectrum — low frequencies at one end, highs at the other.') + '</span><select data-vz="colmode">' + opts + '</select></label>'
      + '<div class="fld"><span>Palette</span><div style="height:30px;border-radius:8px;border:1px solid var(--line);background:linear-gradient(90deg,' + stops.join(',') + ')"></div></div></div>';
    if (isCustom) h += '<label class="fld" style="margin-top:8px"><span>Pick colour</span><input type="color" data-vz="color" value="' + esc(vz.color) + '"></label>';
    return h;
  }
  function bgPickerHTML(bg, ns) {
    var lbl = bg && bg.key ? niceName(bg.key) + (bg.video ? ' · video' : '') : 'None — visual on its own';
    return '<div class="fld" style="margin-top:10px"><span>Background' + T('An image or video shown behind the visual (from your media library). Leave as None for the visual on a dark stage.') + '</span>'
      + '<button class="btn" data-bgpick="' + ns + '" style="width:100%;text-align:left">🖼 ' + esc(lbl) + '</button></div>'
      + (bg && bg.key ? ('<div class="r2" style="margin-top:6px"><button class="btn sm gh" data-bgclr="' + ns + '">↩ No background</button>'
          + '<label class="fld"><span>Dim <b style="color:var(--gold2)">' + Math.round((bg.dim != null ? bg.dim : 0.35) * 100) + '%</b></span><input type="range" data-bgdim="' + ns + '" min="0" max="90" value="' + Math.round((bg.dim != null ? bg.dim : 0.35) * 100) + '"></label></div>') : '');
  }
  function frameInspector() {
    /* Phase 2d: tiles from the single registry (engine.js IE.KINDS); appOrder
       preserves this inspector's historical order (pano, portrait, photos, viz,
       playlist, score, map, clock, off) — NOT the deck's click-cycle order. */
    var kinds = (IE.KINDS || []).slice().sort(function (a, b) { return (a.appOrder || 0) - (b.appOrder || 0); })
      .map(function (k) { return { v: k.id, ic: k.appIcon, l: k.label }; });
    var p = draft;
    var kind = p.frames[sel[0]], same = sel.every(function (i) { return p.frames[i] === kind; });
    var h = '<h2>' + sel.map(function (i) { return FRAME_IDS[i]; }).join(' + ') + '</h2><div class="ctx">Frame' + (sel.length > 1 ? 's' : '') + ' — shift-click frames or use the chips to multi-select</div>'
      + selChips()
      + '<div class="zt">Content type' + T('What this frame displays. Panorama/Portrait = scene art (panorama joins with wall neighbours showing the same scene); Photos = album slideshow; Music Viz = audio-reactive visuals over a background you choose; Playlist = now-playing / album-art displays; Score/Map/Clock = live game panels; Off = dark quiet panel.') + '</div><div class="typetiles">' + kinds.map(function (k) { return '<button class="tile' + (same && k.v === kind ? ' on' : '') + '" data-kind="' + k.v + '"><span class="ic">' + k.ic + '</span><span class="lb">' + k.l + '</span></button>'; }).join('') + '</div>';
    if (same && (kind === 'pano' || kind === 'portrait')) {
      var sc = p.frameScenes[sel[0]];
      h += '<div class="fld"><span>Scene' + T('This frame’s own image or video, overriding the mode default. Wall neighbours sharing the same panorama scene split it into one wide vista.') + '</span><button class="btn" id="fscene" style="width:100%;text-align:left">🖼 ' + esc(sc ? niceName(sc) : ('Default: ' + (p.scene ? niceName(p.scene) : '—'))) + '</button></div>'
        + (sc ? '<button class="btn sm gh" id="fscenedef">↩ Use mode default</button>' : '')
        + '<label class="fld"><span>Scene fit' + T('How the image fills this frame whenever it shows the WHOLE picture (portrait frames, and panoramas in Fill-each-screen or auto-solo). Fill &amp; crop keeps proportions and trims the excess (the old behaviour); Fit inside letterboxes; Stretch distorts to fill; Fit width / Fit height match one axis and centre the other. Panoramas spanned across the wall keep their slices and ignore this.') + '</span><select data-scf>' + opt([
          { v: 'cover', l: 'Fill & crop (default)' }, { v: 'contain', l: 'Fit inside' }, { v: 'stretch', l: 'Stretch to fill' }, { v: 'width', l: 'Fit to width' }, { v: 'height', l: 'Fit to height' }
        ], (p.scnFit && p.scnFit[sel[0]]) || 'cover') + '</select></label>'
        + '<div class="fld" style="margin-top:12px"><span>Overlay' + T('Window/porthole art layered over the scene — pure green areas become transparent so the scene shows through, like looking out of a window.') + '</span><button class="btn" id="fovl" style="width:100%;text-align:left">▣ ' + esc(p.overlays[sel[0]] ? niceName(p.overlays[sel[0]]) : 'None') + '</button></div>';
      if (p.overlays[sel[0]]) {
        var ofv = (p.ovlFit && p.ovlFit[sel[0]]) || 'stretch';
        h += '<label class="fld"><span>Overlay fit' + T('How the overlay image fills the frame. Stretch distorts it to fill exactly (fine for full-frame window art); Fill &amp; crop keeps proportions and trims the excess; Fit inside letterboxes; Fit width / Fit height match one axis and centre the other.') + '</span><select data-ovf>' + opt([
          { v: 'stretch', l: 'Stretch to fill (default)' }, { v: 'cover', l: 'Fill & crop' }, { v: 'contain', l: 'Fit inside' }, { v: 'width', l: 'Fit to width' }, { v: 'height', l: 'Fit to height' }
        ], ofv) + '</select></label>';
      }
    } else if (same && kind === 'photos') {
      var ph = p.photos || {};
      h += '<div class="zt" style="margin-top:4px">Photo slideshow (shared by all photo frames in this mode)</div>'
        + '<label class="fld"><span>Album' + T('The photo folder to show — from Photos/ or the openFrame share (nested albums included). 📅 On this day is a living album: photos taken on today’s date across the years. Each photo frame draws different photos from the same album.') + '</span><select data-ph="dir"><option value="">(none)</option>' + albums.map(function (a) { return '<option value="' + esc(a.dir) + '"' + (ph.dir === a.dir ? ' selected' : '') + '>' + esc(a.name || a.dir) + ' · ' + a.count + '</option>'; }).join('') + '</select></label>'
        + '<div class="r3"><label class="fld"><span>Order' + T('random shuffles the album; seq walks through it in filename order.') + '</span><select data-ph="order">' + opt([{ v: 'random', l: 'Random' }, { v: 'norepeat', l: 'Shuffle — show all before repeating' }, { v: 'seq', l: 'In filename order' }], ph.order || 'random') + '</select></label>'
        + '<label class="fld"><span>Secs/change' + T('Seconds between individual photo changes. Each change crossfades one photo (or one row/column band) in place — the wall stays alive without ever going blank.') + '</span><input type="number" data-ph="intervalS" min="3" step="1" value="' + (ph.intervalS || 20) + '"></label>'
        + '<label class="fld"><span>Fade secs' + T('Length of each crossfade — 0.5 is snappy, 5+ is a slow dreamy dissolve.') + '</span><input type="number" data-ph="fadeS" min="0.2" max="20" step="0.2" value="' + (ph.fadeS || 1.2) + '"></label></div>'
        + '<div class="r2"><label class="fld"><span>Layout' + T('How many prints on the frame — from one full-bleed photo to a 112-print mega wall. Tetris makes photos fall and stack.') + '</span><select data-ph="layout">' + opt([
            { v: 'auto', l: 'Auto' }, { v: 'maximise', l: 'Maximise' }, { v: 'single', l: 'Single print' }, { v: 'pair', l: 'Pair' }, { v: 'triptych', l: 'Triptych' }, { v: 'quad', l: 'Quad 2×2' },
            { v: 'grid6', l: 'Grid 6' }, { v: 'grid12', l: 'Grid 12' }, { v: 'grid24', l: 'Grid 24' }, { v: 'wall', l: 'Photo wall 60' }, { v: 'megawall', l: 'Mega wall 112' }, { v: 'mosaic', l: 'Mosaic 104' },
            { v: 'collage', l: 'Collage' }, { v: 'polaroid', l: 'Polaroids' }, { v: 'filmstrip', l: 'Film strip' }, { v: 'hero', l: 'Hero 1+3' }, { v: 'salon', l: 'Salon hang' }, { v: 'stack', l: 'Stack 2–4' }, { v: 'tetris', l: 'Tetris' }
          ], ph.layout || 'auto') + '</select></label>'
        + '<label class="fld"><span>Change style' + T('Which cell changes each interval: Sparkle picks one at random, Cascade runs in sequence, Sweeps replace whole rows/columns/rings, All together swaps everything at once.') + '</span><select data-ph="swap">' + opt([
            { v: 'sparkle', l: 'Sparkle — random cell' }, { v: 'cascade', l: 'Cascade' }, { v: 'rows', l: 'Sweep rows' }, { v: 'cols', l: 'Sweep columns' }, { v: 'diag', l: 'Sweep diagonal' }, { v: 'centre', l: 'Centre out' }, { v: 'all', l: 'All together' }
          ], ph.swap || 'sparkle') + '</select></label></div>'
        + '<label class="fld"><span>Frame style' + T('Print on mat lays each photo ON TOP of its white card, drop shadow under the print. Behind mat sinks the photo beneath a white mount with a cut-out window \u2014 the mat casts a soft shadow onto the photo, like a real window-mounted frame.') + '</span><select data-ph="matStyle">' + opt([{ v: 'print', l: 'Print on mat' }, { v: 'recessed', l: 'Behind mat (recessed)' }], ph.matStyle || 'print') + '</select></label>'
        + ((ph.layout === 'stack') ? '<label class="fld"><span>Stack #</span><input type="number" data-ph="perFrame" min="2" max="4" value="' + (ph.perFrame || 3) + '"></label>' : '');
    } else if (same && kind === 'viz') {
      var vz = p.frameViz[sel[0]] || defVizCfg();
      h += '<div class="zt" style="margin-top:4px">🎶 Music visualiser' + T('Audio-reactive art that plays on this TV while music is on. Real spectrum when the mode’s own playlist plays through the TVs; Music Assistant / Spotify drives a synced musical clock plus now-playing info.') + '</div>'
        + '<label class="fld"><span>Style</span><select data-vz="style">' + VIZ_STYLES.map(function (s2) { return '<option value="' + s2[0] + '"' + (vz.style === s2[0] ? ' selected' : '') + '>' + s2[1] + '</option>'; }).join('') + '</select></label>'
        + (vz.style === 'shuffle' ? '<label class="fld"><span>Change every (min)</span><input type="number" data-vz="shuffleMin" min="1" max="60" value="' + (vz.shuffleMin || 5) + '"></label>' : '')
        + orientationHTML(vz.ori)
        + bgPickerHTML(vz.bg, 'vz')
        + vizColorHTML(vz)
        + '<label class="fld" style="margin-top:10px"><span>Sensitivity <b style="color:var(--gold2)">' + (vz.sens || 1) + '</b>' + T('How hard the visual reacts to the music. Low = calm, restrained; high = wild, punchy.') + '</span><input type="range" data-vz="sens" min="0.4" max="2.5" step="0.1" value="' + (vz.sens || 1) + '"></label>'
        + '<label class="chk" style="margin-top:8px"><input type="checkbox" data-vz="nowPlaying"' + (vz.nowPlaying !== false ? ' checked' : '') + '> Show now-playing track</label>'
        + '<div class="hint" style="margin-top:8px">' + (vz.ori === 'panorama' ? 'Panorama — this frame draws its slice of one visual spanning its wall (frames sharing the same wall & style join up).' : 'Portrait — a self-contained visual on this TV.') + ' Changes reach the live wall within ~20s.</div>';
    } else if (same && kind === 'playlist') {
      var pv = p.framePlaylist[sel[0]] || defPlaylistCfg();
      var dd = PLAYLIST_DISPLAYS.filter(function (d) { return d[0] === pv.display; })[0] || PLAYLIST_DISPLAYS[0];
      h += '<div class="zt" style="margin-top:4px">♪ Playlist display' + T('A visual for the music itself — album art, track info and the queue, drawn from the room’s now-playing (Music Assistant / Spotify or this mode’s own playlist). This is the picture on the TV; where the sound comes out is set in the 🔊 Sound tab.') + '</div>'
        + '<label class="fld"><span>Display</span><select data-pv="display">' + PLAYLIST_DISPLAYS.map(function (d) { return '<option value="' + d[0] + '"' + (pv.display === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></label>'
        + '<div class="hint" style="margin:-4px 0 8px">' + esc(dd[2]) + '</div>'
        + orientationHTML(pv.ori)
        + bgPickerHTML(pv.bg, 'pv')
        + '<div class="r3" style="margin-top:10px"><label class="fld"><span>Accent</span><select data-pv="colmode"><option value="auto"' + (pv.color === 'auto' ? ' selected' : '') + '>Gold (auto)</option><option value="custom"' + (pv.color !== 'auto' ? ' selected' : '') + '>Custom…</option></select></label>'
        + (pv.color !== 'auto' ? '<label class="fld"><span>Pick</span><input type="color" data-pv="color" value="' + esc(pv.color || '#c9a35e') + '"></label>' : '<label class="fld"><span>&nbsp;</span><span class="hint" style="padding-top:8px">follows the mode accent</span></label>')
        + ((pv.display === 'artviz' || pv.display === 'spectrum' || pv.display === 'lyricstrip') ? '<label class="fld"><span>Reactivity <b style="color:var(--gold2)">' + (pv.sens || 1) + '</b></span><input type="range" data-pv="sens" min="0.4" max="2.5" step="0.1" value="' + (pv.sens || 1) + '"></label>' : '<label class="fld"><span>&nbsp;</span><span class="hint">&nbsp;</span></label>')
        + '</div>';
    } else if (!same) {
      h += '<div class="hint">Selected frames have different types — pick a type above to unify them.</div>';
    } else {
      h += '<div class="hint">' + (kind === 'score' ? 'Scoreboard renders live game data.' : kind === 'map' ? 'Map renders the mode’s map panel.' : kind === 'clock' ? 'Phase clock shows the current phase.' : 'This frame is off — a dark, quiet panel.') + '</div>';
    }
    if (same && kind !== 'off') {
      h += '<div class="hint" style="margin-top:12px">≋ This frame\u2019s effect layer &amp; reveal video live in the <b>✨ Motion &amp; FX</b> tab above the wall.</div>';
    }
    h += '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">'
      + '<button class="btn sm" data-apply="wall" title="Stamp this frame’s type, scene, overlay and effect onto all three frames of its wall">Copy to this Wall Set</button>'
      + '<button class="btn sm" data-apply="all" title="Stamp this frame’s type, scene, overlay and effect onto all six frames">Copy to All TVs</button></div>';
    return h;
  }
  /* ==================== v3.08 🎬 INTRO LENS ==================== */
  var IN_EVENTS = [{ v: 'lightning', l: '⚡ Lightning' }, { v: 'shake', l: '💥 Shake' }, { v: 'bloom', l: '🌸 Bloom' }, { v: 'softflash', l: '✨ Soft flash' }, { v: 'whiteflash', l: '⚪ White flash' }, { v: 'blackout', l: '⬛ Blackout' }];
  var IN_TYPES = { sound: '🔊', voice: '🗣', screen: '⚡', lights: '💡', frames: '🖼' };
  /* v3.19 templates — every sound already lives in sounds/ */
  var IN_TEMPLATES = {
    storm: { l: '⛈ Thunderstorm', cues: [
      { at: 0, type: 'sound', src: 'sounds/sfx/thunder_1.mp3', where: 'all', gain: 1 }, { at: 0, type: 'screen', event: 'lightning' },
      { at: 300, type: 'lights', action: 'flash' }, { at: 1800, type: 'lights', action: 'off' },
      { at: 4200, type: 'sound', src: 'sounds/sfx/thunder_2.mp3', where: 'all', gain: 0.9 }, { at: 4200, type: 'screen', event: 'lightning' },
      { at: 7000, type: 'lights', action: 'on', transitionS: 2 }] },
    drumroll: { l: '🥁 Drumroll reveal', cues: [
      { at: 0, type: 'sound', src: 'sounds/loops/mountain_audio_suspense_rhythm.mp3', where: 'all', gain: 0.9 },
      { at: 0, type: 'lights', action: 'dip', amount: 0.5, holdS: 6 },
      { at: 6000, type: 'sound', src: 'sounds/fanfare/fanfare_1.mp3', where: 'all', gain: 1 }, { at: 6000, type: 'screen', event: 'bloom' }, { at: 6100, type: 'lights', action: 'flash' }] },
    shipboot: { l: '🚀 Ship boot-up', cues: [
      { at: 0, type: 'screen', event: 'blackout' }, { at: 0, type: 'lights', action: 'off' },
      { at: 800, type: 'sound', src: 'sounds/ambient/drone_console_room_droneloop_03.mp3', where: 'all', gain: 0.8 },
      { at: 3500, type: 'sound', src: 'sounds/loops/alarm_call_2.mp3', where: 'random', gain: 0.5 },
      { at: 6000, type: 'sound', src: 'sounds/sfx/mountain_audio_deep_whoosh.mp3', where: 'all', gain: 1 }, { at: 6000, type: 'screen', event: 'whiteflash' }, { at: 6200, type: 'lights', action: 'on', transitionS: 1.5 }] },
    seance: { l: '🕯 Blackout séance', cues: [
      { at: 0, type: 'lights', action: 'off' }, { at: 0, type: 'screen', event: 'blackout' },
      { at: 2000, type: 'sound', src: 'sounds/scary/breath_of_doom_1.mp3', where: 'all', gain: 0.9 },
      { at: 5500, type: 'sound', src: 'sounds/scary/low_ominous_bell_ringing.mp3', where: 'all', gain: 0.8 },
      { at: 9000, type: 'sound', src: 'sounds/sfx/thunder_1.mp3', where: 'all', gain: 1 }, { at: 9000, type: 'screen', event: 'lightning' }, { at: 9200, type: 'lights', action: 'flash' }] },
    partypop: { l: '🎉 Party pop', cues: [
      { at: 0, type: 'sound', src: 'sounds/fanfare/fanfare_1.mp3', where: 'all', gain: 1 }, { at: 0, type: 'screen', event: 'bloom' }, { at: 100, type: 'lights', action: 'flash' },
      { at: 2500, type: 'sound', src: 'sounds/sfx/bass_drop_01.mp3', where: 'all', gain: 1 }, { at: 2500, type: 'screen', event: 'shake' },
      { at: 5000, type: 'sound', src: 'sounds/sfx/applause_cheering.mp3', where: 'all', gain: 1 }, { at: 5100, type: 'lights', action: 'flash' }] }
  };
  function edBase(fn) { fn(draft); dirty = true; updateDirtyUI(); }   /* intro is mode-level — never a phase patch */
  function inEnsure() { draft.intro = draft.intro || { on: false, skippable: true, kidSafeAlt: 'skip', music: null, cues: [] }; if (!Array.isArray(draft.intro.cues)) draft.intro.cues = []; return draft.intro; }
  function inEnd(I) { var last = 0; (I.cues || []).forEach(function (c) { if (c.at > last) last = c.at; }); if (I.music && I.music.src && !(I.cues || []).length) last = Math.max(last, 4000); return (typeof I.endAtMs === 'number' && I.endAtMs > last) ? I.endAtMs : last + 1500; }
  function inFmt(ms) { return (ms / 1000).toFixed(1) + 's'; }
  function inLightScenes() { return (haRoom && haRoom.scenes) || Object.keys((settings.ha && settings.ha.lightScenes) || {}); }
  function inCueSummary(c) {
    if (c.type === 'sound' || c.type === 'voice') return (c.src ? niceName(c.src.replace(/^sounds\//, '')) : '(pick a sound)') + ' · ' + (c.where || 'all');
    if (c.type === 'screen') { var e = IN_EVENTS.find(function (x) { return x.v === c.event; }); return e ? e.l : 'Screen effect'; }
    if (c.type === 'frames') return 'Title card · ' + (c.scene ? niceName(c.scene) : '(pick media)') + ' · ' + ((c.frames && c.frames.length) ? c.frames.join('+') : 'all TVs') + (c.ms ? ' · ' + (c.ms / 1000) + 's' : ' · until launch');
    if (c.type === 'lights') {
      if (c.action === 'scene') return 'Lights → ' + (c.scene || '(pick a scene)');
      if (c.action === 'dip') return 'Lights dip ' + Math.round((c.amount || 0.35) * 100) + '% for ' + (c.holdS || 3) + 's';
      return 'Lights ' + (c.action || 'flash');
    }
    return c.type;
  }
  function inCueControls(c, i) {
    var h = '';
    if (c.type === 'sound' || c.type === 'voice')
      h = '<div class="r2"><select data-inc="' + i + '|src">' + sndOpts(c.src) + '</select><select data-inc="' + i + '|where">' + spOpts(c.where || 'all') + '</select></div>'
        + '<label class="fld" style="margin-top:4px"><span>Vol %</span><input type="number" data-inc="' + i + '|gain" min="0" max="100" value="' + Math.round((c.gain != null ? c.gain : 1) * 100) + '"></label>';
    else if (c.type === 'screen') {
      h = '<select data-inc="' + i + '|event">' + opt(IN_EVENTS, c.event || 'lightning') + '</select>';
      if (c.event === 'blackout') h += '<label class="fld" style="margin-top:4px"><span>Hold s — blank = until launch</span><input type="number" data-inc="' + i + '|msS" min="0.5" step="0.5" value="' + (c.ms ? (c.ms / 1000) : '') + '"></label>';
    } else if (c.type === 'frames') {
      h = '<button class="btn sm" data-inpick="' + i + '" style="width:100%;text-align:left">🖼 ' + esc(c.scene ? niceName(c.scene) : 'Choose the title image / video…') + '</button>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">' + FRAME_IDS.map(function (f) { return '<button class="chip' + ((c.frames || []).indexOf(f) >= 0 ? ' on' : '') + '" data-infrm="' + i + '|' + f + '">' + f + '</button>'; }).join('') + '</div>'
        + '<label class="fld" style="margin-top:4px"><span>Hold s — blank = until launch</span><input type="number" data-inc="' + i + '|msS" min="0.5" step="0.5" value="' + (c.ms ? (c.ms / 1000) : '') + '"></label>';
    }
    else if (c.type === 'lights') {
      h = '<select data-inc="' + i + '|action">' + opt([{ v: 'flash', l: '⚡ Flash' }, { v: 'dip', l: '🔅 Dip & recover' }, { v: 'off', l: '⭘ All OFF' }, { v: 'on', l: '⭗ All ON' }, { v: 'scene', l: '🎨 Scene…' }], c.action || 'flash') + '</select>';
      if (c.action === 'scene') h += '<div class="r2" style="margin-top:4px"><select data-inc="' + i + '|scene">' + opt([{ v: '', l: '— scene —' }].concat(inLightScenes().map(function (s) { return { v: s, l: s }; })), c.scene || '') + '</select><label class="fld"><span>Fade s</span><input type="number" data-inc="' + i + '|transitionS" min="0" step="0.5" value="' + (c.transitionS != null ? c.transitionS : 1) + '"></label></div>';
      if (c.action === 'dip') h += '<div class="r2" style="margin-top:4px"><label class="fld"><span>Dip %</span><input type="number" data-inc="' + i + '|amount" min="5" max="95" value="' + Math.round((c.amount || 0.35) * 100) + '"></label><label class="fld"><span>Hold s</span><input type="number" data-inc="' + i + '|holdS" min="1" value="' + (c.holdS || 3) + '"></label></div>';
    }
    return h;
  }
  function introInspector() {
    var I = inEnsure(), E = inEnd(I), cues = I.cues.slice().map(function (c, i) { return { c: c, i: i }; }).sort(function (a, b) { return a.c.at - b.c.at; });
    var h = '<h2>🎬 Intro <span style="font-size:12px;color:var(--faint)">· ' + esc(draft.name || curId) + '</span></h2>'
      + '<div class="ctx">A cue timeline that plays on manual launch, then the mode loads' + T('Sounds, screen effects and light moves at set times. Rehearse runs it in the real room without launching; automations (rhythms, schedule) never trigger intros.') + '</div>'
      + '<div style="display:flex;align-items:center;gap:10px;margin:10px 0">'
      + '<label class="fld" style="flex:none;flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-inopt="on"' + (I.on ? ' checked' : '') + '> <b>Enabled</b></label>'
      + '<span class="hint" style="flex:1">ends at <b style="color:var(--gold2)">' + inFmt(E) + '</b> → launch</span>'
      + '<button class="btn sm" id="inreh" title="Run this intro in the room now — no launch at the end">▶ Rehearse</button>'
      + '<button class="btn sm gh" id="instop" title="Stop the rehearsal">⏹</button></div>';
    /* mini timeline */
    h += '<div class="intl" id="intl">' + cues.map(function (x) {
      var cls = (x.c.type === 'screen') ? 'scr' : (x.c.type === 'lights') ? 'lgt' : (x.c.type === 'voice') ? 'vox' : (x.c.type === 'frames') ? 'frm' : 'snd';
      return '<span class="idot ' + cls + '" data-indot="' + x.i + '" style="left:calc(' + ((x.c.at / E) * 100).toFixed(2) + '% - 6px)" title="' + inFmt(x.c.at) + ' · ' + esc(inCueSummary(x.c)) + '"></span>';
    }).join('') + '<span class="iend" style="left:calc(100% - 3px)"></span><span class="iph" id="inph"></span></div>';
    /* cue cards */
    h += '<div class="incuegrid">' + cues.map(function (x) {
      var c = x.c, i = x.i;
      return '<div class="incue" data-incard="' + i + '">'
        + '<div class="tch"><div class="t">' + inFmt(c.at) + '</div><div class="nud"><button data-innud="' + i + '|-500">−.5</button><button data-innud="' + i + '|500">+.5</button></div></div>'
        + '<div class="ibody"><div class="isum">' + IN_TYPES[c.type] + ' ' + esc(inCueSummary(c)) + '</div>' + inCueControls(c, i) + '</div>'
        + '<button class="inchain' + (c.chain ? ' on' : '') + '" data-inchain="' + i + '" title="Chained — keeps its gap when the cue above moves">⟓</button>'
        + '<div class="iact"><button data-intry="' + i + '" title="Fire this cue in the room now">▶</button><button data-indup="' + i + '" title="Duplicate">⧉</button><button data-inrm="' + i + '" title="Delete">✕</button></div></div>';
    }).join('') + '</div>';
    if (!cues.length) h += '<div class="hint" style="margin:6px 0">No cues yet — add a thunder clap below, or a lights-out. The launch itself is always the final cue.</div>';
    /* add cue */
    h += '<div class="inadd">'
      + '<button data-inadd="sound">🔊 Sound</button><button data-inadd="screen">⚡ Screen effect</button>'
      + '<button data-inadd="lights">💡 Lights</button><button data-inadd="voice">🗣 Voice</button>'
      + '<button data-inadd="frames" style="grid-column:1 / -1">🖼 Title card on the wall</button></div>';
    /* v3.19 templates + copy-from-mode */
    h += '<div class="zt">Templates' + T('Pre-filled cue lists using sounds already in sounds/ — they REPLACE the current cues, then tweak away.') + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px">' + Object.keys(IN_TEMPLATES).map(function (k) { return '<button class="chip" data-intpl="' + k + '">' + IN_TEMPLATES[k].l + '</button>'; }).join('') + '</div>';
    var withIntro = vids().filter(function (k) { return k !== curId && profiles[k] && profiles[k].intro && (profiles[k].intro.cues || []).length; });
    if (withIntro.length) h += '<label class="fld"><span>⧉ Copy intro from</span><select data-incopy><option value="">— choose a mode —</option>' + withIntro.map(function (k) { return '<option value="' + esc(k) + '">' + esc(profiles[k].name || k) + '</option>'; }).join('') + '</select></label>';
    /* music bed */
    var m = I.music || {};
    h += '<div class="zt" style="margin-top:6px">🎵 Music bed' + T('One track under the whole intro (from sounds/, e.g. sounds/music/). Plays from 0s. Trim the file to roughly the intro length — v1 has no fade-out.') + '</div>'
      + '<div class="r2"><select data-inmus="src">' + sndOpts(m.src) + '</select>'
      + '<label class="fld"><span>Vol %</span><input type="number" data-inmus="gain" min="0" max="100" value="' + Math.round((m.gain != null ? m.gain : 0.8) * 100) + '"></label></div>';
    /* v3.29 🗣 Say (TTS via conductor /api/tts) */
    h += '<div class="zt" style="margin-top:14px">🗣 Say' + T('Type a line and pick a voice. "Say in room" speaks it on the TVs right now; "Render + add cue" saves it under sounds/voice/ and appends it to this intro as a voice cue. Needs the Piper add-on + Wyoming integration in Home Assistant (engine configurable in settings.tts).') + '</div>'
      + '<div class="r2"><input type="text" id="inttstext" maxlength="400" placeholder="Starting ' + esc(draft.name || curId) + '…"><select id="inttsvoice"><option value="">— voice —</option></select></div>'
      + '<div style="display:flex;gap:6px;align-items:center;margin-top:6px"><button class="btn sm" id="inttssay">🔊 Say in room</button><button class="btn sm" id="inttsadd">💾 Render + add cue</button><span class="hint" id="inttsout"></span></div>';
    /* options */
    h += '<details class="adv" style="margin-top:12px"><summary>Options</summary><div class="body">'
      + '<label class="fld" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-inopt="skippable"' + (I.skippable !== false ? ' checked' : '') + '> Skippable (⏭ in Play jumps straight to launch)</label>'
      + '<label class="fld" style="margin-top:8px"><span>When kid-safe is ON</span><select data-inopt="kidSafeAlt">' + opt([{ v: 'skip', l: 'Skip the intro (launch instantly)' }, { v: 'run', l: 'Run it anyway' }], I.kidSafeAlt || 'skip') + '</select></label>'
      + '<label class="fld" style="margin-top:8px"><span>End at (s) — blank = auto' + T('Auto: last cue + 1.5s. Set a number to hold longer before the launch.') + '</span><input type="number" data-inopt="endAtMs" step="0.5" min="1" max="60" value="' + (typeof I.endAtMs === 'number' ? (I.endAtMs / 1000) : '') + '"></label>'
      + (draft.audio && draft.audio.intro && draft.audio.intro.sound ? '<button class="btn sm" id="inimport" style="margin-top:10px">⇪ Import the 🔔 intro sting from the Sound lens as cue 0</button>' : '')
      + '<div class="hint" style="margin-top:10px">Manual launches only — rhythms and the schedule always skip intros. Panic aborts one instantly. Hard caps: 60s, 30 cues.</div></div></details>';
    return h;
  }
  /* v3.29 — full-width host below the wall canvas */
  function renderIntroMain() {
    var host = $('#intromain');
    if (!host) { host = D.createElement('div'); host.id = 'intromain'; var w = $('#walls'); w.parentNode.insertBefore(host, w.nextSibling); }
    host.innerHTML = '<div id="introroot">' + introInspector() + '</div>';
    bindIntroLens();
  }
  var inVoices = null;
  var inRehT = null;
  function bindIntroLens() {
    function rerender() { renderInspector(); }
    $$('#introroot [data-inopt]').forEach(function (el) {
      el.onchange = function () {
        edBase(function (d) { var I = inEnsure(); var k = el.dataset.inopt;
          if (k === 'on' || k === 'skippable') I[k] = el.checked;
          else if (k === 'endAtMs') I.endAtMs = el.value === '' ? undefined : Math.round(+el.value * 1000);
          else I[k] = el.value; });
        if (el.dataset.inopt === 'on') rerender();
      };
    });
    $$('#introroot [data-inc]').forEach(function (el) {
      el.onchange = function () {
        var pp = el.dataset.inc.split('|'), i = +pp[0], k = pp[1];
        edBase(function () { var c = inEnsure().cues[i]; if (!c) return;
          if (k === 'gain') c.gain = +el.value / 100;
          else if (k === 'amount') c.amount = +el.value / 100;
          else if (k === 'holdS' || k === 'transitionS') c[k] = +el.value;
          else if (k === 'msS') { if (el.value === '') delete c.ms; else c.ms = Math.round(+el.value * 1000); }
          else c[k] = el.value; });
        if (k === 'action' || k === 'src' || k === 'event' || k === 'scene') rerender();
      };
    });
    $$('#introroot [data-innud]').forEach(function (b) {
      b.onclick = function () {
        var pp = b.dataset.innud.split('|'), i = +pp[0], d0 = +pp[1];
        edBase(function () {
          var cues = inEnsure().cues, c = cues[i]; if (!c) return;
          var old = c.at; c.at = Math.max(0, Math.min(58500, c.at + d0)); var delta = c.at - old;
          if (delta) { var order = cues.slice().sort(function (a, b2) { return a.at - b2.at; });
            var ix = order.indexOf(c);
            for (var j = ix + 1; j < order.length && order[j].chain; j++) order[j].at = Math.max(0, order[j].at + delta); }
        });
        rerender();
      };
    });
    $$('#introroot [data-inchain]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.inchain; edBase(function () { var c = inEnsure().cues[i]; if (c) c.chain = !c.chain; }); rerender(); }; });
    $$('#introroot [data-inrm]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.inrm; edBase(function () { inEnsure().cues.splice(i, 1); }); rerender(); }; });
    $$('#introroot [data-indup]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.indup; edBase(function () { var cues = inEnsure().cues, c = cues[i]; if (c) cues.push(JSON.parse(JSON.stringify(c))); }); rerender(); }; });
    $$('#introroot [data-inadd]').forEach(function (b) {
      b.onclick = function () {
        var t = b.dataset.inadd;
        edBase(function () { var I = inEnsure(); var at = inEnd(I) - 1500;
          var c = { at: Math.max(0, at), type: t };
          if (t === 'sound' || t === 'voice') { c.src = ''; c.where = 'all'; c.gain = 1; }
          if (t === 'screen') c.event = 'lightning';
          if (t === 'lights') c.action = 'flash';
          if (t === 'frames') { c.scene = ''; c.frames = []; }
          I.cues.push(c); if (!I.cues.length || I.cues.length === 1) I.on = true; });
        rerender();
      };
    });
    $$('#introroot [data-inmus]').forEach(function (el) {
      el.onchange = function () {
        edBase(function () { var I = inEnsure(); var k = el.dataset.inmus;
          if (k === 'src') { if (el.value) { I.music = I.music || { kind: 'file' }; I.music.src = el.value; } else I.music = null; }
          else if (I.music) I.music.gain = +el.value / 100; });
      };
    });
    $$('#introroot [data-intry]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.intry, c = inEnsure().cues[i]; if (!c) return;
        var solo = JSON.parse(JSON.stringify(c)); solo.at = 0;
        if (solo.type === 'frames' && !solo.ms) solo.ms = 6000;
        post('/api/intro/preview', { intro: { cues: [solo] }, cueIx: 0 }).then(function (r) { toast(r.ok ? '▶ ' + inCueSummary(c) : (r.error || 'Conductor didn’t answer')); });
      };
    });
    $$('#introroot [data-indot]').forEach(function (d) { d.onclick = function () { var card = $('#introroot [data-incard="' + d.dataset.indot + '"]'); if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('hot'); setTimeout(function () { card.classList.remove('hot'); }, 900); } }; });
    /* v3.19: title-card media pick + frame chips */
    $$('#introroot [data-inpick]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.inpick;
        openScenePicker(false, function (k) { edBase(function () { var c = inEnsure().cues[i]; if (c) c.scene = k; }); renderInspector(); });
      };
    });
    $$('#introroot [data-infrm]').forEach(function (b) {
      b.onclick = function () {
        var pp = b.dataset.infrm.split('|'), i = +pp[0], f = pp[1];
        edBase(function () { var c = inEnsure().cues[i]; if (!c) return; c.frames = c.frames || []; var ix = c.frames.indexOf(f); if (ix >= 0) c.frames.splice(ix, 1); else c.frames.push(f); });
        renderInspector();
      };
    });
    $$('#introroot [data-intpl]').forEach(function (b) {
      b.onclick = function () {
        var t = IN_TEMPLATES[b.dataset.intpl]; if (!t) return;
        edBase(function () { var I = inEnsure(); I.cues = JSON.parse(JSON.stringify(t.cues)); I.on = true; delete I.endAtMs; });
        toast(t.l + ' loaded — tweak away'); renderInspector();
      };
    });
    var cpy = $('#introroot [data-incopy]');
    if (cpy) cpy.onchange = function () {
      var srcId = cpy.value; if (!srcId || !profiles[srcId] || !profiles[srcId].intro) return;
      edBase(function (d) { d.intro = JSON.parse(JSON.stringify(profiles[srcId].intro)); });
      toast('⧉ Copied the ' + (profiles[srcId].name || srcId) + ' intro'); renderInspector();
    };
    var reh = $('#inreh');
    if (reh) reh.onclick = function () {
      var I = inEnsure(); if (!(I.cues || []).length && !(I.music && I.music.src)) return toast('Add a cue first');
      post('/api/intro/preview', { game: curId, intro: I }).then(function (r) {
        if (!r.ok) return toast(r.error || 'Conductor didn’t answer');
        toast('▶ Rehearsing — no launch at the end');
        var ph = $('#inph'), E = r.endAtMs || inEnd(I);
        if (ph) { ph.style.opacity = 1; ph.style.transition = 'none'; ph.style.left = '0'; requestAnimationFrame(function () { ph.style.transition = 'left ' + E + 'ms linear'; ph.style.left = 'calc(100% - 2px)'; }); }
        clearTimeout(inRehT); inRehT = setTimeout(function () { var p2 = $('#inph'); if (p2) p2.style.opacity = 0; }, E + 300);
      });
    };
    var stp = $('#instop');
    if (stp) stp.onclick = function () { post('/api/intro/skip').then(function () { var ph = $('#inph'); if (ph) ph.style.opacity = 0; clearTimeout(inRehT); toast('⏹ Rehearsal stopped'); }); };
    var imp = $('#inimport');
    if (imp) imp.onclick = function () {
      edBase(function (d) { var I = inEnsure(); var ai = (d.audio && d.audio.intro) || {};
        if (ai.sound) { I.cues.unshift({ at: 0, type: 'sound', src: ai.sound, where: ai.spatial || 'all', gain: (ai.gain != null ? ai.gain : 1) }); delete d.audio.intro; } });
      toast('⇪ Imported — the Sound-lens sting is now cue 0'); rerender();
    };
    /* v3.29 🗣 Say */
    function fillVoices() {
      var sel2 = $('#inttsvoice'); if (!sel2 || !inVoices) return;
      sel2.innerHTML = inVoices.map(function (v, i) { return '<option value="' + esc(v) + '"' + (i === 0 ? ' selected' : '') + '>' + esc(v.replace(/-/g, ' ')) + '</option>'; }).join('');
    }
    if (inVoices) fillVoices();
    else api('/api/tts/voices').then(function (j) { if (j && j.voices) { inVoices = j.voices; fillVoices(); } }).catch(function () {});
    function ttsGo(speak) {
      var txt = ($('#inttstext') && $('#inttstext').value || '').trim();
      if (!txt) return toast('Type something to say');
      var os = $('#inttsout'); if (os) os.textContent = speak ? 'speaking…' : 'rendering…';
      post('/api/tts', { text: txt, voice: ($('#inttsvoice') && $('#inttsvoice').value) || undefined, speak: speak }).then(function (r) {
        if (!r.ok) { if (os) os.textContent = ''; return toast(r.error || 'TTS failed'); }
        if (os) os.textContent = r.file + (r.cached ? ' (cached)' : '');
        if (!speak) {
          edBase(function () { var I = inEnsure(); I.cues.push({ at: Math.max(0, inEnd(I) - 1500), type: 'voice', src: r.file, where: 'all', gain: 1 }); I.on = true; });
          toast('💾 Rendered — added as a voice cue'); renderIntroMain();
        } else toast('🔊 ' + txt.slice(0, 40));
      });
    }
    var tsy = $('#inttssay'); if (tsy) tsy.onclick = function () { ttsGo(true); };
    var tad = $('#inttsadd'); if (tad) tad.onclick = function () { ttsGo(false); };
  }
  function bindInspector() {
    $$('#insp [data-k]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { if (el.dataset.k === 'kidSafe' || el.dataset.k === 'captions' || el.dataset.k === 'ambient' || el.dataset.k === 'weatherFx') d[el.dataset.k] = el.checked; else d[el.dataset.k] = el.value; }); if (el.dataset.k === 'name' || el.dataset.k === 'accent') { renderStrip(); renderNow(); } }; });
    $$('#insp [data-t]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { var v = el.value; if (el.dataset.t === 'durationMs') v = +v; if (v === 'none' && el.dataset.t !== 'ambient') v = null; d.transition[el.dataset.t] = v; }); }; });
    $$('#insp [data-a]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { d.audio = d.audio || {}; var k = el.dataset.a; if (k === 'volOn') { if (el.checked) d.audio.volume = (d.audio.volume != null ? d.audio.volume : 70); else delete d.audio.volume; } else if (k === 'volume') d.audio.volume = +el.value; else if (k === 'bedGain') d.audio.bedGain = +el.value / 100; else if (k === 'bed') { if (el.value) d.audio.bed = el.value; else delete d.audio.bed; } }); if (el.dataset.a === 'volOn' || el.dataset.a === 'bed') renderInspector(); else if (el.dataset.a === 'volume') { var b = $('#amv'); if (b) b.textContent = el.value + '%'; } }; });
    // audio director — playlist / intro / periodicals
    function plEnsure(d) { d.audio = d.audio || {}; d.audio.playlist = d.audio.playlist || { tracks: [] }; return d.audio.playlist; }
    var plAdd = $('#insp [data-pladdbtn]'); if (plAdd) plAdd.onclick = function () { var sel = $('#pladd'); if (sel && sel.value) { ed(function (d) { var pl = plEnsure(d); pl.tracks = (pl.tracks || []).concat([sel.value]); }); renderInspector(); } };
    $$('#insp [data-plrm]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.plrm; ed(function (d) { if (d.audio && d.audio.playlist && d.audio.playlist.tracks) d.audio.playlist.tracks.splice(i, 1); }); renderInspector(); }; });
    $$('#insp [data-pl]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { var pl = plEnsure(d); var k = el.dataset.pl; pl[k] = (k === 'gain') ? (+el.value / 100) : el.value; }); }; });
    $$('#insp [data-plf]').forEach(function (b) { b.onclick = function () { var f = b.dataset.plf; ed(function (d) { var pl = plEnsure(d); var fr = (pl.frames || []).slice(); var ix = fr.indexOf(f); if (ix >= 0) fr.splice(ix, 1); else fr.push(f); pl.frames = fr.length ? fr : null; }); renderInspector(); }; });
    $$('#insp [data-ai]').forEach(function (el) { el.onchange = function () { ed(function (d) { d.audio = d.audio || {}; d.audio.intro = d.audio.intro || {}; var k = el.dataset.ai; if (k === 'gain') d.audio.intro.gain = +el.value / 100; else if (k === 'sound') { if (el.value) d.audio.intro.sound = el.value; else delete d.audio.intro.sound; } else d.audio.intro[k] = el.value; }); }; });
    var perAdd = $('#insp [data-periadd]'); if (perAdd) perAdd.onclick = function () { ed(function (d) { d.audio = d.audio || {}; d.audio.periodicals = (d.audio.periodicals || []).concat([{ sound: '', everyS: 60, jitter: 0.4, spatial: 'random', gain: 1 }]); }); renderInspector(); };
    $$('#insp [data-perirm]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.perirm; ed(function (d) { if (d.audio && d.audio.periodicals) d.audio.periodicals.splice(i, 1); }); renderInspector(); }; });
    $$('#insp [data-pd]').forEach(function (el) { el.oninput = el.onchange = function () { var pp = el.dataset.pd.split('|'), i = +pp[0], k = pp[1]; ed(function (d) { d.audio = d.audio || {}; d.audio.periodicals = d.audio.periodicals || []; var o = d.audio.periodicals[i] || {}; if (k === 'everyS') o.everyS = +el.value; else if (k === 'jitter') o.jitter = +el.value / 100; else if (k === 'gain') o.gain = +el.value / 100; else if (k === 'sound') { if (el.value) o.sound = el.value; else delete o.sound; } else o[k] = el.value; d.audio.periodicals[i] = o; }); }; });
    $$('#insp [data-m]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { d.matte = d.matte || { on: false, color: '#f2eee4', width: 7, texture: 'paper' }; var k = el.dataset.m; if (k === 'on') d.matte.on = el.checked; else if (k === 'width') d.matte.width = +el.value; else d.matte[k] = el.value; }); if (el.dataset.m === 'on') renderInspector(); }; });
    $$('#insp [data-tn]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { var k = el.dataset.tn; if (k === 'on') d.artTone = el.checked ? { brightness: 0.84, contrast: 0.96, saturate: 0.88 } : null; else { d.artTone = d.artTone || {}; d.artTone[k] = +el.value; } }); if (el.dataset.tn === 'on') renderInspector(); }; });
    $$('#insp [data-ph]').forEach(function (el) { el.onchange = function () { ed(function (d) { var k = el.dataset.ph; if (k === 'dir' && !el.value) { d.photos = null; return; } d.photos = d.photos || { dir: '', order: 'random', intervalS: 20, layout: 'auto' }; d.photos[k] = (k === 'intervalS' || k === 'perFrame' || k === 'fadeS') ? +el.value : el.value; }); if (el.dataset.ph === 'layout' || el.dataset.ph === 'dir') renderInspector(); }; });
    $$('#insp [data-kind]').forEach(function (el) { el.onclick = function () { ed(function (d) { sel.forEach(function (i) { d.frames[i] = el.dataset.kind; if (el.dataset.kind === 'viz' && !d.frameViz[i]) d.frameViz[i] = defVizCfg(); if (el.dataset.kind === 'playlist' && !d.framePlaylist[i]) d.framePlaylist[i] = defPlaylistCfg(); }); }); renderInspector(); }; });
    // v2.32 🎶 music-visualiser content type — per-frame config
    function vzEnsure(d, i) { if (!d.frameViz[i]) d.frameViz[i] = defVizCfg(); return d.frameViz[i]; }
    $$('#insp [data-vz]').forEach(function (el) { el.oninput = el.onchange = function () { var k = el.dataset.vz; ed(function (d) { sel.forEach(function (i) { var c = vzEnsure(d, i);
      if (k === 'nowPlaying') c.nowPlaying = el.checked;
      else if (k === 'sens') c.sens = +el.value;
      else if (k === 'shuffleMin') c.shuffleMin = Math.max(1, +el.value || 5);
      else if (k === 'colmode') { if (el.value === 'auto') c.color = 'auto'; else if (el.value === 'custom') c.color = (c.color && c.color !== 'auto' && String(c.color).indexOf('pal:') !== 0) ? c.color : '#c9a35e'; else c.color = el.value; }
      else if (k === 'color') c.color = el.value;
      else c[k] = el.value; }); });
      if (k === 'style' || k === 'colmode') renderInspector(); else if (k === 'sens') { var b = el.previousElementSibling && el.parentNode.querySelector('b'); if (b) b.textContent = el.value; } }; });
    // v2.32 ♪ playlist content type — per-frame config
    function pvEnsure(d, i) { if (!d.framePlaylist[i]) d.framePlaylist[i] = defPlaylistCfg(); return d.framePlaylist[i]; }
    $$('#insp [data-pv]').forEach(function (el) { el.oninput = el.onchange = function () { var k = el.dataset.pv; ed(function (d) { sel.forEach(function (i) { var c = pvEnsure(d, i);
      if (k === 'sens') c.sens = +el.value;
      else if (k === 'colmode') c.color = (el.value === 'auto') ? 'auto' : (c.color !== 'auto' ? c.color : '#c9a35e');
      else if (k === 'color') c.color = el.value;
      else c[k] = el.value; }); });
      if (k === 'display' || k === 'colmode') renderInspector(); else if (k === 'sens') { var b = el.parentNode.querySelector('b'); if (b) b.textContent = el.value; } }; });
    // orientation (shared by both content types)
    $$('#insp [data-ori]').forEach(function (el) { el.onclick = function () { var kind = draft.frames[sel[0]]; ed(function (d) { sel.forEach(function (i) { if (kind === 'viz') vzEnsure(d, i).ori = el.dataset.ori; else if (kind === 'playlist') pvEnsure(d, i).ori = el.dataset.ori; }); }); renderInspector(); }; });
    // background media (shared) — reuse the scene picker; store {key, video, dim}
    function bgArr(d, i) { var kind = draft.frames[sel[0]]; return kind === 'viz' ? vzEnsure(d, i) : pvEnsure(d, i); }
    $$('#insp [data-bgpick]').forEach(function (el) { el.onclick = function () { openScenePicker(false, function (k) { var scn = (scenes || []).find(function (s) { return s.key === k; }); ed(function (d) { sel.forEach(function (i) { var c = bgArr(d, i); c.bg = { key: k, video: !!(scn && scn.video), dim: (c.bg && c.bg.dim != null) ? c.bg.dim : 0.35 }; }); }); renderInspector(); }); }; });
    $$('#insp [data-bgclr]').forEach(function (el) { el.onclick = function () { ed(function (d) { sel.forEach(function (i) { bgArr(d, i).bg = null; }); }); renderInspector(); }; });
    $$('#insp [data-bgdim]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { sel.forEach(function (i) { var c = bgArr(d, i); if (c.bg) c.bg.dim = (+el.value) / 100; }); }); var b = el.parentNode.querySelector('b'); if (b) b.textContent = el.value + '%'; }; });
    var fe = $('#insp [data-eff]'); if (fe) fe.onchange = function () { ed(function (d) { sel.forEach(function (i) { d.effects[i] = fe.value || null; }); }); };
    var RVDEF = function () { return { videos: nullPerFrame(), trigger: 'manual', everyS: 180, jitter: 0.5, fadeS: 0.6 }; };   /* v2.64: sized from layout */
    var rvv = $('#insp [data-rev]'); if (rvv) rvv.onchange = function () { ed(function (d) { d.reveal = d.reveal || RVDEF(); if (!d.reveal.videos) d.reveal.videos = nullPerFrame(); sel.forEach(function (i) { d.reveal.videos[i] = rvv.value || null; }); }); };
    var rvt = $('#insp [data-rvt]'); if (rvt) rvt.onchange = function () { ed(function (d) { d.reveal = d.reveal || RVDEF(); d.reveal.trigger = rvt.value; }); renderInspector(); };
    var rvs = $('#insp [data-rvs]'); if (rvs) rvs.oninput = rvs.onchange = function () { ed(function (d) { d.reveal = d.reveal || RVDEF(); d.reveal.everyS = Math.max(15, +rvs.value || 180); }); };
    $$('#insp [data-selc]').forEach(function (el) { el.onclick = function () { var i = +el.dataset.selc, ix = sel.indexOf(i); if (ix >= 0) sel.splice(ix, 1); else sel.push(i); refreshSel(); renderInspector(); }; });
    $$('#insp [data-apply]').forEach(function (el) { el.onclick = function () {
      var src = sel[0]; if (src == null) return;
      ed(function (d) {
        var targets = el.dataset.apply === 'wall' ? wallIdxs(src) : allIdxs();   /* v2.64: wall membership from layout */
        targets.forEach(function (i) { d.frames[i] = d.frames[src]; d.frameScenes[i] = d.frameScenes[src]; d.overlays[i] = d.overlays[src]; d.effects[i] = d.effects[src]; if (d.ovlFit) d.ovlFit[i] = d.ovlFit[src]; if (d.scnFit) d.scnFit[i] = d.scnFit[src]; if (d.reveal && d.reveal.videos) d.reveal.videos[i] = d.reveal.videos[src]; d.frameViz[i] = d.frameViz[src] ? clone(d.frameViz[src]) : null; d.framePlaylist[i] = d.framePlaylist[src] ? clone(d.framePlaylist[src]) : null; });
      });
      toast('Copied'); }; });
    var ds = $('#defscene'); if (ds) ds.onclick = function () { openScenePicker(true); };
    var fs = $('#fscene'); if (fs) fs.onclick = function () { openScenePicker(false); };
    var fd = $('#fscenedef'); if (fd) fd.onclick = function () { ed(function (d) { sel.forEach(function (i) { d.frameScenes[i] = null; }); }); renderInspector(); };
    var fo = $('#fovl'); if (fo) fo.onclick = openOverlayPicker;
    var ofl = $('#insp [data-ovf]'); if (ofl) ofl.onchange = function () { ed(function (d) { d.ovlFit = d.ovlFit || []; sel.forEach(function (i) { d.ovlFit[i] = ofl.value === 'stretch' ? null : ofl.value; }); }); };
    var scf = $('#insp [data-scf]'); if (scf) scf.onchange = function () { ed(function (d) { d.scnFit = d.scnFit || []; sel.forEach(function (i) { d.scnFit[i] = scf.value === 'cover' ? null : scf.value; }); }); };   /* v3.09 */
    var dm = $('#delmode'); if (dm) dm.onclick = function () { softDeleteMode(curId); };   /* v2.54: soft delete + undo */
    bindInspector2();
  }
  /* v2.0 bindings for the new lenses (toggle rows, outro, auditions, phases, moments) */
  function bindInspector2() {
    $$('#insp [data-tr]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.tr;
        /* v2.88: "shown" is structural (it hides the mode from the Play strip, and
           renderStrip below reads the BASE draft) — a phase must not own it. The
           other toggles are ordinary behaviour and stay phase-overridable. */
        (k === 'shown' ? edBase : ed)(function (d) { if (k === 'shown') { if (b.classList.contains('on')) d.hidden = true; else delete d.hidden; } else d[k] = !b.classList.contains('on'); });
        b.classList.toggle('on');
        if (k === 'shown') { renderStrip(); }
      };
    });
    $$('#insp [data-ao]').forEach(function (el) { el.onchange = function () { ed(function (d) { d.audio = d.audio || {}; d.audio.outro = d.audio.outro || {}; var k = el.dataset.ao; if (k === 'gain') d.audio.outro.gain = +el.value / 100; else if (k === 'sound') { if (el.value) d.audio.outro.sound = el.value; else delete d.audio.outro.sound; } else d.audio.outro[k] = el.value; }); }; });
    var ait = $('#insp [data-aitest]'); if (ait) ait.onclick = function (e) { e.preventDefault(); var a = (draft.audio && draft.audio.intro) || {}; auditionSound(a.sound, a.spatial || 'all', a.gain); };
    var aot = $('#insp [data-aotest]'); if (aot) aot.onclick = function (e) { e.preventDefault(); var a = (draft.audio && draft.audio.outro) || {}; auditionSound(a.sound, a.spatial || 'all', a.gain); };
    $$('#insp [data-plt]').forEach(function (b) { b.onclick = function () { var pl = (draft.audio && draft.audio.playlist) || {}; auditionSound((pl.tracks || [])[+b.dataset.plt], 'all', pl.gain != null ? pl.gain : 0.5); }; });
    $$('#insp [data-ptest]').forEach(function (b) { b.onclick = function () { var pd = ((draft.audio && draft.audio.periodicals) || [])[+b.dataset.ptest] || {}; auditionSound(pd.sound, pd.spatial || 'random', pd.gain); }; });
    /* moments */
    $$('#insp [data-mo]').forEach(function (el) { el.oninput = el.onchange = function () { var pp = el.dataset.mo.split('|'), i = +pp[0], k = pp[1]; ed(function (d) { d.moments = d.moments || []; var m = d.moments[i] || {}; m[k] = (k === 'sfx' || k === 'event') ? (el.value || null) : el.value; d.moments[i] = m; }); }; });
    if (typeof window.__rulesGames === 'undefined') { window.__rulesGames = null; api('/api/rules').then(function (j) { window.__rulesGames = (j && j.games) || {}; if ($('#rulesloading')) renderInspector(); }).catch(function () { window.__rulesGames = {}; }); }
    $$('#insp [data-rules]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { d.rules = d.rules || {}; var k = el.dataset.rules; if (k === 'videoId') { var v = (el.value || '').trim(); if (v) d.rules.videoId = ytId(v); else delete d.rules.videoId; } else { if (el.value) d.rules[k] = el.value; else delete d.rules[k]; } }); if (el.dataset.rules === 'game') renderInspector(); }; });
    $$('#insp [data-rulesec]').forEach(function (el) { el.onclick = function () { ed(function (d) { d.rules = d.rules || {}; d.rules.sections = d.rules.sections || {}; var k = el.dataset.rulesec; d.rules.sections[k] = (d.rules.sections[k] === false); }); renderInspector(); }; });
    $$('#insp [data-hl]').forEach(function (el) { el.oninput = el.onchange = function () { ed(function (d) { var k = el.dataset.hl; d[k] = (k === 'haloColor') ? el.value : +el.value; }); }; });
    function lzSet(zone, key, val) { ed(function (d) { d.lightZones = d.lightZones || {}; var z = d.lightZones[zone] = d.lightZones[zone] || {}; if (val === '' || val == null) delete z[key]; else z[key] = val; if (!Object.keys(z).length) delete d.lightZones[zone]; if (!Object.keys(d.lightZones).length) delete d.lightZones; }); }
    $$('#insp [data-lzs]').forEach(function (el) { el.onchange = function () { lzSet(el.dataset.lzs, 'scene', el.value); renderInspector(); }; });
    $$('#insp [data-lze]').forEach(function (el) { el.onchange = function () { lzSet(el.dataset.lze, 'effect', el.value === 'none' ? '' : el.value); renderInspector(); }; });
    $$('#insp [data-lzb]').forEach(function (el) { el.onchange = function () { lzSet(el.dataset.lzb, 'brightness_pct', el.value === '' ? '' : +el.value); }; });
    $$('#insp [data-lzi]').forEach(function (el) { el.oninput = function () { var b = el.previousElementSibling ? el.parentNode.querySelector('b') : null; if (b) b.textContent = el.value; clearTimeout(el._t); var z = el.dataset.lzi, v = +el.value; el._t = setTimeout(function () { lzSet(z, 'flickerInt', v); }, 250); }; });
    $$('#insp [data-lzp]').forEach(function (el) { el.oninput = function () { var b = el.parentNode.querySelector('b'); if (b) b.textContent = el.value; clearTimeout(el._t); var z = el.dataset.lzp, v = +el.value; el._t = setTimeout(function () { lzSet(z, 'flickerSpeed', v); }, 250); }; });
    $$('#insp [data-lzprev]').forEach(function (el) { el.onclick = function () {
      var zn = el.dataset.lzprev, c = (draft.lightZones || {})[zn] || {};
      var body = { zone: zn };
      if (c.effect === 'flicker') { body.effect = 'flicker'; body.intensity = c.flickerInt; body.speed = c.flickerSpeed; if (c.scene) body.scene = c.scene; if (c.brightness_pct != null) body.brightness_pct = c.brightness_pct; }
      else { if (c.scene) body.scene = c.scene; else body.scene = draft.light || 'gallery'; if (c.effect) body.effect = c.effect; if (c.brightness_pct != null) body.brightness_pct = c.brightness_pct; }
      post('/api/ha/lightzone', body).then(function (r) { toast(r.ok ? '💡 Previewing ' + zn + (c.effect === 'flicker' ? ' (flicker)' : '') : (r.error || 'Zone unavailable')); });
    }; });
    $$('#insp [data-lzclear]').forEach(function (el) { el.onclick = function () { ed(function (d) { if (d.lightZones) { delete d.lightZones[el.dataset.lzclear]; if (!Object.keys(d.lightZones).length) delete d.lightZones; } }); renderInspector(); }; });
    var _hlr = $('#insp [data-hlreset]'); if (_hlr) _hlr.onclick = function () { ed(function (d) { delete d.haloColor; delete d.haloSize; delete d.haloOpacity; }); renderInspector(); toast('Halo back to accent defaults'); };
    var _rsh = $('#rulesshow'); if (_rsh) _rsh.onclick = function () { var r = draft.rules || {}; if (!r.game) return toast('Pick a game first'); post('/api/rules/show', { game: r.game, videoId: r.videoId || undefined, sections: r.sections || undefined }).then(function (x) { toast(x && x.ok ? '📖 Rules on the wall' : ((x && x.error) || 'Could not show rules')); }); };
    var _rhd = $('#ruleshide'); if (_rhd) _rhd.onclick = function () { post('/api/rules/show', { off: true }).then(function () { toast('Rules hidden'); }); };
    $$('#insp [data-morm]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.morm; ed(function (d) { if (d.moments) d.moments.splice(i, 1); }); renderInspector(); }; });
    var moa = $('#insp [data-moadd]'); if (moa) moa.onclick = function () { ed(function (d) { d.moments = (d.moments || []).concat([{ id: 'm' + Math.floor(Math.random() * 1e6), label: 'New moment', icon: '✨', sfx: null, event: 'softflash' }]); }); renderInspector(); };
    $$('#insp [data-motest]').forEach(function (b) { b.onclick = function () { var m = (draft.moments || [])[+b.dataset.motest] || {}; if (m.sfx) auditionSound(m.sfx, 'all', 1); else toast('Pick a sound for this moment first'); }; });
    /* phases */
    /* v2.88: phEd edits the PHASE DEFINITION (its name, icon, autoS and its own
       .patch), which lives in the base draft — it is not an override OF the phase.
       Routed through ed() it went: clone the merged draft -> mutate the clone's
       phases[] -> diff -> the whole phases array became the patch. That was how
       `light` ended up duplicated at two levels in alienfate, and once v2.88 began
       stripping `phases` from patches it meant phase rename / lighting / scene /
       entry-sound silently did nothing at all. edBase writes the real object. */
    function phEd(fn) { edBase(function (d) { var ph = null; (d.phases || []).forEach(function (x) { if (x && x.id === phaseSel) ph = x; }); if (ph) fn(ph); }); }
    $$('#insp [data-phsel]').forEach(function (c) { c.onclick = function () { phaseSel = c.dataset.phsel || null; paintCanvas(); renderInspector(); }; });
    var pha = $('#insp [data-phadd]'); if (pha) pha.onclick = function () {
      askText('New phase', 'Boss fight…', '', function (name) {   /* v2.54: in-app dialog */
        var base = name.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'phase'; var id = base, n = 2;
        function has(x) { return (draft.phases || []).some(function (p2) { return p2 && p2.id === x; }); }
        while (has(id)) id = base + (n++);
        edBase(function (d) { d.phases = (d.phases || []).concat([{ id: id, name: name, icon: '', patch: {} }]); });   /* v2.88: structure -> base draft, never a patch */
        phaseSel = id; paintCanvas(); renderInspector();
      });
    };
    $$('#insp [data-php]').forEach(function (el) { el.onchange = function () { phEd(function (ph) { ph[el.dataset.php] = el.value; }); renderInspector(); }; });
    /* v2.64: optional per-phase auto-advance (phase.autoS, seconds; blank = manual) */
    var phau = $('#insp [data-phauto]'); if (phau) phau.onchange = function () { var v = parseInt(phau.value, 10); phEd(function (ph) { if (v > 0) ph.autoS = v; else delete ph.autoS; }); renderInspector(); };
    var phl = $('#insp [data-phl]'); if (phl) phl.onchange = function () { phEd(function (ph) { ph.patch = ph.patch || {}; if (phl.value) ph.patch.light = phl.value; else delete ph.patch.light; }); };
    var phe = $('#insp [data-phe]'); if (phe) phe.onchange = function () { phEd(function (ph) { ph.patch = ph.patch || {}; if (phe.value) { ph.patch.transition = ph.patch.transition || {}; ph.patch.transition.event = phe.value; } else if (ph.patch.transition) { delete ph.patch.transition.event; if (!Object.keys(ph.patch.transition).length) delete ph.patch.transition; } }); };
    var phsc = $('#insp [data-phscene]'); if (phsc) phsc.onclick = function () { openScenePicker(false, function (k) { phEd(function (ph) { ph.patch = ph.patch || {}; ph.patch.scene = k; }); renderInspector(); }); };
    var phx = $('#insp [data-phscenex]'); if (phx) phx.onclick = function () { phEd(function (ph) { if (ph.patch) delete ph.patch.scene; }); renderInspector(); };
    var phi = $('#insp [data-phis]'); if (phi) phi.onchange = function () { phEd(function (ph) { ph.patch = ph.patch || {}; ph.patch.audio = ph.patch.audio || {}; if (phi.value) ph.patch.audio.intro = { sound: phi.value, spatial: 'all', gain: 1 }; else { delete ph.patch.audio.intro; if (!Object.keys(ph.patch.audio).length) delete ph.patch.audio; } }); };
    var phb = $('#insp [data-phbt]'); if (phb) phb.onchange = function () { phEd(function (ph) { ph.patch = ph.patch || {}; ph.patch.audio = ph.patch.audio || {}; if (phb.value) ph.patch.audio.playlist = { tracks: [phb.value] }; else { delete ph.patch.audio.playlist; if (!Object.keys(ph.patch.audio).length) delete ph.patch.audio; } }); };
    $$('#insp [data-phmove]').forEach(function (b) { b.onclick = function () { var dir = +b.dataset.phmove; edBase(function (d) { var arr = d.phases || []; var ix = -1; arr.forEach(function (x, i2) { if (x && x.id === phaseSel) ix = i2; }); var to = ix + dir; if (ix < 0 || to < 0 || to >= arr.length) return; arr.splice(to, 0, arr.splice(ix, 1)[0]); }); renderInspector(); }; });   /* v2.88: edBase — reordering is structure, not an override */
    /* v2.88: edBase, and clear phaseSel BEFORE the edit. Via ed() this was the bug the
       whole fix is named after \u2014 the phase being deleted was the ACTIVE phase, so the
       shortened list went into its own patch and the real list never changed. */
    var phd = $('#insp [data-phdel]'); if (phd) phd.onclick = function () { askConfirm('Remove phase \u201c' + phaseName(phaseSel) + '\u201d?', 'Its overrides go with it; the base mode is untouched.', 'Remove', function () { var gone = phaseSel; phaseSel = null; edBase(function (d) { d.phases = (d.phases || []).filter(function (x) { return !x || x.id !== gone; }); }); paintCanvas(); renderInspector(); }, true); };   /* v2.54 */
  }

  /* ---------------- DESIGN: media tray ---------------- */
  /* v1.82 collapsible tray — remembers state; programmatic setTray() re-opens it */
  function trayOpen(open) {
    $('#tray').classList.toggle('closed', !open);
    $('#traytgl').textContent = open ? '▾ Hide' : '▴ Media tray';
    localStorage.setItem('ie-tray', open ? 'open' : 'closed');
  }
  $('#traytgl').onclick = function () { trayOpen($('#tray').classList.contains('closed')); };
  trayOpen(localStorage.getItem('ie-tray') !== 'closed');
  function setTray(tab) { trayTab = tab; trayOpen(true); $$('#trayseg button').forEach(function (b) { b.classList.toggle('on', b.dataset.tray === tab); }); renderTray(); }
  $$('#trayseg button').forEach(function (b) { b.onclick = function () { setTray(b.dataset.tray); }; });
  $$('#traykind button').forEach(function (b) { b.onclick = function () { trayKind = b.dataset.kind; $$('#traykind button').forEach(function (x) { x.classList.toggle('on', x === b); }); renderTray(); }; });
  $('#traysearch').oninput = function () { trayQ = this.value.toLowerCase(); renderTray(); };
  function renderTray() {
    var host = $('#trayitems'), items = [];
    var kindEl = $('#traykind');
    if (kindEl) kindEl.style.display = trayTab === 'scenes' ? 'flex' : 'none';
    var catEl = $('#traycats');
    if (catEl) {
      var ch = trayTab === 'scenes' ? catChipsHTML(trayCat, traySub) : '';
      catEl.style.display = ch ? 'flex' : 'none'; catEl.innerHTML = ch;
      catEl.querySelectorAll('[data-cat]').forEach(function (b) { b.onclick = function () { trayCat = b.dataset.cat || null; traySub = null; renderTray(); }; });
      catEl.querySelectorAll('[data-subcat]').forEach(function (b) { b.onclick = function () { traySub = b.dataset.subcat || null; renderTray(); }; });
    }
    if (trayTab === 'scenes') items = scenes.filter(function (s) {
      if (trayKind === 'img' && s.video) return false;
      if (trayKind === 'vid' && !s.video) return false;
      if (trayCat && catFor(s) !== trayCat) return false;
      if (traySub && subFor(s) !== traySub) return false;
      return !trayQ || s.key.indexOf(trayQ) >= 0;
    }).map(function (s) {
      return { t: 'scene', key: s.key, img: (s.thumb || s.sample), ph: s.video ? '▶' : null, cap: s.key + (s.video ? ' · video' : ''), video: s.video, file: decodeURIComponent((s.sample || '').slice(7)) };
    });
    if (trayTab === 'overlays') items = [{ t: 'overlay', key: null, img: null, cap: 'None (remove)' }].concat(overlays.filter(function (o) { return !trayQ || o.file.toLowerCase().indexOf(trayQ) >= 0; }).map(function (o) {
      return { t: 'overlay', key: o.file, img: o.thumb || o.url, cap: o.file, checker: true };
    }));
    if (trayTab === 'albums') items = albums.filter(function (a) { return !trayQ || a.dir.toLowerCase().indexOf(trayQ) >= 0; }).map(function (a) {
      return { t: 'album', key: a.dir, img: null, cap: a.dir + ' · ' + a.count, ph: '❏' };
    });
    if (trayTab === 'effects') items = [{ t: 'effect', key: null, img: null, cap: 'None (remove effect)', ph: '∅' }].concat(effects.filter(function (e) { return !trayQ || e.name.toLowerCase().indexOf(trayQ) >= 0; }).map(function (e) {
      return { t: 'effect', key: e.file, img: null, cap: e.name, ph: '≋' };
    }));
    host.innerHTML = items.map(function (it, i) {
      var im;
      if (it.video) {   // poster frame with a play badge; falls back to just the badge if no poster yet
        im = '<div class="ph" style="position:relative;overflow:hidden">'
           + '<img loading="lazy" src="' + (it.img || '').replace(/"/g, '&quot;') + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">'
           + '<span style="position:relative;z-index:1;text-shadow:0 1px 3px #000">▶</span></div>';
      } else {
        im = it.img ? '<img loading="lazy" src="' + it.img.replace(/"/g, '&quot;') + '" alt="">' : '<div class="ph">' + (it.ph || '∅') + '</div>';
      }
      return '<div class="titem' + (it.checker ? ' checker' : '') + '" draggable="true" data-ti="' + i + '" title="' + esc(it.file || it.key || it.cap) + '">' + im + '<div class="cap">' + esc(it.cap) + '</div></div>';
    }).join('') || '<span class="hint" style="align-self:center">Nothing matches.</span>';
    $$('#trayitems .titem').forEach(function (el) {
      var it = items[+el.dataset.ti];
      el.onclick = function () { if (!sel.length && it.t !== 'scene') return toast('Select a frame first (click one on the wall)'); applyTrayItem(it, sel.length ? sel : null); };
      el.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/ie-tray', JSON.stringify(it)); });
    });
  }
  function applyTrayItem(it, targets) {
    if (it.t === 'scene') {
      if (!targets) { ed(function (d) { d.scene = it.key; }); renderInspector(); renderStrip(); return toast('Default scene → ' + it.key); }
      ed(function (d) { targets.forEach(function (i) { if (d.frames[i] !== 'pano' && d.frames[i] !== 'portrait') d.frames[i] = 'pano'; d.frameScenes[i] = it.key; }); });
      toast(it.key + ' → ' + targets.map(function (i) { return FRAME_IDS[i]; }).join(', '));
    } else if (it.t === 'overlay') {
      if (!targets) return toast('Select a frame first');
      ed(function (d) { targets.forEach(function (i) { d.overlays[i] = it.key; }); });
      toast((it.key || 'No overlay') + ' → ' + targets.map(function (i) { return FRAME_IDS[i]; }).join(', '));
    } else if (it.t === 'effect') {
      if (!targets) return toast('Select a frame first');
      ed(function (d) { targets.forEach(function (i) { d.effects[i] = it.key; }); });
      toast((it.key ? it.cap : 'No effect') + ' → ' + targets.map(function (i) { return FRAME_IDS[i]; }).join(', '));
    } else if (it.t === 'album') {
      ed(function (d) {
        d.photos = d.photos || { order: 'random', intervalS: 20, layout: 'auto' };
        d.photos.dir = it.key;
        (targets || sel).forEach(function (i) { d.frames[i] = 'photos'; });
      });
      renderInspector();
      toast('Album “' + it.key + '” → ' + (targets || sel).map(function (i) { return FRAME_IDS[i]; }).join(', '));
    }
    renderInspector();
  }

  /* v1.83 overlay picker sheet — replaces the tray as the overlay chooser */
  function openOverlayPicker() {
    var q2 = '';
    openSheet('<div class="shead"><h2>Choose an overlay</h2><input id="oq" type="text" placeholder="Search…" style="max-width:300px;padding:8px 10px;border-radius:8px;background:#13151b;border:1px solid var(--line);color:var(--ink)">'
      + '<div class="sp"></div><button class="btn gh" id="pclose">Close</button></div><div class="sbody"><div class="grid" id="ogrid"></div></div>');
    $('#pclose').onclick = closeSheet;
    function draw() {
      var cur = sel.length ? draft.overlays[sel[0]] : null;
      var cells = '<div class="cell' + (!cur ? ' on' : '') + '" data-o=""><div style="width:100%;aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;background:#12141a;color:var(--dim);font-size:22px">∅</div><div class="cap">None (remove)</div></div>';
      cells += overlays.filter(function (o) { return !q2 || o.file.toLowerCase().indexOf(q2) >= 0; }).map(function (o) {
        return '<div class="cell' + (o.file === cur ? ' on' : '') + '" data-o="' + esc(o.file) + '" title="' + esc(o.file) + '">'
          + '<div style="width:100%;aspect-ratio:16/10;background:repeating-conic-gradient(#20232d 0 25%,#2a2e3a 0 50%) 0 0/18px 18px;display:flex;align-items:center;justify-content:center;overflow:hidden"><img loading="lazy" src="' + (o.thumb || o.url) + '" style="max-width:100%;max-height:100%;object-fit:contain"></div>'
          + '<div class="cap">' + esc(o.file) + '</div></div>';
      }).join('');
      $('#ogrid').innerHTML = cells;
      $$('#ogrid .cell').forEach(function (c) { c.onclick = function () {
        var f = c.dataset.o || null;
        ed(function (d) { sel.forEach(function (i) { d.overlays[i] = f; }); });
        closeSheet(); renderInspector();
      }; });
    }
    $('#oq').oninput = function () { q2 = this.value.toLowerCase(); draw(); };
    draw();
  }

  /* ---------------- scene picker sheet ---------------- */
  function openSheet(html) { $('#sheet').innerHTML = html; $('#scrim').classList.add('on'); }
  function closeSheet() { $('#scrim').classList.remove('on'); if (edgePoll) { clearInterval(edgePoll); edgePoll = null; } }
  $('#scrim').addEventListener('click', function (e) { if (e.target === $('#scrim')) closeSheet(); });
  function openScenePicker(forDefault, cb) {
    var q = '', pk = 'all', pcat = null, psub = null, po = 'all';
    openSheet('<div class="shead"><h2>Choose a scene</h2><input id="pq" type="text" placeholder="Search…" style="max-width:300px;padding:8px 10px;border-radius:8px;background:#13151b;border:1px solid var(--line);color:var(--ink)">'
      + '<div id="pkind" style="display:flex;gap:6px"><button class="btn sm on" data-pk="all">All</button><button class="btn sm" data-pk="img">🖼 Images</button><button class="btn sm" data-pk="vid">▶ Videos</button></div>'
      + '<div id="pori" style="display:flex;gap:6px"><button class="btn sm on" data-po="all">Any shape</button><button class="btn sm" data-po="p">▯ Portrait</button><button class="btn sm" data-po="l">▭ Landscape</button></div>'
      + '<div class="sp"></div><button class="btn gh" id="pclose">Close</button></div><div class="sbody"><div id="pkcats"></div><div class="grid" id="pgrid"></div></div>');
    $('#pclose').onclick = closeSheet;
    $$('#pkind [data-pk]').forEach(function (b) { b.onclick = function () { pk = b.dataset.pk; $$('#pkind [data-pk]').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
    $$('#pori [data-po]').forEach(function (b) { b.onclick = function () { po = b.dataset.po; $$('#pori [data-po]').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
    function drawCats() {
      // v2.25: #pkcats — the Play page already owns an element called #pcats (its section
      // chips); the duplicate id meant these chips rendered onto the Play screen behind
      // the sheet instead of in the picker. Unique id fixes both symptoms.
      $('#pkcats').innerHTML = catChipsHTML(pcat, psub);
      $$('#pkcats [data-cat]').forEach(function (b) { b.onclick = function () { pcat = b.dataset.cat || null; psub = null; drawCats(); draw(); }; });
      $$('#pkcats [data-subcat]').forEach(function (b) { b.onclick = function () { psub = b.dataset.subcat || null; drawCats(); draw(); }; });
    }
    drawCats();
    function draw() {
      var cur = forDefault ? draft.scene : (sel.length ? draft.frameScenes[sel[0]] : null);
      $('#pgrid').innerHTML = scenes.filter(function (s) {
        if (pk === 'img' && s.video) return false;
        if (pk === 'vid' && !s.video) return false;
        if (po === 'p' && s.ori !== 'p') return false;   // v2.26: orientation of the tile's representative image (videos/unprobed excluded while a shape filter is on)
        if (po === 'l' && s.ori !== 'l') return false;
        if (pcat && catFor(s) !== pcat) return false;
        if (psub && subFor(s) !== psub) return false;
        return !q || (s.key + ' ' + (s.dir || '')).toLowerCase().indexOf(q) >= 0 /* rs-search-ci v1 */;
      }).map(function (s) {
        var im = s.video
          ? '<div style="position:relative;width:100%;aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;background:#12141a;color:var(--teal);font-size:24px;overflow:hidden"><img loading="lazy" src="' + s.thumb + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'"><span style="position:relative;text-shadow:0 1px 3px #000">▶</span></div>'
          : '<img loading="lazy" src="' + (s.thumb || s.sample) + '">';
        return '<div class="cell' + (s.key === cur ? ' on' : '') + '" data-k="' + s.key + '" title="' + esc(decodeURIComponent((s.sample || '').slice(7))) + (s.count > 1 ? ' — ' + s.count + ' variant files, the wall rotates them at random' : '') + '">' + im + '<div class="cap">' + esc(niceName(s.key)) + (s.video ? ' · video' : '') + (s.count > 1 ? ' · ×' + s.count : '') + '</div></div>';
      }).join('');
      $$('#pgrid .cell').forEach(function (c) { c.onclick = function () {
        var k = c.dataset.k;
        if (cb) { cb(k); closeSheet(); return; }
        if (forDefault) ed(function (d) { d.scene = k; });
        else ed(function (d) { sel.forEach(function (i) { if (d.frames[i] !== 'portrait') d.frames[i] = 'pano'; d.frameScenes[i] = k; }); });
        closeSheet(); renderInspector(); renderStrip();
      }; });
    }
    $('#pq').oninput = function () { q = this.value.toLowerCase(); draw(); };
    draw();
  }

  /* ---------------- 📅 Calendar sheet (v1.80): the room's year, days & sky ---------------- */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function modeOpts(cur) { return '<option value="">(dining)</option>' + vids().map(function (id) { return '<option value="' + id + '"' + (id === cur ? ' selected' : '') + '>' + esc(profiles[id].name || id) + '</option>'; }).join(''); }
  function modeName(id) { return id && profiles[id] ? (profiles[id].name || id) : 'Dining Mode'; }
  function modeAccent(id) { return (id && profiles[id] && profiles[id].accent) || '#c9a35e'; }
  /* compute today's minute-by-minute mode from rhythms (mirrors the conductor) */
  function dayTimeline(dayOffset) {
    var r = settings.rhythms || {}, now = new Date(); now.setDate(now.getDate() + (dayOffset || 0));
    var mm = String(now.getMonth() + 1), mmdd = mm.padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var ymd = now.getFullYear() + '-' + mmdd;
    var dayOv = (r.days || []).find(function (d) { return d.when === mmdd || d.when === ymd; });
    var base = (dayOv && dayOv.mode) || (r.months || {})[mm] || '';
    var mins = new Array(1440).fill(base);
    var ORD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], dow = ORD[now.getDay()];
    var toMin = function (s2) { var m2 = /^(\d{1,2}):(\d{2})$/.exec(s2 || ''); return m2 ? (+m2[1]) * 60 + (+m2[2]) : null; };
    (r.hours || []).forEach(function (h) {
      var days = (h.days || '*').toLowerCase();
      var ok = days === '*' || days.split(',').some(function (d) {
        d = d.trim();
        if (d.indexOf('-') > 0) { var W = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']; var pr = d.split('-'); var ia = W.indexOf(pr[0]), ib = W.indexOf(pr[1]), ic = W.indexOf(dow); return ia >= 0 && ib >= 0 && ic >= ia && ic <= ib; }
        return d === dow;
      });
      var f = toMin(h.from), t2 = toMin(h.to);
      if (ok && f != null && t2 != null) for (var i2 = f; i2 < Math.min(t2, 1440); i2++) mins[i2] = h.mode || base;
    });
    var segs = [], s0 = 0;
    for (var i3 = 1; i3 <= 1440; i3++) if (i3 === 1440 || mins[i3] !== mins[s0]) { segs.push({ from: s0, to: i3, mode: mins[s0] }); s0 = i3; }
    return { segs: segs, special: dayOv || null, date: now };
  }
  function dayBarHTML(dayOffset) {
    var tl = dayTimeline(dayOffset);
    var bar = tl.segs.map(function (sg) {
      var w = ((sg.to - sg.from) / 1440 * 100).toFixed(2);
      var lbl = (sg.to - sg.from) >= 150 ? esc(modeName(sg.mode)) : '';
      var t = String(Math.floor(sg.from / 60)).padStart(2, '0') + ':' + String(sg.from % 60).padStart(2, '0') + '–' + String(Math.floor(sg.to / 60) % 24).padStart(2, '0') + ':' + String(sg.to % 60).padStart(2, '0');
      return '<div class="seg" style="width:' + w + '%;background:' + modeAccent(sg.mode) + '" title="' + t + ' · ' + esc(modeName(sg.mode)) + '">' + lbl + '</div>';
    }).join('');
    return '<div class="daybar">' + bar + '</div><div class="dayticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>'
      + (tl.special ? '<div class="hint" style="margin-top:4px">🎂 ' + esc(tl.special.name || tl.special.when) + '</div>' : '');
  }
  function calMonthsHTML() {
    var r = settings.rhythms || {}, nowM = new Date().getMonth();
    return '<div class="calmons">' + MONTHS.map(function (m, i) {
      var mid = (r.months || {})[String(i + 1)] || '';
      var th = mid && profiles[mid] ? sceneThumb(profiles[mid].scene) : '';
      var dots = ((r.days || []).filter(function (d) { return d.when && d.when.slice(-5, -3) === String(i + 1).padStart(2, '0'); }) || []).slice(0, 4);
      return '<div class="calmon' + (i === nowM ? ' now' : '') + '" data-cm="' + (i + 1) + '"' + (th ? ' style="background-image:url(\'' + th.replace(/'/g, '%27') + '\')"' : '') + '>'
        + '<div class="sh"></div><div class="mn">' + m + '</div>'
        + '<div class="dots">' + dots.map(function () { return '<i></i>'; }).join('') + '</div>'
        + '<div class="md">' + esc(modeName(mid)) + '</div></div>';
    }).join('') + '</div><div id="calmonpick" style="margin-top:8px"></div>';
  }
  function weatherCard() {
    var w = settings.weather || { on: false };
    var conds = ['rainy', 'pouring', 'lightning', 'snowy', 'fog'];
    return '<div class="card"><div class="zt">⛅ The sky' + T('The windows follow the real sky: your Home Assistant weather entity picks a matching effect loop (by filename keywords — rain/heavy/storm/snow/fog) on frames whose effect slot is empty. Hand-picked effects always win. Storms fire occasional lightning.') + '</div>'
      + '<label class="chk"><input type="checkbox" id="wxon" ' + (w.on ? 'checked' : '') + '> Windows follow real weather</label>'
      + '<div class="r2"><label class="fld"><span>Weather entity</span><input type="text" id="wxent" value="' + esc(w.entity || 'weather.home') + '"></label>'
      + '<label class="chk" style="margin-top:20px"><input type="checkbox" id="wxsun" ' + (w.sunTone !== false ? 'checked' : '') + '> Daylight sync' + T('Nudges the print tone with the real sun — slightly warmer and dimmer at dusk and dawn, neutral at midday.') + '</label></div>'
      + '<div class="zt" style="margin-top:6px">Try it now' + T('Tap a condition to preview it on the wall for 30 seconds, or Pin for the evening (2 h) — snow tonight because the kids asked. Clear removes a pin.') + '</div>'
      + '<div class="chips">' + conds.map(function (c) { return '<button class="chip" data-wxp="' + c + '">' + c + '</button>'; }).join('')
      + '<button class="chip" data-wxpin="1">📌 Pin 2h</button><button class="chip" data-wxclr="1">Clear</button></div>'
      + '<div class="hint" id="wxnow" style="margin-top:6px"></div></div>';
  }
  var wxLastCond = 'snowy';
  function saveAuto() { clearTimeout(saveAuto._t); saveAuto._t = setTimeout(function () { persist().then(function () { toast('Saved'); renderAuto(); }); }, 800); }
  function drawList(host, list, cols) {
    host.innerHTML = list.map(function (row, i) {
      return '<div style="display:flex;gap:6px;margin:4px 0;align-items:center">' + cols.map(function (c) {
        if (c.k === 'mode') return '<select data-li="' + i + '" data-lk="mode" style="flex:1">' + modeOpts(row.mode) + '</select>';
        return '<input type="text" data-li="' + i + '" data-lk="' + c.k + '" placeholder="' + c.ph + '" value="' + esc(row[c.k] || '') + '" style="flex:' + (c.fl || 1) + '">';
      }).join('') + '<button class="btn sm dg gh" data-ldel="' + i + '">✕</button></div>';
    }).join('');
    host.querySelectorAll('[data-li]').forEach(function (el) { el.onchange = function () { list[+el.dataset.li][el.dataset.lk] = el.value; saveAuto(); refreshCal(); }; });
    host.querySelectorAll('[data-ldel]').forEach(function (el) { el.onclick = function () { list.splice(+el.dataset.ldel, 1); drawList(host, list, cols); saveAuto(); refreshCal(); }; });
  }
  var DAYCOLS = [{ k: 'when', ph: '12-25 or 2026-03-14', fl: 1 }, { k: 'mode' }, { k: 'name', ph: 'Christmas 🎄', fl: 1 }];
  var HOURCOLS = [{ k: 'days', ph: 'sat,sun / mon-fri / *', fl: 1 }, { k: 'from', ph: '07:00' }, { k: 'to', ph: '10:30' }, { k: 'mode' }, { k: 'name', ph: 'Breakfast photos', fl: 1 }];
  function refreshCal() {
    if ($('#calyear')) $('#calyear').innerHTML = calMonthsHTML();
    if ($('#caltoday')) $('#caltoday').innerHTML = dayBarHTML(0);
    if ($('#caltmrw')) $('#caltmrw').innerHTML = dayBarHTML(1);
    wireMonths();
  }
  function wireMonths() {
    $$('#sheet [data-cm]').forEach(function (c) {
      c.onclick = function () {
        var m = c.dataset.cm, r = settings.rhythms;
        var cur = (r.months || {})[m] || '';
        $('#calmonpick').innerHTML = '<div class="zt">' + MONTHS[m - 1] + ' — pick its resting mode</div><div class="chips">'
          + '<button class="chip' + (!cur ? ' on' : '') + '" data-mp="">Dining Mode</button>'
          + vids().map(function (id) { return '<button class="chip' + (id === cur ? ' on' : '') + '" data-mp="' + id + '">' + esc(profiles[id].name || id) + '</button>'; }).join('') + '</div>';
        $$('#calmonpick [data-mp]').forEach(function (b) {
          b.onclick = function () { r.months = r.months || {}; if (b.dataset.mp) r.months[m] = b.dataset.mp; else delete r.months[m]; $('#calmonpick').innerHTML = ''; saveAuto(); refreshCal(); };
        });
      };
    });
  }
  /* ---------------- v2.64 AUTOPILOT v2 — weekly schedule + sunset shift ----------------
     Conductor v2.62: GET/POST /api/schedule → { schedule:[{days:[0-6], time:'HH:MM',
     mode, name?}], sunShift:{on, offsetMin}, sun:{configured, nextSetting, target} }.
     Validation failures come back 400 {error:'rule N: …'} and surface via toast. */
  var schedDoc = null, schedEditIx = null;
  var SCHED_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  function schedFetch(cb) {
    api('/api/schedule').then(function (j) {
      if (j && j.ok) schedDoc = { schedule: j.schedule || [], sunShift: j.sunShift || { on: false, offsetMin: 0 }, sun: j.sun || { configured: false } };
      if (cb) cb();
    }).catch(function () { schedDoc = null; if (cb) cb(); });
  }
  function schedPost(body, cb) {
    post('/api/schedule', body).then(function (j) {
      if (j && j.ok) { schedDoc = { schedule: j.schedule || [], sunShift: j.sunShift || (schedDoc && schedDoc.sunShift) || { on: false, offsetMin: 0 }, sun: j.sun || (schedDoc && schedDoc.sun) || { configured: false } }; if (cb) cb(true); }
      else { toast('⚠ Schedule not saved' + (j && j.error ? ' — ' + j.error : '')); if (cb) cb(false); }
    }).catch(function (e) { toast('⚠ Schedule not saved — ' + ((e && e.message) || 'server refused')); if (cb) cb(false); });
  }
  function schedRuleText(r) {
    var ds = (r.days || []).slice().sort();
    var days = ds.length === 7 ? 'Every day' : ds.map(function (d) { return SCHED_DAYS[d] || d; }).join(' ');
    return days + ' · ' + (r.time || '--:--') + ' → ' + (r.name ? r.name + ' (' + modeName(r.mode) + ')' : modeName(r.mode));
  }
  /* next matching rule after now, client-side (mirrors the conductor's picker) */
  function schedNextRule(rules) {
    var best = null, now = new Date();
    (rules || []).forEach(function (r) {
      if (!r || !r.time || !(r.days && r.days.length)) return;
      var hm = String(r.time).split(':');
      for (var a = 0; a < 8; a++) {
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + a, +hm[0] || 0, +hm[1] || 0, 0, 0);
        if (d <= now || r.days.indexOf(d.getDay()) < 0) continue;
        if (!best || d < best.at) best = { at: d, rule: r };
        break;
      }
    });
    return best;
  }
  function schedRowEditorHTML(r) {
    r = r || { days: [1, 2, 3, 4, 5], time: '18:00', mode: vids()[0] || '', name: '' };
    return '<div class="phbox" id="rsschededit" style="margin-top:8px">'
      + '<div class="chips" style="margin-bottom:8px">' + SCHED_DAYS.map(function (d, i) { return '<button class="chip' + ((r.days || []).indexOf(i) >= 0 ? ' on' : '') + '" data-schday="' + i + '">' + d + '</button>'; }).join('') + '</div>'
      + '<div class="r3"><label class="fld"><span>Time</span><input type="time" id="rsschedtime" value="' + esc(r.time || '18:00') + '"></label>'
      + '<label class="fld"><span>Mode</span><select id="rsschedmode">' + vids().map(function (id) { return '<option value="' + esc(id) + '"' + (r.mode === id ? ' selected' : '') + '>' + esc(profiles[id].name || id) + '</option>'; }).join('') + '</select></label>'
      + '<label class="fld"><span>Name (optional)</span><input type="text" id="rsschedname" placeholder="Movie night…" value="' + esc(r.name || '') + '"></label></div>'
      + '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn sm gh" id="rsschedcancel">Cancel</button><div class="sp"></div><button class="btn sm p" id="rsschedok">Save rule</button></div></div>';
  }
  function drawSchedCard() {
    var el = $('#rsschedcard'); if (!el) return;
    if (!schedDoc) { el.innerHTML = '<div class="zt">🗓 Weekly schedule</div><div class="hint">Not available — the Conductor needs v2.62+.</div>'; return; }
    var rules = schedDoc.schedule;
    var h = '<div class="zt">🗓 Weekly schedule' + T('Fixed weekly appointments for the room — “Friday 18:00 → Movie night”. Runs alongside the monthly rhythms and daily rituals; the sunset shift below can slide evening rules with the real sun.') + '</div>';
    h += rules.length ? rules.map(function (r, i) {
      if (schedEditIx === i) return schedRowEditorHTML(r);
      return '<div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line)">'
        + '<span style="flex:1;font-size:13px">' + esc(schedRuleText(r)) + '</span>'
        + '<button class="btn sm gh" data-scheded="' + i + '" title="Edit rule">✎</button><button class="btn sm gh dg" data-scheddel="' + i + '" title="Delete rule">✕</button></div>';
    }).join('') : '<div class="hint">No rules yet — the room keeps to its rhythms.</div>';
    if (schedEditIx === 'new') h += schedRowEditorHTML(null);
    else if (schedEditIx === null) h += '<button class="btn sm" id="rsschedadd" style="margin-top:8px">＋ Add rule</button>';
    el.innerHTML = h;
    var add = $('#rsschedadd'); if (add) add.onclick = function () { schedEditIx = 'new'; drawSchedCard(); };
    $$('#rsschedcard [data-scheded]').forEach(function (b) { b.onclick = function () { schedEditIx = +b.dataset.scheded; drawSchedCard(); }; });
    $$('#rsschedcard [data-scheddel]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.scheddel; var next = rules.slice(); next.splice(i, 1); schedPost({ schedule: next }, function () { schedEditIx = null; drawSchedCard(); }); }; });
    $$('#rsschedcard [data-schday]').forEach(function (b) { b.onclick = function () { b.classList.toggle('on'); }; });
    var ok = $('#rsschedok'); if (ok) ok.onclick = function () {
      var days = $$('#rsschedcard [data-schday].on').map(function (b) { return +b.dataset.schday; });
      if (!days.length) return toast('Pick at least one day');
      var tv = ($('#rsschedtime').value || '').trim(); if (!tv) return toast('Pick a time');
      var rule = { days: days, time: tv, mode: $('#rsschedmode').value };
      var nm = ($('#rsschedname').value || '').trim(); if (nm) rule.name = nm;
      var next = rules.slice();
      if (schedEditIx === 'new') next.push(rule); else next[schedEditIx] = rule;
      schedPost({ schedule: next }, function (okd) { if (okd) { schedEditIx = null; drawSchedCard(); toast('Schedule saved'); } });
    };
    var cx = $('#rsschedcancel'); if (cx) cx.onclick = function () { schedEditIx = null; drawSchedCard(); };
  }
  function fmtShift(min) { var m = Math.abs(min || 0); return (min < 0 ? '−' : '+') + Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  function drawSunCard() {
    var el = $('#rssuncard'); if (!el) return;
    if (!schedDoc) { el.innerHTML = ''; el.style.display = 'none'; return; }
    var ss = schedDoc.sunShift || { on: false, offsetMin: 0 }, sun = schedDoc.sun || {};
    el.style.display = '';
    el.innerHTML = '<div class="zt">🌇 Sunset shift' + T('Slides the evening schedule rules with the real sunset — winter evenings start earlier, summer ones later. The offset nudges the anchor: −0:30 = half an hour before sunset.') + '</div>'
      + '<label class="chk" style="margin:0"><input type="checkbox" id="rssunon" ' + (ss.on ? 'checked' : '') + '> Follow the sunset</label>'
      + '<div style="display:flex;gap:10px;align-items:center;margin-top:8px">'
      + '<button class="btn sm gh" data-sunstep="-15">−15m</button>'
      + '<b style="color:var(--gold2);min-width:64px;text-align:center" id="rssunoff">' + fmtShift(ss.offsetMin || 0) + '</b>'
      + '<button class="btn sm gh" data-sunstep="15">+15m</button>'
      + '<span class="hint">offset from sunset (±4 h)</span></div>'
      + (sun.configured && sun.nextSetting ? '<div class="hint" style="margin-top:8px">Sunset today ≈ ' + new Date(sun.nextSetting).toTimeString().slice(0, 5) + (sun.target ? ' · shifted anchor ' + new Date(sun.target).toTimeString().slice(0, 5) : '') + '</div>' : (sun.configured ? '' : '<div class="hint" style="margin-top:8px">Sun times need Home Assistant (sun.sun) — offset saves, shifting starts once connected.</div>'));
    $('#rssunon').onchange = function () { schedPost({ sunShift: { on: this.checked, offsetMin: (schedDoc.sunShift && schedDoc.sunShift.offsetMin) || 0 } }, function () { drawSunCard(); }); };
    $$('#rssuncard [data-sunstep]').forEach(function (b) { b.onclick = function () {
      var cur = (schedDoc.sunShift && schedDoc.sunShift.offsetMin) || 0;
      var next = Math.max(-240, Math.min(240, cur + (+b.dataset.sunstep)));
      schedPost({ sunShift: { on: !!(schedDoc.sunShift && schedDoc.sunShift.on), offsetMin: next } }, function () { drawSunCard(); });
    }; });
  }
  function openCalendar() {
    var r = settings.rhythms = settings.rhythms || { on: false, months: {}, days: [], hours: [] };
    r.days = r.days || []; r.hours = r.hours || [];
    var w = settings.weather = settings.weather || { on: false, entity: 'weather.home', sunEntity: 'sun.sun', pollMinutes: 10, sunTone: true, map: null };
    var held = auto && auto.holdUntil && auto.holdUntil > Date.now();
    openSheet('<div class="shead"><h2>📅 The room’s calendar</h2><div class="sp"></div><button class="btn gh" id="calclose">Close</button></div><div class="sbody">'
      + '<div class="card"><label class="chk" style="margin:0"><input type="checkbox" id="ryon" ' + (r.on ? 'checked' : '') + '> <b>Autopilot on</b> — the room follows this calendar' + T('Seasonal months, special days and daily rituals switch the wall automatically — but only while an ambient mode is showing (never during a game), always with a slow silent crossfade, and Hold-the-room pauses everything.') + '</label>'
      + '<div class="hint" id="rynow" style="margin-top:6px">' + (held ? '⏸ Held until ' + new Date(auto.holdUntil).toTimeString().slice(0, 5) : '') + '</div></div>'
      + '<div class="card" id="rsschedcard"><div class="zt">🗓 Weekly schedule</div><div class="hint">Loading…</div></div>'   /* v2.64 */
      + '<div class="card" id="rssuncard" style="display:none"></div>'   /* v2.64 */
      + '<div class="card"><div class="zt">Today' + T('The computed result of every rule for today — hour rituals carve slices out of the day’s resting mode. Hover a block for exact times.') + '</div><div id="caltoday">' + dayBarHTML(0) + '</div>'
      + '<div class="zt" style="margin-top:10px">Tomorrow</div><div id="caltmrw">' + dayBarHTML(1) + '</div></div>'
      + '<div class="card"><div class="zt">The year' + T('Each month’s resting face. Tap a month to assign a mode — gold dots mark special days in that month.') + '</div><div id="calyear">' + calMonthsHTML() + '</div></div>'
      + '<div class="card"><div class="zt">Special days' + T('MM-DD repeats yearly (12-25 = Christmas); YYYY-MM-DD is a one-off. A special day replaces the month default for that whole day.') + '</div><div id="rydays"></div><button class="btn sm gh" id="ryaddday">+ Add day</button></div>'
      + '<div class="card"><div class="zt">Daily rituals' + T('Time slices on top of everything: days (sat,sun / mon-fri / *), from–to, mode. E.g. weekend 07:00–10:30 → family photos.') + '</div><div id="ryhours"></div><button class="btn sm gh" id="ryaddhour">+ Add ritual</button></div>'
      + weatherCard() + '</div>');
    $('#calclose').onclick = closeSheet;
    $('#ryon').onchange = function () { r.on = this.checked; saveAuto(); };
    schedEditIx = null; schedFetch(function () { drawSchedCard(); drawSunCard(); });   /* v2.64 */
    drawList($('#rydays'), r.days, DAYCOLS);
    drawList($('#ryhours'), r.hours, HOURCOLS);
    $('#ryaddday').onclick = function () { r.days.push({ when: '', mode: '', name: '' }); drawList($('#rydays'), r.days, DAYCOLS); };
    $('#ryaddhour').onclick = function () { r.hours.push({ days: '*', from: '', to: '', mode: '', name: '' }); drawList($('#ryhours'), r.hours, HOURCOLS); };
    wireMonths();
    if (auto && auto.target) $('#rynow').textContent += ((auto.target ? '  Now: ' + modeName(auto.target.mode) + ' (' + (auto.target.why || '') + ')' : '') + (auto.next ? ' → ' + modeName(auto.next.mode) + ' at ' + new Date(auto.next.at).toTimeString().slice(0, 5) : ''));
    $('#wxon').onchange = function () { w.on = this.checked; saveAuto(); };
    $('#wxent').onchange = function () { w.entity = this.value.trim() || 'weather.home'; saveAuto(); };
    $('#wxsun').onchange = function () { w.sunTone = this.checked; saveAuto(); };
    $$('#sheet [data-wxp]').forEach(function (b) { b.onclick = function () { wxLastCond = b.dataset.wxp; post('/api/weather/preview', { cond: b.dataset.wxp, minutes: 0.5 }).then(function () { toast('Previewing ' + b.dataset.wxp + ' for 30 s'); }); }; });
    var wp = $('#sheet [data-wxpin]'); if (wp) wp.onclick = function () { post('/api/weather/preview', { cond: wxLastCond, minutes: 120 }).then(function () { toast(wxLastCond + ' pinned for 2 h'); }); };
    var wc = $('#sheet [data-wxclr]'); if (wc) wc.onclick = function () { post('/api/weather/preview', { off: true }).then(function () { toast('Back to the real sky'); }); };
    if (auto && auto.weather) $('#wxnow').textContent = auto.weather.ha ? ('HA says: ' + (auto.weather.cond || 'unknown') + (auto.weather.effect ? ' → ' + auto.weather.effect.split('/').pop() : ' (no matching effect)')) : 'Home Assistant not connected yet';
  }
  var calBtn = $('#calbtn'); if (calBtn) calBtn.onclick = openCalendar;

  /* ---------------- settings sheet (globals) ---------------- */
  $('#gear').onclick = function () {
    var ch = settings.chroma || {}, os = settings.overlayShadow || {};
    var avol = (settings.audio && settings.audio.volume != null) ? settings.audio.volume : 70;
    openSheet('<div class="shead"><h2>Settings</h2><div class="sp"></div><button class="btn gh" id="pclose">Close</button></div><div class="sbody">'
      + '<div id="settabs"><button data-st="room" class="on">🏠 Room</button><button data-st="setup">🔧 Setup</button><button data-st="system">🛠 System</button></div>'
      + '<div class="setsec" data-sec="setup">'
      + '<div class="card"><div class="zt">Overlay green-screen (global)' + T('Overlay images with pure-green centres (window packs) get the green keyed out so the scene shows through. Applies to every mode.') + '</div>'
      + '<label class="chk"><input type="checkbox" id="gch" ' + (ch.on ? 'checked' : '') + '> Make green transparent</label>'
      + '<label class="fld"><span>Tolerance <b id="gchv" style="color:var(--gold2)">' + (ch.tol || 60) + '</b>' + T('How far from pure green still counts as “green”. Raise it if green fringes remain around window edges; lower it if parts of the artwork disappear.') + '</span><input type="range" id="gcht" min="20" max="160" value="' + (ch.tol || 60) + '"></label></div>'
      + '<div class="card"><div class="zt">Overlay drop shadow (global)' + T('Soft shadow cast by the window overlay onto the scene behind it — adds depth, like a real window reveal.') + '</div>'
      + '<label class="chk"><input type="checkbox" id="gos" ' + (os.on !== false ? 'checked' : '') + '> Shadow under overlays</label>'
      + '<div class="r2"><label class="fld"><span>Blur px</span><input type="number" id="gosb" min="0" max="40" value="' + (os.blur != null ? os.blur : 16) + '"></label>'
      + '<label class="fld"><span>Opacity %</span><input type="number" id="goso" min="0" max="90" value="' + Math.round((os.opacity != null ? os.opacity : 0.45) * 100) + '"></label></div></div>'
      + '</div><div class="setsec on" data-sec="room">'
      + '<div class="card"><div class="zt">Displays — wake / sleep each Frame TV' + T('Turn each Frame TV on (Wake = live scene) or to Art Mode (Sleep = the tasteful framed-art state) individually, via Home Assistant. Requires HA_URL/HA_TOKEN and mapped TV entities — see HA-SETUP.md.') + '</div><div id="cfgscreens"></div></div>'
      + '<div class="card"><div class="zt">Display PCs — media sync' + T('Each mini-PC keeps a local copy of all videos & images so the TVs play from local disk, not over the network. Shows each PC’s copy progress; Sync pulls any missing files now.') + '</div><div id="edgerows" class="hint">Checking…</div><button class="btn sm" id="edgesyncall" style="margin-top:8px">⟳ Sync all PCs</button><button class="btn sm gh" id="edgecleanall" style="margin-top:8px;margin-left:8px">Clean up all</button></div>'
      + '<div class="card"><div class="zt">Audio — all TVs volume' + T('One master volume for every TV at once. A mode can set its own volume (in Design → 🔊 Sound) which takes over on entry; this is the default when a mode doesn’t.') + '</div>'
      + '<label class="fld" style="margin:0"><span>All TVs volume <b id="avolv" style="color:var(--gold2)">' + avol + '%</b></span><input type="range" id="avol" min="0" max="100" value="' + avol + '"></label><button class="btn sm" id="cfgstopall" style="margin-top:10px">⏹ Stop all sounds</button></div>'
      + '</div><div class="setsec" data-sec="setup">'
      + '<div class="card"><div class="zt">Audio — PC HDMI port map' + T('Every HDMI audio output on each mini-PC. Press ▶ to send a test tone out that port and listen for which TV it comes from, then choose that TV in the dropdown. This records which physical port feeds which screen — the map the room uses to send sound to the right TV. “ID” flashes that frame’s number on its TV AND tones its port together, so you can confirm the same physical TV does both.') + '</div>'
      + '<div id="audiorows" class="hint">Checking…</div><button class="btn sm" id="audioidall" style="margin-top:8px">🔦 Identify all TVs — walk the wall</button></div>'
      + '<div class="card"><div class="zt">NFC tags — tap-a-box → mode' + T('Maps a physical NFC tag id (stuck on a game box) to a mode. Home Assistant reads the tap and calls the Conductor, which launches the mapped mode.') + '</div><div id="gtags"></div></div>'
      + '</div><div class="setsec" data-sec="system">'
      + '<div class="card"><div class="zt">System</div><div style="display:flex;gap:10px;flex-wrap:wrap">'
      + '<button class="btn" id="grescan">↻ Rescan media</button>'
      + '<button class="btn" id="gposters">▦ Make video thumbnails</button>'
      + '<button class="btn" id="greload">↻ Reload all frames</button>'
      + '<button class="btn" id="grestart">⟳ Restart Conductor</button>'
      + '<button class="btn" id="gthemes">🧩 Theme packs</button>'   /* Phase 3c */
      + '<a class="btn gh" href="wall-test.html" target="_blank">Wall test ↗</a>'
      + '<a class="btn gh" href="api/health" target="_blank">Health ↗</a></div>'
      + '<div class="hint" style="margin-top:10px">Home Assistant: ' + (haRoom.configured ? 'connected' : 'not configured — see HA-SETUP.md') + ' · Conductor v' + ((health && health.version) || '?') + '</div></div>'
      + '</div></div>');
    $('#pclose').onclick = closeSheet;
    $$('#settabs button').forEach(function (b) {
      b.onclick = function () {
        $$('#settabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
        $$('#sheet .setsec').forEach(function (x) { x.classList.toggle('on', x.dataset.sec === b.dataset.st); });
      };
    });
    function saveGlobals() {
      settings.chroma = { on: $('#gch').checked, tol: +$('#gcht').value, despill: true, color: '#00ff00' };
      settings.overlayShadow = { on: $('#gos').checked, blur: +$('#gosb').value, opacity: +$('#goso').value / 100, dx: 0, dy: 8 };
      clearTimeout(saveGlobals._t); saveGlobals._t = setTimeout(function () { persist().then(function () { toast('Globals saved'); }); }, 700);
      paintCanvas();
    }
    ['#gch', '#gcht', '#gos', '#gosb', '#goso'].forEach(function (s) { $(s).oninput = $(s).onchange = function () { $('#gchv').textContent = $('#gcht').value; saveGlobals(); }; });
    function drawTags() {
      $('#gtags').innerHTML = Object.keys(tagmap).map(function (t) {
        return '<div style="display:flex;gap:8px;margin-bottom:8px"><input type="text" value="' + esc(t) + '" data-tag="' + esc(t) + '" style="flex:1"><select data-tv="' + esc(t) + '" style="flex:1">' + opt(vids(), tagmap[t]) + '</select><button class="btn sm" data-td="' + esc(t) + '">✕</button></div>';
      }).join('') + '<button class="btn sm" id="gaddtag">+ Add tag</button>';
      $$('#gtags [data-td]').forEach(function (x) { x.onclick = function () { delete tagmap[x.dataset.td]; drawTags(); persist(); }; });
      $$('#gtags [data-tv]').forEach(function (x) { x.onchange = function () { tagmap[x.dataset.tv] = x.value; persist(); }; });
      $$('#gtags [data-tag]').forEach(function (x) { x.onchange = function () { var o = x.dataset.tag, n = x.value; if (n && n !== o) { tagmap[n] = tagmap[o]; delete tagmap[o]; drawTags(); persist(); } }; });
      var ga = $('#gaddtag'); if (ga) ga.onclick = function () { tagmap['04:NEW:' + Date.now().toString(16).slice(-4)] = vids()[0] || ''; drawTags(); };
    }
    drawTags();
    renderScreenRows(); refreshHaRoom().then(renderScreenRows);
    renderEdges(); if (edgePoll) clearInterval(edgePoll); edgePoll = setInterval(renderEdges, 4000);
    renderAudioPorts();
    var aia = $('#audioidall'); if (aia) aia.onclick = walkIdentify;
    var av = $('#avol'); if (av) av.oninput = function () { $('#avolv').textContent = this.value + '%'; clearTimeout(av._t); av._t = setTimeout(function () { post('/api/volume', { pct: +av.value }); }, 250); };
    var stp = $('#cfgstopall'); if (stp) stp.onclick = function () { post('/api/audio/stop', {}).then(function (r) { toast(r && r.ok ? '⏹ All sounds stopped' : 'Stop failed'); }); };   /* v3.41 */
    var esa = $('#edgesyncall'); if (esa) esa.onclick = function () { syncEdge(null); };
    var eca = $('#edgecleanall'); if (eca) eca.onclick = function () { cleanEdge(null); };
    $('#gthemes').onclick = openThemesSheet;   /* Phase 3c */
    $('#grescan').onclick = function () { post('/api/rescan').then(function () { toast('Rescanning…'); return boot2(); }); };
    $('#gposters').onclick = function () { makeVideoPosters(); };
    $('#greload').onclick = function () { post('/api/reload', { frame: 'all' }).then(function (j) { toast('↻ Reload sent (' + j.clients + ' clients)'); }); };
    $('#grestart').onclick = function () { askConfirm('Restart the Conductor?', 'Frames reconnect in ~10–30 s.', 'Restart', function () { post('/api/restart').then(function () { toast('⟳ Restarting — back shortly'); }); }, true); };   /* v2.54 */
  }
  /* ---------------- 🧩 Theme packs sheet (Phase 3c, RS-THEMES-UI) ----------------
     One compact sheet over /api/themes (opened from ⚙ Settings → System). Import
     posts the raw zip to /api/theme/import (409 → confirm → ?overwrite=1 retry);
     Export is a plain <a> download of /api/theme/export/<id>. After an import the
     profile set changed server-side, so reloadProfilesLight() re-pulls
     /api/profiles the way boot() does and repaints strip + Play. */
  function exportThemePack(packId) {
    var a = D.createElement('a');
    a.href = '/api/theme/export/' + encodeURIComponent(packId);
    a.download = '';
    D.body.appendChild(a); a.click(); a.remove();
    toast('⇩ Exporting ' + packId + '…');
  }
  function reloadProfilesLight() {   // same fields boot() adopts from /api/profiles, without re-booting the whole app
    return api('/api/profiles').then(function (r) {
      profiles = r.profiles || {}; tagmap = r.tagmap || tagmap; settings = r.settings || settings;
      window.__rsSettings = settings;
      if (!profiles[curId]) selectMode(vids()[0], true);
      renderStrip(); renderPlay(); renderNow();
    });
  }
  function openThemesSheet() {
    openSheet('<div class="shead"><h2>🧩 Theme packs</h2><div class="sp"></div>'
      + '<button class="btn" id="thimport">⇪ Import theme…</button>'
      + '<button class="btn gh" id="thclose">Close</button></div>'
      + '<div class="sbody" id="themesSheet"><div class="hint">Loading theme packs…</div></div>');
    $('#thclose').onclick = closeSheet;
    $('#thimport').onclick = function () {
      var inp = $('#themesImport'); if (!inp) return;
      inp.value = '';
      inp.onchange = function () { var f = inp.files && inp.files[0]; if (f) sendThemeZip(f, false); };
      inp.click();
    };
    paintThemesSheet();
  }
  function paintThemesSheet() {
    api('/api/themes').then(function (j) {
      var el = $('#themesSheet'); if (!el) return;
      var packs = (j && j.themes) || [];
      if (!packs.length) {
        el.innerHTML = '<div class="hint" style="text-align:center;padding:36px">No theme packs yet — Import a .zip above, or drop a pack folder into <b>themes/</b> and Rescan.</div>';
        return;
      }
      el.innerHTML = packs.map(function (t) {
        var miss = (t.missing || []).length, errs = t.errors || [], warns = t.warnings || [];
        return '<div class="card" data-pack="' + esc(t.id) + '">'
          + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
          + '<div style="flex:1;min-width:180px"><b>🧩 ' + esc(t.name || t.id) + '</b> <span class="hint">v' + esc(String(t.version != null ? t.version : '?')) + (t.author ? ' · ' + esc(t.author) : '') + '</span>'
          + '<div class="hint">' + (t.modes || []).length + ' mode' + ((t.modes || []).length === 1 ? '' : 's') + (t.kidSafe ? ' · kid-safe' : '') + '</div></div>'
          + (miss ? '<button class="btn sm gh" data-thmiss="' + esc(t.id) + '" style="color:#e0b04a;border-color:#e0b04a55">⚠ ' + miss + ' missing</button>' : '')
          + '<a class="btn sm" href="/api/theme/export/' + encodeURIComponent(t.id) + '" download>⇩ Export</a></div>'
          + (errs.length ? '<div style="color:#e0655f;font-size:12.5px;line-height:1.5;margin-top:8px">' + errs.map(esc).join('<br>') + '</div>' : '')
          + (warns.length ? '<div class="hint" style="color:#e0b04a;margin-top:6px">' + warns.map(esc).join('<br>') + '</div>' : '')
          + (miss ? '<div class="hint" data-thmisslist="' + esc(t.id) + '" style="display:none;margin-top:8px;line-height:1.6">'
              + (t.missing || []).map(esc).join('<br>')
              + '<br><span style="color:var(--dim)">add these files to the theme pack — the wall shows a 🧩 placeholder until then</span></div>' : '')
          + '</div>';
      }).join('');
      $$('#themesSheet [data-thmiss]').forEach(function (b) {
        b.onclick = function () {
          var l = $('#themesSheet [data-thmisslist="' + b.dataset.thmiss + '"]');
          if (l) l.style.display = l.style.display === 'none' ? '' : 'none';
        };
      });
    }).catch(function (e) {
      var el = $('#themesSheet');
      if (el) el.innerHTML = '<div class="hint">Could not load theme packs — ' + esc((e && e.message) || 'no response') + '</div>';
    });
  }
  function sendThemeZip(f, overwrite) {
    toast('⇪ Importing “' + f.name + '”…');
    fetch('/api/theme/import' + (overwrite ? '?overwrite=1' : ''), { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: f })
      .then(function (r) { return r.json().then(function (j) { return { code: r.status, j: j }; }); })
      .then(function (res) {
        if (res.code === 409) {
          askConfirm('Pack exists — replace?', 'A pack with this id is already installed. Replacing keeps the old copy in themes/.trash — nothing is deleted.', 'Replace', function () { sendThemeZip(f, true); });
          return;
        }
        if (!res.j || !res.j.ok) { toast('Import failed — ' + ((res.j && res.j.error) || ('HTTP ' + res.code))); return; }
        var miss = (res.j.missing || []).length;
        toast('🧩 Imported ' + (res.j.pack || f.name) + (res.j.replaced ? ' (old copy in .trash)' : '') + (miss ? ' — ⚠ ' + miss + ' file(s) missing' : ' ✓'));
        paintThemesSheet();
        reloadProfilesLight();
      })
      .catch(function (e) { toast('Import failed — ' + ((e && e.message) || e)); });
  }

  /* v1.43 make video thumbnails — the browser grabs a frame from each video and uploads it
     as the poster (no ffmpeg needed on the Conductor host). */
  async function makeVideoPosters() {
    var vs = scenes.filter(function (s) { return s.video; });
    if (!vs.length) return toast('No video scenes found');
    toast('Making ' + vs.length + ' video thumbnails — this can take a minute…');
    var ok = 0, fail = 0;
    for (var i = 0; i < vs.length; i++) {
      try { await grabPoster(vs[i]); ok++; } catch (e) { fail++; }
      if (i % 5 === 4) toast('Thumbnails: ' + (i + 1) + '/' + vs.length + '…');
    }
    toast('Thumbnails done: ' + ok + (fail ? (' (' + fail + ' failed)') : ''));
    await boot2();   // refresh scenes so the new posters show
  }
  function grabPoster(s) {
    return new Promise(function (resolve, reject) {
      var rel = decodeURIComponent((s.sample || '').slice(7));   // media-relative path (matches Conductor's key)
      var v = document.createElement('video');
      v.muted = true; v.preload = 'auto'; v.playsInline = true;
      var done = false;
      function cleanup() { try { v.removeAttribute('src'); v.load(); } catch (e) {} }
      function fail(e) { if (done) return; done = true; clearTimeout(tmo); cleanup(); reject(e || new Error('x')); }
      var tmo = setTimeout(function () { fail(new Error('timeout')); }, 20000);
      v.addEventListener('loadeddata', function () { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); } catch (e) {} });
      v.addEventListener('seeked', function () {
        if (done) return;
        try {
          var w = 320, h = Math.max(1, Math.round(320 * ((v.videoHeight || 9) / (v.videoWidth || 16))));
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(v, 0, 0, w, h);
          c.toBlob(function (blob) {
            if (!blob) return fail(new Error('no blob'));
            fetch('/api/poster?p=' + encodeURIComponent(rel), { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob })
              .then(function (r) { return r.json(); })
              .then(function (j) { done = true; clearTimeout(tmo); cleanup(); (j && j.ok) ? resolve() : reject(new Error((j && j.error) || 'save failed')); })
              .catch(fail);
          }, 'image/jpeg', 0.8);
        } catch (e) { fail(e); }
      });
      v.addEventListener('error', function () { fail(new Error('video decode error')); });
      v.src = s.sample;
    });
  }
  function boot2() {   // light refresh after rescan
    return Promise.all([api('/api/scenes'), api('/api/overlays'), api('/api/photodirs').catch(function () { return { dirs: [] }; }), api('/api/effects').catch(function () { return { effects: [] }; })]).then(function (r) {
      scenes = r[0].scenes || []; byKey = {}; scenes.forEach(function (s) { byKey[s.key] = s; }); _skCache = {};   /* v2.65 */
      overlays = r[1].overlays || []; albums = r[2].dirs || []; effects = r[3].effects || [];
      renderTray(); renderPlay(); renderStrip(); toast('Media rescanned ✓');
    });
  }

  window.__rsRefresh=function(){return post('/api/rescan').then(boot2);};
  /* v2.44 (QW14): kiosk idle return — 10 min untouched → back to Play · Modes.
     Never while a draft is dirty or a preview is live on the TVs. */
  var lastInteraction = Date.now();
  ['pointerdown', 'keydown'].forEach(function (ev) { D.addEventListener(ev, function () { lastInteraction = Date.now(); }, { passive: true }); });
  setInterval(function () {
    if (Date.now() - lastInteraction < 600000) return;
    if (dirty || previewOn) return;
    if (space === 'play' && playTab === 'modes') return;
    setSpace('play'); setPlayTab('modes');
  }, 60000);
  boot();
})();

/* ================= RS-TICK (2026-07-24, app v2.64) =================
   ONE master 400ms setInterval drives every appended block's DOM-poll loop
   (previously ~16 independent setIntervals). window.__rsTick.every(ms, fn)
   registers a job at its own cadence; each run is try/caught; ALL work is
   skipped while document.hidden (background tabs stop hammering the DOM).
   every() returns { stop() } for jobs that used to clearInterval themselves.
   Core-app intervals (pollHealth, renderAuto, musicPoll, timerTick, edgePoll,
   idle-return) are lifecycle-managed inside the main IIFE and stay as they are. */
;(function(){
  if (window.__rsTick) return;
  var jobs = [];
  setInterval(function(){
    if (document.hidden) return;
    var now = Date.now();
    for (var i = 0; i < jobs.length; i++){
      var j = jobs[i];
      if (j.stopped){ jobs.splice(i--, 1); continue; }
      if (now - j.last >= j.ms){ j.last = now; try{ j.fn(); }catch(e){} }
    }
  }, 400);
  window.__rsTick = {
    every: function(ms, fn, opts){
      var j = { ms: Math.max(400, +ms || 400), fn: fn, last: (opts && opts.immediate) ? 0 : Date.now(), stopped: false };
      jobs.push(j);
      return { stop: function(){ j.stopped = true; } };
    }
  };
})();

/* ================= ROOMSCAPE APP QA PATCH A (2026-07-11) =================
   Cue cards had no obvious exit (a small "Hide" button) — QA finding.
   This enhancer upgrades the button to a prominent "✕ End cue cards" every
   time the prompter widget re-renders. Appended to app.js; UI-only.        */
;(function(){
  try{
    window.__rsTick.every(800, function(){   /* v2.64: rides the shared scheduler */
      var b = document.getElementById('cueoff');
      if (b && !b.__rsQa){
        b.__rsQa = 1;
        b.textContent = '✕ End cue cards';
        b.title = 'Stop the cue cards and return the frame to the scene';
        b.style.cssText += ';padding:10px 16px;font-size:14px;font-weight:700;background:#5c2320;color:#ffb4a6;border:1px solid #8a3a34;border-radius:10px;letter-spacing:.04em;';
      }
    });
  }catch(e){}
})();

/* ================= ROOMSCAPE APP QA PATCH B (2026-07-13) =================
   Frame TV wake fix (client side). The Screens/Displays/Focus buttons send
   media_player.turn_off for BOTH wake and sleep (assuming a power toggle),
   but on Samsung Frame TVs turn_off is OFF-ONLY and turn_on is a no-op —
   only media_player.toggle actually flips power. Shim window.fetch so any
   /api/ha/service media_player turn_off/turn_on aimed at the room's TVs is
   rewritten to media_player.toggle. Phase 2c: the quirk is CONFIGURABLE —
   settings.ha.tvQuirks maps entity ids to quirk names ({"media_player.x":
   "samsung-frame"}, set in profiles.json or CONFIG.ha.tvQuirks; the core app
   exposes the loaded settings as window.__rsSettings). The legacy match
   (entity id contains 'dining', the reference install's naming) is kept as a
   fallback so the reference install works with no config. Everything else is
   untouched.                                                                */
;(function(){
  try{
    if (window.__rsTvFetchShim) return; window.__rsTvFetchShim = 1;
    function quirks(){ var s = window.__rsSettings; return (s && s.ha && s.ha.tvQuirks) || {}; }
    function isFrameTv(x){
      if (typeof x !== 'string') return false;
      if (quirks()[x] === 'samsung-frame') return true;      // Phase 2c: configured quirk map
      return x.indexOf('dining') !== -1;                     // legacy fallback (reference install naming)
    }
    var _fetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      try{
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (init && typeof init.body === 'string' && url.indexOf('/api/ha/service') !== -1){
          var b = JSON.parse(init.body);
          if (b && b.domain === 'media_player' && (b.service === 'turn_off' || b.service === 'turn_on') && b.data && b.data.entity_id){
            var ids = [].concat(b.data.entity_id);
            var allTv = ids.length && ids.every(isFrameTv);
            if (allTv){ b.service = 'toggle'; init = Object.assign({}, init, { body: JSON.stringify(b) }); }
          }
        }
      }catch(e){}
      return _fetch(input, init);
    };
    console.log('[rs] TV wake fetch-shim active (samsung-frame tvQuirks / legacy dining match -> toggle)');
  }catch(e){}
})();


/* ================= ROOMSCAPE REVEAL STUDIO — APP v2 (2026-07-13) =========
   Injected panel to build per-frame reveal "reels" with video thumbnails.
   v2: launcher raised clear of the bottom toolbar; clip strip scrolls
   horizontally inside the modal; "Add clip" pinned in the section header.    */
;(function(){
  if (window.__revealStudio) return; window.__revealStudio = 2;
  var D = document;
  function el(tag, css, html){ var e=D.createElement(tag); if(css)e.style.cssText=css; if(html!=null)e.innerHTML=html; return e; }
  function jget(u){ return fetch(u,{cache:'no-store'}).then(function(r){return r.json();}); }
  function jpost(u,b){ return fetch(u,{method:'POST',headers:b?{'Content-Type':'application/json'}:undefined,body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().catch(function(){return{ok:r.ok};});}); }
  function FRAMES_(){ return (window.__rsLayout&&window.__rsLayout.frames)||(IE.FRAME_IDS); }   /* v2.64: layout from the conductor (Phase 2a: no static literal) */
  var GOLD='var(--gold)', LINE='#2a2a32', PANEL='#16161c', INK='#ece7db', FAINT='#8f8a7d';   /* v2.44 (QW15): app palette, was #c8a24a */

  // ---- launcher (raised above the bottom toolbar so it never covers app controls) ----
  var btn = el('button','position:fixed;left:14px;bottom:70px;z-index:99998;background:'+PANEL+';color:'+INK+';border:1px solid '+LINE+';border-radius:12px;padding:9px 13px;font:600 13px system-ui;letter-spacing:.04em;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.5);opacity:.92','🎭 Reveal Studio');
  btn.onmouseover=function(){btn.style.borderColor=GOLD;btn.style.opacity='1';}; btn.onmouseout=function(){btn.style.borderColor=LINE;btn.style.opacity='.92';};
  D.body.appendChild(btn);

  var state = { profiles:null, modeId:null, frame:FRAMES_()[0], reel:FRAMES_().map(function(){return [];}), cfg:{trigger:'manual',everyS:180,jitter:0.5,fadeS:0.6}, scenes:null };

  /* v2.64: reuse the core toast (window.__rsToast); old floating pill only as fallback */
  function toast(m){ if(window.__rsToast){ window.__rsToast(m); return; } var t=el('div','position:fixed;left:50%;bottom:70px;transform:translateX(-50%);background:#26262e;border:1px solid '+LINE+';color:'+INK+';padding:9px 16px;border-radius:10px;z-index:100000;font:13px system-ui',m); D.body.appendChild(t); setTimeout(function(){t.remove();},2600); }

  var ov = el('div','position:fixed;inset:0;background:rgba(6,6,9,.72);z-index:99999;display:none;align-items:center;justify-content:center;backdrop-filter:blur(3px)');
  var modal = el('div','width:min(920px,94vw);max-height:90vh;overflow-y:auto;overflow-x:hidden;background:'+PANEL+';border:1px solid '+LINE+';border-radius:18px;padding:20px 22px;color:'+INK+';font:14px system-ui');
  ov.appendChild(modal); D.body.appendChild(ov);
  ov.onclick=function(e){ if(e.target===ov) close(); };
  function close(){ ov.style.display='none'; }
  btn.onclick=open;

  function h2(t){ return '<div style="font:600 12px system-ui;letter-spacing:.18em;color:'+FAINT+';text-transform:uppercase;margin:18px 2px 10px">'+t+'</div>'; }

  async function open(){
    ov.style.display='flex';
    modal.innerHTML='<div style="color:'+FAINT+'">Loading…</div>';
    var pj = await jget('/api/profiles');
    state.profiles = pj.profiles||{};
    var st = await jget('/api/state').catch(function(){return{};});
    if(!state.modeId){ state.modeId = (st.game && state.profiles[st.game]) ? st.game : Object.keys(state.profiles)[0]; }
    if(!state.scenes){ var sc = await jget('/api/scenes?video=1&thumb=1&sample=1'); state.scenes = (Array.isArray(sc)?sc:(sc.scenes||[])).filter(function(s){return s.video;}); }
    loadMode();
    render();
  }
  function loadMode(){
    var p = state.profiles[state.modeId]||{};
    var rv = p.reveal||{};
    state.cfg = { trigger:(rv.trigger==='random'?'random':'manual'), everyS:+rv.everyS||180, jitter:(rv.jitter!=null?+rv.jitter:0.5), fadeS:(rv.fadeS!=null?+rv.fadeS:0.6) };
    var reels = Array.isArray(rv.reels)?rv.reels:null;
    state.reel=FRAMES_().map(function(){return [];});   /* v2.64: sized from layout */
    for(var i=0;i<state.reel.length;i++){
      if(reels && Array.isArray(reels[i])) state.reel[i]=reels[i].slice();
      else if(rv.videos && rv.videos[i]) state.reel[i]=[rv.videos[i]];
    }
  }
  function rawOf(scene){ return decodeURIComponent(String(scene.sample||'').replace(/^\/media\//,'')); }
  function thumbFor(raw){ var s=(state.scenes||[]).find(function(x){return rawOf(x)===raw;}); return s?s.thumb:null; }
  function nameFor(raw){ var s=(state.scenes||[]).find(function(x){return rawOf(x)===raw;}); return s?s.key:raw.split('/').pop(); }

  function render(){
    var modeOpts = Object.keys(state.profiles).map(function(k){ var n=state.profiles[k].name||k; return '<option value="'+k+'"'+(k===state.modeId?' selected':'')+'>'+n+'</option>'; }).join('');
    var frameChips = FRAMES_().map(function(f,i){ var n=(state.reel[i]||[]).length; return '<button data-f="'+f+'" style="border:1px solid '+(f===state.frame?GOLD:LINE)+';background:'+(f===state.frame?'rgba(200,162,74,.12)':'transparent')+';color:'+INK+';border-radius:10px;padding:9px 12px;cursor:pointer;font:600 13px system-ui">'+f+(n?' <span style="color:'+GOLD+'">•'+n+'</span>':'')+'</button>'; }).join('');
    var fi = FRAMES_().indexOf(state.frame);
    var reel = state.reel[fi]||[];
    var tiles = reel.map(function(raw,idx){ var th=thumbFor(raw);
      return '<div style="position:relative;width:132px;flex:none">'+
        '<div style="width:132px;height:132px;border-radius:12px;border:1px solid '+LINE+';background:#0c0c10 '+(th?("center/cover url('"+th+"')"):'')+';display:flex;align-items:center;justify-content:center;font-size:30px;color:'+GOLD+'">'+(th?'':'▶')+'</div>'+
        '<div style="font:12px system-ui;color:'+FAINT+';margin-top:5px;line-height:1.2;height:30px;overflow:hidden">'+nameFor(raw)+'</div>'+
        '<button data-rm="'+idx+'" title="Remove" style="position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:99px;border:none;background:rgba(0,0,0,.7);color:#ffb4a6;cursor:pointer">×</button>'+
        '<button data-play="'+idx+'" title="Audition on '+state.frame+'" style="position:absolute;bottom:44px;right:6px;width:26px;height:26px;border-radius:99px;border:none;background:rgba(0,0,0,.7);color:'+INK+';cursor:pointer">▶</button>'+
      '</div>'; }).join('');
    var strip = reel.length
      ? '<div style="display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;max-width:100%;padding:2px 2px 12px;align-items:flex-start">'+tiles+'</div>'
      : '<div style="color:'+FAINT+';padding:16px 4px">No clips yet — click <b style="color:'+INK+'">＋ Add clip</b> to build '+state.frame+"'s reel.</div>";

    modal.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px"><div style="font:700 18px system-ui;letter-spacing:.02em">🎭 Reveal Studio</div>'+
        '<select id="rsMode" style="margin-left:auto;background:'+PANEL+';color:'+INK+';border:1px solid '+LINE+';border-radius:8px;padding:7px 10px;font:13px system-ui">'+modeOpts+'</select>'+
        '<button id="rsX" style="background:none;border:1px solid '+LINE+';color:'+INK+';border-radius:8px;padding:7px 11px;cursor:pointer">✕</button></div>'+
      '<div style="color:'+FAINT+';font:13px system-ui;margin-top:6px">A frame shows a still, then occasionally flicks to one of its clips and settles back. Add 2–3 clips per frame; each trigger plays a random one.</div>'+
      h2('Frame')+'<div style="display:flex;gap:8px;flex-wrap:wrap">'+frameChips+'</div>'+
      '<div style="display:flex;align-items:center;margin:18px 2px 10px"><div style="font:600 12px system-ui;letter-spacing:.18em;color:'+FAINT+';text-transform:uppercase">Clips for '+state.frame+' — plays a random one</div>'+
        '<button id="rsAdd" style="margin-left:auto;border:1px dashed '+GOLD+';background:transparent;color:'+GOLD+';border-radius:9px;padding:7px 13px;cursor:pointer;font:600 12px system-ui;white-space:nowrap">＋ Add clip</button></div>'+
      strip+
      h2('Timing & triggers')+
        '<div style="display:flex;gap:22px;flex-wrap:wrap;align-items:center">'+
          '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="rsRand"'+(state.cfg.trigger==='random'?' checked':'')+'> Fire randomly on a timer</label>'+
          '<label style="color:'+FAINT+'">Every <input type="number" id="rsEvery" value="'+state.cfg.everyS+'" min="8" style="width:66px;background:'+PANEL+';color:'+INK+';border:1px solid '+LINE+';border-radius:6px;padding:5px" > s</label>'+
          '<label style="color:'+FAINT+'">Spread <input type="number" id="rsJit" value="'+Math.round(state.cfg.jitter*100)+'" min="0" max="100" style="width:60px;background:'+PANEL+';color:'+INK+';border:1px solid '+LINE+';border-radius:6px;padding:5px"> %</label>'+
          '<label style="color:'+FAINT+'">Crossfade <input type="number" id="rsFade" value="'+state.cfg.fadeS+'" min="0.1" step="0.1" style="width:60px;background:'+PANEL+';color:'+INK+';border:1px solid '+LINE+';border-radius:6px;padding:5px"> s</label>'+
        '</div>'+
        '<div style="color:'+FAINT+';font:12px system-ui;margin-top:8px">The manual Reveal buttons in Play always work too — random and button-press coexist. "Spread" jitters the interval so frames don\'t fire in lockstep.</div>'+
      '<div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">'+
        '<button id="rsTest" style="background:'+PANEL+';border:1px solid '+LINE+';color:'+INK+';border-radius:10px;padding:10px 16px;cursor:pointer">▶ Test '+state.frame+' on the wall</button>'+
        '<button id="rsSave" style="background:'+GOLD+';border:none;color:#1a150a;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer">Save to '+(state.profiles[state.modeId].name||state.modeId)+'</button></div>';

    D.getElementById('rsX').onclick=close;
    D.getElementById('rsMode').onchange=function(e){ state.modeId=e.target.value; loadMode(); render(); };
    modal.querySelectorAll('[data-f]').forEach(function(b){ b.onclick=function(){ state.frame=b.getAttribute('data-f'); render(); }; });
    modal.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=function(){ state.reel[fi].splice(+b.getAttribute('data-rm'),1); render(); }; });
    modal.querySelectorAll('[data-play]').forEach(function(b){ b.onclick=function(){ jpost('/api/reveal',{frame:state.frame}).then(function(){toast('Firing a reveal on '+state.frame+' (uses the saved reel — Save first to include new clips)');}); }; });
    D.getElementById('rsAdd').onclick=openPicker;
    D.getElementById('rsTest').onclick=function(){ jpost('/api/reveal',{frame:state.frame}).then(function(){toast('Firing a reveal on '+state.frame);}); };
    D.getElementById('rsRand').onchange=function(e){ state.cfg.trigger=e.target.checked?'random':'manual'; };
    D.getElementById('rsEvery').onchange=function(e){ state.cfg.everyS=Math.max(8,+e.target.value||180); };
    D.getElementById('rsJit').onchange=function(e){ state.cfg.jitter=Math.min(1,Math.max(0,(+e.target.value||0)/100)); };
    D.getElementById('rsFade').onchange=function(e){ state.cfg.fadeS=Math.max(0.1,+e.target.value||0.6); };
    D.getElementById('rsSave').onclick=save;
  }

  function openPicker(){
    var fi=FRAMES_().indexOf(state.frame);
    var grid = (state.scenes||[]).map(function(s,i){ return '<div data-pick="'+i+'" style="width:120px;flex:none;cursor:pointer">'+
        '<div style="width:120px;height:120px;border-radius:10px;border:1px solid '+LINE+';background:#0c0c10 center/cover url(\''+(s.thumb||'').replace(/'/g,'%27')+'\');"></div>'+
        '<div style="font:11px system-ui;color:'+FAINT+';margin-top:4px;height:28px;overflow:hidden;line-height:1.2">'+s.key+'</div></div>'; }).join('');
    var pk = el('div','position:fixed;inset:0;background:rgba(6,6,9,.85);z-index:100001;display:flex;align-items:center;justify-content:center');
    var box = el('div','width:min(860px,94vw);max-height:86vh;overflow-y:auto;overflow-x:hidden;background:'+PANEL+';border:1px solid '+LINE+';border-radius:16px;padding:18px;color:'+INK);
    box.innerHTML='<div style="display:flex;align-items:center"><div style="font:700 15px system-ui">Add a clip to '+state.frame+'</div><button id="pkX" style="margin-left:auto;background:none;border:1px solid '+LINE+';color:'+INK+';border-radius:8px;padding:6px 10px;cursor:pointer">✕</button></div>'+
      '<div style="color:'+FAINT+';font:12px system-ui;margin:6px 0 12px">'+(state.scenes||[]).length+' video clips. Click to add.</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:12px">'+grid+'</div>';
    pk.appendChild(box); D.body.appendChild(pk);
    pk.onclick=function(e){ if(e.target===pk) pk.remove(); };
    box.querySelector('#pkX').onclick=function(){ pk.remove(); };
    box.querySelectorAll('[data-pick]').forEach(function(d){ d.onclick=function(){ var s=state.scenes[+d.getAttribute('data-pick')]; state.reel[fi].push(rawOf(s)); pk.remove(); render(); }; });
  }

  async function save(){
    var pj = await jget('/api/profiles');
    var p = pj.profiles[state.modeId]; if(!p){ toast('Mode not found'); return; }
    p.reveal = p.reveal||{};
    p.reveal.reels = state.reel.map(function(a){ return a.slice(); });
    p.reveal.trigger = state.cfg.trigger;
    p.reveal.everyS = state.cfg.everyS;
    p.reveal.jitter = state.cfg.jitter;
    p.reveal.fadeS = state.cfg.fadeS;
    p.reveal.videos = state.reel.map(function(a){ return a[0]||null; });
    var r = await fetch('/api/profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pj)});
    toast(r.ok?('Saved reveal reels to '+(p.name||state.modeId)):'Save failed');
  }
})();


/* RS-REFRESH-LIB removed 2026-07-24 — superseded by the Library & previews settings card */


/* ================= ROOMSCAPE MEDIA FX (app UI) 2026-07-14 =================
   RS-MEDIA-FX-APP
   Motion & FX panel gains, for the selected effect clip:
     - Opacity (target), Fade in (s), Fade out (s)  -> per effect clip, everywhere
   And a "Colour-grade image" button opens a popup of per-image sliders
   (brightness/contrast/saturation/hue/warmth/exposure/gamma/vignette/blur/sharpen),
   applied to that scene image everywhere. Both save to /api/mediafx and preview
   live via the fx.js renderer (IE._regradeAll + the effect envelope loop).
   Appended to app.js; window/DOM/IE globals + fetch only. */
;(function(){
  if (window.__rsMediaFxApp) return; window.__rsMediaFxApp = true;
  function FRAME_IDS_(){ return (window.__rsLayout&&window.__rsLayout.frames)||(IE.FRAME_IDS); }   /* v2.64: layout from the conductor (Phase 2a: no static literal) */
  function api(p, body){ return fetch(p, body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined).then(function(r){return r.json();}); }
  function ensureMaps(){ IE._imgAdjust = IE._imgAdjust || {}; IE._overlayFx = IE._overlayFx || {}; }
  function regrade(){ try{ if(IE._regradeAll) IE._regradeAll(); }catch(e){} }

  var saveT=null, savePend={imgAdjust:{},overlayFx:{}};
  function queueSave(kind, key, val){
    savePend[kind][key]=val;
    clearTimeout(saveT);
    saveT=setTimeout(function(){ var b={imgAdjust:savePend.imgAdjust, overlayFx:savePend.overlayFx}; savePend={imgAdjust:{},overlayFx:{}}; api('/api/mediafx', b).catch(function(){}); }, 350);
  }

  /* ---------- which scene image is in the selected frame ---------- */
  function selectedFrameIdx(){
    var insp=document.querySelector('#insp'); var h=insp&&insp.querySelector('h2');
    /* v2.64: match against the layout's actual frame ids, not a [LR][123] literal */
    var ids=FRAME_IDS_();
    var m=h && (h.textContent||'').match(new RegExp('\\b('+ids.join('|')+')\\b'));
    if(m){ var i=ids.indexOf(m[1]); if(i>=0) return i; }
    return 0;
  }
  function imgKeyForFrame(idx){
    var frs=document.querySelectorAll('#walls .fr'); var fr=frs[idx]||frs[0]; if(!fr) return '';
    var pano=fr.querySelector('.ie-pano'); if(!pano) return '';
    var bg=getComputedStyle(pano).backgroundImage;
    if(!bg||bg.indexOf('url(')<0||bg.indexOf('data:image/svg')>=0) return '';
    var u=bg.slice(4,-1).replace(/^["']|["']$/g,'');
    try{ return new URL(u, location.href).pathname; }catch(e){ return u; }
  }

  /* ---------- colour popup ---------- */
  var SLIDERS=[
    {k:'bri', label:'Brightness', min:0.3,max:2,step:0.01,def:1},
    {k:'con', label:'Contrast',   min:0.3,max:2,step:0.01,def:1},
    {k:'sat', label:'Saturation', min:0,  max:2,step:0.01,def:1},
    {k:'hue', label:'Hue',        min:-180,max:180,step:1,def:0,unit:'°'},
    {k:'warm',label:'Warmth',     min:-100,max:100,step:1,def:0},
    {k:'exp', label:'Exposure',   min:-100,max:100,step:1,def:0},
    {k:'gam', label:'Gamma',      min:0.4,max:2.5,step:0.01,def:1},
    {k:'vig', label:'Vignette',   min:0,  max:100,step:1,def:0,unit:'%'},
    {k:'blur',label:'Blur',       min:0,  max:20,step:0.5,def:0,unit:'px'},
    {k:'sharp',label:'Sharpen',   min:0,  max:100,step:1,def:0,unit:'%'}
  ];
  function openColor(){
    ensureMaps();
    var idx=selectedFrameIdx(), key=imgKeyForFrame(idx);
    document.getElementById('rs-color-modal')?.remove();
    var scrim=document.createElement('div'); scrim.id='rs-color-modal';
    scrim.style.cssText='position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;';
    var box=document.createElement('div');
    box.style.cssText='background:#14171e;border:1px solid #3a3f4a;border-radius:16px;padding:18px 20px;width:min(460px,92vw);max-height:88vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.6);font:500 13px system-ui;color:#e6e9ef;';
    box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px"><div style="font-weight:700;font-size:15px">Image settings</div><button id="rs-col-x" class="btn sm">Close</button></div>';
    var nameEl=document.createElement('div'); nameEl.style.cssText='opacity:.6;font-size:12px;margin-bottom:12px;word-break:break-all';
    nameEl.textContent = key ? ('Applies to this image everywhere: '+decodeURIComponent(key.split('/').pop())) : 'No adjustable image in this frame.';
    box.appendChild(nameEl);
    scrim.appendChild(box); document.body.appendChild(scrim);
    document.getElementById('rs-col-x').onclick=function(){ scrim.remove(); };
    scrim.onmousedown=function(e){ if(e.target===scrim) scrim.remove(); };
    if(!key) return;
    var cur=Object.assign({}, IE._imgAdjust[key]||{});
    function commit(){ IE._imgAdjust[key]=Object.assign({}, cur); regrade(); queueSave('imgAdjust', key, IE._imgAdjust[key]); }
    SLIDERS.forEach(function(s){
      var row=document.createElement('div'); row.style.cssText='margin:9px 0';
      var top=document.createElement('div'); top.style.cssText='display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px';
      var val=(cur[s.k]==null?s.def:+cur[s.k]);
      var lab=document.createElement('span'); lab.textContent=s.label;
      var num=document.createElement('span'); num.style.opacity='.75';
      function fmt(v){ return (s.step<1? (+v).toFixed(2): (''+v)) + (s.unit||''); }
      num.textContent=fmt(val);
      top.appendChild(lab); top.appendChild(num); row.appendChild(top);
      var inp=document.createElement('input'); inp.type='range'; inp.min=s.min; inp.max=s.max; inp.step=s.step; inp.value=val;
      inp.style.cssText='width:100%';
      inp.oninput=function(){ var v=+inp.value; num.textContent=fmt(v); if(v===s.def){ delete cur[s.k]; } else { cur[s.k]=v; } commit(); };
      row.appendChild(inp); box.appendChild(row);
    });
    var foot=document.createElement('div'); foot.style.cssText='display:flex;gap:8px;margin-top:14px';
    var reset=document.createElement('button'); reset.className='btn sm'; reset.textContent='Reset image';
    reset.onclick=function(){ cur={}; IE._imgAdjust[key]={}; delete IE._imgAdjust[key]; regrade(); queueSave('imgAdjust', key, null); scrim.remove(); };
    foot.appendChild(reset); box.appendChild(foot);
  }

  /* ---------- Motion & FX injection ---------- */
  function num(v,step){ return step<1?(+v).toFixed(2):(''+Math.round(v)); }
  function injectEffect(){
    var sel=document.querySelector('#insp select[data-eff]');
    if(!sel) return;
    var panel=sel.closest('#insp') || document.querySelector('#insp');
    // colour-grade button (top of the Motion & FX panel)
    if(panel && !panel.querySelector('#rs-color-btn')){
      var cb=document.createElement('button'); cb.id='rs-color-btn'; cb.type='button'; cb.className='btn sm';
      cb.textContent='🎨 Colour-grade image…'; cb.style.margin='0 0 10px';
      cb.onclick=openColor;
      var h=panel.querySelector('h2'); if(h && h.nextSibling) h.parentNode.insertBefore(cb, h.nextSibling); else panel.insertBefore(cb, panel.firstChild);
    }
    // opacity + fade for the selected effect clip
    var fld=sel.closest('.fld')||sel.parentNode;
    if(fld && !document.getElementById('rs-eff-fx')){
      var wrap=document.createElement('div'); wrap.id='rs-eff-fx'; wrap.className='fld';
      wrap.style.cssText='margin-top:8px;padding:10px;border:1px solid #2a2f3a;border-radius:10px;background:rgba(255,255,255,.02)';
      wrap.innerHTML='<div style="font-size:12px;opacity:.8;margin-bottom:2px">Overlay opacity &amp; fade (this effect clip, everywhere)</div>';
      fld.parentNode.insertBefore(wrap, fld.nextSibling);
      var rows=document.createElement('div'); wrap.appendChild(rows);
      var lenNote=document.createElement('div'); lenNote.style.cssText='font-size:11px;opacity:.6;margin-top:4px'; wrap.appendChild(lenNote);
      wrap._rows=rows; wrap._note=lenNote;
      syncEffect();
    }
    if(sel.__rsHooked) return; sel.__rsHooked=true;
    sel.addEventListener('change', syncEffect);
  }
  function syncEffect(){
    var sel=document.querySelector('#insp select[data-eff]');
    var wrap=document.getElementById('rs-eff-fx'); if(!sel||!wrap) return;
    ensureMaps();
    var f=sel.value; var rows=wrap._rows; rows.innerHTML='';
    if(!f){ wrap.style.opacity=.5; wrap._note.textContent='Pick an effect clip above to set its fade.'; return; }
    wrap.style.opacity=1;
    var cur=Object.assign({opacity:1,fadeIn:0,fadeOut:0}, IE._overlayFx[f]||{});
    function commit(){ IE._overlayFx[f]=Object.assign({}, cur); queueSave('overlayFx', f, IE._overlayFx[f]); }
    var specs=[['opacity','Target opacity',0,1,0.01,'%',100],['fadeIn','Fade in',0,20,0.5,'s',1],['fadeOut','Fade out',0,20,0.5,'s',1]];
    specs.forEach(function(sp){
      var kk=sp[0], label=sp[1], mn=sp[2], mx=sp[3], st=sp[4], unit=sp[5], disp=sp[6];
      var row=document.createElement('div'); row.style.cssText='margin:7px 0';
      var top=document.createElement('div'); top.style.cssText='display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px';
      var v=cur[kk];
      var num2=document.createElement('span'); num2.style.opacity='.75';
      function fmt(x){ return (unit==='%'? Math.round(x*disp): x) + unit; }
      num2.textContent=fmt(v);
      var lab=document.createElement('span'); lab.textContent=label;
      top.appendChild(lab); top.appendChild(num2); row.appendChild(top);
      var inp=document.createElement('input'); inp.type='range'; inp.min=mn; inp.max=mx; inp.step=st; inp.value=v; inp.style.cssText='width:100%';
      inp.oninput=function(){ var x=+inp.value; cur[kk]=x; num2.textContent=fmt(x); commit(); checkLen(); };
      row.appendChild(inp); rows.appendChild(row);
    });
    // clip length note
    var note=wrap._note; note.textContent='';
    function checkLen(){
      if(wrap._dur){ var tot=(cur.fadeIn||0)+(cur.fadeOut||0);
        note.textContent = 'Clip is '+wrap._dur.toFixed(1)+'s'+(tot>wrap._dur?(' — fade in+out ('+tot+'s) exceeds it, so it will pulse without fully reaching the target'):''); }
    }
    if(wrap._durFor!==f){ wrap._durFor=f; wrap._dur=null;
      var vv=document.createElement('video'); vv.preload='metadata'; vv.muted=true;
      vv.onloadedmetadata=function(){ wrap._dur=vv.duration; checkLen(); };
      vv.src='/media/'+f.split('/').map(encodeURIComponent).join('/');
    } else checkLen();
  }

  var it=null;
  function scheduleInject(){ clearTimeout(it); it=setTimeout(injectEffect,120); }
  function observe(){ var insp=document.querySelector('#insp'); if(insp){ new MutationObserver(scheduleInject).observe(insp,{childList:true,subtree:true}); } }

  function boot(){ ensureMaps(); api('/api/mediafx').then(function(j){ if(j&&j.ok){ IE._imgAdjust=j.imgAdjust||{}; IE._overlayFx=j.overlayFx||{}; regrade(); } }).catch(function(){}); observe(); scheduleInject(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,800); });
  else setTimeout(boot,800);
})();
/* ================= ROOMSCAPE AUTO THUMBNAILS (app) 2026-07-14 =================
   RS-AUTO-THUMBS  (v3.3 — composites each mode from its OWN profile; also
   auto-rebuilds a mode's tile the instant you hit Save in Design)
   Builds a mode's card thumbnail from that mode's frame scenes (resolved via
   /api/scenes), NOT by screenshotting the live wall (which doesn't switch when
   you select a card, so every capture came out identical). Deterministic,
   correct per mode, and it never disturbs the editor or the TVs.
   Controls live in Settings -> Setup ("Library & previews"). No header buttons.
   Appended to app.js; window/DOM globals + fetch only. */
;(function(){
  if (window.__rsAutoThumbs) return; window.__rsAutoThumbs = true;
  var RS = window.__rsThumbs = { posters:{}, loaded:false, profiles:null, byKey:null };

  /* ---------- scene / profile index ---------- */
  function getJSON(u){ return fetch(u).then(function(r){return r.json();}); }
  var idxProm=null;
  function ensureIndex(force){
    if(idxProm && !force) return idxProm;
    idxProm = Promise.all([ getJSON('/api/profiles'), getJSON('/api/scenes') ]).then(function(res){
      var pr=res[0], sc=res[1];
      RS.profiles = (pr && (pr.profiles||pr)) || {};
      var list = Array.isArray(sc)?sc:((sc&&(sc.scenes||sc.items))||[]);
      var byKey={}; list.forEach(function(s){ if(s && s.key) byKey[s.key]=s; });
      RS.byKey = byKey;
      return true;
    }).catch(function(){ return false; });
    return idxProm;
  }
  function sceneImage(key){
    var s = RS.byKey && RS.byKey[key];
    if(!s && RS.byKey && key){   /* v2.65: legacy-key fallback (pre file-per-card base keys) */
      var ks = Object.keys(RS.byKey), i;
      for(i=0;i<ks.length;i++){ if(ks[i].lastIndexOf(key,0)===0){ s=RS.byKey[ks[i]]; break; } }
      if(!s) for(i=0;i<ks.length;i++){ if(ks[i].indexOf(key)>=0 || key.indexOf(ks[i])>=0){ s=RS.byKey[ks[i]]; break; } }
    }
    if(!s) return null;
    var url = s.sample || s.thumb || '';
    if(url && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) url = s.thumb || url;  // video -> poster
    return url || null;
  }
  /* v2.64: the tile composes the FIRST WALL's frames — count from the conductor layout */
  function firstWallN(){
    var L=window.__rsLayout;
    if(L&&L.walls){ var k=Object.keys(L.walls)[0]; if(k&&L.walls[k].length) return L.walls[k].length; }
    return 3;
  }
  function modeFrameKeys(p){
    var frames = p.frames||[], fs = p.frameScenes||[], out=[];
    for(var i=0;i<firstWallN();i++){
      var kind = frames[i];
      if(kind!=='pano' && kind!=='portrait' && kind!=='photos'){ out.push(null); continue; }
      var key = (fs[i] && fs[i]!=='') ? fs[i] : p.scene;
      out.push(key||null);
    }
    return out;
  }

  /* ---------- compositor (image-based) ---------- */
  function loadImg(u){ return new Promise(function(res){ if(!u) return res(null); var im=new Image(); im.crossOrigin='anonymous'; im.onload=function(){res(im);}; im.onerror=function(){res(null);}; im.src=u; }); }
  function drawCover(g,img,dx,dy,dw,dh,sx,sy,sw,sh){
    var iw=sw||img.naturalWidth, ih=sh||img.naturalHeight, ox=sx||0, oy=sy||0;
    var s=Math.max(dw/iw, dh/ih), cw=dw/s, chh=dh/s;
    var cx=ox+(iw-cw)/2, cy=oy+(ih-chh)/2;
    g.drawImage(img, cx, cy, cw, chh, dx, dy, dw, dh);
  }
  async function composeMode(p){
    if(!p) return null;
    var keys = modeFrameKeys(p);
    var urls = keys.map(sceneImage);
    if(!urls.some(Boolean)) return null;                 // nothing to show
    var imgs = await Promise.all(urls.map(loadImg));
    if(!imgs.some(Boolean)) return null;
    var n=Math.max(1,keys.length);   /* v2.64: one column per first-wall frame */
    var cw=170, ch=302, gap=6, W=cw*n+gap*(n-1), H=ch;
    var c=document.createElement('canvas'); c.width=W; c.height=H;
    var g=c.getContext('2d'); g.fillStyle='#0a0a0a'; g.fillRect(0,0,W,H);
    // one pano shared across the wall -> slice it into n; otherwise draw each
    var samePano = imgs[0] && urls.every(function(u){ return u && u===urls[0]; });
    for(var i=0;i<n;i++){
      var dx=i*(cw+gap);
      if(samePano){ var img=imgs[0], sw=img.naturalWidth/n; drawCover(g,img,dx,0,cw,ch, i*sw,0,sw,img.naturalHeight); }
      else if(imgs[i]) drawCover(g,imgs[i],dx,0,cw,ch);
    }
    var url=''; try{ url=c.toDataURL('image/jpeg',0.74); }catch(e){ return null; }
    return url.length<1200 ? null : url;
  }

  /* ---------- store + card painting ---------- */
  function api(p, body){ return fetch(p, body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined).then(function(r){return r.json();}); }
  function loadPosters(){ return api('/api/modeposters').then(function(j){ RS.posters=(j&&j.posters)||{}; RS.loaded=true; paintCards(); }).catch(function(){}); }
  // NB: Play page uses .pcard, the Design top strip uses .scard — must paint BOTH
  function cardEls(){ return [].slice.call(document.querySelectorAll('.pcard[data-id], .scard[data-id]')); }
  function paintCards(){
    cardEls().forEach(function(c){
      var id=c.dataset.id, bg=c.style.backgroundImage||'';
      if (bg && bg.indexOf('data:')<0 && !c.dataset.rsbase) c.dataset.rsbase = bg;
      var poster=RS.posters[id];
      if (poster){
        // re-apply if not applied, OR if the app has since reset the tile to a non-data background
        if (c.dataset.rsposter!==id || (c.style.backgroundImage||'').indexOf('data:')<0){ c.style.backgroundImage='url("'+poster+'")'; c.dataset.rsposter=id; c.classList.add('rs-autothumb'); }
      } else if (c.dataset.rsposter){
        if (c.dataset.rsbase) c.style.backgroundImage=c.dataset.rsbase;
        delete c.dataset.rsposter; c.classList.remove('rs-autothumb');
      }
    });
  }
  var pTimer=null;
  var obs=new MutationObserver(function(){ clearTimeout(pTimer); pTimer=setTimeout(function(){ paintCards(); injectSettings(); }, 120); });
  function observe(){ obs.observe(document.body,{childList:true,subtree:true}); }

  function idByName(name){ if(!name) return null; var m=cardEls().find(function(c){ var nm=c.querySelector('.nm'); return nm && nm.textContent.trim()===name; }); return m?m.dataset.id:null; }
  function currentModeId(){
    // Design strip and Play grid both mark the active tile with .sel
    var sel=document.querySelector('.scard.sel[data-id], .pcard.sel[data-id], .pcard.live[data-id], .pcard.on[data-id], .pcard.cur[data-id]');
    if(sel) return sel.dataset.id;
    var hn=[].slice.call(document.querySelectorAll('.nm')).find(function(n){ return !n.closest('.pcard') && !n.closest('.scard') && (n.textContent||'').trim(); });
    return idByName(hn?hn.textContent.trim():'');
  }

  /* ---------- banner ---------- */
  function banner(msg, kind){
    var b=document.getElementById('rs-thumb-banner');
    /* v2.64: final ok/err messages route through the ONE core toast; the sticky
       progress banner (no kind) stays — toast() auto-hides too fast for progress. */
    if(kind && window.__rsToast){ if(b) b.style.display='none'; window.__rsToast(msg); return b; }
    if(!b){ b=document.createElement('div'); b.id='rs-thumb-banner';
      b.style.cssText='position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:100000;padding:9px 16px;border-radius:12px;font:600 13px system-ui;letter-spacing:.02em;box-shadow:0 8px 30px rgba(0,0,0,.5);border:1px solid #3a3f4a;';
      document.body.appendChild(b); }
    b.style.background = kind==='err'?'#4a2320':(kind==='ok'?'#1f3a29':'#20242c');
    b.style.color = kind==='err'?'#ffb4a6':(kind==='ok'?'#9ff5c1':'#e6e9ef');
    b.textContent=msg; b.style.display='block';
    if(kind){ clearTimeout(b._t); b._t=setTimeout(function(){ b.style.display='none'; }, 3000); }
    return b;
  }

  // Rebuild + persist one mode's poster from its current (freshly-read) profile.
  // Shared by "Capture this mode" and the auto-on-save hook. Returns true on success.
  async function regenMode(id){
    if(!id) return false;
    var ok=await ensureIndex(true); if(!ok || !RS.profiles[id]) return false;   // force: pick up the just-saved profile
    var url=await composeMode(RS.profiles[id]); if(!url) return false;
    RS.posters[id]=url;
    cardEls().forEach(function(c){ if(c.dataset.id===id) delete c.dataset.rsposter; }); paintCards();
    var j=await api('/api/modeposters',{id:id,data:url}).catch(function(){return null;});
    return !!(j&&j.ok);
  }

  async function captureThis(){
    var id=currentModeId(); if(!id){ banner('Open a mode first.','err'); return; }
    banner('Building preview for "'+id+'"...');
    var okc=await regenMode(id);
    if(okc) banner('Thumbnail updated for "'+id+'".','ok');
    else banner('This mode has no scene images to preview (or save failed).','err');
  }

  /* ---------- auto-regenerate this mode's tile whenever Design is saved ---------- */
  function selectedModeId(){
    var el=document.querySelector('.scard.sel[data-id], .pcard.sel[data-id]');
    return el?el.dataset.id:currentModeId();
  }
  var __saveArmed=0;
  function hookSave(){
    // Only a real Save/Save-as click arms the regen; preview pushes to /api/profiles are ignored.
    document.addEventListener('click', function(e){
      var t=e.target && e.target.closest && e.target.closest('#save, #saveas');
      if(t) __saveArmed=Date.now();
    }, true);
    var _f=window.fetch;
    if(_f && _f.__rsThumbHook) return;
    var wrapped=function(input, init){
      var url=(typeof input==='string')?input:((input&&input.url)||'');
      var method=((init&&init.method)||(input&&input.method)||'GET').toString().toUpperCase();
      var isSave=/\/api\/profiles(\b|\?|$)/.test(url) && method==='POST';
      var pr=_f.apply(this, arguments);
      if(isSave && __saveArmed && (Date.now()-__saveArmed)<8000){
        __saveArmed=0;
        var idAtClick=selectedModeId();
        pr.then(function(r){
          if(r && r.ok===false) return;                       // save itself failed
          setTimeout(function(){ regenMode(selectedModeId()||idAtClick).catch(function(){}); }, 300);
        }).catch(function(){});
      }
      return pr;
    };
    wrapped.__rsThumbHook=true;
    try{ window.fetch=wrapped; }catch(e){}
  }

  async function fillLookalikes(){
    banner('Reading library...');
    var ok=await ensureIndex(); if(!ok){ banner('Could not read the library.','err'); return; }
    var cards=cardEls().filter(function(c,i,a){ return a.findIndex(function(x){return x.dataset.id===c.dataset.id;})===i; });
    var groups={};
    // group by the app's BASE thumbnail (works even for modes that already have
    // an auto-poster, so re-running refreshes previously-generated tiles too)
    cards.forEach(function(c){ var b=c.dataset.rsbase; if(!b){ var cur=c.style.backgroundImage||''; if(cur.indexOf('data:')<0) b=cur; } if(!b||b.indexOf('data:')>=0) return; (groups[b]=groups[b]||[]).push(c.dataset.id); });
    var targets=[]; Object.keys(groups).forEach(function(k){ if(groups[k].length>=2) targets=targets.concat(groups[k]); });
    targets=targets.filter(function(v,i,a){return a.indexOf(v)===i;});
    if(!targets.length){ banner('No look-alike tiles to fill.','ok'); return; }
    var bulk={}, done=0, fail=0;
    for(var i=0;i<targets.length;i++){
      var id=targets[i]; banner('Building previews... '+(i+1)+' / '+targets.length);
      var url = RS.profiles[id] ? await composeMode(RS.profiles[id]) : null;
      if(url){ bulk[id]=url; RS.posters[id]=url; done++; } else { fail++; }
    }
    if(Object.keys(bulk).length){ await api('/api/modeposters',{bulk:bulk}).catch(function(){}); }
    cardEls().forEach(function(c){ delete c.dataset.rsposter; }); paintCards();
    banner('Done — '+done+' preview'+(done===1?'':'s')+' built'+(fail?(' ('+fail+' skipped)'):'')+'.','ok');
  }

  async function rebuildAll(){
    banner('Reading library...');
    var ok=await ensureIndex(); if(!ok){ banner('Could not read the library.','err'); return; }
    var ids=Object.keys(RS.posters); if(!ids.length){ banner('No auto thumbnails to rebuild yet.','ok'); return; }
    var bulk={}, done=0, fail=0;
    for(var i=0;i<ids.length;i++){
      var id=ids[i]; banner('Rebuilding... '+(i+1)+' / '+ids.length);
      var url = RS.profiles[id] ? await composeMode(RS.profiles[id]) : null;
      if(url){ bulk[id]=url; RS.posters[id]=url; done++; } else { fail++; }
    }
    if(Object.keys(bulk).length){ await api('/api/modeposters',{bulk:bulk}).catch(function(){}); }
    cardEls().forEach(function(c){ delete c.dataset.rsposter; }); paintCards();
    banner('Rebuilt '+done+' auto thumbnail'+(done===1?'':'s')+(fail?(' ('+fail+' skipped)'):'')+'.','ok');
  }

  async function removeThis(){
    var id=currentModeId(); if(!id){ banner('Open a mode first.','err'); return; }
    if(!RS.posters[id]){ banner('"'+id+'" has no auto thumbnail.','ok'); return; }
    await api('/api/modeposters',{id:id,data:''}).catch(function(){});
    delete RS.posters[id]; paintCards(); banner('Auto thumbnail removed for "'+id+'".','ok');
  }

  function doRefresh(){
    banner('Refreshing library...');
    var p = (typeof window.__rsRefresh==='function') ? window.__rsRefresh() : api('/api/rescan',{});
    Promise.resolve(p).then(function(){ ensureIndex(true); banner('Library refreshed.','ok'); }).catch(function(){ banner('Refresh failed.','err'); });
  }

  /* ---------- Settings injection (Setup tab) ---------- */
  function mkBtn(label, fn){ var b=document.createElement('button'); b.type='button'; b.className='btn sm'; b.textContent=label; b.style.marginRight='8px'; b.style.marginTop='6px'; b.onclick=fn; return b; }
  function injectSettings(){
    var setup=document.querySelector('#scrim .setsec[data-sec="setup"], .setsec[data-sec="setup"]');
    if(!setup || document.getElementById('rs-lib-card')) return;
    var card=document.createElement('div'); card.className='card'; card.id='rs-lib-card';
    var title=document.createElement('div'); title.className='zt'; title.textContent='Library & previews'; card.appendChild(title);
    var d1=document.createElement('div'); d1.style.cssText='opacity:.7;font-size:12px;margin:2px 0 6px';
    d1.textContent='Rescan the media folder and refresh the in-app scene / video / overlay lists.';
    card.appendChild(d1); card.appendChild(mkBtn('Refresh library', doRefresh));
    var hr=document.createElement('div'); hr.style.cssText='height:1px;background:#2a2f3a;margin:14px 0 10px'; card.appendChild(hr);
    var d2=document.createElement('div'); d2.style.cssText='opacity:.7;font-size:12px;margin:2px 0 6px';
    d2.textContent='Auto thumbnails build each mode’s tile from its own frame scenes, and rebuild automatically whenever you hit Save in Design. "Fill look-alikes" does every mode that still shares a placeholder tile, leaving your custom box-art tiles alone.';
    card.appendChild(d2);
    card.appendChild(mkBtn('Capture this mode', captureThis));
    card.appendChild(mkBtn('Fill in look-alike tiles', fillLookalikes));
    card.appendChild(mkBtn('Rebuild all auto thumbnails', rebuildAll));
    card.appendChild(mkBtn('Remove this mode’s thumbnail', removeThis));
    setup.appendChild(card);
  }

  /* ---------- hide old header buttons ---------- */
  function hideHeaderButtons(){
    try{
      var old=document.getElementById('rs-thumb-btn'); if(old) old.style.display='none';
      if(window.__rsRefreshBtn && window.__rsRefreshBtn.style) window.__rsRefreshBtn.style.display='none';
      [].slice.call(document.querySelectorAll('button,div')).forEach(function(e){ var t=(e.textContent||'').trim(); if(e.id!=='rs-refresh-lib-btn' && !e.closest('#rs-lib-card') && /Refresh library/.test(t) && t.length<24 && e.offsetWidth) e.style.display='none'; });
    }catch(e){}
  }

  function boot(){ hideHeaderButtons(); observe(); loadPosters(); ensureIndex(); injectSettings(); hookSave(); setTimeout(hideHeaderButtons,1200);
    // safety net: the Design strip repaints tiles via style changes (which the
    // childList observer doesn't catch), so re-assert posters on a light timer.
    window.__rsTick.every(1000, paintCards);   /* v2.64: shared scheduler */
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,700); });
  else setTimeout(boot,700);
})();
/* ================= ROOMSCAPE RULES TAB (2026-07-18 v2.2) =================
   RS-RULES-TAB  (drives the REAL Rules Wall — /api/rules + /api/rules/show)
   v2.2: 🔊 tutorial-video sound control — the wall's YouTube embed was
   hard-muted (mute=1). While rules are live, the panel now shows
   Sound: Off · L2 · R2 · Both, driving POST /api/rules/sound (RULES SOUND
   conductor block); the centre-screen embeds re-render unmuted on the chosen
   TV(s). One TV (L2) is the default — six unsynced copies would echo.
   v2.1: removed the MutationObserver + guarded all chip mutations (the v2
   observer + textContent-every-tick caused an infinite loop / page freeze).
   When the LIVE mode matches a game in rules-data.json (by name, e.g. the
   "Catan" mode -> the "catanisland" rules record whose name is "Catan"), a
   prominent gold "Rules" tab appears in the now-bar, to the RIGHT of that
   game's phase chips. Tapping it opens a quick panel to SHOW the rules on the
   TVs (side screens = Setup / Your Turn / Winning / Table Tips, centre screens
   = the quickstart video) or HIDE them. One tap, whole wall.

   Endpoints (revived by the RULES REVIVE conductor add-on):
     GET  /api/rules              -> { ok, games:{ <id>:{name,setup,turn,win,tips,videoId,pdfUrl,players,time} } }
     GET  /api/rules/state        -> { ok, show, game, videoId, name, ts }
     POST /api/rules/show {game}  -> show that game's rules on the wall
     POST /api/rules/show {off:1} -> hide
   Appended to app.js; window/DOM/fetch only. */
;(function () {
  if (window.__rsRulesTab) return; window.__rsRulesTab = true;

  var GOLD = 'var(--gold)', GOLD2 = '#ffe6a8';   /* v2.44 (QW15): app palette, was #c9a24a */
  var games = {}, byName = {}, loaded = false;
  var liveState = { show: false, game: null };
  /* Phase 2c: the tutorial-video TVs are the layout's centers role (L2/R2 on the
     reference wall); the sound picker builds its segments from them. */
  function rsCenters(){ var L = window.__rsLayout, c = L && L.roles && L.roles.centers; return (c && c.length) ? c : ['L2', 'R2']; }

  function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function getJSON(u) { return fetch(u).then(function (r) { return r.json(); }); }
  function post(u, body) { return fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then(function (r) { return r.json().catch(function () { return {}; }); }); }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function loadRules() {
    return getJSON('/api/rules').then(function (d) {
      games = (d && d.games) || {};
      byName = {};
      Object.keys(games).forEach(function (k) { var g = games[k] || {}; byName[norm(g.name || k)] = k; byName[norm(k)] = byName[norm(k)] || k; });
      loaded = true; return games;
    }).catch(function () { loaded = true; return games; });
  }
  function refreshState() {
    return getJSON('/api/rules/state').then(function (s) { if (s && s.ok !== false) liveState = { show: !!s.show, game: s.game || null, sound: s.sound || { on: false, frame: rsCenters()[0] } }; return liveState; }).catch(function () { return liveState; });   /* Phase 2c */
  }
  function liveModeName() {
    var nm = document.getElementById('nowname');
    if (nm && (nm.textContent || '').trim()) return nm.textContent.trim();
    var base = document.querySelector('#phaserail .pdot[data-phz=""]');
    if (base) return (base.textContent || '').replace(/^[^A-Za-z0-9]+/, '').trim();
    return '';
  }
  function matchKey(modeName) { var n = norm(modeName); if (!n) return null; return byName[n] || (games[n] ? n : null); }

  /* ============================= panel ============================= */
  function closePanel() { var p = document.getElementById('rs-rules-panel'); if (p) { if (p.__poll) p.__poll.stop(); p.remove(); } var s = document.getElementById('rs-rules-scrim'); if (s) s.remove(); }   /* v2.64: __rsTick handle */
  function openPanel() {
    if (document.getElementById('rs-rules-panel')) return;
    var mode = liveModeName();
    var key = matchKey(mode);
    var rec = key ? games[key] : null;

    var scrim = document.createElement('div'); scrim.id = 'rs-rules-scrim';
    scrim.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,10,.55);z-index:100000;';
    scrim.onclick = closePanel;
    var p = document.createElement('div'); p.id = 'rs-rules-panel';
    p.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:100001;'
      + 'width:min(560px,94vw);background:#14161c;border:1px solid #2c2f37;border-radius:16px;'
      + 'box-shadow:0 24px 70px rgba(0,0,0,.6);padding:16px 18px 18px;font:400 14px system-ui;color:#e6e9ef;';
    p.onclick = function (e) { e.stopPropagation(); };

    function h() {
      var showingThis = liveState.show && liveState.game === key;
      var html = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
        + '<div style="font:700 17px system-ui;color:' + GOLD2 + '">🃏 Rules — ' + esc(mode || '—') + '</div>'
        + '<div style="flex:1"></div>'
        + '<button id="rsr-x" style="border:1px solid #2c2f37;background:#1b1d24;color:#cfd3da;border-radius:9px;padding:5px 10px;cursor:pointer">Close</button>'
        + '</div>';
      if (!rec) {
        html += '<div style="opacity:.8;line-height:1.5">No rules on file for this mode yet. Add an entry named to match it in <b>rules-data.json</b>, then it will appear here.</div>';
        return html;
      }
      var meta = [rec.players ? ('👥 ' + esc(rec.players)) : '', rec.time ? ('⏱ ' + esc(rec.time)) : ''].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;');
      html += '<div style="background:#0f1116;border:1px solid #23262e;border-radius:11px;padding:11px 13px;margin-bottom:14px">'
        + (meta ? '<div style="font-size:12.5px;opacity:.8;margin-bottom:7px">' + meta + '</div>' : '')
        + '<div style="font-size:12.5px;opacity:.72;line-height:1.55">Shows across your TVs:<br>'
        + '<b style="color:' + GOLD2 + '">Setup</b> · <b style="color:' + GOLD2 + '">Your&nbsp;Turn</b> · <b style="color:' + GOLD2 + '">Winning</b> · <b style="color:' + GOLD2 + '">Table&nbsp;Tips</b>'
        + (rec.videoId ? '<br>＋ quickstart <b style="color:' + GOLD2 + '">video</b> on the centre screens' : '')
        + '</div></div>';

      if (showingThis && rec.videoId) {
        var snd = liveState.sound || { on: false, frame: rsCenters()[0] };
        var cur = snd.on ? (snd.frame || rsCenters()[0]) : 'off';
        var segs = [['off', '🔇 Off']].concat(rsCenters().map(function (f) { return [f, f]; })).concat([['both', 'Both']]);   /* Phase 2c: centers role, labels = real ids */
        html += '<div style="display:flex;gap:7px;align-items:center;margin-bottom:12px">'
          + '<span style="font-size:12.5px;opacity:.75">🔊 Tutorial sound</span>'
          + segs.map(function (s2) {
              var on = cur === s2[0];
              return '<button data-rsnd="' + s2[0] + '" style="padding:5px 12px;border-radius:9px;cursor:pointer;font:700 12px system-ui;'
                + 'border:1px solid ' + (on ? GOLD : '#2c2f37') + ';background:' + (on ? GOLD : '#1b1d24') + ';color:' + (on ? '#161616' : '#cfd3da') + ';">' + s2[1] + '</button>';
            }).join('')
          + '<span style="font-size:11px;opacity:.45">one TV avoids echo</span></div>';
      }
      html += '<div style="display:flex;gap:9px;align-items:center">';
      if (showingThis) {
        html += '<div style="flex:1;font-size:12.5px;color:#9ff5c1">● Live on the wall now</div>'
          + '<button id="rsr-hide" style="' + btnCss('#5a2620', '#ffb4a6') + '">■ Hide rules</button>';
      } else {
        html += '<div style="flex:1;font-size:12.5px;opacity:.6">' + (liveState.show ? 'Another game’s rules are showing' : 'Ready') + '</div>'
          + '<button id="rsr-show" style="' + btnCss(GOLD, '#161616') + '">▶ Show rules on the TVs</button>';
      }
      html += '</div>';
      if (rec.pdfUrl) html += '<div style="margin-top:12px"><a href="' + esc(rec.pdfUrl) + '" target="_blank" rel="noopener" style="color:#9fd6ff;font-size:12.5px;text-decoration:none">📄 Full rulebook (PDF)</a></div>';
      return html;
    }
    function wire() {
      var x = document.getElementById('rsr-x'); if (x) x.onclick = closePanel;
      var sh = document.getElementById('rsr-show'); if (sh) sh.onclick = function () { post('/api/rules/show', { game: key }).then(function () { liveState = { show: true, game: key }; setTimeout(draw, 250); }); };
      var hd = document.getElementById('rsr-hide'); if (hd) hd.onclick = function () { post('/api/rules/show', { off: true }).then(function () { liveState = { show: false, game: null }; setTimeout(draw, 250); }); };
      [].slice.call(document.querySelectorAll('#rs-rules-panel [data-rsnd]')).forEach(function (sb) {
        sb.onclick = function () {
          var v = sb.dataset.rsnd;
          post('/api/rules/sound', v === 'off' ? { on: false } : { on: true, frame: v })
            .then(function () { return refreshState(); }).then(function () { draw(); });
        };
      });
    }
    function draw() { p.innerHTML = h(); wire(); }

    document.body.appendChild(scrim); document.body.appendChild(p); draw();
    p.__poll = window.__rsTick.every(2000, function () { if (!document.getElementById('rs-rules-panel')) { p.__poll.stop(); return; } refreshState().then(draw); });   /* v2.64 */
  }
  function btnCss(bg, fg) {
    return 'padding:9px 16px;border-radius:11px;cursor:pointer;font:700 13.5px system-ui;'
      + 'border:1px solid ' + (bg || '#2c2f37') + ';background:' + (bg || '#1b1d24') + ';color:' + (fg || '#e6e9ef') + ';';
  }

  /* ============================= the tab chip ============================= */
  function mkChip() {
    var b = document.createElement('button'); b.id = 'rs-rules-chip'; b.type = 'button';
    b.title = 'Show this game’s rules on the TVs';
    b.onclick = function (e) { e.stopPropagation(); e.preventDefault(); openPanel(); };
    return b;
  }
  function styleChip(b, live) {
    // NB: only mutate when the value actually changes. Setting textContent/style
    // unconditionally every tick is a DOM mutation, which (with any subtree
    // observer) can spin into an infinite loop. Guard everything.
    var label = live ? '🃏 Rules · on' : '🃏 Rules';
    if (b.textContent !== label) b.textContent = label;
    var css = 'display:inline-flex;align-items:center;gap:6px;margin-left:8px;'
      + 'padding:6px 13px;border-radius:999px;cursor:pointer;white-space:nowrap;'
      + 'font:800 12.5px system-ui;letter-spacing:.02em;border:1px solid ' + GOLD + ';'
      + 'background:' + (live ? 'linear-gradient(180deg,#3a2f12,#2a2411)' : 'linear-gradient(180deg,#2a2b31,#1b1d24)') + ';'
      + 'color:' + GOLD2 + ';box-shadow:0 2px 10px rgba(201,162,74,' + (live ? '.45' : '.22') + ');';
    if (b.__css !== css) { b.style.cssText = css; b.__css = css; }
  }
  function place() {
    if (!loaded) return;
    var mode = liveModeName();
    var key = matchKey(mode);
    var existing = document.getElementById('rs-rules-chip');
    if (!key) { if (existing) existing.remove(); return; }
    var live = liveState.show && liveState.game === key;
    var rail = document.getElementById('phaserail');
    if (rail && rail.classList.contains('show') && rail.offsetParent !== null) {
      var chip = existing || mkChip();
      if (chip.parentElement !== rail || rail.lastElementChild !== chip) rail.appendChild(chip);
      styleChip(chip, live); return;
    }
    var now = document.getElementById('now');
    if (now) {
      var chip2 = existing || mkChip();
      var anchor = document.getElementById('phaserail') || now.children[2] || null;
      if (anchor && anchor.parentElement === now) { if (anchor.nextSibling !== chip2) now.insertBefore(chip2, anchor.nextSibling); }
      else if (chip2.parentElement !== now) now.appendChild(chip2);
      styleChip(chip2, live);
    }
  }

  /* ============================= boot ============================= */
  function tick() { try { place(); } catch (e) {} }
  function boot() {
    // A plain timer is enough to keep the chip in place; NO MutationObserver
    // (an observer on the now-bar subtree + our own chip mutations = infinite loop).
    Promise.all([loadRules(), refreshState()]).then(tick);
    window.__rsTick.every(800, tick);                                 /* v2.64: shared scheduler ×3 */
    window.__rsTick.every(4000, function () { refreshState(); });
    window.__rsTick.every(60000, function () { loadRules(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 700); });
  else setTimeout(boot, 700);

  window.__rsRules = { reload: function () { return Promise.all([loadRules(), refreshState()]).then(tick); }, open: openPanel };
})();

/* ================= ROOMSCAPE ROOM SELECTOR (2026-07-18) =================
   RS-ROOM-SELECTOR v1
   Room pills in the top bar (next to Play/Design). Pick a room and both the
   Play grid and the Design strip show ONLY that room's modes:
     • Main wall (this room)  -> modes with no room tag (or room 'dining')
     • Playroom / Master ...  -> modes tagged with that room id
   Untagged main-wall view no longer shows the play-room's hidden modes, so
   the Design strip stops being a wall of "hidden" tiles. Choice persists
   (localStorage). Pure UI filter — nothing is changed in any profile.
   Appended to app.js. */
;(function(){
  if (window.__rsRoomSel) return; window.__rsRoomSel = true;
  var LSKEY='rsRoomSel';
  var rooms=[], profiles={}, sel='main', loaded=false;
  try{ sel=localStorage.getItem(LSKEY)||'main'; }catch(e){}

  function jget(u){ return fetch(u).then(function(r){ return r.json(); }); }
  function load(){
    return Promise.all([ jget('/api/rooms').catch(function(){return {};}), jget('/api/profiles').catch(function(){return {};}) ]).then(function(rs){
      rooms=((rs[0]&&rs[0].rooms)||[]).slice();
      profiles=(rs[1]&&(rs[1].profiles||rs[1]))||{};
      loaded=true; paintPills(); apply();
    });
  }
  function rsAtRest(){ return (window.__rsLayout && window.__rsLayout.atRest) || 'dining'; }   /* Phase 2c */
  function roomOf(id){
    var p=profiles[id]||{};
    var r=p.room==null?'':String(p.room);
    if(!r||r===rsAtRest()) return 'main';             // untagged + at-rest-tagged = the main wall (Phase 2c: was 'dining')
    return r;
  }
  function matches(id){ return roomOf(id)===sel; }

  function pillCss(on){
    return 'display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:999px;cursor:pointer;'
      +'font:600 12px system-ui;white-space:nowrap;margin-left:6px;'
      +'border:1px solid '+(on?'var(--gold)':'#2c2f37')+';'
      +'background:'+(on?'#2a2b31':'#16171c')+';color:'+(on?'#ffe6a8':'#9aa0ab')+';';
  }
  function paintPills(){
    var bar=document.getElementById('rs-room-pills'); if(!bar) return;
    bar.innerHTML='';
    var list=[{id:'main', name:'This room', icon:'🖼'}];
    rooms.forEach(function(r){ if(r&&r.id&&r.id!==rsAtRest()) list.push({id:r.id, name:r.name||r.id, icon:r.icon||'🏠'}); });   /* Phase 2c: the at-rest-id room IS the main wall pill */
    list.forEach(function(r){
      var b=document.createElement('span'); b.style.cssText=pillCss(sel===r.id);
      b.textContent=r.icon+' '+r.name;
      b.onclick=function(){ sel=r.id; try{ localStorage.setItem(LSKEY,sel); }catch(e){} paintPills(); apply(); };
      bar.appendChild(b);
    });
  }
  function ensureBar(){
    if(document.getElementById('rs-room-pills')) return;
    var spaces=document.getElementById('spaces');
    if(!spaces||!spaces.parentElement) return;
    var bar=document.createElement('span'); bar.id='rs-room-pills';
    bar.style.cssText='display:inline-flex;align-items:center;margin-left:14px;';
    spaces.parentElement.insertBefore(bar, spaces.nextSibling);
    paintPills();
  }
  function apply(){
    if(!loaded) return;
    [].slice.call(document.querySelectorAll('.scard[data-id], .pcard[data-id]')).forEach(function(c){
      var id=c.dataset.id; if(!id) return;
      var show=matches(id);
      if(show){ if(c.dataset.rsRoomHid){ c.style.display=c.dataset.rsRoomDisp||''; delete c.dataset.rsRoomHid; } }
      else { if(!c.dataset.rsRoomHid){ c.dataset.rsRoomDisp=c.style.display||''; c.dataset.rsRoomHid='1'; } c.style.display='none'; }
    });
  }
  function tick(){ try{ ensureBar(); apply(); }catch(e){} }
  load();
  window.__rsTick.every(1200, tick);            /* v2.64: shared scheduler */
  window.__rsTick.every(60000, load);           // pick up new modes / room edits
  setTimeout(tick, 1200);
})();
/* ================= ROOMSCAPE REVEAL ICON (2026-07-18) =================
   RS-REVEAL-ICON v1.1 (hides while a sheet/modal is open)
   A small folder icon on each frame preview in Design. Clicking it opens the
   artwork currently shown in that frame in Windows Explorer (file selected),
   via the per-user rsreveal: protocol handler the installer registers. The
   full path is also copied to the clipboard. Hover shows the filename.
   Appended to app.js. */
;(function(){
  if (window.__rsRevealIcon) return; window.__rsRevealIcon = true;

  function mediaRelOf(host){
    // find the /media/<encoded-rel> URL of whatever this preview shows
    var els=[host].concat([].slice.call(host.querySelectorAll('*')));
    for(var i=0;i<els.length;i++){
      var e=els[i], u='';
      if(e.tagName==='VIDEO') u=(e.querySelector('source')||{}).src||e.src||'';
      else if(e.tagName==='IMG') u=e.src||'';
      else { var bg=(e.style&&e.style.backgroundImage)||''; var m=bg.match(/url\(["']?([^"')]+)/); u=m?m[1]:''; }
      if(u && u.indexOf('/media/')>=0){
        try{ return decodeURIComponent(u.split('/media/')[1].split('?')[0]); }catch(err){ return null; }
      }
    }
    return null;
  }
  function b64url(s){
    try{ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }catch(e){ return null; }
  }
  function mkIcon(i){
    var b=document.createElement('div'); b.className='rs-reveal-ic'; b.dataset.f=i;
    b.textContent='📂';
    b.style.cssText='position:absolute;top:26px;right:6px;z-index:60;padding:2px 6px;border-radius:8px;'
      +'background:rgba(10,11,15,.82);border:1px solid #3a3f4a;font:600 12px system-ui;cursor:pointer;opacity:.8;';
    b.onmouseenter=function(){ b.style.opacity='1';
      var host=b.parentElement, rel=host?mediaRelOf(host):null;
      b.title=rel?('Open in Explorer:\n'+rel.split('/').pop()):'No file to reveal';
    };
    b.onmouseleave=function(){ b.style.opacity='.8'; };
    b.onclick=function(e){
      e.stopPropagation(); e.preventDefault();
      var host=b.parentElement, rel=host?mediaRelOf(host):null;
      if(!rel){ b.title='No file to reveal'; return; }
      var enc=b64url(rel); if(!enc) return;
      // fire the protocol without navigating the app
      var f=document.createElement('iframe'); f.style.display='none';
      f.src='rsreveal:'+enc;
      document.body.appendChild(f);
      setTimeout(function(){ try{ f.remove(); }catch(err){} }, 2000);
    };
    return b;
  }
  function sheetOpen(){
    var s=document.getElementById('sheet');
    if(s && s.offsetParent!==null) return true;
    var sh=document.querySelector('.shead'); return !!(sh && sh.offsetParent!==null);
  }
  function tick(){
    try{
      var icons=[].slice.call(document.querySelectorAll('.rs-reveal-ic'));
      if(sheetOpen()){ icons.forEach(function(e){ e.style.display='none'; }); return; }
      icons.forEach(function(e){ e.style.display=''; });
      var design=document.querySelector('#vdesign');
      if(!design || getComputedStyle(design).display==='none') return;
      var nfr=((window.__rsLayout&&window.__rsLayout.frames)||(IE.FRAME_IDS)).length;   /* v2.64 (Phase 2a: no static literal) */
      var els=[].slice.call(document.querySelectorAll('#vdesign .ie-frame')).slice(0,nfr);
      for(var i=0;i<els.length;i++){
        var host=els[i]; if(!host) continue;
        if(getComputedStyle(host).position==='static') host.style.position='relative';
        if(!host.querySelector('.rs-reveal-ic')) host.appendChild(mkIcon(i));
      }
    }catch(e){}
  }
  window.__rsTick.every(1300, tick);   /* v2.64: shared scheduler */
  setTimeout(tick, 1300);
})();
/* ================= ROOMSCAPE PLAYLIST UI (2026-07-18) =================
   RS-PLAYLIST-UI v2.0 — the predictable frame-content workflow
   v2.0 (app v2.64): the card now edits draft.framePlaylists[idx] through the
   core's normal ed() mutation path (window.__rsDraft bridge — dirty flag,
   preview, phase patches; Save persists via profiles, conductor v2.62). The
   instant POST /api/playlists and its "⚡ Applies immediately" badge are GONE.
   The legacy /api/playlists store is read ONCE per mode as a migration seed:
   if it has a playlist for this frame and the draft slot is empty, it shows as
   the starting value with "from legacy playlist — Save to adopt".
   Select a frame in Design -> a PLAYLIST card appears in the inspector:
   thumbnail chips of the EXACT files this frame shows, + Add media (searchable
   file browser with multi-select and family expand), x to remove, < > to
   reorder, Order (In order/Shuffle) and Change every (Static/30s/1m/5m)
   controls when 2+ items. Frame previews get a badge (n or x/n) whose arrows
   step the ACTUAL preview image (WYSIWYG) and, when Static, set the pin.
   Replaces the retired variant-policy UI. Appended to app.js. */
;(function(){
  if (window.__rsPlaylistUI) return; window.__rsPlaylistUI = true;
  try{ ['rs-var-ui','rs-var-stag2wrap'].forEach(function(id){ var e=document.getElementById(id); if(e) e.remove(); });
       [].slice.call(document.querySelectorAll('.rs-vf-bar,.rs-vf-badge')).forEach(function(e){ e.remove(); }); }catch(e){}

  var game=null, cfg=null, scenes=null, previewIdx={};   // cfg = LEGACY store (read-only seed); previewIdx per frame (session only)
  function jget(u){ return fetch(u).then(function(r){ return r.json(); }); }
  function FR_(){ return (window.__rsLayout&&window.__rsLayout.frames)||(IE.FRAME_IDS); }   /* v2.64 (Phase 2a: no static literal) */
  function curMode(){ var el=document.querySelector('.scard.sel[data-id]'); return el?el.dataset.id:null; }
  function selFrame(){
    var chips=[].slice.call(document.querySelectorAll('#insp button.chip'));
    for(var i=0;i<chips.length;i++){ if(/\bon\b/.test(chips[i].className)){ var t=(chips[i].textContent||'').trim(); var ix=FR_().indexOf(t); if(ix>=0) return ix; } }
    return -1;
  }
  function thumbOf(rel,w){
    var name=String(rel).split('/').pop();
    return '/thumb/'+encodeURIComponent(name)+'?src=media&w='+(w||320)+'&p='+encodeURIComponent(rel);
  }
  function isVid(rel){ return /\.(mp4|webm|mov|m4v|mkv)$/i.test(rel||''); }
  function loadCfg(g,cb){ jget('/api/playlists?game='+encodeURIComponent(g)).then(function(j){ if(j&&j.ok){ cfg=j.cfg; if(cb)cb(); } }).catch(function(){}); }
  /* ---- v2.64 draft model ---- */
  function defFP(){ return {items:[],order:'seq',intervalS:60,pinIdx:0}; }
  function draftFP(fi){ var d=window.__rsDraft&&window.__rsDraft.get(); if(!d) return null; return (d.framePlaylists&&d.framePlaylists[fi])||null; }
  function legacyFP(fi){ var c=cfg&&cfg.frames&&cfg.frames[fi]; return (c&&c.items&&c.items.length)?c:null; }
  function effFP(fi){ return draftFP(fi)||legacyFP(fi)||defFP(); }              // what the card & badges show
  function isLegacySeed(fi){ return !draftFP(fi) && !!legacyFP(fi); }
  function saveFrame(fi,patch,cb){
    /* every edit lands in draft.framePlaylists[fi] via ed() — dirty flag, preview,
       Save-with-the-mode. A legacy playlist seeds the slot on first touch. */
    var D=window.__rsDraft; if(!D||!D.get()){ if(cb)cb(); return; }
    D.ed(function(d){
      var n=FR_().length;
      d.framePlaylists=Array.isArray(d.framePlaylists)?d.framePlaylists.slice(0,n):[];
      while(d.framePlaylists.length<n) d.framePlaylists.push(null);
      var base=d.framePlaylists[fi]||legacyFP(fi)||defFP();
      var c={items:(base.items||[]).slice(),order:base.order||'seq',intervalS:(base.intervalS!=null?base.intervalS:60),pinIdx:base.pinIdx||0};
      Object.keys(patch||{}).forEach(function(k){ c[k]=patch[k]; });
      /* emptied playlist: keep an explicit empty to mask a legacy entry, else clear the slot */
      d.framePlaylists[fi]=c.items.length?c:(legacyFP(fi)?{items:[],order:'seq',intervalS:0,pinIdx:0}:null);
    });
    paintCard(); paintBadges(); if(cb)cb();
  }

  var css='background:#12141a;color:#cfd3da;border:1px solid #2c2f37;border-radius:8px;padding:4px 8px;font:600 11.5px system-ui;cursor:pointer;';
  function seg(opts,val,onpick){
    var w=document.createElement('span'); w.style.cssText='display:inline-flex;border:1px solid #2c2f37;border-radius:9px;overflow:hidden;';
    opts.forEach(function(o){
      var s=document.createElement('span'); s.textContent=o[1];
      s.style.cssText='padding:4px 10px;font:600 11.5px system-ui;cursor:pointer;'+(String(val)===String(o[0])?'background:#2a2b31;color:#ffe6a8;':'color:#9aa0ab;');
      s.onclick=function(){ onpick(o[0]); };
      w.appendChild(s);
    });
    return w;
  }

  /* ---------------- inspector card ---------------- */
  function paintCard(){
    var card=document.getElementById('rs-pl-card'); if(!card) return;
    var fi=parseInt(card.dataset.f,10);
    var c=effFP(fi);   /* v2.64: draft first, legacy store only as the migration seed */
    card.innerHTML='';
    var h=document.createElement('div'); h.textContent='PLAYLIST — WHAT THIS FRAME SHOWS';
    h.style.cssText='font:600 10px system-ui;letter-spacing:.12em;opacity:.55;margin-bottom:4px;';
    card.appendChild(h);
    /* v2.64: part of the draft now — the amber instant-save badge is gone */
    var note=document.createElement('div'); note.textContent='Saved with the mode';
    note.style.cssText='margin:0 0 8px;font:500 9.5px system-ui;letter-spacing:.06em;opacity:.5;';
    card.appendChild(note);
    if(isLegacySeed(fi)){
      var mig=document.createElement('div'); mig.textContent='⤷ from legacy playlist — Save to adopt';
      mig.title='This starting value comes from the old instant-save playlist store. Tap it (or edit anything) to copy it into the mode draft, then Save keeps it with the mode.';
      mig.style.cssText='margin:-4px 0 8px;font:600 9.5px system-ui;color:#ffb86b;cursor:pointer;';
      mig.onclick=function(){ saveFrame(fi,{}); };
      card.appendChild(mig);
    }
    var chips=document.createElement('div'); chips.style.cssText='display:flex;gap:7px;flex-wrap:wrap;align-items:flex-start;';
    c.items.forEach(function(rel,ix){
      var ch=document.createElement('div');
      ch.style.cssText='position:relative;width:56px;height:78px;border-radius:8px;overflow:visible;border:2px solid '+(ix===(previewIdx[fi]!=null?previewIdx[fi]:c.pinIdx)?'var(--gold)':'#2c2f37')+';background:#1b2027 url("'+thumbOf(rel,320)+'") center/cover;';
      ch.title=(ix+1)+'. '+String(rel).split('/').pop();
      if(isVid(rel)){ var v=document.createElement('span'); v.textContent='▶'; v.style.cssText='position:absolute;top:2px;right:4px;font-size:10px;color:#9fd6ff;'; ch.appendChild(v); }
      var x=document.createElement('span'); x.textContent='✕';
      x.style.cssText='position:absolute;top:-7px;right:-7px;width:16px;height:16px;border-radius:50%;background:#2a2b31;border:1px solid #3a3f4a;font:700 9px system-ui;display:flex;align-items:center;justify-content:center;color:#ff9d8f;cursor:pointer;';
      x.onclick=function(e){ e.stopPropagation(); var it=c.items.slice(); it.splice(ix,1); saveFrame(fi,{items:it}); };
      ch.appendChild(x);
      if(ix>0){ var lb=document.createElement('span'); lb.textContent='‹'; lb.style.cssText='position:absolute;bottom:-2px;left:2px;font:700 12px system-ui;color:#9aa0ab;cursor:pointer;'; lb.title='Move earlier';
        lb.onclick=function(e){ e.stopPropagation(); var it=c.items.slice(); var t=it[ix-1]; it[ix-1]=it[ix]; it[ix]=t; saveFrame(fi,{items:it}); }; ch.appendChild(lb); }
      if(ix<c.items.length-1){ var rb=document.createElement('span'); rb.textContent='›'; rb.style.cssText='position:absolute;bottom:-2px;right:2px;font:700 12px system-ui;color:#9aa0ab;cursor:pointer;'; rb.title='Move later';
        rb.onclick=function(e){ e.stopPropagation(); var it=c.items.slice(); var t=it[ix+1]; it[ix+1]=it[ix]; it[ix]=t; saveFrame(fi,{items:it}); }; ch.appendChild(rb); }
      ch.onclick=function(){ previewIdx[fi]=ix; if(!c.intervalS) saveFrame(fi,{pinIdx:ix}); else { paintCard(); paintBadges(); } };
      chips.appendChild(ch);
    });
    var add=document.createElement('div'); add.textContent='＋ Add media';
    add.style.cssText='width:56px;height:78px;border-radius:8px;border:2px dashed #3a4150;display:flex;align-items:center;justify-content:center;text-align:center;color:#9aa0ab;font:600 10px system-ui;cursor:pointer;';
    add.onclick=function(){ openPicker(fi); };
    chips.appendChild(add);
    card.appendChild(chips);
    if(c.items.length>=2){
      var r1=document.createElement('div'); r1.style.cssText='display:flex;align-items:center;gap:8px;margin-top:10px;';
      var k1=document.createElement('span'); k1.textContent='ORDER'; k1.style.cssText='font:600 9.5px system-ui;letter-spacing:.1em;opacity:.5;min-width:78px;';
      r1.appendChild(k1); r1.appendChild(seg([['seq','In order'],['shuffle','Shuffle']],c.order,function(v){ saveFrame(fi,{order:v}); }));
      card.appendChild(r1);
      var r2=document.createElement('div'); r2.style.cssText='display:flex;align-items:center;gap:8px;margin-top:7px;';
      var k2=document.createElement('span'); k2.textContent='CHANGE EVERY'; k2.style.cssText=k1.style.cssText;
      r2.appendChild(k2); r2.appendChild(seg([[0,'Static'],[30,'30s'],[60,'1 min'],[300,'5 min']],c.intervalS,function(v){ saveFrame(fi,{intervalS:v}); }));
      card.appendChild(r2);
      if(!c.intervalS){ var n=document.createElement('div'); n.textContent='Static: the frame always shows the highlighted item.'; n.style.cssText='margin-top:7px;font:500 10.5px system-ui;opacity:.45;'; card.appendChild(n); }
    } else if(c.items.length===1){
      var n1=document.createElement('div'); n1.textContent='This frame always shows exactly this file.'; n1.style.cssText='margin-top:8px;font:500 10.5px system-ui;opacity:.45;'; card.appendChild(n1);
    } else {
      var n0=document.createElement('div'); n0.textContent='No playlist — the frame uses its Scene setting (below/above) as before.'; n0.style.cssText='margin-top:8px;font:500 10.5px system-ui;opacity:.45;'; card.appendChild(n0);
    }
  }
  function ensureCard(fi){
    var insp=document.querySelector('#insp'); if(!insp) return;
    var card=document.getElementById('rs-pl-card');
    if(!card){ card=document.createElement('div'); card.id='rs-pl-card';
      card.style.cssText='margin:12px 0 6px;padding:11px 12px;background:#0f1116;border:1px solid #23262e;border-radius:10px;'; }
    if(String(card.dataset.f)!==String(fi)){ card.dataset.f=fi; paintCard(); }
    // place after the SCENE picker button if possible, else append
    var btns=[].slice.call(insp.querySelectorAll('button.btn'));
    var anchor=null; for(var i=0;i<btns.length;i++){ if((btns[i].textContent||'').trim().indexOf('🖼')===0){ anchor=btns[i]; break; } }
    if(anchor && card.previousElementSibling!==anchor){ anchor.parentNode.insertBefore(card, anchor.nextSibling); }
    else if(!card.parentNode){ insp.appendChild(card); }
  }

  /* ---------------- media picker ---------------- */
  function openPicker(fi){
    closePicker();
    var scrim=document.createElement('div'); scrim.id='rs-pl-scrim';
    scrim.style.cssText='position:fixed;inset:0;background:rgba(6,7,10,.6);z-index:100000;';
    scrim.onclick=closePicker;
    var p=document.createElement('div'); p.id='rs-pl-picker';
    p.style.cssText='position:fixed;left:50%;top:40px;transform:translateX(-50%);z-index:100001;width:min(1060px,97vw);max-height:85vh;'
      +'background:#14161c;border:1px solid #2c2f37;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.65);padding:14px 16px;display:flex;flex-direction:column;';
    p.onclick=function(e){ e.stopPropagation(); };
    var top=document.createElement('div'); top.style.cssText='display:flex;gap:10px;align-items:center;margin-bottom:10px;';
    var ti=document.createElement('span'); ti.textContent='Add media to '+FR_()[fi];   /* v2.64 */
    ti.style.cssText='font:700 15px system-ui;color:#ffe6a8;white-space:nowrap;';
    var q=document.createElement('input'); q.type='search'; q.placeholder='Search files & folders…';
    q.style.cssText='flex:1;'+css+'padding:7px 10px;cursor:text;';
    var done=document.createElement('button'); done.textContent='Add selected (0)';
    done.style.cssText=css+'background:var(--gold);color:#161616;border-color:var(--gold);';
    var x=document.createElement('button'); x.textContent='Close'; x.style.cssText=css;
    x.onclick=closePicker;
    top.appendChild(ti); top.appendChild(q); top.appendChild(done); top.appendChild(x);
    p.appendChild(top);
    var body=document.createElement('div'); body.style.cssText='display:flex;gap:12px;min-height:0;flex:1;';
    var nav=document.createElement('div');
    nav.style.cssText='width:212px;flex:0 0 212px;overflow:auto;background:#0f1116;border:1px solid #23262e;border-radius:10px;padding:8px 6px;font:500 12px system-ui;';
    var grid=document.createElement('div');
    grid.style.cssText='flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:9px;padding:2px;align-content:start;';
    body.appendChild(nav); body.appendChild(grid);
    p.appendChild(body);
    document.body.appendChild(scrim); document.body.appendChild(p);
    var picked={}, selDir='', fileCache={};
    function refreshDone(){ done.textContent='Add selected ('+Object.keys(picked).length+')'; }
    done.onclick=function(){
      var rels=Object.keys(picked); if(!rels.length){ closePicker(); return; }
      var c=effFP(fi);   /* v2.64: draft-first */
      var it=(c.items||[]).slice();
      rels.forEach(function(r){ if(it.indexOf(r)<0) it.push(r); });
      saveFrame(fi,{items:it},function(){ closePicker(); });
    };
    function topOf(d){ return d.split('/')[0]||''; }
    function matchesDir(d){
      if(!selDir) return true;
      if(selDir.indexOf('TOP:')===0){ var t=selDir.slice(4); return t===''?d.indexOf('/')<0:(d===t||d.indexOf(t+'/')===0); }
      return d===selDir;
    }
    function buildNav(){
      var counts={};
      (scenes||[]).forEach(function(s){ var d=s.dir||''; counts[d]=(counts[d]||0)+(s.count||1); });
      var dirs=Object.keys(counts).sort();
      nav.innerHTML='';
      function row(label, val, depth, count, on){
        var r=document.createElement('div');
        r.style.cssText='padding:5px 8px 5px '+(8+depth*14)+'px;border-radius:7px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
          +(on?'background:#2a2b31;color:#ffe6a8;':'color:#9aa0ab;');
        r.textContent=(depth?'📁 ':'')+label+(count?(' ('+count+')'):'');
        r.onclick=function(){ selDir=val; buildNav(); render(); };
        return r;
      }
      var total=0; dirs.forEach(function(d){ total+=counts[d]; });
      nav.appendChild(row('All folders','',0,total,!selDir));
      var tops={};
      dirs.forEach(function(d){ var t=topOf(d)||'(root)'; (tops[t]=tops[t]||[]).push(d); });
      Object.keys(tops).sort().forEach(function(top){
        var subs=tops[top], topDir=(top==='(root)')?'':top;
        var tot=subs.reduce(function(a,d){ return a+counts[d]; },0);
        nav.appendChild(row(top,'TOP:'+topDir,1,tot,selDir==='TOP:'+topDir));
        var open = selDir==='TOP:'+topDir || (selDir && selDir.indexOf('TOP:')!==0 && topOf(selDir)===topDir);
        if(open){ subs.forEach(function(d){ nav.appendChild(row(d===topDir?'(this folder)':d.slice(topDir?topDir.length+1:0), d, 2, counts[d], selDir===d)); }); }
      });
    }
    function fileTile(rel,label){
      var t=document.createElement('div');
      t.style.cssText='position:relative;border-radius:9px;overflow:hidden;border:2px solid '+(picked[rel]?'var(--gold)':'#2c2f37')+';background:#1b2027;cursor:pointer;height:120px;';
      var im=document.createElement('div'); im.style.cssText='position:absolute;inset:0;background:url("'+thumbOf(rel,320)+'") center/cover;'; t.appendChild(im);
      var lb=document.createElement('div'); lb.textContent=label;
      lb.style.cssText='position:absolute;left:0;right:0;bottom:0;padding:3px 5px;background:rgba(8,9,12,.78);font:500 9.5px system-ui;color:#cfd3da;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      t.appendChild(lb);
      if(isVid(rel)){ var v=document.createElement('span'); v.textContent='▶'; v.style.cssText='position:absolute;top:4px;right:6px;font-size:11px;color:#9fd6ff;'; t.appendChild(v); }
      t.title=rel;
      t.onclick=function(){
        if(picked[rel]){ delete picked[rel]; t.style.borderColor='#2c2f37'; t.style.boxShadow='none'; }
        else { picked[rel]=1; t.style.borderColor='var(--gold)'; t.style.boxShadow='0 0 0 2px rgba(201,163,94,.3)'; }
        refreshDone();
      };
      return t;
    }
    function familyFiles(s, cb){
      if(fileCache[s.key]) return cb(fileCache[s.key]);
      jget('/api/variants?files='+encodeURIComponent(s.key)).then(function(j){
        var rels=(j&&j.ok&&j.files||[]).map(function(fn){ return (s.dir?s.dir+'/':'')+fn; });
        fileCache[s.key]=rels; cb(rels);
      }).catch(function(){ cb([]); });
    }
    function famTile(s, rel){
      var t=fileTile(rel, s.key);
      t.onclick=function(){ familyFiles(s, function(rels){
        var after=t;
        rels.forEach(function(r){ var t2=fileTile(r, String(r).split('/').pop()); after.parentNode.insertBefore(t2, after.nextSibling); after=t2; });
        t.remove();
      }); };
      var chip=document.createElement('span'); chip.textContent=(s.count||0)+' files ▾';
      chip.style.cssText='position:absolute;top:4px;left:5px;background:rgba(10,11,15,.85);border:1px solid var(--gold);color:#ffe6a8;border-radius:7px;padding:1px 6px;font:700 9px system-ui;';
      t.appendChild(chip);
      t.title=s.key+' — click to expand '+s.count+' files';
      return t;
    }
    function render(){
      grid.innerHTML='';
      var term=(q.value||'').toLowerCase();
      var leafSelected = selDir && selDir.indexOf('TOP:')!==0;
      var shown=0;
      (scenes||[]).forEach(function(s){
        if(shown>500) return;
        if(!matchesDir(s.dir||'')) return;
        var hay=(s.key+' '+(s.dir||'')).toLowerCase();
        if(term && hay.indexOf(term)<0) return;
        var rel=null;
        try{ rel=decodeURIComponent((s.sample||'').split('/media/')[1]||''); }catch(e){}
        if(!rel) return;
        if((s.count||1)<=1){ grid.appendChild(fileTile(rel, s.key)); shown++; }
        else if(leafSelected){
          // folder view: show every file individually
          var ph=document.createElement('div'); grid.appendChild(ph); shown++;
          familyFiles(s, function(rels){
            var frag=document.createDocumentFragment();
            rels.forEach(function(r){ frag.appendChild(fileTile(r, String(r).split('/').pop())); });
            ph.replaceWith(frag);
          });
        } else { grid.appendChild(famTile(s, rel)); shown++; }
      });
      if(!shown){ var e=document.createElement('div'); e.textContent='No matches.'; e.style.cssText='opacity:.5;font:500 12px system-ui;padding:14px;'; grid.appendChild(e); }
    }
    q.oninput=render;
    function start(){ buildNav(); render(); }
    if(scenes) start();
    else jget('/api/scenes').then(function(sc){ scenes=Array.isArray(sc)?sc:((sc&&(sc.scenes||sc.items))||[]); start(); }).catch(function(){});
    setTimeout(function(){ q.focus(); },50);
  }
  function closePicker(){ ['rs-pl-picker','rs-pl-scrim'].forEach(function(id){ var e=document.getElementById(id); if(e) e.remove(); }); }

  /* ---------------- frame badges + WYSIWYG preview ---------------- */
  function paintBadges(){
    var els=[].slice.call(document.querySelectorAll('#vdesign .ie-frame')).slice(0,FR_().length);   /* v2.64 */
    for(var i=0;i<els.length;i++){
      (function(i){
        var host=els[i]; if(!host) return;
        if(getComputedStyle(host).position==='static') host.style.position='relative';
        var c=effFP(i);   /* v2.64: draft-first */
        var b=host.querySelector('.rs-pl-badge');
        var ov=host.querySelector('.rs-pl-preview');
        if(!c.items.length){ if(b) b.remove(); if(ov) ov.remove(); return; }
        var idx=previewIdx[i]!=null?previewIdx[i]:(c.intervalS?0:(c.pinIdx||0));
        idx=Math.max(0,Math.min(c.items.length-1,idx));
        if(!ov){ ov=document.createElement('div'); ov.className='rs-pl-preview';
          ov.style.cssText='position:absolute;inset:0;z-index:40;background-position:center;background-size:cover;pointer-events:none;border-radius:2px;';
          host.appendChild(ov); }
        var want='url("'+thumbOf(c.items[idx],640)+'")';
        if(ov.__u!==want){ ov.style.backgroundImage=want; ov.__u=want; }
        if(!b){ b=document.createElement('div'); b.className='rs-pl-badge';
          b.style.cssText='position:absolute;top:26px;left:6px;z-index:60;display:flex;align-items:center;gap:4px;background:rgba(10,11,15,.85);border:1px solid var(--gold);border-radius:8px;padding:2px 7px;font:700 11px system-ui;color:#ffe6a8;';
          var lt=document.createElement('span'); lt.textContent='◀'; lt.style.cssText='cursor:pointer;opacity:.75;';
          var mid=document.createElement('span'); mid.className='m';
          var rt=document.createElement('span'); rt.textContent='▶'; rt.style.cssText='cursor:pointer;opacity:.75;';
          lt.onclick=function(e){ e.stopPropagation(); step(i,-1); };
          rt.onclick=function(e){ e.stopPropagation(); step(i,1); };
          b.appendChild(lt); b.appendChild(mid); b.appendChild(rt); host.appendChild(b);
        }
        var m=b.querySelector('.m');
        var label=(c.items.length===1)?'1':((idx+1)+'/'+c.items.length);
        if(m.textContent!==label) m.textContent=label;
        b.title=String(c.items[idx]).split('/').pop()+(c.intervalS?'\n(previewing — rotation is live on the TVs)':'\n(Static: this is what plays)');
      })(i);
    }
  }
  function step(i,dir){
    var c=effFP(i); if(!c.items.length) return;   /* v2.64: draft-first */
    var n=c.items.length;
    var idx=previewIdx[i]!=null?previewIdx[i]:(c.intervalS?0:(c.pinIdx||0));
    idx=((idx+dir)%n+n)%n; previewIdx[i]=idx;
    if(!c.intervalS){ saveFrame(i,{pinIdx:idx}); } else { paintBadges(); paintCard(); }
  }

  /* ---------------- main loop ---------------- */
  function sheetOpen(){
    var s=document.getElementById('sheet');
    if(s && s.offsetParent!==null) return true;
    var sh=document.querySelector('.shead'); return !!(sh && sh.offsetParent!==null);
  }
  var lastGame=null, lastSel=-1;
  function tick(){
    try{
      var hid=sheetOpen();
      [].slice.call(document.querySelectorAll('.rs-pl-badge,.rs-pl-preview')).forEach(function(e){ e.style.visibility=hid?'hidden':'visible'; });
      if(hid) return;
      var design=document.querySelector('#vdesign');
      if(!design||getComputedStyle(design).display==='none'){ closePicker(); return; }
      var g=curMode(); if(!g) return;
      if(g!==lastGame){ lastGame=g; game=g; previewIdx={}; loadCfg(g,function(){ paintCard(); paintBadges(); }); }
      var fi=selFrame();
      if(fi>=0){ ensureCard(fi); if(fi!==lastSel){ lastSel=fi; paintCard(); } }
      else { var card=document.getElementById('rs-pl-card'); if(card) card.remove(); lastSel=-1; }
      paintBadges();
    }catch(e){}
  }
  window.__rsTick.every(1000, tick);   /* v2.64: shared scheduler */
  setTimeout(tick, 1000);
})();
/* ================= ROOMSCAPE SCENE SHEET NAV (2026-07-18) =================
   RS-SHEET-NAV v1
   Upgrades the native "Choose a scene" modal:
   - LEFT FOLDER NAV: a tree built from your media folders; click to filter
     the grid to that folder (composes with the native search/type filters).
   - FILE-LEVEL PICKS: family tiles (xN) gain a "files" chip; expanding shows
     the individual files, and clicking a file sets the selected frame's
     PLAYLIST to exactly that file (Static) - no random rotation.
   Appended to app.js. */
;(function(){
  if (window.__rsSheetNav) return; window.__rsSheetNav = true;
  var selDir='', scenesIdx=null;

  function jget(u){ return fetch(u).then(function(r){ return r.json(); }); }
  function curMode(){ var el=document.querySelector('.scard.sel[data-id]'); return el?el.dataset.id:null; }
  function FR_(){ return (window.__rsLayout&&window.__rsLayout.frames)||(IE.FRAME_IDS); }   /* v2.64 (Phase 2a: no static literal) */
  function selFrame(){
    var chips=[].slice.call(document.querySelectorAll('#insp button.chip'));
    for(var i=0;i<chips.length;i++){ if(/\bon\b/.test(chips[i].className)){ var ix=FR_().indexOf((chips[i].textContent||'').trim()); if(ix>=0) return ix; } }
    return -1;
  }
  function relOf(cell){ var t=cell.getAttribute('title')||''; return t.split(' — ')[0]; }
  function dirOf(cell){ var r=relOf(cell); var i=r.lastIndexOf('/'); return i>0?r.slice(0,i):''; }

  function ensureNav(){
    var grid=document.getElementById('pgrid'); if(!grid) return null;
    var sb=grid.closest('.sbody')||grid.parentElement; if(!sb) return null;
    var nav=document.getElementById('rs-sheet-nav');
    if(nav && nav.parentElement===sb) return nav;
    sb.style.display='flex'; sb.style.gap='14px'; sb.style.alignItems='flex-start';
    var right=document.getElementById('rs-sheet-right');
    if(!right){
      right=document.createElement('div'); right.id='rs-sheet-right';
      right.style.cssText='flex:1;min-width:0;';
      while(sb.firstChild){ right.appendChild(sb.firstChild); }
      sb.appendChild(right);
    }
    nav=document.createElement('div'); nav.id='rs-sheet-nav';
    nav.style.cssText='width:212px;flex:0 0 212px;max-height:64vh;overflow:auto;background:#0f1116;'
      +'border:1px solid #23262e;border-radius:10px;padding:8px 6px;font:500 12px system-ui;';
    sb.insertBefore(nav, right);
    buildTree(nav);
    return nav;
  }
  function topOf(d){ return (d.split('/')[0]||''); }
  function buildTree(nav){
    function row(label, dir, depth, count, isTop){
      var r=document.createElement('div');
      var on = isTop ? (selDir===('TOP:'+dir)) : (selDir===dir && !isTop);
      r.style.cssText='padding:5px 8px 5px '+(8+depth*14)+'px;border-radius:7px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
        +(on?'background:#2a2b31;color:#ffe6a8;':'color:#9aa0ab;');
      r.textContent=(depth?'📁 ':'')+label+(count?('  ('+count+')'):'');
      r.title=dir||'All folders';
      r.onclick=function(){ selDir = isTop ? ('TOP:'+dir) : dir; buildTree(nav); applyFilter(); };
      return r;
    }
    var done=function(list){
      var counts={};
      list.forEach(function(s){ var d=s.dir||''; counts[d]=(counts[d]||0)+1; });
      var dirs=Object.keys(counts).sort();
      nav.innerHTML='';
      var all=document.createElement('div');
      all.style.cssText='padding:5px 8px;border-radius:7px;cursor:pointer;'+(!selDir?'background:#2a2b31;color:#ffe6a8;':'color:#9aa0ab;');
      all.textContent='All folders ('+list.length+')';
      all.onclick=function(){ selDir=''; buildTree(nav); applyFilter(); };
      nav.appendChild(all);
      var tops={};
      dirs.forEach(function(d){ var t=topOf(d)||'(root)'; (tops[t]=tops[t]||[]).push(d); });
      Object.keys(tops).sort().forEach(function(top){
        var subs=tops[top];
        var topDir=(top==='(root)')?'':top;
        var total=subs.reduce(function(a,d){ return a+counts[d]; },0);
        nav.appendChild(row(top, topDir, 1, total, true));
        var open = selDir==='TOP:'+topDir || (selDir && selDir.indexOf('TOP:')!==0 && topOf(selDir)===topDir);
        if(open){
          subs.forEach(function(d){
            var lbl = d===topDir ? '(this folder)' : d.slice(topDir?topDir.length+1:0);
            nav.appendChild(row(lbl, d, 2, counts[d], false));
          });
        }
      });
    };
    if(scenesIdx) done(scenesIdx);
    else jget('/api/scenes').then(function(sc){ scenesIdx=Array.isArray(sc)?sc:((sc&&(sc.scenes||sc.items))||[]); done(scenesIdx); }).catch(function(){});
  }
  function matchesDir(d){
    if(!selDir) return true;
    if(selDir.indexOf('TOP:')===0){ var top=selDir.slice(4); return top===''?d.indexOf('/')<0:(d===top||d.indexOf(top+'/')===0); }
    return d===selDir;
  }
  function applyFilter(){
    var grid=document.getElementById('pgrid'); if(!grid) return;
    [].slice.call(grid.querySelectorAll('.cell[data-k]')).forEach(function(c){
      var hide=!matchesDir(dirOf(c));
      if(hide){ if(!c.dataset.rsNavHid){ c.dataset.rsNavHid='1'; c.style.display='none'; } }
      else if(c.dataset.rsNavHid){ delete c.dataset.rsNavHid; c.style.display=''; }
    });
  }
  function addExpanders(){
    var grid=document.getElementById('pgrid'); if(!grid) return;
    [].slice.call(grid.querySelectorAll('.cell[data-k]')).forEach(function(c){
      if(c.dataset.rsExp) return;
      var cap=c.querySelector('.cap');
      if(!cap || (cap.textContent||'').indexOf('×')<0){ c.dataset.rsExp='0'; return; }
      c.dataset.rsExp='1';
      var chip=document.createElement('span');
      chip.textContent='files ▾';
      chip.style.cssText='position:absolute;top:6px;right:6px;z-index:5;background:rgba(10,11,15,.85);border:1px solid var(--gold);color:#ffe6a8;border-radius:7px;padding:2px 7px;font:700 10px system-ui;cursor:pointer;';
      if(getComputedStyle(c).position==='static') c.style.position='relative';
      chip.onclick=function(e){
        e.stopPropagation(); e.preventDefault();
        var key=c.dataset.k, dir=dirOf(c);
        jget('/api/variants?files='+encodeURIComponent(key)).then(function(j){
          if(!(j&&j.ok&&j.files&&j.files.length)) return;
          var after=c;
          j.files.forEach(function(fn,ix){
            var rel=(dir?dir+'/':'')+fn;
            var t=document.createElement('div'); t.className='cell rs-filecell';
            t.style.cssText='outline:2px solid #2c3a4a;';
            var img=document.createElement('img'); img.loading='lazy';
            img.src='/thumb/'+encodeURIComponent(fn)+'?src=media&w=320&p='+encodeURIComponent(rel);
            img.style.cssText='width:100%;aspect-ratio:16/10;object-fit:cover;';
            var cp=document.createElement('div'); cp.className='cap'; cp.textContent=(ix+1)+'. '+fn;
            t.appendChild(img); t.appendChild(cp);
            t.title=rel+'\nClick: show EXACTLY this file on the selected frame';
            t.onclick=function(ev){
              ev.stopPropagation();
              var g=curMode(), fi=selFrame();
              if(!g || fi<0){ cp.textContent='Select a frame first'; return; }
              /* v2.64: writes draft.framePlaylists via the core bridge (Save persists)
                 instead of the retired instant POST /api/playlists */
              if(window.__rsDraft && window.__rsDraft.get()){
                window.__rsDraft.ed(function(d){
                  var n=FR_().length;
                  d.framePlaylists=Array.isArray(d.framePlaylists)?d.framePlaylists.slice(0,n):[];
                  while(d.framePlaylists.length<n) d.framePlaylists.push(null);
                  d.framePlaylists[fi]={items:[rel],order:'seq',intervalS:0,pinIdx:0};
                });
                if(window.__rsToast) window.__rsToast('Pinned to '+FR_()[fi]+' — Save keeps it');
              }
              var cl=document.getElementById('pclose'); if(cl) cl.click();
            };
            after.parentNode.insertBefore(t, after.nextSibling); after=t;
          });
          chip.style.display='none';
        }).catch(function(){});
      };
      c.appendChild(chip);
    });
  }
  window.__rsTick.every(600, function(){   /* v2.64: shared scheduler */
    try{
      var grid=document.getElementById('pgrid');
      var nav=document.getElementById('rs-sheet-nav');
      if(!grid){
        if(nav){
          nav.remove();
          var r=document.getElementById('rs-sheet-right');
          if(r&&r.parentElement){ var sb=r.parentElement; while(r.firstChild) sb.appendChild(r.firstChild); r.remove(); sb.style.display=''; }
          selDir='';
        }
        return;
      }
      ensureNav(); applyFilter(); addExpanders();
    }catch(e){}
  });
})();
/* ================= ROOMSCAPE EFFECTS EDITOR UI (2026-07-18) =================
   RS-EFFECTS-UI v1.3 — create & edit the effect buttons (Social row)
   v1.3: SOUND SHAPE row — per-effect volume % and a max length in seconds
   (long samples fade out and stop at the cap; blank = play in full). Applied
   on the TVs by the fx.js SFX SHAPER block via /api/social-config.
   v1.2.1: saving marks the app's social list stale (window.__rsSocT=0) so new
   effects appear in the Social row / Moments tiles within a second or two
   (pairs with the SOCIAL REFRESH splice; without it the 15s poll still works).
   v1.2: "✎ Edit" smart link in the 🎭 Social row header itself (opens the same
   editor), so you no longer have to dig through Settings -> Setup to find it.
   Settings -> Setup gains an "Effects" card with an editor: list your effects,
   add / edit / delete / test each one. An effect = name + icon + sound (file
   from sounds/ with preview, or a synth) + visual on the TVs (soft flash,
   bloom, ignite, lightning, shake) + a light action (flash or dip-and-hold).
   Buttons appear in the Play Social row in EVERY mode (engine behaviour).
   Appended to app.js. */
;(function(){
  if (window.__rsEffectsUI) return; window.__rsEffectsUI = true;
  var effects=null, soundFiles=null, EVENTS=['softflash','bloom','ignite','lightning','shake'];
  var SYNTHS=['thunder','boom'];
  function jget(u){ return fetch(u).then(function(r){ return r.json(); }); }
  function jpost(u,b){ return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json();}); }
  function inp(){ return 'background:#12141a;color:#e6e9ef;border:1px solid #2c2f37;border-radius:8px;padding:6px 9px;font:500 12.5px system-ui;'; }
  function btn(primary){ return 'padding:6px 12px;border-radius:9px;cursor:pointer;font:600 12px system-ui;border:1px solid '+(primary?'var(--gold)':'#2c2f37')+';background:'+(primary?'var(--gold)':'#1b1d24')+';color:'+(primary?'#161616':'#cfd3da')+';'; }

  function normSound(x){
    var s = (typeof x==='string') ? x : (x && (x.file||x.path||x.rel||x.name)) || '';
    if(!s) return null;
    s=String(s).replace(/^\/+/,'');
    if(s.indexOf('sounds/')!==0) s='sounds/'+s;
    return /\.(mp3|wav|ogg|m4a)$/i.test(s)?s:null;
  }
  function load(cb){
    Promise.all([jget('/api/social-config'), soundFiles?Promise.resolve(null):jget('/api/sounds')]).then(function(rs){
      if(rs[0]&&rs[0].ok) effects=rs[0].effects.slice();
      var raw=rs[1]&&(rs[1].files||rs[1].sounds||rs[1].items||(Array.isArray(rs[1])?rs[1]:null));
      if(raw){ soundFiles=raw.map(normSound).filter(Boolean).sort(); }
      soundFiles=soundFiles||[];
      if(cb)cb();
    }).catch(function(){});
  }
  function save(cb){
    jpost('/api/social-config',{effects:effects}).then(function(j){ if(j&&j.ok){ effects=j.effects.slice(); window.__rsSocT=0; } if(cb)cb(); }).catch(function(){});
  }

  var audio=null;
  function preview(sfx){
    try{ if(audio){ audio.pause(); audio=null; } }catch(e){}
    if(!sfx) return;
    if(sfx.indexOf('sounds/')===0){ audio=new Audio('/'+sfx); audio.volume=.9; audio.play().catch(function(){}); }
  }

  function openEditor(){
    closeEditor();
    var scrim=document.createElement('div'); scrim.id='rs-fx-scrim';
    scrim.style.cssText='position:fixed;inset:0;background:rgba(6,7,10,.6);z-index:100000;';
    scrim.onclick=closeEditor;
    var p=document.createElement('div'); p.id='rs-fx-panel';
    p.style.cssText='position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:100001;width:min(700px,96vw);max-height:85vh;overflow:auto;'
      +'background:#14161c;border:1px solid #2c2f37;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.65);padding:16px 18px;';
    p.onclick=function(e){ e.stopPropagation(); };
    document.body.appendChild(scrim); document.body.appendChild(p);
    paint(p);
  }
  function closeEditor(){ ['rs-fx-panel','rs-fx-scrim'].forEach(function(id){ var e=document.getElementById(id); if(e) e.remove(); }); preview(null); }

  function paint(p, editIx){
    p.innerHTML='';
    var head=document.createElement('div'); head.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:12px;';
    var t=document.createElement('span'); t.textContent='🎭 Moments'; t.style.cssText='font:700 16px system-ui;color:#ffe6a8;';   /* v2.54: one word everywhere — Moments */
    var sp=document.createElement('span'); sp.style.flex='1';
    var add=document.createElement('button'); add.textContent='＋ New moment'; add.style.cssText=btn(true);
    add.onclick=function(){ effects.push({id:'', label:'New effect', icon:'✨', sfx:null, event:'softflash', lights:null}); paint(p, effects.length-1); };
    var rst=document.createElement('button'); rst.textContent='Restore defaults'; rst.style.cssText=btn(false);
    rst.onclick=function(){ effects=[]; save(function(){ paint(p); }); };
    var cl=document.createElement('button'); cl.textContent='Close'; cl.style.cssText=btn(false); cl.onclick=closeEditor;
    head.appendChild(t); head.appendChild(sp); head.appendChild(add); head.appendChild(rst); head.appendChild(cl);
    p.appendChild(head);
    var note=document.createElement('div');
    note.textContent='These buttons appear in the 🎭 Moments row of every mode. Sound + TV visual + light action fire together.';
    note.style.cssText='font:500 11.5px system-ui;opacity:.5;margin-bottom:12px;';
    p.appendChild(note);

    (effects||[]).forEach(function(fx, ix){
      var row=document.createElement('div');
      row.style.cssText='border:1px solid #23262e;border-radius:11px;padding:10px 12px;margin-bottom:9px;background:#0f1116;';
      if(ix!==editIx){
        var line=document.createElement('div'); line.style.cssText='display:flex;align-items:center;gap:9px;';
        var lab=document.createElement('span'); lab.textContent=(fx.icon||'✨')+' '+fx.label;
        lab.style.cssText='font:600 13.5px system-ui;color:#e6e9ef;min-width:140px;';
        var meta=document.createElement('span');
        var bits=[];
        if(fx.sfx) bits.push(fx.sfx.indexOf('synth:')===0?('synth '+fx.sfx.slice(6)):fx.sfx.replace('sounds/',''));
        if(fx.gain!=null) bits.push('🔉'+fx.gain+'%');
        if(fx.maxS!=null) bits.push('⏱'+fx.maxS+'s');
        if(fx.event) bits.push('✨'+fx.event);
        if(fx.lights) bits.push(fx.lights.flash?'💡flash':('💡dip '+fx.lights.dip+' × '+fx.lights.holdS+'s'));
        meta.textContent=bits.join('  ·  ')||'(nothing set)';
        meta.style.cssText='flex:1;font:500 11.5px system-ui;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        var test=document.createElement('button'); test.textContent='▶ Test'; test.style.cssText=btn(false);
        test.onclick=function(){ if(fx.id) fetch('/api/social/'+encodeURIComponent(fx.id),{method:'POST'}); };
        var ed=document.createElement('button'); ed.textContent='Edit'; ed.style.cssText=btn(false);
        ed.onclick=function(){ paint(p, ix); };
        var del=document.createElement('button'); del.textContent='✕'; del.style.cssText=btn(false)+'color:#ff9d8f;';
        del.onclick=function(){ effects.splice(ix,1); save(function(){ paint(p); }); };
        line.appendChild(lab); line.appendChild(meta); line.appendChild(test); line.appendChild(ed); line.appendChild(del);
        row.appendChild(line);
      } else {
        function fld(label, ctrl){
          var r=document.createElement('div'); r.style.cssText='display:flex;align-items:center;gap:9px;margin-top:8px;';
          var l=document.createElement('span'); l.textContent=label;
          l.style.cssText='font:600 9.5px system-ui;letter-spacing:.1em;opacity:.5;min-width:74px;';
          r.appendChild(l); r.appendChild(ctrl); return r;
        }
        var nameWrap=document.createElement('div'); nameWrap.style.cssText='display:flex;gap:8px;';
        var icon=document.createElement('input'); icon.value=fx.icon||'✨'; icon.style.cssText=inp()+'width:46px;text-align:center;';
        var name=document.createElement('input'); name.value=fx.label||''; name.placeholder='Effect name'; name.style.cssText=inp()+'flex:1;';
        nameWrap.appendChild(icon); nameWrap.appendChild(name);
        row.appendChild(fld('NAME', nameWrap));

        var sndWrap=document.createElement('div'); sndWrap.style.cssText='display:flex;gap:8px;flex:1;align-items:center;';
        var snd=document.createElement('select'); snd.style.cssText=inp()+'flex:1;max-width:330px;';
        var o0=document.createElement('option'); o0.value=''; o0.textContent='(no sound)'; snd.appendChild(o0);
        var og1=document.createElement('optgroup'); og1.label='Synth';
        SYNTHS.forEach(function(s){ var o=document.createElement('option'); o.value='synth:'+s; o.textContent='synth: '+s; og1.appendChild(o); });
        snd.appendChild(og1);
        var og2=document.createElement('optgroup'); og2.label='sounds/ folder';
        (soundFiles||[]).forEach(function(f){ var o=document.createElement('option'); o.value=f; o.textContent=f.replace('sounds/',''); og2.appendChild(o); });
        snd.appendChild(og2);
        snd.value=fx.sfx||'';
        var pv=document.createElement('button'); pv.textContent='▶'; pv.title='Preview'; pv.style.cssText=btn(false);
        pv.onclick=function(){ preview(snd.value); };
        snd.onchange=function(){ preview(snd.value); };
        sndWrap.appendChild(snd); sndWrap.appendChild(pv);
        row.appendChild(fld('SOUND', sndWrap));

        var shWrap=document.createElement('div'); shWrap.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
        var vol=document.createElement('input'); vol.type='number'; vol.min='0'; vol.max='100';
        vol.value=(fx.gain!=null?fx.gain:90); vol.title='Playback volume on the TVs'; vol.style.cssText=inp()+'width:64px;';
        var vs=document.createElement('span'); vs.textContent='% volume'; vs.style.cssText='opacity:.5;font:500 11px system-ui;';
        var maxs=document.createElement('input'); maxs.type='number'; maxs.min='1'; maxs.max='120'; maxs.step='0.5';
        maxs.value=(fx.maxS!=null?fx.maxS:''); maxs.placeholder='full';
        maxs.title='Stop the sound after this many seconds (last second fades out). Blank = play the whole file.';
        maxs.style.cssText=inp()+'width:70px;';
        var ms=document.createElement('span'); ms.textContent='s max — fades out; blank plays in full'; ms.style.cssText='opacity:.5;font:500 11px system-ui;';
        shWrap.appendChild(vol); shWrap.appendChild(vs); shWrap.appendChild(maxs); shWrap.appendChild(ms);
        row.appendChild(fld('SOUND SHAPE', shWrap));

        var ev=document.createElement('select'); ev.style.cssText=inp();
        var e0=document.createElement('option'); e0.value=''; e0.textContent='(no visual)'; ev.appendChild(e0);
        EVENTS.forEach(function(x){ var o=document.createElement('option'); o.value=x; o.textContent=x; ev.appendChild(o); });
        ev.value=fx.event||'';
        row.appendChild(fld('TV VISUAL', ev));

        var liWrap=document.createElement('div'); liWrap.style.cssText='display:flex;gap:8px;align-items:center;';
        var li=document.createElement('select'); li.style.cssText=inp();
        [['','(no light action)'],['flash','Flash'],['dip','Dip & hold']].forEach(function(o){ var op=document.createElement('option'); op.value=o[0]; op.textContent=o[1]; li.appendChild(op); });
        li.value=fx.lights?(fx.lights.flash?'flash':'dip'):'';
        var dip=document.createElement('input'); dip.type='number'; dip.min='0.05'; dip.max='0.95'; dip.step='0.05';
        dip.value=(fx.lights&&fx.lights.dip)||0.35; dip.title='Dip to this brightness fraction'; dip.style.cssText=inp()+'width:64px;';
        var hold=document.createElement('input'); hold.type='number'; hold.min='1'; hold.max='30';
        hold.value=(fx.lights&&fx.lights.holdS)||3; hold.title='Hold seconds'; hold.style.cssText=inp()+'width:54px;';
        var hs=document.createElement('span'); hs.textContent='s'; hs.style.cssText='opacity:.5;font:500 11px system-ui;';
        function liPaint(){ var d=li.value==='dip'; dip.style.display=d?'':'none'; hold.style.display=d?'':'none'; hs.style.display=d?'':'none'; }
        li.onchange=liPaint;
        liWrap.appendChild(li); liWrap.appendChild(dip); liWrap.appendChild(hold); liWrap.appendChild(hs);
        row.appendChild(fld('LIGHTS', liWrap));
        liPaint();

        var acts=document.createElement('div'); acts.style.cssText='display:flex;gap:8px;margin-top:11px;justify-content:flex-end;';
        var cancel=document.createElement('button'); cancel.textContent='Cancel'; cancel.style.cssText=btn(false);
        cancel.onclick=function(){ if(!fx.id) effects.splice(ix,1); paint(p); };
        var ok=document.createElement('button'); ok.textContent='Save moment'; ok.style.cssText=btn(true);
        ok.onclick=function(){
          fx.label=name.value.trim()||'Effect'; fx.icon=icon.value.trim()||'✨';
          fx.sfx=snd.value||null; fx.event=ev.value||null;
          var gv=parseInt(vol.value,10); fx.gain=(gv>=0&&gv<=100)?gv:null;
          var mv=parseFloat(maxs.value); fx.maxS=(mv>=1&&mv<=120)?mv:null;
          fx.lights = li.value==='flash' ? {flash:1} : (li.value==='dip' ? {dip:parseFloat(dip.value)||0.35, holdS:parseInt(hold.value,10)||3} : null);
          save(function(){ paint(p); });
        };
        acts.appendChild(cancel); acts.appendChild(ok);
        row.appendChild(acts);
      }
      p.appendChild(row);
    });
    if(!(effects||[]).length){
      var e=document.createElement('div'); e.textContent='Using the built-in defaults. Add a moment to start your own set.';
      e.style.cssText='opacity:.5;font:500 12px system-ui;padding:8px;'; p.appendChild(e);
    }
  }

  /* Settings -> Setup card */
  function injectSettings(){
    var setup=document.querySelector('#scrim .setsec[data-sec="setup"], .setsec[data-sec="setup"]');
    if(!setup || document.getElementById('rs-fx-card')) return;
    var card=document.createElement('div'); card.className='card'; card.id='rs-fx-card';
    var title=document.createElement('div'); title.className='zt'; title.textContent='Moments'; card.appendChild(title);   /* v2.54 */
    var d=document.createElement('div'); d.style.cssText='opacity:.7;font-size:12px;margin:2px 0 6px';
    d.textContent='Create and edit the moment buttons (sound + TV visual + lights) shown in the 🎭 Moments row of every mode.';
    card.appendChild(d);
    var b=document.createElement('button'); b.type='button'; b.className='btn sm'; b.textContent='Open the Moments editor';
    b.onclick=function(){ load(function(){ openEditor(); }); };
    card.appendChild(b);
    setup.appendChild(card);
  }

  /* v1.2: smart link in the Social row header (the actual effects view) */
  function injectSocialLink(){
    var wrap=document.getElementById('socialwrap');
    if(!wrap) return;
    if(document.getElementById('rs-fx-editlink')) return;
    var hd=wrap.firstElementChild; if(!hd) return;
    var a=document.createElement('button'); a.id='rs-fx-editlink'; a.type='button';
    a.textContent='✎ Edit';
    a.title='Add, edit or remove these moment buttons';
    a.style.cssText='margin-left:10px;padding:2px 10px;border-radius:8px;cursor:pointer;'
      +'font:600 11px system-ui;border:1px solid var(--gold);background:transparent;color:#ffe6a8;vertical-align:middle;';
    a.onclick=function(e){ e.preventDefault(); e.stopPropagation(); load(function(){ openEditor(); }); };
    hd.appendChild(a);
  }
  window.__rsTick.every(1500, function(){ try{ injectSettings(); injectSocialLink(); }catch(e){} });   /* v2.64: shared scheduler */
})();
/* ================= ROOMSCAPE SOUND STUDIO (2026-07-18) =================
   RS-SOUND-STUDIO v1.2 — full-width sound editor for the Design 🔊 lens.
   v1.2: 🎶 MUSIC VISUALS lane — per-mode audio-reactive visualizer config
   (style, which TVs, colour, sensitivity, shuffle) saved instantly to
   /api/viz (viz.json, outside the profiles draft). Rendered on the TVs by
   the RS-MUSIC-VIZ fx block; live wall picks changes up within ~20s.
   v1.1: library folder list decluttered — folders sorted by size, only the top
   6 shown with a "▾ N more folders" toggle; '(root)' renamed 'Ungrouped'.
   When the Sound lens is active the six TV previews (#walls) and the narrow
   right-rail editor (#insp) are hidden and this studio takes the whole canvas:
     LEFT    sound library (folders + search + ▶ local preview + add-to menus)
     MIDDLE  three lanes: 🎵 background playlist · 🚪 entrance/exit · ⏱ accents
     RIGHT   room placement map (which TVs carry the playlist) + master volume
   IMPORTANT: this block owns NO data. Every edit is proxied through the native
   rail's own controls (#pladd/[data-pladdbtn], [data-ai|ao|pd|pl|plf|a]) so the
   draft/save flow is exactly the app's own — and because each action commits
   immediately, the old "picked a track, rail re-rendered, selection lost"
   failure cannot happen. Leaving the lens restores #walls/#insp untouched.
   Appended to app.js. */
;(function(){
  if (window.__rsSoundStudio) return; window.__rsSoundStudio = true;
  function FR(){ return (window.__rsLayout&&window.__rsLayout.frames)||(IE.FRAME_IDS); }   /* v2.64: layout from the conductor (Phase 2a: no static literal) */
  var SP_LABEL={all:'All TVs',random:'Random TV',sweep:'Sweep L→R',sweeprev:'Sweep R→L'};
  var search='', selDir='', menuFor=null, lastSig='', prevAudio=null, prevKey='', moreDirs=false;
  var vizCfg=null, vizGame=null;
  /* Phase 2d: derived from the single engine catalogue — the '(panorama)' suffix
     this lane used to hand-write now comes from the pan flag. */
  var VIZ_STYLES=(IE.VIZ_STYLES||[]).map(function(s){ return [s.id, s.label+(s.pan?' (panorama)':'')]; });
  function curModeId(){ var el=$('.scard.sel[data-id]'); return el?el.dataset.id:null; }
  function fetchViz(){
    var id=curModeId(); vizGame=id;
    if(!id){ vizCfg=null; return; }
    fetch('/api/viz?game='+encodeURIComponent(id)+'&cb='+Date.now()).then(function(r){ return r.json(); })
      .then(function(j){ if(vizGame===id){ vizCfg=(j&&j.viz)||null; paint(); } }).catch(function(){});
  }
  function saveViz(v){
    var id=curModeId(); if(!id) return;
    fetch('/api/viz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:id,viz:v})})
      .then(function(r){ return r.json(); }).then(function(j){ if(j&&j.ok){ vizCfg=j.viz; paint(); } }).catch(function(){});
  }

  function $(s,r){ return (r||document).querySelector(s); }
  function $$(s,r){ return [].slice.call((r||document).querySelectorAll(s)); }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function fire(el,t){ try{ el.dispatchEvent(new Event(t,{bubbles:true})); }catch(e){} }
  function setVal(el,v){ if(!el) return; el.value=v; fire(el,'input'); fire(el,'change'); }

  function active(){
    var lens=$('#lensbar [data-lens="sound"]');
    return !!(lens && /\bon\b/.test(lens.className) && $('#walls') && $('#insp [data-pladdbtn]'));
  }

  /* ---------- read the whole draft state out of the rail ---------- */
  function libOptions(){
    return $$('#pladd option').filter(function(o){ return o.value; }).map(function(o){
      var v=o.value, i=v.lastIndexOf('/');
      return { v:v, n:v.slice(i+1), d:i>0?v.slice(0,i):'' };
    });
  }
  function spatialOpts(){
    var os=$$('#insp [data-ai="spatial"] option');
    return os.length?os.map(function(o){return o.value;}):['all','random','sweep','sweeprev'].concat(FR());   /* v2.64 */
  }
  function model(){
    var m={tracks:[],order:'sequence',gain:50,frames:[],intro:{},outro:{},peri:[],volOn:false,vol:30};
    // track rows are #pltracks' child divs (markup varies; the ✕ button marks a real row)
    var pt=$('#pltracks');
    if(pt) [].slice.call(pt.children).forEach(function(r){
      if(!r.querySelector || !r.querySelector('[data-plrm]')) return;
      var sp=r.querySelector('span'); if(sp) m.tracks.push((sp.textContent||'').replace(/^\d+\.\s*/,''));
    });
    var o=$('#insp [data-pl="order"]'); if(o) m.order=o.value;
    var g=$('#insp [data-pl="gain"]'); if(g) m.gain=parseInt(g.value,10)||0;
    FR().forEach(function(f){ var b=$('#insp [data-plf="'+f+'"]'); if(b && !/\bgh\b/.test(b.className)) m.frames.push(f); });   /* v2.64 */
    ['sound','spatial','gain'].forEach(function(k){
      var a=$('#insp [data-ai="'+k+'"]'); if(a) m.intro[k]=a.value;
      var b=$('#insp [data-ao="'+k+'"]'); if(b) m.outro[k]=b.value;
    });
    for(var i=0;;i++){
      var s=$('#insp [data-pd="'+i+'|sound"]'); if(!s) break;
      m.peri.push({
        sound:s.value,
        everyS:(($('#insp [data-pd="'+i+'|everyS"]')||{}).value)||'',
        jitter:(($('#insp [data-pd="'+i+'|jitter"]')||{}).value)||'',
        spatial:(($('#insp [data-pd="'+i+'|spatial"]')||{}).value)||'all',
        gain:(($('#insp [data-pd="'+i+'|gain"]')||{}).value)||''
      });
    }
    var von=$('#insp [data-a="volOn"]'); if(von) m.volOn=!!von.checked;
    var vv=$('#insp [data-a="volume"]'); if(vv) m.vol=parseInt(vv.value,10)||0;
    return m;
  }

  /* ---------- write through the rail's own controls ---------- */
  function addTrack(v){ var s=$('#pladd'); if(!s) return; s.value=v; var b=$('#insp [data-pladdbtn]'); if(b) b.click(); }
  function rmTrack(i){ var b=$('#insp [data-plrm="'+i+'"]'); if(b) b.click(); }
  function nameToVal(name){
    var hits=libOptions().filter(function(o){ return o.n===name; });
    return hits.length===1?hits[0].v:null;
  }
  function reorder(m,i,dir){
    var j=i+dir; if(j<0||j>=m.tracks.length) return;
    var vals=m.tracks.map(nameToVal);
    if(vals.some(function(v){return !v;})) return; // ambiguous names — leave order alone
    var t=vals[i]; vals[i]=vals[j]; vals[j]=t;
    for(var k=m.tracks.length-1;k>=0;k--) rmTrack(k); // re-queried per click; rail re-renders each time
    vals.forEach(addTrack);
  }
  function setIntro(kind,key,v){ setVal($('#insp [data-'+(kind==='intro'?'ai':'ao')+'="'+key+'"]'), v); }
  function toggleFrame(f){ var b=$('#insp [data-plf="'+f+'"]'); if(b) b.click(); }
  function addAccent(v){
    var n=model().peri.length;
    var b=$('#insp [data-periadd]'); if(!b) return;
    b.click();
    var s=$('#insp [data-pd="'+n+'|sound"]'); if(s) setVal(s, v);
  }
  function setAccent(i,key,v){ setVal($('#insp [data-pd="'+i+'|'+key+'"]'), v); }
  function rmAccent(i){ var b=$('#insp [data-perirm="'+i+'"]'); if(b) b.click(); }
  function wallTest(sel){ var b=$('#insp '+sel); if(b){ b.click(); return true; } return false; }
  function setVolOn(on){ var c=$('#insp [data-a="volOn"]'); if(c && c.checked!==on){ c.checked=on; fire(c,'change'); } }
  function setVol(v){ setVal($('#insp [data-a="volume"]'), v); }

  /* ---------- local audition ---------- */
  function preview(v,btn){
    if(prevAudio){ try{ prevAudio.pause(); }catch(e){} prevAudio=null;
      $$('#rs-snd .rs-prev.playing').forEach(function(b){ b.classList.remove('playing'); b.textContent='▶'; });
      if(prevKey===v){ prevKey=''; return; } }
    if(!v) return;
    prevKey=v;
    prevAudio=new Audio('/'+encodeURI(v)); prevAudio.volume=.9;
    prevAudio.play().catch(function(){});
    prevAudio.onended=function(){ if(btn){ btn.classList.remove('playing'); btn.textContent='▶'; } prevAudio=null; prevKey=''; };
    if(btn){ btn.classList.add('playing'); btn.textContent='⏹'; }
  }

  /* ---------- UI ---------- */
  function css(){
    if($('#rs-snd-css')) return;
    var st=document.createElement('style'); st.id='rs-snd-css';
    st.textContent=
      '#rs-snd{display:grid;grid-template-columns:255px 1fr 235px;gap:0;background:#0f1116;border:1px solid #23262e;border-radius:14px;overflow:hidden;margin:4px 0 10px;min-height:480px}'
      +'#rs-snd .col{padding:13px;border-right:1px solid #23262e;min-width:0}'
      +'#rs-snd .col:last-child{border-right:0}'
      +'#rs-snd h4{font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#9aa0ab;margin:0 0 9px}'
      +'#rs-snd h4 b{color:#ffe6a8}'
      +'#rs-snd .srch{width:100%;background:#14161c;border:1px solid #2c2f37;border-radius:8px;color:#e6e9ef;padding:6px 9px;font:500 12px system-ui;margin-bottom:8px}'
      +'#rs-snd .dir{padding:4px 8px;border-radius:7px;color:#9aa0ab;cursor:pointer;font:500 12px system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'#rs-snd .dir.on{background:#2a2b31;color:#ffe6a8}'
      +'#rs-snd .files{max-height:430px;overflow:auto;margin-top:6px}'
      +'#rs-snd .f{display:flex;align-items:center;gap:7px;padding:4px 6px;border-radius:8px;position:relative}'
      +'#rs-snd .f:hover{background:#1b1d24}'
      +'#rs-snd .rs-prev{width:21px;height:21px;flex:none;border-radius:50%;border:1px solid #2c2f37;background:#14161c;color:#ffe6a8;font-size:9px;cursor:pointer;padding:0}'
      +'#rs-snd .rs-prev.playing{border-color:var(--gold)}'
      +'#rs-snd .f .nm{flex:1;font:500 12px system-ui;color:#e6e9ef;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'#rs-snd .f .act{display:none;gap:4px}'
      +'#rs-snd .f:hover .act{display:flex}'
      +'#rs-snd .cbtn{border:1px solid var(--gold);background:transparent;color:#ffe6a8;border-radius:7px;font:600 10px system-ui;padding:2px 7px;cursor:pointer;white-space:nowrap}'
      +'#rs-snd .gbtn{border:1px solid #2c2f37;background:transparent;color:#cfd3da;border-radius:7px;font:600 10px system-ui;padding:2px 7px;cursor:pointer}'
      +'#rs-snd .menu{position:absolute;right:4px;top:26px;z-index:50;background:#14161c;border:1px solid #2c2f37;border-radius:9px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.6)}'
      +'#rs-snd .menu button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#e6e9ef;font:500 11.5px system-ui;padding:5px 9px;border-radius:6px;cursor:pointer}'
      +'#rs-snd .menu button:hover{background:#2a2b31;color:#ffe6a8}'
      +'#rs-snd .lane{background:#14161c;border:1px solid #23262e;border-radius:12px;padding:11px 13px;margin-bottom:10px}'
      +'#rs-snd .lh{display:flex;align-items:center;gap:9px;margin-bottom:8px}'
      +'#rs-snd .lh .t{font:700 13px system-ui;color:#ffe6a8}'
      +'#rs-snd .lh .sub{color:#9aa0ab;font:500 11px system-ui}'
      +'#rs-snd .lh .right{margin-left:auto;display:flex;gap:6px}'
      +'#rs-snd .trk{display:flex;align-items:center;gap:8px;padding:5px 8px;background:#0f1116;border:1px solid #23262e;border-radius:8px;margin-bottom:5px;font:500 12px system-ui;color:#e6e9ef}'
      +'#rs-snd .trk .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +'#rs-snd .tiny{border:0;background:transparent;color:#9aa0ab;cursor:pointer;font-size:11px;padding:1px 3px}'
      +'#rs-snd .tiny:hover{color:#ffe6a8}'
      +'#rs-snd .ctl{display:flex;gap:12px;align-items:center;margin-top:7px;flex-wrap:wrap;font:500 11.5px system-ui;color:#9aa0ab}'
      +'#rs-snd .ctl select,#rs-snd .ctl input[type=number]{background:#0f1116;border:1px solid #2c2f37;color:#e6e9ef;border-radius:7px;padding:3px 7px;font:500 11.5px system-ui;max-width:190px}'
      +'#rs-snd .ctl input[type=number]{width:56px}'
      +'#rs-snd .hint{color:#9aa0ab;font:500 11px system-ui;line-height:1.5}'
      +'#rs-snd .tvmap{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:4px}'
      +'#rs-snd .tv{aspect-ratio:9/14;border:1.5px solid #2c2f37;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#9aa0ab;font:700 11px system-ui;cursor:pointer;background:#14161c}'
      +'#rs-snd .tv.on{border-color:var(--gold);color:#ffe6a8;box-shadow:0 0 10px rgba(201,163,94,.25)}'
      +'#rs-snd .maplbl{display:flex;justify-content:space-between;color:#9aa0ab;font:600 9.5px system-ui;margin:2px 2px 10px}'
      +'#rs-snd .sum{background:#14161c;border:1px solid #23262e;border-radius:10px;padding:9px 11px;font:500 11.5px system-ui;color:#9aa0ab;line-height:1.5}'
      +'#rs-snd .sum b{color:#7ddf9a}'
      +'#rs-snd .savebar{display:flex;align-items:center;gap:10px;margin:0 0 10px;font:500 12px system-ui;color:#ffb86b}'
      +'#rs-snd-wrap .savebtn{background:var(--gold);color:#161616;border:0;border-radius:9px;padding:6px 15px;font:700 12px system-ui;cursor:pointer}';
    document.head.appendChild(st);
  }

  function laneTracks(m){
    var canSort = m.tracks.length>1 && !m.tracks.some(function(n){ return !nameToVal(n); });
    var h='';
    if(m.tracks.length){
      m.tracks.forEach(function(t,i){
        var v=nameToVal(t);
        h+='<div class="trk">'
          +(canSort?('<button class="tiny" data-mv="'+i+'|-1" title="Move up">▲</button><button class="tiny" data-mv="'+i+'|1" title="Move down">▼</button>'):'')
          +'<button class="rs-prev" data-pv="'+esc(v||'')+'" '+(v?'':'disabled')+'>▶</button>'
          +'<span class="nm">'+(i+1)+'. '+esc(t)+'</span>'
          +'<button class="tiny" data-rm="'+i+'" title="Remove">✕</button></div>';
      });
    } else h+='<div class="hint" style="padding:4px 2px">No tracks yet — add from the library on the left (hover a file → <b>+ Playlist</b>).</div>';
    return h;
  }
  function soundSelect(cur, act){
    var h='<select data-act="'+act+'"><option value="">— none —</option>';
    libOptions().forEach(function(o){ h+='<option value="'+esc(o.v)+'"'+(o.v===cur?' selected':'')+'>'+esc(o.n)+'</option>'; });
    return h+'</select>';
  }
  function whereSelect(cur, act){
    var h='<select data-act="'+act+'">';
    spatialOpts().forEach(function(v){ h+='<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(SP_LABEL[v]||v)+'</option>'; });
    return h+'</select>';
  }

  function paint(){
    var box=$('#rs-snd-wrap'); if(!box) return;
    var m=model(); lastSig=JSON.stringify(m);
    var lib=libOptions();
    var dirs={}; lib.forEach(function(o){ var top=o.d.replace(/^sounds\/?/,'').split('/')[0]||'(root)'; dirs[top]=(dirs[top]||0)+1; });
    var q=search.toLowerCase();
    var files=lib.filter(function(o){
      if(selDir && (o.d.replace(/^sounds\/?/,'').split('/')[0]||'(root)')!==selDir) return false;
      return !q || o.n.toLowerCase().indexOf(q)>=0;
    }).slice(0,400);

    var h='<div class="savebar">● Edits land in this mode’s draft instantly — press <b style="color:#ffe6a8">Save mode</b> to make them stick to the wall.'
      +'<button class="savebtn" data-act="save" style="margin-left:auto">💾 Save mode</button></div>';
    h+='<div id="rs-snd">';

    // LEFT: library
    h+='<div class="col"><h4>Sound library · <b>sounds/</b></h4>'
      +'<input class="srch" id="rs-snd-q" placeholder="🔍 Search '+lib.length+' sounds…" value="'+esc(search)+'">'
      +'<div class="dir'+(selDir===''?' on':'')+'" data-dir="">All folders ('+lib.length+')</div>';
    var dirArr=Object.keys(dirs).map(function(d){ return {d:d,n:dirs[d]}; })
      .sort(function(a,b){ return b.n-a.n || a.d.localeCompare(b.d); });
    var SHOW=6;
    var shown=moreDirs?dirArr:dirArr.slice(0,SHOW);
    if(selDir && !shown.some(function(o){ return o.d===selDir; })){
      var selO=dirArr.filter(function(o){ return o.d===selDir; })[0];
      if(selO) shown=shown.concat([selO]);
    }
    shown.forEach(function(o){
      var lbl=(o.d==='(root)')?'Ungrouped':o.d;
      h+='<div class="dir'+(selDir===o.d?' on':'')+'" data-dir="'+esc(o.d)+'">📁 '+esc(lbl)+' ('+o.n+')</div>';
    });
    if(dirArr.length>SHOW)
      h+='<div class="dir" id="rs-snd-more" style="color:var(--gold)">'+(moreDirs?'▴ fewer folders':('▾ '+(dirArr.length-SHOW)+' more folders'))+'</div>';
    h+='<div class="files">';
    files.forEach(function(o,ix){
      h+='<div class="f"><button class="rs-prev" data-pv="'+esc(o.v)+'">▶</button><span class="nm" title="'+esc(o.v)+'">'+esc(o.n)+'</span>'
        +'<span class="act"><button class="cbtn" data-addpl="'+esc(o.v)+'">＋ Playlist</button><button class="gbtn" data-menu="'+ix+'">▾</button></span>'
        +(menuFor===ix?('<div class="menu"><button data-use="intro|'+esc(o.v)+'">🚪 Set as intro</button><button data-use="outro|'+esc(o.v)+'">🚪 Set as outro</button><button data-use="peri|'+esc(o.v)+'">⏱ Add as accent</button></div>'):'')
        +'</div>';
    });
    if(!files.length) h+='<div class="hint" style="padding:6px 2px">Nothing matches.</div>';
    h+='</div><div class="hint" style="margin-top:8px">▶ auditions on this computer, not the wall.</div></div>';

    // MIDDLE: lanes
    h+='<div class="col">';
    h+='<div class="lane"><div class="lh"><span class="t">🎵 Background playlist</span><span class="sub">loops for the whole session</span></div>'
      +laneTracks(m)
      +'<div class="ctl"><label>Order <select data-act="order"><option value="sequence"'+(m.order==='sequence'?' selected':'')+'>In order</option><option value="shuffle"'+(m.order==='shuffle'?' selected':'')+'>Shuffle</option></select></label>'
      +'<label>Volume <input type="number" data-act="plgain" min="0" max="100" value="'+m.gain+'">%</label>'
      +'<span>Plays on <b style="color:#ffe6a8">'+(m.frames.length?m.frames.join(' + '):'all TVs (diffuse)')+'</b> — set on the map →</span></div></div>';

    h+='<div class="lane"><div class="lh"><span class="t">🚪 Entrance &amp; exit</span><span class="sub">one-shots on mode start / end</span>'
      +'<span class="right"><button class="gbtn" data-act="testintro" title="Play the intro on the wall now">▶ Test intro</button><button class="gbtn" data-act="testoutro" title="Play the outro on the wall now">▶ Test outro</button></span></div>'
      +'<div class="ctl" style="margin-top:0"><label>Intro '+soundSelect(m.intro.sound||'','isound')+'</label>'
      +'<label>Where '+whereSelect(m.intro.spatial||'all','ispatial')+'</label>'
      +'<label>Vol <input type="number" data-act="igain" min="0" max="100" value="'+(m.intro.gain||100)+'">%</label></div>'
      +'<div class="ctl"><label>Outro '+soundSelect(m.outro.sound||'','osound')+'</label>'
      +'<label>Where '+whereSelect(m.outro.spatial||'all','ospatial')+'</label>'
      +'<label>Vol <input type="number" data-act="ogain" min="0" max="100" value="'+(m.outro.gain||100)+'">%</label></div></div>';

    h+='<div class="lane"><div class="lh"><span class="t">⏱ Periodic accents</span><span class="sub">recurring one-shots at random-ish intervals</span></div>';
    m.peri.forEach(function(pd,i){
      h+='<div class="trk" style="flex-wrap:wrap">'
        +'<button class="rs-prev" data-pv="'+esc(pd.sound||'')+'" '+(pd.sound?'':'disabled')+'>▶</button>'
        +'<span class="nm" style="flex:1 1 150px">'+esc((pd.sound||'').split('/').pop()||'— pick a sound —')+'</span>'
        +'<label class="hint">every <input type="number" data-pe="'+i+'|everyS" min="5" max="3600" value="'+esc(pd.everyS)+'" style="width:52px;background:#14161c;border:1px solid #2c2f37;color:#e6e9ef;border-radius:6px;padding:2px 5px">s</label>'
        +'<label class="hint">± <input type="number" data-pe="'+i+'|jitter" min="0" max="100" value="'+esc(pd.jitter)+'" style="width:44px;background:#14161c;border:1px solid #2c2f37;color:#e6e9ef;border-radius:6px;padding:2px 5px">%</label>'
        +'<label class="hint">'+whereSelect(pd.spatial,'pe|'+i+'|spatial')+'</label>'
        +'<label class="hint">vol <input type="number" data-pe="'+i+'|gain" min="0" max="100" value="'+esc(pd.gain)+'" style="width:44px;background:#14161c;border:1px solid #2c2f37;color:#e6e9ef;border-radius:6px;padding:2px 5px">%</label>'
        +'<button class="gbtn" data-act="testpe|'+i+'">▶ Try</button>'
        +'<button class="tiny" data-perm="'+i+'">✕</button></div>';
    });
    if(!m.peri.length) h+='<div class="hint" style="padding:2px">None yet — hover a library file → ▾ → “Add as accent”.</div>';
    h+='</div>';

    // 🎶 v2.32 — music visuals moved OUT of the Sound lens: they're now a per-frame
    // Wall content type (Design → Wall → pick a frame → 🎶 Music Viz / ♪ Playlist).
    h+='<div class="lane"><div class="lh"><span class="t">🎶 Music visuals &amp; ♪ playlist art</span><span class="sub">now a Wall content type</span></div>'
      +'<div class="hint" style="margin-top:2px">Audio-reactive visuals and now-playing / album-art displays now live on the <b style="color:#ffe6a8">Wall</b> lens: pick a TV, choose <b>🎶 Music Viz</b> or <b>♪ Playlist</b> as its content type, then set the style, background and appearance there. This 🔊 Sound lens still controls <b>where the sound comes out</b> (the room map on the right) and the playlist tracks / entrance / accents above.</div>'
      +'</div>';

    var sumBits=[];
    sumBits.push(m.tracks.length?('<b>playlist ('+m.tracks.length+')</b> on '+(m.frames.length?m.frames.join('+'):'all TVs')):'no playlist');
    sumBits.push(m.intro.sound?('intro <b>'+esc((m.intro.sound).split('/').pop())+'</b>'):'no intro');
    sumBits.push(m.outro.sound?('outro <b>'+esc((m.outro.sound).split('/').pop())+'</b>'):'no outro');
    sumBits.push(m.peri.length?('<b>'+m.peri.length+' accent'+(m.peri.length>1?'s':'')+'</b>'):'no accents');
    h+='<div class="sum">This mode: '+sumBits.join(' · ')+(m.volOn?(' · master volume <b>'+m.vol+'%</b>'):'')+'</div>';
    h+='</div>';

    // RIGHT: placement + master volume
    h+='<div class="col"><h4>Room placement · <b>🎵 playlist</b></h4><div class="tvmap">';
    FR().forEach(function(f){   /* v2.64 */
      var on=m.frames.indexOf(f)>=0;
      h+='<div class="tv'+(on?' on':'')+'" data-tv="'+f+'">'+f+(on?'<span style="font-size:13px">🔊</span>':'')+'</div>';
    });
    h+='</div><div class="maplbl"><span>LEFT WALL</span><span>RIGHT WALL</span></div>'
      +'<div class="hint" style="margin-bottom:14px">Click TVs to choose which carry the playlist. None lit = every TV (diffuse wash). A subset (e.g. L2 + R2) keeps real music clean — six copies phase against each other.</div>'
      +'<h4>Master volume</h4>'
      +'<div class="ctl" style="margin-top:0"><label><input type="checkbox" data-act="volOn"'+(m.volOn?' checked':'')+'> Mode sets its own</label>'
      +(m.volOn?('<label><input type="number" data-act="vol" min="0" max="100" value="'+m.vol+'">%</label>'):'')
      +'</div></div>';

    h+='</div>';
    box.innerHTML=h;
    bind(box,m);
  }

  function bind(box,m){
    var q=$('#rs-snd-q',box);
    if(q){ q.oninput=function(){ search=q.value; clearTimeout(q.__t); q.__t=setTimeout(paint,250); };
           q.onkeydown=function(e){ if(e.key==='Escape'){ search=''; paint(); } }; }
    $$('#rs-snd .dir',box).forEach(function(d){
      if(d.id==='rs-snd-more'){ d.onclick=function(){ moreDirs=!moreDirs; paint(); }; return; }
      d.onclick=function(){ selDir=d.dataset.dir; menuFor=null; paint(); };
    });
    $$('[data-pv]',box).forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); preview(b.dataset.pv,b); }; });
    $$('[data-addpl]',box).forEach(function(b){ b.onclick=function(){ addTrack(b.dataset.addpl); menuFor=null; paint(); }; });
    $$('[data-menu]',box).forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); var ix=parseInt(b.dataset.menu,10); menuFor=(menuFor===ix?null:ix); paint(); }; });
    $$('[data-use]',box).forEach(function(b){ b.onclick=function(){
      var p=b.dataset.use.split('|'), kind=p[0], v=p.slice(1).join('|');
      if(kind==='intro') setIntro('intro','sound',v);
      else if(kind==='outro') setIntro('outro','sound',v);
      else addAccent(v);
      menuFor=null; paint();
    }; });
    $$('[data-rm]',box).forEach(function(b){ b.onclick=function(){ rmTrack(parseInt(b.dataset.rm,10)); paint(); }; });
    $$('[data-mv]',box).forEach(function(b){ b.onclick=function(){ var p=b.dataset.mv.split('|'); reorder(m,parseInt(p[0],10),parseInt(p[1],10)); paint(); }; });
    $$('[data-perm]',box).forEach(function(b){ b.onclick=function(){ rmAccent(parseInt(b.dataset.perm,10)); paint(); }; });
    $$('[data-pe]',box).forEach(function(inp){ inp.onchange=function(){
      var p=inp.dataset.pe.split('|'); setAccent(parseInt(p[0],10), p[1], inp.value); paint();
    }; });
    $$('[data-tv]',box).forEach(function(t){ t.onclick=function(){ toggleFrame(t.dataset.tv); paint(); }; });
    $$('[data-act]',box).forEach(function(el){
      var act=el.dataset.act;
      var run=function(){
        if(act==='save'){ var s=$('#save'); if(s) s.click(); return; }
        if(act==='order'){ setVal($('#insp [data-pl="order"]'), el.value); }
        else if(act==='plgain'){ setVal($('#insp [data-pl="gain"]'), el.value); }
        else if(act==='isound'){ setIntro('intro','sound',el.value); }
        else if(act==='ispatial'){ setIntro('intro','spatial',el.value); }
        else if(act==='igain'){ setIntro('intro','gain',el.value); }
        else if(act==='osound'){ setIntro('outro','sound',el.value); }
        else if(act==='ospatial'){ setIntro('outro','spatial',el.value); }
        else if(act==='ogain'){ setIntro('outro','gain',el.value); }
        else if(act==='testintro'){ wallTest('[data-aitest]'); return; }
        else if(act==='testoutro'){ wallTest('[data-aotest]'); return; }
        else if(act.indexOf('testpe|')===0){ wallTest('[data-ptest="'+act.split('|')[1]+'"]'); return; }
        else if(act==='volOn'){ setVolOn(el.checked); }
        else if(act==='vol'){ setVol(el.value); }
        else if(act.indexOf('pe|')===0){ var p=act.split('|'); setAccent(parseInt(p[1],10), p[2], el.value); }
        paint();
      };
      if(el.tagName==='BUTTON') el.onclick=function(e){ e.preventDefault(); run(); };
      else el.onchange=run;
    });
    // 🎶 music visuals controls
    // v2.32 — viz lane bindings removed; music visuals are now a Wall content type.
    box.onclick=function(e){ if(menuFor!==null && !e.target.closest('.menu') && !e.target.closest('[data-menu]')){ menuFor=null; paint(); } };
  }

  /* ---------- mount / unmount ---------- */
  function mount(){
    css();
    var walls=$('#walls'); if(!walls || $('#rs-snd-wrap')) return;
    var wrap=document.createElement('div'); wrap.id='rs-snd-wrap';
    walls.parentElement.insertBefore(wrap, walls);
    walls.style.display='none';
    var insp=$('#insp'); if(insp){ wrap.__inspDisp=insp.style.display; insp.style.display='none'; }
    lastSig=''; paint(); fetchViz();
  }
  function unmount(){
    var wrap=$('#rs-snd-wrap');
    var walls=$('#walls'); if(walls) walls.style.display='';
    var insp=$('#insp'); if(insp) insp.style.display='';
    if(wrap) wrap.remove();
    if(prevAudio){ try{ prevAudio.pause(); }catch(e){} prevAudio=null; prevKey=''; }
    menuFor=null;
  }
  window.__rsTick.every(700, function(){   /* v2.64: shared scheduler */
    try{
      if(active()){
        if(!$('#rs-snd-wrap')) mount();
        else {
          var insp=$('#insp'); if(insp && insp.style.display!=='none') insp.style.display='none';
          var walls=$('#walls'); if(walls && walls.style.display!=='none') walls.style.display='none';
          // repaint only when the rail changed under us and the user isn't mid-typing
          var ae=document.activeElement;
          var typing=ae && $('#rs-snd-wrap') && $('#rs-snd-wrap').contains(ae) && (ae.tagName==='INPUT'||ae.tagName==='SELECT');
          if(!typing && JSON.stringify(model())!==lastSig) paint();
          if(curModeId()!==vizGame && !typing) fetchViz();
        }
      } else if($('#rs-snd-wrap')) unmount();
    }catch(e){}
  });
})();

/* ================= ROOMSCAPE REVEAL TOPBAR (2026-07-18) =================
   RS-REVEAL-TOPBAR v1 — retire the floating "🎭 Reveal Studio" launcher.
   The bottom-left fixed button (Reveal Studio's only entry point) collided
   with other UI (e.g. the Sound Studio library). This block hides it and adds
   a compact 🎭 icon next to the ⚙ gear in the top bar instead; clicking it
   forwards to the original (hidden) launcher, so the Reveal Studio panel
   itself is completely untouched. Appended to app.js. */
;(function(){
  if (window.__rsRevealTop) return; window.__rsRevealTop = true;
  function findLauncher(){
    var hit=null;
    [].slice.call(document.querySelectorAll('button')).forEach(function(b){
      if(b.id==='rs-reveal-top') return;
      if(!/Reveal Studio/.test(b.textContent||'')) return;
      try{ if(getComputedStyle(b).position!=='fixed') return; }catch(e){ return; }
      hit=b;
    });
    return hit;
  }
  function tick(){
    try{
      var orig=findLauncher();
      if(orig && orig.style.display!=='none') orig.style.display='none';
      if(document.getElementById('rs-reveal-top')) return;
      if(!orig) return; // nothing to relocate (block absent / not built yet)
      var gear=document.getElementById('gear');
      if(!gear || !gear.parentElement) return;
      var b=document.createElement('button');
      b.id='rs-reveal-top'; b.type='button';
      b.textContent='🎭';
      b.title='Reveal Studio — build per-frame reveal reels';
      b.className=gear.className;
      try{
        var cs=getComputedStyle(gear);
        b.style.cssText='background:'+cs.backgroundColor+';border:'+cs.borderTopWidth+' '+cs.borderTopStyle+' '+cs.borderTopColor
          +';border-radius:'+cs.borderRadius+';color:'+cs.color+';font-size:'+cs.fontSize
          +';padding:'+cs.padding+';cursor:pointer;line-height:'+cs.lineHeight+';';
      }catch(e){}
      b.onclick=function(ev){
        ev.preventDefault();
        var o=findLauncher();
        if(o) o.click();
      };
      gear.parentElement.insertBefore(b, gear);
    }catch(e){}
  }
  window.__rsTick.every(1200, tick); tick();   /* v2.64: shared scheduler */
})();
/* ================= ROOMSCAPE RULES LENS (2026-07-18) =================
   RS-RULES-LENS v1 — 📖 Rules tab in the Design lens bar (after Behaviour).
   Full-width editor for the selected mode's rules record (rules-data.json via
   POST /api/rules/edit):
     LEFT   facts — name, players, time, tutorial video URL (any YouTube form,
            parsed to an id + thumbnail preview), playback speed (1x–2x for
            rambly tutorials), rulebook PDF url
     MIDDLE the four wall panels — Setup / Your Turn / Winning / Table Tips
     RIGHT  per-TV layout — what each of the six screens shows while rules are
            up: Video / Setup / Your turn / Winning / Tips / Blank. Default is
            the classic wall (sides = panels, centres = video).
   ▶ Preview shows it live on the wall; changes re-render within seconds.
   Owns no draft — saves write straight to rules-data.json (snapshotted server-
   side to _backups/rules-history). Appended to app.js. */
;(function(){
  if (window.__rsRulesLens) return; window.__rsRulesLens = true;
  function FR(){ return (window.__rsLayout&&window.__rsLayout.frames)||(IE.FRAME_IDS); }   /* v2.64: layout from the conductor (Phase 2a: no static literal) */
  var DEFROLE={L1:'setup',L2:'video',L3:'turn',R1:'win',R2:'video',R3:'tips'};   // classic-wall defaults; unknown frames fall back to 'none'
  var ROLES=[['video','🎬 Video'],['setup','📋 Setup'],['turn','🎲 Your turn'],['win','🏆 Winning'],['tips','💡 Tips'],['none','◻ Blank']];
  var games={}, byName={}, profiles={}, active=false, curKey=null, curName='', dirty=false;

  function $(s,r){ return (r||document).querySelector(s); }
  function $$(s,r){ return [].slice.call((r||document).querySelectorAll(s)); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
  function jget(u){ return fetch(u).then(function(r){ return r.json(); }); }
  function jpost(u,b){ return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(function(r){ return r.json().catch(function(){return {};}); }); }
  function ytId(s){
    s=String(s||'').trim();
    if(!s) return null;
    if(/^[A-Za-z0-9_-]{6,20}$/.test(s)) return s;
    try{
      var u=new URL(s);
      if(u.hostname.indexOf('youtu.be')>=0){ var p1=u.pathname.slice(1).split('/')[0]; if(/^[A-Za-z0-9_-]{6,20}$/.test(p1)) return p1; }
      var v=u.searchParams.get('v'); if(v&&/^[A-Za-z0-9_-]{6,20}$/.test(v)) return v;
      var m=u.pathname.match(/\/(embed|shorts|v)\/([A-Za-z0-9_-]{6,20})/); if(m) return m[2];
    }catch(e){}
    return null;
  }
  function loadData(){
    return Promise.all([jget('/api/rules').catch(function(){return {};}), jget('/api/profiles').catch(function(){return {};})]).then(function(rs){
      games=(rs[0]&&rs[0].games)||{};
      byName={};
      Object.keys(games).forEach(function(k){ var g=games[k]||{}; byName[norm(g.name||k)]=k; if(!byName[norm(k)]) byName[norm(k)]=k; });
      profiles=(rs[1]&&rs[1].profiles)||rs[1]||{};
    });
  }
  function selModeName(){
    var c=$('.scard.sel[data-id]');
    if(c){ var p=profiles[c.dataset.id]; if(p&&p.name) return p.name; }
    var nm=$('#nowname'); if(nm&&(nm.textContent||'').trim()) return nm.textContent.trim();
    return '';
  }

  /* ---------------- lens button ---------------- */
  function ensureBtn(){
    var bar=$('#lensbar'); if(!bar) return null;
    var b=$('#rs-rlens-btn');
    if(b && b.parentElement===bar) return b;
    b=document.createElement('button'); b.id='rs-rlens-btn'; b.textContent='📖 Rules';
    b.onclick=function(e){
      e.preventDefault(); e.stopPropagation();
      active=true; b.classList.add('on');
      $$('#lensbar button').forEach(function(x){ if(x!==b) x.classList.remove('on'); });
    };
    bar.appendChild(b);
    if(!bar.__rsRlens){ bar.__rsRlens=true;
      bar.addEventListener('click',function(e){
        var t=e.target.closest('button');
        if(t && t.id!=='rs-rlens-btn'){ active=false; var mb=$('#rs-rlens-btn'); if(mb) mb.classList.remove('on'); }
      }, true);
    }
    return b;
  }

  /* ---------------- editor ---------------- */
  function css(){
    if($('#rs-rlens-css')) return;
    var st=document.createElement('style'); st.id='rs-rlens-css';
    st.textContent=
      '#rs-rlens{display:grid;grid-template-columns:300px 1fr 250px;background:#0f1116;border:1px solid #23262e;border-radius:14px;overflow:hidden;margin:4px 0 10px;min-height:480px}'
      +'#rs-rlens .col{padding:14px;border-right:1px solid #23262e;min-width:0}'
      +'#rs-rlens .col:last-child{border-right:0}'
      +'#rs-rlens h4{font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#9aa0ab;margin:0 0 10px}'
      +'#rs-rlens label{display:block;font:600 11px system-ui;color:#9aa0ab;margin:9px 0 3px;text-transform:uppercase;letter-spacing:.05em}'
      +'#rs-rlens input,#rs-rlens select,#rs-rlens textarea{width:100%;background:#14161c;border:1px solid #2c2f37;border-radius:8px;color:#e6e9ef;padding:6px 9px;font:500 12.5px system-ui;box-sizing:border-box}'
      +'#rs-rlens textarea{min-height:96px;resize:vertical;line-height:1.5}'
      +'#rs-rlens .thumb{width:100%;border-radius:9px;margin-top:7px;display:block;background:#000;min-height:40px}'
      +'#rs-rlens .tvrow{display:flex;align-items:center;gap:8px;margin-bottom:7px}'
      +'#rs-rlens .tvrow .tv{flex:none;width:34px;text-align:center;font:700 12px system-ui;color:#ffe6a8;background:#14161c;border:1.5px solid #2c2f37;border-radius:6px;padding:7px 0}'
      +'#rs-rlens .tvrow.vid .tv{border-color:var(--gold)}'
      +'#rs-rlens .hint{color:#9aa0ab;font:500 11px system-ui;line-height:1.5}'
      +'#rs-rlens-bar{display:flex;align-items:center;gap:10px;margin:0 0 10px;font:500 12.5px system-ui;color:#9aa0ab}'
      +'#rs-rlens-bar .gold{background:var(--gold);color:#161616;border:0;border-radius:9px;padding:7px 16px;font:700 12.5px system-ui;cursor:pointer}'
      +'#rs-rlens-bar .gh{background:transparent;color:#cfd3da;border:1px solid #2c2f37;border-radius:9px;padding:7px 14px;font:600 12px system-ui;cursor:pointer}'
      +'#rs-rlens-bar .st{font-weight:700}';
    document.head.appendChild(st);
  }
  function recFor(){
    curName=selModeName();
    curKey=byName[norm(curName)]||(games[norm(curName)]?norm(curName):null);
    return curKey?(games[curKey]||{}):null;
  }
  function paint(){
    var wrap=$('#rs-rlens-wrap'); if(!wrap) return;
    var rec=recFor();
    var isNew=!rec;
    var r=rec||{};
    var lay=r.layout||{};
    var h='<div id="rs-rlens-bar">📖 Rules &amp; tutorial — <b style="color:#ffe6a8">'+esc(curName||'no mode selected')+'</b>'
      +(isNew?'<span style="color:#ffb86b">no rules entry yet — Save creates one</span>':'')
      +'<span style="flex:1"></span><span class="st" id="rs-rlens-st"></span>'
      +'<button class="gh" id="rs-rlens-prev">▶ Preview on wall</button>'
      +'<button class="gh" id="rs-rlens-hide">■ Hide</button>'
      +'<button class="gold" id="rs-rlens-save">💾 Save rules</button></div>';
    h+='<div id="rs-rlens">';
    // facts
    var vid=r.videoId||'';
    h+='<div class="col"><h4>Facts</h4>'
      +'<label>Game name</label><input data-rk="name" value="'+esc(r.name||curName)+'">'
      +'<label>Players</label><input data-rk="players" value="'+esc(r.players||'')+'" placeholder="2–4">'
      +'<label>Time</label><input data-rk="time" value="'+esc(r.time||'')+'" placeholder="60–90 min">'
      +'<label>Tutorial video (YouTube URL or id)</label><input id="rs-rlens-yt" value="'+esc(vid)+'" placeholder="https://youtu.be/…">'
      +'<img class="thumb" id="rs-rlens-thumb" '+(vid?('src="https://i.ytimg.com/vi/'+esc(vid)+'/hqdefault.jpg"'):'style="display:none"')+' onerror="this.style.display=\'none\'">'
      +'<label>Playback speed</label><select id="rs-rlens-spd">'
      +[1,1.25,1.5,1.75,2].map(function(s2){ var on=(parseFloat(r.speed)||1)===s2; return '<option value="'+s2+'"'+(on?' selected':'')+'>'+s2+'×'+(s2===1?' (normal)':'')+'</option>'; }).join('')
      +'</select>'
      +'<label>Rulebook PDF url</label><input data-rk="pdfUrl" value="'+esc(r.pdfUrl||'')+'" placeholder="https://…">'
      +'</div>';
    // panels
    h+='<div class="col"><h4>Wall panels</h4>'
      +'<label>📋 Setup</label><textarea data-rk="setup">'+esc(r.setup||'')+'</textarea>'
      +'<label>🎲 Your turn</label><textarea data-rk="turn">'+esc(r.turn||'')+'</textarea>'
      +'<label>🏆 Winning</label><textarea data-rk="win">'+esc(r.win||'')+'</textarea>'
      +'<label>💡 Table tips</label><textarea data-rk="tips">'+esc(r.tips||'')+'</textarea>'
      +'</div>';
    // layout
    h+='<div class="col"><h4>Screen layout</h4>';
    FR().forEach(function(f){   /* v2.64 */
      var v=lay[f]||DEFROLE[f]||'none';
      h+='<div class="tvrow'+(v==='video'?' vid':'')+'"><span class="tv">'+f+'</span><select data-rl="'+f+'">'
        +ROLES.map(function(ro){ return '<option value="'+ro[0]+'"'+(v===ro[0]?' selected':'')+'>'+ro[1]+'</option>'; }).join('')
        +'</select></div>';
    });
    h+='<div class="hint" style="margin-top:10px">Default is the classic wall: side TVs carry the four panels, centre TVs the video. Blank leaves that TV on the scene. Sound &amp; which TV speaks stay in the 🃏 Rules panel in Play view.</div>'
      +'<button class="gh" id="rs-rlens-def" style="margin-top:10px;background:transparent;color:#cfd3da;border:1px solid #2c2f37;border-radius:9px;padding:6px 12px;font:600 12px system-ui;cursor:pointer">↺ Reset to default</button>'
      +'</div></div>';
    wrap.innerHTML=h;
    bind(wrap);
  }
  function bind(wrap){
    dirty=false;
    var stEl=$('#rs-rlens-st');
    function mark(){ dirty=true; if(stEl){ stEl.textContent='● unsaved'; stEl.style.color='#ffb86b'; } }
    $$('#rs-rlens input,#rs-rlens textarea,#rs-rlens select',wrap).forEach(function(el){ el.addEventListener('input',mark); });
    var yt=$('#rs-rlens-yt');
    if(yt) yt.addEventListener('input',function(){
      var id=ytId(yt.value), th=$('#rs-rlens-thumb');
      if(th){ if(id){ th.src='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'; th.style.display='block'; } else th.style.display='none'; }
    });
    var def=$('#rs-rlens-def');
    if(def) def.onclick=function(){ $$('#rs-rlens [data-rl]',wrap).forEach(function(s2){ s2.value=DEFROLE[s2.dataset.rl]||'none'; }); mark(); };   /* v2.64: unknown frames → Blank */
    var sv=$('#rs-rlens-save');
    if(sv) sv.onclick=function(){
      var key=curKey||norm(curName);
      if(!key){ if(stEl){ stEl.textContent='select a mode first'; stEl.style.color='#ff8a8a'; } return; }
      var rec={};
      $$('#rs-rlens [data-rk]',wrap).forEach(function(el){ rec[el.dataset.rk]=el.value; });
      rec.videoId=ytId(($('#rs-rlens-yt')||{}).value)||'';
      rec.speed=parseFloat(($('#rs-rlens-spd')||{}).value)||1;
      var lay={}, allDef=true;
      $$('#rs-rlens [data-rl]',wrap).forEach(function(s2){ lay[s2.dataset.rl]=s2.value; if(s2.value!==(DEFROLE[s2.dataset.rl]||'none')) allDef=false; });   /* v2.64 */
      rec.layout=allDef?null:lay;
      if(stEl){ stEl.textContent='saving…'; stEl.style.color='#9aa0ab'; }
      jpost('/api/rules/edit',{game:key,rec:rec}).then(function(j){
        if(j&&j.ok){
          games[key]=j.rec; byName[norm(j.rec.name||key)]=key; curKey=key; dirty=false;
          if(stEl){ stEl.textContent='✔ saved'; stEl.style.color='#7ddf9a'; }
        } else if(stEl){ stEl.textContent='save failed: '+((j&&j.error)||'?'); stEl.style.color='#ff8a8a'; }
      }).catch(function(){ if(stEl){ stEl.textContent='save failed (network)'; stEl.style.color='#ff8a8a'; } });
    };
    var pv=$('#rs-rlens-prev');
    if(pv) pv.onclick=function(){
      var key=curKey||norm(curName); if(!key) return;
      jpost('/api/rules/show',{game:key}).then(function(j){
        if(stEl){ stEl.textContent=(j&&j.ok)?'● live on the wall':'preview failed — save first?'; stEl.style.color=(j&&j.ok)?'#9ff5c1':'#ff8a8a'; }
      });
    };
    var hd=$('#rs-rlens-hide');
    if(hd) hd.onclick=function(){ jpost('/api/rules/show',{off:true}).then(function(){ if(stEl){ stEl.textContent='hidden'; stEl.style.color='#9aa0ab'; } }); };
  }

  /* ---------------- mount / unmount ---------------- */
  var lastPaintKey='';
  function mount(){
    css();
    var walls=$('#walls'); if(!walls||$('#rs-rlens-wrap')) return;
    var wrap=document.createElement('div'); wrap.id='rs-rlens-wrap';
    walls.parentElement.insertBefore(wrap,walls);
    walls.style.display='none';
    var insp=$('#insp'); if(insp) insp.style.display='none';
    lastPaintKey='';
    loadData().then(function(){ lastPaintKey=selModeName(); paint(); });
  }
  function unmount(){
    var wrap=$('#rs-rlens-wrap');
    var walls=$('#walls'); if(walls) walls.style.display='';
    var insp=$('#insp'); if(insp) insp.style.display='';
    if(wrap) wrap.remove();
  }
  window.__rsTick.every(700, function(){   /* v2.64: shared scheduler */
    try{
      var bar=$('#lensbar');
      if(!bar){ if(active){ active=false; } unmountIf(); return; }
      var b=ensureBtn();
      // style like siblings once native styling exists
      if(b && !b.__styled){ var sib=bar.querySelector('button:not(#rs-rlens-btn)'); if(sib){ b.className=(active?'on':''); b.__styled=true; } }
      if(b){ if(active&&!b.classList.contains('on')) b.classList.add('on'); if(!active&&b.classList.contains('on')&&!b.matches(':focus')) b.classList.remove('on'); }
      if(active){
        if(!$('#rs-rlens-wrap')) mount();
        else {
          var insp=$('#insp'); if(insp&&insp.style.display!=='none') insp.style.display='none';
          var walls=$('#walls'); if(walls&&walls.style.display!=='none') walls.style.display='none';
          var nm=selModeName();
          if(nm!==lastPaintKey && !dirty){ lastPaintKey=nm; paint(); }   // mode switched under us
        }
      } else unmountIf();
    }catch(e){}
  });
  function unmountIf(){ if($('#rs-rlens-wrap')) unmount(); }
})();
/* ================= ROOMSCAPE MODE SEARCH (2026-07-18) =================
   RS-MODE-SEARCH v2 — as-you-type mode filter.
   v2 (app v2.54, UX round 2): the header pill is GONE — the search field now
   lives at the start of the Play section-chip row (#pcsearch, rendered by
   renderPlay at proper touch size). This block keeps owning the MECHANISM:
   window.__rsSetModeSearch(q) sets the query, cards hide via the same
   data-rshide + !important CSS rule, and the 800ms tick re-applies the filter
   after any re-render. v3 (app v2.66): filters BOTH the Play grid (.pcard) AND
   the Design strip (.scard) again — v2's Play-only scope turned out to be the
   regression users noticed, because each space now has its own VISIBLE field
   (#pcsearch in Play, #scsearch in the strip), so the invisible-filter trap v2
   worried about no longer applies. Both fields share one query and stay in sync. */
;(function(){
  if (window.__rsModeSearch) return; window.__rsModeSearch = true;
  var q='';
  function norm(s){ return (s||'').toLowerCase(); }
  function apply(){
    var qq=norm(q).trim();
    [].slice.call(document.querySelectorAll('.pcard[data-id], #strip .scard[data-id]')).forEach(function(c){
      var hit=!qq || norm(c.textContent).indexOf(qq)>=0 || norm(c.dataset.id||'').indexOf(qq)>=0;
      if(hit){ if(c.hasAttribute('data-rshide')) c.removeAttribute('data-rshide'); }
      else if(!c.hasAttribute('data-rshide')) c.setAttribute('data-rshide','1');
    });
    ['pcsearch','scsearch'].forEach(function(id){
      var b=document.getElementById(id);
      if(!b) return;
      if(b.classList.contains('rs-on')!==!!qq) b.classList.toggle('rs-on', !!qq);
      if(document.activeElement!==b && b.value!==q) b.value=q;   // keep the other space's field in sync
    });
  }
  window.__rsModeSearchQ = '';
  window.__rsSetModeSearch = function(v){ q = v || ''; window.__rsModeSearchQ = q; apply(); };
  var st=document.createElement('style');
  st.textContent=
    '.pcard[data-rshide]{display:none !important}'
    +'#strip .scard[data-rshide]{display:none !important}'
    +'#pcsearch.rs-on,.scard.srch:has(.rs-on){border-color:var(--gold)}'
    +'#pcsearch.rs-on{color:#ffe6a8}'
    +'.scard.srch{opacity:.9}'
    +'#pcsearch::-webkit-search-cancel-button,#scsearch::-webkit-search-cancel-button{cursor:pointer}';
  document.head.appendChild(st);
  window.__rsTick.every(800, function(){ try{ apply(); }catch(e){} });   /* v2.64: shared scheduler */
})();

/* ================= ROOMSCAPE STALE-TAB SENTRY + HONEST ERRORS (2026-07-20) =================
   RS-STALE-SENTRY v1 — appended to app.js. Two jobs:
   A. HONEST ERRORS: the patched api() helper (rs-harden api v1) dispatches an
      'rs-api-error' event whenever the server answers non-2xx (e.g. the
      profiles guard's 409 "stale tab" block). Before this, every failed save
      still showed "Saved" — the root of silent data loss. This block renders
      those events as an unmissable red banner, and also catches unhandled
      promise rejections from the same patch.
   B. STALE-TAB DEFENCE: a tab that wakes after >15 min hidden is the exact
      thing that has twice wiped/reverted modes. On wake: if the tab has NO
      unsaved changes it hard-reloads itself (fresh copy of every store); if
      it HAS unsaved changes it shows a warning banner telling the user this
      tab is out of date. Plus a beforeunload prompt when leaving with
      unsaved changes. Kiosk frames (frame.html) never load app.js. */
;(function () {
  try {
    if (window.__rsSentry) return; window.__rsSentry = 1;
    function el() {
      var d = document.getElementById('rs-sentry-banner');
      if (d) return d;
      d = document.createElement('div');
      d.id = 'rs-sentry-banner';
      d.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483000;max-width:860px;padding:10px 40px 10px 16px;border-radius:0 0 12px 12px;font:14px/1.4 system-ui;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.55);display:none;';
      var x = document.createElement('span');
      x.textContent = '✕';
      x.style.cssText = 'position:absolute;right:12px;top:8px;cursor:pointer;opacity:.8;font-size:15px;';
      x.onclick = function () { d.style.display = 'none'; };
      d.appendChild(x);
      var m = document.createElement('div'); m.id = 'rs-sentry-msg'; d.appendChild(m);
      (document.body || document.documentElement).appendChild(d);
      return d;
    }
    var hideT = null;
    function show(msg, bg, sticky) {
      try {
        var d = el(); document.getElementById('rs-sentry-msg').textContent = msg;
        d.style.background = bg || '#a32b2b'; d.style.display = 'block';
        clearTimeout(hideT);
        if (!sticky) hideT = setTimeout(function () { d.style.display = 'none'; }, 14000);
      } catch (e) {}
    }
    window.addEventListener('rs-api-error', function (ev) {
      var d = (ev && ev.detail) || {};
      var what = d.path === '/api/profiles' ? 'SAVE FAILED' : ('Request failed: ' + (d.path || ''));
      show('⚠ ' + what + ' (' + d.status + ') — ' + (d.msg || 'server refused'), d.status === 409 ? '#8a5a12' : '#a32b2b', d.status === 409);
    });
    window.addEventListener('unhandledrejection', function (ev) {
      var r = ev && ev.reason;
      if (r && r.status) { show('⚠ Request failed (' + r.status + ') — ' + (r.message || ''), '#a32b2b'); ev.preventDefault && ev.preventDefault(); }
    });

    function isDirty() {
      try {
        var sb = document.getElementById('savebar');
        var dn = document.getElementById('dirtynote');
        return !!(sb && sb.classList.contains('show') && dn && /^Unsaved/.test(dn.textContent || ''));
      } catch (e) { return false; }
    }
    var hiddenAt = null;
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      if (!hiddenAt) return;
      var mins = (Date.now() - hiddenAt) / 60000; hiddenAt = null;
      if (mins < 15) return;
      if (!isDirty()) {
        show('⟳ This tab was asleep for ' + Math.round(mins) + ' min — refreshing to the latest saved state…', '#1d5c37');
        setTimeout(function () { try { location.reload(); } catch (e) {} }, 1200);
      } else {
        show('⚠ This tab was asleep for ' + Math.round(mins) + ' min and has UNSAVED changes. The wall may have moved on — finish this edit with care, then reload this tab (Ctrl+Shift+R) before doing anything else.', '#8a5a12', true);
      }
    });
    window.addEventListener('beforeunload', function (ev) {
      if (isDirty()) { ev.preventDefault(); ev.returnValue = 'You have unsaved changes.'; return ev.returnValue; }
    });
  } catch (e) {}
})();
