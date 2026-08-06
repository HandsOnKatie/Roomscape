/* ===================================================================
   The Immersion Engine — shared core (engine.js)  v0.78  (v0.78: N-frame layouts — IE.LAYOUT + IE.setLayout(l) adopt the conductor's /api/layout; IE.wallKeyOf/wallFramesOf/slotOf/wallSizeOf replace all wall-of-3 math; FRAME_IDS mutated in place so old references stay live; pano width set per wall size)
   (v0.77: WS liveness watchdog — client ping every 20s + force-close after 90s silence so a silently-dead TCP connection re-enters the reconnect loop instead of freezing the frame [L2/Goldfinger incident 2026-07-24]; WebSocket constructor throw now re-arms retry instead of permanently killing the loop)
   (v0.76: 'viz' + 'playlist' frame kinds — music visualiser & now-playing become Wall content types; IE.VIZ_PALETTES + palStops/palAt/palCss shared colour palettes (gold, VU, sunset, ocean, aurora, fire, ice, neon, rainbow, viridis, plasma, magma); social dispatch → IE.onSocial; captions opt-in; frame ids in hello; '_' profiles hidden)
   Classic script (no modules) so it works over file:// AND http://
   Exposes window.IE = { GAMES, MODES, ... , renderFrame, buildControlDeck,
                         createBus, defaultState, FRAME_IDS }
   =================================================================== */
(function (global) {
  'use strict';

  /* -------------------- DATA -------------------- */
  var FRAME_IDS = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'];
  /* v0.78: the room layout is the single source of truth for wall/frame geometry.
     Default = the classic two walls of three. setLayout() adopts the conductor's
     GET /api/layout ({frames,walls}) — FRAME_IDS is mutated IN PLACE so every
     module that captured a reference (fx.js appended blocks etc.) stays current. */
  var LAYOUT = { walls: { L: ['L1', 'L2', 'L3'], R: ['R1', 'R2', 'R3'] } };
  function _wallsFromFrames(fr) { var w = {}; fr.forEach(function (f) { var k = String(f).charAt(0); (w[k] = w[k] || []).push(f); }); return w; }
  function setLayout(l) {
    if (!l) return;
    var walls = (l.walls && Object.keys(l.walls).length) ? l.walls
      : (Array.isArray(l.frames) && l.frames.length ? _wallsFromFrames(l.frames) : null);
    if (!walls) return;
    LAYOUT.walls = walls;
    var frames = (Array.isArray(l.frames) && l.frames.length) ? l.frames
      : Object.keys(walls).reduce(function (a, k) { return a.concat(walls[k]); }, []);
    FRAME_IDS.length = 0;
    frames.forEach(function (f) { FRAME_IDS.push(f); });
  }
  function wallKeyOf(idx) {
    var f = FRAME_IDS[idx], ks = Object.keys(LAYOUT.walls);
    for (var i = 0; i < ks.length; i++) if (LAYOUT.walls[ks[i]].indexOf(f) >= 0) return ks[i];
    return ks[0] || 'L';
  }
  function wallFramesOf(idx) {   // indices (into FRAME_IDS) of every frame on idx's wall, in wall order
    return (LAYOUT.walls[wallKeyOf(idx)] || []).map(function (f) { return FRAME_IDS.indexOf(f); }).filter(function (x) { return x >= 0; });
  }
  function slotOf(idx) {         // 0-based position of idx within its own wall
    var s = (LAYOUT.walls[wallKeyOf(idx)] || []).indexOf(FRAME_IDS[idx]);
    return s < 0 ? 0 : s;
  }
  function wallSizeOf(idx) { return (LAYOUT.walls[wallKeyOf(idx)] || []).length || 1; }
  var FRAMEKINDS = ['pano', 'score', 'map', 'portrait', 'photos', 'viz', 'playlist', 'clock', 'off'];
  var KIND_ICON = { pano: '', score: '▤', map: '◰', portrait: '☻', photos: '❏', viz: '🎶', playlist: '♪', clock: '◷', off: '○' };
  /* v0.76 shared colour palettes for the 🎶 Music Viz content type. Each is a set of
     gradient stops (low→high). Curated tones: a VU meter (green·amber·red as requested),
     warm/cool naturals, neon, full rainbow, and the perceptually-uniform matplotlib maps
     (viridis / plasma / magma / inferno) which read well as audio spectra. cfg.color is
     'auto' (=gold), 'pal:<id>' for a palette, or '#rrggbb' for a solid custom colour. */
  var VIZ_PALETTES = [
    { id: 'gold',      name: 'Gold (classic)',        stops: ['#3a2a08', '#c9a24a', '#ffe6a8'] },
    { id: 'vu',        name: 'VU meter — green→red',  stops: ['#37c46a', '#e0c23b', '#e0453b'] },
    { id: 'sunset',    name: 'Sunset',                stops: ['#2a1a4a', '#c0397a', '#f5872e', '#ffd35c'] },
    { id: 'ocean',     name: 'Ocean',                 stops: ['#06304a', '#1f9fb0', '#8fe6d8'] },
    { id: 'aurora',    name: 'Aurora',                stops: ['#123f2e', '#2fbf7a', '#4fd0e0', '#7a5cf0'] },
    { id: 'fire',      name: 'Fire',                  stops: ['#300a05', '#e0451f', '#ffb43b', '#fff0a0'] },
    { id: 'ice',       name: 'Ice',                   stops: ['#0a2a4a', '#4fb0e0', '#dff2ff'] },
    { id: 'neon',      name: 'Neon',                  stops: ['#ff2fd0', '#7a3cff', '#22e0ff'] },
    { id: 'rainbow',   name: 'Rainbow',               stops: ['#e0453b', '#e0902e', '#e5d13a', '#4fbf5a', '#3a8fe0', '#7a5cf0'] },
    { id: 'viridis',   name: 'Viridis',               stops: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'] },
    { id: 'plasma',    name: 'Plasma',                stops: ['#0d0887', '#7e03a8', '#cc4778', '#f89540', '#f0f921'] },
    { id: 'magma',     name: 'Magma',                 stops: ['#000004', '#51127c', '#b73779', '#fc8961', '#fcfdbf'] }
  ];
  function _palById(id) { for (var i = 0; i < VIZ_PALETTES.length; i++) if (VIZ_PALETTES[i].id === id) return VIZ_PALETTES[i]; return null; }
  function _hexArr(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; }
  // stops for a cfg.color value, or null when it's a solid colour (single hex)
  function palStops(colorVal) {
    if (!colorVal || colorVal === 'auto') return _palById('gold').stops;
    if (String(colorVal).indexOf('pal:') === 0) { var p = _palById(String(colorVal).slice(4)); return p ? p.stops : _palById('gold').stops; }
    return null;
  }
  // interpolate a stops[] at f in [0,1] -> [r,g,b]
  function palAt(stops, f) {
    if (!stops || !stops.length) return [201, 162, 74];
    f = Math.max(0, Math.min(1, f)); var n = stops.length - 1; if (n <= 0) return _hexArr(stops[0]);
    var x = f * n, i = Math.floor(x), fr = x - i, a = _hexArr(stops[i]), b = _hexArr(stops[Math.min(n, i + 1)]);
    return [Math.round(a[0] + (b[0] - a[0]) * fr), Math.round(a[1] + (b[1] - a[1]) * fr), Math.round(a[2] + (b[2] - a[2]) * fr)];
  }
  // representative solid colour (hex) for a cfg.color value — used for text, single-colour styles
  function palCss(colorVal) {
    if (colorVal && colorVal !== 'auto' && String(colorVal).indexOf('pal:') !== 0) return colorVal; // solid custom
    var s = palStops(colorVal); var m = palAt(s, 0.72); return 'rgb(' + m[0] + ',' + m[1] + ',' + m[2] + ')';
  }

  /* Community release: the built-in registries ship with only the at-rest 'dining'
     entry. Real modes come from the Conductor's profiles (see hydrateGames below);
     these objects are the demo/offline fallback and keep their exported shapes. */
  var GAMES = {
    dining:   { name:'Dining Mode', glyph:'🖼', desc:'At rest', accent:'#c9a35e',
                pano:'linear-gradient(160deg,#1c1e26,#0f1117)', light:'gallery',
                ambience:'Quiet room', music:'—', frames:['pano','pano','pano','pano','pano','pano'] }
  };
  var GAME_ORDER = ['dining'];

  var MODES = {
    dining:      { name:'Dining',        icon:'☕', sw:'#c9a35e', d:'Warm, calm, art',         tint:'rgba(201,163,94,.20)', dim:0.0 }
  };
  var MODE_ORDER = ['dining'];

  var LIGHT_SCENES = {
    gallery:  { name:'Gallery',   sw:'linear-gradient(90deg,#c9a35e,#e3c489)' },
    daylight: { name:'Daylight',  sw:'linear-gradient(90deg,#7fb7c9,#e6c98a)' },
    dawn:     { name:'Dawn',      sw:'linear-gradient(90deg,#e8c089,#f0e0b0)' },
    carriage: { name:'Carriage',  sw:'linear-gradient(90deg,#d9b483,#a87a4a)' },
    forest:   { name:'Forest',    sw:'linear-gradient(90deg,#5d8c4a,#c97a2e)' },
    tavern:   { name:'Tavern',    sw:'linear-gradient(90deg,#c97a2e,#e0b04a)' },
    dungeon:  { name:'Dungeon',   sw:'linear-gradient(90deg,#3a2410,#2a3a55)' },
    moonlight:{ name:'Moonlight', sw:'linear-gradient(90deg,#2a3a55,#6c7c9c)' },
    gaslight: { name:'Gaslight',  sw:'linear-gradient(90deg,#2a5544,#c9a35e)' },
    clinical: { name:'Clinical',  sw:'linear-gradient(90deg,#1e5066,#9bd0d0)' },
    storm:    { name:'Storm',     sw:'linear-gradient(90deg,#2a3a55,#9d8cff)' },
    victory:  { name:'Victory',   sw:'linear-gradient(90deg,#e0b04a,#fff0c0)' }
  };
  var ZONES = ['Main','Cove wash','Frame halos','Under-table','Candles','Sconces'];
  var CHANNELS = [
    { id:'music', name:'Music', v:55 },
    { id:'amb',   name:'Ambience', v:65 },
    { id:'sfx',   name:'SFX', v:40 },
    { id:'narr',  name:'Narration', v:0 },
    { id:'master',name:'Master', v:70, master:true }
  ];

  function defaultState() {
    return {
      game:'dining', mode:'dining', phase:'dining',
      brightness:45, warmth:30, light:'gallery',
      zones:{ Main:true,'Cove wash':false,'Frame halos':false,'Under-table':false,Candles:false,Sconces:false },
      channels:{ music:0, amb:0, sfx:40, narr:0, master:70 },
      mutes:{ music:false, amb:false, sfx:false, narr:false, master:false },
      frames:FRAME_IDS.map(function(){return 'pano';}),   /* v0.78: sized from the live layout */
      kid:false, night:false, live:false,
      rev:0
    };
  }

  /* -------------------- STYLES (injected once) -------------------- */
  var STYLE = ''
  + ':root{--bg:#0b0c10;--bg2:#13151b;--panel:#171922;--panel2:#1d2029;--panel3:#23262f;'
  + '--ink:#e8e6df;--ink-dim:#a7a499;--ink-faint:#6a6d79;--line:#2a2d38;'
  + '--gold:#c9a35e;--gold-soft:#e3c489;--teal:#5ec8c8;--violet:#9d8cff;--rose:#e07a8b;--green:#73c990;--amber:#e0b04a;--red:#e0655f;'
  + "--serif:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;"
  + '--sans:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}'
  + '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}'
  + 'button{font-family:inherit;color:inherit;cursor:pointer;border:none;background:none}'
  /* ---- FRAME ---- */
  + '.ie-frame{position:relative;width:100%;height:100%;overflow:hidden;background:#0c0d12;font-family:var(--sans);color:var(--ink)}'
  + '.ie-frame .ie-scene{position:absolute;inset:0;transition:opacity .6s}'
  + '.ie-frame .ie-pano{position:absolute;top:0;height:100%;width:300%;background-size:100% 100%;transition:background .6s}'
  + '.ie-frame .ie-glyph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11vmin;opacity:.8;filter:drop-shadow(0 2px 8px rgba(0,0,0,.55));transition:opacity .6s}'
  + '.ie-frame .ie-cap{position:absolute;left:0;right:0;bottom:0;padding:3.5% 5%;font-size:3.2vmin;letter-spacing:.06em;text-transform:uppercase;color:#f3efe4;background:linear-gradient(180deg,transparent,rgba(0,0,0,.6));text-align:center}'
  + '.ie-frame .ie-panel{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:1.6vmin;padding:8%;background:linear-gradient(180deg,#13151b,#0d0e12)}'
  + '.ie-frame .ie-ph{font-family:var(--serif);font-size:4vmin;text-align:center;margin-bottom:1vmin}'
  + '.ie-frame .ie-bar{display:flex;align-items:center;gap:2vmin;font-size:3vmin;color:#cbd0db}'
  + '.ie-frame .ie-bar .t{min-width:7vmin}'
  + '.ie-frame .ie-bar .track{flex:1;height:2.2vmin;border-radius:3vmin;background:#2a2d38;overflow:hidden}'
  + '.ie-frame .ie-bar .track i{display:block;height:100%;border-radius:3vmin}'
  + '.ie-frame .ie-big{font-size:9vmin;font-variant-numeric:tabular-nums;text-align:center;color:#e8e6df}'
  + '.ie-frame .ie-sub{font-size:3vmin;color:var(--ink-faint);text-align:center;letter-spacing:.1em;text-transform:uppercase}'
  + '.ie-frame .ie-tint{position:absolute;inset:0;mix-blend-mode:soft-light;transition:background .6s,opacity .5s;pointer-events:none}'
  + '.ie-frame .ie-dim{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .5s;pointer-events:none}'
  + '.ie-frame .ie-halo{position:absolute;inset:0;box-shadow:none;transition:box-shadow .6s;pointer-events:none}'
  + '.ie-frame.off .ie-glyph,.ie-frame.off .ie-pano{opacity:.12}'
  + '.ie-frame .ie-id{position:absolute;top:8px;left:8px;font-size:11px;letter-spacing:2px;background:rgba(0,0,0,.45);color:#e3c489;padding:3px 8px;border-radius:6px;transition:opacity 1s;z-index:9}'
  /* ---- CONTROL DECK ---- */
  + '.ie-ctl{font-family:var(--sans);color:var(--ink);display:flex;flex-direction:column;min-height:0}'
  + '.ie-ctlhead{display:flex;align-items:center;gap:12px;padding:8px 10px;border-bottom:1px solid var(--line);flex-wrap:wrap}'
  + '.ie-mark{width:30px;height:30px;border-radius:8px;background:radial-gradient(circle at 30% 25%,var(--gold-soft),var(--gold) 60%,#7a5e2c);box-shadow:0 0 14px rgba(201,163,94,.5)}'
  + '.ie-bt h1{font-family:var(--serif);font-size:15px;margin:0;line-height:1}'
  + '.ie-bt .s{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-faint)}'
  + '.ie-badge{display:flex;align-items:center;gap:9px;padding:5px 12px;border-radius:30px;background:var(--panel);border:1px solid var(--line)}'
  + '.ie-dot{width:9px;height:9px;border-radius:50%;background:var(--ink-faint)}'
  + '.ie-dot.live{background:var(--green);animation:iepulse 2s infinite}'
  + '@keyframes iepulse{0%{box-shadow:0 0 0 0 rgba(115,201,144,.5)}70%{box-shadow:0 0 0 8px rgba(115,201,144,0)}100%{box-shadow:0 0 0 0 rgba(115,201,144,0)}}'
  + '.ie-badge .w{font-family:var(--serif);font-size:14px;color:var(--gold-soft)}'
  + '.ie-badge .p{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--ink-dim);border-left:1px solid var(--line);padding-left:9px}'
  + '.ie-sp{flex:1}'
  + '.ie-tg{display:flex;align-items:center;gap:7px;padding:6px 11px;border-radius:10px;background:var(--panel);border:1px solid var(--line);font-size:12px;color:var(--ink-dim)}'
  + '.ie-tg .sw{width:32px;height:17px;border-radius:20px;background:#2c2f3a;position:relative;transition:.2s}'
  + '.ie-tg .sw::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#7a7d88;transition:.2s}'
  + '.ie-tg.on{color:var(--ink)}.ie-tg.on .sw{background:rgba(94,200,200,.4)}.ie-tg.on .sw::after{left:17px;background:var(--teal)}'
  + '.ie-tg.kid.on .sw{background:rgba(157,140,255,.4)}.ie-tg.kid.on .sw::after{background:var(--violet)}'
  + '.ie-panic{padding:9px 16px;border-radius:11px;font-weight:800;letter-spacing:1.5px;font-size:12px;background:linear-gradient(180deg,#e0655f,#b23a35);color:#fff;box-shadow:0 6px 18px rgba(224,101,95,.35);border:1px solid #f08a85}'
  + '.ie-panic:active{transform:translateY(1px)}'
  + '.ie-tabs{display:flex;gap:2px;padding:6px 6px 0;border-bottom:1px solid var(--line);background:#101218;overflow-x:auto}'
  + '.ie-tab{padding:9px 15px;border-radius:9px 9px 0 0;font-size:12.5px;color:var(--ink-dim);white-space:nowrap}'
  + '.ie-tab.active{color:var(--gold-soft);background:var(--panel);box-shadow:inset 0 2px 0 var(--gold)}'
  + '.ie-panes{flex:1;min-height:0;overflow-y:auto;padding:14px;background:linear-gradient(180deg,var(--panel),var(--bg2))}'
  + '.ie-pane{display:none}.ie-pane.active{display:block;animation:iefade .25s}'
  + '@keyframes iefade{from{opacity:0}to{opacity:1}}'
  + '.ie-zt{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-faint);margin:0 0 10px}'
  + '.ie-games{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}'
  + '@media(max-width:1100px){.ie-games{grid-template-columns:repeat(4,1fr)}}'
  + '.ie-g{border-radius:12px;border:1px solid var(--line);background:var(--panel2);padding:12px 8px;text-align:center;transition:.15s}'
  + '.ie-g:active{transform:scale(.97)}.ie-g .gg{font-size:24px;display:block;margin-bottom:5px}.ie-g .gn{font-size:12px}.ie-g .gd{font-size:9.5px;color:var(--ink-faint);margin-top:2px}'
  + '.ie-g.sel{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 8px 20px rgba(201,163,94,.18);background:linear-gradient(180deg,rgba(201,163,94,.12),var(--panel2))}'
  + '.ie-g.dining{border-style:dashed}'
  + '.ie-modes{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}'
  + '@media(max-width:900px){.ie-modes{grid-template-columns:repeat(2,1fr)}}'
  + '.ie-m{padding:13px 10px;border-radius:11px;border:1px solid var(--line);background:var(--panel2);text-align:left;transition:.15s}'
  + '.ie-m:active{transform:scale(.98)}.ie-m .mn{font-size:13px;display:flex;align-items:center;gap:8px}.ie-m .md{font-size:10px;color:var(--ink-faint);margin-top:3px}'
  + '.ie-m .swt{width:12px;height:12px;border-radius:4px}'
  + '.ie-m.active{border-color:var(--gold-soft);background:linear-gradient(180deg,rgba(201,163,94,.14),var(--panel2));box-shadow:inset 0 0 0 1px rgba(201,163,94,.4)}'
  + '.ie-m.disabled{opacity:.32;pointer-events:none}'
  + '.ie-lgrid{display:grid;grid-template-columns:1.2fr 1fr;gap:18px}@media(max-width:900px){.ie-lgrid{grid-template-columns:1fr}}'
  + '.ie-scenes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
  + '.ie-scn{padding:9px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);font-size:11.5px;text-align:center;transition:.15s}'
  + '.ie-scn:active{transform:scale(.97)}.ie-scn .sw{height:20px;border-radius:6px;margin-bottom:6px}.ie-scn.active{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}'
  + '.ie-sl{margin:13px 0}.ie-sl label{display:flex;justify-content:space-between;font-size:12px;color:var(--ink-dim);margin-bottom:6px}.ie-sl label b{color:var(--gold-soft)}'
  + 'input[type=range]{-webkit-appearance:none;width:100%;height:6px;border-radius:6px;background:#2a2d38;outline:none}'
  + 'input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--gold-soft),var(--gold));box-shadow:0 2px 8px rgba(0,0,0,.5)}'
  + 'input[type=range].teal::-webkit-slider-thumb{background:radial-gradient(circle at 35% 30%,#aef0f0,var(--teal))}'
  + '.ie-zones{display:flex;flex-wrap:wrap;gap:8px}'
  + '.ie-z{padding:8px 12px;border-radius:9px;border:1px solid var(--line);background:var(--panel2);font-size:11.5px;color:var(--ink-dim);display:flex;align-items:center;gap:7px}'
  + '.ie-z .led{width:9px;height:9px;border-radius:50%;background:#3a3d48}.ie-z.on{color:var(--ink);border-color:rgba(201,163,94,.4)}.ie-z.on .led{background:var(--gold);box-shadow:0 0 8px var(--gold)}'
  + '.ie-mixer{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;align-items:end}'
  + '.ie-ch{display:flex;flex-direction:column;align-items:center;gap:7px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:11px 6px}'
  + '.ie-vu{width:30px;height:96px;border-radius:7px;background:#0c0d12;border:1px solid var(--line);overflow:hidden;display:flex;align-items:flex-end}'
  + '.ie-vu i{display:block;width:100%;background:linear-gradient(0deg,var(--green),var(--amber) 70%,var(--red));height:0%;transition:height .1s}'
  + '.ie-ch.master .ie-vu i{background:linear-gradient(0deg,var(--teal),var(--gold-soft))}'
  + '.ie-fader{writing-mode:vertical-lr;direction:rtl;width:6px;height:80px;-webkit-appearance:none;background:#2a2d38;border-radius:6px}'
  + '.ie-fader::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:14px;border-radius:4px;background:linear-gradient(180deg,#e9e6df,#9a978d);box-shadow:0 2px 6px rgba(0,0,0,.5)}'
  + '.ie-ch .cn{font-size:11px}.ie-ch .cv{font-size:10px;color:var(--ink-faint)}'
  + '.ie-mt{font-size:9px;letter-spacing:1px;padding:3px 8px;border-radius:6px;border:1px solid var(--line);color:var(--ink-faint)}'
  + '.ie-mt.on{background:rgba(224,101,95,.18);border-color:var(--red);color:#f0a09a}'
  + '.ie-np{margin-top:13px;display:flex;align-items:center;gap:12px;padding:9px 14px;border-radius:11px;background:var(--panel2);border:1px solid var(--line);font-size:12px}'
  + '.ie-wgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}'
  + '.ie-ft{border-radius:10px;border:1px solid var(--line);background:var(--panel2);padding:7px;text-align:center;transition:.15s}'
  + '.ie-ft:active{transform:scale(.97)}.ie-ft .fp{aspect-ratio:9/14;border-radius:6px;margin-bottom:5px;display:flex;align-items:center;justify-content:center;font-size:17px;border:1px solid #0a0b0f}'
  + '.ie-ft .fl{font-size:10px;color:var(--ink-dim)}.ie-ft .fk{font-size:9px;color:var(--ink-faint)}'
  + '.ie-tl{display:flex;align-items:center;margin:6px 0 14px;flex-wrap:wrap}'
  + '.ie-ps{flex:1;min-width:84px;text-align:center;position:relative;padding:0 2px}'
  + '.ie-ps .pc{width:32px;height:32px;border-radius:50%;margin:0 auto 6px;border:2px solid var(--line);background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--ink-faint);position:relative;z-index:2}'
  + '.ie-ps .pl{font-size:10px;color:var(--ink-faint)}'
  + '.ie-ps::before{content:"";position:absolute;top:16px;left:-50%;width:100%;height:2px;background:var(--line);z-index:1}.ie-ps:first-child::before{display:none}'
  + '.ie-ps.done .pc{border-color:var(--gold);color:var(--gold-soft)}.ie-ps.done::before{background:var(--gold)}'
  + '.ie-ps.cur .pc{border-color:var(--gold-soft);background:var(--gold);color:#1a1407;box-shadow:0 0 16px rgba(201,163,94,.6)}.ie-ps.cur .pl{color:var(--gold-soft)}'
  + '.ie-pcs{display:flex;gap:10px;justify-content:center}'
  + '.ie-pb{padding:10px 20px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);font-size:12.5px}'
  + '.ie-pb.primary{background:linear-gradient(180deg,var(--gold-soft),var(--gold));color:#1a1407;font-weight:700;border:none}.ie-pb:active{transform:scale(.97)}'
  + '.ie-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(40px);opacity:0;transition:.3s;background:var(--panel3);border:1px solid var(--gold);color:var(--ink);padding:10px 18px;border-radius:12px;font-size:13px;z-index:50;box-shadow:0 12px 30px rgba(0,0,0,.5)}'
  + '.ie-toast.show{transform:translateX(-50%);opacity:1}'
  /* Room tab (Home Assistant TV + lights controls) */
  + '.ie-roomnote{color:var(--ink-faint);font-size:12.5px;line-height:1.6;padding:14px;border:1px dashed var(--line);border-radius:12px}'
  + '.ie-rsec{display:flex;align-items:center;gap:8px;margin:6px 0 10px}.ie-rsec .t{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);margin-right:6px}'
  + '.ie-rb{padding:7px 12px;border-radius:9px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);font-size:12.5px;cursor:pointer}.ie-rb:hover{border-color:var(--gold);color:var(--gold)}'
  + '.ie-rtvs{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}'
  + '.ie-rtv{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--panel)}'
  + '.ie-rtv.on{border-color:rgba(201,163,94,.55)}'
  + '.ie-rtv .rh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}.ie-rtv .rh b{font-size:13px}'
  + '.ie-rtv .rs,.ie-rlight .rs{font-size:11px;color:var(--ink-faint)}'
  + '.ie-rtv .rr{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}.ie-rtv .rr .ie-rb{padding:5px 9px}'
  + '.ie-rsel{width:100%;background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:5px;font-size:12px}'
  + '.ie-rlight{display:flex;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid var(--line)}.ie-rlight span:first-child{min-width:160px;font-size:12.5px}.ie-rlight input{flex:1}'
  + '.ie-rscenes{display:flex;gap:7px;flex-wrap:wrap}'
  /* big thumbnail launch cards (tablet-friendly) */
  + '.ie-g.big{background-size:cover;background-position:center;min-height:124px;justify-content:flex-end;padding:12px}'
  + '.ie-g.big .gn{font-size:16px;text-shadow:0 1px 8px rgba(0,0,0,.9)}'
  + '.ie-g.big .gd{text-shadow:0 1px 5px rgba(0,0,0,.9)}'
  + '@media (pointer:coarse){.ie-g.big{min-height:150px}.ie-tab{padding:12px 16px;font-size:14px}}';

  var stylesDone = false;
  function ensureStyles() {
    if (stylesDone) return;
    var s = document.createElement('style');
    s.id = 'ie-styles';
    s.textContent = STYLE;
    document.head.appendChild(s);
    stylesDone = true;
  }

  /* -------------------- FRAME RENDERING -------------------- */
  function frameIndex(id) { return FRAME_IDS.indexOf((id || 'L1').toUpperCase()); }

  function renderFrame(container, frameId, state) {
    ensureStyles();
    var idx = frameIndex(frameId); if (idx < 0) idx = 0;
    var col = slotOf(idx), pw = 'width:' + (wallSizeOf(idx) * 100) + '%;';   /* v0.78: slot + wall width from IE.LAYOUT, not %3 */
    var g = GAMES[state.game] || GAMES.dining;
    var m = MODES[state.mode] || MODES.dining;
    var kind = (state.frames && state.frames[idx]) || 'pano';

    container.className = 'ie-frame' + (kind === 'off' ? ' off' : '');
    var img = state.frameImages && state.frameImages[idx];   // real photo from the Conductor, if any
    var inner = '';
    if (kind === 'pano') {
      if (img) {
        // one wide image stretched across this wall's N frames; each frame shows its slice
        inner += '<div class="ie-pano" style="' + pw + 'left:' + (-col * 100) + '%;background-image:url(\'' + img + '\');background-size:100% 100%;background-repeat:no-repeat"></div>';
      } else {
        inner += '<div class="ie-pano" style="' + pw + 'left:' + (-col * 100) + '%;background:' + g.pano + '"></div>';
        inner += '<div class="ie-glyph">' + g.glyph + '</div>';
      }
      if (state.captions) inner += '<div class="ie-cap">' + g.desc + '</div>';
    } else if (kind === 'off') {
      inner += '<div class="ie-pano" style="' + pw + 'left:' + (-col * 100) + '%;background:#0c0d12"></div>';
    } else if (kind === 'score') {
      inner += panelScore(g);
    } else if (kind === 'map') {
      inner += panelMap(g);
    } else if (kind === 'clock') {
      inner += panelClock(g, m);
    } else if (kind === 'portrait') {
      if (img) {
        inner += '<div class="ie-pano" style="left:0;width:100%;background-image:url(\'' + img + '\');background-size:cover;background-position:center"></div>';
        if (state.captions) inner += '<div class="ie-cap">' + g.desc + '</div>';
      } else {
        inner += panelPortrait(g);
      }
    } else if (kind === 'viz') {
      inner += panelViz(g, state, idx);
    } else if (kind === 'playlist') {
      inner += panelPlaylist(g, state, idx);
    }
    // lighting overlays
    var tint = m.tint || ('rgba(' + hexToRgb(g.accent) + ',.28)');
    var bright = state.kid ? Math.min(state.brightness, 70) : state.brightness;
    var dark = (100 - bright) / 100 * 0.7 + (m.dim || 0);
    dark = Math.max(0, Math.min(0.85, dark));
    var tintOpacity = 0.55 + (state.warmth / 100) * 0.4;
    var halo = (state.zones && state.zones['Frame halos'] && state.game !== 'dining')
      ? 'inset 0 0 18vmin 1vmin ' + g.accent + '55' : 'none';

    inner += '<div class="ie-tint" style="background:' + tint + ';opacity:' + tintOpacity + '"></div>';
    inner += '<div class="ie-dim" style="opacity:' + dark + '"></div>';
    inner += '<div class="ie-halo" style="box-shadow:' + halo + '"></div>';
    inner += '<div class="ie-id" data-ieid>' + ((frameId && String(frameId).toUpperCase()) || FRAME_IDS[idx]) + '</div>';   /* v0.78: show the real id even when it isn't in the layout */
    container.innerHTML = inner;
  }

  function panelScore(g) {
    function bar(t, p, c) { return '<div class="ie-bar"><span class="t">' + t + '</span><span class="track"><i style="width:' + p + '%;background:' + c + '"></i></span></div>'; }
    return '<div class="ie-panel"><div class="ie-ph" style="color:' + g.accent + '">SCORE</div>'
      + bar('Red', 70, '#e0655f') + bar('Cyan', 55, '#5ec8c8') + bar('Green', 40, '#73c990') + bar('Gold', 25, '#e0b04a') + '</div>';
  }
  function panelMap(g) {
    return '<div class="ie-panel"><div class="ie-ph" style="color:' + g.accent + '">◰ MAP</div>'
      + '<div style="flex:1;background:' + g.pano + ';border-radius:6px;opacity:.55"></div></div>';
  }
  function panelClock(g, m) {
    return '<div class="ie-panel" style="justify-content:center"><div class="ie-ph" style="color:' + g.accent + '">PHASE</div>'
      + '<div class="ie-big">03:42</div><div class="ie-sub">' + (m ? m.name : '') + '</div></div>';
  }
  function panelPortrait(g) {
    return '<div class="ie-panel" style="justify-content:center;align-items:center"><div style="font-size:18vmin">' + g.glyph + '</div>'
      + '<div class="ie-sub" style="color:' + g.accent + ';margin-top:2vmin">Narrator</div></div>';
  }
  /* v0.76 design-preview stand-ins for the two music content types (the real
     audio-reactive art is drawn on the TVs by fx.js RS-MUSIC-VIZ). */
  function panelViz(g, state, idx) {
    var cfg = (state.frameViz && state.frameViz[idx]) || {};
    var bg = cfg.bgUrl ? ('background-image:url(\'' + cfg.bgUrl + '\');background-size:cover;background-position:center') : ('background:radial-gradient(120% 90% at 50% 120%,' + g.accent + '22,#0b0c11)');
    var col = (cfg.color && cfg.color !== 'auto') ? cfg.color : g.accent;
    var bars = '';
    for (var b = 0; b < 9; b++) { var hgt = 20 + Math.round(60 * Math.abs(Math.sin((idx + 1) * 1.7 + b * 0.8))); bars += '<i style="flex:1;background:' + col + ';height:' + hgt + '%;border-radius:2px 2px 0 0;opacity:.9"></i>'; }
    return '<div class="ie-pano" style="left:0;width:100%;' + bg + '"></div>'
      + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:6% 8%">'
      + '<div style="display:flex;align-items:flex-end;gap:3%;height:42%">' + bars + '</div>'
      + (cfg.nowPlaying !== false ? '<div class="ie-sub" style="color:#fff;margin-top:3%;text-shadow:0 1px 4px #000;font-size:2.6vmin">🎶 Music visuals · ' + (cfg.style || 'cathedral') + (cfg.ori === 'panorama' ? ' · wall' : '') + '</div>' : '')
      + '</div>';
  }
  function panelPlaylist(g, state, idx) {
    var cfg = (state.framePlaylist && state.framePlaylist[idx]) || {};
    var bg = cfg.bgUrl ? ('background-image:url(\'' + cfg.bgUrl + '\');background-size:cover;background-position:center') : ('background:linear-gradient(160deg,#14161c,#0b0c11)');
    var disp = cfg.display || 'nowplaying';
    var col = (cfg.color && cfg.color !== 'auto') ? cfg.color : g.accent;
    return '<div class="ie-pano" style="left:0;width:100%;' + bg + '"></div>'
      + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2vmin;padding:8%">'
      + '<div style="width:44%;aspect-ratio:1;border-radius:8px;background:' + col + '22;border:1px solid ' + col + '66;display:flex;align-items:center;justify-content:center;font-size:9vmin">♪</div>'
      + '<div class="ie-ph" style="color:' + col + ';font-size:3vmin;text-align:center">NOW PLAYING</div>'
      + '<div class="ie-sub" style="color:#9aa0ab;font-size:2.4vmin">' + disp + (cfg.ori === 'panorama' ? ' · wall' : '') + '</div></div>';
  }
  function hexToRgb(h) {
    h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }

  /* -------------------- SYNC BUS (no server) -------------------- */
  /* Channels used, in order of reliability for each test mode:
     - postMessage  (parent <-> iframe : works on file:// in wall-test)
     - BroadcastChannel + localStorage 'storage' event (same-origin over http://)
     - optional WebSocket (real Conductor) when ?ws=ws://host:port is given
     Message shape: { ie:true, type:'state'|'hello', state? }                */
  var CH = 'immersion-engine';
  function createBus(role, opts) {
    opts = opts || {};
    var listeners = [];
    var current = null;
    var bc = null;
    try { bc = new BroadcastChannel(CH); } catch (e) {}
    var ws = null;
    var lastMsgAt = Date.now();   // v0.77: liveness — any inbound WS traffic refreshes this
    if (opts.ws) {
      // auto-reconnect with capped exponential backoff, so frames survive
      // a Conductor restart / NAS reboot without a kiosk restart.
      // Retries on BOTH error and close (guarded to fire once per attempt):
      // some runtimes fire only 'error' when a reconnect attempt fails.
      (function connect(delay) {
        var sock;
        try { sock = ws = new WebSocket(opts.ws); }
        catch (e) {
          // v0.77: constructor throw must NOT kill the reconnect loop — this was
          // the one exit that never re-armed retry (permanent no-WS until reload).
          ws = null;
          setTimeout(function () { connect(Math.min(delay * 2, 30000)); }, delay);
          return;
        }
        var retried = false;
        function retry() {
          if (retried) return; retried = true;
          try { sock.close(); } catch (_) {}
          if (ws === sock) ws = null;
          setTimeout(function () { connect(Math.min(delay * 2, 30000)); }, delay);
        }
        sock.onopen = function () {
          delay = 1000; // reset backoff after a successful connection
          lastMsgAt = Date.now();
          try {
            var meF = role === 'frame' ? new URLSearchParams(location.search).get('frame') : null;
            sock.send(JSON.stringify({ ie: true, type: 'hello', frame: meF }));   // v0.72: frames identify themselves
          } catch (_) {}
        };
        sock.onmessage = function (ev) { lastMsgAt = Date.now(); try { var d = JSON.parse(ev.data); handle(d); } catch (_) {} };
        sock.onerror = retry;
        sock.onclose = retry;
      })(1000);
      // v0.77: liveness watchdog. A silently-dead TCP connection (NAS reboot
      // mid-idle, switch/NIC power event) leaves readyState===1 forever with no
      // error/close event — the frame is "connected but deaf" and freezes on the
      // last painted scene (the 2026-07-24 L2/Goldfinger incident). The conductor
      // pushes a clock message every 2s, so >90s of silence on an open socket
      // means the connection is dead: force-close it, which re-enters the normal
      // retry/backoff loop. The periodic ping also forces the OS to notice a
      // dead TCP path (an idle receiver never can).
      setInterval(function () {
        var sock = ws;
        if (!sock || sock.readyState !== 1) return;
        try { sock.send(JSON.stringify({ ie: true, type: 'ping', t: Date.now() })); } catch (_) {}
        if (Date.now() - lastMsgAt > 90000) { try { sock.close(); } catch (_) {} }
      }, 20000);
    }
    function emit(state) { current = state; listeners.forEach(function (f) { f(state); }); }
    function handle(d) {
      if (!d || !d.ie) return;
      if (d.type === 'state' && d.state) emit(d.state);
      if (d.type === 'hello' && role === 'control' && current) publish(current);
      if (d.type === 'reload' && role === 'frame') {   // conductor-pushed page reload (all or one frame)
        try {
          var me = new URLSearchParams(location.search).get('frame');
          if (!d.frame || d.frame === 'all' || d.frame === me) location.reload();
        } catch (_) {}
      }
      if (d.type === 'social') {                       // v0.75: Social DLC — sound + event everywhere (frames AND app canvas)
        try { if (window.IE && typeof IE.onSocial === 'function') IE.onSocial(d); } catch (_) {}
      }
      if (d.type === 'reveal' && role === 'frame') {   // v0.74: conductor-pushed reveal trigger
        try {
          var meR = new URLSearchParams(location.search).get('frame');
          if (!d.frame || d.frame === 'all' || d.frame === meR) {
            if (window.IE && typeof IE.playReveal === 'function') IE.playReveal(meR);
          }
        } catch (_) {}
      }
      if (d.type === 'audio' && role === 'frame') {    // v1.0: per-frame audio engine (sfx / sweeps)
        try { if (window.IE && typeof IE.onAudio === 'function') IE.onAudio(d); } catch (_) {}
      }
      if (d.type === 'identify' && role === 'frame') { // v1.0: flash this TV's frame id (+ optional sound)
        try {
          var meD = new URLSearchParams(location.search).get('frame');
          if (!d.frame || d.frame === 'all' || d.frame === meD) {
            if (window.IE && typeof IE.onIdentify === 'function') IE.onIdentify(d.sound);
          }
        } catch (_) {}
      }
    }
    if (bc) bc.onmessage = function (e) { handle(e.data); };
    window.addEventListener('message', function (e) { handle(e.data); });
    window.addEventListener('storage', function (e) {
      if (e.key === CH + ':state' && e.newValue) { try { emit(JSON.parse(e.newValue)); } catch (_) {} }
    });

    function postEverywhere(msg) {
      if (bc) { try { bc.postMessage(msg); } catch (_) {} }
      if (msg.type === 'state') { try { localStorage.setItem(CH + ':state', JSON.stringify(msg.state)); } catch (_) {} }
      if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(msg)); } catch (_) {} }
      // children (iframes) + opener + parent
      try { for (var i = 0; i < window.frames.length; i++) window.frames[i].postMessage(msg, '*'); } catch (_) {}
      try { if (window.opener) window.opener.postMessage(msg, '*'); } catch (_) {}
      try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (_) {}
    }
    function publish(state) { current = state; postEverywhere({ ie: true, type: 'state', state: state }); }
    function onState(cb) { listeners.push(cb); if (current) cb(current); }
    function requestState() {
      postEverywhere({ ie: true, type: 'hello' });
      try { var s = localStorage.getItem(CH + ':state'); if (s) emit(JSON.parse(s)); } catch (_) {}
    }
    return { publish: publish, onState: onState, requestState: requestState, _role: role };
  }

  /* -------------------- TOASTS -------------------- */
  function toast(msg) {
    ensureStyles();
    var t = document.getElementById('ie-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ie-toast'; t.className = 'ie-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* -------------------- CONTROL DECK -------------------- */
  /* buildControlDeck(container, onChange) -> { setState, getState }
     onChange(state) is called whenever the operator changes anything.        */
  function buildControlDeck(container, onChange) {
    ensureStyles();
    var state = defaultState();
    onChange = onChange || function () {};

    container.classList.add('ie-ctl');
    container.innerHTML = ''
    + '<div class="ie-ctlhead">'
    +   '<div class="ie-mark"></div>'
    +   '<div class="ie-bt"><h1>RoomScape</h1><div class="s">Control · legacy panel</div></div>'
    +   '<div class="ie-badge"><span class="ie-dot" data-dot></span><span class="w" data-world>Dining Mode</span><span class="p" data-phase>At rest</span></div>'
    +   '<div class="ie-sp"></div>'
    +   '<button class="ie-tg kid" data-kid><span class="sw"></span>Kid-Safe</button>'
    +   '<button class="ie-tg" data-night><span class="sw"></span>Late-Night</button>'
    +   '<button class="ie-panic" data-panic>◼ RESTORE ROOM</button>'
    + '</div>'
    + '<div class="ie-tabs">'
    +   '<button class="ie-tab active" data-tab="launch">▶ Launch</button>'
    +   '<button class="ie-tab" data-tab="modes">◐ Modes</button>'
    +   '<button class="ie-tab" data-tab="light">☀ Lighting</button>'
    +   '<button class="ie-tab" data-tab="sound">♪ Sound</button>'
    +   '<button class="ie-tab" data-tab="wall">▦ Wall</button>'
    +   '<button class="ie-tab" data-tab="phase">⟳ Phase</button>'
    +   '<button class="ie-tab" data-tab="style">✦ Style</button>'
    +   '<button class="ie-tab" data-tab="room">⌂ Room</button>'
    + '</div>'
    + '<div class="ie-panes">'
    +   '<div class="ie-pane active" data-pane="launch"><div class="ie-zt">Tap a game to transform the room — or tap the box on the table</div><div class="ie-games" data-games></div></div>'
    +   '<div class="ie-pane" data-pane="modes"><div class="ie-zt">Room mode — sets light, sound &amp; screens together</div><div class="ie-modes" data-modes></div></div>'
    +   '<div class="ie-pane" data-pane="light"><div class="ie-lgrid"><div><div class="ie-zt">Lighting scene</div><div class="ie-scenes" data-scenes></div></div>'
    +     '<div><div class="ie-zt">Master</div><div class="ie-sl"><label>Brightness <b data-brv>45%</b></label><input type="range" data-brightness min="0" max="100" value="45"></div>'
    +     '<div class="ie-sl"><label>Warmth <b data-wmv>Warm</b></label><input type="range" class="teal" data-warmth min="0" max="100" value="30"></div>'
    +     '<div class="ie-zt" style="margin-top:12px">Zones</div><div class="ie-zones" data-zones></div></div></div></div>'
    +   '<div class="ie-pane" data-pane="sound"><div class="ie-zt">Audio mixer — four layers + master</div><div class="ie-mixer" data-mixer></div>'
    +     '<div class="ie-np"><div data-npt>Silent</div><div class="ie-sp"></div><div style="color:var(--ink-faint)" data-npa>Ambience: —</div></div></div>'
    +   '<div class="ie-pane" data-pane="wall"><div class="ie-zt">Wall layout — tap a frame to change what it shows</div><div class="ie-wgrid" data-wgrid></div>'
    +     '<div style="font-size:10.5px;color:var(--ink-faint);margin-top:10px">Frames are grouped by wall (see the id badges) · cycle: Panorama → Score → Map → Portrait → Clock → Off</div></div>'
    +   '<div class="ie-pane" data-pane="phase"><div class="ie-zt">Game phase</div><div class="ie-tl" data-tl></div>'
    +     '<div class="ie-pcs"><button class="ie-pb" data-prev>‹ Previous</button><button class="ie-pb primary" data-next>Advance phase ›</button></div></div>'
    +   '<div class="ie-pane" data-pane="style"></div>'
    +   '<div class="ie-pane" data-pane="room"><div class="ie-zt">Physical room — TVs &amp; lights via Home Assistant</div><div data-roomwrap>Loading…</div></div>'
    + '</div>';

    var q = function (s) { return container.querySelector(s); };
    var qa = function (s) { return container.querySelectorAll(s); };

    // build sub-grids
    q('[data-games]').innerHTML = GAME_ORDER.map(function (k) { var g = GAMES[k];
      return '<button class="ie-g ' + (k === 'dining' ? 'dining' : '') + '" data-game="' + k + '"><span class="gg">' + g.glyph + '</span><span class="gn">' + g.name + '</span><span class="gd">' + g.desc + '</span></button>';
    }).join('');
    q('[data-modes]').innerHTML = MODE_ORDER.map(function (k) { var m = MODES[k];
      return '<button class="ie-m" data-mode="' + k + '"><span class="mn"><span class="swt" style="background:' + m.sw + '"></span>' + m.icon + ' ' + m.name + '</span><span class="md">' + m.d + '</span></button>';
    }).join('');
    q('[data-scenes]').innerHTML = Object.keys(LIGHT_SCENES).map(function (k) { var s = LIGHT_SCENES[k];
      return '<button class="ie-scn" data-scene="' + k + '"><div class="sw" style="background:' + s.sw + '"></div>' + s.name + '</button>';
    }).join('');
    q('[data-zones]').innerHTML = ZONES.map(function (z) { return '<button class="ie-z" data-zone="' + z + '"><span class="led"></span>' + z + '</button>'; }).join('');
    q('[data-mixer]').innerHTML = CHANNELS.map(function (c) {
      return '<div class="ie-ch ' + (c.master ? 'master' : '') + '" data-ch="' + c.id + '"><div class="ie-vu"><i></i></div>'
        + '<input type="range" class="ie-fader" min="0" max="100" value="' + c.v + '" data-fader="' + c.id + '"><div class="cn">' + c.name + '</div>'
        + '<div class="cv" data-cv="' + c.id + '">' + c.v + '</div><button class="ie-mt" data-mute="' + c.id + '">MUTE</button></div>';
    }).join('');
    q('[data-tl]').innerHTML = MODE_ORDER.map(function (k) { var m = MODES[k];
      return '<div class="ie-ps" data-phase="' + k + '"><div class="pc">' + m.icon + '</div><div class="pl">' + m.name + '</div></div>';
    }).join('');
    buildWallGrid();

    function buildWallGrid() {
      q('[data-wgrid]').innerHTML = state.frames.map(function (kind, i) {
        var label = FRAME_IDS[i];
        return '<button class="ie-ft" data-fi="' + i + '"><div class="fp" data-fp="' + i + '"></div><div class="fl">' + label + '</div><div class="fk" data-fk="' + i + '">' + kind + '</div></button>';
      }).join('');
    }

    /* ---- actions ---- */
    function commit() { state.rev = (state.rev || 0) + 1; render(); onChange(state); }

    function startGame(k) {
      state.game = k; var g = GAMES[k];
      state.frames = g.frames.slice(); state.light = g.light;
      if (k === 'dining') {
        state.mode = 'dining'; state.live = false;
        state.channels.music = 0; state.channels.amb = 0; setFaders();
        toast('Room restored to Dining Mode');
      } else {
        state.mode = 'arrival'; state.live = true;
        state.zones['Cove wash'] = true; state.zones['Frame halos'] = true;
        state.channels.music = 55; state.channels.amb = 70; setFaders();
        toast('▸ ' + g.name + ' — Arrival sequence');
        setTimeout(function () { if (state.game === k) { state.mode = 'immersion'; commit(); } }, 1600);
      }
      buildWallGrid(); commit();
    }
    function setMode(k) {
      if (state.kid && MODES[k].scary) { toast('Kid-Safe on — ' + MODES[k].name + ' softened'); return; }
      state.mode = k;
      if (k === 'dining') { startGame('dining'); return; }
      if (k === 'victory') state.light = 'victory';
      if (k === 'boss') state.zones['Frame halos'] = true;
      toast('Mode: ' + MODES[k].name); commit();
    }
    function setFaders() {
      CHANNELS.forEach(function (c) { var f = q('[data-fader="' + c.id + '"]'); if (f) { f.value = state.channels[c.id]; var cv = q('[data-cv="' + c.id + '"]'); if (cv) cv.textContent = state.channels[c.id]; } });
    }

    /* ---- events ---- */
    qa('.ie-tab').forEach(function (t) { t.onclick = function () {
      qa('.ie-tab').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active');
      qa('.ie-pane').forEach(function (p) { p.classList.remove('active'); });
      q('[data-pane="' + t.dataset.tab + '"]').classList.add('active');
    }; });

    container.addEventListener('click', function (e) {
      var el;
      if ((el = e.target.closest('[data-game]'))) { startGame(el.dataset.game); return; }
      if ((el = e.target.closest('[data-mode]'))) { setMode(el.dataset.mode); return; }
      if ((el = e.target.closest('[data-scene]'))) { state.light = el.dataset.scene; toast('Light: ' + LIGHT_SCENES[el.dataset.scene].name); commit(); return; }
      if ((el = e.target.closest('[data-zone]'))) { state.zones[el.dataset.zone] = !state.zones[el.dataset.zone]; commit(); return; }
      if ((el = e.target.closest('[data-mute]'))) { var id = el.dataset.mute; state.mutes[id] = !state.mutes[id]; el.classList.toggle('on', state.mutes[id]); onChange(state); return; }
      if ((el = e.target.closest('[data-fi]'))) { var i = +el.dataset.fi; var idx = FRAMEKINDS.indexOf(state.frames[i]); state.frames[i] = FRAMEKINDS[(idx + 1) % FRAMEKINDS.length]; commit(); return; }
      if ((el = e.target.closest('[data-phase]'))) { setMode(el.dataset.phase); return; }
    });
    q('[data-brightness]').oninput = function (e) { state.brightness = +e.target.value; q('[data-brv]').textContent = (state.kid ? Math.min(state.brightness, 70) : state.brightness) + '%' + (state.kid && state.brightness > 70 ? ' (cap)' : ''); commit(); };
    q('[data-warmth]').oninput = function (e) { state.warmth = +e.target.value; q('[data-wmv]').textContent = state.warmth < 33 ? 'Warm' : state.warmth < 66 ? 'Neutral' : 'Cool'; commit(); };
    qa('[data-fader]').forEach(function (f) { f.oninput = function (e) {
      var id = e.target.dataset.fader, v = +e.target.value;
      if (state.night && id === 'master' && v > 45) { v = 45; e.target.value = 45; toast('Late-Night caps master at 45%'); }
      state.channels[id] = v; q('[data-cv="' + id + '"]').textContent = v; onChange(state);
    }; });
    q('[data-kid]').onclick = function () { state.kid = !state.kid; q('[data-kid]').classList.toggle('on', state.kid);
      toast('Kid-Safe ' + (state.kid ? 'ON — scares & flashes clamped' : 'OFF'));
      if (state.kid && MODES[state.mode] && MODES[state.mode].scary) setMode('immersion'); else commit(); };
    q('[data-night]').onclick = function () { state.night = !state.night; q('[data-night]').classList.toggle('on', state.night);
      if (state.night && state.channels.master > 45) { state.channels.master = 45; setFaders(); }
      toast('Late-Night ' + (state.night ? 'ON — volume & bass capped' : 'OFF')); commit(); };
    q('[data-panic]').onclick = function () { startGame('dining'); toast('⟲ Panic — restoring Dining'); };
    q('[data-next]').onclick = function () { var i = MODE_ORDER.indexOf(state.mode); if (i < MODE_ORDER.length - 1) setMode(MODE_ORDER[i + 1]); };
    q('[data-prev]').onclick = function () { var i = MODE_ORDER.indexOf(state.mode); if (i > 0) setMode(MODE_ORDER[i - 1]); };

    /* ---- render (control reflects its own state) ---- */
    function render() {
      var g = GAMES[state.game] || GAMES.dining, m = MODES[state.mode] || MODES.dining;   // trimmed registries: server-hydrated games / unknown modes fall back to dining
      q('[data-world]').textContent = g.name;
      q('[data-phase]').textContent = (state.game === 'dining' ? 'At rest' : m.name);
      q('[data-dot]').className = 'ie-dot' + (state.live ? ' live' : '');
      qa('.ie-g').forEach(function (c) { c.classList.toggle('sel', c.dataset.game === state.game); });
      qa('.ie-m').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === state.mode); b.classList.toggle('disabled', state.kid && MODES[b.dataset.mode].scary); });
      qa('.ie-scn').forEach(function (s) { s.classList.toggle('active', s.dataset.scene === state.light); });
      qa('.ie-z').forEach(function (z) { z.classList.toggle('on', state.zones[z.dataset.zone]); });
      var ci = MODE_ORDER.indexOf(state.mode);
      qa('.ie-ps').forEach(function (p, idx) { p.classList.toggle('cur', idx === ci); p.classList.toggle('done', idx < ci); });
      state.frames.forEach(function (kind, i) { var fp = q('[data-fp="' + i + '"]'); if (fp) { fp.style.background = kind === 'off' ? '#0c0d12' : g.pano; fp.textContent = kind === 'pano' ? g.glyph : (KIND_ICON[kind] || ''); fp.style.opacity = kind === 'off' ? .4 : 1; } var fk = q('[data-fk="' + i + '"]'); if (fk) fk.textContent = kind; });
      q('[data-npt]').textContent = state.game === 'dining' ? 'Silent' : g.music;
      q('[data-npa]').textContent = 'Ambience: ' + (state.game === 'dining' ? '—' : g.ambience);
    }

    /* ---- hydrate the Launch gallery from the server's real profiles (v0.7) ----
       The static GAMES data is demo fallback; when served by the Conductor we
       rebuild the launch grid as big scene-thumbnail cards (tablet-friendly). */
    (function hydrateGames() {
      if (location.protocol === 'file:') return;
      Promise.all([
        fetch('api/profiles').then(function (r) { return r.json(); }),
        fetch('api/scenes').then(function (r) { return r.json(); })
      ]).then(function (res) {
        var profs = (res[0] && res[0].profiles) || {}, byKey = {};
        ((res[1] && res[1].scenes) || []).forEach(function (s) { byKey[s.key] = s; });
        var order = Object.keys(profs).filter(function (k) { return k.charAt(0) !== '_'; }); if (!order.length) return;   // '_draft' etc hidden
        order.forEach(function (k) {
          var p = profs[k], g = GAMES[k] || {};
          var sc = byKey[p.scene];
          GAMES[k] = Object.assign({ glyph: '▦', pano: 'linear-gradient(160deg,#1c1e26,#0f1117)' }, g, {
            name: p.name || k, accent: p.accent || '#c9a35e', desc: p.ambience || '', ambience: p.ambience || '—',
            music: p.music || '—', light: p.light || 'gallery',
            frames: p.frames || g.frames || FRAME_IDS.map(function () { return 'pano'; }),   /* v0.78 */
            _thumb: sc ? (sc.thumb || sc.sample) : null
          });
        });
        q('[data-games]').innerHTML = order.map(function (k) {
          var g = GAMES[k];
          return '<button class="ie-g big ' + (k === 'dining' ? 'dining' : '') + '" data-game="' + k + '"'
            + (g._thumb ? ' style="background-image:linear-gradient(rgba(8,9,12,.2),rgba(8,9,12,.78)),url(\'' + g._thumb + '\')"' : '')
            + '><span class="gg">' + (g._thumb ? '' : g.glyph) + '</span><span class="gn">' + g.name + '</span><span class="gd">' + g.desc + '</span></button>';
        }).join('');
        render();
      }).catch(function () {});
    })();

    /* ---- Room tab: physical TVs + lights via the Conductor's HA bridge ---- */
    var roomBox = q('[data-roomwrap]');
    var roomCfg = null;
    function haSvc(domain, service, data) {
      fetch('api/ha/service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain, service: service, data: data }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j.ok) toast('HA: ' + (j.error || 'call failed')); setTimeout(loadRoom, 800); })
        .catch(function () { toast('Conductor unreachable'); });
    }
    function loadRoom() {
      if (!roomBox) return;
      fetch('api/ha/room').then(function (r) { return r.json(); })
        .then(function (j) { roomCfg = j; renderRoom(); })
        .catch(function () { roomBox.innerHTML = '<div class="ie-roomnote">Room controls need the Conductor — open this panel from it (e.g. http://&lt;your-server&gt;:8090/?ws=auto).</div>'; });
    }
    function sysRow() {
      return '<div class="ie-rsec"><span class="t">System</span>'
        + '<button class="ie-rb" data-hareload="all" title="Reload every frame page (picks up new scenes/code)">↻ Reload all frames</button>'
        + '<button class="ie-rb" data-harestart title="Conductor exits and Docker relaunches it with fresh code">⟳ Restart Conductor</button></div>';
    }
    function renderRoom() {
      var j = roomCfg; if (!j) return;
      if (document.activeElement && roomBox.contains(document.activeElement) && document.activeElement !== roomBox) return; // don't fight an open select/slider
      if (!j.configured) { roomBox.innerHTML = sysRow() + '<div class="ie-roomnote">Home Assistant is not configured on the Conductor.<br>Set <b>HA_URL</b> + <b>HA_TOKEN</b> (see <b>HA-SETUP.md</b>), map your TV entities in <b>profiles.json → settings.ha.tvs</b>, then restart the Conductor.</div>'; return; }
      if (!j.ok) { roomBox.innerHTML = sysRow() + '<div class="ie-roomnote">Home Assistant error: ' + (j.error || 'unknown') + '</div>'; return; }
      var html = sysRow() + '<div class="ie-rsec" style="margin-top:14px"><span class="t">All TVs</span>'
        + '<button class="ie-rb" data-haall="on">⏻ Wake all</button>'
        + '<button class="ie-rb" data-haall="off">▣ Art / sleep all</button></div>'
        + '<div class="ie-rtvs">';
      FRAME_IDS.forEach(function (fid) {
        var ent = (j.tvs || {})[fid]; var st = ent ? (j.states || {})[ent] : null;
        html += '<div class="ie-rtv' + (st && st.state === 'on' ? ' on' : '') + '"><div class="rh"><b>' + fid + '</b><span class="rs">' + (ent ? (st ? st.state : 'unknown') : 'not mapped') + '</span></div>';
        if (ent) {
          html += '<div class="rr">'
            + '<button class="ie-rb" title="On" data-hatv="' + ent + '" data-haact="on">⏻</button>'
            + '<button class="ie-rb" title="Art / sleep" data-hatv="' + ent + '" data-haact="off">▣</button>'
            + '<button class="ie-rb" title="Volume down" data-hatv="' + ent + '" data-haact="voldn">−</button>'
            + '<button class="ie-rb" title="Volume up" data-hatv="' + ent + '" data-haact="volup">+</button>'
            + '<button class="ie-rb" title="Mute" data-hatv="' + ent + '" data-haact="mute">🔇</button>'
            + '<button class="ie-rb" title="Reload this frame page" data-hareload="' + fid + '">↻</button></div>';
          if (st && st.source_list && st.source_list.length) {
            html += '<select class="ie-rsel" data-hasrc="' + ent + '"><option value="">input…</option>'
              + st.source_list.map(function (s) { return '<option' + (st.source === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>';
          }
        }
        html += '</div>';
      });
      html += '</div>';
      html += '<div class="ie-rsec" style="margin-top:16px"><span class="t">Dining lights</span>'
        + '<button class="ie-rb" data-halight="on">On</button><button class="ie-rb" data-halight="off">Off</button></div>';
      (j.lights || []).forEach(function (ent) {
        var st = (j.states || {})[ent] || {};
        html += '<div class="ie-rlight"><span>' + (st.name || ent) + '</span><span class="rs">' + (st.state || '—') + '</span>'
          + '<input type="range" min="1" max="100" value="' + Math.round((st.brightness || 0) / 2.55) + '" data-habri="' + ent + '"></div>';
      });
      if (j.scenes && j.scenes.length) {
        html += '<div class="ie-zt" style="margin-top:12px">Light scenes (applied automatically when a game launches)</div><div class="ie-rscenes">'
          + j.scenes.map(function (s) { return '<button class="ie-rb" data-hascene="' + s + '">' + s + '</button>'; }).join('') + '</div>';
      }
      roomBox.innerHTML = html;
    }
    if (roomBox) {
      roomBox.addEventListener('click', function (e) {
        var el;
        if ((el = e.target.closest('[data-hareload]'))) {
          var fr = el.dataset.hareload;
          fetch('api/reload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frame: fr }) })
            .then(function (r) { return r.json(); })
            .then(function (j2) { toast(j2.ok ? ('↻ Reload sent to ' + fr + ' — ' + j2.clients + ' client(s) connected') : 'Reload failed'); })
            .catch(function () { toast('Conductor unreachable'); });
          return;
        }
        if ((el = e.target.closest('[data-harestart]'))) {
          if (!global.confirm('Restart the Conductor? Frames reconnect automatically in ~10-30 s.')) return;
          fetch('api/restart', { method: 'POST' })
            .then(function () { toast('⟳ Conductor restarting — back shortly'); setTimeout(loadRoom, 12000); })
            .catch(function () { toast('Conductor unreachable'); });
          return;
        }
        if ((el = e.target.closest('[data-haall]'))) { var ids = Object.keys(roomCfg.tvs || {}).map(function (k) { return roomCfg.tvs[k]; }).filter(Boolean); if (ids.length) haSvc('media_player', el.dataset.haall === 'on' ? 'turn_on' : 'turn_off', { entity_id: ids }); else toast('No TVs mapped yet'); return; }
        if ((el = e.target.closest('[data-hatv]'))) {
          var ent = el.dataset.hatv, a = el.dataset.haact;
          if (a === 'on') haSvc('media_player', 'turn_on', { entity_id: ent });
          else if (a === 'off') haSvc('media_player', 'turn_off', { entity_id: ent });
          else if (a === 'volup') haSvc('media_player', 'volume_up', { entity_id: ent });
          else if (a === 'voldn') haSvc('media_player', 'volume_down', { entity_id: ent });
          else if (a === 'mute') haSvc('media_player', 'volume_mute', { entity_id: ent, is_volume_muted: true });
          return;
        }
        if ((el = e.target.closest('[data-halight]'))) { haSvc('light', el.dataset.halight === 'on' ? 'turn_on' : 'turn_off', { entity_id: roomCfg.lights }); return; }
        if ((el = e.target.closest('[data-hascene]'))) {
          var sc = el.dataset.hascene;
          fetch('api/ha/lightscene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene: sc }) })
            .then(function (r) { return r.json(); })
            .then(function (jj) { toast(jj.ok ? 'Lights: ' + sc : 'HA: ' + (jj.error || 'failed')); setTimeout(loadRoom, 800); })
            .catch(function () { toast('Conductor unreachable'); });
          return;
        }
      });
      roomBox.addEventListener('change', function (e) {
        if (e.target.dataset.hasrc && e.target.value) haSvc('media_player', 'select_source', { entity_id: e.target.dataset.hasrc, source: e.target.value });
        else if (e.target.dataset.habri) haSvc('light', 'turn_on', { entity_id: e.target.dataset.habri, brightness_pct: +e.target.value });
      });
      var roomTab = container.querySelector('.ie-tab[data-tab="room"]');
      if (roomTab) roomTab.addEventListener('click', loadRoom);
      setInterval(function () { var pane = q('[data-pane="room"]'); if (pane && pane.classList.contains('active')) loadRoom(); }, 8000);
      loadRoom();
    }

    /* ---- VU meters ---- */
    function animate() {
      var masterOn = !state.mutes.master, masterV = state.channels.master / 100;
      CHANNELS.forEach(function (c) {
        var vu = container.querySelector('.ie-ch[data-ch="' + c.id + '"] .ie-vu i'); if (!vu) return;
        var base = state.channels[c.id] / 100;
        if (c.master) base = masterV * (state.live ? 1 : 0.05);
        else base = base * (masterOn ? masterV : 0) * (state.live ? 1 : 0);
        if (state.mutes[c.id]) base = 0;
        var h = base <= 0 ? 0 : Math.max(4, base * 100 * (0.55 + Math.random() * 0.5));
        vu.style.height = Math.min(100, h) + '%';
      });
      requestAnimationFrame(animate);
    }
    animate();
    render();

    return {
      getState: function () { return state; },
      setState: function (s) { state = s; setFaders(); buildWallGrid(); render(); }
    };
  }

  /* -------------------- EXPORT -------------------- */
  global.IE = {
    FRAME_IDS: FRAME_IDS, LAYOUT: LAYOUT, setLayout: setLayout,   /* v0.78 */
    wallKeyOf: wallKeyOf, wallFramesOf: wallFramesOf, slotOf: slotOf, wallSizeOf: wallSizeOf,
    FRAMEKINDS: FRAMEKINDS, GAMES: GAMES, GAME_ORDER: GAME_ORDER,
    MODES: MODES, MODE_ORDER: MODE_ORDER, LIGHT_SCENES: LIGHT_SCENES, ZONES: ZONES, CHANNELS: CHANNELS,
    defaultState: defaultState, renderFrame: renderFrame, buildControlDeck: buildControlDeck,
    createBus: createBus, toast: toast, ensureStyles: ensureStyles, frameIndex: frameIndex,
    VIZ_PALETTES: VIZ_PALETTES, palStops: palStops, palAt: palAt, palCss: palCss
  };
})(window);
