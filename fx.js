/* ===================================================================
   The Immersion Engine — transition & effects layer (fx.js)  v1.51
   v1.51 (Phase 2d): registry-drift hardening — buildLayerHTML renders a
   labelled placeholder for unknown frame kinds (was a blank frame);
   RS-MUSIC-VIZ cross-checks its reg() renderers against IE.VIZ_STYLES at
   startup (ids + pan flags, console.warn only) and the preview module checks
   FAM coverage; RS-PLAYLIST falls back to 'nowplaying' for unknown display
   ids (warn once) instead of echoing the raw id.
   v1.50 (Phase 2c): party-game wall roles from the layout — quiz A–D corners
   come from the corners role (layout.roles), rules/scores/game screens from
   wall position (IE.slotOf/IE.wallSizeOf: slot 0 = rules, last slot = scores,
   between = game); the halo suppressor keys on the served at-rest id
   (__rsLayout.atRest / IE.ATREST) instead of 'dining'. Identical output on
   the reference two-walls-of-three layout.
   v1.40: N-frame layouts — all wall-of-3 math (slot = idx%3, wall = idx<3,
   pano width 300%, GL slice /3.0) now flows from IE.LAYOUT via IE.slotOf /
   IE.wallKeyOf / IE.wallFramesOf / IE.wallSizeOf; fallback frame lists come
   from IE.FRAME_IDS (kept live by IE.setLayout).
   v1.39 (2026-08-02): stop-all-sounds — playSfx tracks its live Audio elements in a
   registry, new IE.stopAllSfx() pauses + clears them all, and IE.onSocial honours
   {stop:true} broadcasts from the conductor's POST /api/audio/stop (v4.24).
   v1.38 (2026-08-02): RS-GAMES wall renderers (conductor v4.23, app v3.40) —
   state.partyGame drives a full-wall game overlay (state-mirror pattern, same
   as introMedia — engine.js dispatches only fixed WS types). Wall roles
   (LOCKED): L1+R1 rules placard · L2+R2 game screens (heads-up word ONLY on
   the screen opposite the guesser) · L3+R3 live scores. Quiz multiple-choice
   puts A/B/C/D on the four corner TVs during question/reveal; reveal blacks
   out the wrong corners (v1.28 blackout machinery) and blooms the right one.
   Charades round clock ticks locally off endsAt. syncPartyGame sits beside
   syncIntroMedia in the per-view render; overlay div at z-index 8, keyed on
   pg.v so repaints are cheap.
   v1.28 (2026-08-01): INTRO PHASE 2 (conductor v4.03, app v3.19) —
   (a) two new wall events: 'whiteflash' (bright 1.1s wash) and 'blackout'
   (fade the frame to black in 350ms and HOLD; msg.ms auto-clears, or a
   'blackclear' event / intro end lifts it). Kid-safe leaves both alone.
   (b) INTRO MEDIA takeover: state.introMedia {frames[], media, ts} overlays a
   full-frame image/video (contain, over black) on the targeted frames — the
   title-card cue. State-mirror pattern like the timer takeover (engine.js
   dispatches only fixed WS types); cleared when the conductor nulls the key.
   v1.18 (2026-08-01): SCENE FIT — state.sceneFits[idx] (profile.scnFit via the
   conductor v3.93) controls how a WHOLE-image scene fills its frame: cover
   (fill & crop, default = old behaviour) | contain | stretch | width | height.
   Applies to portrait frames and panoramas rendered solo (Fill-each-screen /
   auto-solo); spanned panoramas keep their slice math untouched. Videos map
   width/height to contain.
   v1.17 (2026-07-25): TIMER II — (a) new clock style 'sand': a pure CSS/SVG hourglass
   whose top bulb drains and bottom pile grows in proportion to the countdown (no canvas
   particles — the kiosks already drive 4K video), falling stream + settle shimmer only
   while running, numeric readout beneath like 'analog'; (b) WALL TAKEOVER — a conductor
   -pushed countdown (state.timer.takeover) covers EVERY frame whatever its content kind
   at z-index 12 (above .ie-id/9 and .ie-bezelsh/8), ticks off the shared server clock so
   all six TVs are in lockstep, fades out on `until` or when the takeover clears, and
   leaves the scene beneath untouched; kid-safe suppresses the final-10s pulse and the
   room's art-mode dimming is mirrored onto it; (c) CHESS CLOCK — state.timer.type
   'chess' renders a per-player split panel (2–8 seats, two columns above 4) with live
   remaining time for the active seat, accent highlight, dimmed idle seats and a red
   flagged seat; (d) CHAIN caption — "Round n/N" above the number on clock frames and in
   the takeover overlay while state.timer.chain.active.
   v1.07 (QA 2026-07-24): reveal videos set src directly on the <video> (source-child
   errors never fired the error handler → black frame for the 90s safety window on a
   missing file) + 5s readiness fallback; chroma-key cache capped at 6 entries (multi-MB
   data URLs grew unbounded on 24/7 kiosks); stagger sweep no longer re-adds listeners
   to stuck videos; RS-MUSIC-VIZ / RS-PLAYLIST use IE.FRAME_IDS instead of own lists.
   v1.06: 🎶 MUSIC VIZ + ♪ PLAYLIST as Wall content types — a frame's kind can now be
   'viz' (audio-reactive visualiser over a chosen image/video background, portrait or
   wall-spanning panorama, per-frame style/colour/sensitivity from state.frameViz) or
   'playlist' (8 now-playing / album-art displays from state.framePlaylist, driven by
   /api/music/status). RS-MUSIC-VIZ now reads per-frame config (transparent additive
   render over the frame's background) and falls back to the legacy /api/viz overlay
   for old modes; new RS-PLAYLIST module renders the playlist displays. The live
   animators run on kiosk frame pages only (?frame=); the app's Design canvas shows an
   animated stand-in (dancing bars / mock now-playing card) so viz/playlist frames read
   correctly in the preview (IS_LIVE_FRAME gate in vizStageHTML / playlistStageHTML).
   v1.05: LIVE SCOREBOARD — score frames render state.scores (people avatars/initial
   discs, leader crown, winner splash); demo bars remain the no-match fallback.
   v1.04: TIMER/CLOCK render — clock frames show the server-driven room timer with 6
   styles (digital/minimal/flip/analog/ring/neon), local per-frame ticking from the
   anchor, colour+pulse threshold rules, and an image/video background.
   v1.03: per-mode halo customisation — state.halo {color,size,op} from the conductor
   overrides the hardcoded accent/18vmin/33% inner glow; opacity 0 hides it.
   v1.02: photos.order 'norepeat' — one global shuffled deck across the WHOLE wall:
   every change (any frame, any cell) consumes the next card, so no photo repeats
   anywhere until all have been shown, then the deck reshuffles. Deterministic from
   wall-clock (deck index = draw div n), so all six kiosks agree with no shared state.
   v1.01: photos.matStyle 'recessed' — the print sits BEHIND a white mount with a
   cut-out window (.ie-phshade inset shadow cast by the mat onto the photo);
   default 'print' keeps the print-on-mat look. phUrl adds &v=2 (EXIF-fixed tiles).
   v1.00: AUTOMATIONS — IE.onSocial (broadcast sound + event on every page, kid-safe
   softening) and cue-card renderer (.ie-cue: museum placard / centred card / full
   diagram from state.prompter, 420 ms fades).
   v0.98: per-frame overlay FIT (state.overlayFits: stretch/cover/contain/width/height).
   v0.97: REVEAL — IE.playReveal(frame) plays a paired video once over the still then
          crossfades back (state.reveal); manual (Bus) + per-mode random auto-trigger.
   v0.96: scene captions ("At Rest" etc.) hidden unless state.captions is true
   (per-mode opt-in via the Design inspector; conductor resolves it).
   v0.95: design previews render live video again (scene + effect layers) —
   the ▶ poster workaround is retired now kickMedia makes playback reliable.
   v0.94: kickMedia() — scene videos froze at frame 0 on the TVs because
   autoplay is lost for <video> parsed in a detached layer; playback is now
   started explicitly after append (and re-kicked on loadeddata/canplay).
   releaseMedia also strips <source> children. Same file played fine as an
   effect (parsed into an attached node) — that asymmetry was the tell.
   v0.93: preview posters are click-to-play (user gesture swaps in a real video,
   falls back to the poster with a message if the browser can't decode it).
   v0.92: design previews (_noRoomSim) render video scenes as a ▶ poster and
   skip effect videos — previews stay instant and truthful; TVs play the real thing.
   v0.91: releaseMedia() — discarded <video> elements are explicitly freed
   (pause + clear src + load) so Chromium's media-element pool never starves.
   v0.9: per-frame EFFECT LAYER — looping VFX videos (rain/fog/snow on black)
   from Images & Videos/video/effects, screen-blended between scene and
   window overlay (state.effectImages, resolved by conductor v1.6).
   v0.81: pano frames wall-split ONLY when the wall shares one image; a frame
   with its own scene now renders it whole (was a stretched centre slice).
   v0.8: sweep modes change whole rows/columns/rings per interval (in-place
   crossfade, no blank); photos.fadeS controls crossfade length; 'tetris'
   layout — photos fall and stack bottom-up, hold, fade away, repeat.
   v0.7: living-wall photo renderer — stable cell geometry, double-buffered
   per-cell crossfades (background never shows), one cell changes per interval
   in pattern order (cascade/sparkle/rows/cols/diag/centre) or all together.
   v0.5: photo layout engine — 17 layouts from full-bleed 'maximise' to a
   112-print 'megawall'; small tiles load server-resized images (/thumb src=photos).
   v0.4: photo frames ('photos' kind: folder slideshows via /api/photos,
   clock-synchronised across frames, auto/stack/collage layouts) + matte
   brightness fix (tint/dim now inset with the art).
   Loads AFTER engine.js. Overrides IE.renderFrame with a two-layer
   transition engine, adds ambient motion, event effects, and synthesized
   placeholder SFX. Classic script; works file:// and http://.
   v0.3: Samsung Frame-style "art mode" decor — matte (passe-partout with
   bevel + bezel shadows, colours/textures), overlay drop-shadow, and
   per-light-scene print tone. Driven by state.matte / state.ovlShadow /
   state.artTone (resolved server-side by conductor.js v0.9).
   =================================================================== */
(function (g) {
  'use strict';
  var IE = g.IE; if (!IE) return;
  var D = document;

  /* -------- catalogue (also used to build the control picker) -------- */
  var TRANSITIONS = ['crossfade','blurfade','rackfocus','dipblack','dipwhite','dipaccent','cut','pushleft','pushright','wipe','iris','zoomblur','blinds','glitch','pixelate','ripple','morph'];
  var AMBIENTS = ['none','kenburns','breathe','flicker','rain','snow','embers','fog','starfield','grain','caustics'];
  var EVENTS = ['none','lightning','bloom','drain','shake','ignite','softflash'];
  var SFXNAMES = ['none','thunder','boom','whoosh','riser','chime','toll','zap','shatter','pageturn'];
  IE.FX = { TRANSITIONS: TRANSITIONS, AMBIENTS: AMBIENTS, EVENTS: EVENTS, SFXNAMES: SFXNAMES };
  IE.fxEnableGL = true;                 // WebGL ripple/morph; auto-disables per-frame on failure

  /* ============================ CSS ============================ */
  var CSS = ''
  + '.ie-frame .ie-stage{position:absolute;inset:0;overflow:hidden}'
  + '.ie-layer{position:absolute;inset:0;will-change:opacity,transform,filter}'
  + '.ie-ovl{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:2}'
  /* v0.9 effect layer: looping VFX video (rain/fog/snow on black) screen-blended over the scene, under the window overlay.
     Blend lives on the CONTAINER — the video's own z-index context would isolate it from the scene beneath. */
  + '.ie-efx{position:absolute;inset:0;pointer-events:none;z-index:1;mix-blend-mode:screen}'
  + '.ie-efx video{width:100%;height:100%;object-fit:cover}'
  + '.ie-cover{position:absolute;inset:0;opacity:0;pointer-events:none}'
  + '.ie-glcanvas{position:absolute;inset:0;width:100%;height:100%}'
  /* ambient motion applied to the active layer's image */
  + '@keyframes ie_kb{0%{transform:scale(1.06) translate(-1%,-0.5%)}100%{transform:scale(1.12) translate(1.5%,1%)}}'
  + '@keyframes ie_breathe{0%,100%{transform:scale(1.03)}50%{transform:scale(1.07)}}'
  + '@keyframes ie_flicker{0%,100%{filter:brightness(1)}45%{filter:brightness(1.06)}55%{filter:brightness(.9)}70%{filter:brightness(1.08)}}'
  + '.ie-amb-kenburns .ie-cur .ie-pano{animation:ie_kb 32s ease-in-out infinite alternate}'
  + '.ie-amb-breathe .ie-cur .ie-pano{animation:ie_breathe 12s ease-in-out infinite}'
  + '.ie-amb-flicker .ie-cur .ie-pano{animation:ie_kb 32s ease-in-out infinite alternate, ie_flicker 4s ease-in-out infinite}'
  /* overlay-based ambients (weather etc.) */
  + '.ie-ambov{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.2s;z-index:3}'
  + '.ie-ambov.on{opacity:1}'
  + '@keyframes ie_rain{to{background-position:0 800px,0 640px}}'
  + '.ie-amb-rain .ie-ambov{background-image:repeating-linear-gradient(102deg,rgba(200,220,255,.16) 0 1px,transparent 1px 7px),repeating-linear-gradient(100deg,rgba(200,220,255,.10) 0 1px,transparent 1px 5px);background-size:auto 200px,auto 160px;animation:ie_rain 0.7s linear infinite}'
  + '@keyframes ie_snow{to{background-position:0 600px,120px 500px,60px 700px}}'
  + '.ie-amb-snow .ie-ambov{background-image:radial-gradient(2.4px 2.4px at 20px 30px,#fff 40%,transparent),radial-gradient(2px 2px at 80px 60px,#fff 40%,transparent),radial-gradient(1.6px 1.6px at 140px 20px,#fff 40%,transparent);background-size:180px 200px,220px 240px,160px 180px;animation:ie_snow 9s linear infinite}'
  + '.ie-amb-snow .ie-ambov.on{opacity:.7}'
  + '@keyframes ie_embers{to{background-position:0 -700px,80px -560px}}'
  + '.ie-amb-embers .ie-ambov{background-image:radial-gradient(2.5px 2.5px at 30px 40px,rgba(255,170,80,.9) 40%,transparent),radial-gradient(1.8px 1.8px at 120px 90px,rgba(255,120,60,.8) 40%,transparent);background-size:200px 300px,260px 340px;animation:ie_embers 7s linear infinite;mix-blend-mode:screen}'
  + '@keyframes ie_fog{0%{transform:translateX(-4%)}100%{transform:translateX(4%)}}'
  + '.ie-amb-fog .ie-ambov{background:radial-gradient(120% 60% at 50% 100%,rgba(180,190,210,.22),transparent 70%);animation:ie_fog 18s ease-in-out infinite alternate}'
  + '.ie-amb-fog .ie-ambov.on{opacity:.9}'
  + '@keyframes ie_tw{0%,100%{opacity:.35}50%{opacity:.9}}'
  + '.ie-amb-starfield .ie-ambov{background-image:radial-gradient(1.5px 1.5px at 30px 40px,#fff,transparent),radial-gradient(1px 1px at 130px 80px,#cfe,transparent),radial-gradient(1.5px 1.5px at 210px 140px,#fff,transparent),radial-gradient(1px 1px at 90px 200px,#adf,transparent);background-size:260px 260px;animation:ie_tw 4s ease-in-out infinite}'
  + '@keyframes ie_grain{0%,100%{transform:translate(0,0)}20%{transform:translate(-2%,1%)}40%{transform:translate(1%,-2%)}60%{transform:translate(-1%,2%)}80%{transform:translate(2%,1%)}}'
  + '.ie-amb-grain .ie-ambov{background-image:repeating-conic-gradient(rgba(255,255,255,.03) 0deg 1deg,transparent 1deg 2deg);animation:ie_grain .5s steps(2) infinite}'
  + '.ie-amb-grain .ie-ambov.on{opacity:.5}'
  + '.ie-amb-caustics .ie-ambov{background:radial-gradient(60% 40% at 40% 30%,rgba(120,200,220,.18),transparent 60%),radial-gradient(50% 40% at 70% 70%,rgba(90,180,210,.16),transparent 60%);animation:ie_fog 14s ease-in-out infinite alternate;mix-blend-mode:screen}'
  /* transitions */
  + '@keyframes ie_glitch{0%{transform:translate(0)}20%{transform:translate(-3%,1%);filter:hue-rotate(20deg) saturate(1.4)}40%{transform:translate(3%,-1%);filter:hue-rotate(-25deg)}60%{transform:translate(-2%,0);filter:none}100%{transform:translate(0);filter:none}}'
  + '.ie-tglitch{animation:ie_glitch .5s steps(3,end)}'
  + '@keyframes ie_pix{0%{filter:contrast(1.6) brightness(1.1);transform:scale(1.02)}100%{filter:none;transform:none}}'
  + '.ie-tpix{animation:ie_pix .7s ease-out}'
  /* event overlays */
  + '.ie-fxover{position:absolute;inset:0;pointer-events:none;opacity:0;z-index:6}'
  + '@keyframes ie_lightning{0%{opacity:0}4%{opacity:.9}10%{opacity:.15}14%{opacity:.85}22%{opacity:0}100%{opacity:0}}'
  + '.ie-ev-lightning{background:#eaf2ff;animation:ie_lightning 1.1s ease-out}'
  + '@keyframes ie_bloom{0%{opacity:0}25%{opacity:.75}100%{opacity:0}}'
  + '.ie-ev-bloom{background:radial-gradient(circle at 50% 45%,rgba(255,230,160,.95),rgba(224,176,74,.2) 55%,transparent 75%);animation:ie_bloom 1.6s ease-out}'
  + '@keyframes ie_soft{0%{opacity:0}30%{opacity:.5}100%{opacity:0}}'
  + '.ie-ev-softflash{background:rgba(255,255,255,.8);animation:ie_soft 1s ease-out}'
  + '.ie-ev-whiteflash{background:#fff;animation:ie_soft 1.1s ease-out}'
  + '@keyframes ie_shake{0%,100%{transform:translate(0,0)}20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-4px,-2px)}80%{transform:translate(3px,4px)}}'
  + '.ie-shake{animation:ie_shake .5s ease-in-out}'
  + '.ie-stage.ie-drained{filter:grayscale(1) brightness(.6) contrast(1.05);transition:filter 1.4s}'
  + '.ie-stage.ie-warm{filter:saturate(1.15) brightness(1.06);transition:filter 1.2s}'
  /* v0.3 art-mode decor: matte (passe-partout) + bevel + bezel shadow.
     cqmin (container units) so the matte scales correctly both fullscreen
     on a TV and inside the editor's small preview tiles. */
  + '.ie-frame{container-type:size}'
  + '.ie-stage,.ie-ovl,.ie-ambov,.ie-fxover{transition:inset .8s ease}'
  + '.ie-bevel{position:absolute;pointer-events:none;z-index:4;display:none;transition:inset .8s ease}'
  + '.ie-bezelsh{position:absolute;inset:0;pointer-events:none;z-index:8;display:none;'
  +   'box-shadow:inset 0 2.2cqmin 4.5cqmin -2.6cqmin rgba(0,0,0,.62),inset 0 -1.4cqmin 3.6cqmin -2.6cqmin rgba(0,0,0,.42),'
  +   'inset 1.6cqmin 0 4cqmin -3cqmin rgba(0,0,0,.5),inset -1.6cqmin 0 4cqmin -3cqmin rgba(0,0,0,.5)}'
  /* v0.5 photo frames — absolute-positioned layout engine. Border classes:
     b = print border, bt = thin border, pol = polaroid (thick bottom), none = full-bleed */
  + '.ie-photos{position:absolute;inset:0}'
  /* v1.06 🎶 music-viz + ♪ playlist content types — background stage + display styles */
  + '.ie-bgi{position:absolute;inset:0;background-size:cover;background-position:center}'
  + '.ie-bgv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}'
  + '.ie-bgdim{position:absolute;inset:0}'
  + '.ie-viz-stage{position:absolute;inset:0;background:radial-gradient(130% 100% at 50% 120%,#12141c,#04050a 70%)}'
  + '.ie-pl{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3cqmin;padding:8cqmin 7cqmin;color:#fff;text-align:center;font-family:system-ui,-apple-system,sans-serif}'
  + '.ie-pl .art{width:60cqmin;max-width:78%;aspect-ratio:1;border-radius:2.5cqmin;object-fit:cover;box-shadow:0 3cqmin 8cqmin rgba(0,0,0,.6);background:#1a1c24}'
  + '.ie-pl .ttl{font-weight:800;font-size:5cqmin;line-height:1.12;text-shadow:0 1cqmin 4cqmin #000;max-width:92%}'
  + '.ie-pl .art2{font-size:3.4cqmin;color:rgba(255,255,255,.72);text-shadow:0 1cqmin 4cqmin #000}'
  + '.ie-pl .lbl{font-size:2.6cqmin;letter-spacing:.28em;text-transform:uppercase;color:var(--plc,#e0c88a);font-weight:700}'
  + '.ie-pl .prog{width:70%;height:.9cqmin;border-radius:1cqmin;background:rgba(255,255,255,.18);overflow:hidden}'
  + '.ie-pl .prog>i{display:block;height:100%;width:38%;background:var(--plc,#e0c88a)}'
  + '.ie-pl.d-vinyl .art{border-radius:50%;animation:ie_spin 6s linear infinite;box-shadow:0 0 0 3cqmin #0a0a0d,0 3cqmin 8cqmin rgba(0,0,0,.6)}'
  + '.ie-pl.d-vinyl .art::after{content:"";position:absolute}'
  + '@keyframes ie_spin{to{transform:rotate(360deg)}}'
  + '.ie-pl.d-lyricstrip{justify-content:center}.ie-pl.d-lyricstrip .art{display:none}.ie-pl.d-lyricstrip .ttl{font-size:9cqmin}.ie-pl.d-lyricstrip .lbl{font-size:3cqmin}'
  + '.ie-pl.d-coverflow .art{transform:perspective(90cqmin) rotateY(-22deg);box-shadow:6cqmin 3cqmin 9cqmin rgba(0,0,0,.7)}'
  + '.ie-pl .queue{display:flex;flex-direction:column;gap:1.4cqmin;width:82%;margin-top:1cqmin}'
  + '.ie-pl .queue .q{display:flex;align-items:center;gap:2cqmin;opacity:.62;font-size:2.7cqmin;text-align:left}'
  + '.ie-pl .queue .q.cur{opacity:1;font-weight:700;color:var(--plc,#e0c88a)}'
  + '.ie-pl .queue .q b{width:5cqmin;text-align:right;opacity:.6;font-weight:500}'
  + '.ie-pl .collage{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:.6cqmin;filter:saturate(1.05)}'
  + '.ie-pl .collage>span{background-size:cover;background-position:center;background-color:#14161c}'
  + '.ie-pl .plcanvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'
  + '.ie-pl .fg{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3cqmin;width:100%;height:100%}'
  /* v1.06 app-preview stand-in — a per-style canvas animation, shown ONLY in the Design
     canvas (RS-VIZ-PREVIEW driver), never on a live frame (those run the real engine). */
  + '.ie-vizprevcv{position:absolute;inset:0;width:100%;height:100%}'
  + '.ie-vizprevlbl{position:absolute;left:0;right:0;bottom:6%;text-align:center;font:700 2.6cqmin system-ui;color:#fff;text-shadow:0 1cqmin 3cqmin #000;letter-spacing:.03em;pointer-events:none}'
  + '.ie-phcell{position:absolute;overflow:hidden;border-radius:.25cqmin;box-shadow:0 .5cqmin 1.8cqmin rgba(0,0,0,.5);background:#0c0d12}'
  + '.ie-phcell.b,.ie-phcell.bt,.ie-phcell.pol{background:#f6f3ec}'
  /* two image layers per cell — photos crossfade IN PLACE, background never shows */
  + '.ie-phimg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.25s ease}'
  + '.ie-phimg.on{opacity:1}'
  + '.ie-phcell.b .ie-phimg{inset:6%}'
  + '.ie-phcell.bt .ie-phimg{inset:4.5%}'
  + '.ie-phcell.pol .ie-phimg{inset:6% 6% 20% 6%}'
  /* v1.01 recessed mat — photo sunk behind a window-mount; the mat casts an inset shadow onto it */
  + '.ie-phshade{position:absolute;inset:0;pointer-events:none;z-index:3;display:none;border-radius:.2cqmin}'
  + '.ie-phcell.rec .ie-phshade{display:block;box-shadow:inset 0 .85cqmin 2.1cqmin rgba(0,0,0,.52),inset 0 -.35cqmin 1.2cqmin rgba(0,0,0,.28),inset .55cqmin 0 1.5cqmin rgba(0,0,0,.33),inset -.55cqmin 0 1.5cqmin rgba(0,0,0,.33)}'
  + '.ie-phcell.b .ie-phshade{inset:6%}'
  + '.ie-phcell.bt .ie-phshade{inset:4.5%}'
  + '.ie-phcell.pol .ie-phshade{inset:6% 6% 20% 6%}'
  + '.ie-photos.ie-ph-film{background:#08080a}'
  + '.ie-photos.ie-ph-film::before,.ie-photos.ie-ph-film::after{content:"";position:absolute;top:0;bottom:0;width:6%;z-index:1;'
  +   'background-image:repeating-linear-gradient(180deg,transparent 0 2.4cqmin,#e8e4d8 2.4cqmin 3.8cqmin,transparent 3.8cqmin 5.4cqmin)}'
  + '.ie-photos.ie-ph-film::before{left:2.5%}.ie-photos.ie-ph-film::after{right:2.5%}'
  + '.ie-phempty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6a6d79;font:500 2.4cqmin sans-serif}'
  /* v1.04 TIMER / CLOCK — server-driven room timer, styled per mode */
  + '.ie-tclock{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#0a0b0f}'
  + '.ie-tbg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background-size:cover;background-position:center}'
  + '.ie-tbgdim{position:absolute;inset:0;background:rgba(6,7,11,.5)}'
  + '.ie-tinner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2cqmin;width:100%;height:100%}'
  + '.ie-tlabel{font:600 4.4cqmin/1 system-ui,sans-serif;letter-spacing:.5cqmin;text-transform:uppercase;opacity:.85}'
  + '.ie-tnum{font:700 22cqmin/1 system-ui,sans-serif;letter-spacing:.4cqmin;font-variant-numeric:tabular-nums;color:#fff}'
  + '.ie-ts-digital .ie-tnum{font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;letter-spacing:1.4cqmin}'
  + '.ie-ts-minimal .ie-tnum{font-weight:200;font-size:26cqmin;letter-spacing:0}'
  + '.ie-ts-neon .ie-tnum{font-family:ui-monospace,monospace;text-shadow:0 0 2cqmin currentColor,0 0 5cqmin currentColor,0 0 9cqmin currentColor}'
  + '.ie-tpulse .ie-tnum{animation:ie_tpulse .9s ease-in-out infinite}'
  + '@keyframes ie_tpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.06)}}'
  + '.ie-tringsvg{width:66cqmin;height:66cqmin;transform:rotate(-90deg)}'
  + '.ie-tringbg{fill:none;stroke:rgba(255,255,255,.12);stroke-width:5}'
  + '.ie-tringfg{fill:none;stroke-width:5;stroke-linecap:round;transition:stroke-dashoffset .28s linear}'
  + '.ie-ts-ring .ie-tinner{position:relative}'
  + '.ie-ts-ring .ie-tnum{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:15cqmin}'
  + '.ie-tanalog{width:66cqmin;height:66cqmin}'
  + '.ie-tdial{fill:rgba(255,255,255,.04);stroke:rgba(255,255,255,.25);stroke-width:1.4}'
  + '.ie-thand{stroke-width:2.6;stroke-linecap:round;transition:transform .2s linear}'
  + '.ie-ts-analog .ie-tsub{font-size:9cqmin;margin-top:1.5cqmin;opacity:.85}'
  + '.ie-tflip{display:flex;gap:1.2cqmin;align-items:center}'
  + '.ie-tcard{display:inline-flex;align-items:center;justify-content:center;min-width:13cqmin;padding:2.2cqmin 2.4cqmin;background:#15161c;border-radius:2cqmin;font:700 18cqmin/1 ui-monospace,monospace;box-shadow:inset 0 -1cqmin 2cqmin rgba(0,0,0,.5),0 1cqmin 2cqmin rgba(0,0,0,.4)}'
  + '.ie-tcolon{font:700 13cqmin/1 ui-monospace,monospace;opacity:.7;margin:0 .4cqmin}'
  /* v1.17 SAND — hourglass whose bulbs track the countdown. Deliberately pure CSS/SVG:
     each kiosk already decodes three 4K streams, so no canvas particle system here.
     Geometry (viewBox 0 0 100 100): top cap y=12, neck y=50, bottom cap y=88; the two
     fill rects are clipped to the bulb polygons so they taper for free. */
  + '.ie-tsand{width:60cqmin;height:60cqmin;overflow:visible}'
  + '.ie-tsandg{fill:none;stroke-width:2.2;stroke-linejoin:round}'
  + '.ie-tsandcap{fill:none;stroke-width:2.8;stroke-linecap:round}'
  + '.ie-tsandfill{opacity:.92;transition:y .45s linear,height .45s linear}'
  + '.ie-tsandstream{opacity:0;transition:opacity .45s ease;transform-box:fill-box;transform-origin:center}'
  + '.ie-tsand.run .ie-tsandstream{opacity:.7;animation:ie_tsandfall .45s linear infinite}'
  + '@keyframes ie_tsandfall{0%{transform:translateY(-1.6px)}100%{transform:translateY(1.6px)}}'
  + '.ie-tsandpile{transform-box:fill-box;transform-origin:50% 100%}'
  + '.ie-tsand.run .ie-tsandpile{animation:ie_tsandsettle 6s ease-in-out infinite}'
  + '@keyframes ie_tsandsettle{0%,100%{transform:translateY(0) scaleX(1)}50%{transform:translateY(.4px) scaleX(1.015)}}'
  + '.ie-ts-sand .ie-tsub{font-size:9cqmin;margin-top:1.5cqmin;opacity:.9}'
  /* v1.17 chain caption ("Round 2/5") — label idiom, sits above the number */
  + '.ie-tround{font:600 3.2cqmin/1 system-ui,sans-serif;letter-spacing:.5cqmin;text-transform:uppercase;opacity:.7;color:#e8e6df}'
  /* v1.17 CHESS CLOCK — one seat per player; >4 players stacks into two columns so a
     portrait 4K frame stays legible from across the room. */
  + '.ie-ts-chess .ie-tinner{gap:1.6cqmin;padding:5cqmin 3.5cqmin;justify-content:center}'
  + '.ie-tcgrid{display:grid;grid-template-columns:1fr;gap:2cqmin;width:100%}'
  + '.ie-ts-chess.two .ie-tcgrid{grid-template-columns:1fr 1fr;gap:1.5cqmin}'
  + '.ie-tcseat{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7cqmin;padding:2.8cqmin 2cqmin;'
  +   'border:.4cqmin solid rgba(255,255,255,.10);border-radius:2cqmin;background:rgba(255,255,255,.03);opacity:.45;'
  +   'transition:opacity .25s ease,border-color .25s ease,box-shadow .25s ease,background .25s ease}'
  + '.ie-tcseat.on{opacity:1;background:rgba(255,255,255,.07);box-shadow:0 0 4cqmin rgba(255,255,255,.10)}'
  + '.ie-tcseat.flag{opacity:1;border-color:#e0655f;background:rgba(224,101,95,.10);box-shadow:none}'
  + '.ie-tcname{font:600 3.6cqmin/1 system-ui,sans-serif;letter-spacing:.35cqmin;text-transform:uppercase;color:#cfcdc6;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.ie-tctime{font:700 13cqmin/1 ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;letter-spacing:.3cqmin}'
  + '.ie-ts-chess.two .ie-tcname{font-size:2.8cqmin}'
  + '.ie-ts-chess.two .ie-tctime{font-size:9.5cqmin}'
  /* v1.17 WALL TAKEOVER — fullscreen countdown over ANY frame kind. z-index 12 is the
     new top of the stack in this file: .ie-id is 9, .ie-bezelsh 8, .ie-cue/.ie-fxover 6. */
  + '.ie-tko{position:absolute;inset:0;z-index:12;pointer-events:none;display:flex;align-items:center;justify-content:center;'
  +   'background:rgba(4,5,10,.88);opacity:0;transition:opacity .38s ease}'
  + '.ie-tko.on{opacity:1}'
  + '.ie-tkoin{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4cqmin;text-align:center;padding:0 5cqmin;transition:opacity .8s ease}'
  + '.ie-tkolabel{font:600 5cqmin/1 system-ui,sans-serif;letter-spacing:.6cqmin;text-transform:uppercase;opacity:.88}'
  + '.ie-tkonum{font:700 30cqmin/1 ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;letter-spacing:1cqmin;color:#fff}'
  + '.ie-tkos-minimal .ie-tkonum{font-family:system-ui,sans-serif;font-weight:200;letter-spacing:0}'
  + '.ie-tkos-neon .ie-tkonum{text-shadow:0 0 2cqmin currentColor,0 0 6cqmin currentColor,0 0 11cqmin currentColor}'
  + '.ie-tko.pulse .ie-tkonum{animation:ie_tpulse .9s ease-in-out infinite}'
  /* v1.00 cue cards — museum placard / centred card / full diagram */
  + '.ie-cue{position:absolute;inset:0;z-index:6;pointer-events:none;opacity:0;transition:opacity .42s ease}'
  + '.ie-cue.on{opacity:1}'
  + '.ie-cue-plac{position:absolute;left:6cqmin;bottom:5cqmin;max-width:58cqmin;background:#f2eee4;color:#2b2a26;font:400 2.7cqmin Georgia,serif;line-height:1.5;padding:2.2cqmin 2.6cqmin;border-radius:.5cqmin;box-shadow:0 1cqmin 3cqmin rgba(0,0,0,.45)}'
  + '.ie-cue-plac i{display:block;width:6cqmin;height:.4cqmin;background:#b9a77c;margin-bottom:1.4cqmin}'
  + '.ie-cue-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:74cqmin;background:rgba(18,20,26,.93);border:1px solid #3a3f4e;color:#efe9da;font:400 4.2cqmin Georgia,serif;line-height:1.5;padding:4cqmin 4.5cqmin;border-radius:1.4cqmin;text-align:center;box-shadow:0 2cqmin 6cqmin rgba(0,0,0,.6)}'
  + '.ie-cue-full{position:absolute;inset:0;background:#0c0d12;display:flex;align-items:center;justify-content:center}'
  + '.ie-cue-full img{max-width:92%;max-height:92%;object-fit:contain;box-shadow:0 2cqmin 6cqmin rgba(0,0,0,.65)}'
  /* v0.92 design-preview poster for video scenes */
  + '.ie-vidposter{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6cqmin;color:#5ec8c8;font:600 9cqmin sans-serif}'
  + '.ie-vidposter span{font-size:2.6cqmin;font-weight:500;color:#a7a499;max-width:82%;text-align:center;word-break:break-word}'
  + '.ie-vidposter i{font-size:2cqmin;color:#6a6d79;font-style:normal;letter-spacing:.14em;text-transform:uppercase}';
  if (IE.ensureStyles) IE.ensureStyles();   // inject engine's base CSS (.ie-pano/.ie-panel/.ie-tint/...) — the frame page never calls it otherwise
  (function () { var s = D.createElement('style'); s.id = 'ie-fx-styles'; s.textContent = CSS; (D.head || D.documentElement).appendChild(s); })();

  /* ====================== SFX (WebAudio synth) ====================== */
  var _ac = null;
  function AC() { try { if (!_ac) _ac = new (g.AudioContext || g.webkitAudioContext)(); if (_ac && _ac.state === 'suspended') _ac.resume(); } catch (e) {} return _ac; }
  IE.fxUnlockAudio = function () { AC(); };
  function noise(ac, dur) { var n = ac.sampleRate * dur, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; var s = ac.createBufferSource(); s.buffer = b; return s; }
  function env(ac, node, a, peak, d) { var t = ac.currentTime, gain = ac.createGain(); gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(peak, t + a); gain.gain.exponentialRampToValueAtTime(0.0001, t + a + d); node.connect(gain); gain.connect(ac.destination); return gain; }
  var SFX = {
    thunder: function (ac) { var s = noise(ac, 2.2), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(400, ac.currentTime); f.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 1.8); s.connect(f); env(ac, f, 0.02, 0.9, 2.0); s.start(); s.stop(ac.currentTime + 2.2); },
    boom: function (ac) { var o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, ac.currentTime); o.frequency.exponentialRampToValueAtTime(35, ac.currentTime + 0.5); env(ac, o, 0.005, 0.9, 0.6); o.start(); o.stop(ac.currentTime + 0.7); },
    whoosh: function (ac) { var s = noise(ac, 0.9), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, ac.currentTime); f.frequency.exponentialRampToValueAtTime(2200, ac.currentTime + 0.5); f.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.9); s.connect(f); env(ac, f, 0.05, 0.5, 0.85); s.start(); s.stop(ac.currentTime + 0.95); },
    riser: function (ac) { var o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(80, ac.currentTime); o.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 1.1); var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f); env(ac, f, 0.4, 0.35, 0.9); o.start(); o.stop(ac.currentTime + 1.2); },
    chime: function (ac) { [660, 880, 1320].forEach(function (hz, i) { var o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = hz; var gg = ac.createGain(), t = ac.currentTime + i * 0.08; gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.3, t + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); o.connect(gg); gg.connect(ac.destination); o.start(t); o.stop(t + 1.2); }); },
    toll: function (ac) { var o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 90; var o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 135; var gg = env(ac, o, 0.005, 0.5, 2.4); o2.connect(gg); o.start(); o2.start(); o.stop(ac.currentTime + 2.5); o2.stop(ac.currentTime + 2.5); },
    zap: function (ac) { var o = ac.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1200, ac.currentTime); o.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.25); env(ac, o, 0.002, 0.35, 0.28); o.start(); o.stop(ac.currentTime + 0.3); },
    shatter: function (ac) { var s = noise(ac, 0.5), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; s.connect(f); env(ac, f, 0.002, 0.5, 0.45); s.start(); s.stop(ac.currentTime + 0.5); },
    pageturn: function (ac) { var s = noise(ac, 0.3), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7; s.connect(f); env(ac, f, 0.01, 0.25, 0.25); s.start(); s.stop(ac.currentTime + 0.3); }
  };
  var SFX_LIVE = [];   /* v1.39: live file-based sfx elements, so stopAllSfx can silence them */
  IE.playSfx = function (name) {
    if (!name || name === 'none') return;
    if (/\.(mp3|wav|ogg|m4a)$/i.test(name) || name.charAt(0) === '/') {
      try {
        var a = new Audio(name); a.volume = 0.9;
        SFX_LIVE.push(a);   /* v1.39 */
        a.addEventListener('ended', function () { var i = SFX_LIVE.indexOf(a); if (i >= 0) SFX_LIVE.splice(i, 1); });
        a.play().catch(function () {});
      } catch (e) {} return;
    }
    var ac = AC(); if (!ac || !SFX[name]) return; try { SFX[name](ac); } catch (e) {}
  };
  IE.stopAllSfx = function () {   /* v1.39: pause + release every tracked sfx element */
    for (var i = 0; i < SFX_LIVE.length; i++) { try { SFX_LIVE[i].pause(); SFX_LIVE[i].src = ''; } catch (e) {} }
    SFX_LIVE.length = 0;
  };
  /* v1.00 Social DLC — conductor-broadcast sound + event on every connected page.
     Kid-safe softens harsh events here too (buttons already morph in the app). */
  IE.onSocial = function (msg) {
    if (!msg) return;
    if (msg.stop) { try { IE.stopAllSfx(); } catch (e) {} return; }   /* v1.39: /api/audio/stop broadcast */
    var ev = msg.event;
    if (msg.kid && (ev === 'lightning' || ev === 'shake' || ev === 'glitch')) ev = 'softflash';
    var s = msg.sfx;
    if (s) IE.playSfx(s.indexOf('synth:') === 0 ? s.slice(6) : (s.charAt(0) === '/' ? s : '/' + s));
    if (ev && ev !== 'none') {
      for (var k in REVEAL_VIEWS) {
        var v = REVEAL_VIEWS[k];
        if (v && v.container && v.container.isConnected) { try { runEvent(v, ev, msg.ms); } catch (e) {} }
      }
    }
  };

  /* ====================== content builder ====================== */
  function isVid(u) { return !!(u && /\.(mp4|webm|m4v|mov)$/i.test(u)); }
  function wallW(wsz) { return 'width:' + ((wsz || 3) * 100) + '%;'; }   /* v1.40: pano strip spans the whole wall (N frames, not always 3) */
  function mediaEl(url, col, solo, fit, wsz) {   // solo=true: render whole image; false: wall-split slice. v1.18: fit = cover|contain|stretch|width|height (solo only)
    var portrait = solo;
    if (isVid(url)) {
      var vf = !portrait ? null : (fit === 'stretch' ? 'fill' : (fit === 'contain' || fit === 'width' || fit === 'height') ? 'contain' : 'cover');
      var st = portrait ? 'left:0;width:100%;height:100%;object-fit:' + vf : wallW(wsz) + 'left:' + (-col * 100) + '%;object-fit:fill';
      return '<video class="ie-pano" autoplay muted loop playsinline preload="auto" style="' + st + '"><source src="' + url + '"></video>';
    }
    if (portrait) {
      var bs = fit === 'contain' ? 'contain' : fit === 'stretch' ? '100% 100%' : fit === 'width' ? '100% auto' : fit === 'height' ? 'auto 100%' : 'cover';
      return '<div class="ie-pano" style="left:0;width:100%;background-image:url(\'' + url + '\');background-size:' + bs + ';background-position:center;background-repeat:no-repeat"></div>';
    }
    return '<div class="ie-pano" style="' + wallW(wsz) + 'left:' + (-col * 100) + '%;background-image:url(\'' + url + '\');background-size:100% 100%;background-repeat:no-repeat"></div>';
  }
  function panoLayer(img, col, gradient, wsz) {
    if (img) return mediaEl(img, col, false, null, wsz);
    return '<div class="ie-pano" style="' + wallW(wsz) + 'left:' + (-col * 100) + '%;background:' + gradient + '"></div>';
  }
  function vidPoster(url) {   // design-preview stand-in for video scenes (v0.92; v0.93 click-to-play)
    var name = decodeURIComponent(url.slice(url.lastIndexOf('/') + 1)).replace(/\.[^.]+$/, '');
    return '<div class="ie-pano" style="left:0;width:100%;background:linear-gradient(160deg,#171b26,#0b0d13)"></div>'
      + '<div class="ie-vidposter" data-src="' + url + '" style="cursor:pointer">▶<span>' + name + '</span><i>video — plays on the TVs · click to test here</i></div>';
  }
  /* v0.93: clicking a preview poster swaps in a real muted video (user gesture) */
  D.addEventListener('click', function (e) {
    var p = e.target.closest ? e.target.closest('.ie-vidposter') : null;
    if (!p || !p.dataset.src) return;
    var v = D.createElement('video');
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.className = 'ie-pano';
    v.style.cssText = 'left:0;width:100%;height:100%;object-fit:cover;position:absolute';
    v.src = p.dataset.src;
    v.onerror = function () { try { v.remove(); } catch (_) {} var i = p.querySelector('i'); if (i) i.textContent = 'this browser cannot play it — the TVs render it'; };
    var to = setTimeout(function () { if (v.readyState === 0) v.onerror(); else p.remove(); }, 4000);
    v.onplaying = function () { clearTimeout(to); try { p.remove(); } catch (_) {} };
    p.parentNode.insertBefore(v, p);
  });
  function buildLayerHTML(state, idx) {
    var g0 = IE.GAMES[state.game] || IE.GAMES.dining, m = IE.MODES[state.mode] || IE.MODES.dining;
    var kind = (state.frames && state.frames[idx]) || 'pano', col = IE.slotOf(idx), wsz = IE.wallSizeOf(idx);   /* v1.40: wall math from IE.LAYOUT */
    var img = state.frameImages && state.frameImages[idx];
    if (kind === 'pano') {
      // v1.01: mode-level wall layout (state.wallFit) overrides the per-frame guess:
      //   'fill' — every screen shows the WHOLE image (cover; best for one subject);
      //   'span' — one image STRETCHED across the wall as panorama slices;
      //   'auto'/unset — v0.81: split only when the wall shares one image, else whole.
      var solo;
      if (state.wallFit === 'fill') solo = !!img;
      else if (state.wallFit === 'span') solo = false;
      else {
        var shared = 0;   /* v1.40: "does this wall share one image?" over the wall's real frames */
        if (img && state.frameImages) IE.wallFramesOf(idx).forEach(function (k2) { if (state.frameImages[k2] === img) shared++; });
        solo = !!img && shared < 2;
      }
      return (img ? mediaEl(img, col, solo, (state.sceneFits && state.sceneFits[idx]) || 'cover', wsz) : panoLayer(null, col, g0.pano, wsz)) + (img ? '' : '<div class="ie-glyph">' + g0.glyph + '</div>') + (state.captions ? '<div class="ie-cap">' + g0.desc + '</div>' : '');
    }
    if (kind === 'off') return '<div class="ie-pano" style="' + wallW(wsz) + 'left:' + (-col * 100) + '%;background:#0c0d12"></div>';
    if (kind === 'photos') return '<div class="ie-photos"></div>';
    if (kind === 'portrait') { if (img) return mediaEl(img, col, true, (state.sceneFits && state.sceneFits[idx]) || 'cover', wsz) + (state.captions ? '<div class="ie-cap">' + g0.desc + '</div>' : ''); return portraitPanel(g0); }
    if (kind === 'score') return scorePanel(g0, state);
    if (kind === 'map') return mapPanel(g0);
    if (kind === 'clock') return clockPanel(g0, state);
    if (kind === 'viz') return vizStageHTML(state, idx);           // v1.06: 🎶 stage (bg beneath the RS-MUSIC-VIZ canvas)
    if (kind === 'playlist') return playlistStageHTML(state, idx); // v1.06: ♪ now-playing / album-art display host
    /* Phase 2d: unknown kind → labelled placeholder instead of a silently blank
       frame (a registry/renderer drift used to render overlays over nothing). */
    return '<div class="ie-panel" style="justify-content:center;align-items:center">'
      + '<div class="ie-ph">' + String(kind).replace(/[&<>"]/g, '') + '</div>'
      + '<div class="ie-sub">unknown frame kind</div></div>';
  }
  /* v1.06 true only on a real kiosk frame page (frame.html?frame=L1…). In the app's
     Design canvas there's no ?frame=, so the live animators (RS-MUSIC-VIZ / RS-PLAYLIST)
     don't run — there we draw an animated stand-in so the frame reads as a viz/playlist. */
  var IS_LIVE_FRAME = (function () { try { var q = new URLSearchParams(location.search); return !!(q.get('frame') || q.get('id')); } catch (e) { return false; } })();
  /* v1.06 background layer shared by the viz + playlist content types (image or video + dim) */
  function bgLayerHTML(bg) {
    if (!bg || !bg.url) return '';
    var dim = (bg.dim != null ? bg.dim : 0.35);
    var media = bg.video
      ? '<video class="ie-bgv" src="' + bg.url + '" autoplay muted loop playsinline></video>'
      : '<div class="ie-bgi" style="background-image:url(\'' + bg.url + '\')"></div>';
    return media + '<div class="ie-bgdim" style="background:rgba(0,0,0,' + dim + ')"></div>';
  }
  // v1.06 a frameViz/framePlaylist bg is {url,video,dim} live (conductor-resolved) but
  // {key,video,dim}+bgUrl in the app preview (previewState). Normalise to a url here.
  function bgOf(cfg) {
    if (!cfg) return null;
    if (cfg.bg && cfg.bg.url) return cfg.bg;                 // live (conductor-resolved media)
    if (cfg.bgUrl) return { url: cfg.bgUrl, video: false, dim: (cfg.bg && cfg.bg.dim != null) ? cfg.bg.dim : 0.35 };   // app preview — bgUrl is a poster image, show as image
    return null;
  }
  function vizStageHTML(state, idx) {
    var cfg = (state.frameViz && state.frameViz[idx]) || {};
    var bg = bgOf(cfg);
    var stage = bg ? bgLayerHTML(bg) : '<div class="ie-viz-stage"></div>';
    if (IS_LIVE_FRAME) return stage;                        // real TV — the RS-MUSIC-VIZ canvas draws over this
    // app preview: a per-style canvas (animated by the RS-VIZ-PREVIEW driver) over the stage
    return stage + '<canvas class="ie-vizprevcv" data-vzs="' + (cfg.style || 'cathedral') + '" data-vzc="' + (cfg.color || 'auto') + '" data-vzo="' + (cfg.ori || 'portrait') + '" data-vzi="' + idx + '"></canvas>'
      + (cfg.nowPlaying !== false ? '<div class="ie-vizprevlbl">🎶 ' + (cfg.style || 'cathedral') + (cfg.ori === 'panorama' ? ' · wall' : '') + '</div>' : '');
  }
  function playlistStageHTML(state, idx) {
    var cfg = (state.framePlaylist && state.framePlaylist[idx]) || {};
    var bg = bgOf(cfg);
    if (IS_LIVE_FRAME) return bgLayerHTML(bg) + '<div class="ie-pl" data-plhost data-pldisp="' + (cfg.display || 'nowplaying') + '"></div>';
    // app preview: a representative mock card so the frame reads as a playlist display
    var col = (cfg.color && cfg.color !== 'auto') ? (window.IE && IE.palCss ? IE.palCss(cfg.color) : cfg.color) : '#e0c88a';
    var disp = cfg.display || 'nowplaying';
    return bgLayerHTML(bg) + '<div class="ie-pl d-' + disp + '" style="--plc:' + col + '"><div class="fg">'
      + (disp === 'lyricstrip' ? '' : '<div class="art"></div>')
      + '<div class="lbl">now playing</div><div class="ttl" style="font-size:4.4cqmin">Your music</div><div class="art2">' + disp + (cfg.ori === 'panorama' ? ' · wall' : '') + '</div></div></div>';
  }
  function bar(t, p, c) { return '<div class="ie-bar"><span class="t">' + t + '</span><span class="track"><i style="width:' + p + '%;background:' + c + '"></i></span></div>'; }
  /* v1.05 LIVE SCOREBOARD — renders state.scores (RS-SCORES live match). Sorted rows with
     photo/initial disc, name+nick, big score, crown on the leader; a winner splash when
     finished. Falls back to the classic demo bars when no match is running (Design preview). */
  function scorePanel(g0, state) {
    var S = state && state.scores;
    if (!S || !S.on || !Array.isArray(S.players) || !S.players.length) {
      return '<div class="ie-panel"><div class="ie-ph" style="color:' + g0.accent + '">SCORE</div>' + bar('Red', 70, '#e0655f') + bar('Cyan', 55, '#5ec8c8') + bar('Green', 40, '#73c990') + bar('Gold', 25, '#e0b04a') + '</div>';
    }
    var PAL = ['#c9a35e', '#5ec8c8', '#73c990', '#e0655f', '#b46cc9', '#e0b04a'];
    var rows = S.players.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var top = rows[0] && rows[0].score;
    function av(p, i, size) {
      var col = p.color || PAL[i % PAL.length];
      if (p.photo) return '<span style="display:inline-block;width:' + size + 'cqmin;height:' + size + 'cqmin;border-radius:50%;background:url(\'' + p.photo + '\') center/cover;flex:none;box-shadow:0 0 0 .5cqmin ' + col + '"></span>';
      return '<span style="display:inline-flex;align-items:center;justify-content:center;width:' + size + 'cqmin;height:' + size + 'cqmin;border-radius:50%;background:' + col + ';color:#14151a;font:700 ' + (size * 0.46) + 'cqmin sans-serif;flex:none">' + (p.name || '?').charAt(0).toUpperCase() + '</span>';
    }
    if (S.finished) {
      var w = rows[0] || {};
      return '<div class="ie-panel" style="justify-content:center;align-items:center;gap:2.4cqmin">'
        + '<div style="font-size:10cqmin;line-height:1">👑</div>' + av(w, 0, 26)
        + '<div style="font:700 8.5cqmin Georgia,serif;color:' + g0.accent + '">' + (w.name || '') + '</div>'
        + (w.nick ? '<div style="font:400 4cqmin Georgia,serif;color:#b9ac8f">“' + w.nick + '”</div>' : '')
        + '<div style="font:600 4.4cqmin sans-serif;letter-spacing:.6cqmin;color:#e8e6df;opacity:.9">WINNER · ' + (w.score || 0) + '</div></div>';
    }
    return '<div class="ie-panel"><div class="ie-ph" style="color:' + g0.accent + '">SCORES</div>'
      + rows.map(function (p, i) {
        var lead = (p.score === top && rows.length > 1);
        return '<div style="display:flex;align-items:center;gap:2.4cqmin;padding:1.8cqmin 0;border-bottom:1px solid rgba(255,255,255,.07)">'
          + av(p, i, 9)
          + '<span style="flex:1;min-width:0;font:600 4.6cqmin sans-serif;color:#e8e6df;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (p.name || '') + (lead ? ' <span style="font-size:3.6cqmin">👑</span>' : '') + (p.nick ? '<div style="font:400 2.8cqmin sans-serif;color:#8a8d99">“' + p.nick + '”</div>' : '') + '</span>'
          + '<span style="font:700 8cqmin/1 ui-monospace,monospace;color:' + (lead ? g0.accent : '#e8e6df') + ';font-variant-numeric:tabular-nums">' + (p.score || 0) + '</span></div>';
      }).join('') + '</div>';
  }
  function mapPanel(g0) { return '<div class="ie-panel"><div class="ie-ph" style="color:' + g0.accent + '">◰ MAP</div><div style="flex:1;background:' + g0.pano + ';border-radius:6px;opacity:.55"></div></div>'; }
  /* v1.04 room timer/clock — structure built once per style/bg/label; the number ticks
     locally via updateClock() from the anchor in state.timer (see renderFrame). */
  function fmtClock(T) {
    var d = new Date(), hh = d.getHours(), mm = d.getMinutes();
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    if (T.h24) return p2(hh) + ':' + p2(mm);
    hh = hh % 12; if (hh === 0) hh = 12; return hh + ':' + p2(mm);
  }
  function fmtDur(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    return h > 0 ? (h + ':' + p2(m) + ':' + p2(ss)) : (m + ':' + p2(ss));
  }
  function timerValueMs(T) {
    var est = Date.now() + (T._off || 0);
    var el = (T.baseElapsedMs || 0) + (T.running ? (est - T.startMs) : 0);
    if (T.type === 'down') return Math.max(0, (T.durationMs || 0) - el);
    if (T.type === 'up') return el;
    return 0;
  }
  function timerColour(T, remMs, accent) {
    var col = T.color || accent, pulse = false, best = null;
    if (T.type === 'down' && Array.isArray(T.triggers)) {
      T.triggers.forEach(function (tr) {
        if (tr.visual && tr.atMs != null && remMs <= tr.atMs && (best === null || tr.atMs < best)) {
          best = tr.atMs; col = tr.visual === 'red' ? '#e0655f' : tr.visual === 'amber' ? '#e0b04a' : (T.color || accent); pulse = !!tr.pulse;
        }
      });
    }
    return { col: col, pulse: pulse };
  }
  /* v1.17 chain awareness — state.timer.chain {steps,idx,loop,autoStart,count,active}.
     Rendered as a small caption above the number (clock frames + takeover overlay). */
  function chainCaption(ch) {
    if (!ch || !ch.active) return '';
    var n = ch.count || (Array.isArray(ch.steps) ? ch.steps.length : 0);
    var i = (ch.idx || 0) + 1;
    return n ? ('Round ' + i + '/' + n) : ('Round ' + i);
  }
  function tEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  /* v1.17 chess seats — 2–8 players; above 4 the grid goes two-up so a portrait 4K
     frame keeps the numbers readable from the far side of the room. */
  function chessBody(T) {
    var ch = T.chess || {}, ps = Array.isArray(ch.players) ? ch.players : [];
    return '<div class="ie-tcgrid">' + ps.map(function (p, i) {
      return '<div class="ie-tcseat" data-tcseat="' + i + '">'
        + '<div class="ie-tcname">' + tEsc(p.name || ('P' + (i + 1))) + '</div>'
        + '<div class="ie-tctime" data-tcnum="' + i + '">0:00</div></div>';
    }).join('') + '</div>';
  }
  /* v1.17 hourglass — clip ids must be unique because the app's Design canvas paints all
     six frames into ONE document (duplicate ids would all resolve to the first). */
  var _sandSeq = 0;
  function sandBody() {
    var id = 'ietsand' + (++_sandSeq), tc = id + 't', bc = id + 'b';
    return '<svg class="ie-tsand" data-tsand viewBox="0 0 100 100">'
      + '<defs><clipPath id="' + tc + '"><path d="M20 12H80L53 50H47Z"/></clipPath>'
      + '<clipPath id="' + bc + '"><path d="M47 50H53L80 88H20Z"/></clipPath></defs>'
      + '<rect class="ie-tsandfill" data-tsandtop x="18" y="12" width="64" height="38" clip-path="url(#' + tc + ')"/>'
      + '<rect class="ie-tsandstream" data-tsandstream x="49.3" y="50" width="1.4" height="38"/>'
      + '<g class="ie-tsandpile"><rect class="ie-tsandfill" data-tsandbot x="18" y="50" width="64" height="38" clip-path="url(#' + bc + ')"/></g>'
      + '<path class="ie-tsandg" data-tsandout d="M20 12H80L53 50L80 88H20L47 50Z"/>'
      + '<path class="ie-tsandcap" data-tsandcap d="M17 12H83M17 88H83"/>'
      + '</svg><div class="ie-tnum ie-tsub" data-tnum>0:00</div>';
  }
  function clockPanel(g0, state) {
    var T = state.timer || { style: 'digital', type: 'down' };
    var style = T.style || 'digital', bg = T.bg || {};
    // v1.17: chess owns the whole panel — an empty roster falls back to the normal styles
    var chess = !!(T.type === 'chess' && T.chess && Array.isArray(T.chess.players) && T.chess.players.length);
    var bgHtml = '';
    if (bg.type === 'image' && bg.url) bgHtml = '<div class="ie-tbg" style="background-image:url(\'' + bg.url + '\')"></div><div class="ie-tbgdim"></div>';
    else if (bg.type === 'video' && bg.url) bgHtml = '<video class="ie-tbg" src="' + bg.url + '" autoplay muted loop playsinline></video><div class="ie-tbgdim"></div>';
    var body;
    if (chess) body = chessBody(T);
    else if (style === 'analog') body = '<svg class="ie-tanalog" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="ie-tdial"/><line x1="50" y1="50" x2="50" y2="12" class="ie-thand" data-thand/></svg><div class="ie-tnum ie-tsub" data-tnum>0:00</div>';
    else if (style === 'ring') body = '<svg class="ie-tringsvg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="ie-tringbg"/><circle cx="50" cy="50" r="44" class="ie-tringfg" data-tring/></svg><div class="ie-tnum" data-tnum>0:00</div>';
    else if (style === 'sand') body = sandBody();           // v1.17
    else if (style === 'flip') body = '<div class="ie-tflip" data-tflip></div>';
    else body = '<div class="ie-tnum ie-tstyle-' + style + '" data-tnum>0:00</div>';
    var cls = 'ie-tclock ie-ts-' + (chess ? 'chess' : style)
      + (chess && (T.chess && T.chess.players || []).length > 4 ? ' two' : '');
    return '<div class="' + cls + '" data-tclock' + (chess ? ' data-tchess' : '') + ' data-accent="' + (g0.accent || '#c9a35e') + '">' + bgHtml
      + '<div class="ie-tinner"><div class="ie-tlabel" data-tlabel style="display:none"></div>'
      + '<div class="ie-tround" data-tround style="display:none"></div>' + body + '</div></div>';
  }
  /* v1.17 chess tick — live remaining for the seat on move is its stored ms minus the
     time since turnStartMs, measured on the SERVER clock (T._off skew, same as the main
     timer) so all six frames agree to the tick. */
  function updateChess(view, root, T) {
    var ch = T.chess || {}, ps = Array.isArray(ch.players) ? ch.players : [];
    var accent = root.getAttribute('data-accent') || '#c9a35e', col = T.color || accent;
    var est = Date.now() + (T._off || 0);
    for (var i = 0; i < ps.length; i++) {
      var seat = root.querySelector('[data-tcseat="' + i + '"]'); if (!seat) continue;
      var rem = Math.max(0, ps[i].ms || 0);
      if (i === ch.turn && ch.running && ch.turnStartMs) rem = Math.max(0, rem - (est - ch.turnStartMs));
      var flagged = (ch.flagged === i) || rem <= 0;
      var active = (i === ch.turn) && !flagged;
      var numEl = seat.querySelector('[data-tcnum="' + i + '"]');
      if (numEl) {
        var txt = fmtDur(rem);
        if (numEl.textContent !== txt) numEl.textContent = txt;
        numEl.style.color = flagged ? '#e0655f' : (active ? col : '#e8e6df');
      }
      seat.classList.toggle('on', active);
      seat.classList.toggle('flag', !!flagged);
      seat.style.borderColor = flagged ? '' : (active ? col : '');
    }
  }
  function updateClock(view) {
    var T = view._timer; if (!T) return;
    var root = view.cur && view.cur.querySelector('[data-tclock]'); if (!root) return;
    var rnd = root.querySelector('[data-tround]');
    if (T._hide) {
      var nn = root.querySelectorAll('[data-tnum],[data-tcnum]'); for (var q = 0; q < nn.length; q++) nn[q].textContent = '';
      var lb0 = root.querySelector('[data-tlabel]'); if (lb0) lb0.style.display = 'none';
      if (rnd) rnd.style.display = 'none';
      var gr0 = root.querySelector('.ie-tcgrid'); if (gr0) gr0.style.visibility = 'hidden';
      return;
    }
    var gr1 = root.querySelector('.ie-tcgrid'); if (gr1) gr1.style.visibility = '';
    if (rnd) {                                              // v1.17 chain caption
      var rt = chainCaption(T.chain);
      if (rnd._t !== rt) { rnd._t = rt; rnd.textContent = rt; }
      rnd.style.display = rt ? '' : 'none';
    }
    var accent = root.getAttribute('data-accent') || '#c9a35e', isClock = T.type === 'clock';
    if (root.hasAttribute('data-tchess')) {                 // v1.17 chess owns the panel
      var lbC = root.querySelector('[data-tlabel]');
      if (lbC) { if ((T.label || '') !== lbC._t) { lbC._t = T.label || ''; lbC.textContent = T.label || ''; } lbC.style.display = T.label ? '' : 'none'; lbC.style.color = T.color || accent; }
      try { updateChess(view, root, T); } catch (e) {}
      return;
    }
    var valMs = timerValueMs(T), txt = isClock ? fmtClock(T) : fmtDur(valMs);
    var vis = isClock ? { col: (T.color || accent), pulse: false } : timerColour(T, valMs, accent);
    var lab = root.querySelector('[data-tlabel]');
    if (lab) { if ((T.label || '') !== lab._t) { lab._t = T.label || ''; lab.textContent = T.label || ''; } lab.style.display = T.label ? '' : 'none'; lab.style.color = vis.col; }
    var nums = root.querySelectorAll('[data-tnum]');
    for (var i = 0; i < nums.length; i++) { if (nums[i].textContent !== txt) nums[i].textContent = txt; nums[i].style.color = vis.col; }
    root.classList.toggle('ie-tpulse', !!vis.pulse && T.running);
    var flip = root.querySelector('[data-tflip]');
    if (flip && flip._t !== txt) { flip._t = txt; flip.innerHTML = txt.split('').map(function (ch) { return ch === ':' ? '<span class="ie-tcolon">:</span>' : '<span class="ie-tcard" style="color:' + vis.col + '">' + ch + '</span>'; }).join(''); }
    var ring = root.querySelector('[data-tring]');
    if (ring) { var frac = 0; if (T.type === 'down' && T.durationMs > 0) frac = valMs / T.durationMs; else if (T.type === 'up' && T.targetMs > 0) frac = Math.min(1, valMs / T.targetMs); var C = 2 * Math.PI * 44; ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C * (1 - frac); ring.style.stroke = vis.col; }
    var hand = root.querySelector('[data-thand]');
    if (hand) { var ang; if (isClock) { var d = new Date(); ang = ((d.getMinutes() + d.getSeconds() / 60) / 60) * 360; } else { ang = ((Math.floor(valMs / 1000) % 60) / 60) * 360; } hand.setAttribute('transform', 'rotate(' + ang + ' 50 50)'); hand.style.stroke = vis.col; }
    /* v1.17 sand — same fraction maths as the ring; with no target ('up' without
       targetMs, or 'clock') the glass stays full and only the number moves. */
    var sand = root.querySelector('[data-tsand]');
    if (sand) try {
      var sf = 1;
      if (T.type === 'down' && T.durationMs > 0) sf = valMs / T.durationMs;
      else if (T.type === 'up' && T.targetMs > 0) sf = 1 - Math.min(1, valMs / T.targetMs);
      sf = Math.max(0, Math.min(1, sf));
      var TOP = 12, NECK = 50, FOOT = 88, HT = NECK - TOP, HB = FOOT - NECK;
      var sTop = sand.querySelector('[data-tsandtop]'), sBot = sand.querySelector('[data-tsandbot]');
      if (sTop) { sTop.setAttribute('y', (NECK - sf * HT).toFixed(2)); sTop.setAttribute('height', (sf * HT).toFixed(2)); sTop.setAttribute('fill', vis.col); }
      if (sBot) { var bf = 1 - sf; sBot.setAttribute('y', (FOOT - bf * HB).toFixed(2)); sBot.setAttribute('height', (bf * HB).toFixed(2)); sBot.setAttribute('fill', vis.col); }
      var sStr = sand.querySelector('[data-tsandstream]'); if (sStr) sStr.setAttribute('fill', vis.col);
      var sOut = sand.querySelector('[data-tsandout]'); if (sOut) sOut.setAttribute('stroke', vis.col);
      var sCap = sand.querySelector('[data-tsandcap]'); if (sCap) sCap.setAttribute('stroke', vis.col);
      sand.classList.toggle('run', !!T.running && sf > 0 && sf < 1);
    } catch (e) {}
  }
  function portraitPanel(g0) { return '<div class="ie-panel" style="justify-content:center;align-items:center"><div style="font-size:18vmin">' + g0.glyph + '</div><div class="ie-sub" style="color:' + g0.accent + ';margin-top:2vmin">Narrator</div></div>'; }
  function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); }

  /* ====================== transitions ====================== */
  function reflow(el) { return el.offsetWidth; }
  /* v0.91: Chromium has a hard per-process cap on media elements; discarded
     <video>s must be explicitly released or the pool starves and every new
     video silently sticks at readyState 0 (stale frames, desynced previews). */
  function releaseMedia(root) {
    if (!root || !root.querySelectorAll) return;
    try { root.querySelectorAll('video').forEach(function (v) { try { v.pause(); v.removeAttribute('src'); while (v.firstChild) v.removeChild(v.firstChild); v.load(); } catch (e) {} }); } catch (e) {}
  }
  /* v0.94: autoplay is unreliable for <video> parsed inside a detached layer that is
     appended later (kiosk scene videos froze on frame 0 while identical effect videos,
     parsed into an attached node, played). Kick playback explicitly and re-kick when
     data arrives. */
  function kickMedia(root) {
    if (!root || !root.querySelectorAll) return;
    try { root.querySelectorAll('video').forEach(function (v) {
      v.muted = true;
      var go = function () { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} };
      go();
      v.addEventListener('loadeddata', go, { once: true });
      v.addEventListener('canplay', go, { once: true });
    }); } catch (e) {}
  }
  function set(el, o) { for (var k in o) el.style[k] = o[k]; }
  function clampStyle(s, kid) { if (kid && (s === 'cut' || s === 'glitch')) return 'crossfade'; return s || 'crossfade'; }
  function clampAmb(a) { if (!a) return 'kenburns'; return a; }
  function clampEvent(e, kid) { if (!e || e === 'none') return null; if (kid && (e === 'lightning' || e === 'shake' || e === 'glitch')) return 'softflash'; return e; }

  /* v0.97 REVEAL — a still that plays a paired video ONCE on trigger, then crossfades
     back to the still (looks like the art suddenly coming alive, then settling). Manual
     trigger: POST /api/reveal -> engine Bus -> IE.playReveal(frame). Random auto-trigger:
     per-mode state.reveal.trigger==='random'. Config resolved by conductor into state.reveal
     = { videos[6], trigger, everyS, jitter, fadeS }. The reveal video layers over the scene
     stage, so fading it out re-exposes the untouched still beneath = seamless return. */
  var REVEAL_VIEWS = {};
  function playRevealOnView(view) {
    if (!view || !view.container || !view.container.isConnected) return;
    var rv = view._reveal; if (!rv || !rv.videos) return;
    var __rl=(rv.reels&&rv.reels[view.idx])||null; var url=(__rl&&__rl.length)?__rl[Math.floor(Math.random()*__rl.length)]:rv.videos[view.idx]; if (!url) return;
    if (view._revealBusy) return;                 // never stack reveals on one frame
    view._revealBusy = true;
    var fade = Math.max(0.1, rv.fadeS != null ? rv.fadeS : 0.6);
    var layer = D.createElement('div');
    layer.className = 'ie-reveal-layer';
    layer.style.cssText = 'position:absolute;inset:0;z-index:6;opacity:0;background:#000;transition:opacity ' + fade + 's ease';
    // v1.07: src set DIRECTLY on the <video> — a 404/decode failure on a <source>
    // CHILD fires 'error' on the source element, not the video, so the error
    // handler below never ran and a missing reveal file meant an opaque black
    // frame for the full 90s safety window, repeating every trigger cycle.
    layer.innerHTML = '<video muted playsinline preload="auto" style="width:100%;height:100%;object-fit:cover;display:block"></video>';
    view.stage.appendChild(layer);
    var vid = layer.querySelector('video');
    vid.src = url;
    var cleanup = function () { try { releaseMedia(layer); } catch (e) {} if (layer.parentNode) layer.parentNode.removeChild(layer); view._revealBusy = false; };
    var backed = false;
    var fadeBack = function () { if (backed) return; backed = true; layer.style.opacity = '0'; setTimeout(cleanup, fade * 1000 + 120); };
    vid.addEventListener('ended', fadeBack);
    vid.addEventListener('error', function () { if (!backed) { backed = true; cleanup(); } });
    kickMedia(layer);
    try { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    requestAnimationFrame(function () { layer.style.opacity = '1'; });
    // v1.07: readiness check — if nothing has loaded after 5s (stalled share,
    // wedged decoder), settle back to the still instead of sitting black.
    setTimeout(function () { if (view._revealBusy && !backed && vid.readyState === 0) fadeBack(); }, 5000);
    setTimeout(function () { if (view._revealBusy) fadeBack(); }, 90000);   // safety if 'ended' never fires
  }
  function scheduleRandomReveal(view) {
    if (view._revealTimer) { clearTimeout(view._revealTimer); view._revealTimer = null; }
    var rv = view._reveal; if (!rv || rv.trigger !== 'random') return;
    if (!((rv.reels&&rv.reels[view.idx]&&rv.reels[view.idx].length)||(rv.videos&&rv.videos[view.idx]))) return;
    var base = Math.max(8, rv.everyS || 180) * 1000;
    var jit = rv.jitter != null ? rv.jitter : 0.5;
    var delay = Math.max(8000, base * (1 + (Math.random() * 2 - 1) * jit));
    view._revealTimer = setTimeout(function () {
      view._revealTimer = null;
      if (!view.container || !view.container.isConnected) return;
      playRevealOnView(view);
      scheduleRandomReveal(view);
    }, delay);
  }
  IE.playReveal = function (frameId) {
    if (frameId && REVEAL_VIEWS[frameId]) { playRevealOnView(REVEAL_VIEWS[frameId]); return; }
    for (var k in REVEAL_VIEWS) playRevealOnView(REVEAL_VIEWS[k]);   // no id (e.g. wall-test) -> all frames
  };

  /* ============ v1.17 WALL TAKEOVER ============
     The conductor (v3.72) puts the takeover in TWO places: state.timer.takeover
     { on, until, ms, style, color, label } on every state push, and a WS message
     { type:'timerTakeover', ... }. engine.js's handle() dispatches only a fixed set of
     message types (state/hello/reload/social/reveal/audio/identify) and engine.js is
     off-limits here, so THE STATE KEY IS THE SOURCE OF TRUTH — the overlay arms, ticks
     and disarms from state.timer.takeover in renderFrame. IE.onTimerTakeover below is a
     no-cost fast path: if engine.js ever forwards the new type (or the app posts it into
     a preview iframe) the overlay appears on the same tick instead of the next push. The
     pushed value never *removes* an overlay on its own — it only extends `until` — so a
     dropped/duplicated WS message cannot desync the wall.

     Layering: z-index 12. Highest in this file are .ie-id (9), .ie-bezelsh (8),
     .ie-cue/.ie-fxover (6); the overlay hangs off view.container, NOT view.stage, so
     scene transitions repaint underneath it and the frame returns to exactly what it
     was showing when the takeover clears. No <video> is created, so there is nothing
     for kickMedia/releaseMedia to do here. */
  var TAKEOVER_Z = 12;
  var _tkPush = null;                         // last WS-pushed takeover (may stay null forever)
  function takeoverOf(state) {
    var T = state && state.timer, tk = (T && T.takeover) || null;
    if (tk && tk.on === false) tk = null;
    if (_tkPush && _tkPush.until <= Date.now() - 5000) _tkPush = null;   // 5s grace covers clock skew
    if (_tkPush && (!tk || _tkPush.until > (tk.until || 0))) tk = _tkPush;
    return tk;
  }
  function tkRemaining(view, tk) {
    if (!tk || !tk.until) return 0;
    return Math.max(0, tk.until - (Date.now() + (view._tkOff || 0)));   // server clock, same skew as the timer
  }
  function dropTakeover(view) {
    if (view._tkTimer) { clearInterval(view._tkTimer); view._tkTimer = null; }
    view._tk = null;
    var el = view.tko; if (!el) return;
    view.tko = null;
    el.classList.remove('on');
    setTimeout(function () { try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) {} }, 460);
  }
  function paintTakeover(view) {
    var tk = view._tk, el = view.tko; if (!tk || !el) return;
    var rem = tkRemaining(view, tk);
    if (rem <= 0) { dropTakeover(view); return; }              // auto-remove at `until`
    var sty = 'ie-tko ie-tkos-' + (tk.style || 'digital');
    if (el._sty !== sty) { el._sty = sty; el.className = sty + (el.classList.contains('on') ? ' on' : ''); }
    var col = tk.color || view._tkAccent || '#c9a35e';
    var num = el.querySelector('[data-tknum]');
    if (num) { var txt = fmtDur(rem); if (num.textContent !== txt) num.textContent = txt; num.style.color = col; }
    var lab = el.querySelector('[data-tklabel]');
    if (lab) { var lt = tk.label || ''; if (lab._t !== lt) { lab._t = lt; lab.textContent = lt; } lab.style.display = lt ? '' : 'none'; lab.style.color = col; }
    var rnd = el.querySelector('[data-tkround]');
    if (rnd) { var rt = chainCaption(view._tkChain); if (rnd._t !== rt) { rnd._t = rt; rnd.textContent = rt; } rnd.style.display = rt ? '' : 'none'; }
    // kid-safe: steady display, never a strobe (same gate idiom as clampStyle/clampEvent)
    el.classList.toggle('pulse', !view._kid && rem <= 10000);
    // art-mode dimming: the overlay sits above .ie-dim, so mirror the room's dim here
    var inner = el.querySelector('.ie-tkoin');
    if (inner) inner.style.opacity = String(Math.max(0.45, 1 - (view._roomDark || 0) * 0.5));
  }
  function syncTakeover(view, tk) {
    if (!view || !view.container) return;
    if (!tk || tkRemaining(view, tk) <= 0) { dropTakeover(view); return; }   // null takeover -> fade out
    view._tk = tk;
    if (!view.tko) {                                          // idempotent create — never stacks
      var el = D.createElement('div');
      el._sty = 'ie-tko ie-tkos-' + (tk.style || 'digital');
      el.className = el._sty;
      el.style.zIndex = TAKEOVER_Z;
      el.innerHTML = '<div class="ie-tkoin">'
        + '<div class="ie-tround" data-tkround style="display:none"></div>'
        + '<div class="ie-tkolabel" data-tklabel style="display:none"></div>'
        + '<div class="ie-tkonum" data-tknum>0:00</div></div>';
      view.container.appendChild(el);
      view.tko = el;
      requestAnimationFrame(function () { if (view.tko === el) el.classList.add('on'); });
    }
    // one interval per view; it dies with the view (detached container OR the container
    // re-initialised onto a new view object — initView() wipes innerHTML under us)
    if (!view._tkTimer) view._tkTimer = setInterval(function () {
      if (!view.container.isConnected || view.container._ieView !== view) { clearInterval(view._tkTimer); view._tkTimer = null; dropTakeover(view); return; }
      paintTakeover(view);
    }, 250);
    paintTakeover(view);
  }
  /* Optional fast path (see note above) — safe to call from anywhere; a stale or
     duplicate push is ignored because it only ever pushes `until` forward. */
  IE.onTimerTakeover = function (msg) {
    if (!msg || !msg.until) return;
    if (_tkPush && _tkPush.until >= msg.until) return;
    _tkPush = { on: true, until: msg.until, ms: msg.ms, style: msg.style, color: msg.color, label: msg.label };
    for (var k in REVEAL_VIEWS) {
      var v = REVEAL_VIEWS[k];
      if (v && v.container && v.container.isConnected) { try { syncTakeover(v, takeoverOf({ timer: { takeover: v._tk } })); } catch (e) {} }
    }
  };
  /* postMessage carriers (app preview iframes / wall-test) reach fx.js directly; the WS
     path does not, hence the state key remains authoritative. */
  g.addEventListener('message', function (e) {
    var d = e && e.data;
    if (d && d.ie && d.type === 'timerTakeover') { try { IE.onTimerTakeover(d); } catch (_) {} }
  });

  function cssTransition(view, style, nlayer, olayer, dur, ease, accent) {
    var stage = view.stage, done = function () {
      if (olayer) { releaseMedia(olayer); if (olayer.parentNode) olayer.parentNode.removeChild(olayer); }
      // force the resting state so a frame can never get stranded mid-transition (e.g. tab was backgrounded)
      nlayer.style.transition = 'none'; nlayer.style.opacity = '1'; nlayer.style.filter = 'none'; nlayer.style.transform = 'none'; nlayer.style.clipPath = 'none';
    };
    if (style === 'cut') { set(nlayer, { opacity: '1' }); setTimeout(done, 30); return; }
    if (style === 'glitch') { set(nlayer, { opacity: '1' }); nlayer.classList.add('ie-tglitch'); setTimeout(done, 500); return; }
    if (style === 'pixelate') { set(nlayer, { opacity: '0' }); reflow(nlayer); nlayer.classList.add('ie-tpix'); nlayer.style.transition = 'opacity ' + dur + 'ms ' + ease; set(nlayer, { opacity: '1' }); setTimeout(done, dur); return; }
    if (style === 'dipblack' || style === 'dipwhite' || style === 'dipaccent') {
      var cover = D.createElement('div'); cover.className = 'ie-cover';
      cover.style.background = style === 'dipblack' ? '#05060a' : style === 'dipwhite' ? '#eef2f7' : ('rgba(' + hexToRgb(accent) + ',.9)');
      cover.style.zIndex = '5'; stage.appendChild(cover);
      set(nlayer, { opacity: '1' }); var half = dur / 2;
      cover.style.transition = 'opacity ' + half + 'ms ease'; reflow(cover); cover.style.opacity = '1';
      setTimeout(function () { done(); cover.style.opacity = '0'; setTimeout(function () { if (cover.parentNode) cover.parentNode.removeChild(cover); }, half + 40); }, half);
      return;
    }
    var endS = 'opacity ' + dur + 'ms ' + ease + ', filter ' + dur + 'ms ' + ease + ', transform ' + dur + 'ms ' + ease + ', clip-path ' + dur + 'ms ' + ease, startS;
    switch (style) {
      case 'blurfade': startS = { opacity: '0', filter: 'blur(16px)', transform: 'scale(1.05)' }; break;
      case 'rackfocus': startS = { opacity: '0', filter: 'blur(22px)' }; break;
      case 'zoomblur': startS = { opacity: '0', filter: 'blur(24px)', transform: 'scale(1.5)' }; break;
      case 'pushleft': startS = { transform: 'translateX(100%)' }; break;
      case 'pushright': startS = { transform: 'translateX(-100%)' }; break;
      case 'wipe': case 'blinds': startS = { clipPath: 'inset(0 100% 0 0)' }; break;
      case 'iris': case 'ripple': startS = { clipPath: 'circle(0% at 50% 50%)', filter: 'blur(6px)' }; break;
      case 'morph': startS = { opacity: '0', filter: 'blur(28px) contrast(1.2)', transform: 'scale(1.08)' }; break;
      default: startS = { opacity: '0' };
    }
    set(nlayer, startS); reflow(nlayer); nlayer.style.transition = endS;
    set(nlayer, { opacity: '1', filter: 'none', transform: 'none' });
    if (style === 'iris' || style === 'ripple') nlayer.style.clipPath = 'circle(150% at 50% 50%)';
    else if (style === 'wipe' || style === 'blinds') nlayer.style.clipPath = 'inset(0 0 0 0)';
    setTimeout(done, dur + 30);
  }

  /* ====================== WebGL ripple/morph (optional, auto-fallback) ====================== */
  var FS = 'precision mediump float;uniform sampler2D u0;uniform sampler2D u1;uniform float p;uniform float mode;uniform float col;uniform float slots;varying vec2 v;'
    + 'void main(){vec2 uv=vec2((v.x+col)/slots,1.0-v.y);'   /* v1.40: slice width = 1/wall-size, not 1/3 */
    + 'if(mode<0.5){float d=sin((v.y+p)*22.0)*0.02*(1.0-abs(p-0.5)*2.0);vec2 o=vec2(d,0.0);vec4 a=texture2D(u0,uv+o);vec4 b=texture2D(u1,uv-o);gl_FragColor=mix(a,b,smoothstep(0.0,1.0,p));}'
    + 'else{float n=fract(sin(dot(floor(v*24.0),vec2(12.9,78.2)))*43758.5);float m=smoothstep(p-0.25,p+0.25,n);vec2 o=vec2((0.5-n)*0.06*(1.0-p),0.0);vec4 a=texture2D(u0,uv+o);vec4 b=texture2D(u1,uv);gl_FragColor=mix(a,b,m);}}';
  var VS = 'attribute vec2 a;varying vec2 v;void main(){v=(a+1.0)*0.5;gl_Position=vec4(a,0.0,1.0);}';
  function tex(gl, img) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); return t; }
  function glTransition(view, style, newImg, col, dur, onFail, onDone) {
    if (!IE.fxEnableGL || view._glBad) return onFail();
    var oldUrl = view.prevImg, newUrl = newImg;
    if (!oldUrl || !newUrl) return onFail();
    var ia = new Image(), ib = new Image(); ia.crossOrigin = ib.crossOrigin = 'anonymous'; var loaded = 0, failed = false;
    function fail() { if (!failed) { failed = true; view._glBad = true; onFail(); } }
    ia.onerror = ib.onerror = fail;
    ia.onload = ib.onload = function () { if (++loaded < 2) return; try { runGL(); } catch (e) { fail(); } };
    ia.src = oldUrl; ib.src = newUrl;
    function runGL() {
      var cv = D.createElement('canvas'); cv.className = 'ie-glcanvas'; cv.style.zIndex = '4';
      var r = view.stage.getBoundingClientRect(); cv.width = Math.max(2, r.width | 0); cv.height = Math.max(2, r.height | 0);
      var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl'); if (!gl) return fail();
      function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw 'sh'; return s; }
      var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return fail();
      gl.useProgram(pr);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var la = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
      var t0 = tex(gl, ia), t1 = tex(gl, ib);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t0); gl.uniform1i(gl.getUniformLocation(pr, 'u0'), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t1); gl.uniform1i(gl.getUniformLocation(pr, 'u1'), 1);
      gl.uniform1f(gl.getUniformLocation(pr, 'mode'), style === 'ripple' ? 0.0 : 1.0);
      gl.uniform1f(gl.getUniformLocation(pr, 'col'), col);
      gl.uniform1f(gl.getUniformLocation(pr, 'slots'), IE.wallSizeOf(view.idx) || 3);   /* v1.40 */
      var uP = gl.getUniformLocation(pr, 'p');
      view.stage.appendChild(cv);
      var start = performance.now(), checked = false;
      function frame(now) {
        var p = Math.min(1, (now - start) / dur);
        gl.viewport(0, 0, cv.width, cv.height); gl.uniform1f(uP, p); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!checked && p > 0.15) { checked = true; try { var px = new Uint8Array(4); gl.readPixels((cv.width / 2) | 0, (cv.height / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (px[0] + px[1] + px[2] === 0 && px[3] === 0) { if (cv.parentNode) cv.parentNode.removeChild(cv); return fail(); } } catch (e) {} }
        if (p < 1) requestAnimationFrame(frame); else { if (cv.parentNode) cv.parentNode.removeChild(cv); onDone(); }
      }
      requestAnimationFrame(frame);
    }
  }

  /* ====================== event effects ====================== */
  /* v1.28 intro media takeover — full-frame image/video (contain over black) */
  function syncIntroMedia(view, state, fid) {
    var md = state.introMedia;
    var show = !!(md && md.media && (!md.frames || !md.frames.length || md.frames.indexOf(fid) >= 0));
    var key = show ? (md.ts + '|' + md.media) : 'off';
    if (view._imKey === key) return;
    view._imKey = key;
    if (view._im) { try { view._im.remove(); } catch (e) {} view._im = null; }
    if (!show) return;
    var w = D.createElement('div');
    w.style.cssText = 'position:absolute;inset:0;background:#000;z-index:8;pointer-events:none';
    if (isVid(md.media)) {
      var v = D.createElement('video');
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.style.cssText = 'width:100%;height:100%;object-fit:contain';
      v.src = md.media; w.appendChild(v);
      try { v.play().catch(function () {}); } catch (e) {}
    } else {
      w.style.backgroundImage = 'url(\'' + md.media + '\')';
      w.style.backgroundSize = 'contain'; w.style.backgroundPosition = 'center'; w.style.backgroundRepeat = 'no-repeat';
    }
    view.container.appendChild(w); view._im = w;
  }
  /* ============== v1.38 RS-GAMES wall overlay (state.partyGame mirror) ============== */
  var PG_CSS = '.ie-pg{position:absolute;inset:0;z-index:8;pointer-events:none;background:rgba(5,6,10,.93);color:#e8e6df;font-family:Georgia,serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;transition:opacity .45s ease;overflow:hidden}'
    + '.ie-pg.on{opacity:1}'
    + '.ie-pg.blk{background:#000}'
    + '.ie-pg .pgk{font-size:12cqmin;line-height:1}'
    + '.ie-pg .pgt{font-size:4.6cqmin;letter-spacing:.5cqmin;text-transform:uppercase;color:#c9a35e;margin-top:2cqmin}'
    + '.ie-pg-word{font-size:10.5cqmin;line-height:1.15;color:#e3c489;padding:0 4cqmin;word-break:break-word;max-width:94cqmin}'
    + '.ie-pg-timer{font-size:8.5cqmin;margin-top:3cqmin;font-variant-numeric:tabular-nums}'
    + '.ie-pg-timer.low{color:#e0655f}'
    + '.ie-pg-rules{width:80cqmin;background:#f2eee4;color:#2b2a26;text-align:left;font-size:3.4cqmin;line-height:1.65;padding:3.2cqmin 3.8cqmin;border-radius:.8cqmin;box-shadow:0 1cqmin 3cqmin rgba(0,0,0,.5)}'
    + '.ie-pg-rules b{display:block;font-size:4.6cqmin;margin-bottom:.6cqmin}'
    + '.ie-pg-rules i{display:block;width:8cqmin;height:.5cqmin;background:#b9a77c;margin:0 0 1.8cqmin;font-style:normal}'
    + '.ie-pg-score{width:82cqmin;font-size:4.8cqmin;text-align:left}'
    + '.ie-pg-score .r{display:flex;justify-content:space-between;gap:2cqmin;padding:1.7cqmin .6cqmin;border-bottom:1px solid rgba(201,163,94,.25)}'
    + '.ie-pg-score .r b{color:#e3c489}'
    + '.ie-pg-score .r.dead{opacity:.4;text-decoration:line-through}'
    + '.ie-pg-ans{font-size:6.4cqmin;line-height:1.3;padding:0 5cqmin;max-width:94cqmin;word-break:break-word}'
    + '.ie-pg-ans .L{display:block;font-size:17cqmin;color:#c9a35e;line-height:1.1;margin-bottom:2cqmin}'
    + '.ie-pg.bloom{background:radial-gradient(circle at 50% 42%,rgba(115,201,144,.4),rgba(4,10,6,.97))}'
    + '.ie-pg.bloom .L{color:#73c990}'
    + '@keyframes iepgpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}'
    + '.ie-pg.bloom .ie-pg-ans,.ie-pg .pgk.pulse{animation:iepgpulse 1.2s ease infinite}'
    + '.ie-pg-sub{font-size:3.6cqmin;color:#a7a499;margin-top:2.6cqmin;padding:0 5cqmin;font-family:-apple-system,Segoe UI,sans-serif}';
  function pgCss() {
    if (D.getElementById('ie-pg-css')) return;
    var st = D.createElement('style'); st.id = 'ie-pg-css'; st.textContent = PG_CSS;
    D.head.appendChild(st);
  }
  var PG_RULES = {
    'charades:headsup': ['Act it out — no talking, no lip-syncing', 'Guesser: eyes FRONT — the word is behind your head!', '✓ Got it +1 · ⏭ Pass −1', 'Beat the clock!'],
    'charades:classic': ['The actor peeks at ONE screen only', 'Everyone else shouts their guesses', '✓ Got it +1 · ⏭ Pass −1', 'Beat the clock!'],
    'charades:reverse': ['The whole team acts the word together', 'One player faces away and guesses', '✓ Got it +1 · ⏭ Pass −1', 'Beat the clock!'],
    'musicquiz': ['Listen to the snippet…', 'First to shout the song wins the point', 'The host taps the winner', 'Reveal shows the track — and plays it out'],
    'quiz': ['The question fills the wall', 'A · B · C · D live on the corner TVs', 'Stand under your answer!', 'Wrong corners go dark — the right one blooms'],
    'werewolf': ['Night: eyes closed while the room speaks', 'Wolves hunt · Seer peeks · Healer saves', 'Day: debate, accuse, banish', 'The village wins when the wolves are gone']
  };
  /* Phase 2c: quiz answer corners come from the layout's corners role (falls
     back to the classic map when no layout has been adopted, e.g. file://).
     Only the first four corner frames carry A–D. */
  var PG_CORNER_FALLBACK = { L1: 0, L3: 1, R1: 2, R3: 3 };
  function pgCornerIx(fid) {
    var L = window.__rsLayout;
    var cs = (L && L.roles && L.roles.corners) || (IE.LAYOUT && IE.LAYOUT.roles && IE.LAYOUT.roles.corners);
    if (cs && cs.length) { var ix = cs.indexOf(fid); return (ix >= 0 && ix < 4) ? ix : null; }
    var v = PG_CORNER_FALLBACK[fid]; return v == null ? null : v;
  }
  function pgEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function pgFmt(ms) { var t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  function pgScores(pg) {
    var rows = pg.players.slice();
    if (pg.id !== 'werewolf') rows.sort(function (a, b) { return b.score - a.score; });
    return '<div class="pgt">' + pgEsc(pg.icon + ' scores') + '</div><div class="ie-pg-score" style="margin-top:3cqmin">'
      + rows.map(function (p) {
          var dead = pg.id === 'werewolf' && p.alive === false;
          return '<div class="r' + (dead ? ' dead' : '') + '"><span>' + pgEsc(p.name) + '</span><b>' + (pg.id === 'werewolf' ? (dead ? '☠' : '●') : p.score) + '</b></div>';
        }).join('') + '</div>';
  }
  function pgRulesCard(pg) {
    var key = pg.id === 'charades' ? ('charades:' + (pg.variant || 'headsup')) : pg.id;
    var lines = PG_RULES[key] || PG_RULES[pg.id] || [];
    return '<div class="ie-pg-rules"><b>' + pgEsc(pg.icon + ' ' + pg.name) + '</b><i></i>'
      + lines.map(function (l) { return '• ' + pgEsc(l) + '<br>'; }).join('') + '</div>';
  }
  function pgGameScreen(pg, fid) {
    var h = '';
    if (pg.id === 'charades') {
      var cur = (pg.players[pg.turnIx] || {}).name || '';
      if (pg.phase === 'between') return '<div class="pgk">🔔</div><div class="ie-pg-word" style="font-size:8cqmin">Time’s up!</div><div class="ie-pg-sub">Next up: ' + pgEsc((pg.players[(pg.turnIx + 1) % pg.players.length] || {}).name || '') + '</div>';
      var tmr = '<div class="ie-pg-timer" data-pgtimer>' + (pg.phase === 'paused' ? '⏸' : '') + '</div>';
      if (fid === pg.wordTv && pg.card) return '<div class="ie-pg-word">' + pgEsc(pg.card.text) + '</div>' + tmr;
      if (pg.variant === 'classic') return '<div class="pgk">🗣</div><div class="ie-pg-word" style="font-size:7cqmin">Shout your guesses!</div>' + tmr;
      return '<div class="pgk">😶</div><div class="ie-pg-word" style="font-size:7cqmin">' + pgEsc(cur) + ' — no peeking!</div>' + tmr;
    }
    if (pg.id === 'quiz') {
      var q = pg.question;
      if (pg.phase === 'over' || !q) return '<div class="pgk">🏆</div><div class="ie-pg-word" style="font-size:8cqmin">That’s the quiz!</div>';
      h = '<div class="pgt">Question ' + q.n + ' of ' + q.total + '</div><div class="ie-pg-word" style="font-size:7cqmin;margin-top:3cqmin">' + pgEsc(q.q) + '</div>';
      if (q.revealed) h += '<div class="ie-pg-sub" style="color:#73c990;font-size:5cqmin">✓ ' + pgEsc(q.answer) + '</div>';
      return h;
    }
    if (pg.id === 'musicquiz') {
      var tr = pg.track || {};
      h = '<div class="pgt">Track ' + (tr.n || 1) + '</div>';
      if (tr.revealed) return h + '<div class="pgk">💿</div><div class="ie-pg-word" style="font-size:6.6cqmin">' + pgEsc(tr.title || 'Name that tune!') + '</div>';
      if (tr.playing) return h + '<div class="pgk pulse">🎵</div><div class="ie-pg-word" style="font-size:7cqmin">Listen…</div>';
      return h + '<div class="pgk">🎵</div><div class="ie-pg-word" style="font-size:7cqmin">First shout wins!</div>';
    }
    if (pg.id === 'werewolf') {
      if (pg.phase === 'over') return '<div class="pgk">' + (pg.winner === 'wolves' ? '🐺' : '🏡') + '</div><div class="ie-pg-word" style="font-size:8cqmin">' + (pg.winner === 'wolves' ? 'The wolves win!' : 'The village wins!') + '</div>';
      if (pg.phase === 'night') return '<div class="pgk">🌙</div><div class="ie-pg-word" style="font-size:7.6cqmin">Night ' + pg.night + '</div><div class="ie-pg-sub">Everyone — eyes closed</div>';
      if (pg.phase === 'day' || pg.phase === 'dusk') return '<div class="pgk">☀️</div><div class="ie-pg-word" style="font-size:7cqmin">' + (pg.victim ? pgEsc(pg.victim) + ' didn’t survive the night' : 'Everyone survived the night') + '</div><div class="ie-pg-sub">Debate… then vote</div>';
      return '<div class="pgk">🐺</div><div class="ie-pg-word" style="font-size:7cqmin">The village gathers…</div><div class="ie-pg-sub">Roles are being dealt — keep yours secret</div>';
    }
    return '<div class="pgk">' + pgEsc(pg.icon) + '</div><div class="pgt">' + pgEsc(pg.name) + '</div>';
  }
  function syncPartyGame(view, state, fid) {
    var pg = state.partyGame;
    var off = !pg || !pg.id;
    if (off) {
      if (view._pgT) { clearInterval(view._pgT); view._pgT = null; }
      if (view._pgWrong) { view._pgWrong = false; blackoutView(view, false); }
      if (view._pg) { var elo = view._pg; view._pg = null; view._pgKey = null; elo.classList.remove('on'); setTimeout(function () { try { if (elo.parentNode) elo.parentNode.removeChild(elo); } catch (e) {} }, 480); }
      return;
    }
    pgCss();
    var cornerIx = pgCornerIx(fid);   /* Phase 2c */
    var quizCorner = pg.id === 'quiz' && pg.question && pg.question.opts && (pg.phase === 'question' || pg.phase === 'reveal') && cornerIx != null;
    var wrongReveal = quizCorner && pg.question.revealed && cornerIx !== pg.question.correctIx;
    /* reveal blacks out the wrong corners via the v1.28 blackout machinery */
    if (wrongReveal && !view._pgWrong) { view._pgWrong = true; blackoutView(view, true, 30000); }
    else if (!wrongReveal && view._pgWrong) { view._pgWrong = false; blackoutView(view, false); }
    var key = pg.id + '|' + (pg.v || 0) + '|' + fid;
    if (view._pgKey !== key) {
      view._pgKey = key;
      var el = view._pg;
      if (!el) {
        el = D.createElement('div'); el.className = 'ie-pg';
        view.container.appendChild(el); view._pg = el;
        requestAnimationFrame(function () { if (view._pg === el) el.classList.add('on'); });
      }
      var cls = 'ie-pg' + (el.classList.contains('on') ? ' on' : ''), html = '';
      if (quizCorner) {
        if (wrongReveal) { cls += ' blk'; html = ''; }
        else {
          if (pg.question.revealed) cls += ' bloom';
          html = '<div class="ie-pg-ans"><span class="L">' + 'ABCD'.charAt(cornerIx) + '</span>' + pgEsc(pg.question.opts[cornerIx] || '') + '</div>';
        }
      } else {
        /* Phase 2c: wall position, not frame-id literals — slot 0 = rules card,
           last slot = scores, everything between = game screen. Single-frame
           walls and unknown ids get the game screen. Identical to the old
           L1/R1 · L3/R3 · L2/R2 split on the reference layout. */
        var pgFi = IE.FRAME_IDS.indexOf(fid);
        var pgWsz = pgFi >= 0 ? IE.wallSizeOf(pgFi) : 0, pgSlot = pgFi >= 0 ? IE.slotOf(pgFi) : -1;
        if (pgWsz > 1 && pgSlot === 0) html = pgRulesCard(pg);
        else if (pgWsz > 1 && pgSlot === pgWsz - 1) html = pgScores(pg);
        else html = pgGameScreen(pg, fid);
      }
      el.className = cls;
      el.innerHTML = html;
    }
    /* charades round clock — local tick off the shared endsAt */
    var needT = pg.id === 'charades' && pg.endsAt && pg.phase === 'round' && view._pg && view._pg.querySelector('[data-pgtimer]');
    if (needT && !view._pgT) view._pgT = setInterval(function () {
      if (!view.container.isConnected || view.container._ieView !== view) { clearInterval(view._pgT); view._pgT = null; return; }
      var tEl = view._pg && view._pg.querySelector('[data-pgtimer]'); if (!tEl) return;
      var st2 = (view._pgSt && view._pgSt.partyGame) || pg;
      if (!st2.endsAt) return;
      var rem = st2.endsAt - Date.now();
      var txt = pgFmt(rem);
      if (tEl.textContent !== txt) tEl.textContent = txt;
      tEl.classList.toggle('low', rem <= 10000);
    }, 250);
    if (!needT && view._pgT && !(pg.id === 'charades' && pg.phase === 'round')) { clearInterval(view._pgT); view._pgT = null; }
    view._pgSt = state;
    if (needT) { var t0 = view._pg.querySelector('[data-pgtimer]'); if (t0 && !t0.textContent) t0.textContent = pgFmt(pg.endsAt - Date.now()); }
  }

  function blackoutView(view, on, ms) {   // v1.28 — held black wash, above fx flashes
    var b = view._blk;
    if (!b) { b = D.createElement('div'); b.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;transition:opacity .35s ease;pointer-events:none;z-index:7'; view.container.appendChild(b); view._blk = b; }
    clearTimeout(view._blkT);
    b.style.opacity = on ? '1' : '0';
    if (on && ms) view._blkT = setTimeout(function () { b.style.opacity = '0'; }, ms);
  }
  function runEvent(view, ev, ms) {
    if (ev === 'blackout') return blackoutView(view, true, ms || 8000);
    if (ev === 'blackclear') return blackoutView(view, false);
    ev = clampEvent(ev, view._kid); if (!ev) return;
    if (ev === 'shake') { view.container.classList.remove('ie-shake'); reflow(view.container); view.container.classList.add('ie-shake'); setTimeout(function () { view.container.classList.remove('ie-shake'); }, 520); return; }
    var cls = ev === 'lightning' ? 'ie-ev-lightning' : (ev === 'bloom' || ev === 'ignite') ? 'ie-ev-bloom' : ev === 'softflash' ? 'ie-ev-softflash' : ev === 'whiteflash' ? 'ie-ev-whiteflash' : null;
    if (!cls) return;
    var o = view.fxover; o.className = 'ie-fxover'; reflow(o); o.classList.add(cls);
    setTimeout(function () { o.className = 'ie-fxover'; }, 1700);
  }

  /* ====================== chroma-key (green screen -> transparent) ====================== */
  var _ckCache = {};
  function chromaKey(url, tol, despill, cb) {
    var key = url + '|' + tol + '|' + (despill ? 1 : 0);
    if (_ckCache[key]) { cb(_ckCache[key]); return; }
    var img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        var c = D.createElement('canvas'); c.width = img.naturalWidth || 512; c.height = img.naturalHeight || 512;
        var x = c.getContext('2d'); x.drawImage(img, 0, 0);
        var d = x.getImageData(0, 0, c.width, c.height), p = d.data;
        for (var i = 0; i < p.length; i += 4) {
          var r = p[i], g = p[i + 1], b = p[i + 2], mx = r > b ? r : b, gr = g - mx;   // "greenness"
          if (gr > tol) { p[i + 3] = 0; }                                              // fully green -> transparent
          else if (gr > tol * 0.5) { p[i + 3] = Math.round(255 * (tol - gr) / (tol * 0.5)); if (despill && g > mx) p[i + 1] = mx; } // soft edge + despill
          else if (despill && gr > 10) { p[i + 1] = mx + 10; }                          // reduce green fringe on kept pixels
        }
        x.putImageData(d, 0, 0); var out = c.toDataURL('image/png');
        // v1.07: cap the cache — each entry is a multi-MB full-res data URL and
        // nothing evicted, so mode-hopping on a 24/7 kiosk grew it unbounded.
        var ks = Object.keys(_ckCache); if (ks.length >= 6) delete _ckCache[ks[0]];
        _ckCache[key] = out; cb(out);
      } catch (e) { cb(url); }
    };
    img.onerror = function () { cb(url); };
    img.src = url;
  }
  IE.chromaKey = chromaKey;   // exposed so the editor can render keyed overlay thumbnails

  /* ====================== art-mode decor (matte / shadows / tone) ====================== */
  function shade(hex, f, add) {   // scale + offset each RGB channel of #rrggbb
    hex = (hex || '#f2eee4').replace('#', ''); if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16), r = (n >> 16) & 255, g2 = (n >> 8) & 255, b = n & 255;
    function c(v) { v = Math.round(v * f + (add || 0)); return v < 0 ? 0 : v > 255 ? 255 : v; }
    return 'rgb(' + c(r) + ',' + c(g2) + ',' + c(b) + ')';
  }
  var PAPER_SVG = 'url("data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="240" height="240" filter="url(%23n)" opacity="0.05"/></svg>') + '")';
  function matteBg(color, texture) {
    if (texture === 'linen') return 'repeating-linear-gradient(0deg,rgba(0,0,0,.025) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,rgba(0,0,0,.02) 0 1px,transparent 1px 3px) ' + color;
    if (texture === 'paper') return PAPER_SVG + ' ' + color;
    return color;
  }
  function applyMatte(view, mt) {
    var on = mt && mt.on !== false;
    // tint + dim are inset too, so the matte stays bright ivory (like real mount
    // board) instead of being greyed by the scene's tint/dim overlays
    var parts = [view.stage, view.efx, view.ovl, view.ambov, view.fxover, view.bevel, view.tint, view.dim];
    if (!on) {
      view.container.style.background = '';
      parts.forEach(function (el) { el.style.inset = '0'; });
      view.bevel.style.display = 'none'; view.bezelsh.style.display = 'none';
      return;
    }
    var w = (mt.width != null ? mt.width : 7), col = mt.color || '#f2eee4', ins = w + 'cqmin';
    view.container.style.background = matteBg(col, mt.texture || 'paper');
    parts.forEach(function (el) { el.style.inset = ins; });
    // bevel: thin light-catching "cut edge" ring on the matte + soft shadow cast onto the art
    view.bevel.style.display = 'block';
    view.bevel.style.boxShadow = '0 0 0 .45cqmin ' + shade(col, 1.06, 14) + ', 0 .12cqmin .3cqmin .45cqmin rgba(0,0,0,.28), inset 0 .5cqmin 1.6cqmin rgba(0,0,0,.38), inset 0 0 .35cqmin rgba(0,0,0,.28)';
    // bezel: the TV frame's lip casting onto the matte
    view.bezelsh.style.display = 'block';
  }

  /* ====================== photo frames (v0.4) ====================== */
  /* kind 'photos': slideshow from a folder under Photos/ (conductor /api/photos).
     Deterministic from wall-clock time + frame index, so all frames tick together
     with no extra sync traffic. Landscape photos on a portrait TV are stacked;
     'collage' scatters 3-5 photos per frame like a gallery wall. */
  var _phLists = {};                       // dir -> {photos:[{url,w,h}], ts} (dims filled lazily)
  function phSeed(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  function phRand(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function phShuffled(n, seed) { var a = []; for (var i = 0; i < n; i++) a[i] = i; var rnd = phRand(seed); for (var j = n - 1; j > 0; j--) { var k = Math.floor(rnd() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; } return a; }
  function phFetch(dir, cb) {
    var c = _phLists[dir];
    if (c && Date.now() - c.ts < 300000) return cb(c.photos);   // 5-min cache; Rescan not needed
    fetch('api/photos?dir=' + encodeURIComponent(dir)).then(function (r) { return r.json(); })
      .then(function (j) { var ph = (j.photos || []).map(function (u) { return { url: u, w: 0, h: 0 }; }); _phLists[dir] = { photos: ph, ts: Date.now() }; cb(ph); })
      .catch(function () { cb((c && c.photos) || []); });
  }
  function phTick(cfg) { var iv = Math.max(3, cfg.intervalS || 20) * 1000; return Math.floor(Date.now() / iv); }   // v0.7: interval = seconds between individual changes
  function nrDeck(n, dir, era, W) {                     // v1.02: era deck + seam repair — head photos that
    var d = phShuffled(n, phSeed(dir + '|nr|' + era));  // ended the PREVIOUS era get swapped deep into the middle
    if (era > 0 && W > 0) {
      var prev = phShuffled(n, phSeed(dir + '|nr|' + (era - 1)));
      var hot = {}; for (var i = n - W; i < n; i++) hot[prev[i]] = 1;
      var mid = Math.floor(n / 2);
      for (var p = 0; p < W; p++) if (hot[d[p]]) { var q = (mid + p) % n; if (hot[d[q]]) q = (mid + W + p) % n; var t = d[p]; d[p] = d[q]; d[q] = t; }
    }
    return d;
  }
  function phPick(photos, cfg, tick, slot, frameIdx, nCells) {  // v1.03: slice+lane picker — a photo can NEVER appear on two frames at once
    // Each frame owns a disjoint 1/6th slice of the (shuffled) library, and each
    // cell owns a disjoint lane inside that slice — so simultaneous cells can
    // never collide, regardless of layout mix (single / triptych / grid12 / ...).
    // Slices rotate every ERA_P changes so every frame sees the whole library.
    // (v1.02's deck stride used the frame's OWN cell count, which collided on
    // mixed-layout walls; the old seq/shuffle paths spaced frames by 3 cells,
    // which any grid bigger than 3 overflowed.)
    var n = photos.length; if (!n) return null;
    var L = Math.max(1, nCells || 1), f6 = ((frameIdx % 6) + 6) % 6;
    var S = Math.floor(n / 6), ERA_P = 240;                    // ERA_P is GLOBAL — identical on every frame, keeps slice rotation in lock-step
    if (S >= 1) {
      var era = Math.floor(tick / ERA_P);
      var si = (((f6 + era) % 6) + 6) % 6;
      var start = si * S, size = (si === 5) ? (n - 5 * S) : S; // last slice absorbs the n%6 remainder
      if (size >= L) {
        var lane = Math.max(1, Math.floor(size / L));
        var pos = start + (slot % L) * lane + (((tick % lane) + lane) % lane);
        if (cfg.order === 'seq') return photos[pos];           // chronological order, still collision-free
        var d = nrDeck(n, (cfg.dir || ''), era, Math.min(24, Math.floor(n / 3)));
        return photos[d[pos]];
      }
    }
    // Tiny library (fewer photos than 6 x cells): uniqueness is mathematically
    // impossible — fall back to a spread walk (24-cell spacing, was 3).
    var step = tick * 7 + f6 * 24 + slot;
    if (cfg.order === 'seq') return photos[((f6 * 24 + slot + tick) % n + n) % n];
    var cyc = Math.floor(step / n), sh = phShuffled(n, phSeed((cfg.dir || '') + '|' + cyc));
    return photos[sh[((step % n) + n) % n]];
  }
  
function phUrl(ph, wPct) {                            // ALWAYS server-resize (sharp) — never push a multi-MB original to a 2160px TV (18 big cells at once = memory blow-up, blank photos)
    var w = wPct <= 14 ? 320 : wPct <= 30 ? 640 : wPct < 55 ? 1080 : 2160;
    var fn = ph.url.slice(ph.url.lastIndexOf('/') + 1);
    var rel = decodeURIComponent(ph.url.slice(8));      // strip '/photos/'
    return '/thumb/' + fn + '?src=photos&w=' + w + '&v=2&p=' + encodeURIComponent(rel);   /* v=2 busts pre-EXIF-fix browser caches */
  }
  function phGrid(cols, rows, gap, pad, rnd, rotJ, jit) {
    var cells = [], cw = (100 - pad * 2 - gap * (cols - 1)) / cols, ch = (100 - pad * 2 - gap * (rows - 1)) / rows;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = pad + c * (cw + gap), y = pad + r * (ch + gap);
      if (jit) { x += (rnd() - .5) * jit; y += (rnd() - .5) * jit; }
      cells.push({ x: x, y: y, w: cw, h: ch, rot: rotJ ? (rnd() - .5) * 2 * rotJ : 0 });
    }
    return cells;
  }
  /* layout catalogue — o = {rnd, land (first photo landscape?), cfg} */
  var PHL = {
    maximise: function (o) { return o.land ? { cells: phGrid(1, 3, 0.8, 0, o.rnd, 0, 0), border: '' } : { cells: [{ x: 0, y: 0, w: 100, h: 100, rot: 0 }], border: '' }; },
    single:   function (o) { return { cells: [{ x: 6, y: 6, w: 88, h: 88, rot: 0 }], border: 'b' }; },
    pair:     function (o) { return { cells: phGrid(1, 2, 2.5, 4, o.rnd, 0, 0), border: 'b' }; },
    triptych: function (o) { return { cells: phGrid(1, 3, 2.5, 4, o.rnd, 0, 0), border: 'b' }; },
    quad:     function (o) { return { cells: phGrid(2, 2, 2.5, 4, o.rnd, 0, 0), border: 'b' }; },
    grid6:    function (o) { return { cells: phGrid(2, 3, 2, 3, o.rnd, 0, 0), border: 'b' }; },
    grid12:   function (o) { return { cells: phGrid(3, 4, 1.6, 2.5, o.rnd, 0, 0), border: 'bt' }; },
    grid24:   function (o) { return { cells: phGrid(4, 6, 1.2, 2, o.rnd, 0, 0), border: 'bt' }; },
    wall:     function (o) { return { cells: phGrid(6, 10, 1, 1.8, o.rnd, 2.5, 0.7), border: 'bt' }; },
    megawall: function (o) { return { cells: phGrid(8, 14, 0.7, 1.2, o.rnd, 2, 0.4), border: 'bt' }; },
    mosaic:   function (o) { return { cells: phGrid(8, 13, 0, 0, o.rnd, 0, 0), border: '' }; },
    collage:  function (o) {
      var z = phGrid(2, 3, 0, 2, o.rnd, 7, 6);
      z.forEach(function (c) { var s = 1 + o.rnd() * .35; c.w *= s; c.h *= (0.85 + o.rnd() * .45);
        c.x = Math.max(-4, Math.min(104 - c.w, c.x - c.w * .08)); c.y = Math.max(-3, Math.min(103 - c.h, c.y - c.h * .06)); });
      return { cells: z, border: 'b' };
    },
    polaroid: function (o) {
      var z = phGrid(2, 3, 1, 3, o.rnd, 9, 5);
      z.forEach(function (c) {
        var s = 1 + o.rnd() * .18; c.w *= s;
        c.h = c.w * 0.66;                                  // square-ish print incl. bottom strip (9:16 canvas: h% ≈ w% * 9/16 * 1.17)
        c.x = Math.max(-3, Math.min(103 - c.w, c.x)); c.y = Math.max(-2, Math.min(102 - c.h, c.y));
      });
      return { cells: z, border: 'pol' };
    },
    filmstrip:function (o) { return { cells: phGrid(1, 5, 1.4, 1.5, o.rnd, 0, 0).map(function (c) { c.x = 12.5; c.w = 75; return c; }), border: 'bt', host: 'film' }; },
    hero:     function (o) { var cells = [{ x: 3, y: 3, w: 94, h: 60, rot: 0 }]; for (var i = 0; i < 3; i++) cells.push({ x: 3 + i * 32.3, y: 66, w: 29.5, h: 31, rot: 0 }); return { cells: cells, border: 'b' }; },
    salon:    function (o) { return { cells: [
      { x: 5, y: 4, w: 55, h: 34, rot: 0 }, { x: 64, y: 4, w: 31, h: 20, rot: 0 }, { x: 64, y: 27, w: 31, h: 11, rot: 0 },
      { x: 5, y: 41, w: 26, h: 19, rot: 0 }, { x: 34, y: 41, w: 61, h: 19, rot: 0 },
      { x: 5, y: 63, w: 42, h: 32, rot: 0 }, { x: 50, y: 63, w: 45, h: 15, rot: 0 }, { x: 50, y: 81, w: 45, h: 14, rot: 0 }
    ], border: 'b' }; },
    stack:    function (o) { var n = Math.max(2, Math.min(4, (o.cfg && o.cfg.perFrame) || 3)); return { cells: phGrid(1, n, 2.2, 3, o.rnd, 0, 0), border: 'b' }; },
    tetris:   function (o) { return { cells: phGrid(4, 7, 1.2, 2, o.rnd, 0, 0), border: 'bt', tet: true }; },
    auto:     function (o) { return o.land ? PHL.triptych(o) : PHL.single(o); }
  };
  /* turn order (v0.8): returns {pos, bands}. Sweep modes cluster cells into
     BANDS (whole rows / columns / rings) that change together; sparkle and
     cascade give every cell its own turn. */
  function phOrder(mode, cells, seed) {
    var n = cells.length, ix = cells.map(function (c, i) { return i; });
    function cluster(keyF, thr) {
      var arr = ix.slice().sort(function (a, b) { return keyF(cells[a]) - keyF(cells[b]) || a - b; });
      var pos = [], band = 0, last = null;
      arr.forEach(function (ci) { var k = keyF(cells[ci]); if (last !== null && k - last > thr) band++; last = k; pos[ci] = band; });
      return { pos: pos, bands: band + 1 };
    }
    function quantize(keyF, nb) {                        // continuous keys (rings/diagonals): split range into nb bands
      var ks = cells.map(keyF), lo = Math.min.apply(0, ks), hi = Math.max.apply(0, ks) + 0.001;
      var pos = ks.map(function (k) { return Math.min(nb - 1, Math.floor((k - lo) / (hi - lo) * nb)); });
      return { pos: pos, bands: nb };
    }
    if (mode === 'rows') return cluster(function (c) { return c.y + c.h / 2; }, 3);
    if (mode === 'cols') return cluster(function (c) { return c.x + c.w / 2; }, 3);
    if (mode === 'diag') return quantize(function (c) { return c.x + c.w / 2 + c.y + c.h / 2; }, Math.min(6, n));
    if (mode === 'centre') return quantize(function (c) { var dx = c.x + c.w / 2 - 50, dy = c.y + c.h / 2 - 50; return Math.sqrt(dx * dx + dy * dy); }, Math.min(5, n));
    if (mode === 'sparkle') { var sh = phShuffled(n, seed), pos = []; sh.forEach(function (ci, p) { pos[ci] = p; }); return { pos: pos, bands: n }; }
    return { pos: ix.slice(), bands: n };                // 'cascade' / default: layout order
  }
  /* v0.7 living-wall renderer: cell geometry is built ONCE and never moves.
     Each cell double-buffers two image layers and crossfades in place, so the
     background is never exposed. Each interval, exactly ONE cell changes
     (ordered by the swap pattern) — except swap:'all', which changes every
     cell together. Deterministic from wall-clock, so frames stay in sync. */
  function renderPhotos(view, state, cfg) {
    var host = view.cur && view.cur.querySelector('.ie-photos'); if (!host) return;
    var tick = phTick(cfg);
    if (host._tick === tick && host._geo) return;                // nothing to do this pass
    host._tick = tick;
    phFetch(cfg.dir || '', function (photos) {
      if (!photos.length) { if (!host._empty) { host._empty = 1; host.innerHTML = '<div class="ie-phempty">No photos in Photos/' + (cfg.dir || '?') + '</div>'; } return; }
      var idx = view.idx, mode = cfg.swap || 'sparkle';
      var fadeS = Math.max(0.2, Math.min(20, cfg.fadeS || 1.2));
      var geoSig = [cfg.layout, cfg.dir, mode, cfg.perFrame, fadeS, photos.length, cfg.matStyle || ''].join('|');
      function cellK(cell) { return mode === 'all' ? tick : Math.floor((tick - cell.pos) / host._bands); }
      function setImg(cell, k, fade) {
        var ph = phPick(photos, cfg, k, cell.s, idx, host._cells.length); if (!ph) return;
        var url = phUrl(ph, cell.w);
        if (!fade) { var f = cell.imgs[cell.front]; f.style.backgroundImage = "url('" + url + "')"; f.classList.add('on'); return; }
        var back = cell.imgs[1 - cell.front], front = cell.imgs[cell.front];
        var im = new Image();
        im.onload = function () {
          back.style.backgroundImage = "url('" + url + "')";
          back.style.zIndex = 2; front.style.zIndex = 1;
          void back.offsetWidth;
          back.classList.add('on');                              // incoming fades in OVER the old photo
          cell.front = 1 - cell.front;
          setTimeout(function () { front.classList.remove('on'); }, fadeS * 1000 + 200);   // retire old only after cover
        };
        im.src = url;
      }
      /* tetris: photos fall and stack bottom-up, hold, fade away, repeat */
      function updateTetris() {
        var N = host._cells.length, span = N + 3;                // +3 ticks: hold, fade-out, blank
        var epoch = Math.floor(tick / span), step = tick - epoch * span;
        if (host._epoch !== epoch) {
          host._epoch = epoch;
          host.style.transition = 'none'; host.style.opacity = '1';
          host._cells.forEach(function (cell) { cell.k = null; cell.el.style.visibility = 'hidden'; cell.imgs[0].classList.remove('on'); cell.imgs[1].classList.remove('on'); });
        }
        host._cells.forEach(function (cell) {
          if (cell.pos < Math.min(step, N) && cell.k === null) {
            cell.k = epoch;
            var ph = phPick(photos, cfg, epoch, cell.s, idx, host._cells.length); if (!ph) return;
            var f = cell.imgs[cell.front];
            f.style.backgroundImage = "url('" + phUrl(ph, cell.w) + "')"; f.classList.add('on');
            var el = cell.el;
            el.style.visibility = 'visible';
            el.style.transition = 'none'; el.style.transform = 'translateY(-' + (cell.yh + 6).toFixed(1) + 'cqh)';
            void el.offsetWidth;
            el.style.transition = 'transform ' + Math.max(0.5, Math.min(3, fadeS)) + 's cubic-bezier(.3,.85,.35,1.02)';
            el.style.transform = 'translateY(0)';
          }
        });
        if (step === N + 1) { host.style.transition = 'opacity ' + fadeS + 's ease'; host.style.opacity = '0'; }
        if (step >= N + 1) {                                     // pre-warm the next drop while faded
          var e2 = epoch + 1, pre = [];
          host._cells.forEach(function (cell) { var ph = phPick(photos, cfg, e2, cell.s, idx, host._cells.length); if (ph) { var im = new Image(); im.src = phUrl(ph, cell.w); pre.push(im); } });
          host._pre = pre;
        }
      }
      function update() {
        if (host._tet) return updateTetris();
        host._cells.forEach(function (cell) {
          var k = cellK(cell);
          if (cell.k === null) { cell.k = k; setImg(cell, k, false); }
          else if (k !== cell.k) { cell.k = k; setImg(cell, k, true); }
        });
        var t2 = tick + 1, pre = [];                             // pre-warm whatever changes next
        host._cells.forEach(function (cell) {
          var k2 = mode === 'all' ? t2 : Math.floor((t2 - cell.pos) / host._bands);
          if (k2 !== cell.k) { var ph = phPick(photos, cfg, k2, cell.s, idx, host._cells.length); if (ph) { var im = new Image(); im.src = phUrl(ph, cell.w); pre.push(im); } }
        });
        host._pre = pre;
      }
      function build(land) {
        var rnd = phRand(phSeed((cfg.dir || '') + '|' + idx + '|' + (cfg.layout || 'auto')));   // NO tick: geometry is stable
        var builder = PHL[cfg.layout || 'auto'] || PHL.auto;
        var L = builder({ rnd: rnd, land: land, cfg: cfg });
        host.className = 'ie-photos' + (L.host ? ' ie-ph-' + L.host : '');
        host.innerHTML = ''; host._empty = 0; host._tet = !!L.tet; host._epoch = null;
        var order, ordRnd = phRand(phSeed('ord|' + (cfg.dir || '') + '|' + idx));
        if (L.tet) {                                             // fall order: bottom rows first, shuffled within each row
          var byRow = phOrder('rows', L.cells, 0), fall = [];
          var rowsOf = {}; L.cells.forEach(function (c, i) { (rowsOf[byRow.pos[i]] = rowsOf[byRow.pos[i]] || []).push(i); });
          Object.keys(rowsOf).sort(function (a, b) { return b - a; }).forEach(function (r) {
            var row = rowsOf[r]; for (var j = row.length - 1; j > 0; j--) { var kk = Math.floor(ordRnd() * (j + 1)); var t3 = row[j]; row[j] = row[kk]; row[kk] = t3; }
            row.forEach(function (ci) { fall.push(ci); });
          });
          order = { pos: [], bands: L.cells.length };
          fall.forEach(function (ci, p) { order.pos[ci] = p; });
        } else order = phOrder(mode, L.cells, phSeed('ord|' + (cfg.dir || '') + '|' + idx));
        host._bands = order.bands;
        host._cells = L.cells.map(function (c, s) {
          var el = D.createElement('div');
          el.className = 'ie-phcell ' + (L.border || '') + (cfg.matStyle === 'recessed' ? ' rec' : '');
          el.style.cssText = 'left:' + c.x.toFixed(2) + '%;top:' + c.y.toFixed(2) + '%;width:' + c.w.toFixed(2) + '%;height:' + c.h.toFixed(2) + '%' + (c.rot ? ';transform:rotate(' + c.rot.toFixed(1) + 'deg)' : '') + (L.tet ? ';visibility:hidden' : '');
          el.innerHTML = '<div class="ie-phimg" style="transition-duration:' + fadeS + 's"></div><div class="ie-phimg" style="transition-duration:' + fadeS + 's"></div>' + (cfg.matStyle === 'recessed' ? '<div class="ie-phshade"></div>' : '');
          host.appendChild(el);
          return { el: el, imgs: el.children, front: 0, k: null, w: c.w, yh: c.y + c.h, pos: order.pos[s], s: s };
        });
        host._geo = geoSig;
        update();
      }
      if (host._geo === geoSig) return update();
      var f0 = photos[0];
      if (!f0.w) {
        var im0 = new Image();
        im0.onload = function () { f0.w = im0.naturalWidth; f0.h = im0.naturalHeight; build(f0.w > f0.h); };
        im0.onerror = function () { f0.w = 4; f0.h = 3; build(false); };
        im0.src = f0.url;
      } else build(f0.w > f0.h);
    });
  }
  function initView(container, frameId) {
    container.className = 'ie-frame';
    container.innerHTML = '<div class="ie-stage"></div><div class="ie-efx"></div><img class="ie-ovl" data-ovl style="display:none" alt=""><div class="ie-ambov"></div><div class="ie-fxover"></div><div class="ie-bevel"></div><div class="ie-bezelsh"></div><div class="ie-tint"></div><div class="ie-dim"></div><div class="ie-cue"></div><div class="ie-halo"></div><div class="ie-id" data-ieid></div>';
    var q = function (s) { return container.querySelector(s); };
    var ix = IE.frameIndex(frameId); if (ix < 0) ix = 0;
    return { container: container, frameId: frameId, idx: ix,
      stage: q('.ie-stage'), efx: q('.ie-efx'), ovl: q('.ie-ovl'), ambov: q('.ie-ambov'), fxover: q('.ie-fxover'), bevel: q('.ie-bevel'), bezelsh: q('.ie-bezelsh'), tint: q('.ie-tint'), dim: q('.ie-dim'), cue: q('.ie-cue'), cueKey: null, halo: q('.ie-halo'), id: q('.ie-id'),
      cur: null, sig: null, amb: null, evKey: null, mode: null, prevImg: null, curImg: null, ovlKey: null, _ovTok: 0, idHidden: false, _kid: false, _glBad: false,
      matteKey: null, shKey: null, toneKey: null, effKey: null,
      tko: null, _tk: null, _tkTimer: null, _tkOff: 0, _tkAccent: null, _tkChain: null, _roomDark: 0 };   // v1.17 wall takeover
  }
  IE.renderFrame = function (container, frameId, state) {
    var view = container._ieView; if (!view || view.frameId !== frameId) view = container._ieView = initView(container, frameId);
    var idx = view.idx, g0 = IE.GAMES[state.game] || IE.GAMES.dining, m = IE.MODES[state.mode] || IE.MODES.dining;
    var fx = state.fx || {}; view._kid = !!state.kid;
    /* v0.97 reveal — register this view for triggers + (re)arm the random timer on config change */
    REVEAL_VIEWS[frameId] = view; view._reveal = state.reveal || null;
    var rvKey = view._reveal ? (view._reveal.trigger + '|' + view._reveal.everyS + '|' + (view._reveal.videos ? view._reveal.videos[idx] : '')) : 'off';
    if (rvKey !== view._revealKey) { view._revealKey = rvKey; scheduleRandomReveal(view); }
    var kind = (state.frames && state.frames[idx]) || 'pano';
    var img = state.frameImages && state.frameImages[idx];

    /* live overlays (no transition). _noRoomSim (editor previews) skips the
       room-lighting simulation (tint wash + dim) so content is judged clearly. */
    var noSim = !!state._noRoomSim;
    var tint = m.tint || ('rgba(' + hexToRgb(g0.accent) + ',.28)');
    var bright = state.kid ? Math.min(state.brightness, 70) : state.brightness;
    var dark = noSim ? 0 : Math.max(0, Math.min(0.85, (100 - bright) / 100 * 0.7 + (m.dim || 0)));
    view.tint.style.background = tint; view.tint.style.opacity = noSim ? 0 : (0.55 + (state.warmth / 100) * 0.4);
    view.dim.style.opacity = dark;
    /* v1.03: halo is customisable per mode — state.halo {color,size,op} from the conductor.
       Defaults match the old hardcoded look (accent colour, 18vmin, ~33%). */
    var __hp = state.halo || {};
    var __hc = __hp.color || g0.accent;
    var __hs = (__hp.size != null && +__hp.size > 0) ? +__hp.size : 18;
    var __ho = (__hp.op != null && __hp.op !== '') ? Math.max(0, Math.min(100, +__hp.op)) : 33;
    var __ha = ('0' + Math.round(__ho * 2.55).toString(16)).slice(-2);
    view.halo.style.boxShadow = (state.zones && state.zones['Frame halos'] && state.game !== (((window.__rsLayout || {}).atRest) || IE.ATREST || 'dining') && __ho > 0) ? 'inset 0 0 ' + __hs + 'vmin 1vmin ' + __hc + __ha : 'none';   /* Phase 2c: at-rest id from the layout */
    view.id.textContent = IE.FRAME_IDS[idx];

    /* overlay layer (porthole / window frame) — persistent; optional green-screen keying.
       v0.98: per-frame fit — stretch (fill, default) | cover (fill & crop) | contain (fit inside)
       | width (fit width, centred vertically) | height (fit height, centred horizontally). */
    var ovl = state.overlayImages && state.overlayImages[idx];
    var ck = (state.chroma && state.chroma.on) ? state.chroma : null;
    var ofit = (state.overlayFits && state.overlayFits[idx]) || 'stretch';
    var ovKey = (ovl || '') + '|' + ofit + '|' + (ck ? ('k' + (ck.tol || 60)) : 'raw');
    if (ovKey !== view.ovlKey) {
      view.ovlKey = ovKey;
      var os2 = view.ovl.style;
      os2.width = '100%'; os2.height = '100%'; os2.transform = 'none';
      os2.objectFit = ofit === 'cover' ? 'cover' : ofit === 'contain' ? 'contain' : 'fill';
      if (ofit === 'width') { os2.height = 'auto'; os2.top = '50%'; os2.bottom = 'auto'; os2.transform = 'translateY(-50%)'; os2.objectFit = 'fill'; }
      else if (ofit === 'height') { os2.width = 'auto'; os2.left = '50%'; os2.right = 'auto'; os2.transform = 'translateX(-50%)'; os2.objectFit = 'fill'; }
      else { os2.top = ''; os2.bottom = ''; os2.left = ''; os2.right = ''; }
      if (!ovl) { view.ovl.style.display = 'none'; view.ovl.removeAttribute('src'); }
      else if (ck) { var tok = ++view._ovTok; chromaKey(ovl, ck.tol || 60, ck.despill !== false, function (u) { if (view._ovTok === tok) { view.ovl.src = u; view.ovl.style.display = 'block'; } }); }
      else { view.ovl.src = ovl; view.ovl.style.display = 'block'; }
    }

    /* v1.00 cue cards ("the Wingman") — museum placard / card / full image on the target frame */
    var pr = (state.prompter && state.prompter.frame === IE.FRAME_IDS[idx]) ? state.prompter : null;
    var pk = pr ? [pr.deck, pr.index, pr.style, pr.text, pr.img].join('|') : 'off';
    if (pk !== view.cueKey) {
      view.cueKey = pk;
      var cEl = view.cue;
      if (cEl) {
        if (!pr) { cEl.classList.remove('on'); setTimeout(function () { if (view.cueKey === 'off') cEl.innerHTML = ''; }, 460); }
        else {
          var ct = (pr.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
          cEl.innerHTML = pr.img
            ? '<div class="ie-cue-full"><img src="' + pr.img + '" alt=""></div>'
            : (pr.style === 'card'
              ? '<div class="ie-cue-card">' + ct + '</div>'
              : '<div class="ie-cue-plac"><i></i>' + ct + '</div>');
          cEl.classList.remove('on');
          requestAnimationFrame(function () { requestAnimationFrame(function () { cEl.classList.add('on'); }); });
        }
      }
    }

    /* v0.3 art-mode decor: matte, overlay shadow, print tone (all server-resolved) */
    var mt = state.matte;
    var mkey = (mt && mt.on !== false) ? [mt.color, mt.width, mt.texture].join('|') : 'off';
    if (mkey !== view.matteKey) { view.matteKey = mkey; applyMatte(view, mt); }
    var sh = state.ovlShadow;
    var skey = (sh && sh.on) ? [sh.blur, sh.opacity, sh.dx, sh.dy].join('|') : 'off';
    if (skey !== view.shKey) {
      view.shKey = skey;
      view.ovl.style.filter = (sh && sh.on)
        ? 'drop-shadow(' + (sh.dx || 0) + 'px ' + (sh.dy != null ? sh.dy : 8) + 'px ' + (sh.blur != null ? sh.blur : 16) + 'px rgba(0,0,0,' + (sh.opacity != null ? sh.opacity : 0.45) + '))'
        : 'none';
    }
    var tn = state.artTone;
    var tkey = tn ? [tn.brightness, tn.contrast, tn.saturate].join('|') : 'off';
    if (tkey !== view.toneKey) {
      view.toneKey = tkey;
      view.container.style.transition = 'filter 1.4s ease';
      view.container.style.filter = tn
        ? 'brightness(' + (tn.brightness != null ? tn.brightness : 1) + ') contrast(' + (tn.contrast != null ? tn.contrast : 1) + ') saturate(' + (tn.saturate != null ? tn.saturate : 1) + ')'
        : 'none';
    }

    /* v0.9 effect layer (rain/fog/snow VFX loops) */
    var eff = (state.effectImages && state.effectImages[idx]) || null;   // v0.95: effects render in previews too (plus the app's ≋ badge)
    if (eff !== view.effKey) {
      view.effKey = eff;
      releaseMedia(view.efx);
      view.efx.innerHTML = eff ? '<video autoplay muted loop playsinline preload="auto"><source src="' + eff + '"></video>' : '';
      kickMedia(view.efx);
    }

    view.stage.classList.toggle('ie-drained', state.mode === 'defeat');
    view.stage.classList.toggle('ie-warm', state.mode === 'victory');

    /* ambient */
    var amb = clampAmb(fx.ambient);
    if (amb !== view.amb) {
      AMBIENTS.forEach(function (a) { view.container.classList.remove('ie-amb-' + a); });
      view.container.classList.add('ie-amb-' + amb);
      var overlay = !(amb === 'none' || amb === 'kenburns' || amb === 'breathe' || amb === 'flicker');
      view.ambov.classList.toggle('on', overlay);
      view.amb = amb;
    }

    /* photo slideshow ticker (v0.4) */
    if (kind === 'photos' && state.photos) {
      view._phCfg = state.photos;
      if (!view._phTimer) view._phTimer = setInterval(function () {
        if (!view.container.isConnected) { clearInterval(view._phTimer); view._phTimer = null; return; }   // detached preview tiles
        if (view._phCfg) renderPhotos(view, null, view._phCfg);
      }, 1000);
    } else if (view._phTimer) { clearInterval(view._phTimer); view._phTimer = null; view._phCfg = null; }

    /* v1.04 room timer ticker — refresh the anchor each state push, tick the number locally */
    if (kind === 'clock') {
      var _t = state.timer;
      var showHere = !_t || !Array.isArray(_t.frames) || !_t.frames.length || _t.frames.indexOf(view.frameId) >= 0;   // v1.04 "Show on" restriction
      view._timer = _t ? Object.assign({}, _t, { _off: (_t.serverNow ? _t.serverNow - Date.now() : 0), _hide: !showHere }) : null;
      if (!view._clockTimer) view._clockTimer = setInterval(function () {
        if (!view.container.isConnected) { clearInterval(view._clockTimer); view._clockTimer = null; return; }
        updateClock(view);
      }, 250);
      updateClock(view);
    } else if (view._clockTimer) { clearInterval(view._clockTimer); view._clockTimer = null; view._timer = null; }

    /* v1.17 WALL TAKEOVER — runs for EVERY kind (pano/photos/score/viz/…), not just clock */
    view._tkOff = (state.timer && state.timer.serverNow) ? state.timer.serverNow - Date.now() : 0;
    view._tkAccent = g0.accent || '#c9a35e';
    view._roomDark = dark;
    view._tkChain = (state.timer && state.timer.chain && state.timer.chain.active) ? state.timer.chain : null;
    try { syncTakeover(view, takeoverOf(state)); } catch (e) {}
    try { syncIntroMedia(view, state, IE.FRAME_IDS[idx]); } catch (e) {}   /* v1.28 */
    try { syncPartyGame(view, state, IE.FRAME_IDS[idx]); } catch (e) {}   /* v1.38 RS-GAMES */

    /* scene change -> transition */
    var sig = kind + '|' + (img || '') + '|' + state.game + '|' + (kind === 'clock' && state.timer ? (state.timer.style + '|' + ((state.timer.bg && state.timer.bg.url) || '') + '|' + ((state.timer.bg && state.timer.bg.type) || '') + '|' + state.timer.label + '|' + state.timer.type
      /* v1.17: rebuild the panel when the chess roster changes (seat count / names); the
         times themselves tick in place and must NOT be in the signature. */
      + '|' + (state.timer.type === 'chess' && state.timer.chess && Array.isArray(state.timer.chess.players)
          ? state.timer.chess.players.map(function (p) { return p && p.name; }).join(',') : '')) : '') + '|' + (kind === 'score' && state.scores ? JSON.stringify(state.scores) : '') + '|' + (fx && fx._n ? fx._n : '')
      + '|' + (kind === 'photos' && state.photos ? JSON.stringify(state.photos) : '') + /*panoSigFix v1.40: whole-wall images from IE.wallFramesOf*/ '|' + (kind==='pano' && state.frameImages ? IE.wallFramesOf(idx).map(function(k3){return state.frameImages[k3];}).join(',') : '')
      + '|' + (kind === 'viz' && state.frameViz ? JSON.stringify(state.frameViz[idx]) : '')          // v1.06 repaint when the 🎶 config changes (style/colour/bg/orientation)
      + '|' + (kind === 'playlist' && state.framePlaylist ? JSON.stringify(state.framePlaylist[idx]) : '');
    if (sig !== view.sig) {
      var html = buildLayerHTML(state, idx);
      var nlayer = D.createElement('div'); nlayer.className = 'ie-layer ie-cur'; nlayer.innerHTML = html;
      var olayer = view.cur; if (olayer) olayer.classList.remove('ie-cur');
      var dur = Math.max(0, fx.durationMs != null ? fx.durationMs : 1000);
      var ease = fx.easing || 'cubic-bezier(.4,0,.2,1)';
      var style = clampStyle(fx.style, state.kid);
      var stagger = (fx.stagger || 0) * (view.idx);
      var prevImg = view.prevImg;
      view.cur = nlayer;
      var run = function () {
        view.stage.appendChild(nlayer);
        kickMedia(nlayer);
        if ((style === 'ripple' || style === 'morph') && img && prevImg && !isVid(img) && !isVid(prevImg)) {
          set(nlayer, { opacity: '0' });
          glTransition(view, style, img, IE.slotOf(view.idx), dur,
            function () { set(nlayer, { opacity: '1' }); cssTransition(view, 'blurfade', nlayer, olayer, dur, ease, g0.accent); },
            function () { set(nlayer, { opacity: '1' }); if (olayer) { releaseMedia(olayer); if (olayer.parentNode) olayer.parentNode.removeChild(olayer); } });
        } else {
          cssTransition(view, style, nlayer, olayer, dur, ease, g0.accent);
        }
      };
      if (stagger > 0) setTimeout(run, stagger); else run();
      view.prevImg = view.curImg; view.curImg = img || null; view.sig = sig;
      if (kind === 'photos' && state.photos) setTimeout(function () { renderPhotos(view, null, state.photos); }, stagger + 50);
    }

    /* event once per meaningful change */
    var evKey = state.game + '|' + state.mode + '|' + sig;
    if (fx.event && evKey !== view.evKey) runEvent(view, fx.event);
    view.evKey = evKey; view.mode = state.mode;

    if (!view.idHidden) { view.idHidden = true; setTimeout(function () { if (view.id) view.id.style.opacity = '0'; }, 4000); }
  };

  /* ====================== control-side audio on cue ====================== */
  var _lastCue = null;
  IE.fxAudioOnState = function (state) {
    if (!state) return; var fx = state.fx || {};
    var cue = state.game + '|' + state.mode;
    if (cue === _lastCue) return; _lastCue = cue;
    if (state.kid && (fx.sfx === 'thunder' || fx.sfx === 'boom')) { IE.playSfx('pageturn'); return; }
    IE.playSfx(fx.sfx);
  };

  /* ====================== control Style picker ====================== */
  IE.mountStylePanel = function (container, deck, bus) {
    var pane = container.querySelector('[data-pane="style"]'); if (!pane) return;
    function opts(list, sel) { return list.map(function (o) { return '<option value="' + o + '"' + (o === sel ? ' selected' : '') + '>' + o + '</option>'; }).join(''); }
    function row(label, key, list, sel) { return '<div><div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-faint);margin-bottom:5px">' + label + '</div><select data-fx="' + key + '" style="width:100%;padding:9px;border-radius:9px;background:var(--panel2);color:var(--ink);border:1px solid var(--line);font-size:13px">' + opts(list, sel) + '</select></div>'; }
    var fx = deck.getState().fx || {};
    pane.innerHTML = '<div class="ie-zt">Live style — overrides the current game until you switch games</div>'
      + '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;max-width:640px">'
      + row('Transition', 'style', TRANSITIONS, fx.style || 'blurfade')
      + row('Ambient motion', 'ambient', AMBIENTS, fx.ambient || 'kenburns')
      + row('Change event', 'event', EVENTS, fx.event || 'none')
      + row('Sound effect', 'sfx', SFXNAMES, fx.sfx || 'none')
      + '</div>'
      + '<div style="margin-top:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">'
      + '<label style="font-size:12px;color:var(--ink-dim)">Duration <b data-dv style="color:var(--gold-soft)">' + (fx.durationMs != null ? fx.durationMs : 1000) + 'ms</b></label>'
      + '<input type="range" data-dur min="0" max="4000" step="50" value="' + (fx.durationMs != null ? fx.durationMs : 1000) + '" style="flex:1;min-width:200px;max-width:320px">'
      + '<button class="ie-pb" data-preview>Replay change ▶</button>'
      + '<button class="ie-pb" data-testsfx>Test sound ♪</button></div>';
    function curFx() { var s = deck.getState(); s.fx = s.fx || {}; return s.fx; }
    function push() { var s = deck.getState(); s.fx = s.fx || {}; s.fx._n = Date.now(); s.rev = (s.rev || 0) + 1; bus.publish(s); }
    pane.querySelectorAll('[data-fx]').forEach(function (sel) {
      sel.onchange = function () { var f = curFx(); var v = sel.value; f[sel.dataset.fx] = (v === 'none' && sel.dataset.fx !== 'ambient') ? null : v; if (sel.dataset.fx === 'sfx' && v !== 'none') IE.playSfx(v); push(); };
    });
    var dur = pane.querySelector('[data-dur]'); dur.oninput = function () { curFx().durationMs = +dur.value; pane.querySelector('[data-dv]').textContent = dur.value + 'ms'; push(); };
    pane.querySelector('[data-preview]').onclick = function () { IE.playSfx(curFx().sfx); push(); };
    pane.querySelector('[data-testsfx]').onclick = function () { IE.playSfx(curFx().sfx); };
  };

  /* one-time audio unlock on first interaction (autoplay policy) */
  var unlock = function () { IE.fxUnlockAudio(); g.removeEventListener('pointerdown', unlock); g.removeEventListener('keydown', unlock); };
  g.addEventListener('pointerdown', unlock); g.addEventListener('keydown', unlock);

})(window);

/* ================= ROOMSCAPE MEDIA FX (renderer) 2026-07-14 =================
   RS-MEDIA-FX
   Appended to fx.js so it runs in the app AND on the kiosks.
   (1) Per-image colour grade: applies a CSS/SVG filter (+ vignette overlay) to
       each scene layer, keyed by the layer's image URL. IE._imgAdjust[key].
   (2) Animated-effect envelope: drives the opacity of every .ie-efx <video>
       from its own currentTime/duration -> 0..target..0 fade, per loop.
       IE._overlayFx[effectFile] = { opacity, fadeIn, fadeOut }.
   Data comes from /api/mediafx (polled) and is applied live by IE._regradeAll(). */
;(function(){
  if (!window.IE || !IE.renderFrame || IE.__mediaFx) return; IE.__mediaFx = true;
  var D = document;
  IE._imgAdjust = IE._imgAdjust || {};
  IE._overlayFx = IE._overlayFx || {};

  /* ---------- keys ---------- */
  function imgKeyFromBg(el){
    var bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg.indexOf('url(') < 0 || bg.indexOf('data:image/svg') >= 0) return '';
    var u = bg.slice(4,-1).replace(/^["']|["']$/g,'');
    try { return new URL(u, location.href).pathname; } catch(e){ return u; }
  }
  function effKeyFromSrc(src){
    try{ var p = new URL(src, location.href).pathname; var m = p.indexOf('/media/');
      var rest = m<0 ? p.replace(/^\//,'') : p.slice(m+7);
      return rest.split('/').map(function(s){ try{return decodeURIComponent(s);}catch(e){return s;} }).join('/');
    }catch(e){ return ''; }
  }

  /* ---------- SVG filter (warmth / gamma / sharpen), cached ---------- */
  var svgHost=null, svgCache={};
  function ensureSvgHost(){ if(svgHost) return; svgHost=D.createElementNS('http://www.w3.org/2000/svg','svg'); svgHost.setAttribute('width','0'); svgHost.setAttribute('height','0'); svgHost.style.cssText='position:absolute;width:0;height:0;overflow:hidden'; (D.body||D.documentElement).appendChild(svgHost); }
  function ensureSvg(warm,gam,sharp){
    warm=+warm||0; gam=+gam||1; sharp=+sharp||0;
    if(!warm && gam===1 && !sharp) return '';
    var id='ieadj_'+String(warm).replace('-','n')+'_'+String(gam).replace('.','p')+'_'+sharp;
    if(svgCache[id]) return id;
    ensureSvgHost();
    var prims='', last='SourceGraphic';
    if(warm){ var w=warm/200; prims+='<feColorMatrix in="'+last+'" type="matrix" values="'+(1+w).toFixed(4)+' 0 0 0 0 0 1 0 0 0 0 0 '+(1-w).toFixed(4)+' 0 0 0 0 0 1 0" result="w"/>'; last='w'; }
    if(gam && gam!==1){ var e=(1/gam).toFixed(3); prims+='<feComponentTransfer in="'+last+'" result="g"><feFuncR type="gamma" exponent="'+e+'"/><feFuncG type="gamma" exponent="'+e+'"/><feFuncB type="gamma" exponent="'+e+'"/></feComponentTransfer>'; last='g'; }
    if(sharp){ var a=(sharp/100).toFixed(3), c=(1+4*(sharp/100)).toFixed(3); prims+='<feConvolveMatrix in="'+last+'" order="3" preserveAlpha="true" kernelMatrix="0 -'+a+' 0 -'+a+' '+c+' -'+a+' 0 -'+a+' 0"/>'; }
    try{ svgHost.insertAdjacentHTML('beforeend','<filter id="'+id+'" color-interpolation-filters="sRGB" x="-10%" y="-10%" width="120%" height="120%">'+prims+'</filter>'); svgCache[id]=1; }catch(e){ return ''; }
    return id;
  }

  function buildFilter(a){
    if(!a) return '';
    var parts=[];
    var bri=(a.bri==null?1:+a.bri) * Math.pow(2,(+a.exp||0)/100);
    if(Math.abs(bri-1)>0.001) parts.push('brightness('+bri.toFixed(3)+')');
    if(a.con!=null && Math.abs(a.con-1)>0.001) parts.push('contrast('+(+a.con).toFixed(3)+')');
    if(a.sat!=null && Math.abs(a.sat-1)>0.001) parts.push('saturate('+(+a.sat).toFixed(3)+')');
    if(+a.hue) parts.push('hue-rotate('+(+a.hue)+'deg)');
    if(+a.blur>0) parts.push('blur('+(+a.blur)+'px)');
    var id=ensureSvg(a.warm, a.gam==null?1:a.gam, a.sharp);
    if(id) parts.push('url(#'+id+')');
    return parts.join(' ');
  }
  function applyVignette(layer, vig){
    var v=layer.querySelector(':scope > .ie-adj-vig');
    if(!(vig>0)){ if(v) v.remove(); return; }
    if(!v){ v=D.createElement('div'); v.className='ie-adj-vig'; v.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:3'; layer.appendChild(v); }
    v.style.background='radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(0,0,0,'+(vig/100).toFixed(3)+') 100%)';
  }
  function gradeLayer(layer){
    var pano=layer.querySelector('.ie-pano'); if(!pano) return;
    var key=imgKeyFromBg(pano);
    var a=key ? IE._imgAdjust[key] : null;
    var f=a ? buildFilter(a) : '';
    if(layer.style.filter!==f) layer.style.filter=f;
    applyVignette(layer, a ? (+a.vig||0) : 0);
  }
  function applyGrades(container){
    if(!container || !container.querySelectorAll) return;
    var layers=container.querySelectorAll('.ie-layer');
    for(var i=0;i<layers.length;i++) gradeLayer(layers[i]);
  }
  IE._regradeAll = function(){ D.querySelectorAll('.ie-frame').forEach(function(c){ try{ applyGrades(c); }catch(e){} }); };

  /* ---------- wrap renderFrame ---------- */
  var _rf = IE.renderFrame;
  IE.renderFrame = function(el, id, st){
    if(st){ if(st.imgAdjust) IE._imgAdjust=st.imgAdjust; if(st.overlayFx) IE._overlayFx=st.overlayFx; }
    var r = _rf.apply(this, arguments);
    try{ applyGrades(el); }catch(e){}
    return r;
  };

  /* ---------- animated-effect opacity envelope ---------- */
  function tick(){
    var vids=D.querySelectorAll('.ie-efx video');
    for(var i=0;i<vids.length;i++){
      var v=vids[i];
      var src=v.currentSrc || (v.querySelector('source') && v.querySelector('source').src) || v.src || '';
      var key=effKeyFromSrc(src);
      var fxs=key ? IE._overlayFx[key] : null;
      if(!fxs){ if(v.__adj){ v.style.opacity=''; v.__adj=false; } continue; }
      v.__adj=true;
      var tgt=(fxs.opacity==null?1:+fxs.opacity);
      var fi=+fxs.fadeIn||0, fo=+fxs.fadeOut||0, dur=v.duration, t=v.currentTime, k=1;
      if(isFinite(dur) && dur>0){
        var up = fi>0 ? (t/fi) : 1;
        var dn = fo>0 ? ((dur-t)/fo) : 1;
        k=Math.max(0, Math.min(1, Math.min(up,dn)));
      }
      var o=(tgt*k).toFixed(3);
      if(v.style.opacity!==o) v.style.opacity=o;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- pull settings from the Conductor ---------- */
  function pull(){
    fetch('/api/mediafx').then(function(r){return r.json();}).then(function(j){
      if(j && j.ok){ IE._imgAdjust=j.imgAdjust||{}; IE._overlayFx=j.overlayFx||{}; IE._regradeAll(); }
    }).catch(function(){});
  }
  pull(); setInterval(pull, 10000);
})();

/* ================= ROOMSCAPE OVERLAY FIT FIX (2026-07-14) =================
   RS-OVERLAY-FIX
   The overlay layer (.ie-ovl) was pinned to the frame's mat inset on the top
   and left, but forced to width:100%/height:100%, so it overflowed the bottom
   and right by the mat width and let the scene peek out along those edges.
   This sizes each overlay to match its scene window (.ie-stage) exactly, so it
   frames the scene on all four sides. Width/height-fit overlays (which use a
   transform) are left untouched. Appended to fx.js -> runs in app AND kiosks. */
;(function(){
  if (!window.IE || !IE.renderFrame || IE.__ovlFix) return; IE.__ovlFix = true;
  function fixOverlay(container){
    if (!container || !container.querySelector) return;
    var ov = container.querySelector('.ie-ovl'); if (!ov) return;
    var cs = getComputedStyle(ov);
    if (cs.display === 'none') return;
    if (!(ov.getAttribute('src') || '').length) return;
    var tr = cs.transform;
    if (tr !== 'none' && tr !== 'matrix(1, 0, 0, 1, 0, 0)') return;   // leave width/height-fit overlays alone
    var stage = container.querySelector('.ie-stage'); if (!stage) return;
    var cr = container.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    if (!sr.width || !sr.height) return;
    var L = (sr.left - cr.left) + 'px', T = (sr.top - cr.top) + 'px', W = sr.width + 'px', H = sr.height + 'px';
    if (ov.style.left !== L) ov.style.left = L;
    if (ov.style.top !== T) ov.style.top = T;
    if (ov.style.width !== W) ov.style.width = W;
    if (ov.style.height !== H) ov.style.height = H;
    if (ov.style.right !== 'auto') ov.style.right = 'auto';
    if (ov.style.bottom !== 'auto') ov.style.bottom = 'auto';
  }
  var _rf = IE.renderFrame;
  IE.renderFrame = function(el, id, st){ var r = _rf.apply(this, arguments); try{ fixOverlay(el); }catch(e){} return r; };
  try{ document.querySelectorAll('.ie-frame').forEach(function(c){ try{ fixOverlay(c); }catch(e){} }); }catch(e){}
})();
/* ================= ROOMSCAPE VARIANT STAGGER (2026-07-18) =================
   RS-VARIANT-STAGGER v1
   Offsets looping scene-video start points per TV so identical animations
   (blinking eyes etc.) don't move in unison. Per-mode staggerS comes from
   /api/variants (polled with the game from /api/state every 10s). Offset =
   frameIndex * staggerS into the clip (mod duration), applied on
   loadedmetadata and re-checked after each render.
   PANO-SAFE: only standalone videos (object-fit: cover) are staggered —
   slices of a wall-spanning video (object-fit: fill) must stay in sync and
   are never touched. Appended to fx.js (app + kiosks). */
;(function(){
  if (typeof window === 'undefined') return;
  if (window.__rsVarStagger) return; window.__rsVarStagger = true;
  var FRAMES = (window.IE && window.IE.FRAME_IDS) || [];   /* v1.40: live layout array (IE.setLayout mutates in place) */
  var staggerS = 0, game = null;

  function myFrameIdx(){
    try{
      var q = new URLSearchParams(location.search);
      var fid = (q.get('frame') || q.get('id') || '').toUpperCase();
      var i = FRAMES.indexOf(fid);
      return i >= 0 ? i : -1;                                  // -1 = the app preview (no stagger needed there)
    }catch(e){ return -1; }
  }
  var FIDX = myFrameIdx();

  function poll(){
    fetch('/api/state').then(function(r){ return r.json(); }).then(function(s){
      game = s && s.game;
      if (!game) return;
      return fetch('/api/variants?game=' + encodeURIComponent(game)).then(function(r){ return r.json(); });
    }).then(function(j){
      if (j && j.ok && j.cfg) staggerS = j.cfg.staggerS || 0;
    }).catch(function(){});
  }

  function applyTo(v){
    if (!v || v.__rsStaggered === staggerS + '|' + (v.currentSrc || v.src)) return;
    if (FIDX < 0 || !staggerS) return;
    try{
      if ((v.style.objectFit || '') === 'fill') return;        // pano slice — must stay in sync
      var doSet = function(){
        try{
          var d = v.duration;
          if (d && isFinite(d) && d > 1){
            v.currentTime = (FIDX * staggerS) % d;
            v.__rsStaggered = staggerS + '|' + (v.currentSrc || v.src);
          }
        }catch(e){}
      };
      if (v.readyState >= 1) doSet();
      else if (!v.__rsStagPending) {   // v1.07: a video wedged at readyState 0 got a fresh listener from EVERY 4s sweep
        v.__rsStagPending = true;
        v.addEventListener('loadedmetadata', function(){ v.__rsStagPending = false; doSet(); }, { once: true });
      }
    }catch(e){}
  }
  function sweep(root){
    try{
      [].slice.call((root || document).querySelectorAll('video.ie-pano')).forEach(applyTo);
    }catch(e){}
  }

  // hook renderFrame like the other bolt-ons, plus a light safety-net timer
  function hook(){
    if (window.IE && typeof window.IE.renderFrame === 'function' && !window.IE.renderFrame.__rsStag){
      var orig = window.IE.renderFrame;
      var wrapped = function(){ var r = orig.apply(this, arguments); try{ setTimeout(function(){ sweep(); }, 300); }catch(e){} return r; };
      wrapped.__rsStag = true;
      window.IE.renderFrame = wrapped;
    }
  }
  poll(); setInterval(poll, 10000);
  hook(); setInterval(hook, 3000);
  setInterval(function(){ sweep(); }, 4000);
})();
/* ================= ROOMSCAPE SFX SHAPER (2026-07-18) =================
   RS-SFX-SHAPER v1 — per-effect volume + max length on every TV.
   The effects editor (v1.3) stores gain (0-100 %) and maxS (seconds) per
   effect in /api/social-config. Native playback (IE.playSfx via IE.onSocial)
   is fire-and-forget at 0.9 volume, so this block wraps IE.onSocial: when a
   social message's effect has gain/maxS configured, the sound is played HERE
   (correct volume, fading out over the last ~1.2s and stopping at the cap)
   and the message passes on with sfx stripped so nothing double-plays.
   Config is fetched lazily + refreshed every 60s. Includes its own 3s
   (id|t) dedupe so shaping is safe even before the dedupe wrapper re-wraps.
   Appended to fx.js. */
;(function(){
  if (window.__rsSfxShaper) return; window.__rsSfxShaper = true;
  var CFG = {}, lastFetch = 0, lastKey = '', lastAt = 0;

  function refresh(force){
    var now = Date.now();
    if (!force && now - lastFetch < 60000) return;
    lastFetch = now;
    fetch('/api/social-config').then(function(r){ return r.json(); }).then(function(j){
      var map = {};
      ((j && j.effects) || []).forEach(function(e){
        if (e && e.id && (e.gain != null || e.maxS != null)) map[e.id] = { gain: e.gain, maxS: e.maxS };
      });
      CFG = map;
    }).catch(function(){});
  }
  setTimeout(function(){ refresh(true); }, 3000);
  setInterval(function(){ refresh(true); }, 60000);

  function playShaped(src, gain, maxS){
    try {
      var a = new Audio(src);
      a.volume = Math.max(0, Math.min(1, (gain != null ? gain : 90) / 100));
      a.play().catch(function(){});
      if (maxS) {
        var fadeAt = Math.max(0, (maxS - 1.2)) * 1000;
        setTimeout(function(){
          var iv = setInterval(function(){
            a.volume = Math.max(0, a.volume - 0.08);
            if (a.volume <= 0.02) { clearInterval(iv); try { a.pause(); a.src = ''; } catch (e) {} }
          }, 100);
          setTimeout(function(){ clearInterval(iv); try { a.pause(); a.src = ''; } catch (e) {} }, 1700);
        }, fadeAt);
      }
    } catch (e) {}
  }

  function wrap(){
    if (!window.IE || typeof IE.onSocial !== 'function' || IE.onSocial.__rsShaped) return;
    var prev = IE.onSocial;
    var f = function(msg){
      try {
        if (msg && msg.sfx && msg.sfx.indexOf('synth:') !== 0 && msg.id && CFG[msg.id]) {
          var key = (msg.id || '') + '|' + (msg.t || '');
          var now = Date.now();
          if (!(key === lastKey && now - lastAt < 3000)) {           // own 3s dedupe
            lastKey = key; lastAt = now;
            var c = CFG[msg.id];
            var s = msg.sfx;
            playShaped(s.charAt(0) === '/' ? s : ('/' + s), c.gain, c.maxS);
          }
          var m2 = {}; for (var k in msg) m2[k] = msg[k]; m2.sfx = null;  // visuals/lights still fire
          return prev(m2);
        }
      } catch (e) {}
      return prev(msg);
    };
    f.__rsShaped = true;
    IE.onSocial = f;
  }
  wrap();
  setInterval(wrap, 5000);   // survive other blocks re-assigning onSocial
})();
/* ================= ROOMSCAPE MUSIC VIZ (2026-07-18) =================
   RS-MUSIC-VIZ v1 — audio-reactive music visuals on the Frame TVs.
   Per-mode config from /api/viz (viz.json — outside profiles.json on purpose,
   like playlists): { on, style, frames:'all'|[ids], color:'auto'|#hex,
   sens:0.5-2, shuffleMin }.
   AUDIO: taps an AnalyserNode off IE.audio.master (fx-audio's public master
   gain) — REAL per-TV spectrum when the mode playlist plays through the TVs.
   When there's no browser audio (Music Assistant / Spotify) or silence, a
   deterministic wall-clock "musical" engine drives the same styles, so all
   TVs stay in sync (same math from the same clock — the photo-deck trick).
   PANORAMA styles draw one continuous scene across a wall: each TV renders
   its slice using its frame index (L1..L3 / R1..R3 slots 0..2).
   14 styles + 'shuffle'. Test override on any frame page:
     frame.html?frame=L2&viztest=<style>[&vizpan=1][&vizcolor=%23ff88cc]
   Now-Playing (track/artist from /api/music/status) shown as a bottom card
   (styles like vinyl use the album art). Kid mode: no strobe (flash clamp).
   Appended to fx.js. */
;(function () {
  if (window.__rsMusicViz) return; window.__rsMusicViz = true;
  var FRAMES = (window.IE && window.IE.FRAME_IDS) || [];   // v1.07: single source of truth (v1.40: live layout array)
  var qs = new URLSearchParams(location.search);
  var FID = (qs.get('frame') || qs.get('id') || '').toUpperCase();
  if (FRAMES.indexOf(FID) < 0) return;                    // frame pages only
  var MYIDX = FRAMES.indexOf(FID);
  var SLOT = (window.IE && IE.slotOf) ? IE.slotOf(MYIDX) : MYIDX % 3;            // v1.40: position within its wall
  var WALL = (window.IE && IE.wallKeyOf) ? IE.wallKeyOf(MYIDX) : (MYIDX < 3 ? 'L' : 'R');
  var NSLOTS = (window.IE && IE.wallSizeOf) ? IE.wallSizeOf(MYIDX) : 3;          // v1.40: frames on this wall
  var TEST = qs.get('viztest') || null;
  var TESTPAN = qs.get('vizpan') === '1';
  var TESTCOL = qs.get('vizcolor') || null;

  // v1.06: cfg is the EFFECTIVE config for this frame. When this frame's Wall
  // content type is 'viz', it comes per-frame from state.frameViz[MYIDX]
  // (TRANSP = draw the reactive canvas transparently over the frame's own chosen
  // background). Otherwise we fall back to the legacy per-mode /api/viz overlay.
  var cfg = null, legacyCfg = null, stKind = null, stViz = null, TRANSP = false;
  var game = null, lastVizFetch = 0, lastStateFetch = 0;
  var analyser = null, freq = null, wave = null;
  var np = { track: '', artist: '', art: null, artUrl: null, t: 0 };
  var wrap = null, cv = null, cx = null, raf = 0, lastFrame = 0;

  /* ---------------- config / state polling ---------------- */
  function poll() {
    var now = Date.now();
    if (now - lastStateFetch > 3000) {
      lastStateFetch = now;
      fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
        var g = (s && s.game) || null;
        if (g !== game) { game = g; lastVizFetch = 0; }
        stKind = (s && s.frames && s.frames[MYIDX]) || null;      // v1.06 this frame's Wall content type
        stViz = (s && s.frameViz && s.frameViz[MYIDX]) || null;   // v1.06 per-frame 🎶 config (bg already resolved by conductor)
      }).catch(function () {});
    }
    if (game && now - lastVizFetch > 20000) {
      lastVizFetch = now;
      fetch('/api/viz?game=' + encodeURIComponent(game)).then(function (r) { return r.json(); })
        .then(function (j) { legacyCfg = (j && j.viz) || null; }).catch(function () {});
    }
    if (now - np.t > 15000) {
      np.t = now;
      fetch('/api/music/status').then(function (r) { return r.json(); }).then(function (j) {
        var m = j || {};
        var tr = m.track || m.title || (m.media && m.media.title) || '';
        var ar = m.artist || (m.media && m.media.artist) || '';
        var art = m.art || m.image || m.entity_picture || (m.media && m.media.image) || null;
        np.track = typeof tr === 'string' ? tr : ''; np.artist = typeof ar === 'string' ? ar : '';
        if (art && art !== np.artUrl) {
          np.artUrl = art;
          var im = new Image(); im.onload = function () { np.art = im; }; im.onerror = function () { np.art = null; };
          im.src = art;
        }
      }).catch(function () {});
    }
  }
  setInterval(poll, 1500); poll();

  function shuffleStyle(mins) {
    var pool = Object.keys(STYLES);
    return pool[Math.floor(Date.now() / (Math.max(1, mins || 5) * 60000)) % pool.length];
  }
  function activeStyle() {
    if (TEST) { cfg = stViz || legacyCfg || {}; TRANSP = false; return TEST; }
    // v1.06: per-frame content type wins — this frame IS a music visualiser.
    if (stKind === 'viz' && stViz) {
      cfg = stViz; TRANSP = !!(stViz.bg && stViz.bg.url);
      var st0 = stViz.style || 'cathedral';
      return st0 === 'shuffle' ? shuffleStyle(stViz.shuffleMin) : st0;
    }
    // legacy per-mode overlay (old modes that still have a viz.json entry and no
    // per-frame viz content type) — draw opaquely over whatever the frame shows.
    // Never overlay a frame that is itself a new music content type.
    if (stKind === 'playlist') { cfg = null; TRANSP = false; return null; }
    cfg = legacyCfg; TRANSP = false;
    if (!legacyCfg || !legacyCfg.on) return null;
    var f = legacyCfg.frames;
    if (f && f !== 'all' && Object.prototype.toString.call(f) === '[object Array]' && f.indexOf(FID) < 0) return null;
    var st = legacyCfg.style || 'cathedral';
    return st === 'shuffle' ? shuffleStyle(legacyCfg.shuffleMin) : st;
  }

  /* ---------------- audio: real analyser or musical clock ---------------- */
  function ensureAnalyser() {
    try {
      var Aud = window.IE && IE.audio;
      if (!Aud || !Aud.ctx || !Aud.master) return;
      if (!analyser) {
        analyser = Aud.ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.72;
        Aud.master.connect(analyser);              // parallel tap; destination untouched
        freq = new Uint8Array(analyser.frequencyBinCount);
        wave = new Uint8Array(analyser.fftSize);
      }
    } catch (e) {}
  }
  var silence = 0, beatAvg = 0, beatPulse = 0, lastBeatAt = 0;
  function bandsFromAnalyser() {
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(wave);
    var n = freq.length;
    function avg(a, b) { var s = 0, c = 0; for (var i = Math.floor(a * n); i < Math.floor(b * n); i++) { s += freq[i]; c++; } return c ? s / c / 255 : 0; }
    var bass = avg(0, 0.06), lowmid = avg(0.06, 0.18), mid = avg(0.18, 0.45), high = avg(0.45, 0.9);
    var energy = bass * 0.45 + lowmid * 0.25 + mid * 0.2 + high * 0.1;
    if (energy < 0.02) silence++; else silence = 0;
    // beat: bass flux over rolling average
    beatAvg = beatAvg * 0.96 + bass * 0.04;
    var beat = false;
    var now = performance.now();
    if (bass > beatAvg * 1.35 && bass > 0.12 && now - lastBeatAt > 220) { beat = true; lastBeatAt = now; }
    return { bass: bass, lowmid: lowmid, mid: mid, high: high, energy: energy, beat: beat, wave: wave, real: true };
  }
  function bandsFromClock(t) {
    // deterministic pseudo-music: 104 BPM grid with 8-bar swells; same on every TV
    var bpm = 104, spb = 60 / bpm;
    var beatPhase = (t % spb) / spb;
    var bar = Math.floor(t / (spb * 4));
    var swell = 0.55 + 0.35 * Math.sin(t * 2 * Math.PI / (spb * 32));
    var kick = Math.pow(Math.max(0, 1 - beatPhase * 3.2), 2);
    var bass = Math.min(1, (0.28 + 0.6 * kick) * swell + 0.05 * Math.sin(t * 1.7));
    var lowmid = (0.3 + 0.18 * Math.sin(t * 2.3 + bar)) * swell;
    var mid = (0.28 + 0.2 * Math.sin(t * 3.1 + 1.2)) * swell;
    var high = (0.2 + 0.16 * Math.sin(t * 5.3 + 0.4) + 0.1 * kick) * swell;
    var beat = beatPhase < 0.045;
    if (!bandsFromClock._w) { bandsFromClock._w = new Uint8Array(1024); }
    var w = bandsFromClock._w;
    for (var i = 0; i < w.length; i++) {
      var ph = i / w.length;
      w[i] = 128 + Math.round(90 * swell * Math.sin(ph * 24 + t * 6) * Math.sin(ph * 3.1 + t * 1.3) + 24 * kick * Math.sin(ph * 60 + t * 20));
    }
    return { bass: bass, lowmid: lowmid, mid: mid, high: high, energy: (bass + mid) / 2, beat: beat, wave: w, real: false };
  }
  function getBands() {
    ensureAnalyser();
    if (analyser) {
      var b = bandsFromAnalyser();
      if (silence < 180) return b;                 // ~3s of silence -> fall back to clock
    }
    return bandsFromClock(Date.now() / 1000);
  }

  /* ---------------- palette ---------------- */
  function pal() {
    // v1.06: cfg.color is 'auto' | 'pal:<id>' | '#rrggbb'. Palettes (incl. 'auto'=gold)
    // resolve to gradient stops via IE.palStops; a single hex is a solid colour.
    var cv0 = TESTCOL || (cfg && cfg.color) || 'auto';
    var stops = (window.IE && IE.palStops) ? IE.palStops(cv0) : null;
    var r, g, b;
    if (stops) { var mid = IE.palAt(stops, 0.72); r = mid[0]; g = mid[1]; b = mid[2]; }
    else { var m = /^#?([0-9a-f]{6})$/i.exec(cv0); var hex = m ? m[1] : 'c9a24a'; r = parseInt(hex.slice(0, 2), 16); g = parseInt(hex.slice(2, 4), 16); b = parseInt(hex.slice(4, 6), 16); }
    return { r: r, g: g, b: b, stops: stops,
      css: function (a) { return 'rgba(' + r + ',' + g + ',' + b + ',' + (a == null ? 1 : a) + ')'; },
      // colour at position f in [0,1] across the palette (solid colours ignore f)
      at: function (f, a) { if (stops) { var c = IE.palAt(stops, f); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; } return 'rgba(' + r + ',' + g + ',' + b + ',' + (a == null ? 1 : a) + ')'; },
      shift: function (deg, a) { // cheap hue companion colours
        var t = deg / 120;
        return 'rgba(' + Math.round(r * (1 - t) + b * t) + ',' + Math.round(g * (1 - t) + r * t) + ',' + Math.round(b * (1 - t) + g * t) + ',' + (a == null ? 1 : a) + ')';
      } };
  }
  function sens() { return Math.max(0.4, Math.min(2.5, (cfg && cfg.sens) || 1)); }
  function kidSafe(v) { return window.__ieKid ? Math.min(v, 0.5) : v; } // clamp flashes if kid flag known

  /* ---------------- geometry (panorama) ---------------- */
  var GAPF = 0.22;   // bezel+gap allowance between TVs, as fraction of one frame width
  function geo(W) { return { slot: SLOT, slots: NSLOTS, span: W * (NSLOTS + GAPF * (NSLOTS - 1)), off: SLOT * W * (1 + GAPF), wall: WALL }; }   /* v1.40: N-wide walls */

  /* ================= STYLES ================= */
  var STYLES = {};
  function reg(id, pan, fn) { STYLES[id] = { pan: pan, fn: fn }; }

  /* helpers */
  // v1.06: over a chosen background we can't paint opaque black trails (it would bury
  // the image). Instead we erase with destination-out and composite the viz additively.
  function fade(a) {
    if (TRANSP) { cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = 'rgba(0,0,0,' + Math.min(1, a * 1.7) + ')'; cx.fillRect(0, 0, cv.width, cv.height); cx.globalCompositeOperation = 'lighter'; return; }
    cx.globalCompositeOperation = 'source-over'; cx.fillStyle = 'rgba(4,5,9,' + a + ')'; cx.fillRect(0, 0, cv.width, cv.height);
  }
  function seeded(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  reg('cathedral', false, function (b, t, P, W, H) {
    fade(0.32);
    var N = 24, bw = W / (N * 1.35), gap = (W - N * bw) / (N + 1);
    for (var i = 0; i < N; i++) {
      var ph = i / N;
      var mag = (ph < 0.2 ? b.bass : ph < 0.5 ? b.lowmid : ph < 0.8 ? b.mid : b.high);
      mag = Math.min(1, mag * sens() * (0.75 + 0.5 * seeded(i)));
      var h = mag * H * 0.78;
      var x = gap + i * (bw + gap);
      var gr = cx.createLinearGradient(0, H - h, 0, H);
      gr.addColorStop(0, P.at(ph, 0.95)); gr.addColorStop(1, P.at(ph, 0.12));   // v1.06 palette spreads across the bars
      cx.fillStyle = gr;
      cx.fillRect(x, H - h, bw, h);
      cx.fillStyle = P.at(ph, 1); cx.fillRect(x, H - h - 4, bw, 3);            // glowing cap
      cx.fillStyle = P.at(ph, 0.06); cx.fillRect(x, H - H * 0.78, bw, H * 0.78); // faint full column
    }
    if (b.beat) { cx.fillStyle = P.css(kidSafe(0.1)); cx.fillRect(0, 0, W, H); }
  });

  reg('ribbon', false, function (b, t, P, W, H) {
    fade(0.12);
    var w = b.wave, n = w.length;
    var rg = cx.createLinearGradient(0, 0, 0, H); rg.addColorStop(0, P.at(0, 0.9)); rg.addColorStop(0.5, P.at(0.5, 0.95)); rg.addColorStop(1, P.at(1, 0.9));   // v1.06 palette down the ribbon
    cx.lineWidth = 3; cx.strokeStyle = rg; cx.beginPath();
    for (var i = 0; i < n; i += 4) {
      var x = W * 0.5 + ((w[i] - 128) / 128) * W * 0.42 * sens();
      var y = (i / n) * H;
      i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
    }
    cx.stroke();
    cx.lineWidth = 1; cx.strokeStyle = P.at(0.5, 0.35); cx.beginPath();
    for (var j = 0; j < n; j += 4) {
      var x2 = W * 0.5 + ((w[j] - 128) / 128) * W * 0.3 * sens();
      var y2 = (j / n) * H;
      j === 0 ? cx.moveTo(x2, y2) : cx.lineTo(x2, y2);
    }
    cx.stroke();
  });

  var fount = [];
  reg('fountain', false, function (b, t, P, W, H) {
    fade(0.18);
    var burst = b.beat ? 26 : Math.round(b.energy * 5);
    for (var i = 0; i < burst && fount.length < 420; i++)
      fount.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.22, y: H * 0.92, vx: (Math.random() - 0.5) * 7, vy: -(6 + Math.random() * 11) * (0.6 + b.bass), life: 1, hi: Math.random() < b.high * 1.6 });
    cx.fillStyle = P.at(0.5, 0.14 + b.bass * 0.25);
    cx.beginPath(); cx.ellipse(W / 2, H * 0.94, W * (0.16 + b.bass * 0.12), H * 0.035, 0, 0, 7); cx.fill();
    for (var k = fount.length - 1; k >= 0; k--) {
      var p2 = fount[k];
      p2.x += p2.vx; p2.y += p2.vy; p2.vy += 0.22; p2.life -= 0.012;
      if (p2.life <= 0 || p2.y > H) { fount.splice(k, 1); continue; }
      cx.fillStyle = P.at(Math.max(0, Math.min(1, p2.x / W)), p2.life);   // v1.06 droplets take their palette colour from where they are across the wall
      var r2 = 2.5 * p2.life + (p2.hi ? 1 : 0);
      if (p2.hi) { cx.fillRect(p2.x - r2 / 2, p2.y - r2 / 2, r2, r2); cx.fillStyle = 'rgba(255,255,255,' + (p2.life * 0.6) + ')'; }
      cx.fillRect(p2.x - r2 / 2, p2.y - r2 / 2, r2, r2);
    }
  });

  reg('aurora', false, function (b, t, P, W, H) {
    fade(0.07);
    for (var band = 0; band < 3; band++) {
      var amp = [b.bass, b.mid, b.high][band] * sens();
      cx.beginPath();
      for (var y = 0; y <= H; y += 14) {
        var ph = y / H;
        var x = W * (0.25 + band * 0.25)
          + Math.sin(ph * 4 + t * (0.3 + band * 0.18) + band * 2) * W * 0.13 * (0.5 + amp)
          + Math.sin(ph * 11 + t * 0.9) * W * 0.03 * b.high * 3;
        y === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
      }
      cx.lineWidth = 26 + amp * 60;
      cx.strokeStyle = P.at(band / 2, [0.10 + amp * 0.2, 0.08 + amp * 0.18, 0.07 + amp * 0.16][band]);   // v1.06 each veil takes a palette band
      cx.stroke();
    }
  });

  var drops = [];
  reg('pond', false, function (b, t, P, W, H) {
    fade(0.1);
    if (b.beat || Math.random() < b.energy * 0.12)
      drops.push({ x: Math.random() * W, y: H * 0.2 + Math.random() * H * 0.7, r: 0, v: 2.2 + b.bass * 4, a: 0.8 });
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.r += d.v; d.a *= 0.975;
      if (d.a < 0.02) { drops.splice(i, 1); continue; }
      var pf = Math.max(0, Math.min(1, d.x / W));   // v1.06 ripple colour by where it landed
      cx.beginPath(); cx.ellipse(d.x, d.y, d.r, d.r * 0.38, 0, 0, 7);
      cx.lineWidth = 2 + d.a * 3; cx.strokeStyle = P.at(pf, d.a); cx.stroke();
      cx.beginPath(); cx.ellipse(d.x, d.y, d.r * 0.6, d.r * 0.22, 0, 0, 7);
      cx.lineWidth = 1.5; cx.strokeStyle = P.at((pf + 0.15) % 1, d.a * 0.5); cx.stroke();
    }
  });

  reg('vinyl', false, function (b, t, P, W, H) {
    fade(1);
    var cxx = W / 2, cy = H * 0.4, R = W * 0.36;
    cx.save(); cx.translate(cxx, cy); cx.rotate(t * 1.6);
    cx.fillStyle = '#0c0d11'; cx.beginPath(); cx.arc(0, 0, R, 0, 7); cx.fill();
    for (var g2 = 0; g2 < 7; g2++) { cx.beginPath(); cx.arc(0, 0, R * (0.45 + g2 * 0.08), 0, 7); cx.lineWidth = 1; cx.strokeStyle = 'rgba(255,255,255,' + (0.04 + 0.05 * b.energy) + ')'; cx.stroke(); }
    if (np.art) { cx.save(); cx.beginPath(); cx.arc(0, 0, R * 0.34, 0, 7); cx.clip(); try { cx.drawImage(np.art, -R * 0.34, -R * 0.34, R * 0.68, R * 0.68); } catch (e) {} cx.restore(); }
    else { cx.fillStyle = P.at(0.5, 0.9); cx.beginPath(); cx.arc(0, 0, R * 0.34, 0, 7); cx.fill(); }
    cx.restore();
    // twin VU meters — LO reads the palette's low end, HI its high end
    for (var m2 = 0; m2 < 2; m2++) {
      var mpf = m2 ? 0.85 : 0.15;
      var mx = W * (0.28 + m2 * 0.44), my = H * 0.78, mr = W * 0.16;
      cx.beginPath(); cx.arc(mx, my, mr, Math.PI, 2 * Math.PI); cx.lineWidth = 3; cx.strokeStyle = P.at(mpf, 0.35); cx.stroke();
      var v = Math.min(1, (m2 ? b.high + b.mid : b.bass + b.lowmid) * sens());
      var ang = Math.PI + v * Math.PI;
      cx.beginPath(); cx.moveTo(mx, my); cx.lineTo(mx + Math.cos(ang) * mr * 0.92, my + Math.sin(ang) * mr * 0.92);
      cx.lineWidth = 3.5; cx.strokeStyle = P.at(mpf, 0.95); cx.stroke();
      cx.fillStyle = P.at(mpf, 0.5); cx.font = '600 ' + Math.round(W * 0.03) + 'px system-ui'; cx.textAlign = 'center';
      cx.fillText(m2 ? 'HI' : 'LO', mx, my + W * 0.04);
    }
  });

  reg('mandala', false, function (b, t, P, W, H) {
    fade(0.2);
    var cxx = W / 2, cy = H / 2, SEG = 14;
    cx.save(); cx.translate(cxx, cy); cx.rotate(t * 0.25);
    for (var s2 = 0; s2 < SEG; s2++) {
      cx.save(); cx.rotate((s2 / SEG) * 2 * Math.PI);
      var mag = [b.bass, b.lowmid, b.mid, b.high][s2 % 4] * sens();
      var L = W * 0.16 + mag * W * 0.42;
      cx.beginPath(); cx.moveTo(0, W * 0.05);
      cx.quadraticCurveTo(W * 0.06, W * 0.05 + L * 0.5, 0, W * 0.05 + L);
      cx.quadraticCurveTo(-W * 0.06, W * 0.05 + L * 0.5, 0, W * 0.05);
      cx.fillStyle = P.at(s2 / SEG, 0.15 + mag * 0.4);   // v1.06 each petal takes its palette angle
      cx.fill();
      cx.restore();
    }
    cx.beginPath(); cx.arc(0, 0, W * 0.03 + b.bass * W * 0.04, 0, 7); cx.fillStyle = P.at(0.5, 0.9); cx.fill();
    cx.restore();
  });

  var flies = [];
  reg('fireflies', false, function (b, t, P, W, H) {
    fade(0.16);
    while (flies.length < 160) flies.push({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * 7, ph: Math.random() * 7 });
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      f.a += (Math.sin(t * 0.7 + f.ph) * 0.04) + (b.beat ? (seeded(i) - 0.5) * 0.9 : 0);
      var sp = 0.5 + b.energy * 3.2;
      f.x += Math.cos(f.a) * sp; f.y += Math.sin(f.a) * sp;
      if (f.x < 0) f.x += W; if (f.x > W) f.x -= W; if (f.y < 0) f.y += H; if (f.y > H) f.y -= H;
      var tw = 0.25 + 0.75 * Math.max(0, Math.sin(t * (2 + (i % 5)) + f.ph)) * (0.4 + b.high * 1.6);
      cx.fillStyle = P.at(f.x / W, tw);   // v1.06 firefly colour follows the palette across the wall
      var r2 = 1.6 + tw * 2.4;
      cx.beginPath(); cx.arc(f.x, f.y, r2, 0, 7); cx.fill();
    }
  });

  reg('skyline', false, function (b, t, P, W, H) {
    fade(0.3);
    var N = 9;
    for (var i = 0; i < N; i++) {
      var bw = W / N, x = i * bw;
      var bh = H * (0.25 + seeded(i) * 0.4);
      cx.fillStyle = 'rgba(10,11,16,0.9)';
      cx.fillRect(x + bw * 0.08, H - bh, bw * 0.84, bh);
      var mag = [b.bass, b.lowmid, b.mid, b.high][i % 4] * sens();
      var rows = Math.floor(bh / (H * 0.045)), lit = Math.round(rows * Math.min(1, mag * 1.3));
      for (var r2 = 0; r2 < rows; r2++) {
        for (var c2 = 0; c2 < 3; c2++) {
          var on = r2 < lit;
          cx.fillStyle = on ? P.at(i / N, c2 === 1 ? 0.9 : 0.7) : 'rgba(255,255,255,0.03)';   // v1.06 palette per building
          cx.fillRect(x + bw * (0.16 + c2 * 0.25), H - bh + bh - (r2 + 1) * H * 0.045 + H * 0.008, bw * 0.16, H * 0.028);
        }
      }
    }
    var sky = cx.createLinearGradient(0, 0, 0, H * 0.35);                          // faint sky glow (kept subtle: fade equilibrium)
    sky.addColorStop(0, P.css(kidSafe(0.012 + b.bass * 0.02))); sky.addColorStop(1, P.css(0));
    cx.fillStyle = sky; cx.fillRect(0, 0, W, H * 0.35);
  });

  var embers = [];
  reg('fireplace', false, function (b, t, P, W, H) {
    fade(0.24);
    var base = H * 0.88;
    for (var i = 0; i < 6; i++) {
      var fx2 = W * (0.2 + i * 0.12), amp = (0.5 + b.bass * 1.2) * sens();
      var fh = H * 0.12 * amp * (0.7 + 0.5 * Math.sin(t * (6 + i) + i * 2));
      var g2 = cx.createRadialGradient(fx2, base, 2, fx2, base - fh * 0.4, Math.max(4, fh));
      g2.addColorStop(0, P.at(0.92, 0.5 + b.bass * 0.4));   // v1.06 hot core = palette high end
      g2.addColorStop(0.5, P.at(0.55, 0.35));
      g2.addColorStop(1, P.at(0.2, 0));
      cx.fillStyle = g2;
      cx.beginPath(); cx.ellipse(fx2, base - fh * 0.35, W * 0.09, Math.max(6, fh), 0, 0, 7); cx.fill();
    }
    if (b.beat || Math.random() < 0.2)
      embers.push({ x: W * (0.25 + Math.random() * 0.5), y: base, vy: -(1.5 + Math.random() * 2.5), a: 1 });
    for (var k = embers.length - 1; k >= 0; k--) {
      var e2 = embers[k];
      e2.y += e2.vy; e2.x += Math.sin(t * 3 + k) * 0.7; e2.a -= 0.008;
      if (e2.a <= 0) { embers.splice(k, 1); continue; }
      cx.fillStyle = P.at(0.82, e2.a);
      cx.fillRect(e2.x, e2.y, 2.5, 2.5);
    }
  });

  /* ---- panoramas (draw in virtual wall space; translate by -off) ---- */
  reg('wave', true, function (b, t, P, W, H, G) {
    fade(0.14);
    cx.save(); cx.translate(-G.off, 0);
    var w = b.wave, n = w.length;
    var wg = cx.createLinearGradient(0, 0, G.span, 0); wg.addColorStop(0, P.at(0, 0.9)); wg.addColorStop(0.5, P.at(0.5, 0.9)); wg.addColorStop(1, P.at(1, 0.9));   // v1.06 palette runs the length of the wall
    cx.lineWidth = 4; cx.strokeStyle = wg; cx.beginPath();
    for (var i = 0; i < n; i += 2) {
      var x = (i / n) * G.span;
      var y = H / 2 + ((w[i] - 128) / 128) * H * 0.3 * sens();
      i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
    }
    cx.stroke();
    cx.lineWidth = 1.5; cx.strokeStyle = P.at(0.5, 0.4); cx.beginPath();
    for (var j = 0; j < n; j += 2) {
      var x2 = (j / n) * G.span;
      var y2 = H / 2 + ((w[j] - 128) / 128) * H * 0.42 * sens() * Math.sin(t + j / 60);
      j === 0 ? cx.moveTo(x2, y2) : cx.lineTo(x2, y2);
    }
    cx.stroke();
    cx.restore();
  });

  reg('stadium', true, function (b, t, P, W, H, G) {
    fade(0.3);
    var TOT = 30, bw = G.span / (TOT * 1.3), gap = (G.span - TOT * bw) / (TOT + 1);
    cx.save(); cx.translate(-G.off, 0);
    for (var i = 0; i < TOT; i++) {
      var ph = i / TOT;
      var mag = (ph < 0.25 ? b.bass : ph < 0.5 ? b.lowmid : ph < 0.75 ? b.mid : b.high) * sens() * (0.8 + 0.4 * seeded(i));
      mag = Math.min(1, Math.max(0.06, mag));
      var h = mag * H * 0.8, x = gap + i * (bw + gap);
      var gr = cx.createLinearGradient(0, H - h, 0, H);
      gr.addColorStop(0, P.at(ph, 0.95)); gr.addColorStop(1, P.at(ph, 0.1));   // v1.06 palette across the spectrum
      cx.fillStyle = gr; cx.fillRect(x, H - h, bw, h);
      cx.fillStyle = 'rgba(255,255,255,0.85)'; cx.fillRect(x, H - h - 4, bw, 3);
    }
    cx.restore();
  });

  reg('beatsweep', true, function (b, t, P, W, H, G) {
    fade(0.3);
    if (!beatsweepQ) beatsweepQ = [];
    if (b.beat && beatsweepQ.length < 3 && (!beatsweepQ.length || t - beatsweepQ[beatsweepQ.length - 1].born > 0.5))
      beatsweepQ.push({ born: t, dir: (beatsweepQ.length % 2) ? -1 : 1 });
    // faint spectrum floor so the wall isn't empty between pulses
    cx.save(); cx.translate(-G.off, 0);
    for (var f2 = 0; f2 < 18; f2++) {
      var mag2 = [b.bass, b.lowmid, b.mid, b.high][f2 % 4] * 0.5;
      cx.fillStyle = P.at(f2 / 17, 0.08 + mag2 * 0.15);   // v1.06 spectrum floor takes the palette across the wall
      var bw2 = G.span / 24;
      cx.fillRect(f2 * (G.span / 18) + bw2 * 0.1, H - mag2 * H * 0.25 - 4, bw2 * 0.6, mag2 * H * 0.25 + 4);
    }
    for (var i = beatsweepQ.length - 1; i >= 0; i--) {
      var s2 = beatsweepQ[i], age = t - s2.born;
      if (age > 1.6) { beatsweepQ.splice(i, 1); continue; }
      var k2 = age / 1.6;
      var px = (s2.dir > 0 ? k2 : 1 - k2) * G.span;
      var a = kidSafe((1 - k2) * 0.32);
      var gr = cx.createLinearGradient(px - W * 0.35, 0, px + W * 0.35, 0);
      gr.addColorStop(0, P.css(0)); gr.addColorStop(0.5, P.css(a)); gr.addColorStop(1, P.css(0));
      cx.fillStyle = gr; cx.fillRect(px - W * 0.35, 0, W * 0.7, H);
      cx.fillStyle = 'rgba(255,255,255,' + kidSafe((1 - k2) * 0.25) + ')';
      cx.fillRect(px - 2, 0, 4, H);                                        // bright leading edge
    }
    cx.restore();
  });
  var beatsweepQ = null;

  var stars = null, shots = [];
  reg('constellation', true, function (b, t, P, W, H, G) {
    fade(0.22);
    if (!stars) { stars = []; for (var i = 0; i < 210; i++) stars.push({ x: seeded(i) * G.span, y: seeded(i + 500) * H, ph: seeded(i + 900) * 7, s: 0.8 + seeded(i + 300) * 1.8 }); }
    cx.save(); cx.translate(-G.off, 0);
    for (var j = 0; j < stars.length; j++) {
      var st2 = stars[j];
      var tw = 0.25 + 0.75 * Math.max(0, Math.sin(t * (0.8 + (j % 7) * 0.3) + st2.ph)) * (0.5 + b.high * 1.4);
      cx.fillStyle = j % 5 ? 'rgba(255,255,255,' + tw * 0.75 + ')' : P.at(st2.x / G.span, tw);   // v1.06 accent stars take their palette position on the wall
      cx.beginPath(); cx.arc(st2.x, st2.y, st2.s * (0.7 + tw * 0.6), 0, 7); cx.fill();
    }
    if (b.beat) shots.push({ x: Math.random() * G.span, y: Math.random() * H * 0.5, vx: 14 + Math.random() * 10, vy: 4 + Math.random() * 4, a: 1 });
    for (var k = shots.length - 1; k >= 0; k--) {
      var sh = shots[k];
      sh.x += sh.vx; sh.y += sh.vy; sh.a -= 0.02;
      if (sh.a <= 0 || sh.x > G.span) { shots.splice(k, 1); continue; }
      cx.strokeStyle = P.at(sh.x / G.span, sh.a); cx.lineWidth = 2.5;
      cx.beginPath(); cx.moveTo(sh.x - sh.vx * 3, sh.y - sh.vy * 3); cx.lineTo(sh.x, sh.y); cx.stroke();
    }
    cx.restore();
  });

  /* Phase 2d dev-check (drift alarm — console.warn only, no behaviour change):
     the registered renderers and IE.VIZ_STYLES (engine.js, the app's catalogue)
     must stay in lockstep — ids AND pan flags. reg() is the ground truth for pan. */
  try {
    var _decl = (window.IE && IE.VIZ_STYLES) || [];
    _decl.forEach(function (s) {
      if (s.id === 'shuffle') return;   // virtual entry — rotates the real styles
      if (!STYLES[s.id]) console.warn('[RS-MUSIC-VIZ] IE.VIZ_STYLES lists "' + s.id + '" but no renderer is registered');
      else if (!!s.pan !== !!STYLES[s.id].pan) console.warn('[RS-MUSIC-VIZ] pan flag mismatch for "' + s.id + '": IE.VIZ_STYLES says ' + !!s.pan + ', reg() says ' + !!STYLES[s.id].pan);
    });
    Object.keys(STYLES).forEach(function (id) {
      if (!_decl.some(function (s) { return s.id === id; })) console.warn('[RS-MUSIC-VIZ] renderer "' + id + '" is not in IE.VIZ_STYLES — the app cannot offer it');
    });
  } catch (e) {}

  /* ---------------- mount / render loop ---------------- */
  function mount() {
    if (wrap) return;
    wrap = document.createElement('div');
    // v1.06: transparent when this frame draws its own background beneath the canvas.
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2;overflow:hidden;background:' + (TRANSP ? 'transparent' : '#04050a') + ';';
    cv = document.createElement('canvas');
    var S = 3;                                        // render at 1/3 device res, CSS-scaled
    cv.width = Math.max(360, Math.round(innerWidth / S));
    cv.height = Math.max(640, Math.round(innerHeight / S));
    cv.style.cssText = 'width:100%;height:100%;';
    wrap.appendChild(cv);
    var npEl = document.createElement('div');
    npEl.id = 'rs-viz-np';
    npEl.style.cssText = 'position:absolute;left:50%;bottom:3.5%;transform:translateX(-50%);max-width:86%;'
      + 'font:600 2.1vw system-ui;color:rgba(255,240,210,.75);text-align:center;text-shadow:0 2px 14px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    wrap.appendChild(npEl);
    document.body.appendChild(wrap);
    cx = cv.getContext('2d');
    if (!TRANSP) { cx.fillStyle = '#04050a'; cx.fillRect(0, 0, cv.width, cv.height); }
    loop();
  }
  function unmount() {
    if (!wrap) return;
    cancelAnimationFrame(raf);
    wrap.remove(); wrap = cv = cx = null;
    fount.length = 0; drops.length = 0; embers.length = 0; shots.length = 0; stars = null; flies.length = 0;
  }
  function loop() {
    if (!wrap) return;
    raf = requestAnimationFrame(loop);
    var now = performance.now();
    if (now - lastFrame < 33) return;                 // ~30fps is plenty at TV distance
    lastFrame = now;
    var styleId = activeStyle();
    var S2 = STYLES[styleId] ? styleId : 'cathedral';
    var st = STYLES[S2];
    var b = getBands();
    var t = Date.now() / 1000;
    var P = pal(), W = cv.width, H = cv.height;
    if (wrap) wrap.style.background = TRANSP ? 'transparent' : '#04050a';   // v1.06 keep in sync if the mode changed under us
    cx.globalCompositeOperation = TRANSP ? 'lighter' : 'source-over';        // v1.06 additive over a background, opaque otherwise
    // v1.06 panorama appearance is per-frame (cfg.ori) as well as per-style.
    var pan = (st.pan || TESTPAN || (cfg && cfg.ori === 'panorama')) ? geo(W) : null;
    try { st.fn(b, t, P, W, H, pan); } catch (e) {}
    if (TRANSP) cx.globalCompositeOperation = 'source-over';
    var npEl = document.getElementById('rs-viz-np');
    if (npEl) {
      var txt = (np.track ? np.track + (np.artist ? '  ·  ' + np.artist : '') : '');
      if (npEl.textContent !== txt) npEl.textContent = txt;
      npEl.style.display = (cfg && cfg.nowPlaying === false) ? 'none' : '';
    }
  }
  setInterval(function () {
    try {
      var on = !!activeStyle();
      if (on && !wrap) mount();
      else if (!on && wrap) unmount();
    } catch (e) {}
  }, 1000);
})();
/* ================= ROOMSCAPE PLAYLIST DISPLAYS (2026-07-22) =================
   RS-PLAYLIST v1 (fx.js v1.06) — the ♪ Playlist Wall content type. When a frame's
   Wall content type is 'playlist', the conductor sends state.framePlaylist[idx]
   { display, ori, color, sens, bg }. buildLayerHTML renders the background + an
   empty [data-plhost]; this module fills it with the chosen display, driven by
   /api/music/status (track / artist / album art / progress). Reactive displays
   (artviz, spectrum, lyricstrip) pulse to a shared musical clock (real analyser
   when the mode playlist plays through the TVs). 8 displays.
   Appended to fx.js. */
;(function () {
  if (window.__rsPlaylistViz) return; window.__rsPlaylistViz = true;
  var FRAMES = (window.IE && window.IE.FRAME_IDS) || [];   // v1.07: single source of truth (v1.40: live layout array)
  var qs = new URLSearchParams(location.search);
  var FID = (qs.get('frame') || qs.get('id') || '').toUpperCase();
  var MYIDX = FRAMES.indexOf(FID);
  if (MYIDX < 0) return;
  var cfg = null, stKind = null, lastStateFetch = 0;
  var np = { track: '', artist: '', artUrl: '', pos: 0, dur: 0, queue: [], t: 0 };
  var host = null, sig = '', cvp = null, cxp = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function accent() { return (cfg && cfg.color && cfg.color !== 'auto') ? cfg.color : '#e0c88a'; }

  function poll() {
    var now = Date.now();
    if (now - lastStateFetch > 3000) {
      lastStateFetch = now;
      fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
        stKind = (s && s.frames && s.frames[MYIDX]) || null;
        cfg = (s && s.framePlaylist && s.framePlaylist[MYIDX]) || null;
      }).catch(function () {});
    }
    if (now - np.t > 5000) {
      np.t = now;
      fetch('/api/music/status').then(function (r) { return r.json(); }).then(function (j) {
        var m = j || {};
        np.track = String(m.track || m.title || (m.media && m.media.title) || '');
        np.artist = String(m.artist || (m.media && m.media.artist) || '');
        np.artUrl = m.art || m.image || m.entity_picture || (m.media && m.media.image) || '';
        np.dur = +(m.duration || m.media_duration || (m.media && m.media.duration) || 0) || 0;
        np.pos = +(m.position || m.media_position || (m.media && m.media.position) || 0) || 0;
        np.queue = (m.queue || m.upNext || (m.media && m.media.queue) || []).slice ? (m.queue || m.upNext || []).slice(0, 4) : [];
      }).catch(function () {});
    }
  }
  setInterval(poll, 1500); poll();

  function findHost() { return document.querySelector('[data-plhost]'); }

  function render() {
    host = findHost();
    if (stKind !== 'playlist' || !host || !cfg) { sig = ''; cvp = cxp = null; return; }
    var disp = cfg.display || 'nowplaying';
    /* Phase 2d: unknown display ids fall back to nowplaying (the raw id used to
       be echoed straight into the class / renderer picker). Warn once per id. */
    if (!((window.IE && IE.PLAYLIST_DISPLAYS) || []).some(function (d) { return d.id === disp; })) {
      if (render._warned !== disp) { render._warned = disp; console.warn('[RS-PLAYLIST] unknown display "' + disp + '" — falling back to nowplaying'); }
      disp = 'nowplaying';
    }
    var s = disp + '|' + np.track + '|' + np.artist + '|' + np.artUrl;
    if (s === sig && host.firstChild) return;   // only rebuild on real change
    sig = s;
    host.className = 'ie-pl d-' + disp;
    host.style.setProperty('--plc', accent());
    var art = np.artUrl ? '<img class="art" src="' + esc(np.artUrl) + '" onerror="this.style.visibility=\'hidden\'">' : '<div class="art"></div>';
    var title = np.track ? esc(np.track) : 'Nothing playing';
    var artist = np.artist ? esc(np.artist) : '—';
    var h = '';
    if (disp === 'nowplaying' || disp === 'coverflow' || disp === 'vinyl') {
      h = '<div class="fg">' + art + '<div class="lbl">now playing</div><div class="ttl">' + title + '</div><div class="art2">' + artist + '</div>'
        + (np.dur ? '<div class="prog"><i data-plprog></i></div>' : '') + '</div>';
    } else if (disp === 'lyricstrip') {
      h = '<div class="fg"><div class="lbl">now playing</div><div class="ttl" data-plpulse>' + title + '</div><div class="art2">' + artist + '</div></div>';
    } else if (disp === 'queue') {
      var rows = '<div class="q cur"><span>▶ ' + title + '</span><b></b></div>';
      (np.queue || []).forEach(function (q) { var t = typeof q === 'string' ? q : (q.title || q.track || ''); if (t) rows += '<div class="q"><span>' + esc(t) + '</span><b></b></div>'; });
      if (!np.queue || !np.queue.length) rows += '<div class="q"><span style="opacity:.5">up next…</span><b></b></div>';
      h = '<div class="fg">' + art + '<div class="art2" style="margin-top:1cqmin">' + artist + '</div><div class="queue">' + rows + '</div></div>';
    } else if (disp === 'collage') {
      var tiles = ''; for (var i = 0; i < 9; i++) tiles += '<span style="background-image:url(\'' + esc(np.artUrl) + '\');opacity:' + (0.55 + 0.05 * (i % 5)) + '"></span>';
      h = '<div class="collage">' + tiles + '</div><div class="fg" style="justify-content:flex-end"><div class="ttl" style="font-size:4cqmin">' + title + '</div><div class="art2">' + artist + '</div></div>';
    } else { // artviz + spectrum — album art (or bg) with a reactive canvas
      var bgArt = (disp === 'artviz' && np.artUrl) ? '<div class="ie-bgi" style="background-image:url(\'' + esc(np.artUrl) + '\')"></div><div class="ie-bgdim" style="background:rgba(0,0,0,.42)"></div>' : '';
      h = bgArt + '<canvas class="plcanvas" data-plcv></canvas><div class="fg" style="justify-content:flex-end">'
        + (disp === 'spectrum' && np.artUrl ? '<img class="art" style="width:34cqmin" src="' + esc(np.artUrl) + '" onerror="this.style.visibility=\'hidden\'">' : '')
        + '<div class="lbl">now playing</div><div class="ttl" style="font-size:4cqmin">' + title + '</div><div class="art2">' + artist + '</div></div>';
    }
    host.innerHTML = h;
    var c = host.querySelector('[data-plcv]');
    if (c) { cvp = c; cvp.width = 240; cvp.height = 420; cxp = cvp.getContext('2d'); } else { cvp = cxp = null; }
  }

  // shared musical clock (deterministic; real analyser tap when audio is present)
  var an = null, fr = null;
  function bands() {
    try { var A = window.IE && IE.audio; if (A && A.ctx && A.master) { if (!an) { an = A.ctx.createAnalyser(); an.fftSize = 128; fr = new Uint8Array(an.frequencyBinCount); A.master.connect(an); } an.getByteFrequencyData(fr); var sum = 0; for (var i = 0; i < fr.length; i++) sum += fr[i]; if (sum > 8) return fr; } } catch (e) {}
    return null;
  }
  function draw() {
    render();
    var sens = (cfg && cfg.sens) || 1, t = Date.now() / 1000;
    var beat = 0.5 + 0.5 * Math.sin(t * Math.PI * (100 / 60));   // ~100bpm clock
    var pulse = host && host.querySelector('[data-plpulse]');
    if (pulse) pulse.style.transform = 'scale(' + (1 + 0.05 * beat * sens) + ')';
    var pg = host && host.querySelector('[data-plprog]');
    if (pg && np.dur) pg.style.width = Math.max(2, Math.min(100, (np.pos / np.dur) * 100)) + '%';
    if (cxp && cvp) {
      var W = cvp.width, H = cvp.height, col = accent();
      cxp.clearRect(0, 0, W, H);
      var f = bands(), N = 22, bw = W / (N * 1.3);
      for (var i = 0; i < N; i++) {
        var mag = f ? (f[Math.min(f.length - 1, i + 2)] / 255) : (0.35 + 0.4 * Math.abs(Math.sin(t * 2 + i * 0.5)) * beat);
        mag = Math.min(1, mag * sens);
        var bh = mag * H * 0.5, x = i * (W / N) + (W / N - bw) / 2;
        cxp.fillStyle = col; cxp.globalAlpha = 0.85;
        cxp.fillRect(x, H - bh, bw, bh);
      }
      cxp.globalAlpha = 1;
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
/* ================= ROOMSCAPE VIZ PREVIEW (2026-07-23) =================
   RS-VIZ-PREVIEW (fx.js v1.06) — animates the per-style stand-in canvases that
   vizStageHTML emits in the app's Design canvas ONLY (never on a live kiosk frame,
   which runs the real RS-MUSIC-VIZ engine). Each canvas carries data-vzs (style),
   data-vzc (colour: 'auto' | 'pal:<id>' | '#hex'), data-vzo (portrait|panorama).
   Styles are grouped into ~10 visual families so flipping the dropdown visibly
   changes the preview, and every family is palette-aware (IE.palAt). Appended. */
;(function () {
  if (window.__rsVizPrev) return; window.__rsVizPrev = true;
  var isFrame = (function () { try { var q = new URLSearchParams(location.search); return !!(q.get('frame') || q.get('id')); } catch (e) { return false; } })();
  if (isFrame) return;                                   // live frames use the real engine
  var FAM = { cathedral: 'bars', stadium: 'bars', skyline: 'bars', ribbon: 'wave', wave: 'wave',
    fountain: 'particles', fireflies: 'particles', aurora: 'ribbons', pond: 'ripples', vinyl: 'vinyl',
    mandala: 'mandala', fireplace: 'fire', beatsweep: 'sweep', constellation: 'stars' };
  var SHUF = ['bars', 'wave', 'particles', 'ribbons', 'ripples', 'mandala', 'vinyl', 'fire', 'stars', 'sweep'];
  /* Phase 2d dev-check (drift alarm — console.warn only): every style in the
     catalogue should have a preview family here, or its Design-canvas preview
     silently falls back to 'bars'. */
  try {
    ((window.IE && IE.VIZ_STYLES) || []).forEach(function (s) {
      if (s.id !== 'shuffle' && !FAM[s.id]) console.warn('[RS-VIZ-PREVIEW] style "' + s.id + '" has no FAM preview family — preview falls back to bars');
    });
  } catch (e) {}
  function specOf(val) {
    var stops = (window.IE && IE.palStops) ? IE.palStops(val) : null;
    if (stops) return { stops: stops };
    var m = /^#?([0-9a-f]{6})$/i.exec(val || ''); var h = m ? m[1] : 'e0c88a';
    return { rgb: parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) };
  }
  function col(spec, f, a) { var c = spec.stops ? (IE.palAt(spec.stops, f).join(',')) : spec.rgb; return 'rgba(' + c + ',' + (a == null ? 1 : a) + ')'; }
  var R = {};
  R.bars = function (cx, W, H, t, S, beat, st) { var N = 16; for (var i = 0; i < N; i++) { var mag = 0.22 + 0.72 * Math.abs(Math.sin(t * 3 + i * 0.55)) * (0.55 + 0.6 * beat); var h = mag * H * 0.72, bw = W / (N * 1.2), x = i * (W / N) + (W / N - bw) / 2; cx.fillStyle = col(S, i / (N - 1), 0.95); cx.fillRect(x, H - h, bw, h); cx.fillStyle = col(S, i / (N - 1), 1); cx.fillRect(x, H - h - 2, bw, 2); } };
  R.wave = function (cx, W, H, t, S, beat) { for (var pass = 0; pass < 2; pass++) { cx.lineWidth = Math.max(2, W * (pass ? 0.006 : 0.014)); cx.strokeStyle = col(S, pass ? 0.4 : 0.75, pass ? 0.4 : 0.95); cx.beginPath(); for (var x = 0; x <= W; x += 4) { var y = H * 0.5 + Math.sin(x / W * 6 + t * 2 + pass) * H * 0.22 * (0.5 + beat) + Math.sin(x / W * 13 + t * 3) * H * 0.05; x === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y); } cx.stroke(); } };
  R.particles = function (cx, W, H, t, S, beat, st) { st.p = st.p || []; if (st.p.length < 90 && Math.random() < 0.6 + beat) st.p.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.9, vx: (Math.random() - 0.5) * 2, vy: -(2 + Math.random() * 4) * (0.6 + beat), l: 1 }); for (var k = st.p.length - 1; k >= 0; k--) { var p = st.p[k]; p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.l -= 0.012; if (p.l <= 0) { st.p.splice(k, 1); continue; } cx.fillStyle = col(S, 1 - p.l, p.l); var r = W * 0.013 * p.l + 1; cx.fillRect(p.x - r / 2, p.y - r / 2, r, r); } };
  R.ribbons = function (cx, W, H, t, S) { for (var band = 0; band < 3; band++) { cx.beginPath(); for (var y = 0; y <= H; y += 8) { var x = W * (0.28 + band * 0.22) + Math.sin(y / H * 4 + t * (0.4 + band * 0.2) + band) * W * 0.14; y === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y); } cx.lineWidth = W * 0.06; cx.strokeStyle = col(S, band / 2, 0.14 + band * 0.03); cx.stroke(); } };
  R.ripples = function (cx, W, H, t, S, beat, st) { st.r = st.r || []; if (beat > 0.82 && (!st.last || t - st.last > 0.28)) { st.r.push({ r: 0, l: 1 }); st.last = t; } if (!st.r.length) st.r.push({ r: 0, l: 1 }); for (var k = st.r.length - 1; k >= 0; k--) { var q = st.r[k]; q.r += W * 0.012; q.l -= 0.01; if (q.l <= 0) { st.r.splice(k, 1); continue; } cx.beginPath(); cx.arc(W / 2, H / 2, q.r, 0, 7); cx.lineWidth = 2; cx.strokeStyle = col(S, 1 - q.l, q.l); cx.stroke(); } };
  R.vinyl = function (cx, W, H, t, S) { var rad = Math.min(W, H) * 0.36; cx.save(); cx.translate(W / 2, H / 2); cx.rotate(t * 1.2); cx.fillStyle = 'rgba(18,18,24,0.92)'; cx.beginPath(); cx.arc(0, 0, rad, 0, 7); cx.fill(); for (var i = 1; i < 7; i++) { cx.beginPath(); cx.arc(0, 0, rad * i / 7, 0, 7); cx.strokeStyle = col(S, i / 7, 0.28); cx.lineWidth = 1; cx.stroke(); } cx.fillStyle = col(S, 0.8, 1); cx.beginPath(); cx.arc(0, 0, rad * 0.16, 0, 7); cx.fill(); cx.restore(); };
  R.mandala = function (cx, W, H, t, S, beat) { var seg = 12; cx.save(); cx.translate(W / 2, H / 2); for (var s = 0; s < seg; s++) { cx.rotate(Math.PI * 2 / seg); var len = Math.min(W, H) * (0.16 + 0.22 * Math.abs(Math.sin(t * 2))) * (0.6 + beat * 0.6); cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(0, -len); cx.lineWidth = W * 0.02; cx.strokeStyle = col(S, s / seg, 0.55); cx.stroke(); cx.beginPath(); cx.arc(0, -len, W * 0.02, 0, 7); cx.fillStyle = col(S, s / seg, 0.85); cx.fill(); } cx.restore(); };
  R.fire = function (cx, W, H, t, S, beat, st) { st.f = st.f || []; for (var n = 0; n < 3; n++) if (st.f.length < 80) st.f.push({ x: W * 0.5 + (Math.random() - 0.5) * W * 0.3, y: H * 0.9, vy: -(1 + Math.random() * 3), l: 1 }); for (var k = st.f.length - 1; k >= 0; k--) { var p = st.f[k]; p.y += p.vy; p.x += (Math.random() - 0.5) * 1.4; p.l -= 0.02; if (p.l <= 0) { st.f.splice(k, 1); continue; } cx.fillStyle = col(S, p.l, p.l * 0.75); var r = W * 0.03 * p.l + 2; cx.beginPath(); cx.arc(p.x, p.y, r, 0, 7); cx.fill(); } };
  R.sweep = function (cx, W, H, t, S, beat) { var x = ((t * 0.4) % 1) * W, N = 20; var g = cx.createLinearGradient(x - W * 0.2, 0, x + W * 0.2, 0); g.addColorStop(0, col(S, 0.2, 0)); g.addColorStop(0.5, col(S, 0.5, 0.4 + beat * 0.4)); g.addColorStop(1, col(S, 0.8, 0)); cx.fillStyle = g; cx.fillRect(0, 0, W, H); for (var i = 0; i < N; i++) { var bx = i * (W / N), d = Math.abs(bx - x) / (W * 0.22), mag = Math.max(0, 1 - d), h = mag * H * 0.6; cx.fillStyle = col(S, i / (N - 1), 0.3 + mag * 0.6); cx.fillRect(bx, H - h, W / N * 0.7, h); } };
  R.stars = function (cx, W, H, t, S, beat, st) { st.s = st.s || []; while (st.s.length < 34) st.s.push({ x: Math.random() * W, y: Math.random() * H, ph: Math.random() * 6 }); cx.lineWidth = 1; for (var a = 0; a < st.s.length; a++) for (var b2 = a + 1; b2 < st.s.length; b2++) { var dx = st.s[a].x - st.s[b2].x, dy = st.s[a].y - st.s[b2].y; if (dx * dx + dy * dy < (W * 0.3) * (W * 0.3)) { cx.strokeStyle = col(S, 0.5, 0.18); cx.beginPath(); cx.moveTo(st.s[a].x, st.s[a].y); cx.lineTo(st.s[b2].x, st.s[b2].y); cx.stroke(); } } st.s.forEach(function (p, i) { var tw = 0.5 + 0.5 * Math.sin(t * 2 + p.ph); cx.fillStyle = col(S, i / st.s.length, tw); cx.beginPath(); cx.arc(p.x, p.y, W * 0.008 + tw, 0, 7); cx.fill(); }); };
  function frame() {
    var t = Date.now() / 1000, beat = 0.5 + 0.5 * Math.sin(t * Math.PI * (100 / 60));
    var list = document.querySelectorAll('.ie-vizprevcv');
    for (var i = 0; i < list.length; i++) {
      var cv = list[i], w = cv.clientWidth || 120, h = cv.clientHeight || 200;
      if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h;
      var cx = cv.getContext('2d'); cx.clearRect(0, 0, cv.width, cv.height);
      var style = cv.dataset.vzs || 'cathedral';
      var fam = (style === 'shuffle') ? SHUF[Math.floor(t / 3) % SHUF.length] : (FAM[style] || 'bars');
      cv._st = cv._st || {};
      try { R[fam](cx, cv.width, cv.height, t, specOf(cv.dataset.vzc), beat, cv._st); } catch (e) {}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
