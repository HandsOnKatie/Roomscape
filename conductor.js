#!/usr/bin/env node
/* ===================================================================
   The Immersion Engine — Conductor backend  v4.24 (community scaffold v0.10)
   Zero-dependency Node server (built-in http + crypto only).
   - serves the web app + the "Images & Videos" media folder
   - scans the media folder and assigns REAL images to each frame per mode
   - authoritative room STATE + WebSocket sync to every frame
   - REST API (HA NFC tap) + optional MQTT bridge
   Full version history lives in CHANGELOG.md.
   Run:   node conductor.js
   Env:   PORT, APP_DIR, MEDIA_DIR, MQTT_URL, MQTT_PREFIX, STATE_FILE, PROFILES_FILE,
          HA_URL (e.g. http://homeassistant.local:8123), HA_TOKEN (long-lived access token),
          MA_URL (Music Assistant server), MA_TOKEN (MA long-lived token)
   =================================================================== */
'use strict';
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');

const PORT = parseInt(process.env.PORT || '8090', 10);
const APP_DIR = process.env.APP_DIR || __dirname;
/* v3.62: conductor-lib location — dev runs conductor.js in place on the share
   (lib sits beside it); the container copies conductor.js to /app and reaches
   the lib on the share via APP_DIR (/app/web). */
const LIB_DIR = fs.existsSync(path.join(__dirname, 'conductor-lib'))
  ? path.join(__dirname, 'conductor-lib')
  : path.join(process.env.APP_DIR || path.join(__dirname, 'web'), 'conductor-lib');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(APP_DIR, 'Images & Videos');
const OVERLAY_DIR = process.env.OVERLAY_DIR || path.join(APP_DIR, 'overlays');
const BACKUP_DIR = path.join(APP_DIR, '_backups');
const THUMB_DIR = path.join(APP_DIR, '.thumbs');
let thumbLib = null, thumbKind = 'none';                    // optional: npm i sharp  (or jimp)
try { thumbLib = require('sharp'); thumbKind = 'sharp'; } catch (e) {}
if (!thumbLib) { try { thumbLib = require('jimp'); thumbKind = 'jimp'; } catch (e) {} }
const PHOTOS_DIR = process.env.PHOTOS_DIR || path.join(APP_DIR, 'Photos');   // v1.1: photo-frame folders live here
const STATE_FILE = process.env.STATE_FILE || path.join(APP_DIR, 'state.json');
const PROFILES_FILE = process.env.PROFILES_FILE || path.join(APP_DIR, 'profiles.json');
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const ARRIVAL_MS = 1600;
const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;                 // still-image scenes
const VID_RE = /\.(mp4|webm|m4v|mov)$/i;                   // video scenes
const MEDIA_RE = /\.(png|jpe?g|webp|gif|mp4|webm|m4v|mov)$/i;
const OVL_RE = /\.(png|svg|webp)$/i;                       // overlay art (transparent-centre)

/* RS-CONFIG v1: optional config.json — layout + install config split out of profiles.json.
   Absent file = legacy behaviour, zero change. Secrets NEVER live here (env only). */
var CONFIG = {};
try { CONFIG = JSON.parse(fs.readFileSync(process.env.CONFIG_FILE || path.join(APP_DIR, 'config.json'), 'utf8')); console.log('[config] config.json loaded'); } catch (e) { CONFIG = {}; }
var AT_REST = CONFIG.atRestMode || 'dining';

/* v2.62: single source of truth for the wall shape — 6 portrait frames, two walls.
   GET /api/layout serves this; internal frame-id lists reference it. The 6-slot
   array semantics of state.frames/frameImages/etc. are unchanged (index order
   matches LAYOUT.frames).
   RS-CONFIG v1: config.json's layout.walls (non-empty object) overrides the built-in
   shape — frames = concatenation of the wall arrays in key order. */
const LAYOUT = (function () {
  var L = { frames: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'], walls: { L: ['L1', 'L2', 'L3'], R: ['R1', 'R2', 'R3'] } };
  if (CONFIG.layout && CONFIG.layout.walls && typeof CONFIG.layout.walls === 'object' &&
      !Array.isArray(CONFIG.layout.walls) && Object.keys(CONFIG.layout.walls).length) {
    L.walls = CONFIG.layout.walls;
    L.frames = [];
    Object.keys(L.walls).forEach(function (k) {
      (Array.isArray(L.walls[k]) ? L.walls[k] : []).forEach(function (f) { L.frames.push(f); });
    });
  }
  L.roles = (CONFIG.layout && CONFIG.layout.roles) || null;
  L.orientation = (CONFIG.layout && CONFIG.layout.orientation) || 'portrait';
  return L;
})();

const DEFAULT_PROFILES = {
  dining:   { name:'At rest', accent:'#c9a35e', light:'gallery',  ambience:'Quiet room',        music:'—',                  kidSafe:true,  scene:'atrest_default',            frames:['pano','pano','pano','pano','pano','pano'], matte:{ on:true, color:'#f2eee4', width:7, texture:'paper' } }
};
const DEFAULT_TAGMAP = {};   // e.g. { '04:AB:CD': 'mymode' }
const DEFAULT_SETTINGS = {
  chroma: { on: true, tol: 60, color: '#00ff00', despill: true },
  /* Home Assistant room mapping — fill tvs with your HA media_player entity ids
     (Settings → Devices & services → Entities in HA). Editable in profiles.json. */
  ha: {
    tvs: { L1: '', L2: '', L3: '', R1: '', R2: '', R3: '' },
    lights: [],
    /* v2.47 lighting ZONES — independently controllable per mode (profile.lightZones).
       Fill each zone with your HA light entity ids, e.g. main: ['light.living_room']. */
    lightZones: { main: [], accent: [] },
    lightScenes: {                                   // light.turn_on payloads per engine light scene
      candle:   { brightness_pct: 18, color_temp_kelvin: 2000, transition: 2 },   // v2.47: pairs with effect:'candle'
      gallery:  { brightness_pct: 45, color_temp_kelvin: 2500, transition: 2 },
      daylight: { brightness_pct: 90, color_temp_kelvin: 4500, transition: 2 },
      dawn:     { brightness_pct: 50, rgb_color: [255,190,130], transition: 2 },
      carriage: { brightness_pct: 35, color_temp_kelvin: 2200, transition: 2 },
      forest:   { brightness_pct: 35, rgb_color: [120,180,90], transition: 2 },
      tavern:   { brightness_pct: 40, color_temp_kelvin: 2000, transition: 2 },
      dungeon:  { brightness_pct: 12, rgb_color: [255,120,40], transition: 3 },
      moonlight:{ brightness_pct: 15, rgb_color: [90,120,200], transition: 3 },
      gaslight: { brightness_pct: 25, rgb_color: [255,170,70], transition: 2 },
      clinical: { brightness_pct: 70, color_temp_kelvin: 5500, transition: 1 },
      storm:    { brightness_pct: 20, rgb_color: [130,120,220], transition: 2 },
      victory:  { brightness_pct: 85, rgb_color: [255,215,120], transition: 1 }
    }
  },
  /* v0.9 art-mode decor (Samsung Frame-style). Per-profile overrides: profile.matte /
     profile.overlayShadow / profile.artTone. settings.matte = global default matte (null = off).
     artTones are keyed by light scene — applied when the profile has no artTone of its own. */
  matte: null,
  overlayShadow: { on: true, blur: 16, opacity: 0.45, dx: 0, dy: 8 },
  artTones: {
    gallery: { brightness: 0.84, contrast: 0.96, saturate: 0.88 }   // dining at rest = paper-like print
  },
  /* v2.0 automations (AUTOMATIONS-DESIGN.md) */
  social: null,                                             // null = built-in DEFAULT_SOCIAL set
  prompter: { decks: [] },                                  // cue-card decks (plus auto-discovered decks/*.txt)
  rhythms: { on: false, months: {}, days: [], hours: [] },  // months {"1":"modeId"...}; days [{when:'12-25',mode,name}]; hours [{days:'sat,sun',from:'07:00',to:'10:30',mode,name}]
  weather: { on: false, entity: 'weather.home', sunEntity: 'sun.sun', pollMinutes: 10, sunTone: true, map: null },
  /* v2.3 Music Assistant — url of the MA server (addon default = HA host :8095),
     player = the MA player_id the dining room plays through. Set in Play → ♪ Music. */
  music: { url: (process.env.MA_URL || ''), player: '', token: (process.env.MA_TOKEN || '') },   // token = MA long-lived token (server 2.5+ requires auth)
  /* v2.62 autopilot v2 — weekly schedule + sunset shift (see V2.62 block at the bottom) */
  schedule: [],                                             // [{ days:[0-6 Sun-Sat], time:'HH:MM', mode:'<profileId>', name? }]
  sunShift: { on: false, offsetMin: 0 },                    // at (sunset+offsetMin) warm the room; needs HA (sun.sun)
  /* v3.72 timer engine v2 — named timer presets (see RS-TIMER block at the bottom) */
  timerPresets: []                                          // [{ id, name, mode:'<profileId>'|null, cfg:{type,durationMs,style,color,label,triggers?,bg?,chain?,chess?} }]
};
let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

/* RS-REDACT v1: settings copies served over HTTP must never carry the Music
   Assistant token (secret lives in env / on-disk store only). Every GET that
   serializes a settings object routes through here. */
function redactSettings(s){ try{ var c = JSON.parse(JSON.stringify(s||{})); if (c.music) { delete c.music.token; } return c; }catch(e){ return {}; } }

/* ==================== v2.2 PHASES & MOMENTS ====================
   profile.phases = [{ id, name, icon, patch }] — patch is a deep override applied on
   top of the base profile while that phase is active (room stays in the same game).
   Arrays in a patch may be sparse index-objects ({ "2": "dragon_lair" }).
   profile.moments = [{ id, label, icon, sfx, event, lights }] — extra Social-row
   buttons offered in Play while this mode is live. */
let activePhaseId = null;
function mergePatch(base, patch) {
  if (patch == null) return base;
  if (Array.isArray(base) && patch && typeof patch === 'object' && !Array.isArray(patch)) {
    const out = base.slice();
    Object.keys(patch).forEach((k) => { const i = +k; if (!isNaN(i)) out[i] = patch[k]; });
    return out;
  }
  if (Array.isArray(patch)) return patch.slice();
  if (base && typeof base === 'object' && typeof patch === 'object') {
    const out = Object.assign({}, base);
    Object.keys(patch).forEach((k) => {
      out[k] = (patch[k] && typeof patch[k] === 'object' && base[k] && typeof base[k] === 'object')
        ? mergePatch(base[k], patch[k]) : patch[k];
    });
    return out;
  }
  return patch;
}
function effProfile(id) {
  const p = profiles[id];
  if (!p || id !== state.game || !activePhaseId || !Array.isArray(p.phases)) return p;
  const ph = p.phases.find((x) => x && x.id === activePhaseId);
  return (ph && ph.patch) ? mergePatch(p, ph.patch) : p;
}
function phaseListFor(id) {
  const p = profiles[id];
  if (!p || !Array.isArray(p.phases) || !p.phases.length) return null;
  return p.phases.filter(Boolean).map((ph) => ({ id: ph.id, name: ph.name || ph.id, icon: ph.icon || '' }));
}

/* ---- transition/effects defaults (client fx.js consumes state.fx) ---- */
const GLOBAL_FX = { style:'blurfade', durationMs:1100, easing:'cubic-bezier(.4,0,.2,1)', stagger:120, ambient:'kenburns', event:null, sfx:null };
const PROFILE_FX = {
  dining:  { style:'crossfade', durationMs:1600, ambient:'kenburns' }
};
const PHASE_FX = {
  arrival: { event:'ignite',  sfx:'riser' },
  victory: { style:'dipwhite', event:'bloom', sfx:'chime' },
  defeat:  { style:'dipblack', event:'drain', sfx:'toll' },
  boss:    { event:'shake',   sfx:'boom' }
};

function defaultState() {
  return { game:'dining', mode:'dining', phase:'dining', brightness:45, warmth:30, light:'gallery',
    zones:{ Main:true,'Cove wash':false,'Frame halos':false,'Under-table':false,Candles:false,Sconces:false },
    channels:{ music:0, amb:0, sfx:40, narr:0, master:70 }, mutes:{ music:false, amb:false, sfx:false, narr:false, master:false },
    frames:['pano','pano','pano','pano','pano','pano'], frameImages:[null,null,null,null,null,null], overlayImages:[null,null,null,null,null,null], chroma:null, fx:null, kid:false, night:false, live:false, rev:0 };
}

// v2.51: never wholesale-replace authoritative state with a client payload.
// A stale tab / legacy page / hand-crafted POST pushing an old-schema state used
// to become `state` verbatim — the next applyProfile() then threw on missing
// zones/channels, and server-owned keys (rooms/timer/scores) were silently
// stripped. Merge defensively instead.
function acceptState(incoming) {
  const base = defaultState();
  const prev = state || base;
  const next = Object.assign({}, base, incoming);
  ['zones', 'channels', 'mutes'].forEach((k) => { if (!next[k] || typeof next[k] !== 'object') next[k] = prev[k] || base[k]; });
  ['frames', 'frameImages', 'overlayImages'].forEach((k) => { if (!Array.isArray(next[k])) next[k] = prev[k] || base[k]; });
  ['rooms', 'timer', 'scores'].forEach((k) => { if (incoming[k] === undefined && prev[k] !== undefined) next[k] = prev[k]; });
  return next;
}

function readJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }
function backupFile(file) { try { if (!fs.existsSync(file)) return; fs.mkdirSync(BACKUP_DIR, { recursive: true }); const ts = new Date().toISOString().replace(/[:.]/g, '-'); fs.copyFileSync(file, path.join(BACKUP_DIR, path.basename(file) + '.' + ts + '.bak')); } catch (e) {} }

let profiles = Object.assign({}, DEFAULT_PROFILES), tagmap = Object.assign({}, DEFAULT_TAGMAP);
(function loadProfiles() {
  const d = readJSON(PROFILES_FILE);
  if (d && d.profiles) {                                 // deep-merge per profile so built-in defaults (scene, transition) survive omissions
    Object.keys(d.profiles).forEach(function (k) { profiles[k] = Object.assign({}, DEFAULT_PROFILES[k] || {}, d.profiles[k]); });
    tagmap = Object.assign({}, DEFAULT_TAGMAP, d.tagmap || {});
    if (d.settings) settings = Object.assign({}, DEFAULT_SETTINGS, d.settings);
  } else { try { fs.writeFileSync(PROFILES_FILE, JSON.stringify({ profiles, tagmap }, null, 2)); } catch (e) {} }
  /* RS-CONFIG v1: config.json overrides sit on top of profiles.json's settings.
     Re-applied here on every load of the profiles store. */
  if (CONFIG.ha)    settings.ha    = Object.assign({}, settings.ha, CONFIG.ha);
  if (CONFIG.rooms) settings.rooms = CONFIG.rooms;
  if (CONFIG.edges) settings.edges = CONFIG.edges;
})();

/* -------------------- MEDIA library (scenes = images + videos; overlays) -------------------- */
let landIndex = {};                                   // sceneKey -> [filenames]  (images AND videos)
let overlayList = [];                                 // overlay filenames
function keyOf(name) {
  let n = name.replace(MEDIA_RE, '').replace(/\.[^.]+$/, '');
  /* rs-ungroup v1: no variant-suffix grouping - every file is its own scene */
  return n;
}
function scanMedia() {   // v1.5: includes one level of subfolders (e.g. "Images & Videos/video/")
  landIndex = {}; let n = 0;
  function add(rel) { const k = keyOf(path.basename(rel)); (landIndex[k] = landIndex[k] || []).push(rel); n++; }
  let ents = [];
  try { ents = fs.readdirSync(MEDIA_DIR, { withFileTypes: true }); } catch (e) { console.log('[media] folder not found:', MEDIA_DIR); return; }
  for (const en of ents) {
    if (en.isFile() && MEDIA_RE.test(en.name)) add(en.name);
    else if (en.isDirectory() && en.name.charAt(0) !== '.') {
      try { fs.readdirSync(path.join(MEDIA_DIR, en.name)).filter((f) => MEDIA_RE.test(f)).forEach((f) => add(en.name + '/' + f)); } catch (e) {}
    }
  }
  console.log('[media] indexed ' + n + ' scene-files across ' + Object.keys(landIndex).length + ' scenes');
  try { manifestDirty(); } catch (e) {}   // v2.52: rescan invalidates the manifest cache
}
/* v3.62: mediaSafe moved to conductor-lib/media.js (imported below) */
function scanOverlays() {
  overlayList = [];
  try { fs.mkdirSync(OVERLAY_DIR, { recursive: true }); } catch (e) {}
  try { overlayList = fs.readdirSync(OVERLAY_DIR).filter(function (f) { return OVL_RE.test(f); }).sort(); } catch (e) {}
  try {
    var rm = path.join(OVERLAY_DIR, 'README.txt');
    if (!fs.existsSync(rm)) fs.writeFileSync(rm, 'Drop transparent-centre overlay art here (PNG with alpha, or SVG).\nEach file becomes an overlay you can pick per frame in the editor (localhost:8090/editor.html).\nPortrait aspect (e.g. 1080x1920) matches the Frame TVs. The transparent area shows the scene beneath;\nthe opaque parts (a porthole ring, window mullions, an arch, a mat) sit on top.\nAfter adding files, click Rescan in the editor (or POST /api/rescan).');
  } catch (e) {}
  console.log('[overlays] ' + overlayList.length + ' overlays in ' + OVERLAY_DIR);
  try { manifestDirty(); } catch (e) {}   // v2.52: rescan invalidates the manifest cache
}
function sceneFiles(sceneKey) {
  if (!sceneKey) return null;
  let list = landIndex[sceneKey];
  if (!list || !list.length) { const k = Object.keys(landIndex).find(k => k.indexOf(sceneKey) >= 0 || sceneKey.indexOf(k) >= 0); list = k ? landIndex[k] : null; }
  return (list && list.length) ? list : null;
}
function pickScene(sceneKey) {
  const list = sceneFiles(sceneKey); if (!list) return null;
  return '/media/' + encodeURIComponent(list[Math.floor(Math.random() * list.length)]);
}
function resolveFrameImages(s) {                      // rs-playlists v3 — explicit per-frame playlists (WYSIWYG)
  // A frame with a playlist shows EXACTLY its items: one item (or Static) ->
  // always that file; several -> steps In order / Shuffle every intervalS.
  // Frames without a playlist keep the original shared-side scene pick.
  const prof = effProfile(s.game) || {};
  const frames = s.frames || [], fScenes = prof.frameScenes || [];
  // v2.62: profile-carried playlists (profile.framePlaylists — the draft model) outrank
  // the legacy playlists.json store; modes without them keep the stored config as-is.
  const _ppc = (typeof __rsProfilePlaylistCfg === 'function') ? __rsProfilePlaylistCfg(prof) : null;
  const PC = _ppc || ((typeof __rsPlaylistCfg === 'function') ? __rsPlaylistCfg(s.game) : { frames: [] });
  function pcfg(i) { var c = (PC.frames && PC.frames[i]) || null; return (c && c.items && c.items.length) ? c : null; }
  var parts = frames.map(function (_, i) {
    var c = pcfg(i); if (!c) return 'x';
    if (!c.intervalS) return 'p' + (c.pinIdx || 0) + ':' + c.items.length;
    return (c.order === 'shuffle' ? 's' : 'q') + (Math.floor(Date.now() / (Math.max(5, c.intervalS) * 1000)) % 100000) + ':' + c.items.length;
  });
  const sig = s.game + '|' + (activePhaseId || '') + '|' + frames.join(',') + '|' + (prof.scene || '') + '|' + fScenes.join(',') + '|' + parts.join(',');
  if (s._imgSig === sig && s.frameImages) return;
  const cache = {};
  s.frameImages = frames.map(function (kind, i) {
    if (kind !== 'pano' && kind !== 'portrait') return null;
    var c = pcfg(i);
    if (c) {
      var n = c.items.length, ix = 0;
      if (!c.intervalS) ix = Math.min(n - 1, Math.max(0, Math.floor(c.pinIdx || 0)));
      else {
        var b = Math.floor(Date.now() / (Math.max(5, c.intervalS) * 1000));
        if (c.order === 'shuffle' && n > 1) {
          var ord = __rsShuffleOrder(n, s.game + '|' + i + '|' + Math.floor(b / n));
          ix = ord[((b % n) + n) % n];
        } else ix = ((b % n) + n) % n;
      }
      var rel = c.items[ix];
      if (rel) return '/media/' + encodeURIComponent(rel);
    }
    const key = fScenes[i] || prof.scene;
    const ck = (i < 3 ? 'L|' : 'R|') + key;              // original behaviour
    if (!(ck in cache)) cache[ck] = pickScene(key);
    return cache[ck];
  });
  s._imgSig = sig;
}
function resolveOverlays(s) {
  const prof = effProfile(s.game) || {}, ov = prof.overlays || [];
  s.overlayImages = (s.frames || []).map(function (kind, i) { return ov[i] ? '/overlays/' + encodeURIComponent(ov[i]) : null; });
  /* v1.91 overlay fit — per-frame: stretch (default) | cover | contain | width | height */
  const ofit = prof.ovlFit || [];
  s.overlayFits = (s.frames || []).map(function (kind, i) { return ofit[i] || 'stretch'; });
  /* v3.93 scene fit — how a WHOLE-image scene fills its frame (fx.js v1.18 renders; spanned panoramas ignore it) */
  const sfit = prof.scnFit || [];
  s.sceneFits = (s.frames || []).map(function (kind, i) { return sfit[i] || 'cover'; });
  /* v0.9 art-mode decor — server-owned, resolved per game/light (fx.js renders) */
  s.matte = (prof.matte !== undefined ? prof.matte : settings.matte) || null;
  s.ovlShadow = prof.overlayShadow || settings.overlayShadow || null;
  s.artTone = prof.artTone || (settings.artTones || {})[s.light] || null;
  /* v1.1 photo frames — frames with kind 'photos' read this config */
  s.photos = prof.photos || null;   // { dir, order:'random'|'seq', intervalS, layout:'auto'|'single'|'stack'|'collage' }
  /* v2.32 music content types — per-frame 🎶 visualiser & ♪ playlist configs.
     Each carries an optional background (a media scene key) which we resolve to a
     stable /media URL here so the Frame TVs (fx.js) don't have to. */
  function resolveBg(bg) {
    if (!bg || !bg.key) return null;
    try { var list = sceneFiles(bg.key); if (list && list.length) return { url: '/media/' + encodeURIComponent(list[0]), video: !!bg.video, dim: (bg.dim != null ? bg.dim : 0.35) }; } catch (e) {}
    return null;
  }
  const _fviz = prof.frameViz || [];
  s.frameViz = (s.frames || []).map(function (kind, i) {
    if (kind !== 'viz') return null;
    var c = _fviz[i] || {}; return { style: c.style || 'cathedral', ori: c.ori || 'portrait', color: c.color || 'auto', sens: (c.sens != null ? c.sens : 1), nowPlaying: c.nowPlaying !== false, shuffleMin: c.shuffleMin || 5, bg: resolveBg(c.bg) };
  });
  const _fpl = prof.framePlaylist || [];
  s.framePlaylist = (s.frames || []).map(function (kind, i) {
    if (kind !== 'playlist') return null;
    var c = _fpl[i] || {}; return { display: c.display || 'nowplaying', ori: c.ori || 'portrait', color: c.color || 'auto', sens: (c.sens != null ? c.sens : 1), bg: resolveBg(c.bg) };
  });
  /* v1.63 captions — scene caption text on frames is opt-in per profile (default off) */
  s.captions = prof.captions === true;
  /* v1.6 effect layer — looping VFX videos (rain/fog/snow) composited over the scene */
  const ef = prof.effects || [];
  s.effectImages = (s.frames || []).map(function (kind, i) { return ef[i] ? '/media/' + ef[i].split('/').map(encodeURIComponent).join('/') : null; });
  /* v1.7 reveal — a still that plays a paired video on trigger, then crossfades back.
     profile.reveal = { videos:[6 filenames], trigger:'manual'|'random', everyS, jitter, fadeS } */
  const rv = prof.reveal || null;
  if (rv && Array.isArray(rv.videos)) {
    s.reveal = {
      videos: (s.frames || []).map(function (kind, i) {
        var v = rv.videos[i];
        return v ? '/media/' + v.split('/').map(encodeURIComponent).join('/') : null;
      }),
      trigger: (rv.trigger === 'random' ? 'random' : 'manual'),
      everyS: Math.max(15, +rv.everyS || 180),
      jitter: (rv.jitter != null ? +rv.jitter : 0.5),
      fadeS: (rv.fadeS != null ? +rv.fadeS : 0.6)
    };
  } else {
    s.reveal = null;
  }
  /* v2.0 weather fills EMPTY effect slots on weather-enabled modes (hand-picked effects always win) */
  if ((settings.weather || {}).on && weather.effect && (prof.weatherFx === true || (prof.weatherFx !== false && s.game === 'dining'))) {
    const wp = '/media/' + weather.effect.split('/').map(encodeURIComponent).join('/');
    s.effectImages = s.effectImages.map(function (e, i) { return e || ((s.frames[i] === 'pano' || s.frames[i] === 'portrait') ? wp : null); });
  }
  /* v2.0 sun tone nudge (daylight sync) */
  if ((settings.weather || {}).on && (settings.weather || {}).sunTone && s.artTone && weather.sunFactor !== 1)
    s.artTone = Object.assign({}, s.artTone, { brightness: +((s.artTone.brightness != null ? s.artTone.brightness : 1) * weather.sunFactor).toFixed(3) });
  /* v2.0 cue cards ride the state (server-owned — survives app WS pushes) */
  s.prompter = promptState || null;
  /* v2.2 phases — server-owned rail for the Play bar */
  s.phases = phaseListFor(s.game);
  s.phaseId = activePhaseId;
  s.musicHold = musicHold;   // v2.3: MA music is overriding the room's own sounds
  // v2.44: the now-playing toast is per-mode (Behaviour → "Show now-playing track"),
  // DEFAULT OFF so it doesn't pop up on ambient/game modes; opt in per mode (e.g. Party).
  var _npOn = !!((effProfile(s.game) || {}).nowPlaying);
  s.musicNow = (musicHold && _npOn) ? musicNow : null;   // v2.31 toast, v2.44 gated by profile.nowPlaying
}

/* v3.62: THUMBNAILS pipeline (thumbOut/genThumb/warmThumbs + queue) moved to
   conductor-lib/media.js (imported below; sharp/jimp injected via ctx). */
function resolveFx(s) {                                 // merge global -> per-game -> user profile.transition -> per-phase
  const pf = effProfile(s.game) || {};
  let fx = Object.assign({}, GLOBAL_FX, PROFILE_FX[s.game] || {}, pf.transition || {});
  const ph = PHASE_FX[s.mode]; if (ph) fx = Object.assign({}, fx, ph);
  const pph = (pf.phases || {})[s.mode]; if (pph) fx = Object.assign({}, fx, pph);
  s.fx = fx;
}

let state = readJSON(STATE_FILE) || defaultState();
let saveTimer = null, lastFxSig = null;
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }, 400); }

/* -------------------- state transitions -------------------- */
let arrivalTimer = null;
function applyProfile(id) {
  const p = profiles[id] || profiles.dining; clearTimeout(arrivalTimer);
  activePhaseId = null;                                  // v2.2: a (re)launched mode starts at its base phase
  state.wallFit = p.wallFit || 'auto';   // v2.1: mode-level wall layout (auto | fill | span)
  if (id === 'dining' || !profiles[id]) {
    state.game = 'dining'; state.mode = 'dining'; state.phase = 'dining'; state.live = false;
    state.frames = profiles.dining.frames.slice(); state.light = 'gallery'; state.channels.music = 0; state.channels.amb = 0;
  } else {
    state.game = id; state.frames = p.frames.slice(); state.light = p.light;
    state.mode = 'arrival'; state.phase = 'arrival'; state.live = true;
    state.zones['Cove wash'] = true; state.zones['Frame halos'] = (p.halo !== false); state.channels.music = 55; state.channels.amb = 70;   // v2.38: halo is per-mode (Behaviour toggle)
    arrivalTimer = setTimeout(() => { if (state.game === id) { state.mode = 'immersion'; state.phase = 'immersion'; bump('settle'); } }, ARRIVAL_MS);
  }
  bump('game:' + id);
}
const MODE_ORDER = ['dining','arrival','immersion','intermission','boss','victory','defeat','cleanup'];
const SCARY = { boss: true, defeat: true };
function setMode(id) {
  if (MODE_ORDER.indexOf(id) < 0) return;
  if (id === 'dining') return applyProfile('dining');
  if (state.kid && SCARY[id]) return;
  state.mode = id; state.phase = id;
  if (id === 'victory') state.light = 'victory';
  if (id === 'boss') state.zones['Frame halos'] = !(profiles[state.game] && profiles[state.game].halo === false);   // v2.38: boss halo also respects the mode's toggle
  bump('mode:' + id);
}
/* v2.2 — switch the live mode to one of its named phases (null = back to base) */
function applyPhase(phaseId) {
  const p = profiles[state.game];
  if (phaseId && (!p || !Array.isArray(p.phases) || !p.phases.find((x) => x && x.id === phaseId))) return false;
  activePhaseId = phaseId || null;
  const ep = effProfile(state.game) || p || {};
  if (ep.frames) state.frames = ep.frames.slice();
  if (ep.light) state.light = ep.light;
  state._imgSig = null; lastFxSig = null;                // force scene + fx re-resolve for the merged profile
  bump('phase:' + (activePhaseId || 'base'));
  try { logDiary('phase', state.game + ' → ' + (activePhaseId || 'base')); } catch (e) {}
  return true;
}
function bump(reason) {
  resolveFrameImages(state); resolveOverlays(state); state.chroma = settings.chroma;
  const fsig = state.game + '|' + state.mode;
  if (fsig !== lastFxSig) { resolveFx(state); lastFxSig = fsig; }   // recompute fx defaults only on world/phase change
  if (AUTO_SWITCH) state.fx = Object.assign({}, state.fx || {}, { style: 'crossfade', durationMs: 3000, event: null, sfx: null });   // v2.0: automatic switches drift, never cut
  // v1.1: per-mode audio + master volume. volume = mode's own, else the global setting, else 70.
  var _pa = ((effProfile(state.game) || {}).audio) || {};
  var _dv = (settings.audio && settings.audio.volume != null) ? settings.audio.volume : 70;
  if (musicHold) state.audio = { volume: (_pa.volume != null ? _pa.volume : _dv) };   // v2.3: MA music playing — no mode playlist/bed
  else state.audio = Object.assign({}, _pa, { volume: (_pa.volume != null ? _pa.volume : _dv) });
  directorOnModeChange();   // v1.2: (re)start the audio director when the mode changes
  // v2.39: per-mode halo customisation — carried in state so fx.js (kiosks) can render it
  var _hp = effProfile(state.game) || {};
  state.halo = { color: _hp.haloColor || null, size: (_hp.haloSize != null ? _hp.haloSize : null), op: (_hp.haloOpacity != null ? _hp.haloOpacity : null) };
  state.rev = (state.rev || 0) + 1; persist(); broadcastState(); publishMqtt(); haApplyRoom();
}

/* -------------------- minimal WebSocket -------------------- */
const clients = new Set();
/* v3.62: wsAccept/encodeFrame/wsSend moved to conductor-lib/ws.js (imported
   below); the clients Set and broadcastState (reassigned by the reveal-reel
   patch) stay here. */
function broadcastState(except) { const msg = { ie: true, type: 'state', state: state, t: Date.now() }; for (const c of clients) if (c.sock !== except) wsSend(c.sock, msg); }

/* -------------------- audio director (v1.2) --------------------
   The Conductor runs the timed/placed audio for the active mode: fires the intro on
   entry + the outro on leaving, and schedules periodical one-shots (birds, thunder…)
   with per-effect frequency, randomness and placement. Continuous playlists play
   client-side (fx-audio.js) straight from state.audio.playlist. */
let audioTimers = [];
let lastAudioGame = null;   // v2.2: keyed game|phase
let lastAudioAudio = null;  // the audio config we started (for its outro)
const AUDIO_FRAMES = LAYOUT.frames;   // v2.62: single source of truth
function clearAudioTimers() { audioTimers.forEach((t) => clearTimeout(t)); audioTimers = []; }
function audioHits(spatial, gain) {
  const g = (gain != null ? gain : 1);
  if (spatial === 'random') { const f = AUDIO_FRAMES[Math.floor(Math.random() * AUDIO_FRAMES.length)]; return [{ f, at: 0, gain: g }]; }
  if (spatial === 'sweep') return AUDIO_FRAMES.map((f, i) => ({ f, at: i * 180, gain: g }));
  if (spatial === 'sweeprev') return AUDIO_FRAMES.slice().reverse().map((f, i) => ({ f, at: i * 180, gain: g }));
  if (AUDIO_FRAMES.indexOf(spatial) >= 0) return [{ f: spatial, at: 0, gain: g }];
  return AUDIO_FRAMES.map((f) => ({ f, at: 0, gain: g }));   // 'all' / default
}
function fireAudio(sound, spatial, gain) {
  if (!sound) return;
  const msg = { ie: true, type: 'audio', action: 'play', sound, hits: audioHits(spatial, gain), t: Date.now() };
  for (const c of clients) wsSend(c.sock, msg);
}
function startDirector() {
  clearAudioTimers();
  const a = ((effProfile(state.game) || {}).audio) || {};
  if (a.intro && a.intro.sound) audioTimers.push(setTimeout(() => fireAudio(a.intro.sound, a.intro.spatial || 'all', a.intro.gain), 500));
  (a.periodicals || []).forEach((pd) => {
    if (!pd || !pd.sound || !(pd.everyS > 0)) return;
    const sched = () => {
      const base = pd.everyS * 1000;
      const jit = Math.max(0, Math.min(1, pd.jitter || 0)) * base;
      const wait = Math.max(1000, base + (Math.random() * 2 - 1) * jit);
      audioTimers.push(setTimeout(() => { fireAudio(pd.sound, pd.spatial || 'all', pd.gain); sched(); }, wait));
    };
    sched();
  });
}
function directorOnModeChange() {
  if (musicHold) { clearAudioTimers(); lastAudioGame = null; lastAudioAudio = null; return; }   // v2.3: music override — no intros/periodicals
  const key = state.game + '|' + (activePhaseId || '');   // v2.2: phases restart the director too
  if (key === lastAudioGame) return;
  const prevA = lastAudioAudio;
  if (prevA && prevA.outro && prevA.outro.sound) fireAudio(prevA.outro.sound, prevA.outro.spatial || 'all', prevA.outro.gain);
  lastAudioGame = key;
  lastAudioAudio = ((effProfile(state.game) || {}).audio) || {};
  startDirector();
}
/* v3.62: handleUpgrade/onWsData/WS_MAX_BUF moved to conductor-lib/ws.js
   (imported below). handleClientMessage stays here (touches state/profiles;
   the module calls it through ctx at call time). */
function handleClientMessage(client, text) {
  let d; try { d = JSON.parse(text); } catch (e) { return; }
  if (!d || !d.ie) return;
  if (d.type === 'hello') { if (d.frame) client.frame = d.frame; wsSend(client.sock, { ie: true, type: 'state', state: state, t: Date.now() }); }   // v1.4: frames identify themselves
  else if (d.type === 'state' && d.state) {
    const prev = state.game + '|' + state.mode;
    state = acceptState(d.state); resolveFrameImages(state); resolveOverlays(state); state.chroma = settings.chroma;   // v2.51: defensive merge
    const now = state.game + '|' + state.mode;
    if (now !== prev) { resolveFx(state); lastFxSig = now; }   // new world/phase -> server fx defaults; else respect pushed fx (style picker)
    persist(); broadcastState(client.sock); publishMqtt(); haApplyRoom();
  }
}

/* -------------------- optional MQTT -------------------- */
let mqttClient = null; const MQTT_PREFIX = process.env.MQTT_PREFIX || 'immersion';
(function initMqtt() {
  if (!process.env.MQTT_URL) return;
  let mqtt; try { mqtt = require('mqtt'); } catch (e) { console.log('[mqtt] set MQTT_URL but "mqtt" not installed (npm i mqtt)'); return; }
  try {
    mqttClient = mqtt.connect(process.env.MQTT_URL);
    mqttClient.on('connect', () => { console.log('[mqtt] connected', process.env.MQTT_URL); mqttClient.subscribe(['game/start','game/phase','room/mode','room/panic']); publishMqtt(); });
    mqttClient.on('message', (topic, b) => { let m = {}; try { m = JSON.parse(b.toString() || '{}'); } catch (e) {}
      if (topic === 'game/start' && m.profile) applyProfile(m.profile);
      else if (topic === 'game/phase' && m.phase) setMode(m.phase);
      else if (topic === 'room/mode' && m.mode) setMode(m.mode);
      else if (topic === 'room/panic') applyProfile('dining'); });
    mqttClient.on('error', (e) => console.log('[mqtt] error', e.message));
  } catch (e) { console.log('[mqtt] failed', e.message); }
})();
function publishMqtt() { if (mqttClient && mqttClient.connected) { try { mqttClient.publish(MQTT_PREFIX + '/state', JSON.stringify(state), { retain: true }); } catch (e) {} } }

/* -------------------- optional HOME ASSISTANT bridge -------------------- */
const HA_URL = (process.env.HA_URL || '').replace(/\/+$/, '');
const HA_TOKEN = process.env.HA_TOKEN || '';
const HA_DOMAINS = { media_player: 1, light: 1, scene: 1, remote: 1, switch: 1 };  // callable via /api/ha/service
/* ==================== v3.62 CONDUCTOR-LIB WIRING ====================
   The extracted subsystems (media / ws / ha / music) are factories taking a
   ctx object — the ONLY bridge between core and lib. Config consts cross as
   plain values; shared MUTABLE bindings cross as getter functions read at
   call time (core reassigns state/settings/landIndex/overlayList); core
   callbacks (handleClientMessage) are invoked through ctx at CALL TIME so
   the appended patch blocks' reassignments of core functions still apply.
   DISCIPLINE: module factories must NOT call any ctx accessor at
   construction time — the getters close over bindings whose values are only
   guaranteed meaningful at runtime.
   The destructured names below intentionally match the original top-level
   identifiers so all core code and every appended patch block keep working
   unchanged. None of these is ever reassigned (reassigned functions were
   deliberately NOT extracted), hence const. */
const ctx = {
  // config values (stable consts)
  MEDIA_DIR, OVERLAY_DIR, PHOTOS_DIR, THUMB_DIR,
  IMG_RE, VID_RE, MEDIA_RE, OVL_RE,
  WS_GUID, HA_URL, HA_TOKEN, DEFAULT_SETTINGS,
  // stable references
  clients,                                   // the one WS client Set (harden block heartbeats the same Set)
  // shared mutable accessors — read at call time, never captured
  state: () => state,
  settings: () => settings,
  landIndex: () => landIndex,
  overlayList: () => overlayList,
  thumbLib: () => thumbLib,                  // npm sharp/jimp instance — required HERE, injected into the lib
  thumbKind: () => thumbKind,
  // core callbacks — routed through ctx at call time so later patches to core apply
  handleClientMessage: (client, text) => handleClientMessage(client, text)
};
const { MIME, serveFile, mediaSafe, photoSafe, listPhotos, buildManifest, manifestDirty, buildManifestCached, thumbOut, genThumb, warmThumbs } = require(path.join(LIB_DIR, 'media.js'))(ctx);
const { wsAccept, encodeFrame, wsSend, handleUpgrade, onWsData, WS_MAX_BUF } = require(path.join(LIB_DIR, 'ws.js'))(ctx);
const { haOn, haCfg, haFetch, haCall } = require(path.join(LIB_DIR, 'ha.js'))(ctx);
const { maCall, maItems, maImage } = require(path.join(LIB_DIR, 'music.js'))(ctx);
const LIB_MODULES = ['media', 'ws', 'ha', 'music'];
/* ==================== end conductor-lib wiring ==================== */

/* v1.93: edge media-mirror PCs — the display PCs each run deploy/edge.js and cache
   all media locally. The admin (⚙ Display PCs) polls /api/edges to show per-PC sync
   progress and /api/edges/sync to trigger a pull. Override via settings.edges. */
const EDGES_DEFAULT = [];   // e.g. [{ name: 'PC1 · Left wall (L1–L3)', url: 'http://<edge-pc-ip>:8093' }]
function edgeList() { return (Array.isArray(settings.edges) && settings.edges.length) ? settings.edges : EDGES_DEFAULT; }
function fetchJSON(url, timeoutMs, cb) {
  let done = false; const fin = (e, d) => { if (done) return; done = true; cb(e, d); };
  let u; try { u = new URL(url); } catch (e) { return fin(e); }
  const req = http.get({ host: u.hostname, port: u.port || 80, path: u.pathname + u.search, timeout: timeoutMs || 2500 }, (r) => {
    if (r.statusCode !== 200) { r.resume(); return fin(new Error('HTTP ' + r.statusCode)); }
    let s = ''; r.on('data', (c) => s += c); r.on('end', () => { try { fin(null, JSON.parse(s)); } catch (e) { fin(e); } });
  });
  req.on('timeout', () => { req.destroy(new Error('timeout')); });
  req.on('error', (e) => fin(e));
}
function postJSON(url, body, timeoutMs, cb) {
  let done = false; const fin = (e, d) => { if (done) return; done = true; cb(e, d); };
  let u; try { u = new URL(url); } catch (e) { return fin(e); }
  const data = Buffer.from(JSON.stringify(body || {}));
  const req = http.request({ host: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: 'POST', timeout: timeoutMs || 15000, headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, (r) => {
    let s = ''; r.on('data', (c) => s += c); r.on('end', () => { try { fin(null, JSON.parse(s)); } catch (e) { fin(new Error('HTTP ' + r.statusCode)); } });
  });
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.on('error', fin); req.write(data); req.end();
}
/* v3.62: haOn/haCfg/haFetch/haCall moved to conductor-lib/ha.js (imported in
   the wiring block above). haApplyRoom stays here — the rooms2.5 patch
   reassigns it. */
/* ==================== v2.3 MUSIC ASSISTANT bridge ====================
   Talks straight to the Music Assistant server's WebSocket API (default addon port
   8095, no auth on LAN) with a tiny hand-rolled masked-frame WS client — one
   connection per command, matched by message_id. Playing music sets musicHold so
   the room keeps its scenes/lights/TVs but its own playlist & periodicals go quiet. */
let musicHold = false;
let musicNow = null;                       // v2.31: current MA track {title, artist, album, img, ts}
function musicOff(reason) { if (!musicHold) return; musicHold = false; musicNow = null; bump('music:' + (reason || 'off')); logDiary('music', 'room sounds return'); }
function musicPollNow() {                  // v2.31: watch MA for track changes while music overrides the room
  const mu = settings.music || {};
  if (!musicHold || !mu.player || !mu.url) return;
  maCall('player_queues/all', {}, (e, r) => {
    if (e || !musicHold) return;
    const q = (Array.isArray(r) ? r : []).find((x) => x && x.queue_id === mu.player);
    const it = q && q.current_item, m = it && it.media_item;
    if (!m || !m.name) return;
    const artist = (m.artists || []).map((a) => a && a.name).filter(Boolean).join(', ');
    if (musicNow && musicNow.title === m.name && musicNow.artist === artist) return;
    const img = (it.image && /^https?:\/\//.test(it.image.path || '') ? it.image.path : null) || maImage(m);
    musicNow = { title: m.name, artist: artist, album: (m.album && m.album.name) || '', img: img || null, ts: Date.now() };
    bump('music:track');
    logDiary('music', '\u266a ' + (artist ? artist + ' \u2014 ' : '') + m.name);
  });
}
setInterval(musicPollNow, 5000);
/* v3.62: maCall/maItems/maImage moved to conductor-lib/music.js (imported in
   the wiring block above). musicHold/musicNow/musicOff/musicPollNow stay
   here — they reassign core state read by bump()/resolveOverlays. */

/* ==================== v2.0 AUTOMATIONS: Social DLC · Cue Cards · Rhythms · Weather ==================== */
const DECKS_DIR = path.join(APP_DIR, 'decks');
const SOUNDS_DIR = path.join(APP_DIR, 'sounds');
let AUTO_SWITCH = false;                                   // true only while a rhythm/weather switch runs bump()
const diary = [];
function logDiary(kind, text) { diary.unshift({ t: Date.now(), kind: kind, text: text }); if (diary.length > 30) diary.pop(); }

/* ---- Social DLC ---- */
const DEFAULT_SOCIAL = [
  { id: 'lightning', label: 'Lightning', icon: '⚡', sfx: 'synth:thunder', event: 'lightning', lights: { flash: 1 } },
  { id: 'laughter',  label: 'Laughter',  icon: '😂', sfx: 'sounds/laughter.mp3', event: null, lights: null },
  { id: 'rimshot',   label: 'Punchline', icon: '🥁', sfx: 'sounds/rimshot.mp3', event: 'softflash', lights: null },
  { id: 'dramatic',  label: 'Dramatic',  icon: '🎻', sfx: 'sounds/dramatic-sting.mp3', event: 'bloom', lights: { dip: 0.35, holdS: 3 } },
  { id: 'applause',  label: 'Applause',  icon: '👏', sfx: 'sounds/applause.mp3', event: 'softflash', lights: null },
  { id: 'chaos',     label: 'Chaos',     icon: '🎲', sfx: null, event: null, lights: null }
];
function socialList() {
  const base = (settings.social && settings.social.length) ? settings.social : DEFAULT_SOCIAL;
  const pm = (effProfile(state.game) || {}).moments;      // v2.2: per-mode Moment buttons while live
  return (Array.isArray(pm) && pm.length) ? base.concat(pm.filter((m) => m && m.id)) : base;
}
function fireSocial(id) {
  const list = socialList(); let btn;
  if (id === 'chaos') { const c = list.filter((b) => b.id !== 'chaos'); btn = c[Math.floor(Math.random() * c.length)]; }
  else btn = list.find((b) => b.id === id);
  if (!btn) return null;
  const msg = { ie: true, type: 'social', id: btn.id, sfx: btn.sfx || null, event: btn.event || null, kid: !!state.kid, t: Date.now() };
  for (const c of clients) wsSend(c.sock, msg);
  const L = haCfg().lights;
  if (btn.lights && haOn() && L.length) {
    if (btn.lights.flash) haCall('light', 'turn_on', { entity_id: L, flash: 'short' });
    else if (btn.lights.dip) {
      const pct = Math.round(btn.lights.dip * 100);
      haCall('light', 'turn_on', { entity_id: L, brightness_step_pct: -pct, transition: 0.4 });
      setTimeout(() => haCall('light', 'turn_on', { entity_id: L, brightness_step_pct: pct, transition: 1.5 }), (btn.lights.holdS || 3) * 1000);
    }
  }
  logDiary('social', btn.label || btn.id);
  return btn;
}

/* ---- Cue Cards ("the Wingman") ---- */
function deckItemsById(id) {
  if (!id) return [];
  if (id.indexOf('file:') === 0) { try { return fs.readFileSync(path.join(DECKS_DIR, path.basename(id.slice(5))), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean); } catch (e) { return []; } }
  const d = ((settings.prompter || {}).decks || []).find((x) => x.id === id); if (!d) return [];
  let items = (d.items || []).slice();
  if (d.file) { try { items = items.concat(fs.readFileSync(path.join(APP_DIR, d.file), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)); } catch (e) {} }
  return items;
}
function deckList() {
  const decks = ((settings.prompter || {}).decks || []).map((d) => ({ id: d.id, name: d.name, icon: d.icon || '🃏', style: d.style || 'placard', autoS: d.autoS || 0, count: deckItemsById(d.id).length }));
  try {
    fs.readdirSync(DECKS_DIR).filter((f) => /\.(txt|md)$/i.test(f)).sort().forEach((f) => {
      const id = 'file:' + f;
      if (!decks.find((x) => x.id === id)) decks.push({ id: id, name: f.replace(/\.(txt|md)$/i, ''), icon: '🃏', style: 'card', autoS: 0, count: deckItemsById(id).length });
    });
  } catch (e) {}
  return decks;
}
let promptState = null, promptTimer = null;
function setPrompter(b) {
  if (!b || b.action === 'off' || (!b.deck && !promptState)) { promptState = null; clearInterval(promptTimer); promptTimer = null; }
  else {
    const deck = b.deck || promptState.deck, items = deckItemsById(deck);
    if (!items.length) { promptState = null; clearInterval(promptTimer); promptTimer = null; }
    else {
      const meta = deckList().find((d) => d.id === deck) || {};
      const cur = (promptState && promptState.deck === deck) ? promptState.index : -1;
      let ix = b.action === 'next' ? cur + 1 : b.action === 'prev' ? cur - 1 : (b.index != null ? +b.index : Math.max(cur, 0));
      ix = ((ix % items.length) + items.length) % items.length;
      const item = items[ix], isImg = item.indexOf('img:') === 0;
      promptState = {
        deck: deck, frame: b.frame || (promptState && promptState.frame) || 'R2',
        index: ix, count: items.length, style: b.style || meta.style || 'placard',
        img: isImg ? '/decks/' + item.slice(4).split('/').map(encodeURIComponent).join('/') : null,
        text: isImg ? null : item, next: items[(ix + 1) % items.length]
      };
      clearInterval(promptTimer); promptTimer = null;
      const aS = b.autoS != null ? +b.autoS : (meta.autoS || 0);
      if (aS > 2) promptTimer = setInterval(() => setPrompter({ action: 'next' }), aS * 1000);
      logDiary('cue', meta.name + ' #' + (ix + 1) + ' → ' + promptState.frame);
    }
  }
  state.prompter = promptState;
  state.rev = (state.rev || 0) + 1; persist(); broadcastState();
}

/* ---- Room Rhythms ---- */
let holdUntil = 0;
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function isAmbient() { const pf = profiles[state.game]; return state.game === 'dining' || !!(pf && pf.ambient); }
function rhythmTarget(now) {
  const r = settings.rhythms || {}; if (!r.on) return null;
  now = now || new Date();
  const ORD = ['sun','mon','tue','wed','thu','fri','sat'];
  const dow = ORD[now.getDay()], hm = now.getHours() * 60 + now.getMinutes();
  const mmdd = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const ymd = now.getFullYear() + '-' + mmdd;
  const toMin = (s2) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s2 || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  let hit = null;
  (r.hours || []).forEach((h) => {
    const days = (h.days || '*').toLowerCase();
    const ok = days === '*' || days.split(',').some((d) => {
      d = d.trim();
      if (d.indexOf('-') > 0) { const W = ['mon','tue','wed','thu','fri','sat','sun']; const pr = d.split('-'); const ia = W.indexOf(pr[0]), ib = W.indexOf(pr[1]), ic = W.indexOf(dow); return ia >= 0 && ib >= 0 && ic >= 0 && ic >= ia && ic <= ib; }
      return d === dow;
    });
    const f = toMin(h.from), t2 = toMin(h.to);
    if (ok && f != null && t2 != null && hm >= f && hm < t2 && profiles[h.mode]) hit = { mode: h.mode, why: h.name || 'daily ritual' };
  });
  if (hit) return hit;
  const day = (r.days || []).find((d) => d.when === mmdd || d.when === ymd);
  if (day && profiles[day.mode]) return { mode: day.mode, why: day.name || 'special day', special: day.name || null };
  const m = (r.months || {})[String(now.getMonth() + 1)];
  if (m && profiles[m]) return { mode: m, why: MONTH_NAMES[now.getMonth()] + ' default' };
  return { mode: 'dining', why: 'fallback' };
}
function rhythmNextChange() {                              // next moment the target differs from now's target (36 h scan, 5-min grid)
  const t0 = rhythmTarget(); if (!t0) return null;
  const start = Date.now();
  for (let i = 1; i <= 432; i++) {
    const d = new Date(start + i * 300000);
    const t = rhythmTarget(d);
    if (t && t.mode !== t0.mode) { d.setSeconds(0, 0); return { at: d.getTime(), mode: t.mode, why: t.why }; }
  }
  return null;
}
function applyAmbient(id, why) {
  const pf = profiles[id]; if (!pf) return;
  clearTimeout(arrivalTimer);
  state.game = id; state.frames = pf.frames.slice(); state.light = pf.light || 'gallery';
  state.mode = 'immersion'; state.phase = 'immersion'; state.live = false;
  AUTO_SWITCH = true; try { bump('rhythm:' + id); } finally { AUTO_SWITCH = false; }
  logDiary('rhythm', id + (why ? ' (' + why + ')' : ''));
}
setInterval(() => {
  try {
    if (!(settings.rhythms || {}).on) return;
    if (Date.now() < holdUntil) return;
    if (!isAmbient()) return;
    if (promptState) return;                               // don't yank the wall mid-anecdote
    const t = rhythmTarget();
    if (t && t.mode !== state.game && profiles[t.mode]) applyAmbient(t.mode, t.why);
  } catch (e) {}
}, 60000);

/* ---- Weather-true windows ---- */
let weather = { cond: null, effect: null, pinnedUntil: 0, sunFactor: 1 };
function effectFiles() { try { return fs.readdirSync(path.join(MEDIA_DIR, 'effects')).filter((f) => VID_RE.test(f)); } catch (e) { return []; } }   /* v2.50: effects library moved video/effects -> effects/ (video re-org) */
function autoMapCondition(cond) {
  if (!cond) return null;
  const w = settings.weather || {};
  if (w.map) { for (const k in w.map) if (k.split('|').indexOf(cond) >= 0) return (w.map[k] && w.map[k].effect) || null; }
  const files = effectFiles();
  const pick = (re) => { const f = files.find((x) => re.test(x.toLowerCase())); return f ? 'effects/' + f : null; };
  if (/pouring/.test(cond)) return pick(/heavy|pour|storm/) || pick(/rain|drizzle/);
  if (/lightning/.test(cond)) return pick(/storm|thunder/) || pick(/heavy/) || pick(/rain/);
  if (/rain/.test(cond)) return pick(/drizzle/) || pick(/rain/);
  if (/snow/.test(cond)) return pick(/snow/);
  if (/fog|mist/.test(cond)) return pick(/fog|mist/);
  return null;
}
let stormTimer = null;
function pollWeather() {
  const w = settings.weather || {}; if (!w.on || !haOn()) return;
  haFetch('GET', '/api/states/' + (w.entity || 'weather.home'), null, (err, code, data) => {
    if (err || !data || !data.state) return;
    if (Date.now() < weather.pinnedUntil) return;          // a preview/pin outranks the sky
    const cond = data.state, eff = autoMapCondition(cond);
    const changed = cond !== weather.cond || eff !== weather.effect;
    weather.cond = cond; weather.effect = eff;
    if (/lightning/.test(cond)) { if (!stormTimer) stormTimer = setTimeout(function boom() { if (isAmbient()) fireSocial('lightning'); stormTimer = setTimeout(boom, 45000 + Math.random() * 135000); }, 20000); }
    else if (stormTimer) { clearTimeout(stormTimer); stormTimer = null; }
    if (changed) { logDiary('weather', cond + (eff ? ' → ' + eff.split('/').pop() : ' (clear)')); AUTO_SWITCH = true; try { bump('weather'); } finally { AUTO_SWITCH = false; } }
  });
  if (w.sunTone) haFetch('GET', '/api/states/' + (w.sunEntity || 'sun.sun'), null, (err, code, d) => {
    if (err || !d || !d.attributes) return;
    const el = d.attributes.elevation;
    weather.sunFactor = el == null ? 1 : el < -4 ? 0.94 : el < 10 ? 0.97 : 1;
  });
}
setInterval(pollWeather, Math.max(2, ((DEFAULT_SETTINGS.weather.pollMinutes) || 10)) * 60000);
setTimeout(pollWeather, 8000);
/* ==================== end v2.0 automations ==================== */

let lastHaSig = null;
function haApplyRoom() {                                  // mode/game changes drive the physical room
  if (!haOn()) return;
  const ha = haCfg();
  const sig = state.game + '|' + state.light + '|' + (state.live ? 1 : 0);
  if (sig === lastHaSig) return; lastHaSig = sig;
  const sc = ha.lightScenes[state.light];
  if (sc && ha.lights.length) haCall('light', 'turn_on', Object.assign({ entity_id: ha.lights }, sc), (e) => { if (e) console.log('[ha] lights:', e.message); });
  const tvIds = Object.values(ha.tvs).filter(Boolean);
  if (tvIds.length) haCall('media_player', state.live ? 'turn_on' : 'turn_off', { entity_id: tvIds }, (e) => { if (e) console.log('[ha] tvs:', e.message); });
  console.log('[ha] room -> light:' + state.light + ' tvs:' + (state.live ? 'on' : 'art/off'));
}

/* -------------------- HTTP (media + static + REST) -------------------- */
/* v3.62: MIME + serveFile moved to conductor-lib/media.js (imported above) */
function sendJSON(res, code, obj) { const b = Buffer.from(JSON.stringify(obj)); res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Content-Length': b.length }); res.end(b); }
function readBody(req, cb) { let s = ''; req.on('data', (c) => { s += c; if (s.length > 2e6) req.destroy(); }); req.on('end', () => { let j = null; try { j = JSON.parse(s || '{}'); } catch (e) {} cb(j); }); }
/* v3.62: listPhotos/photoSafe moved to conductor-lib/media.js (imported
   above). photoAlbums + its cache stay here (only core + v262 use them). */
let _albCache = { t: 0, v: null };
function photoAlbums() {   // every folder (to depth 3) that contains photos; ids = relative paths (v1.2)
  if (_albCache.v && Date.now() - _albCache.t < 60000) return _albCache.v;
  const out = [];
  function walk(rel, depth) {
    let ents = [];
    try { ents = fs.readdirSync(path.join(PHOTOS_DIR, rel), { withFileTypes: true }); } catch (e) { return; }
    for (const en of ents) {
      if (!en.isDirectory()) continue;
      const r = rel ? rel + '/' + en.name : en.name;
      const n = (listPhotos(path.join(PHOTOS_DIR, r)) || []).length;
      if (n) out.push({ dir: r, count: n });
      if (depth < 3) walk(r, depth + 1);
    }
  }
  try { fs.mkdirSync(PHOTOS_DIR, { recursive: true }); } catch (e) {}
  walk('', 1);
  _albCache = { t: Date.now(), v: out };
  return out;
}

/* v3.62: buildManifest/manifestDirty/buildManifestCached (+ cache state)
   moved to conductor-lib/media.js (imported above). */

const HAS_APP = fs.existsSync(path.join(APP_DIR, 'app.html'));   // v1.4: Play & Design app at /
// v2.51: the core handler finally gets the try/catch every appended patch block
// already had. Before this, a malformed escape (GET /% or /media/%E0%A4) threw
// URIError from decodeURIComponent synchronously — pre-harden a process crash,
// post-harden a permanently hung response + leaked socket.
const server = http.createServer((req, res) => {
  try { coreHandler(req, res); }
  catch (e) {
    console.log('[http] core handler error:', req.url, '-', e.message);
    try {
      if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('bad request');
    } catch (_) { try { res.destroy(); } catch (__) {} }
  }
});
function coreHandler(req, res) {
  const u = new URL(req.url, 'http://localhost'); const p = u.pathname;
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }); res.end(); return; }

  if (p.startsWith('/media/')) { const abs = mediaSafe(decodeURIComponent(p.slice(7))); if (abs) return serveFile(res, abs, true); res.writeHead(404); return res.end('bad media path'); }
  if (p.startsWith('/overlays/')) { const fn = path.basename(decodeURIComponent(p.slice(10))); return serveFile(res, path.join(OVERLAY_DIR, fn), true); }
  if (p.startsWith('/decks/')) {    // v2.0 cue-card images — traversal-guarded inside decks/
    const rel = p.slice(7).split('/').map((s2) => decodeURIComponent(s2)).join('/');
    const abs = path.normalize(path.join(DECKS_DIR, rel));
    if (abs === DECKS_DIR || abs.startsWith(DECKS_DIR + path.sep)) return serveFile(res, abs, true);   // v2.52: path-sep suffix (plain startsWith matched sibling dirs like decks-old/)
    res.writeHead(404); return res.end('bad deck path');
  }
  if (p.startsWith('/sounds/')) {   // v2.0 social SFX files
    const relSnd = decodeURIComponent(p.slice(8)); // rs-sounds-sub v1: subfolders supported
    const absSnd = path.resolve(SOUNDS_DIR, relSnd);
    if (absSnd === SOUNDS_DIR || absSnd.indexOf(SOUNDS_DIR + path.sep) !== 0) { res.writeHead(400, { 'Content-Type': 'text/plain' }); return res.end('bad path'); }
    return serveFile(res, absSnd, true);
  }
  if (p.startsWith('/photos/')) {   // /photos/<any>/<depth>/<file> — traversal-guarded (v1.2)
    const abs = photoSafe(p.slice(8).split('/').map((s) => decodeURIComponent(s)).join('/'));
    if (abs) return serveFile(res, abs, true);
  }
  if (p.startsWith('/thumb/')) {
    const tw = Math.max(48, Math.min(1280, parseInt(u.searchParams.get('w') || '260', 10)));
    const src = u.searchParams.get('src');
    const tag = src === 'overlays' ? 'o' : src === 'photos' ? 'p' : 'm';
    const fn = path.basename(decodeURIComponent(p.slice(7)));
    let srcPath, outName = fn;
    const relQ = u.searchParams.get('p');
    if (tag === 'p') {                                   // v1.3: resized photo tiles — ?src=photos&p=<album-relative path>
      srcPath = photoSafe(relQ || '');
      if (!srcPath) { res.writeHead(404); res.end('bad photo path'); return; }
      outName = (relQ || '').replace(/[\/\\]/g, '__');
    } else if (tag === 'm' && relQ) {                    // v1.5: media in subfolders
      srcPath = mediaSafe(relQ);
      if (!srcPath) { res.writeHead(404); res.end('bad media path'); return; }
      outName = relQ.replace(/[\/\\]/g, '__');
    } else srcPath = path.join(tag === 'o' ? OVERLAY_DIR : MEDIA_DIR, fn);
    if (VID_RE.test(fn)) {                                // v1.8: serve a pre-generated poster frame for video tiles
      const poster = path.join(THUMB_DIR, 'poster_' + outName.replace(/[^a-z0-9_.-]/gi, '_') + '.jpg');
      if (fs.existsSync(poster)) return serveFile(res, poster, true);
      return serveFile(res, srcPath, true);               // no poster yet -> raw file (client shows the play badge)
    }
    if (!thumbLib) return serveFile(res, srcPath, true);                             // no image lib -> original
    const outPath = thumbOut(tag, tw, outName);
    if (fs.existsSync(outPath)) return serveFile(res, outPath, true);
    return genThumb(srcPath, outPath, tw, function (err) { serveFile(res, err ? srcPath : outPath, true); });
  }

  if (p.startsWith('/api/')) {
    if (p === '/api/health') return sendJSON(res, 200, { ok: true, name: 'RoomScape Conductor', version: '4.24', clients: clients.size, phase: activePhaseId, frames: Array.from(clients).map((c) => c.frame).filter(Boolean), game: state.game, mode: state.mode, scenes: Object.keys(landIndex).length, overlays: overlayList.length, thumbs: thumbKind, ha: haOn() });
    if (p === '/api/layout') return sendJSON(res, 200, { ok: true, frames: LAYOUT.frames, walls: LAYOUT.walls, roles: LAYOUT.roles, orientation: LAYOUT.orientation, atRest: AT_REST });   // v2.62: wall shape, single source of truth · RS-CONFIG v1: roles/orientation/atRest
    if (p === '/api/state' && req.method === 'GET') return sendJSON(res, 200, state);
    if (p === '/api/scenes') return sendJSON(res, 200, { count: Object.keys(landIndex).length, thumbs: thumbKind, scenes: Object.keys(landIndex).sort().map(function (k) { const l = landIndex[k]; const e = encodeURIComponent(l[0]); const d = path.dirname(l[0]).replace(/\\/g, '/'); const dm = (global.__rsDims || {})[l[0]]; const ori = (dm && dm.w && dm.h) ? (dm.w > dm.h ? 'l' : (dm.h > dm.w ? 'p' : 's')) : null; return { key: k, count: l.length, dir: (d === '.' ? '' : d), ori: ori, sample: '/media/' + e, thumb: '/thumb/' + encodeURIComponent(path.basename(l[0])) + '?src=media&w=320&p=' + e, video: VID_RE.test(l[0]) }; }) });   // v2.40 dir = folder path; v2.41 ori = p|l|s from RS-SCENE-DIMS (null while unprobed / video)
    if (p === '/api/overlays') return sendJSON(res, 200, { count: overlayList.length, thumbs: thumbKind, overlays: overlayList.map(function (f) { const e = encodeURIComponent(f); return { file: f, url: '/overlays/' + e, thumb: '/thumb/' + e + '?src=overlays&w=240' }; }) });
    if (p === '/api/manifest') {   // v2.52: cached; v2.62: async walk (handler awaits the promise)
      buildManifestCached()
        .then((files) => sendJSON(res, 200, { count: files.length, bytes: files.reduce(function (a, f) { return a + f.size; }, 0), files: files }))
        .catch((e) => sendJSON(res, 500, { ok: false, error: String((e && e.message) || e) }));
      return;
    }
    if (p === '/api/edges' && req.method === 'GET') {
      const edges = edgeList(); if (!edges.length) return sendJSON(res, 200, { edges: [] });
      const out = new Array(edges.length); let n = 0;
      edges.forEach((e, i) => fetchJSON(e.url.replace(/\/+$/, '') + '/edge/status', 6000, (err, d) => {
        out[i] = err ? { name: e.name, url: e.url, ok: false, error: err.message } : Object.assign({ name: e.name, url: e.url, ok: true }, d);
        if (++n === edges.length) sendJSON(res, 200, { edges: out });
      }));
      return;
    }
    if (p === '/api/edges/sync' && req.method === 'POST') return readBody(req, (b) => {
      const edges = edgeList().filter((e) => !b || !b.url || e.url === b.url);
      if (!edges.length) return sendJSON(res, 404, { ok: false, error: 'no matching edge' });
      const out = []; let n = 0;
      edges.forEach((e) => fetchJSON(e.url.replace(/\/+$/, '') + '/edge/prewarm', 4000, (err, d) => {
        out.push(err ? { url: e.url, ok: false, error: err.message } : Object.assign({ url: e.url }, d));
        if (++n === edges.length) sendJSON(res, 200, { ok: true, results: out });
      }));
    });
    if (p === '/api/edges/cleanup' && req.method === 'POST') return readBody(req, (b) => {
      const edges = edgeList().filter((e) => !b || !b.url || e.url === b.url);
      if (!edges.length) return sendJSON(res, 404, { ok: false, error: 'no matching edge' });
      const out = []; let n = 0;
      edges.forEach((e) => fetchJSON(e.url.replace(/\/+$/, '') + '/edge/cleanup', 30000, (err, d) => {
        out.push(err ? { url: e.url, ok: false, error: err.message } : Object.assign({ url: e.url, ok: true }, d));
        if (++n === edges.length) sendJSON(res, 200, { ok: true, results: out });
      }));
    });
    if (p === '/api/edges/screens' && req.method === 'GET') {
      const edges = edgeList(); if (!edges.length) return sendJSON(res, 200, { edges: [] });
      const out = new Array(edges.length); let n = 0;
      edges.forEach((e, i) => fetchJSON(e.url.replace(/\/+$/, '') + '/edge/screens', 8000, (err, d) => {
        out[i] = err ? { name: e.name, url: e.url, ok: false, error: err.message } : Object.assign({ name: e.name, url: e.url }, d);
        if (++n === edges.length) sendJSON(res, 200, { edges: out });
      }));
      return;
    }
    if (p === '/api/edges/screens' && req.method === 'POST') return readBody(req, (b) => {
      if (!b || !b.url) return sendJSON(res, 400, { ok: false, error: 'need {url, order[], rotate}' });
      const edge = edgeList().find((e) => e.url === b.url);
      if (!edge) return sendJSON(res, 404, { ok: false, error: 'no matching edge' });
      postJSON(edge.url.replace(/\/+$/, '') + '/edge/screens', { order: b.order, rotate: b.rotate, labels: b.labels, rotations: b.rotations }, 15000, (err, d) => sendJSON(res, err ? 502 : 200, err ? { ok: false, error: err.message } : d));   // v2.21: per-screen rotations pass through
    });
    if (p === '/api/edges/audio' && req.method === 'GET') {
      const edges = edgeList(); if (!edges.length) return sendJSON(res, 200, { edges: [] });
      const out = new Array(edges.length); let n = 0;
      edges.forEach((e, i) => fetchJSON(e.url.replace(/\/+$/, '') + '/edge/audiodevices', 6000, (err, d) => {
        out[i] = err ? { name: e.name, url: e.url, ok: false, error: err.message } : Object.assign({ name: e.name, url: e.url }, d);
        if (++n === edges.length) sendJSON(res, 200, { edges: out });
      }));
      return;
    }
    if (p === '/api/edges/tone' && req.method === 'POST') return readBody(req, (b) => {
      if (!b || !b.url) return sendJSON(res, 400, { ok: false, error: 'need {url, card, dev}' });
      const edge = edgeList().find((e) => e.url === b.url);
      if (!edge) return sendJSON(res, 404, { ok: false, error: 'no matching edge' });
      fetchJSON(edge.url.replace(/\/+$/, '') + '/edge/tone?card=' + encodeURIComponent(b.card) + '&dev=' + encodeURIComponent(b.dev), 8000, (err, d) => sendJSON(res, err ? 502 : 200, err ? { ok: false, error: err.message } : d));
    });
    if (p === '/api/warmthumbs') { setTimeout(warmThumbs, 10); return sendJSON(res, 200, { ok: true, thumbs: thumbKind }); }
    if (p === '/api/sounds') {   // list sounds/ recursively (incl. subfolders like music/) for the audio editor
      const out = [];
      const walk = (dir, rel) => {
        let ents = [];
        try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const en of ents) {
          if (en.name[0] === '.') continue;
          if (en.name === '_wav_originals' || en.name === '_junk' || en.name === '__MACOSX') continue;   /* v2.50: hide archived wavs / junk from the picker (audio re-org) */
          if (en.isDirectory()) walk(path.join(dir, en.name), rel + en.name + '/');
          else if (/\.(wav|mp3|ogg|m4a|flac|aac)$/i.test(en.name)) out.push(rel + en.name);
        }
      };
      walk(SOUNDS_DIR, '');
      out.sort();
      return sendJSON(res, 200, { sounds: out });
    }
    if (p === '/api/profiles' && req.method === 'GET') return sendJSON(res, 200, { profiles, tagmap, settings: redactSettings(settings) });   // RS-REDACT v1
    if (p === '/api/profiles' && req.method === 'POST') return readBody(req, function (b) {
      if (!b || !b.profiles) return sendJSON(res, 400, { ok: false, error: 'need {profiles, tagmap}' });
      backupFile(PROFILES_FILE);
      profiles = b.profiles; if (b.tagmap) tagmap = b.tagmap;
      if (b.settings) {
        /* RS-REDACT v1: GET /api/profiles serves settings WITHOUT music.token, and the
           app round-trips that object straight back here — so an incoming body with a
           missing/empty token means "keep what you have", not "wipe it". url/player
           remain client-editable; only the token is secret. */
        var prevTok = (settings && settings.music && settings.music.token) || '';
        settings = b.settings;
        if (prevTok && (!settings.music || !settings.music.token)) {
          settings.music = settings.music || {};
          settings.music.token = prevTok;
        }
      }
      // v2.52: 'dining' is the panic/default mode — applyProfile('dining') throws if
      // it's gone. The pguard wipe-block only rejects payloads missing ≥2 modes, so
      // a payload missing just dining could slip through. Re-seed it.
      if (!profiles.dining) profiles.dining = Object.assign({}, DEFAULT_PROFILES.dining);
      // v2.52: report a failed disk write honestly — the client used to see
      // "Saved" while profiles.json still held the old content.
      let werr = null;
      try { fs.writeFileSync(PROFILES_FILE, JSON.stringify({ profiles, tagmap, settings }, null, 2)); } catch (e) { werr = e; }
      // re-resolve the currently-live room from the saved definitions and push to the frames
      state._imgSig = null; resolveFrameImages(state); resolveOverlays(state); resolveFx(state); state.chroma = settings.chroma;
      lastFxSig = state.game + '|' + state.mode; broadcastState();
      if (werr) return sendJSON(res, 500, { ok: false, error: 'write failed: ' + werr.message });
      sendJSON(res, 200, { ok: true, count: Object.keys(profiles).length });
    });
    if (p === '/api/rescan') { scanMedia(); scanOverlays(); return sendJSON(res, 200, { ok: true, scenes: Object.keys(landIndex).length, overlays: overlayList.length }); }
    if (p === '/api/poster' && req.method === 'POST') {   // v1.9: save a client-generated video poster into .thumbs
      const rel = u.searchParams.get('p') || '';
      const abs = mediaSafe(rel);
      if (!abs) return sendJSON(res, 400, { ok: false, error: 'bad path' });
      const outName = rel.replace(/[\/\\]/g, '__');
      const poster = path.join(THUMB_DIR, 'poster_' + outName.replace(/[^a-z0-9_.-]/gi, '_') + '.jpg');
      const chunks = []; let size = 0;
      req.on('data', function (c) { size += c.length; if (size > 4 * 1024 * 1024) { req.destroy(); } else { chunks.push(c); } });
      req.on('end', function () { try { fs.mkdirSync(THUMB_DIR, { recursive: true }); fs.writeFileSync(poster, Buffer.concat(chunks)); sendJSON(res, 200, { ok: true }); } catch (e) { sendJSON(res, 500, { ok: false, error: String(e) }); } });
      return;
    }
    if (p === '/api/state' && req.method === 'POST') return readBody(req, (b) => { if (b && typeof b === 'object') { state = acceptState(b); resolveFrameImages(state); resolveOverlays(state); persist(); broadcastState(); publishMqtt(); } sendJSON(res, 200, { ok: true }); });   // v2.51: defensive merge
    if (p.startsWith('/api/game/')) { applyProfile(decodeURIComponent(p.split('/')[3])); return sendJSON(res, 200, { ok: true, game: state.game, frameImages: state.frameImages, overlayImages: state.overlayImages }); }
    if (p.startsWith('/api/mode/')) { setMode(p.split('/')[3]); return sendJSON(res, 200, { ok: true, mode: state.mode }); }
    if (p.startsWith('/api/tag/'))  { const id = decodeURIComponent(p.split('/')[3] || ''); const g = tagmap[id]; if (g) { applyProfile(g); return sendJSON(res, 200, { ok: true, game: g }); } return sendJSON(res, 404, { ok: false, error: 'unknown tag', id }); }
    if (p === '/api/panic') { applyProfile('dining'); return sendJSON(res, 200, { ok: true }); }
    if (p === '/api/phase' && req.method === 'POST') return readBody(req, (b) => {   // v2.2 phases
      const ok = applyPhase((b && b.phase) || null);
      sendJSON(res, ok ? 200 : 404, { ok: !!ok, phase: activePhaseId, game: state.game, phases: phaseListFor(state.game) });
    });
    if (p === '/api/kid') { state.kid = u.searchParams.get('on') !== '0'; bump('kid'); return sendJSON(res, 200, { ok: true, kid: state.kid }); }

    /* ==== v2.0 automations API ==== */
    if (p === '/api/social') return sendJSON(res, 200, { ok: true, social: socialList(), kid: !!state.kid });
    if (p.startsWith('/api/social/') && req.method === 'POST') { const b2 = fireSocial(decodeURIComponent(p.split('/')[3] || '')); return sendJSON(res, b2 ? 200 : 404, { ok: !!b2, fired: b2 && b2.id }); }
    if (p === '/api/decks') return sendJSON(res, 200, { ok: true, decks: deckList() });
    if (p === '/api/prompter' && req.method === 'POST') return readBody(req, (b2) => { setPrompter(b2 || {}); sendJSON(res, 200, { ok: true, prompter: promptState }); });
    if (p === '/api/hold' && req.method === 'POST') return readBody(req, (b2) => {
      holdUntil = (b2 && b2.minutes) ? Date.now() + b2.minutes * 60000 : 0;
      logDiary('hold', holdUntil ? ('room held for ' + b2.minutes + ' min') : 'hold released');
      sendJSON(res, 200, { ok: true, holdUntil: holdUntil });
    });
    if (p === '/api/auto') {
      const t = rhythmTarget(), nx = (settings.rhythms || {}).on ? rhythmNextChange() : null;
      return sendJSON(res, 200, { ok: true, rhythmsOn: !!(settings.rhythms || {}).on, ambient: isAmbient(), game: state.game,
        target: t, next: nx, holdUntil: holdUntil, special: t && t.special || null,
        weather: { on: !!(settings.weather || {}).on, cond: weather.cond, effect: weather.effect, pinnedUntil: weather.pinnedUntil, ha: haOn() },
        schedule: Array.isArray(settings.schedule) ? settings.schedule : [],                                   // v2.62 autopilot v2
        sunShift: Object.assign({ on: false, offsetMin: 0 }, settings.sunShift || {}) });                      // v2.62 autopilot v2
    }
    if (p === '/api/diary') return sendJSON(res, 200, { ok: true, diary: diary });
    if (p === '/api/weather/preview' && req.method === 'POST') return readBody(req, (b2) => {
      b2 = b2 || {};
      if (b2.off) { weather.pinnedUntil = 0; pollWeather(); }
      else {
        const mins = b2.minutes || 0.5;
        weather.pinnedUntil = Date.now() + mins * 60000;
        weather.cond = b2.cond || 'preview';
        weather.effect = b2.effect || autoMapCondition(b2.cond || '');
        setTimeout(() => { if (Date.now() >= weather.pinnedUntil - 500) { weather.pinnedUntil = 0; weather.cond = null; weather.effect = null; AUTO_SWITCH = true; try { bump('weather-preview-end'); } finally { AUTO_SWITCH = false; } pollWeather(); } }, mins * 60000 + 700);
        logDiary('weather', 'preview: ' + weather.cond + (mins >= 5 ? ' (pinned ' + mins + 'm)' : ''));
      }
      AUTO_SWITCH = true; try { bump('weather-preview'); } finally { AUTO_SWITCH = false; }
      sendJSON(res, 200, { ok: true, weather: weather });
    });

    /* ---- effect layer library (v1.6): looping VFX videos in Images & Videos/effects (v2.50: moved from video/effects during the video re-org) ---- */
    if (p === '/api/effects') {
      let files = [];
      try { files = fs.readdirSync(path.join(MEDIA_DIR, 'effects')).filter((f) => VID_RE.test(f)).sort(); } catch (e) {}
      return sendJSON(res, 200, { ok: true, effects: files.map((f) => ({ file: 'effects/' + f, name: f.replace(VID_RE, ''), url: '/media/effects/' + encodeURIComponent(f) })) });
    }

    /* ---- photo frames (v1.2): nested albums anywhere under Photos/, to depth 3 ---- */
    if (p === '/api/photodirs') {   // v2.62: + the virtual '📅 On this day' album (same {dir,count} shape, plus a display name)
      const dirs = photoAlbums().slice();
      if (typeof global.__rsOnThisDayInfo === 'function') dirs.push(global.__rsOnThisDayInfo());
      return sendJSON(res, 200, { ok: true, root: 'Photos/', dirs: dirs });
    }
    if (p === '/api/photos') {
      const dir = u.searchParams.get('dir') || '';
      if (dir === '_onthisday' && typeof global.__rsOnThisDay === 'function') { global.__rsOnThisDay((r) => sendJSON(res, 200, r)); return; }   // v2.62 virtual album
      const abs = dir && photoSafe(dir);
      if (!abs) return sendJSON(res, 400, { ok: false, error: 'need a valid ?dir=' });
      const files = listPhotos(abs);
      if (!files) return sendJSON(res, 404, { ok: false, error: 'folder not found: ' + dir });
      const base = '/photos/' + dir.split('/').map(encodeURIComponent).join('/');
      return sendJSON(res, 200, { ok: true, dir, count: files.length, photos: files.map((f) => base + '/' + f.split('/').map(encodeURIComponent).join('/')) });
    }

    /* ---- system: reload frames / restart self (v1.0) ---- */
    if (p === '/api/reload' && req.method === 'POST') return readBody(req, (b) => {
      const f = (b && b.frame) || 'all';
      const msg = { ie: true, type: 'reload', frame: f, t: Date.now() };
      for (const c of clients) wsSend(c.sock, msg);
      console.log('[sys] reload -> ' + f + ' (' + clients.size + ' clients)');
      sendJSON(res, 200, { ok: true, frame: f, clients: clients.size });
    });

    /* ---- reveal: play a still->video->still reveal on a frame (v1.7) ---- */
    if (p === '/api/reveal' && req.method === 'POST') return readBody(req, (b) => {
      const f = (b && b.frame) || 'all';
      const msg = { ie: true, type: 'reveal', frame: f, t: Date.now() };
      for (const c of clients) wsSend(c.sock, msg);
      console.log('[reveal] -> ' + f + ' (' + clients.size + ' clients)');
      sendJSON(res, 200, { ok: true, frame: f, clients: clients.size });
    });

    /* ---- audio: play a one-shot / sweep across the wall (v1.0 audio engine) ----
       Each frame's fx-audio.js plays the sound if it's a target, at target.at ms.
       Body: { sound, mode:'sweep'|'all'|'one', frame?, frames?, stepMs?, gain?, reverse?, targets? }
       A "sweep" is just the same sound staggered per frame so it travels across the room. */
    if (p === '/api/sfx' && req.method === 'POST') return readBody(req, (b) => {
      b = b || {};
      const sound = b.sound || 'sounds/Whoosh.wav';
      const gain = (b.gain != null) ? b.gain : 1;
      const ALL = LAYOUT.frames;   // v2.62: single source of truth
      // client may send a ready-made hits list [{f,at,gain}] (supports bounce/orbit repeats);
      // otherwise build one from mode/frames/stepMs.
      let hits = Array.isArray(b.hits) ? b.hits : null;
      if (!hits) {
        let order = (b.frames && b.frames.length) ? b.frames.slice() : ALL.slice();
        if (b.reverse) order.reverse();
        const step = (b.stepMs != null) ? b.stepMs : 180;
        if (b.mode === 'all') hits = order.map((f) => ({ f, at: 0 }));
        else if (b.mode === 'one') hits = [{ f: (b.frame || 'L1'), at: 0 }];
        else hits = order.map((f, i) => ({ f, at: i * step }));   // default: sweep
      }
      const msg = { ie: true, type: 'audio', action: 'play', sound, hits, gain, t: Date.now() };
      for (const c of clients) wsSend(c.sock, msg);
      console.log('[sfx] ' + sound + ' x' + hits.length + ' hits (' + clients.size + ' clients)');
      sendJSON(res, 200, { ok: true, sound, hits, clients: clients.size });
    });

    /* ---- volume: set the master TV volume (0..100) for every frame at once ---- */
    if (p === '/api/volume' && req.method === 'POST') return readBody(req, (b) => {
      var pct = (b && b.pct != null) ? Math.max(0, Math.min(150, Math.round(+b.pct))) : null;
      if (pct == null || isNaN(pct)) return sendJSON(res, 400, { ok: false, error: 'need {pct}' });
      settings.audio = settings.audio || {}; settings.audio.volume = pct;
      state.audio = Object.assign({}, state.audio || {}, { volume: pct });
      // v2.52: debounce the disk write — dragging the slider fired a full
      // profiles.json rewrite per notch (needless share churn, no backup chain).
      // In-memory state + broadcast stay instant; the file settles 2s after the
      // last notch.
      clearTimeout(global._volWriteT);
      global._volWriteT = setTimeout(function () {
        try { fs.writeFileSync(PROFILES_FILE, JSON.stringify({ profiles, tagmap, settings }, null, 2)); } catch (e) { console.log('[volume] persist failed:', e.message); }
      }, 2000);
      state.rev = (state.rev || 0) + 1; broadcastState();
      console.log('[volume] all TVs -> ' + pct + '%');
      sendJSON(res, 200, { ok: true, volume: pct });
    });

    /* ---- identify: flash a frame's ID on its TV (+ optional sound) so you can
       confirm which physical TV is which frame (audio↔video cross-check). ---- */
    if (p === '/api/identify' && req.method === 'POST') return readBody(req, (b) => {
      b = b || {};
      const frame = b.frame || 'all';
      const msg = { ie: true, type: 'identify', frame, sound: b.sound || null, t: Date.now() };
      for (const c of clients) wsSend(c.sock, msg);
      console.log('[identify] -> ' + frame + ' (' + clients.size + ' clients)');
      sendJSON(res, 200, { ok: true, frame, clients: clients.size });
    });
    /* ==== v2.3 Music Assistant + light presets ==== */
    if (p === '/api/lightscenes') {
      const ha = haCfg();
      return sendJSON(res, 200, { ok: true, configured: haOn(), lights: ha.lights, scenes: ha.lightScenes });
    }
    if (p === '/api/music/status') {
      const mu = settings.music || {};
      if (!mu.url) return sendJSON(res, 200, { ok: true, configured: false, hold: musicHold });
      return maCall('players/all', {}, (e, players) => {
        if (e) return sendJSON(res, 200, { ok: false, configured: true, error: e.message, hold: musicHold, player: mu.player || '', url: mu.url });
        const list = (players || []).map((pl) => ({ id: pl.player_id, name: pl.display_name || pl.name || pl.player_id, available: pl.available !== false, state: pl.state || null }));
        const selp = (players || []).find((pl) => pl && pl.player_id === (mu.player || ''));
        const vol = selp ? (selp.group_volume != null ? selp.group_volume : (selp.volume_level != null ? selp.volume_level : null)) : null;
        maCall('player_queues/all', {}, (e2, queues) => {
          let q = null;
          if (!e2 && Array.isArray(queues)) q = queues.find((x) => x && x.queue_id === (mu.player || '')) || null;
          const cur = q && q.current_item ? q.current_item : null;
          const md = cur ? (cur.media_item || cur) : null;
          const out = { ok: true, configured: true, hold: musicHold, now: musicNow, volume: vol, player: mu.player || '', url: mu.url, players: list,
            queue: q ? { state: q.state, elapsed: q.elapsed_time, shuffle: !!q.shuffle_enabled, current: md ? { name: md.name || cur.name || '', artist: (md.artists && md.artists[0] && md.artists[0].name) || '', image: maImage(md) } : null, upNext: [] } : null };
          /* v3.82: queue peek — the three tracks after current_index (best effort; older MA without player_queues/items just returns the base payload) */
          if (!out.queue || !cur || q.current_index == null) return sendJSON(res, 200, out);
          maCall('player_queues/items', { queue_id: q.queue_id, limit: 4, offset: q.current_index + 1 }, (e3, r3) => {
            if (!e3) out.queue.upNext = maItems(r3).map((it) => { const m2 = (it && it.media_item) || it || {}; return { name: m2.name || (it && it.name) || '', artist: (m2.artists && m2.artists[0] && m2.artists[0].name) || '' }; }).filter((t) => t.name).slice(0, 3);
            sendJSON(res, 200, out);
          });
        });
      });
    }
    if (p === '/api/music/playlists') {
      return maCall('music/playlists/library_items', { limit: 500 }, (e, r) => {
        if (e) return sendJSON(res, 200, { ok: false, error: e.message });
        sendJSON(res, 200, { ok: true, playlists: maItems(r).map((pl) => ({ name: pl.name, uri: pl.uri, owner: pl.owner || '', image: maImage(pl) })) });
      });
    }
    if (p === '/api/music/tracks') {
      const q2 = (u.searchParams.get('search') || '').trim();
      return maCall('music/tracks/library_items', { search: q2 || undefined, limit: 50, order_by: q2 ? undefined : 'timestamp_added_desc' }, (e, r) => {
        if (e) return sendJSON(res, 200, { ok: false, error: e.message });
        sendJSON(res, 200, { ok: true, tracks: maItems(r).map((t) => ({ name: t.name, uri: t.uri, artist: (t.artists && t.artists[0] && t.artists[0].name) || '', album: (t.album && t.album.name) || '', image: maImage(t) })) });
      });
    }
    if (p === '/api/music/play' && req.method === 'POST') return readBody(req, (b) => {
      const mu = settings.music || {};
      if (!mu.player) return sendJSON(res, 400, { ok: false, error: 'No Music Assistant player chosen yet — pick one in the Music tab' });
      const media = (b && (b.uri || b.name)) || '';
      if (!media) return sendJSON(res, 400, { ok: false, error: 'need {uri}' });
      if (/playlist/i.test(String(media)) && mu.shuffle !== false) maCall('player_queues/shuffle', { queue_id: mu.player, shuffle_enabled: true }, function () {}); // rs-music-shuffle v1 (v3.82: respects the app's shuffle toggle)
      maCall('player_queues/play_media', { queue_id: mu.player, media: media, option: (b && b.option) || 'replace' }, (e) => {
        if (e) return sendJSON(res, 502, { ok: false, error: e.message });
        if (!musicHold) { musicHold = true; bump('music:on'); }
        setTimeout(musicPollNow, 1500);   // v2.31: fast first toast
        if (/playlist/i.test(String(media))) maCall('player_queues/repeat', { queue_id: mu.player, repeat_mode: 'all' }, () => {}); // rs-music-repeat v1
        logDiary('music', '▶ ' + ((b && b.label) || media));
        sendJSON(res, 200, { ok: true, hold: true });
      });
    });
    if (p === '/api/music/cmd' && req.method === 'POST') return readBody(req, (b) => {
      const mu = settings.music || {}, act = (b && b.action) || '';
      if (!mu.player) return sendJSON(res, 400, { ok: false, error: 'no player configured' });
      const done = (e) => { if (e) return sendJSON(res, 502, { ok: false, error: e.message }); if (musicHold) setTimeout(musicPollNow, 1200); sendJSON(res, 200, { ok: true, hold: musicHold }); };
      if (act === 'volume') {
        const vol = Math.max(0, Math.min(100, Math.round(+((b && b.value) || 0))));
        return maCall('players/all', {}, (pe, players) => {   // v2.32: groups need group_volume, not volume_set
          const pl = !pe && (players || []).find((x) => x && x.player_id === mu.player);
          const kids = (pl && Array.isArray(pl.group_childs)) ? pl.group_childs : [];
          if (!kids.length) return maCall('players/cmd/volume_set', { player_id: mu.player, volume_level: vol }, done);
          maCall('players/cmd/group_volume', { player_id: mu.player, volume_level: vol }, (ge) => {
            if (!ge) return done(null);
            let left = kids.length, err = null;                // older MA: set every member ourselves
            kids.forEach((cid) => maCall('players/cmd/volume_set', { player_id: cid, volume_level: vol }, (e2) => { if (e2) err = e2; if (--left === 0) done(err); }));
          });
        });
      }
      if (act === 'shuffle') return maCall('player_queues/shuffle', { queue_id: mu.player, shuffle_enabled: !!(b && b.value) }, done);   // v3.82
      if (act === 'pause') return maCall('player_queues/pause', { queue_id: mu.player }, done);
      if (act === 'play') return maCall('player_queues/play', { queue_id: mu.player }, done);
      if (act === 'next') return maCall('player_queues/next', { queue_id: mu.player }, done);
      if (act === 'previous') return maCall('player_queues/previous', { queue_id: mu.player }, done);
      if (act === 'stop') return maCall('player_queues/stop', { queue_id: mu.player }, (e) => { musicOff('stopped'); done(e); });
      sendJSON(res, 400, { ok: false, error: 'unknown action' });
    });
    if (p === '/api/music/hold' && req.method === 'POST') return readBody(req, (b) => {
      if (b && b.on) { if (!musicHold) { musicHold = true; bump('music:hold'); } }
      else musicOff('released');
      sendJSON(res, 200, { ok: true, hold: musicHold });
    });
    if (p === '/api/restart' && req.method === 'POST') {
      sendJSON(res, 200, { ok: true, restarting: true });
      console.log('[sys] restart requested — exiting (docker restart policy relaunches with fresh conductor.js from the share)');
      setTimeout(() => process.exit(0), 300);
      return;
    }

    /* ---- Home Assistant bridge (token stays server-side) ---- */
    if (p === '/api/ha/room' && req.method === 'GET') {
      if (!haOn()) return sendJSON(res, 200, { ok: true, configured: false });
      return haFetch('GET', '/api/states', null, (e, code, all) => {
        if (e || !Array.isArray(all)) return sendJSON(res, 502, { ok: false, configured: true, error: e ? e.message : 'HA replied ' + code });
        const ha = haCfg();
        if (u.searchParams.get('all') === '1') {   // v2.34: diagnostic — every TV-ish media_player with capabilities; v2.47 + lights
          const tvish = all.filter((s) => s.entity_id.startsWith('media_player.') && /dining|frame|ls03/i.test(s.entity_id + '|' + ((s.attributes || {}).friendly_name || '')));
          const lights = all.filter((s) => s.entity_id.startsWith('light.')).map((s) => ({ id: s.entity_id, name: (s.attributes || {}).friendly_name, state: s.state, effects: (s.attributes || {}).effect_list || null, group: Array.isArray((s.attributes || {}).entity_id) ? (s.attributes || {}).entity_id : null }));
          return sendJSON(res, 200, { ok: true, entities: tvish.map((s) => ({ id: s.entity_id, name: (s.attributes || {}).friendly_name, state: s.state, features: (s.attributes || {}).supported_features, device_class: (s.attributes || {}).device_class, source_list: (s.attributes || {}).source_list })), lights });
        }
        const ids = new Set(Object.values(ha.tvs).concat(ha.lights).filter(Boolean));
        const states = {};
        all.forEach((s) => { if (ids.has(s.entity_id)) states[s.entity_id] = { state: s.state, name: (s.attributes || {}).friendly_name, volume_level: (s.attributes || {}).volume_level, source: (s.attributes || {}).source, source_list: (s.attributes || {}).source_list, brightness: (s.attributes || {}).brightness }; });
        sendJSON(res, 200, { ok: true, configured: true, tvs: ha.tvs, lights: ha.lights, scenes: Object.keys(ha.lightScenes), states });
      });
    }
    if (p === '/api/ha/service' && req.method === 'POST') return readBody(req, (b) => {
      if (!b || !b.domain || !b.service) return sendJSON(res, 400, { ok: false, error: 'need {domain, service, data}' });
      if (!HA_DOMAINS[b.domain]) return sendJSON(res, 403, { ok: false, error: 'domain not allowed: ' + b.domain });
      haCall(b.domain, b.service, b.data || {}, (e, code) => {
        if (e) return sendJSON(res, 502, { ok: false, error: e.message });
        sendJSON(res, 200, { ok: code >= 200 && code < 300, ha: code });
      });
    });
    if (p === '/api/ha/lightscene' && req.method === 'POST') return readBody(req, (b) => {   // apply a named light scene now
      const ha = haCfg(); const sc = ha.lightScenes[(b || {}).scene];
      if (!sc) return sendJSON(res, 404, { ok: false, error: 'unknown scene' });
      if (!ha.lights.length) return sendJSON(res, 400, { ok: false, error: 'no lights configured' });
      haCall('light', 'turn_on', Object.assign({ entity_id: ha.lights }, sc), (e, code) => sendJSON(res, e ? 502 : 200, { ok: !e, error: e && e.message }));
    });
    return sendJSON(res, 404, { ok: false, error: 'unknown endpoint' });
  }

  let rel = decodeURIComponent(p); if (rel === '/') rel = HAS_APP ? '/app.html' : '/control.html'; if (rel === '/frame') rel = '/frame.html';
  const file = path.join(APP_DIR, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(APP_DIR)) { res.writeHead(403); res.end('forbidden'); return; }
  serveFile(res, file, false);
}
server.on('upgrade', (req, sock) => handleUpgrade(req, sock));
setInterval(() => { const msg = { ie: true, type: 'clock', t: Date.now() }; for (const c of clients) wsSend(c.sock, msg); }, 2000);

scanMedia(); scanOverlays();
resolveFrameImages(state); resolveOverlays(state); resolveFx(state); state.chroma = settings.chroma; lastFxSig = state.game + '|' + state.mode;
setTimeout(directorOnModeChange, 2000);   // v1.2: start the current mode's audio director after boot
server.listen(PORT, () => {
  console.log('====================================================');
  console.log('  RoomScape Conductor  v4.24');
  console.log('  modules : ' + LIB_MODULES.join(', ') + '  (conductor-lib @ ' + LIB_DIR + ')');
  console.log('  app   : http://localhost:' + PORT + '/  (Play & Design' + (HAS_APP ? '' : ' — app.html missing, serving control.html') + ')');
  console.log('  app   : ' + APP_DIR);
  console.log('  media : ' + MEDIA_DIR + '  (' + Object.keys(landIndex).length + ' scenes)');
  console.log('  control : http://localhost:' + PORT + '/control.html?ws=auto');
  console.log('  a frame : http://localhost:' + PORT + '/frame.html?frame=L1&ws=auto');
  console.log('  MQTT    : ' + (process.env.MQTT_URL || 'disabled'));
  console.log('  HA      : ' + (haOn() ? HA_URL : 'disabled — set HA_URL + HA_TOKEN'));
  console.log('  thumbs  : ' + (thumbLib ? thumbKind + ' (generating in background)' : 'disabled — run: npm install sharp'));
  console.log('====================================================');
  setTimeout(warmThumbs, 800);   // pre-generate picker thumbnails in the background
}); 
/* ==== MODE MUSIC FOLLOW (appended) =======================================
   Mode/game change -> play the MA playlist named in profile.music.
   Disable: settings.music.modeFollow = false.   Added 2026-07-11. */
let mmLastGame = null;
function modeMusicFollow() {
  const mu = settings.music || {};
  if (mu.modeFollow === false || !mu.url || !mu.player) return;
  const g = state.game;
  if (!g || g.charAt(0) === '_') return;
  if (g === mmLastGame) return;
  const first = (mmLastGame === null);
  mmLastGame = g;
  if (first) return;
  const label = (((profiles[g] || {}).music) || '').trim();
  if (!label || label === '—') return;
  maCall('music/playlists/library_items', { limit: 500 }, (e, r) => {
    if (e) return;
    const items = maItems(r) || [];
    const pl = items.find((x) => x && x.name === label)
            || items.find((x) => x && (x.name || '').toLowerCase() === label.toLowerCase());
    if (!pl) { logDiary('music', 'mode music: no MA playlist named "' + label + '"'); return; }
  maCall('player_queues/shuffle', { queue_id: mu.player, shuffle_enabled: true }, function () {}); // rs-music-shuffle v1
    maCall('player_queues/play_media', { queue_id: mu.player, media: pl.uri, option: 'replace' }, (e2) => {
      if (e2) return;
      if (!musicHold) { musicHold = true; bump('music:on'); }
      setTimeout(musicPollNow, 1500);
      logDiary('music', '▶ ' + label + ' (mode music)');
      maCall('player_queues/repeat', { queue_id: mu.player, repeat_mode: 'all' }, (eR) => { logDiary('music', eR ? ('repeat-all failed: ' + eR.message) : 'repeat: all (mode music loops)'); }); // rs-music-repeat v1
    });
  });
}
const mmOrigDirector = directorOnModeChange;
directorOnModeChange = function () { try { modeMusicFollow(); } catch (e) {} return mmOrigDirector(); };
/* ==== end MODE MUSIC FOLLOW ============================================== */

/* ================= ROOMSCAPE ROOMS PHASES 1-2.3 (removed 2026-08-06) =====
   Phase 1b cleanup: the stacked phase listeners (1, 2, 2.1, 2.2, 2.3) were
   dead at runtime — each was removed by its successor, and PHASE 2.4 below
   strips every 'request' listener above the main handler before installing
   the consolidated rooms listener. Their helpers were IIFE-scoped (nothing
   later referenced them) and their module-level side effects (HA_DOMAINS
   script/cover, state.rooms init) are repeated in 2.4. Originals in git
   history before this commit. */

/* ==== ASSET UPLOAD (appended 2026-07-11, rooms-compatible) =================
   POST /api/upload {name, b64} -> saves inside MEDIA_DIR (whitelisted
   extensions, one optional subfolder), then rescans media.
   PATTERN: prependListener + res-neuter, same convention as the ROOMS
   phase patches. LISTENER ORDER after this patch:
   [upload, 2.2-music, 2.1-rooms, main]  <-- phase-3 authors take note:
   ls[0] is NO LONGER the 2.2 music listener! Match by behaviour, not index. */
(function () {
  server.prependListener('request', function (req, res) {
    let u2 = null; try { u2 = new URL(req.url, 'http://x'); } catch (e) {}
    if (!(u2 && u2.pathname === '/api/upload' && req.method === 'POST')) return;   // untouched fall-through
    const realWriteHead = res.writeHead.bind(res), realEnd = res.end.bind(res);
    res.writeHead = function () { return res; };
    res.write = function () { return true; };
    res.end = function () {};
    res.setHeader = function () {};
    function send(code, obj) {
      try { realWriteHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); realEnd(JSON.stringify(obj)); } catch (e) {}
    }
    readBody(req, function (b) {
      if (!b || !b.name || !b.b64) return send(400, { ok: false, error: 'need {name, b64}' });
      const name = String(b.name).replace(/\\/g, '/');
      if (name.indexOf('..') >= 0 || !/^[\w\- ]+(\/[\w\- .()]+)?\.(jpe?g|png|webp|gif|mp4|txt|json|pdf|md)$/i.test(name)) {
        return send(400, { ok: false, error: 'bad name' });
      }
      const abs = mediaSafe(name);
      if (!abs) return send(400, { ok: false, error: 'outside media dir' });
      try {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, Buffer.from(b.b64, 'base64'));
        // v2.62: the deep rescan runs async so the upload response (and any live
        // video streams) never wait on a full recursive share walk.
        if (typeof global.__rsRescanAsync === 'function') global.__rsRescanAsync(); else scanMedia();
        return send(200, { ok: true, saved: name, bytes: fs.statSync(abs).size });
      } catch (e) { return send(500, { ok: false, error: String(e).slice(0, 120) }); }
    });
  });
})();
/* ==== end ASSET UPLOAD ==================================================== */

/* ==== RULES & SCORES (appended 2026-07-11, rooms-compatible) ===============
   Adds, via ONE prepended listener (house prepend+neuter pattern):
   - GET/POST /api/scores            scores.json {players:[],results:[]} in APP_DIR
   - POST /api/scores/result         append one result {game,players:[{name,won,score?}],notes?}
   - GET  /api/rules[?game=key]      rules-data.json (APP_DIR)
   - GET  /api/rules/state           {show,game,videoId,name,ts}
   - POST /api/rules/show            {game} to show on wall, {off:true} to hide
   - POST /api/upload-app            {name,b64,append?} whitelist write into APP_DIR (backs up)
   - GET  /scores, /rs-extras.js     served no-store from APP_DIR
   - GET  / and /app.html            served with <script src="/rs-extras.js"> injected
   LISTENER ORDER now: [rules-scores, upload, 2.2-music, 2.1-rooms, main].
   Phase-3 rooms work: match listeners by behaviour, not index. */
(function () {
  const SCORES_FILE = path.join(APP_DIR, 'scores.json');
  const RULES_FILE = path.join(APP_DIR, 'rules-data.json');
  const APP_WHITELIST = /^(frame\.html|rs-extras\.js|scores\.html|rules-data\.json)$/;
  let rulesState = { show: false, game: null, videoId: null, name: null, ts: 0 };
  function readScores() {
    try { return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); }
    catch (e) { return { players: [], results: [] }; }
  }
  function writeScores(d) { fs.writeFileSync(SCORES_FILE, JSON.stringify(d, null, 2)); }
  function readRules() {
    try { return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')); } catch (e) { return { games: {} }; }
  }
  server.prependListener('request', function (req, res) {
    let u2 = null; try { u2 = new URL(req.url, 'http://x'); } catch (e) { return; }
    const p2 = u2 ? u2.pathname : '';
    const mine = (p2 === '/api/scores' || p2 === '/api/scores/result' || p2 === '/api/rules' ||
                  p2 === '/api/rules/state' || p2 === '/api/rules/show' || p2 === '/api/upload-app' ||
                  p2 === '/scores' || p2 === '/scores.html' || p2 === '/rs-extras.js' ||
                  ((p2 === '/' || p2 === '/app.html') && req.method === 'GET'));
    if (!mine) return;
    const realWriteHead = res.writeHead.bind(res), realEnd = res.end.bind(res);
    res.writeHead = function () { return res; }; res.write = function () { return true; };
    res.end = function () {}; res.setHeader = function () {};
    function send(code, obj, type, noStore) {
      try {
        const hdr = { 'Content-Type': type || 'application/json', 'Access-Control-Allow-Origin': '*' };
        if (noStore) hdr['Cache-Control'] = 'no-store';
        realWriteHead(code, hdr);
        realEnd(typeof obj === 'string' || Buffer.isBuffer(obj) ? obj : JSON.stringify(obj));
      } catch (e) {}
    }
    /* ---- app.html with rs-extras injection (also '/') ---- */
    if (p2 === '/' || p2 === '/app.html') {
      try {
        let html = fs.readFileSync(path.join(APP_DIR, 'app.html'), 'utf8');
        if (html.indexOf('rs-extras.js') < 0) html = html.replace(/<\/body>/i, '<script src="/rs-extras.js"></script></body>');
        return send(200, html, 'text/html; charset=utf-8', true);
      } catch (e) { return send(500, { ok: false, error: 'app.html: ' + e.message }); }
    }
    if (p2 === '/scores' || p2 === '/scores.html') {
      try { return send(200, fs.readFileSync(path.join(APP_DIR, 'scores.html')), 'text/html; charset=utf-8', true); }
      catch (e) { return send(404, { ok: false, error: 'scores.html not uploaded yet' }); }
    }
    if (p2 === '/rs-extras.js') {
      try { return send(200, fs.readFileSync(path.join(APP_DIR, 'rs-extras.js')), 'application/javascript; charset=utf-8', true); }
      catch (e) { return send(404, 'console.warn("rs-extras.js not uploaded yet");', 'application/javascript', true); }
    }
    /* ---- rules ---- */
    if (p2 === '/api/rules' && req.method === 'GET') {
      const d = readRules(); const g = u2.searchParams.get('game');
      if (g) return send(200, { ok: true, game: g, rules: (d.games && d.games[g]) || null });
      return send(200, { ok: true, count: Object.keys(d.games || {}).length, games: d.games || {} });
    }
    if (p2 === '/api/rules/state') return send(200, rulesState);
    if (p2 === '/api/rules/show' && req.method === 'POST') {
      return readBody(req, function (b) {
        if (b && b.off) { rulesState = { show: false, game: null, videoId: null, name: null, ts: Date.now() };
          try { logDiary('rules', 'rules hidden from the wall'); } catch (e) {}
          return send(200, rulesState); }
        if (!b || !b.game) return send(400, { ok: false, error: 'need {game} or {off:true}' });
        const d = readRules(); const entry = (d.games && d.games[b.game]) || {};
        rulesState = { show: true, game: b.game, videoId: entry.videoId || null, name: entry.name || b.game, ts: Date.now() };
        try { logDiary('rules', '📖 rules on the wall: ' + (entry.name || b.game)); } catch (e) {}
        return send(200, rulesState);
      });
    }
    /* ---- scores ---- */
    if (p2 === '/api/scores' && req.method === 'GET') return send(200, readScores());
    if (p2 === '/api/scores' && req.method === 'POST') {
      return readBody(req, function (b) {
        if (!b || !Array.isArray(b.players) || !Array.isArray(b.results)) return send(400, { ok: false, error: 'need {players:[],results:[]}' });
        try { writeScores({ players: b.players, results: b.results }); return send(200, { ok: true, players: b.players.length, results: b.results.length }); }
        catch (e) { return send(500, { ok: false, error: String(e).slice(0, 120) }); }
      });
    }
    if (p2 === '/api/scores/result' && req.method === 'POST') {
      return readBody(req, function (b) {
        if (!b || !b.game || !Array.isArray(b.players) || !b.players.length) return send(400, { ok: false, error: 'need {game, players:[{name,won}]}' });
        try {
          const d = readScores();
          const rec = { id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
            game: String(b.game), name: b.name || String(b.game), dateISO: b.dateISO || new Date().toISOString(),
            players: b.players.map(function (x) { const o = { name: String(x.name), won: !!x.won }; if (x.score != null && x.score !== '') o.score = Number(x.score); return o; }) };
          if (b.notes) rec.notes = String(b.notes).slice(0, 400);
          rec.players.forEach(function (x) { if (!d.players.some(function (pl) { return pl.name === x.name; })) d.players.push({ name: x.name }); });
          d.results.push(rec); writeScores(d);
          try { logDiary('scores', '🏆 ' + rec.players.filter(function (x) { return x.won; }).map(function (x) { return x.name; }).join(' & ') + ' won ' + rec.name); } catch (e) {}
          return send(200, { ok: true, id: rec.id, results: d.results.length });
        } catch (e) { return send(500, { ok: false, error: String(e).slice(0, 120) }); }
      });
    }
    /* ---- app-file upload (whitelisted, backs up) ---- */
    if (p2 === '/api/upload-app' && req.method === 'POST') {
      return readBody(req, function (b) {
        if (!b || !b.name || !b.b64) return send(400, { ok: false, error: 'need {name, b64}' });
        if (!APP_WHITELIST.test(String(b.name))) return send(400, { ok: false, error: 'name not whitelisted' });
        const abs = path.join(APP_DIR, String(b.name));
        try {
          if (!b.append && fs.existsSync(abs)) {
            try { fs.mkdirSync(path.join(APP_DIR, '_backups'), { recursive: true });
              fs.copyFileSync(abs, path.join(APP_DIR, '_backups', b.name + '.' + Date.now() + '.bak')); } catch (e) {}
          }
          const buf = Buffer.from(b.b64, 'base64');
          if (b.append) fs.appendFileSync(abs, buf); else fs.writeFileSync(abs, buf);
          return send(200, { ok: true, saved: b.name, bytes: fs.statSync(abs).size, append: !!b.append });
        } catch (e) { return send(500, { ok: false, error: String(e).slice(0, 120) }); }
      });
    }
    return send(404, { ok: false, error: 'unhandled rs path' });
  });
})();
/* ==== end RULES & SCORES ================================================== */

/* ================= ROOMSCAPE ROOMS PHASE 2.4 — QA FIXES (2026-07-11) =======
   Fixes from the full QA pass:
   1. CUE CARDS STUCK (the "wall froze" bug): switching game/mode or PANIC
      never cleared promptState — the cue card stayed painted over the new
      mode until a Conductor restart. applyProfile is now wrapped to clear it.
   2. MUSIC UNRELIABLE: two Sonos players are BOTH named "Playroom" in MA;
      name-matching picked whichever the server listed first. Resolution now
      prefers settings.rooms[].ma.playerId (exact player_id), name as fallback.
   3. Consolidates ALL rooms routes into ONE listener (removes the stacked
      2.1/2.3 listeners) — /api/rooms, mode/off, music, /api/ma/players.     */
;(function(){
  try{
    function log5(m){ try{ console.log('[rooms2.4] ' + m); }catch(e){} }

    /* ---- fix 1: cue cards end when the room changes ---- */
    try{
      var __origApply = applyProfile;
      applyProfile = function(id){
        try{ if (promptState){ promptState = null; clearTimeout(promptTimer); log5('prompter cleared by room change → ' + id); } }catch(e){}
        return __origApply.apply(this, arguments);
      };
      log5('applyProfile wrapped: prompter clears on game/mode/panic');
    }catch(e){ log5('applyProfile wrap failed: ' + (e && e.message)); }

    /* ---- fix 3: strip all previous rooms listeners, leave only the core ---- */
    try{
      var ls = server.listeners('request');
      while (server.listeners('request').length > 1){
        server.removeListener('request', server.listeners('request')[0]);
      }
      log5('listener stack consolidated (' + ls.length + ' -> ' + server.listeners('request').length + ')');
    }catch(e){ log5('listener strip failed: ' + (e && e.message)); }

    HA_DOMAINS.script = 1; HA_DOMAINS.cover = 1;
    if (!state.rooms || typeof state.rooms !== 'object') state.rooms = {};
    var FALLBACK_ROOMS = [    // single surviving copy (was duplicated in phases 1/2/2.1)
      { id: 'dining', name: 'Dining Room', icon: '🍽' },
      { id: 'playroom', name: 'Playroom', icon: '🎮' } ];
    function roomsCfg(){
      var r = settings && settings.rooms;
      return (Array.isArray(r) && r.length) ? r : FALLBACK_ROOMS;
    }
    function items(r){ return Array.isArray(r) ? r : ((r && r.items) || []); }
    function img(x){ try{ return (typeof maImage === 'function' ? (maImage(x) || '') : ''); }catch(e){ return ''; } }

    /* ---- fix 2: player resolution — playerId first, then exact name, then fuzzy ---- */
    function resolvePlayer(room, cb){
      var pid = room && room.ma && room.ma.playerId;
      var want = room && room.ma && room.ma.player;
      if (!pid && !want) return cb(null, null);
      maCall('players/all', {}, function(e, r){
        if (e) return cb(e);
        var list = items(r).map(function(x){ return { id: x.player_id || x.queue_id || x.id,
          name: String(x.display_name || x.name || ''), volume: (x.volume_level != null ? x.volume_level : null),
          available: x.available !== false }; });
        var hit = null;
        if (pid) hit = list.find(function(x){ return x.id === pid; });
        if (!hit && want){
          var n = String(want).toLowerCase();
          hit = list.find(function(x){ return x.available && x.name.toLowerCase() === n; }) ||
                list.find(function(x){ return x.name.toLowerCase() === n; }) ||
                list.find(function(x){ return x.name.toLowerCase().indexOf(n) !== -1; });
          if (hit) log5('player for ' + room.id + ' resolved by NAME (' + hit.id + ') — pin ma.playerId to make this deterministic');
        }
        cb(null, hit || null);
      });
    }
    function roomMusicPlay(room, label){
      if (!label || label === '—') return;
      if (!((settings.music || {}).url)) return log5('music: MA url not set');
      resolvePlayer(room, function(e, pl){
        if (e || !pl) return log5('music: no MA player for ' + room.id + (e ? ' (' + e.message + ')' : ''));
        maCall('music/playlists/library_items', { limit: 500 }, function(e2, r2){
          if (e2) return log5('music: playlists failed: ' + e2.message);
          var lst = items(r2), n = String(label).toLowerCase();
          var pll = lst.find(function(x){ return String(x.name || '').toLowerCase() === n; }) ||
                    lst.find(function(x){ return String(x.name || '').toLowerCase().indexOf(n) !== -1; });
          if (!pll) return log5('music: playlist not found: ' + label);
          maCall('player_queues/play_media', { queue_id: pl.id, media: pll.uri || pll.name, option: 'replace' }, function(e3){
            log5(e3 ? ('music: play failed: ' + e3.message) : ('music: "' + pll.name + '" → ' + room.id + ' [' + pl.id + ']'));
          });
        });
      });
    }
    function roomMusicStop(room){
      resolvePlayer(room, function(e, pl){
        if (e || !pl) return;
        maCall('players/cmd/stop', { player_id: pl.id }, function(e2){
          if (e2) return maCall('player_queues/stop', { queue_id: pl.id }, function(){});
          log5('music: stopped ' + room.id);
        });
      });
    }
    function runHaActions(list, done){
      var i = 0, errs = [];
      (function step(){
        if (i >= list.length) return done(errs.length ? errs.join('; ') : null);
        var a = list[i++] || {};
        function go(){
          if (!a.action || a.action.indexOf('.') < 1){ if (a.action) errs.push('bad action: ' + a.action); return setTimeout(step, 0); }
          var dot = a.action.indexOf('.');
          var data = Object.assign({}, a.data || {});
          if (a.entity) data.entity_id = a.entity;
          haCall(a.action.slice(0, dot), a.action.slice(dot + 1), data, function(err, code){
            if (err) errs.push(a.action + ': ' + (err.message || err));
            else if (code && code >= 400) errs.push(a.action + ': HA ' + code);
            setTimeout(step, a.gapMs != null ? a.gapMs : 120);
          });
        }
        a.delayMs ? setTimeout(go, a.delayMs) : go();
      })();
    }
    function activate(pr, cb){
      if (Array.isArray(pr.haActions) && pr.haActions.length){
        if (!haOn()) return cb('HA not configured');
        return runHaActions(pr.haActions, function(warn){ cb(null, warn); });
      }
      if (pr.script){
        if (!haOn()) return cb('HA not configured');
        var called = false;
        function once(e, w){ if (!called){ called = true; cb(e, w); } }
        haCall('script', 'turn_on', { entity_id: pr.script }, function(err, code){
          if (err) return once(null, 'script: ' + String(err.message || err));
          if (code && code >= 400) return once('HA returned ' + code);
          once(null);
        });
        setTimeout(function(){ once(null, 'script: HA slow to confirm'); }, 10000);
        return;
      }
      cb(null);
    }

    server.prependListener('request', function(req, res){
      var p; try{ p = new URL(req.url, 'http://localhost').pathname; }catch(e){ return; }
      var mm = p.match(/^\/api\/room\/([^\/]+)\/music(?:\/([a-z_]+))?$/);
      var isRooms = (p === '/api/rooms'), isPlayers = (p === '/api/ma/players'), isRoom = p.indexOf('/api/room/') === 0;
      if (!isRooms && !isPlayers && !isRoom) return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function(){ return res; };
      res.write = res.end = function(){ return true; };
      function out(code, obj){
        try{ W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); }catch(e){}
      }
      function body24(cb){
        var b = ''; req.on('data', function(c){ b += c; if (b.length > 65536) req.destroy(); });
        req.on('end', function(){ var j = {}; try{ j = JSON.parse(b || '{}'); }catch(e){} cb(j); });
      }
      try{
        if (isPlayers){
          return maCall('players/all', {}, function(e, r){
            if (e) return out(502, { ok: false, error: e.message });
            out(200, { ok: true, players: items(r).map(function(x){ return { id: x.player_id || x.id, name: x.display_name || x.name || '', available: x.available !== false }; }) });
          });
        }
        if (isRooms){
          var modes = {};
          Object.keys(profiles).forEach(function(k){
            var pr = profiles[k];
            if (pr && pr.room){
              (modes[pr.room] = modes[pr.room] || []).push({
                id: k, name: pr.name || k, icon: pr.icon || '', accent: pr.accent || '',
                category: pr.category || '', isOff: !!pr.isOff, order: pr.order || 0,
                music: pr.music || '', native: !!(pr.haActions && pr.haActions.length),
                image: pr.image || '', variantOf: pr.variantOf || '', variantLabel: pr.variantLabel || ''
              });
            }
          });
          Object.keys(modes).forEach(function(r){
            modes[r].sort(function(a,b){ return (a.order - b.order) || String(a.name).localeCompare(String(b.name)); });
          });
          return out(200, { ok: true, rooms: roomsCfg(), modes: modes, state: state.rooms || {} });
        }
        var seg = p.split('/');
        var roomId = decodeURIComponent(seg[3] || '');
        var room = roomsCfg().find(function(r){ return r.id === roomId; });
        if (!room) return out(404, { ok: false, error: 'unknown room: ' + roomId });
        if (mm){
          var sub = mm[2] || '';
          if (!(room.ma && (room.ma.player || room.ma.playerId))) return out(200, { ok: true, playing: false, configured: false });
          return resolvePlayer(room, function(e, pl){
            if (e) return out(502, { ok: false, error: e.message });
            if (!pl) return out(200, { ok: true, playing: false, configured: false });
            if (!sub){
              if (req.method !== 'GET') return out(405, { ok: false, error: 'GET only' });
              return maCall('player_queues/all', {}, function(e2, r2){
                if (e2) return out(502, { ok: false, error: e2.message });
                var q = items(r2).find(function(x){ return x && (x.queue_id === pl.id || x.player_id === pl.id); });
                var st = q ? String(q.state || '').toLowerCase() : '';
                var cur = q && (q.current_item || q.current_media) || null;
                var md = cur && (cur.media_item || cur) || null;
                out(200, { ok: true, configured: true, playing: st === 'playing', paused: st === 'paused',
                  title: (md && md.name) || '', artist: (md && md.artists && md.artists[0] && md.artists[0].name) || '',
                  image: md ? img(md) : '', volume: pl.volume });
              });
            }
            if (req.method !== 'POST') return out(405, { ok: false, error: 'POST only' });
            if (sub === 'play'){
              return body24(function(b){
                var want = b.uri || b.name;
                if (!want) return out(400, { ok: false, error: 'need uri or name' });
                function go(media){
                  maCall('player_queues/play_media', { queue_id: pl.id, media: media, option: 'replace' }, function(e3){
                    if (e3) return out(502, { ok: false, error: e3.message });
                    out(200, { ok: true });
                  });
                }
                if (b.uri) return go(b.uri);
                maCall('music/playlists/library_items', { limit: 500 }, function(e4, r4){
                  if (e4) return out(502, { ok: false, error: e4.message });
                  var n = String(b.name).toLowerCase();
                  var hit = items(r4).find(function(x){ return String(x.name || '').toLowerCase() === n; }) ||
                            items(r4).find(function(x){ return String(x.name || '').toLowerCase().indexOf(n) !== -1; });
                  if (!hit) return out(404, { ok: false, error: 'playlist not found: ' + b.name });
                  go(hit.uri || hit.name);
                });
              });
            }
            if (sub === 'volume'){
              return body24(function(b){
                var v = Math.max(0, Math.min(100, Math.round(Number(b.volume))));
                if (isNaN(v)) return out(400, { ok: false, error: 'need volume 0-100' });
                maCall('players/cmd/volume_set', { player_id: pl.id, volume_level: v }, function(e5){
                  if (e5) return out(502, { ok: false, error: e5.message });
                  out(200, { ok: true, volume: v });
                });
              });
            }
            var cmds = { pause: 'players/cmd/play_pause', next: 'players/cmd/next', stop: 'players/cmd/stop' };
            if (!cmds[sub]) return out(404, { ok: false, error: 'unknown music command: ' + sub });
            maCall(cmds[sub], { player_id: pl.id }, function(e6){
              if (e6) return out(502, { ok: false, error: e6.message });
              out(200, { ok: true });
            });
          });
        }
        var verb = seg[4] || '', modeId = decodeURIComponent(seg[5] || '');
        if (req.method !== 'POST') return out(405, { ok: false, error: 'POST only' });
        function setLive(mid){
          if (mid) state.rooms[roomId] = { modeId: mid, since: new Date().toISOString() };
          else delete state.rooms[roomId];
          try{ persist(); }catch(e){}
          try{ broadcastState(); }catch(e){}
        }
        if (verb === 'mode' && modeId){
          var pr = profiles[modeId];
          if (!pr || pr.room !== roomId) return out(404, { ok: false, error: 'unknown mode ' + modeId + ' for room ' + roomId });
          return activate(pr, function(err, warn){
            if (err) return out(502, { ok: false, error: err });
            setLive(pr.isOff ? null : modeId);
            if (pr.isOff) roomMusicStop(room);
            else if (pr.music) roomMusicPlay(room, pr.music);
            if (warn) log5('mode ' + modeId + ' warnings: ' + warn);
            out(200, { ok: true, room: roomId, mode: pr.isOff ? null : modeId, warnings: warn || undefined });
          });
        }
        if (verb === 'off'){
          var offKey = Object.keys(profiles).find(function(k){ return profiles[k] && profiles[k].room === roomId && profiles[k].isOff; });
          var offPr = offKey ? profiles[offKey] : {};
          return activate(offPr, function(err, warn){
            setLive(null);
            roomMusicStop(room);
            if (err || warn) log5('off ' + roomId + ' issues: ' + (err || warn));
            out(200, { ok: true, room: roomId, mode: null, warnings: (err || warn) || undefined });
          });
        }
        return out(404, { ok: false, error: 'unknown rooms endpoint' });
      }catch(e){ return out(500, { ok: false, error: String(e && e.message || e) }); }
    });
    log5('phase-2.4 active: consolidated rooms listener + playerId music + prompter-clear');
  }catch(e){ console.error('[rooms2.4] patch failed to initialise:', e && e.message); }
})();

/* ================= ROOMSCAPE ROOMS PHASE 2.5 — TV WAKE FIX (2026-07-13) ======
   Samsung Frame TVs (dining wall) verified live 2026-07-13:
     - media_player.turn_on   = NO-OP (no Wake-on-LAN)
     - media_player.turn_off  = OFF ONLY (cannot wake a sleeping TV)
     - media_player.toggle    = the ONLY real power flip (works both directions)
   The conductor's haApplyRoom woke TVs with turn_on (state.live) -> did nothing,
   so launching a mode never woke the wall. Fix: wake via state-aware toggle
   (flip only the TVs that are actually asleep); sleep still uses turn_off
   (off-only = safe + idempotent). Manual Screens/Displays/Focus buttons are
   fixed in app.js (APP QA PATCH B, fetch shim).                              */
;(function(){
  try{
    // v2.6 (2026-07-15) R2 FIX: the wake path used media_player.toggle on every
    // TV that wasn't reporting exactly 'on'. Samsung Frame entities flap through
    // idle / playing / unavailable while genuinely powered ON, so a live TV (R2
    // in practice) got toggled OFF whenever a wake fired — e.g. Music ▶ ->
    // bump('music:on') -> haApplyRoom -> tvSetPower(_, true). Confirmed live via
    // /api/log ("[ha2.5] ... wake(toggle)" firing on every Play). Fix: only TVs
    // in an unambiguous power-OFF state are 'asleep' and eligible for the wake
    // toggle; on / idle / playing / paused / unavailable are left untouched.
    // Every scan is logged so /api/log shows the exact per-TV decision.
    var TV_ASLEEP = { off: 1, standby: 1 };   // add 'unavailable' ONLY if your powered-off Frames report unavailable (they report 'off' here)
    function tvSetPower(entids, wantOn, cb){
      cb = cb || function(){};
      entids = (entids || []).filter(Boolean);
      if (!entids.length) return cb(null);
      haFetch('GET', '/api/states', null, function(e, code, all){
        var st = {};
        if (Array.isArray(all)) all.forEach(function(s){ st[s.entity_id] = s.state; });
        var flip = entids.filter(function(en){
          var s = st[en];
          return wantOn ? (TV_ASLEEP[s] === 1)                                   // wake: only truly-off TVs get toggled
                        : (!(TV_ASLEEP[s] === 1) && s !== 'unavailable' && s !== 'unknown'); // sleep: only on-ish TVs
        });
        try {
          console.log('[ha2.6] tv ' + (wantOn ? 'wake' : 'sleep') + ' scan: ' +
            entids.map(function(en){ return en.split('.').pop() + '=' + (st[en] || '?'); }).join(' ') +
            ' -> flip:' + (flip.map(function(en){ return en.split('.').pop(); }).join(',') || 'none'));
        } catch (_){}
        if (!flip.length) return cb(null);
        haCall('media_player', 'toggle', { entity_id: flip }, cb);
      });
    }
    if (typeof haApplyRoom !== 'function') { console.log('[rooms2.5] haApplyRoom not found — skipped'); return; }
    haApplyRoom = function(){
      if (!haOn()) return;
      var ha = haCfg();
      var zoneCfg = ((typeof effProfile === 'function' && effProfile(state.game)) || {}).lightZones || {};
      var sig = state.game + '|' + state.light + '|' + (state.live ? 1 : 0) + '|' + JSON.stringify(zoneCfg);
      if (sig === lastHaSig) return; lastHaSig = sig;
      var sc = ha.lightScenes[state.light];
      // v2.47 ZONES: base scene covers lights[] + every zone entity (so the two new
      // chandelier bulbs + both console lamps follow the mode), MINUS entities whose
      // zone has a per-mode override — those get their own payload (scene/effect/bright).
      var zoneEnts = []; Object.keys(ha.zones || {}).forEach(function(k){ zoneEnts = zoneEnts.concat(ha.zones[k] || []); });
      var overridden = {};
      Object.keys(zoneCfg).forEach(function(k){ var z = zoneCfg[k]; if (z && (z.scene || (z.effect && z.effect !== 'none') || z.brightness_pct != null)) (ha.zones[k] || []).forEach(function(en){ overridden[en] = 1; }); });
      var baseTargets = ha.lights.concat(zoneEnts).filter(function(en, i, a){ return en && a.indexOf(en) === i && !overridden[en]; });
      if (sc && baseTargets.length) haCall('light', 'turn_on', Object.assign({ entity_id: baseTargets }, sc), function(e){ if (e) console.log('[ha2.5] lights:', e.message); });
      Object.keys(ha.zones || {}).forEach(function(k){
        var z = zoneCfg[k], ents = (ha.zones || {})[k] || [], FL = global.__rsFlicker;
        if (!ents.length) return;
        if (!z || !overridden[ents[0]]) { if (FL) FL.stop(k); return; }   // zone follows base → kill any flicker loop
        var zsc = (z.scene && ha.lightScenes[z.scene]) || {};
        if (z.effect === 'flicker') {                                     // v2.48 custom flicker w/ intensity+speed
          var basePct = (z.brightness_pct != null && z.brightness_pct !== '') ? +z.brightness_pct : (zsc.brightness_pct != null ? zsc.brightness_pct : 25);
          var pay0 = Object.assign({ entity_id: ents }, zsc); pay0.brightness_pct = basePct; delete pay0.effect; if (pay0.transition == null) pay0.transition = 1.5;
          haCall('light', 'turn_on', pay0, function(){});
          if (FL) FL.start(k, ents, basePct, z.flickerInt, z.flickerSpeed, zsc.color_temp_kelvin || 2000);
          console.log('[ha2.7] zone ' + k + ' -> flicker(custom int:' + (z.flickerInt || 50) + ' spd:' + (z.flickerSpeed || 50) + ')');
          return;
        }
        if (FL) FL.stop(k);
        var pay = Object.assign({ entity_id: ents }, zsc);
        if (z.brightness_pct != null && z.brightness_pct !== '') pay.brightness_pct = +z.brightness_pct;
        if (z.effect && z.effect !== 'none') pay.effect = z.effect;
        if (pay.transition == null) pay.transition = 2;
        haCall('light', 'turn_on', pay, function(e){ if (e) console.log('[ha2.7-zone ' + k + ']:', e.message); });
        console.log('[ha2.7] zone ' + k + ' -> ' + (z.scene || 'base') + (z.effect && z.effect !== 'none' ? ' +' + z.effect : '') + (z.brightness_pct != null ? ' @' + z.brightness_pct + '%' : ''));
      });
      var tvIds = Object.values(ha.tvs || {}).filter(Boolean);
      // v2.38: non-live modes no longer force-sleep the wall. Previously ANY not-live
      // state (At rest / unknown-mode fallback / panic -> dining) sent turn_off to all
      // six TVs. Now a mode only sleeps the TVs if it explicitly opts in via the
      // Behaviour toggle (profile.tvSleep). Default: leave TV power alone.
      var pfSleep = !!((profiles[state.game] || {}).tvSleep);
      if (tvIds.length){
        if (state.live) tvSetPower(tvIds, true, function(e){ if (e) console.log('[ha2.5] tv wake:', e.message); });   // toggle only the sleeping ones
        else if (pfSleep) haCall('media_player', 'turn_off', { entity_id: tvIds }, function(e){ if (e) console.log('[ha2.5] tv sleep:', e.message); });   // off-only = safe
      }
      console.log('[ha2.5] room -> light:' + state.light + ' tvs:' + (state.live ? 'wake(toggle)' : (pfSleep ? 'sleep(opt-in)' : 'leave-alone')));
    };
    console.log('[rooms2.5] TV wake fix active: haApplyRoom now wakes via media_player.toggle');
  }catch(e){ console.error('[rooms2.5] patch failed:', e && e.message); }
})();

/* ================= ROOMSCAPE REVEAL REEL — CONDUCTOR (2026-07-13) =========
   Adds per-frame reveal "reels": profile.reveal.reels = [ [file,...] x6 ].
   Each frame can hold multiple clips; the frame picks a random one per fire.
   Back-compat: legacy profile.reveal.videos[6] (single per frame) still works.
   Implemented by wrapping broadcastState so every pushed state carries a
   resolved state.reveal.reels (and creates state.reveal for reel-only modes,
   which the base resolver would leave null since it only reads .videos).     */
;(function(){
  try{
    if (typeof broadcastState !== 'function') { console.log('[reveal-reel] broadcastState not found — skipped'); return; }
    function mediaUrl(v){ return v ? '/media/' + String(v).split('/').map(encodeURIComponent).join('/') : null; }
    var _broadcast = broadcastState;
    broadcastState = function(){
      try{
        var p = profiles[state.game];
        var rv = p && p.reveal;
        if (rv && Array.isArray(rv.reels)){
          var frames = state.frames || [];
          var reels = [];
          for (var i = 0; i < 6; i++){
            var arr = rv.reels[i];
            reels[i] = Array.isArray(arr) ? arr.map(mediaUrl).filter(Boolean) : [];
          }
          if (reels.some(function(a){ return a.length; })){
            if (!state.reveal) state.reveal = { videos: [null,null,null,null,null,null] };
            state.reveal.reels  = reels;
            state.reveal.trigger = (rv.trigger === 'random' ? 'random' : 'manual');
            state.reveal.everyS  = Math.max(8, +rv.everyS || 180);
            state.reveal.jitter  = (rv.jitter != null ? +rv.jitter : 0.5);
            state.reveal.fadeS   = (rv.fadeS  != null ? +rv.fadeS  : 0.6);
          }
        }
      }catch(e){ console.log('[reveal-reel] inject error:', e && e.message); }
      return _broadcast.apply(this, arguments);
    };
    console.log('[reveal-reel] conductor active: state.reveal.reels injected on broadcast');
  }catch(e){ console.error('[reveal-reel] conductor patch failed:', e && e.message); }
})();

/* ================= ROOMSCAPE DEEP MEDIA SCAN (2026-07-13) =================
   The media scanner (scanMedia) only indexed files in "Images & Videos/" and
   ONE subfolder level, so clips in nested folders like
   "Images & Videos/Sets/Board Games/Alien/" never appeared. This replaces the
   scan with a recursive walk (up to 6 levels), rebuilds the index immediately,
   and future /api/rescan calls use it too. /media serving already handles
   arbitrary depth (mediaSafe), so nested clips both list and play.            */
;(function(){
  try{
    if (typeof scanMedia !== 'function'){ console.log('[deepscan] scanMedia not found — skipped'); return; }
    var MAXDEPTH = 6;
    // v2.40: skip non-scene working folders. _backups/_to_delete are janitorial (backup
    // copies were shadowing real scenes — the Medieval duplicate). cropped/ and output/
    // stay indexed — modes may reference scenes living there.
    // v2.42: covers/ RESTORED to the scan — excluding it (v2.40) broke every mode whose
    // default scene is its box art (scene:"cover_<id>", ~dozens of board-game modes):
    // blank Play cards AND unresolvable wall scenes. covers ARE scenes here.
    var SCAN_SKIP = { '_backups': 1, '_to_delete': 1 };
    scanMedia = function(){
      landIndex = {}; var n = 0;
      function add(rel){ var k = keyOf(path.basename(rel)); (landIndex[k] = landIndex[k] || []).push(rel); n++; }
      function walk(dir, rel, depth){
        var ents;
        try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (var i = 0; i < ents.length; i++){
          var en = ents[i], name = en.name;
          if (name.charAt(0) === '.') continue;                 // skip .thumbs, dotfolders
          if (depth === 0 && SCAN_SKIP[name] === 1) continue;   // v2.40: top-level junk folders
          var childRel = rel ? rel + '/' + name : name;
          if (en.isFile()){ if (MEDIA_RE.test(name)) add(childRel); }
          else if (en.isDirectory() && depth < MAXDEPTH){ walk(path.join(dir, name), childRel, depth + 1); }
        }
      }
      try { walk(MEDIA_DIR, '', 0); } catch (e) { console.log('[deepscan] error', e && e.message); }
      console.log('[deepscan] recursive media scan: ' + n + ' files, ' + Object.keys(landIndex).length + ' scene keys');
    };
    scanMedia();   // rebuild the index now with the deeper walk
    console.log('[deepscan] active (depth ' + MAXDEPTH + ')');
  }catch(e){ console.error('[deepscan] patch failed:', e && e.message); }
})();

/* ================= ROOMSCAPE MEDIA FX STORE (2026-07-14) =================
   Two per-media-item settings maps, saved next to conductor.js and served to
   the app + kiosks (fx.js polls this; the app reads it live).
     imgAdjust : { "<image-url-path>": {bri,con,sat,hue,warm,exp,gam,vig,blur,sharp} }
                 per scene/overlay IMAGE colour grade, applied everywhere.
     overlayFx : { "<effect-file>": {opacity,fadeIn,fadeOut} }
                 per animated-effect CLIP opacity + fade envelope, everywhere.
     GET  /api/mediafx                          -> { ok, imgAdjust, overlayFx }
     POST /api/mediafx {imgAdjust?, overlayFx?}  -> merge (value null removes)
   Self-contained: own file store, own request listener for its one path. */
;(function(){
  try{
    var fs = require('fs'), path = require('path');
    var FILE = path.join(__dirname, 'mediafx.json');
    var DB = { imgAdjust:{}, overlayFx:{} };
    try{ if (fs.existsSync(FILE)){ var j = JSON.parse(fs.readFileSync(FILE,'utf8'))||{}; DB.imgAdjust=j.imgAdjust||{}; DB.overlayFx=j.overlayFx||{}; } }
    catch(e){ console.error('[mediafx] read failed:', e && e.message); }
    var wt=null;
    function persistFx(){ clearTimeout(wt); wt=setTimeout(function(){ try{ fs.writeFileSync(FILE, JSON.stringify(DB), 'utf8'); }catch(e){ console.error('[mediafx] write failed:', e && e.message); } }, 150); }
    function log(m){ try{ console.log('[mediafx] '+m); }catch(e){} }
    function readBody(req, cb){ var b='',big=false; req.on('data',function(c){ b+=c; if(b.length>4*1024*1024){big=true;req.destroy();} }); req.on('end',function(){ if(big)return cb('too large'); try{ cb(null, b?JSON.parse(b):{}); }catch(e){ cb('bad json'); } }); req.on('error',function(e){ cb(String(e&&e.message||e)); }); }
    function mergeMap(dst, src){ var n=0; if(src && typeof src==='object'){ Object.keys(src).forEach(function(k){ var v=src[k]; if(v==null){ if(k in dst){ delete dst[k]; n++; } } else if(typeof v==='object'){ dst[k]=v; n++; } }); } return n; }

    server.prependListener('request', function(req, res){
      var p; try{ p = new URL(req.url,'http://localhost').pathname; }catch(e){ return; }
      if (p !== '/api/mediafx') return;
      var W=res.writeHead.bind(res), E=res.end.bind(res);
      res.writeHead=res.setHeader=function(){ return res; }; res.write=res.end=function(){ return true; };
      function out(code,obj){ try{ W(code,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}); E(JSON.stringify(obj)); }catch(e){} }
      try{
        if (req.method==='GET') return out(200, { ok:true, imgAdjust:DB.imgAdjust, overlayFx:DB.overlayFx });
        if (req.method!=='POST') return out(405, { ok:false, error:'GET or POST only' });
        return readBody(req, function(err, body){
          if (err) return out(400, { ok:false, error:err });
          var n = mergeMap(DB.imgAdjust, body && body.imgAdjust) + mergeMap(DB.overlayFx, body && body.overlayFx);
          if (n) persistFx();
          out(200, { ok:true, saved:n });
        });
      }catch(e){ return out(500, { ok:false, error:String(e&&e.message||e) }); }
    });
    log('active: '+Object.keys(DB.imgAdjust).length+' image grades, '+Object.keys(DB.overlayFx).length+' effect envelopes ('+FILE+')');
  }catch(e){ console.error('[mediafx] patch failed to initialise:', e && e.message); }
})();

/* ================= ROOMSCAPE MODE POSTERS (2026-07-14) =================
   Auto-generated mode card thumbnails (a composite of each mode's left three
   frames, rendered in the browser and posted here). Stored as a small JSON
   map { modeId: dataURL } next to conductor.js, served back to the app so the
   Play/Design mode tiles show a real preview instead of a shared placeholder.
     GET  /api/modeposters            -> { ok, posters:{id:dataURL} }
     POST /api/modeposters {id,data}  -> merge+persist one; data:'' removes it
     POST /api/modeposters {bulk:{..}}-> merge many at once
   Self-contained: own file store, own request listener for its two paths only.
   Nothing else in the Conductor is touched (kiosks never receive these). */
;(function(){
  try{
    var fs = require('fs'), path = require('path');
    var FILE = path.join(__dirname, 'modeposters.json');
    var POSTERS = {};
    try{ if (fs.existsSync(FILE)) POSTERS = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; }
    catch(e){ console.error('[posters] read failed:', e && e.message); POSTERS = {}; }
    var writeTimer = null;
    function persistPosters(){
      clearTimeout(writeTimer);
      writeTimer = setTimeout(function(){
        try{ fs.writeFileSync(FILE, JSON.stringify(POSTERS), 'utf8'); }
        catch(e){ console.error('[posters] write failed:', e && e.message); }
      }, 150);
    }
    function log(m){ try{ console.log('[posters] ' + m); }catch(e){} }

    function readBody(req, cb){
      var b = ''; var big = false;
      req.on('data', function(c){ b += c; if (b.length > 24 * 1024 * 1024){ big = true; req.destroy(); } });
      req.on('end', function(){ if (big) return cb('too large'); try{ cb(null, b ? JSON.parse(b) : {}); }catch(e){ cb('bad json'); } });
      req.on('error', function(e){ cb(String(e && e.message || e)); });
    }

    server.prependListener('request', function(req, res){
      var p; try{ p = new URL(req.url, 'http://localhost').pathname; }catch(e){ return; }
      if (p !== '/api/modeposters') return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function(){ return res; };
      res.write = res.end = function(){ return true; };
      function out(code, obj){
        try{ W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); }catch(e){}
      }
      try{
        if (req.method === 'GET') return out(200, { ok: true, posters: POSTERS });
        if (req.method !== 'POST') return out(405, { ok: false, error: 'GET or POST only' });
        return readBody(req, function(err, body){
          if (err) return out(400, { ok: false, error: err });
          var n = 0;
          function set(id, data){
            id = String(id || '').trim(); if (!id) return;
            if (data === '' || data == null){ delete POSTERS[id]; n++; }
            else if (typeof data === 'string' && data.indexOf('data:image/') === 0){ POSTERS[id] = data; n++; }
          }
          if (body && body.bulk && typeof body.bulk === 'object'){ Object.keys(body.bulk).forEach(function(id){ set(id, body.bulk[id]); }); }
          else { set(body && body.id, body && body.data); }
          if (n) persistPosters();
          out(200, { ok: true, saved: n, count: Object.keys(POSTERS).length });
        });
      }catch(e){ return out(500, { ok: false, error: String(e && e.message || e) }); }
    });
    log('active: ' + Object.keys(POSTERS).length + ' stored (' + FILE + ')');
  }catch(e){ console.error('[posters] patch failed to initialise:', e && e.message); }
})();
/* ================= ROOMSCAPE RULES REVIVE (2026-07-15) =================
   RS-RULES-REVIVE
   The original "Rules & Scores" module (appended 2026-07-11) stopped serving:
   /api/rules, /api/rules/state and /api/rules/show all return "unknown
   endpoint" in the running Conductor, so the Rules Wall (side TVs show the
   rule panels, middle TVs the quickstart video) never appears.

   Rather than debug why that older listener no longer registers, this block
   re-serves those three endpoints from the SAME data file (rules-data.json),
   using the exact self-contained prepend+neuter pattern that the mode-posters
   / media-fx add-ons already use successfully in this Conductor. It owns only
   its three paths and touches nothing else.

   Endpoints (contract expected by frame.html's rules overlay):
     GET  /api/rules                 -> { ok, games:{...} }
     GET  /api/rules?game=<id>       -> { ok, rules:{ name, setup, turn, win, tips, videoId } }
     GET  /api/rules/state           -> { ok, show, game, videoId, name, ts }
     POST /api/rules/show {game}     -> show that game's rules on the wall
     POST /api/rules/show {off:true} -> hide
   Appended to conductor.js. */
;(function () {
  try {
    var fs = require('fs'), path = require('path');
    var BASE = (typeof APP_DIR !== 'undefined' && APP_DIR) || __dirname;
    var RULES_FILE = path.join(BASE, 'rules-data.json');
    var rulesState = { show: false, game: null, videoId: null, name: null, ts: 0 };
    function log(m) { try { console.log('[rules-revive] ' + m); } catch (e) {} }
    function readRules() {
      try { return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')) || { games: {} }; }
      catch (e) { return { games: {} }; }
    }
    function gamesOf(d) { return (d && (d.games || d.rules || d)) || {}; }
    function readBody(req, cb) {
      var b = '', big = false;
      req.on('data', function (c) { b += c; if (b.length > 4 * 1024 * 1024) { big = true; req.destroy(); } });
      req.on('end', function () { if (big) return cb('too large'); try { cb(null, b ? JSON.parse(b) : {}); } catch (e) { cb('bad json'); } });
      req.on('error', function (e) { cb(String((e && e.message) || e)); });
    }

    if (typeof server === 'undefined' || !server || !server.prependListener) {
      log('server not available — cannot revive'); return;
    }

    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var p = u.pathname;
      if (p !== '/api/rules' && p !== '/api/rules/state' && p !== '/api/rules/show') return;   // pass-through
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; };
      res.write = res.end = function () { return true; };
      function out(code, obj) {
        try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {}
      }
      try {
        if (p === '/api/rules/state') {
          return out(200, { ok: true, show: rulesState.show, game: rulesState.game, videoId: rulesState.videoId, name: rulesState.name, sections: rulesState.sections || null, ts: rulesState.ts });
        }
        if (p === '/api/rules' && req.method === 'GET') {
          var games = gamesOf(readRules());
          var gk = u.searchParams.get('game');
          if (gk) return out(200, { ok: true, rules: games[gk] || null });
          return out(200, { ok: true, games: games });
        }
        if (p === '/api/rules/show' && req.method === 'POST') {
          return readBody(req, function (err, body) {
            if (err) return out(400, { ok: false, error: err });
            if (body && body.off) { rulesState = { show: false, game: null, videoId: null, name: null, sections: null, ts: Date.now() }; log('hide'); return out(200, { ok: true, show: false }); }
            var g = body && body.game;
            if (!g) return out(400, { ok: false, error: 'need {game} or {off:true}' });
            var games = gamesOf(readRules());
            var rec = games[g];
            if (!rec) return out(404, { ok: false, error: 'no rules for "' + g + '"' });
            // v2.37: per-mode overrides from the Design "Rules & tutorial" card —
            // an optional videoId (link or bare id) and a sections map {setup,turn,win,tips}.
            function ytId(s) { s = String(s || '').trim(); var m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/); if (m) return m[1]; return /^[\w-]{6,}$/.test(s) ? s : (s || null); }
            var vidOver = (body && typeof body.videoId === 'string' && body.videoId.trim()) ? ytId(body.videoId) : null;
            var secs = (body && body.sections && typeof body.sections === 'object') ? body.sections : null;
            rulesState = { show: true, game: g, videoId: vidOver || rec.videoId || rec.video || rec.yt || null, name: rec.name || g, sections: secs, ts: Date.now() };
            log('show ' + g + (rulesState.videoId ? ' (+video)' : '') + (secs ? ' (+sections)' : ''));
            return out(200, { ok: true, show: true, game: g });
          });
        }
        return out(404, { ok: false, error: 'unknown rules route' });
      } catch (e) { out(500, { ok: false, error: String((e && e.message) || e) }); }
    });

    // one-time report so the Conductor console shows what it found
    try {
      var g0 = gamesOf(readRules());
      log('revived. rules-data.json ' + (fs.existsSync(RULES_FILE) ? ('has ' + Object.keys(g0).length + ' game(s): ' + Object.keys(g0).slice(0, 40).join(', ')) : 'NOT FOUND at ' + RULES_FILE));
    } catch (e) {}
  } catch (e) { try { console.error('[rules-revive] init failed:', e && e.message); } catch (_) {} }
})();
/* ================= ROOMSCAPE LOG BUFFER (2026-07-15) =================
   RS-LOG-BUFFER
   Captures the last ~500 console lines into memory and exposes them read-only at
   GET /api/log  (optionally ?q=ha to filter, ?n=200 to limit). This makes module
   init failures and the [ha] TV-power decisions visible without shell access —
   the thing that turned several bugs this month into multi-hour investigations.
   Non-invasive: wraps console.log/warn/error (still prints to the real console),
   registers one read-only route. Appended to conductor.js. */
;(function () {
  try {
    if (global.__rsLogBuf) { /* already installed */ }
    else {
      var RING = [];
      var CAP = 500;
      global.__rsLogBuf = RING;
      ['log', 'info', 'warn', 'error'].forEach(function (k) {
        var orig = console[k] ? console[k].bind(console) : function () {};
        console[k] = function () {
          try {
            var parts = [];
            for (var i = 0; i < arguments.length; i++) {
              var a = arguments[i];
              parts.push(typeof a === 'string' ? a : (function () { try { return JSON.stringify(a); } catch (e) { return String(a); } })());
            }
            RING.push({ t: Date.now(), k: k, m: parts.join(' ') });
            if (RING.length > CAP) RING.shift();
          } catch (e) {}
          return orig.apply(console, arguments);
        };
      });
      try { console.log('[logbuf] capturing console -> GET /api/log'); } catch (e) {}
    }

    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      if (u.pathname !== '/api/log') return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; };
      res.write = res.end = function () { return true; };
      try {
        var ring = global.__rsLogBuf || [];
        var q = (u.searchParams.get('q') || '').toLowerCase();
        var n = parseInt(u.searchParams.get('n') || '200', 10); if (!(n > 0)) n = 200;
        var out = ring;
        if (q) out = out.filter(function (r) { return (r.m || '').toLowerCase().indexOf(q) >= 0; });
        out = out.slice(-n);
        W(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
        E(JSON.stringify({ ok: true, count: out.length, total: ring.length, lines: out }));
      } catch (e) {
        try { W(500, { 'Content-Type': 'application/json' }); E(JSON.stringify({ ok: false, error: String((e && e.message) || e) })); } catch (_) {}
      }
    });
  } catch (e) { try { console.error('[logbuf] init failed:', e && e.message); } catch (_) {} }
})();

/* ================= ROOMSCAPE ROUTE DISPATCHER (v2.36, 2026-07-16) =================
   RS-ROUTE-DISPATCH — first slice of the modules+dispatcher refactor
   (RoomScape-Review.md §3.2/§3.4/§6). Replaces the per-feature prepend+neuter
   listeners with ONE dispatcher + a route table. Feature modules live in
   web/modules/*.js and export register(router); they call
   router.add(method, path, handler) and never touch res.writeHead/write/end —
   the dispatcher owns the neuter dance once, centrally, killing the ordering and
   double-response bugs that the append pattern kept causing.
   DEPLOY-SAFE: module loading is wrapped in try/catch, so a module that fails to
   copy to /app or throws at load is SKIPPED with a logged error, never crashing
   the Conductor. Existing bolt-ons are left in place this slice — the dispatcher
   only owns routes that modules register, and passes everything else through. */
;(function () {
  try {
    if (global.__rsRouter) return;                        // idempotent across reloads
    var fs = require('fs'), path = require('path');
    var routes = [];                                      // { method, path, fn }
    var router = {
      add: function (method, p, fn) { routes.push({ method: String(method || 'GET').toUpperCase(), path: p, fn: fn }); return router; },
      count: function () { return routes.length; }
    };
    router.json = function (real, code, obj) { real.json(code, obj); };
    router.readBody = function (req, cb) {                // shared helper for module POST handlers
      var b = ''; req.on('data', function (d) { b += d; if (b.length > 1e7) req.destroy(); });
      req.on('end', function () { var j = null; try { j = b ? JSON.parse(b) : {}; } catch (e) { j = null; } cb(j, b); });
    };
    global.__rsRouter = router;

    // Load feature modules from ./modules relative to the RUNNING file (__dirname = /app at runtime).
    var loaded = [], failed = [];
    var mdir = path.join(__dirname, 'modules');
    try {
      if (fs.existsSync(mdir)) {
        fs.readdirSync(mdir).filter(function (f) { return /\.js$/.test(f); }).sort().forEach(function (f) {
          try {
            var m = require(path.join(mdir, f));
            if (m && typeof m.register === 'function') { m.register(router); loaded.push(f); }
            else { failed.push(f + ':no-register'); }
          } catch (e) { failed.push(f + ':' + (e && e.message)); console.error('[dispatch] module load failed: ' + f + ' -> ' + (e && e.message)); }
        });
      } else { console.log('[dispatch] no modules/ dir at ' + mdir + ' (external modules not deployed here)'); }
    } catch (e) { console.error('[dispatch] modules scan failed: ' + (e && e.message)); }

    if (typeof server === 'undefined' || !server || !server.prependListener) { console.log('[dispatch] server not found — dispatcher inactive'); return; }
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var m = (req.method || 'GET').toUpperCase(), hit = null;
      for (var i = 0; i < routes.length; i++) {
        if (routes[i].path === u.pathname && (routes[i].method === m || routes[i].method === 'ALL')) { hit = routes[i]; break; }
      }
      if (!hit) return;                                   // not ours — pass through to the other listeners/main handler
      var W = res.writeHead.bind(res), E = res.end.bind(res), SH = res.setHeader.bind(res);
      res.writeHead = res.setHeader = function () { return res; };   // neuter (once, here) so nothing double-responds
      res.write = res.end = function () { return true; };
      var real = {
        writeHead: W, end: E, setHeader: SH,
        json: function (code, obj) { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); }
      };
      try { hit.fn(req, res, u, real); }
      catch (e) { try { real.json(500, { ok: false, error: String((e && e.message) || e) }); } catch (_) {} console.error('[dispatch] handler error ' + u.pathname + ': ' + (e && e.message)); }
    });
    console.log('[dispatch] route table active: ' + routes.length + ' route(s); modules loaded:[' + loaded.join(',') + '] failed:[' + failed.join(',') + ']');
  } catch (e) { try { console.error('[dispatch] init failed:', e && e.message); } catch (_) {} }
})();

/* ================= ROOMSCAPE SCENE DIMS (v2.41, 2026-07-16) =================
   RS-SCENE-DIMS — image orientation for the picker's portrait/landscape filter.
   Probes each scene key's representative file (landIndex[k][0], images only) with
   sharp's metadata() (header read — no decode), caches to scenedims.json so a boot
   only probes NEW files, and republishes into global.__rsDims which /api/scenes
   reads at request time to emit ori:'p'|'l'|'s' (null = unknown / video).
   Re-probes after every rescan by wrapping the current scanMedia. */
;(function () {
  try {
    var fs = require('fs'), path = require('path');
    var sharp = null; try { sharp = require('sharp'); } catch (e) {}
    if (!sharp) { console.log('[dims] sharp unavailable — orientation filter disabled'); return; }
    var FILE = path.join(__dirname, 'scenedims.json');
    var DIMS = {};
    try { if (fs.existsSync(FILE)) DIMS = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (e) { DIMS = {}; }
    global.__rsDims = DIMS;
    var wt = null;
    function save() { clearTimeout(wt); wt = setTimeout(function () { try { fs.writeFileSync(FILE, JSON.stringify(DIMS), 'utf8'); } catch (e) {} }, 500); }
    var running = false;
    function probeAll() {
      if (running) return; running = true;
      // v2.43: probe EVERY image file (not just each key's representative) so variant
      // groups can be checked for mixed resolutions and low-res members skipped at pick.
      var reps = [];
      try { Object.keys(landIndex).forEach(function (k) { landIndex[k].forEach(function (r) { if (r && !VID_RE.test(r) && !DIMS[r]) reps.push(r); }); }); } catch (e) {}
      if (!reps.length) { running = false; reportMixed(); return; }
      console.log('[dims] probing ' + reps.length + ' new image(s) for orientation/resolution');
      var i = 0, done = 0, CONC = 4;
      function next() {
        if (i >= reps.length) { if (done >= reps.length) { running = false; save(); console.log('[dims] probe complete (' + Object.keys(DIMS).length + ' cached)'); reportMixed(); } return; }
        var rel = reps[i++];
        sharp(path.join(MEDIA_DIR, rel)).metadata().then(function (m) {
          if (m && m.width && m.height) { DIMS[rel] = { w: m.width, h: m.height }; if (done % 100 === 0) save(); }
        }).catch(function () { DIMS[rel] = { w: 0, h: 0 }; }).then(function () { done++; next(); });
      }
      for (var c = 0; c < CONC; c++) next();
    }
    // v2.43: log any variant group whose members differ wildly in resolution — these are
    // the "mode occasionally loads a very low-res image" culprits (random pick landed on
    // a small file). Read via GET /api/log?q=mixed-res
    function reportMixed() {
      try {
        var found = 0, MAXLOG = 15;   // v2.48: cap the report — 590 lines was flooding the whole /api/log ring buffer at boot
        Object.keys(landIndex).forEach(function (k) {
          var imgs = landIndex[k].filter(function (r) { return !VID_RE.test(r) && DIMS[r] && DIMS[r].w; });
          if (imgs.length < 2) return;
          var mx = 0; imgs.forEach(function (r) { var a = DIMS[r].w * DIMS[r].h; if (a > mx) mx = a; });
          var lo = imgs.filter(function (r) { return DIMS[r].w * DIMS[r].h < mx * 0.5; });
          if (lo.length) { found++; if (found <= MAXLOG) console.log('[dims] mixed-res group "' + k + '": best ' + Math.round(mx / 1e6 * 10) / 10 + 'MP, low: ' + lo.map(function (r) { return r + ' (' + DIMS[r].w + 'x' + DIMS[r].h + ')'; }).join(', ')); }
        });
        console.log('[dims] mixed-res groups: ' + found + (found > MAXLOG ? ' (first ' + MAXLOG + ' logged)' : '') + (found ? ' — low members are SKIPPED by pickScene' : ''));
      } catch (e) {}
    }
    // v2.43: quality-aware pick — never randomly serve a variant under half the group's
    // best pixel area. Unknown dims (videos / unprobed) always pass.
    if (typeof pickScene === 'function') {
      pickScene = function (sceneKey) {
        var list = sceneFiles(sceneKey); if (!list) return null;
        if (list.length > 1) {
          var mx = 0;
          list.forEach(function (r) { var d = DIMS[r]; if (d && d.w) { var a = d.w * d.h; if (a > mx) mx = a; } });
          if (mx > 0) {
            var ok = list.filter(function (r) { var d = DIMS[r]; return !(d && d.w) || (d.w * d.h >= mx * 0.5); });
            if (ok.length) list = ok;
          }
        }
        return '/media/' + encodeURIComponent(list[Math.floor(Math.random() * list.length)]);
      };
      console.log('[dims] quality-aware pickScene active (low-res variants excluded from rotation)');
    }
    var _sm = (typeof scanMedia === 'function') ? scanMedia : null;
    if (_sm) scanMedia = function () { _sm(); setTimeout(probeAll, 500); };
    setTimeout(probeAll, 3000);   // initial probe once the boot scan has settled
  } catch (e) { try { console.error('[dims] init failed:', e && e.message); } catch (_) {} }
})();

/* ================= ROOMSCAPE TIMER ENGINE v2 (v3.72, 2026-07-25) =================
   RS-TIMER — one room-wide timer, server-owned so all six kiosks stay in sync and it
   survives app reconnects. fx.js renders state.timer and computes the live value LOCALLY
   from the anchor (startMs/baseElapsedMs + serverNow); the conductor only broadcasts on
   CHANGE, and runs a 250ms tick purely to fire one-shot triggers (sound + wall event),
   handle reaching zero, step chains, run the chess clock and expire wall takeovers.
   Background image/video + styles + threshold effects all ride in state.timer.

   v2 (v3.72) adds: free-form trigger thresholds (any atMs, optional takeover flag),
   named presets persisted in settings.timerPresets (global or per-mode), chained
   rounds (T.chain), a multi-player chess clock (type:'chess', T.chess) and full-wall
   takeover broadcasts (type:'timerTakeover' + state.timer.takeover for late joiners).
   Endpoints:
     GET  /api/timer                                   -> { ok, timer, presets }
     POST /api/timer { set:{type,durationMs,targetMs,label,style,color,h24,bg,triggers,
                            frames,advancePhase,chain,chess} }        -> configure + reset
     POST /api/timer { preset:'<id>' }                 -> apply a saved preset + reset
     POST /api/timer { action:'start'|'pause'|'toggle'|'reset'|'skip'|'pass' }
     POST /api/timer { add:<ms> }                      -> add / subtract time
     GET  /api/timer/presets                           -> { ok, presets }
     POST /api/timer/presets { preset:{id?,name,cfg,mode?} } | { delete:'<id>' }        */
;(function () {
  try {
    var DEF = {
      type: 'down', running: false, startMs: 0, baseElapsedMs: 0,
      durationMs: 5 * 60000, targetMs: 0, label: '', style: 'digital', color: null, h24: false,
      bg: { type: 'none', key: '' },
      triggers: [ { atMs: 60000, visual: 'amber' }, { atMs: 10000, visual: 'red', pulse: true }, { atMs: 0, sfx: 'buzzer', event: 'softflash' } ],
      frames: null, advancePhase: false, rev: 0,
      chain: { steps: [], idx: 0, loop: false, autoStart: true },
      chess: null, takeover: null
    };
    var DAY = 24 * 3600000, MAX_STEP = 12 * 3600000, MAX_CHESS = 6 * 3600000;

    /* ---------- validators (shared by POST /api/timer set: and preset cfg:) ---------- */
    function normTriggers(arr) {
      if (!Array.isArray(arr)) return null;
      var out = [];
      for (var i = 0; i < arr.length && out.length < 12; i++) {
        var t = arr[i] || {}, at = +t.atMs;
        if (!isFinite(at) || at < 0 || at > DAY) continue;
        var sfx = null;
        if (t.sfx != null && t.sfx !== '') {
          sfx = String(t.sfx).slice(0, 160).replace(/^\/+/, '');
          if (sfx.indexOf('..') >= 0 || !/^[\w .()\-]+(\/[\w .()\-]+)*$/.test(sfx)) sfx = null;   // '/' kept intact -> /sounds/<path>
        }
        out.push({
          atMs: Math.round(at),
          visual: (t.visual === 'amber' || t.visual === 'red') ? t.visual : null,
          pulse: !!t.pulse,
          sfx: sfx,
          event: (t.event === 'lightning' || t.event === 'softflash') ? t.event : null,
          takeover: !!t.takeover
        });
      }
      out.sort(function (a, b) { return b.atMs - a.atMs; });
      return out;
    }
    function normChain(c) {
      var d = { steps: [], idx: 0, loop: false, autoStart: true };
      if (!c || typeof c !== 'object') return d;
      var src = Array.isArray(c.steps) ? c.steps : [];
      for (var i = 0; i < src.length && d.steps.length < 20; i++) {
        var st = src[i] || {}, ms = +st.durationMs;
        if (!isFinite(ms) || ms < 1000 || ms > MAX_STEP) continue;
        d.steps.push({ durationMs: Math.round(ms), label: (st.label != null && st.label !== '') ? String(st.label).slice(0, 40) : null });
      }
      d.loop = !!c.loop;
      d.autoStart = (c.autoStart == null) ? true : !!c.autoStart;
      var ix = parseInt(c.idx, 10); d.idx = (ix > 0 && ix < d.steps.length) ? ix : 0;
      return d;
    }
    function normChess(c) {
      if (!c || typeof c !== 'object') return null;
      var src = Array.isArray(c.players) ? c.players : [];
      if (src.length < 2 || src.length > 8) return null;
      var ps = [];
      for (var i = 0; i < src.length; i++) {
        var p = src[i] || {}, ms = +p.ms;
        if (!isFinite(ms) || ms < 1000 || ms > MAX_CHESS) return null;
        ms = Math.round(ms);
        var base = (+p.baseMs >= 1000 && +p.baseMs <= MAX_CHESS) ? Math.round(+p.baseMs) : ms;
        ps.push({ name: String(p.name == null ? ('P' + (i + 1)) : p.name).slice(0, 24) || ('P' + (i + 1)),
                  ms: ms, baseMs: base, elapsedMs: Math.max(0, Math.round(+p.elapsedMs || 0)) });
      }
      var inc = +c.incrementMs; if (!isFinite(inc) || inc < 0) inc = 0; inc = Math.min(300000, Math.round(inc));
      var tn = parseInt(c.turn, 10); if (!(tn >= 0 && tn < ps.length)) tn = 0;
      return { players: ps, turn: tn, incrementMs: inc, running: false, turnStartMs: 0, flagged: null };
    }

    if (!state.timer) state.timer = JSON.parse(JSON.stringify(DEF));
    var T = state.timer;
    if (!T.bg) T.bg = { type: 'none', key: '' };
    T.triggers = normTriggers(T.triggers) || JSON.parse(JSON.stringify(DEF.triggers));
    T.chain = normChain(T.chain); T.chain.idx = 0;
    T.chess = normChess(T.chess);
    T.takeover = null;
    if (T.type !== 'up' && T.type !== 'clock' && T.type !== 'chess') T.type = 'down';
    if (T.type === 'chess' && !T.chess) T.type = 'down';
    T.running = false; T.startMs = 0;   // never boot mid-run

    function now() { return Date.now(); }
    function elapsed() { return T.baseElapsedMs + (T.running ? (now() - T.startMs) : 0); }
    function remaining() { return T.type === 'down' ? Math.max(0, T.durationMs - elapsed()) : elapsed(); }
    function bgResolved() { var b = T.bg || { type: 'none' }, url = ''; if (b.type && b.type !== 'none' && b.key) { try { var lst = (typeof sceneFiles === 'function') && sceneFiles(b.key); if (lst && lst.length) url = '/media/' + encodeURIComponent(lst[0]); } catch (e) {} } return { type: b.type || 'none', key: b.key || '', url: url, video: /\.(mp4|webm|mov|m4v)$/i.test(url) }; }
    function chainSnap() { var c = T.chain || { steps: [] }; return { steps: c.steps || [], idx: c.idx || 0, loop: !!c.loop, autoStart: c.autoStart !== false, count: (c.steps || []).length, active: (c.steps || []).length > 0 }; }
    function chessSnap() { var c = T.chess; if (!c) return null; return { players: c.players.map(function (p) { return { name: p.name, ms: p.ms, baseMs: p.baseMs, elapsedMs: p.elapsedMs }; }), turn: c.turn, incrementMs: c.incrementMs, running: !!c.running, turnStartMs: c.turnStartMs || 0, flagged: (c.flagged == null ? null : c.flagged) }; }
    function snap() { return { type: T.type, running: T.running, startMs: T.startMs, baseElapsedMs: T.baseElapsedMs, serverNow: now(), durationMs: T.durationMs, targetMs: T.targetMs, label: T.label, style: T.style, color: T.color, h24: T.h24, bg: bgResolved(), triggers: T.triggers, frames: T.frames, advancePhase: T.advancePhase, rev: T.rev, chain: chainSnap(), chess: chessSnap(), takeover: T.takeover || null }; }
    function push() { T.rev = (T.rev || 0) + 1; state.timer = snap(); try { broadcastState(); } catch (e) {} }

    var tick = null, fired = {};
    function startTick() { if (!tick) tick = setInterval(onTick, 250); }
    function stopTick() { if (tick) { clearInterval(tick); tick = null; } }
    function bcast(msg) { try { if (typeof clients !== 'undefined' && typeof wsSend === 'function') clients.forEach(function (c) { wsSend(c.sock, msg); }); } catch (e) {} }

    /* ---------- wall takeover (v3.72 #5) ---------- */
    function fireTakeover(rem) {
      var zero = !(rem > 0);
      var until = zero ? (now() + 10000) : (now() + Math.max(1000, rem));   // zero-hit = 10s; otherwise until the timer would stop
      T.takeover = { on: true, until: until, ms: Math.max(0, Math.round(rem || 0)), style: T.style, color: T.color, label: T.label };
      bcast({ ie: true, type: 'timerTakeover', ms: T.takeover.ms, until: until, style: T.style, color: T.color, label: T.label, t: Date.now() });
      startTick();                                    // keep ticking so the takeover can expire itself
      console.log('[timer] takeover -> ' + (zero ? '10s' : Math.round(rem / 1000) + 's'));
    }
    function clearTakeover() { if (T.takeover) { T.takeover = null; return true; } return false; }

    function fireTrigger(tr, rem) {
      try {
        if (tr.sfx || tr.event) {
          // sfx passes through VERBATIM: a bare id ('buzzer') behaves as before, a path
          // ('stings/airhorn.mp3') is left intact so fx.js plays /sounds/<path>.
          var msg = { ie: true, type: 'social', id: 'timer', sfx: tr.sfx || null, event: tr.event || null, kid: !!state.kid, t: Date.now() };
          bcast(msg);
          console.log('[timer] trigger fired sfx:' + (tr.sfx || '-') + ' event:' + (tr.event || '-'));
        }
        if (tr.takeover) fireTakeover(rem == null ? 0 : rem);
      } catch (e) {}
    }
    function fireZeroTriggers() { (T.triggers || []).forEach(function (tr, i) { if (tr.atMs != null && tr.atMs <= 0 && !fired['z' + i]) { fired['z' + i] = 1; fireTrigger(tr, 0); } }); }

    /* ---------- chained rounds (v3.72 #3) ---------- */
    function chainStep() {   // returns true if a next step was taken
      var c = T.chain; if (!c || !c.steps || !c.steps.length) return false;
      if (c.idx + 1 < c.steps.length) c.idx++;
      else if (c.loop) c.idx = 0;
      else return false;
      var st = c.steps[c.idx] || {};
      T.durationMs = st.durationMs; if (st.label) T.label = st.label;
      T.baseElapsedMs = 0; T.startMs = now(); T.running = (c.autoStart !== false);
      fired = {};
      if (T.running) startTick();
      console.log('[timer] chain -> step ' + (c.idx + 1) + '/' + c.steps.length + ' (' + Math.round(T.durationMs / 1000) + 's)');
      return true;
    }

    /* ---------- chess clock (v3.72 #4) ---------- */
    function chessSettle() {
      var c = T.chess; if (!c || !c.running || !c.turnStartMs) return;
      var p = c.players[c.turn]; if (!p) return;
      var d = Math.max(0, now() - c.turnStartMs);
      p.ms = Math.max(0, (p.ms || 0) - d); p.elapsedMs = (p.elapsedMs || 0) + d; c.turnStartMs = now();
    }
    function chessStart() { var c = T.chess; if (!c || c.running || c.flagged != null) return; c.running = true; c.turnStartMs = now(); T.running = true; T.startMs = now(); startTick(); }
    function chessPause() { var c = T.chess; if (!c || !c.running) return; chessSettle(); c.running = false; c.turnStartMs = 0; T.running = false; T.startMs = 0; }
    function chessPass() {
      var c = T.chess; if (!c || c.flagged != null) return;
      if (c.running) chessSettle();
      var p = c.players[c.turn]; if (p) p.ms = Math.min(MAX_CHESS, (p.ms || 0) + (c.incrementMs || 0));
      c.turn = (c.turn + 1) % c.players.length;
      if (c.running) c.turnStartMs = now();
    }
    function chessReset() { var c = T.chess; if (!c) return; c.players.forEach(function (p) { p.ms = p.baseMs; p.elapsedMs = 0; }); c.turn = 0; c.flagged = null; c.running = false; c.turnStartMs = 0; T.running = false; T.startMs = 0; fired = {}; }
    function tickChess() {
      var c = T.chess; if (!c || !c.running) return;
      var p = c.players[c.turn]; if (!p) return;
      var live = Math.max(0, (p.ms || 0) - Math.max(0, now() - (c.turnStartMs || now())));
      if (live > 0) return;
      p.elapsedMs = (p.elapsedMs || 0) + Math.max(0, now() - (c.turnStartMs || now())); p.ms = 0;
      c.running = false; c.turnStartMs = 0; c.flagged = c.turn; T.running = false; T.startMs = 0;
      fireZeroTriggers();
      console.log('[timer] chess flag: ' + p.name);
      push();
    }

    function onTick() {
      var tk = T.takeover;
      if (tk && tk.on && tk.until && now() >= tk.until) { T.takeover = null; push(); }
      if (T.type === 'chess') { if (T.running) tickChess(); }
      else if (T.running && T.type === 'down') {
        var rem = remaining();
        (T.triggers || []).forEach(function (tr, i) { if (tr.atMs != null && rem <= tr.atMs && !fired[i]) { fired[i] = 1; fireTrigger(tr, rem); } });
        if (rem <= 0) {
          T.running = false; T.baseElapsedMs = T.durationMs; T.startMs = 0;
          var advanced = chainStep();                                    // zero triggers already fired above
          if (!advanced) stopTick();
          push();
          try { if (T.advancePhase) advanceTimerPhase(); } catch (e) {}
          return;
        }
      }
      if (!T.running && !(T.takeover && T.takeover.on)) stopTick();
    }
    function advanceTimerPhase() {
      // best-effort: step to the next named phase of the live mode, if the base supports it
      try {
        var phs = (typeof phaseListFor === 'function') ? phaseListFor(state.game) : null;
        if (!phs || !phs.length) return;
        var ix = -1; phs.forEach(function (p2, i) { if (p2.id === activePhaseId) ix = i; });
        var nx = phs[ix + 1]; if (nx && typeof applyPhase === 'function') { applyPhase(nx.id); console.log('[timer] auto-advanced phase -> ' + nx.id); }
      } catch (e) {}
    }

    /* ---------- presets (v3.72 #2) — persisted in settings.timerPresets ---------- */
    function presetList() { if (!Array.isArray(settings.timerPresets)) settings.timerPresets = []; return settings.timerPresets; }
    function savePresets() {   // same guarded profiles-file write path as /api/schedule
      try { backupFile(PROFILES_FILE); } catch (e) {}
      try { fs.writeFileSync(PROFILES_FILE, JSON.stringify({ profiles: profiles, tagmap: tagmap, settings: settings }, null, 2)); return null; }
      catch (e) { return e; }
    }
    function normPresetCfg(c) {
      c = c || {};
      var o = {};
      o.type = (c.type === 'up' || c.type === 'clock' || c.type === 'chess') ? c.type : 'down';
      o.durationMs = Math.max(0, Math.min(DAY, Math.round(+c.durationMs || 0)));
      o.style = c.style ? String(c.style).slice(0, 24) : 'digital';
      o.color = c.color ? String(c.color).slice(0, 24) : null;
      o.label = c.label != null ? String(c.label).slice(0, 40) : '';
      if (Array.isArray(c.triggers)) o.triggers = normTriggers(c.triggers) || [];
      if (c.bg && typeof c.bg === 'object') o.bg = { type: String(c.bg.type || 'none').slice(0, 16), key: String(c.bg.key || '').slice(0, 120) };
      if (c.chain && typeof c.chain === 'object') o.chain = normChain(c.chain);
      if (c.chess && typeof c.chess === 'object') { var ch = normChess(c.chess); if (ch) o.chess = { players: ch.players.map(function (p) { return { name: p.name, ms: p.baseMs }; }), incrementMs: ch.incrementMs }; }
      if (o.type === 'chess' && !o.chess) o.type = 'down';
      return o;
    }

    /* ---------- the one place a config is applied (used by set: and preset:) ---------- */
    function applySet(s) {
      if (!s || typeof s !== 'object') return null;
      /* validate everything that can fail BEFORE touching T, so a rejected POST
         never leaves the wall holding a half-applied config */
      var ty = s.type ? (((s.type === 'up' || s.type === 'clock' || s.type === 'chess')) ? s.type : 'down') : T.type;
      var newChess = ('chess' in s) ? normChess(s.chess) : T.chess;
      if (('chess' in s) && s.chess && !newChess) return 'chess needs {players:[{name,ms}] 2-8, ms 1s..6h}';
      if (ty === 'chess' && !newChess) return 'type "chess" needs a chess config';
      if (Array.isArray(s.triggers) && !normTriggers(s.triggers)) return 'triggers must be an array';
      T.type = ty;
      if (s.durationMs != null) T.durationMs = Math.max(0, +s.durationMs || 0);
      if (s.targetMs != null) T.targetMs = Math.max(0, +s.targetMs || 0);
      if (s.label != null) T.label = String(s.label).slice(0, 40);
      if (s.style) T.style = String(s.style);
      if ('color' in s) T.color = s.color || null;
      if (s.h24 != null) T.h24 = !!s.h24;
      if (s.bg && typeof s.bg === 'object') T.bg = { type: (s.bg.type || 'none'), key: (s.bg.key || '') };
      if (Array.isArray(s.triggers)) T.triggers = normTriggers(s.triggers);
      if ('frames' in s) T.frames = Array.isArray(s.frames) ? s.frames : null;
      if ('advancePhase' in s) T.advancePhase = !!s.advancePhase;
      if ('chain' in s) { T.chain = normChain(s.chain); if (T.chain.steps.length) { T.durationMs = T.chain.steps[0].durationMs; if (T.chain.steps[0].label) T.label = T.chain.steps[0].label; } }
      T.chess = newChess;
      if (T.type === 'chess') chessReset();
      T.running = false; T.baseElapsedMs = 0; T.startMs = 0; fired = {}; clearTakeover();   // (re)configure resets the run
      if (T.chain) T.chain.idx = 0;
      return null;
    }

    if (typeof server !== 'undefined' && server && server.prependListener) {
      server.prependListener('request', function (req, res) {
        var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
        var P = u.pathname;
        if (P !== '/api/timer' && P !== '/api/timer/presets') return;
        var W = res.writeHead.bind(res), E = res.end.bind(res);
        res.writeHead = res.setHeader = function () { return res; }; res.write = res.end = function () { return true; };
        function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
        function body(cb) { var b = ''; req.on('data', function (d) { b += d; if (b.length > 1e6) req.destroy(); }); req.on('end', function () { var j = null; try { j = b ? JSON.parse(b) : {}; } catch (e) { return out(400, { ok: false, error: 'bad json' }); } cb(j); }); }

        /* ---- /api/timer/presets ---- */
        if (P === '/api/timer/presets') {
          if (req.method === 'GET') return out(200, { ok: true, presets: presetList() });
          if (req.method !== 'POST') return out(405, { ok: false, error: 'GET or POST only' });
          return body(function (j) {
            var L = presetList();
            if (j && j.delete) {
              var n0 = L.length; settings.timerPresets = L.filter(function (p) { return p && p.id !== j.delete; });
              var e1 = savePresets(); if (e1) return out(500, { ok: false, error: 'write failed: ' + e1.message });
              return out(200, { ok: true, removed: n0 - settings.timerPresets.length, presets: settings.timerPresets });
            }
            var q = j && j.preset;
            if (!q || typeof q !== 'object') return out(400, { ok: false, error: 'need {preset:{name,cfg,mode?,id?}} or {delete:"<id>"}' });
            if (!q.name || !String(q.name).trim()) return out(400, { ok: false, error: 'preset needs a name' });
            if (!q.cfg || typeof q.cfg !== 'object') return out(400, { ok: false, error: 'preset needs a cfg object' });
            var rec = {
              id: (q.id && String(q.id).slice(0, 40)) || ('tp' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)),
              name: String(q.name).slice(0, 40),
              mode: (q.mode && typeof q.mode === 'string') ? q.mode.slice(0, 60) : null,
              cfg: normPresetCfg(q.cfg)
            };
            var ix = -1; L.forEach(function (p, i) { if (p && p.id === rec.id) ix = i; });
            if (ix >= 0) L[ix] = rec;
            else { if (L.length >= 60) return out(400, { ok: false, error: 'preset limit reached (60)' }); L.push(rec); }
            var e2 = savePresets(); if (e2) return out(500, { ok: false, error: 'write failed: ' + e2.message });
            try { logDiary('auto', 'timer preset saved: ' + rec.name); } catch (e) {}
            return out(200, { ok: true, preset: rec, presets: L });
          });
        }

        /* ---- /api/timer ---- */
        if (req.method === 'GET') return out(200, { ok: true, timer: snap(), presets: presetList() });
        body(function (j) {
          j = j || {};
          if (j.preset != null) {
            var pr = presetList().find(function (p) { return p && p.id === j.preset; });
            if (!pr) return out(404, { ok: false, error: 'no preset "' + j.preset + '"' });
            // a preset is a COMPLETE config: chain/chess it does not name are cleared, not inherited
            var pe = applySet(Object.assign({ chain: null, chess: null }, pr.cfg || {}));
            if (pe) return out(400, { ok: false, error: pe });
          }
          if (j.set && typeof j.set === 'object') {
            var err = applySet(j.set);
            if (err) return out(400, { ok: false, error: err });
          }
          var act = j.action;
          if (T.type === 'chess' && T.chess) {
            if (act === 'toggle') act = T.chess.running ? 'pause' : 'start';
            if (act === 'start') chessStart();
            else if (act === 'pause') chessPause();
            else if (act === 'reset') { chessReset(); clearTakeover(); stopTick(); }
            else if (act === 'pass') chessPass();
          } else {
            if (act === 'toggle') act = T.running ? 'pause' : 'start';
            if (act === 'start') { if (!T.running) { T.startMs = now(); T.running = true; fired = {}; startTick(); } }
            else if (act === 'pause') { if (T.running) { T.baseElapsedMs = elapsed(); T.running = false; T.startMs = 0; } clearTakeover(); stopTick(); }
            else if (act === 'reset') {
              T.running = false; T.baseElapsedMs = 0; T.startMs = 0; fired = {}; clearTakeover(); stopTick();
              if (T.chain && T.chain.steps.length) { T.chain.idx = 0; T.durationMs = T.chain.steps[0].durationMs; if (T.chain.steps[0].label) T.label = T.chain.steps[0].label; }
            }
            else if (act === 'skip') {
              if (!(T.chain && T.chain.steps.length)) { push(); return out(400, { ok: false, error: 'no chain configured', timer: snap() }); }
              var moved = chainStep();
              if (!moved) { T.running = false; T.baseElapsedMs = T.durationMs; T.startMs = 0; stopTick(); }
              push(); return out(200, { ok: true, skipped: moved, timer: snap() });
            }
          }
          if (j.add != null) { var add = +j.add || 0; if (T.type === 'down') { T.durationMs = Math.max(0, T.durationMs + add); } else if (T.type !== 'chess') { var e2 = elapsed() + add; T.baseElapsedMs = Math.max(0, e2); if (T.running) T.startMs = now(); } fired = {}; }
          push();
          out(200, { ok: true, timer: snap() });
        });
      });
      console.log('[timer] engine v2 ready (' + T.type + ' ' + Math.round(T.durationMs / 1000) + 's, ' + presetList().length + ' preset(s))');
    }
  } catch (e) { try { console.error('[timer] init failed:', e && e.message); } catch (_) {} }
})();

/* ================= ROOMSCAPE SCORES & PEOPLE (v2.46, 2026-07-16) =================
   RS-SCORES — revives the dead half of the original Rules & Scores module and extends
   it. First real routes registered through the RS-ROUTE-DISPATCH table (v2.36).
   Store: scores.json in APP_DIR — SAME contract the existing scores.html page expects:
     { players:[{name, nick?, color?, photo?, titles?[]}], results:[{id,dateISO,game,players:[{name,won,score?}]}] }
   Endpoints (router):
     GET  /api/scores                        -> the whole document (page contract)
     POST /api/scores                        -> replace document (page contract; backs up first)
     POST /api/scores/result {game,players}  -> append one result (id+dateISO server-side)
     GET  /api/people                        -> { ok, people } (= players array)
     POST /api/people {person}|{delete:name} -> upsert by name / delete
     POST /api/people/photo {name,b64}       -> saves APP_DIR/people/<slug>.<ext>, sets person.photo
     GET  /scores                            -> serves scores.html (old alias)
   Live match rides state.scores (broadcast to score-kind frames, fx v1.05):
     POST /api/scores/live {start:{game,names:[]}} | {add:{name,delta}} | {finish:true} | {off:true} */
;(function () {
  try {
    var fs = require('fs'), path = require('path');
    var R = global.__rsRouter; if (!R) { console.log('[scores] router missing — skipped'); return; }
    var BASE = (typeof APP_DIR !== 'undefined' && APP_DIR) || __dirname;
    var FILE = path.join(BASE, 'scores.json');
    var DOC = { players: [], results: [] };
    try { if (fs.existsSync(FILE)) { var j0 = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; DOC.players = j0.players || []; DOC.results = j0.results || []; } } catch (e) { console.error('[scores] read failed:', e && e.message); }
    function save() { try { if (fs.existsSync(FILE) && typeof backupFile === 'function') backupFile(FILE); fs.writeFileSync(FILE, JSON.stringify(DOC, null, 2), 'utf8'); } catch (e) { console.error('[scores] write failed:', e && e.message); } }
    function slug(n) { return String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'p'; }
    function person(n) { return DOC.players.find(function (p) { return p && p.name === n; }); }

    R.add('GET', '/api/scores', function (req, res, u, real) { real.json(200, { ok: true, players: DOC.players, results: DOC.results }); });
    R.add('POST', '/api/scores', function (req, res, u, real) { R.readBody(req, function (b) {
      if (!b || !Array.isArray(b.results)) return real.json(400, { ok: false, error: 'need {players,results}' });
      DOC.players = b.players || DOC.players; DOC.results = b.results; save();
      real.json(200, { ok: true, players: DOC.players.length, results: DOC.results.length });
    }); });
    R.add('POST', '/api/scores/result', function (req, res, u, real) { R.readBody(req, function (b) {
      if (!b || !b.game || !Array.isArray(b.players) || !b.players.length) return real.json(400, { ok: false, error: 'need {game, players:[{name,won,score?}]}' });
      b.players.forEach(function (p) { if (p && p.name && !person(p.name)) DOC.players.push({ name: p.name }); });
      var rec = { id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), dateISO: new Date().toISOString(), game: String(b.game), name: b.name || undefined, players: b.players };
      DOC.results.push(rec); save();
      try { logDiary('scores', rec.game + ' → ' + b.players.filter(function (p) { return p.won; }).map(function (p) { return p.name; }).join(' + ')); } catch (e) {}
      real.json(200, { ok: true, id: rec.id, results: DOC.results.length });
    }); });
    R.add('GET', '/api/people', function (req, res, u, real) { real.json(200, { ok: true, people: DOC.players }); });
    R.add('POST', '/api/people', function (req, res, u, real) { R.readBody(req, function (b) {
      if (b && b.delete) { var n0 = DOC.players.length; DOC.players = DOC.players.filter(function (p) { return p.name !== b.delete; }); save(); return real.json(200, { ok: true, removed: n0 - DOC.players.length }); }
      var q = b && b.person; if (!q || !q.name) return real.json(400, { ok: false, error: 'need {person:{name,…}} or {delete:name}' });
      var ex = person(q.rename || q.name);
      if (ex) { ['nick', 'color', 'photo'].forEach(function (k) { if (k in q) ex[k] = q[k] || undefined; }); if ('titles' in q) ex.titles = Array.isArray(q.titles) ? q.titles.slice(0, 20) : undefined; if (q.rename) ex.name = q.name; }
      else DOC.players.push({ name: q.name, nick: q.nick || undefined, color: q.color || undefined, photo: q.photo || undefined, titles: Array.isArray(q.titles) ? q.titles.slice(0, 20) : undefined });
      save(); real.json(200, { ok: true, people: DOC.players });
    }); });
    R.add('POST', '/api/people/photo', function (req, res, u, real) { R.readBody(req, function (b) {
      if (!b || !b.name || !b.b64) return real.json(400, { ok: false, error: 'need {name, b64}' });
      var m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(b.b64); if (!m) return real.json(400, { ok: false, error: 'b64 must be a data:image/... URL' });
      try {
        var dir = path.join(BASE, 'people'); fs.mkdirSync(dir, { recursive: true });
        var ext = m[1] === 'jpeg' ? 'jpg' : m[1], fn = slug(b.name) + '.' + ext;
        var buf = Buffer.from(m[2], 'base64'); if (buf.length > 8 * 1024 * 1024) return real.json(413, { ok: false, error: 'image too large (8MB max)' });
        fs.writeFileSync(path.join(dir, fn), buf);
        var pp = person(b.name); if (!pp) { pp = { name: b.name }; DOC.players.push(pp); }
        pp.photo = '/people/' + fn; save();
        real.json(200, { ok: true, photo: pp.photo });
      } catch (e) { real.json(500, { ok: false, error: String(e && e.message) }); }
    }); });
    R.add('GET', '/scores', function (req, res, u, real) {
      try { var html = fs.readFileSync(path.join(BASE, 'scores.html')); real.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); real.end(html); }
      catch (e) { real.json(404, { ok: false, error: 'scores.html missing' }); }
    });
    R.add('POST', '/api/scores/live', function (req, res, u, real) { R.readBody(req, function (b) {
      b = b || {};
      if (b.start && Array.isArray(b.start.names) && b.start.names.length) {
        state.scores = { on: true, finished: false, game: b.start.game || state.game, ts: Date.now(),
          players: b.start.names.map(function (n) { var pp = person(n) || { name: n }; return { name: pp.name, nick: pp.nick || '', color: pp.color || '', photo: pp.photo || '', score: 0 }; }) };
      }
      var S = state.scores;
      if (S && b.add && b.add.name) { var pl = (S.players || []).find(function (x) { return x.name === b.add.name; }); if (pl) pl.score = Math.max(-999, Math.min(9999, (pl.score || 0) + (+b.add.delta || 0))); }
      if (S && b.finish) { S.finished = true; S.ts = Date.now(); }
      if (b.off) state.scores = null;
      try { state.rev = (state.rev || 0) + 1; persist(); broadcastState(); } catch (e) {}
      real.json(200, { ok: true, scores: state.scores || null });
    }); });
    console.log('[scores] revived via route table: ' + DOC.players.length + ' player(s), ' + DOC.results.length + ' result(s)');
  } catch (e) { try { console.error('[scores] init failed:', e && e.message); } catch (_) {} }
})();

/* ================= ROOMSCAPE LIGHT ZONES API (v2.47, 2026-07-16) =================
   RS-LIGHTZONES — chandelier vs console lamps as independent zones (see haApplyRoom
   v2.7 edit). These routes give the app zone metadata + apply-now control:
     GET  /api/ha/lightzones -> { ok, zones:{name:[entities]}, scenes:[…], effects:[…] }
     POST /api/ha/lightzone  { zone, scene?, effect?, brightness_pct?, off? }        */
;(function () {
  try {
    var R = global.__rsRouter; if (!R) return;
    var EFFECTS = ['none', 'candle', 'fire', 'sparkle', 'prism', 'opal', 'glisten', 'flicker'];   // native Hue effects + 'flicker' = conductor-driven custom (intensity/speed)
    R.add('GET', '/api/ha/lightzones', function (req, res, u, real) {
      var ha = haCfg();
      real.json(200, { ok: true, configured: haOn(), zones: ha.zones || {}, scenes: Object.keys(ha.lightScenes), effects: EFFECTS });
    });
    R.add('POST', '/api/ha/lightzone', function (req, res, u, real) { R.readBody(req, function (b) {
      if (!b || !b.zone) return real.json(400, { ok: false, error: 'need {zone,…}' });
      var ha = haCfg(), ents = (ha.zones || {})[b.zone];
      if (!ents || !ents.length) return real.json(404, { ok: false, error: 'unknown zone "' + b.zone + '"' });
      var FL = global.__rsFlicker; if (FL) FL.stop(b.zone);                // any manual apply first stops a running flicker loop
      if (b.off) return haCall('light', 'turn_off', { entity_id: ents, transition: 1 }, function (e) { real.json(e ? 502 : 200, { ok: !e, error: e && e.message }); });
      if (b.effect === 'flicker') {                                       // v2.48 quick-apply custom flicker
        var zsc0 = (b.scene && ha.lightScenes[b.scene]) || ha.lightScenes.candle || {};
        var base0 = (b.brightness_pct != null && b.brightness_pct !== '') ? +b.brightness_pct : (zsc0.brightness_pct != null ? zsc0.brightness_pct : 25);
        var pre = Object.assign({ entity_id: ents }, zsc0); pre.brightness_pct = base0; delete pre.effect; if (pre.transition == null) pre.transition = 1;
        haCall('light', 'turn_on', pre, function () {});
        if (FL) FL.start(b.zone, ents, base0, b.intensity, b.speed, zsc0.color_temp_kelvin || 2000);
        return real.json(200, { ok: true, flicker: true });
      }
      var pay = Object.assign({ entity_id: ents }, (b.scene && ha.lightScenes[b.scene]) || {});
      if (b.brightness_pct != null && b.brightness_pct !== '') pay.brightness_pct = Math.max(1, Math.min(100, +b.brightness_pct));
      if (b.effect && b.effect !== 'none') pay.effect = b.effect;
      if (b.effect === 'none') pay.effect = 'off';                        // explicit stop for a running Hue effect
      if (pay.transition == null) pay.transition = 1;
      if (Object.keys(pay).length <= 2) return real.json(400, { ok: false, error: 'nothing to apply' });
      haCall('light', 'turn_on', pay, function (e) { real.json(e ? 502 : 200, { ok: !e, error: e && e.message }); });
    }); });
    console.log('[lightzones] zones ready: ' + Object.keys(haCfg().zones || {}).join(', '));

    /* v2.48 CUSTOM FLICKER — native Hue effects expose no speed/intensity knobs, so
       effect:'flicker' is driven from here: a per-zone loop nudging brightness (and a
       whisper of warmth) around the base level. flickerInt 1-100 → ±3..±38% amplitude;
       flickerSpeed 1-100 → 2600ms..320ms between nudges (transition rides just under
       the interval so it's a sway, not a strobe). Loops stop whenever the zone gets
       any other apply (scene/effect/off) or the mode changes.                        */
    var FLIC = {};   // zone -> {t:interval, base, amp, ms, ct}
    function flickerStop(zone) { if (FLIC[zone]) { clearInterval(FLIC[zone].t); delete FLIC[zone]; } }
    function flickerStart(zone, ents, basePct, intensity, speed, baseK) {
      flickerStop(zone);
      var amp = 3 + Math.round(35 * Math.max(1, Math.min(100, +intensity || 50)) / 100);
      var ms = Math.round(2600 - 2280 * Math.max(1, Math.min(100, +speed || 50)) / 100);
      var base = Math.max(3, Math.min(100, +basePct || 25));
      var k = +baseK || 2000;
      FLIC[zone] = { base: base, amp: amp, ms: ms, ct: k };
      FLIC[zone].t = setInterval(function () {
        var b = Math.max(1, Math.min(100, Math.round(base + (Math.random() * 2 - 1) * amp)));
        var kk = Math.max(1800, Math.min(2400, Math.round(k + (Math.random() * 2 - 1) * 120)));
        haCall('light', 'turn_on', { entity_id: ents, brightness_pct: b, color_temp_kelvin: kk, transition: Math.max(0.2, (ms * 0.85) / 1000) }, function () {});
      }, ms);
      console.log('[flicker] ' + zone + ' on: base ' + base + '% ±' + amp + '% every ' + ms + 'ms');
    }
    global.__rsFlicker = { start: flickerStart, stop: flickerStop, stopAll: function () { Object.keys(FLIC).forEach(flickerStop); } };
  } catch (e) { try { console.error('[lightzones] init failed:', e && e.message); } catch (_) {} }
})();
/* ================= ROOMSCAPE VARIANTS (2026-07-18 v2) =================
   RS-VARIANTS v2 — per-frame variant policy + pinning + badge support
   Store: variants.json  { modes: { <gameId>: { frames:[{policy,intervalS,pin}x6], staggerS } } }
     policy: 'same' | 'random' | 'cycle' | 'unique'    pin: -1 or variant index
   (v1 entries {mode,intervalS,staggerS} are migrated to all-frames on read.)
   Endpoints:
     GET  /api/variants?game=<id>     -> { ok, cfg:{frames[6],staggerS} }
     GET  /api/variants?files=<key>   -> { ok, key, count, files:[names...] } (sorted)
     GET  /api/variants?live=1        -> { ok, game, frameImages }  (what's on the wall now)
     POST /api/variants               -> { game, frame|-1, policy?, intervalS?, pin? } or { game, staggerS }
   Appended to conductor.js; used by the rs-variants v2 resolveFrameImages. */
;(function () {
  try {
    var fs = require('fs'), path = require('path');
    var FILE = path.join(__dirname, 'variants.json');
    var DB = { modes: {} };
    try { if (fs.existsSync(FILE)) DB = JSON.parse(fs.readFileSync(FILE, 'utf8')) || { modes: {} }; } catch (e) { DB = { modes: {} }; }
    function save() { try { fs.writeFileSync(FILE, JSON.stringify(DB, null, 2), 'utf8'); } catch (e) { console.error('[variants] save failed:', e && e.message); } }
    function defFrame() { return { policy: 'same', intervalS: 30, pin: -1 }; }
    function normFrame(f) {
      f = f || {};
      var p = f.policy; if (p !== 'random' && p !== 'cycle' && p !== 'unique') p = 'same';
      return { policy: p, intervalS: Math.max(5, parseInt(f.intervalS, 10) || 30), pin: (f.pin != null && f.pin >= 0) ? Math.floor(f.pin) : -1 };
    }
    function entry(game) {
      var v = (DB.modes && DB.modes[game]) || {};
      if (v.mode && !v.frames) {                             // migrate v1 shape
        var m = (v.mode === 'random' || v.mode === 'cycle' || v.mode === 'unique') ? v.mode : 'same';
        v = { frames: [0,1,2,3,4,5].map(function(){ return { policy: m, intervalS: v.intervalS || 30, pin: -1 }; }), staggerS: v.staggerS || 0 };
      }
      var fr = []; for (var i = 0; i < 6; i++) fr.push(normFrame((v.frames || [])[i]));
      return { frames: fr, staggerS: Math.max(0, Math.min(60, v.staggerS || 0)) };
    }
    global.__rsVariantCfg = function (game) { return entry(game); };
    global.__rsPickVariant = function (key, idx) {
      try {
        var list = sceneFiles(key);
        if (!list || !list.length) return null;
        var sorted = list.slice().sort();
        var n = sorted.length, k = ((Math.floor(idx) % n) + n) % n;
        return '/media/' + encodeURIComponent(sorted[k]);
      } catch (e) { try { return pickScene(key); } catch (e2) { return null; } }
    };

    var lastSig = '';
    setInterval(function () {
      try {
        var cfg = entry(state.game), sigp = '';
        for (var i = 0; i < 6; i++) {
          var c = cfg.frames[i];
          if (c.pin < 0 && (c.policy === 'random' || c.policy === 'cycle')) sigp += i + ':' + Math.floor(Date.now() / (c.intervalS * 1000)) + ';';
        }
        if (sigp !== lastSig) { lastSig = sigp; if (sigp) { state._imgSig = null; bump('variants'); } }
      } catch (e) {}
    }, 5000);

    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      if (u.pathname !== '/api/variants') return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; };
      res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      try {
        if (req.method === 'GET') {
          var fk = u.searchParams.get('files');
          if (fk) {
            var list = []; try { list = (sceneFiles(fk) || []).slice().sort(); } catch (e) {}
            return out(200, { ok: true, key: fk, count: list.length, files: list.map(function (p) { return String(p).split('/').pop(); }) });
          }
          if (u.searchParams.get('live')) {
            return out(200, { ok: true, game: state.game, frameImages: state.frameImages || [] });
          }
          var g = u.searchParams.get('game');
          if (g) return out(200, { ok: true, game: g, cfg: entry(g) });
          return out(200, { ok: true, modes: DB.modes || {} });
        }
        if (req.method === 'POST') {
          var b = ''; var big = false;
          req.on('data', function (c) { b += c; if (b.length > 65536) { big = true; req.destroy(); } });
          req.on('end', function () {
            if (big) return out(400, { ok: false, error: 'too large' });
            var j; try { j = JSON.parse(b || '{}'); } catch (e) { return out(400, { ok: false, error: 'bad json' }); }
            if (!j.game) return out(400, { ok: false, error: 'need {game}' });
            var cur = entry(j.game);
            if (j.staggerS != null) cur.staggerS = Math.max(0, Math.min(60, parseInt(j.staggerS, 10) || 0));
            if (j.policy != null || j.pin != null || j.intervalS != null) {
              var idxs = (j.frame == null || j.frame < 0) ? [0,1,2,3,4,5] : [Math.min(5, Math.max(0, Math.floor(j.frame)))];
              idxs.forEach(function (i) {
                var f = cur.frames[i];
                if (j.policy != null) { f.policy = j.policy; if (j.pin == null) f.pin = -1; }
                if (j.intervalS != null) f.intervalS = Math.max(5, parseInt(j.intervalS, 10) || 30);
                if (j.pin != null) f.pin = (j.pin >= 0) ? Math.floor(j.pin) : -1;
                cur.frames[i] = normFrame(f);
              });
            }
            DB.modes = DB.modes || {};
            DB.modes[j.game] = cur;
            save();
            try { state._imgSig = null; bump('variants'); } catch (e) {}
            return out(200, { ok: true, game: j.game, cfg: cur });
          });
          return;
        }
        return out(405, { ok: false, error: 'method' });
      } catch (e) { out(500, { ok: false, error: String((e && e.message) || e) }); }
    });
    console.log('[variants] v2 ready — per-frame policies + pins');
  } catch (e) { try { console.error('[variants] init failed:', e && e.message); } catch (_) {} }
})();
/* ================= ROOMSCAPE PLAYLISTS (2026-07-18) =================
   RS-PLAYLISTS v1 — explicit per-frame media playlists (replaces variant policies)
   Store: playlists.json { modes: { <game>: { frames:[{items[],order,intervalS,pinIdx}x6], staggerS } } }
     items: media-relative paths (exact files). order: 'seq'|'shuffle'.
     intervalS: 0 = Static (always show items[pinIdx]).
   Endpoints:
     GET  /api/playlists?game=<id>   -> { ok, cfg }
     POST /api/playlists             -> { game, frame, items?, order?, intervalS?, pinIdx? } or { game, staggerS }
   Compat: GET /api/variants?game= (no files param) answers with {cfg:{staggerS}} so the
   existing video-stagger fx block keeps working; /api/variants?files= passes through.
   Appended to conductor.js; used by the rs-playlists v3 resolveFrameImages. */
;(function () {
  try {
    var fs = require('fs'), path = require('path');
    var FILE = (function(){ var d=(typeof APP_DIR!=='undefined'&&APP_DIR)||__dirname; var p1=path.join(d,'playlists.json'), p0=path.join(__dirname,'playlists.json'); try{ if(p1!==p0 && !fs.existsSync(p1) && fs.existsSync(p0)) fs.copyFileSync(p0,p1); }catch(e){} return p1; })() /* rs-storepaths v1 */;
    var DB = { modes: {} };
    try { if (fs.existsSync(FILE)) DB = JSON.parse(fs.readFileSync(FILE, 'utf8')) || { modes: {} }; } catch (e) { DB = { modes: {} }; }
    // one-time: inherit staggerS values from the retired variants.json
    try {
      var VOLD = path.join(__dirname, 'variants.json');
      if (fs.existsSync(VOLD)) {
        var old = JSON.parse(fs.readFileSync(VOLD, 'utf8')) || {};
        Object.keys(old.modes || {}).forEach(function (g) {
          var st = (old.modes[g] || {}).staggerS || 0;
          if (st && !(DB.modes[g] && DB.modes[g].staggerS)) { DB.modes[g] = DB.modes[g] || { frames: [] }; DB.modes[g].staggerS = st; }
        });
      }
    } catch (e) {}
    function save() { try { fs.writeFileSync(FILE, JSON.stringify(DB, null, 2), 'utf8'); } catch (e) { console.error('[playlists] save failed:', e && e.message); } }
    function defFrame() { return { items: [], order: 'seq', intervalS: 60, pinIdx: 0 }; }
    function normFrame(f) {
      f = f || {};
      var items = Array.isArray(f.items) ? f.items.filter(function (x) { return typeof x === 'string' && x.length && x.length < 500; }).slice(0, 64) : [];
      var order = (f.order === 'shuffle') ? 'shuffle' : 'seq';
      var iv = parseInt(f.intervalS, 10); if (!(iv >= 0)) iv = 60; if (iv > 0 && iv < 5) iv = 5; if (iv > 86400) iv = 86400;
      var pin = parseInt(f.pinIdx, 10); if (!(pin >= 0)) pin = 0; if (items.length) pin = Math.min(pin, items.length - 1);
      return { items: items, order: order, intervalS: iv, pinIdx: pin };
    }
    function entry(game) {
      var v = (DB.modes && DB.modes[game]) || {};
      var fr = []; for (var i = 0; i < 6; i++) fr.push(normFrame((v.frames || [])[i]));
      return { frames: fr, staggerS: Math.max(0, Math.min(60, v.staggerS || 0)) };
    }
    global.__rsPlaylistCfg = function (game) { return entry(game); };
    global.__rsShuffleOrder = function (n, seed) {
      var h = 2166136261 >>> 0;
      String(seed).split('').forEach(function (ch) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; });
      var a = []; for (var i = 0; i < n; i++) a.push(i);
      for (var j = n - 1; j > 0; j--) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; var k = h % (j + 1); var t = a[j]; a[j] = a[k]; a[k] = t; }
      return a;
    };

    var lastSig = '';
    setInterval(function () {
      try {
        var cfg = entry(state.game), sigp = '';
        for (var i = 0; i < 6; i++) {
          var c = cfg.frames[i];
          if (c.items.length > 1 && c.intervalS > 0) sigp += i + ':' + Math.floor(Date.now() / (c.intervalS * 1000)) + ';';
        }
        if (sigp !== lastSig) { lastSig = sigp; if (sigp) { state._imgSig = null; bump('playlists'); } }
      } catch (e) {}
    }, 5000);

    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var isPl = (u.pathname === '/api/playlists');
      var isVarCompat = (u.pathname === '/api/variants' && !u.searchParams.get('files'));
      if (!isPl && !isVarCompat) return;                    // /api/variants?files= passes to the old block
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; };
      res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      try {
        if (req.method === 'GET') {
          var g = u.searchParams.get('game');
          if (isVarCompat) {                                 // stagger compat for fx block
            if (!g) return out(200, { ok: true, modes: {} });
            var c0 = entry(g);
            return out(200, { ok: true, game: g, cfg: { mode: 'same', intervalS: 30, staggerS: c0.staggerS, frames: [] } });
          }
          if (g) return out(200, { ok: true, game: g, cfg: entry(g) });
          return out(200, { ok: true, modes: Object.keys(DB.modes || {}) });
        }
        if (req.method === 'POST') {
          var b = ''; var big = false;
          req.on('data', function (c) { b += c; if (b.length > 512 * 1024) { big = true; req.destroy(); } });
          req.on('end', function () {
            if (big) return out(400, { ok: false, error: 'too large' });
            var j; try { j = JSON.parse(b || '{}'); } catch (e) { return out(400, { ok: false, error: 'bad json' }); }
            if (!j.game) return out(400, { ok: false, error: 'need {game}' });
            var cur = entry(j.game);
            if (j.staggerS != null) cur.staggerS = Math.max(0, Math.min(60, parseInt(j.staggerS, 10) || 0));
            if (j.frame != null && j.frame >= 0 && j.frame < 6) {
              var i = Math.floor(j.frame), f = cur.frames[i];
              if (j.items != null) f.items = j.items;
              if (j.order != null) f.order = j.order;
              if (j.intervalS != null) f.intervalS = j.intervalS;
              if (j.pinIdx != null) f.pinIdx = j.pinIdx;
              cur.frames[i] = normFrame(f);
            }
            DB.modes = DB.modes || {};
            DB.modes[j.game] = cur;
            save();
            try { state._imgSig = null; bump('playlists'); } catch (e) {}
            return out(200, { ok: true, game: j.game, cfg: cur });
          });
          return;
        }
        return out(405, { ok: false, error: 'method' });
      } catch (e) { out(500, { ok: false, error: String((e && e.message) || e) }); }
    });
    console.log('[playlists] ready — explicit per-frame playlists (variant policies retired)');
  } catch (e) { try { console.error('[playlists] init failed:', e && e.message); } catch (_) {} }
})();
/* ================= ROOMSCAPE EFFECTS EDITOR (2026-07-18) =================
   RS-EFFECTS v1.4 — persistence + APIs for user-editable effect buttons
   v1.4: per-effect gain (0-100 volume %) and maxS (1-120s cap; the fx.js
   SFX SHAPER fades out and stops the sound at the cap on every TV).
   v1.3: icon field sanitised (words typed into the icon box rendered HUGE on
   the Moments tiles — e.g. "✨ Omino"); any 2+ letter/digit run is stripped
   from icons on load AND save, falling back to ✨. Labels are untouched.
   The engine already exists (Social DLC: sfx + visual event + lights, fired to
   every TV via POST /api/social/<id>). This block makes the button list
   USER-EDITABLE and persistent:
     social-effects.json            <- your custom effects (overrides defaults)
     GET  /api/social-config        <- current effects list + whether custom
     (sound lists come from the app's NATIVE /api/sounds — v1 wrongly shadowed
      that endpoint and blinded the Sound tab; v1.1 leaves it untouched)
     v1.2: custom list held in this block's own closure + socialList() override —
      native settings reloads were wiping settings.social back to defaults.
     POST /api/social-config {effects:[...]} (empty list = restore defaults)
   Appended to conductor.js. */
;(function () {
  try {
    var fs = require('fs'), path = require('path');
    var FILE = (function(){ var d=(typeof APP_DIR!=='undefined'&&APP_DIR)||__dirname; var p1=path.join(d,'social-effects.json'), p0=path.join(__dirname,'social-effects.json'); try{ if(p1!==p0 && !fs.existsSync(p1) && fs.existsSync(p0)) fs.copyFileSync(p0,p1); }catch(e){} return p1; })() /* rs-storepaths v1 */;
    var EVENTS = { softflash: 1, bloom: 1, ignite: 1, lightning: 1, shake: 1 };
    function clean(list) {
      if (!Array.isArray(list)) return null;
      var seen = {}, out = [];
      list.slice(0, 24).forEach(function (b) {
        if (!b || !b.label) return;
        var id = String(b.id || b.label).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || ('fx' + out.length);
        while (seen[id]) id += 'x'; seen[id] = 1;
        var sfx = null;
        if (typeof b.sfx === 'string' && b.sfx) {
          if (/^synth:[a-z0-9_-]+$/i.test(b.sfx)) sfx = b.sfx;
          else if (/^sounds\/[^\0]{1,300}\.(mp3|wav|ogg|m4a)$/i.test(b.sfx) && b.sfx.indexOf('..') < 0) sfx = b.sfx;
        }
        var ev = (typeof b.event === 'string' && EVENTS[b.event]) ? b.event : null;
        var lights = null;
        if (b.lights && typeof b.lights === 'object') {
          if (b.lights.flash) lights = { flash: 1 };
          else if (b.lights.dip != null) {
            var d = Math.max(0.05, Math.min(0.95, parseFloat(b.lights.dip) || 0.35));
            var h = Math.max(1, Math.min(30, parseInt(b.lights.holdS, 10) || 3));
            lights = { dip: d, holdS: h };
          }
        }
        var ic = String(b.icon || '✨').slice(0, 8).replace(/[A-Za-z0-9]{2,}/g, '').trim() || '✨'; // v1.3: icons are emoji, not words
        var gain = null; if (b.gain != null) { var gv = parseInt(b.gain, 10); if (gv >= 0 && gv <= 100) gain = gv; }   // v1.4
        var maxS = null; if (b.maxS != null && b.maxS !== '') { var mv = parseFloat(b.maxS); if (mv >= 1 && mv <= 120) maxS = mv; }
        out.push({ id: id, label: String(b.label).slice(0, 24), icon: ic, sfx: sfx, event: ev, lights: lights, gain: gain, maxS: maxS });
      });
      return out;
    }
    // boot: load custom list into OUR closure (immune to native settings reloads)
    var CUSTOM = null;
    try {
      if (fs.existsSync(FILE)) {
        var saved = clean(JSON.parse(fs.readFileSync(FILE, 'utf8')));
        if (saved && saved.length) { CUSTOM = saved; console.log('[effects] loaded ' + saved.length + ' custom effect(s)'); }
      }
    } catch (e) { console.error('[effects] load failed:', e && e.message); }
    // override socialList so the custom set ALWAYS wins (native reloads can't wipe it)
    try {
      if (typeof socialList === 'function') {
        socialList = function () {
          var base = (CUSTOM && CUSTOM.length) ? CUSTOM
            : ((settings.social && settings.social.length) ? settings.social : DEFAULT_SOCIAL);
          var pm = (effProfile(state.game) || {}).moments;
          return (Array.isArray(pm) && pm.length) ? base.concat(pm.filter(function (m) { return m && m.id; })) : base;
        };
        console.log('[effects] socialList overridden (closure-backed)');
      }
    } catch (e) { console.error('[effects] socialList override failed:', e && e.message); }

    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var p = u.pathname;
      if (p !== '/api/social-config') return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; };
      res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      try {
        if (p === '/api/social-config') {
          if (req.method === 'GET') {
            var custom = !!(CUSTOM && CUSTOM.length);
            return out(200, { ok: true, custom: custom, effects: custom ? CUSTOM : DEFAULT_SOCIAL, events: Object.keys(EVENTS) });
          }
          if (req.method === 'POST') {
            var b = ''; var big = false;
            req.on('data', function (c) { b += c; if (b.length > 256 * 1024) { big = true; req.destroy(); } });
            req.on('end', function () {
              if (big) return out(400, { ok: false, error: 'too large' });
              var j; try { j = JSON.parse(b || '{}'); } catch (e) { return out(400, { ok: false, error: 'bad json' }); }
              var arr = clean(j.effects);
              if (arr === null) return out(400, { ok: false, error: 'need {effects:[...]}' });
              try { fs.writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8'); } catch (e) { return out(500, { ok: false, error: 'save failed' }); }
              CUSTOM = arr.length ? arr : null;
              console.log('[effects] saved ' + arr.length + ' effect(s)' + (arr.length ? '' : ' (defaults restored)'));
              return out(200, { ok: true, custom: !!arr.length, effects: arr.length ? arr : DEFAULT_SOCIAL });
            });
            return;
          }
          return out(405, { ok: false, error: 'method' });
        }
      } catch (e) { out(500, { ok: false, error: String((e && e.message) || e) }); }
    });
    console.log('[effects] ready — GET/POST /api/social-config (native /api/sounds untouched)');
  } catch (e) { try { console.error('[effects] init failed:', e && e.message); } catch (_) {} }
})();
/* ================= ROOMSCAPE PROFILES GUARD (2026-07-18) =================
   RS-PROFILES-GUARD v1.1 — stop stale browser tabs from silently deleting modes.
   v1.1: CRITICAL path fix — v1 anchored to __dirname, but the conductor stores
   profiles at PROFILES_FILE (APP_DIR-based, which differs under docker), so v1's
   gate compared against a non-existent file and never blocked, and snapshots
   never happened. Now uses the conductor's own PROFILES_FILE constant, and the
   history lives next to the real file (persistent share, survives container
   rebuilds). Also migrates social-effects/playlists/viz stores to APP_DIR.
   ROOT CAUSE it defends against: the Design draft-preview (pushDraft) POSTs the
   ENTIRE client-side profiles map to /api/profiles; the server replaces
   profiles.json wholesale. Any long-lived tab with a stale snapshot erases
   every mode created after it loaded, the moment its Design view is touched.
   (This is how the photo-frame modes + eyes/movingportraits/etc were lost.)
   What this block does:
   1. GATE: wraps the request listener chain. A POST /api/profiles whose map is
      missing >=2 existing modes is REJECTED (409) with a clear message telling
      the user to reload that tab. Single-mode deletes (the app's real delete
      flow) pass through. {"allowBulkDelete":true} in the payload overrides.
   2. HISTORY: _backups/profiles-history/ gets a timestamped snapshot of
      profiles.json before any write that adds/removes modes, hourly, on boot,
      and whenever a write is blocked. Capped at 200 snapshots.
   3. GET /api/profiles-history            -> list snapshots
      GET /api/profiles-history?file=NAME  -> snapshot content
   Appended to conductor.js (must stay AFTER all other listener blocks). */
;(function () {
  try {
    if (typeof server === 'undefined' || !server) { console.error('[pguard] no server — inactive'); return; }
    var fs = require('fs'), path = require('path'), EE = require('events');
    var PFILE = (typeof PROFILES_FILE !== 'undefined' && PROFILES_FILE) ||
                path.join((typeof APP_DIR !== 'undefined' && APP_DIR) || __dirname, 'profiles.json');
    var HDIR = path.join(path.dirname(PFILE), '_backups', 'profiles-history');
    try { console.log('[pguard] profiles file: ' + PFILE + (fs.existsSync(PFILE) ? ' (found)' : ' (MISSING — gate cannot work!)')); } catch (e) {}

    function snapshot(tag) {
      try {
        if (!fs.existsSync(PFILE)) return;
        fs.mkdirSync(HDIR, { recursive: true });
        var name = 'profiles-' + new Date().toISOString().replace(/[:.]/g, '-') + (tag ? ('-' + tag) : '') + '.json';
        fs.copyFileSync(PFILE, path.join(HDIR, name));
        var files = fs.readdirSync(HDIR).filter(function (f) { return /^profiles-/.test(f); }).sort();
        while (files.length > 200) { try { fs.unlinkSync(path.join(HDIR, files.shift())); } catch (e) { break; } }
      } catch (e) { console.error('[pguard] snapshot failed:', e && e.message); }
    }
    snapshot('boot');
    setInterval(function () { snapshot('hourly'); }, 3600000);

    function realIds(map) { return Object.keys(map || {}).filter(function (k) { return k.charAt(0) !== '_'; }); }
    function diskMap() {
      try { var j = JSON.parse(fs.readFileSync(PFILE, 'utf8')); return j.profiles || j; } catch (e) { return null; }
    }

    // capture the existing listener chain (native + earlier blocks, in order)
    var chain = server.listeners('request').slice();
    server.removeAllListeners('request');
    server.on('request', function (req, res) {
      var u = (req.url || '').split('?')[0];

      if (req.method === 'GET' && u === '/api/profiles-history') {
        try {
          var q = new URL(req.url, 'http://x').searchParams.get('file');
          if (q) {
            if (!/^profiles-[A-Za-z0-9._-]+\.json$/.test(q)) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end('{"ok":false,"error":"bad name"}'); }
            var fp = path.join(HDIR, q);
            if (!fs.existsSync(fp)) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"ok":false,"error":"not found"}'); }
            /* RS-REDACT v1: snapshots hold the full settings block — parse, strip
               music token, re-serialize. Unparseable snapshot = 500, never raw. */
            var snap = null;
            try { snap = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (pe) { snap = null; }
            if (!snap || typeof snap !== 'object') { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end('{"ok":false,"error":"snapshot unreadable"}'); }
            if (snap.settings) snap.settings = redactSettings(snap.settings);
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify(snap));
          }
          var list = [];
          try {
            list = fs.readdirSync(HDIR).filter(function (f) { return /^profiles-/.test(f); }).sort().reverse()
              .map(function (f) { var st = null; try { st = fs.statSync(path.join(HDIR, f)); } catch (e) {}
                return { file: f, bytes: st ? st.size : 0 }; });
          } catch (e) {}
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ ok: true, snapshots: list }));
        } catch (e) {
          try { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); } catch (x) {}
          return;
        }
      }

      if (req.method !== 'POST' || u !== '/api/profiles') {
        for (var i = 0; i < chain.length; i++) chain[i].call(server, req, res);
        return;
      }

      // gated path: buffer the body, decide, then replay into the native chain
      var chunks = [], size = 0, aborted = false;
      req.on('data', function (c) {
        chunks.push(c); size += c.length;
        if (size > 64 * 1024 * 1024) { aborted = true; try { req.destroy(); } catch (e) {} }
      });
      req.on('error', function () {});
      req.on('end', function () {
        if (aborted) return;
        var body = Buffer.concat(chunks);
        var incoming = null;
        try { var j = JSON.parse(body.toString('utf8')); incoming = (j && j.profiles && typeof j.profiles === 'object') ? j : null; } catch (e) {}
        if (incoming) {
          var cur = diskMap();
          if (cur) {
            var curIds = realIds(cur);
            var inSet = {}; Object.keys(incoming.profiles).forEach(function (k) { inSet[k] = 1; });
            var missing = curIds.filter(function (k) { return !inSet[k]; });
            if (missing.length >= 2 && incoming.allowBulkDelete !== true) {
              snapshot('blocked');
              console.error('[pguard] BLOCKED a /api/profiles write that would delete ' + missing.length + ' modes: ' + missing.join(', '));
              try {
                res.writeHead(409, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({
                  ok: false, blocked: true, missing: missing,
                  error: 'Save blocked: it would DELETE ' + missing.length + ' modes (' + missing.slice(0, 6).join(', ') + (missing.length > 6 ? '…' : '') + '). This tab is holding a stale copy — reload it (Ctrl+Shift+R). To genuinely delete these modes, save with "allowBulkDelete": true.'
                }));
              } catch (e) {}
              return;
            }
            // allowed write — snapshot first if the mode set changes at all
            var a = curIds.sort().join(','), b = realIds(incoming.profiles).sort().join(',');
            if (a !== b) snapshot('idchange');
          }
        }
        // replay to the native chain with a faithful stand-in request
        var fake = new EE();
        fake.method = req.method; fake.url = req.url; fake.headers = req.headers;
        fake.socket = req.socket; fake.connection = req.connection;
        fake.httpVersion = req.httpVersion; fake.rawHeaders = req.rawHeaders;
        fake.destroy = function () {}; fake.pause = function () {}; fake.resume = function () {};
        fake.setEncoding = function () {};
        fake.pipe = function (dest) { try { dest.write(body); dest.end(); } catch (e) {} return dest; };
        for (var i = 0; i < chain.length; i++) chain[i].call(server, fake, res);
        setImmediate(function () { try { fake.emit('data', body); fake.emit('end'); } catch (e) {} });
      });
    });
    console.log('[pguard] active — bulk-delete gate + profiles history (' + HDIR + ')');
  } catch (e) { try { console.error('[pguard] init failed:', e && e.message); } catch (x) {} }
})();

/* ================= ROOMSCAPE RULES SOUND (2026-07-18) =================
   RS-RULES-SOUND v1 — sound control for the Rules Wall tutorial videos.
   The centre-screen YouTube embeds were hard-muted (mute=1 in frame.html), so
   tutorials were silent and "not very useful". This block adds:
     POST /api/rules/sound {on, frame:'L1'..'R3'|'both'} -> set where sound plays
     GET  /api/rules/state  -> response is intercepted and merged with
                               { sound:{on,frame} }; ts is offset by a revision
                               counter so every sound change re-renders the wall
                               overlays (they diff on game|ts).
   frame.html's overlay (patched separately) reads st.sound and drops mute=1 on
   the chosen TV. Default: off. One TV at a time is recommended — two embeds
   never start in perfect sync, so 'both' can echo.
   Loads AFTER the rules handler so its prepend-listener runs FIRST and can
   wrap res before the downstream handler answers. Appended to conductor.js. */
;(function () {
  try {
    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    var SND = { on: false, frame: 'L2' }, REV = 0;
    var OKF = { L1: 1, L2: 1, L3: 1, R1: 1, R2: 1, R3: 1, both: 1 };

    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var p = u.pathname;

      if (p === '/api/rules/sound' && req.method === 'POST') {
        var W = res.writeHead.bind(res), E = res.end.bind(res);
        res.writeHead = res.setHeader = function () { return res; };
        res.write = res.end = function () { return true; };
        var b = '';
        req.on('data', function (c) { b += c; if (b.length > 65536) { try { req.destroy(); } catch (e) {} } });
        req.on('end', function () {
          var j; try { j = JSON.parse(b || '{}'); } catch (e) { j = {}; }
          var f = (j.frame && OKF[j.frame]) ? j.frame : SND.frame;
          SND = { on: !!j.on, frame: f }; REV++;
          try { console.log('[rules-sound] ' + (SND.on ? ('ON @ ' + SND.frame) : 'off')); } catch (e) {}
          try { W(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify({ ok: true, sound: SND })); } catch (e) {}
        });
        req.on('error', function () {});
        return;
      }

      if (p === '/api/rules/state' && req.method === 'GET') {
        // let the downstream rules handler answer, but merge our sound state in
        var W2 = res.writeHead.bind(res), E2 = res.end.bind(res);
        var code = 200, hdrs = null;
        res.writeHead = function (c, h) { code = c || 200; hdrs = h || hdrs; return res; };
        res.setHeader = function () { return res; };
        res.write = function () { return true; };
        res.end = function (body) {
          var out = body;
          try {
            var j = JSON.parse(String(body || '{}'));
            j.sound = SND;
            if (typeof j.ts === 'number') j.ts = j.ts + REV; // sound flips re-render the wall
            out = JSON.stringify(j);
          } catch (e) {}
          try { W2(code, hdrs || { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); } catch (e) {}
          try { E2(out); } catch (e) {}
          return true;
        };
        return; // NOT neutered — downstream still runs, answering through the wrapper
      }
    });
    console.log('[rules-sound] ready — POST /api/rules/sound {on,frame}; /api/rules/state merged');
  } catch (e) { try { console.error('[rules-sound] init failed:', e && e.message); } catch (_) {} }
})();
/* ================= ROOMSCAPE RULES EDIT (2026-07-18) =================
   RS-RULES-EDIT v1 — backend for the 📖 Rules design lens.
     POST /api/rules/edit {game, rec} -> update that game's record in
       rules-data.json (name/players/time/setup/turn/win/tips/videoId/pdfUrl/
       speed 0.25-2/layout {L1..R3: video|setup|turn|win|tips|none}); every
       write first snapshots the file to _backups/rules-history/ (keep 50).
     GET  /api/rules/state -> response intercepted; when a game is showing,
       its layout + speed are merged in and ts is offset by an edit revision
       so the wall overlays re-render immediately after a save.
   Composes with RS-RULES-SOUND (each wraps res.end; merges chain cleanly).
   Appended to conductor.js AFTER the rules + rules-sound blocks. */
;(function () {
  try {
    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    var fs = require('fs'), path = require('path');
    var BASE = (typeof APP_DIR !== 'undefined' && APP_DIR) || __dirname;
    var FILE = path.join(BASE, 'rules-data.json');
    var REV = 0;
    var ROLES = { video: 1, setup: 1, turn: 1, win: 1, tips: 1, none: 1 };
    var FRAMES = LAYOUT.frames;   // v2.62: single source of truth
    var TXT = ['name', 'players', 'time', 'setup', 'turn', 'win', 'tips'];
    var cache = { t: 0, data: null };
    function readAll() {
      var now = Date.now();
      if (cache.data && (now - cache.t) < 2000) return cache.data;
      var d; try { d = JSON.parse(fs.readFileSync(FILE, 'utf8')) || { games: {} }; } catch (e) { d = { games: {} }; }
      cache = { t: now, data: d };
      return d;
    }
    function gamesOf(d) { return (d && (d.games || d.rules || d)) || {}; }

    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var p = u.pathname;

      if (p === '/api/rules/edit' && req.method === 'POST') {
        var W = res.writeHead.bind(res), E = res.end.bind(res);
        res.writeHead = res.setHeader = function () { return res; };
        res.write = res.end = function () { return true; };
        function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
        var b = '';
        req.on('data', function (c) { b += c; if (b.length > 512 * 1024) { try { req.destroy(); } catch (e) {} } });
        req.on('end', function () {
          var j; try { j = JSON.parse(b || '{}'); } catch (e) { return out(400, { ok: false, error: 'bad json' }); }
          var game = String(j.game || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
          if (!game) return out(400, { ok: false, error: 'need {game}' });
          var rec = j.rec;
          if (!rec || typeof rec !== 'object') return out(400, { ok: false, error: 'need {rec}' });
          var all = readAll();
          var games = gamesOf(all);
          var curRec = games[game] || {};
          TXT.forEach(function (k) { if (typeof rec[k] === 'string') curRec[k] = rec[k].slice(0, k === 'name' ? 80 : 4000); });
          if ('videoId' in rec) { var v = String(rec.videoId || ''); curRec.videoId = /^[A-Za-z0-9_-]{6,20}$/.test(v) ? v : null; }
          if ('pdfUrl' in rec) { var pu = String(rec.pdfUrl || '').slice(0, 500); curRec.pdfUrl = /^https?:\/\//i.test(pu) ? pu : null; }
          if ('speed' in rec) { var sp = parseFloat(rec.speed); curRec.speed = (sp >= 0.25 && sp <= 2) ? sp : 1; }
          if ('layout' in rec) {
            var L = rec.layout, outL = null;
            if (L && typeof L === 'object') {
              outL = {};
              FRAMES.forEach(function (f) { if (L[f] && ROLES[L[f]]) outL[f] = L[f]; });
              if (!Object.keys(outL).length) outL = null;
            }
            curRec.layout = outL;
          }
          if (!curRec.name) curRec.name = game;
          games[game] = curRec;
          var payload = all.games ? all : (all.rules ? all : games);
          if (all.games) all.games = games; else if (all.rules) all.rules = games;
          try {
            var bdir = path.join(BASE, '_backups', 'rules-history');
            fs.mkdirSync(bdir, { recursive: true });
            if (fs.existsSync(FILE)) fs.copyFileSync(FILE, path.join(bdir, 'rules-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'));
            var old = fs.readdirSync(bdir).filter(function (f) { return /^rules-/.test(f); }).sort();
            while (old.length > 50) { try { fs.unlinkSync(path.join(bdir, old.shift())); } catch (e) { break; } }
          } catch (e) {}
          try { fs.writeFileSync(FILE, JSON.stringify(payload, null, 2), 'utf8'); } catch (e) { return out(500, { ok: false, error: 'save failed: ' + (e && e.message) }); }
          cache = { t: 0, data: null };
          REV++;
          try { console.log('[rules-edit] saved ' + game); } catch (e) {}
          return out(200, { ok: true, game: game, rec: curRec });
        });
        req.on('error', function () {});
        return;
      }

      if (p === '/api/rules/state' && req.method === 'GET') {
        var W2 = res.writeHead.bind(res), E2 = res.end.bind(res);
        var code = 200, hdrs = null;
        res.writeHead = function (c, h) { code = c || 200; hdrs = h || hdrs; return res; };
        res.setHeader = function () { return res; };
        res.write = function () { return true; };
        res.end = function (body) {
          var out2 = body;
          try {
            var j2 = JSON.parse(String(body || '{}'));
            if (j2 && j2.show && j2.game) {
              var r2 = gamesOf(readAll())[j2.game];
              if (r2) { j2.layout = r2.layout || null; j2.speed = (typeof r2.speed === 'number') ? r2.speed : 1; }
            }
            if (typeof j2.ts === 'number') j2.ts = j2.ts + (REV * 7); // *7 so it can't collide with the sound block's +1s
            out2 = JSON.stringify(j2);
          } catch (e) {}
          try { W2(code, hdrs || { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); } catch (e) {}
          try { E2(out2); } catch (e) {}
          return true;
        };
        return;
      }
    });
    console.log('[rules-edit] ready — POST /api/rules/edit; state merged with layout/speed');
  } catch (e) { try { console.error('[rules-edit] init failed:', e && e.message); } catch (_) {} }
})();
/* ================= ROOMSCAPE MUSIC VIZ STORE (2026-07-18) =================
   RS-MUSIC-VIZ-STORE v1 — per-mode music-visualizer config.
   viz.json { modes: { <game>: { on, style, frames:'all'|[L1..R3], color:'auto'|#hex,
   sens 0.4-2.5, shuffleMin 1-60, nowPlaying bool } } } — its own file (like
   playlists.json) so the profiles draft/save flow and the profiles guard
   never touch it.
     GET  /api/viz             -> whole store
     GET  /api/viz?game=<id>   -> { ok, viz } for that mode (null if none)
     POST /api/viz {game, viz} -> validate + save (viz:null deletes the entry)
   Appended to conductor.js. */
;(function () {
  try {
    var fs = require('fs'), path = require('path');
    var FILE = (function(){ var d=(typeof APP_DIR!=='undefined'&&APP_DIR)||__dirname; var p1=path.join(d,'viz.json'), p0=path.join(__dirname,'viz.json'); try{ if(p1!==p0 && !fs.existsSync(p1) && fs.existsSync(p0)) fs.copyFileSync(p0,p1); }catch(e){} return p1; })() /* rs-storepaths v1 */;
    var STYLES = { cathedral: 1, ribbon: 1, fountain: 1, aurora: 1, pond: 1, vinyl: 1, mandala: 1, fireflies: 1, skyline: 1, fireplace: 1, wave: 1, stadium: 1, beatsweep: 1, constellation: 1, shuffle: 1 };
    var FRAMES = { L1: 1, L2: 1, L3: 1, R1: 1, R2: 1, R3: 1 };
    function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { modes: {} }; } catch (e) { return { modes: {} }; } }
    function saveStore(st) {
      try { if (fs.existsSync(FILE)) fs.copyFileSync(FILE, FILE + '.bak'); } catch (e) {}
      fs.writeFileSync(FILE, JSON.stringify(st, null, 2), 'utf8');
    }
    function cleanViz(v) {
      if (!v || typeof v !== 'object') return null;
      var out = { on: !!v.on };
      out.style = (typeof v.style === 'string' && STYLES[v.style]) ? v.style : 'cathedral';
      if (v.frames === 'all' || v.frames == null) out.frames = 'all';
      else if (Array.isArray(v.frames)) {
        var f = v.frames.filter(function (x) { return FRAMES[x]; });
        out.frames = f.length ? f : 'all';
      } else out.frames = 'all';
      out.color = (typeof v.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.color)) ? v.color : 'auto';
      var s = parseFloat(v.sens); out.sens = (s >= 0.4 && s <= 2.5) ? s : 1;
      var m = parseInt(v.shuffleMin, 10); out.shuffleMin = (m >= 1 && m <= 60) ? m : 5;
      out.nowPlaying = v.nowPlaying !== false;
      return out;
    }
    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      if (u.pathname !== '/api/viz') return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; };
      res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      try {
        if (req.method === 'GET') {
          var st = load();
          var g = u.searchParams.get('game');
          if (g) return out(200, { ok: true, game: g, viz: (st.modes || {})[g] || null });
          return out(200, { ok: true, modes: st.modes || {} });
        }
        if (req.method === 'POST') {
          var b = '';
          req.on('data', function (c) { b += c; if (b.length > 64 * 1024) { try { req.destroy(); } catch (e) {} } });
          req.on('end', function () {
            var j; try { j = JSON.parse(b || '{}'); } catch (e) { return out(400, { ok: false, error: 'bad json' }); }
            var game = String(j.game || '').slice(0, 60);
            if (!game) return out(400, { ok: false, error: 'need {game}' });
            var st2 = load(); st2.modes = st2.modes || {};
            if (j.viz === null) { delete st2.modes[game]; }
            else {
              var v = cleanViz(j.viz);
              if (!v) return out(400, { ok: false, error: 'need {viz}' });
              st2.modes[game] = v;
            }
            try { saveStore(st2); } catch (e) { return out(500, { ok: false, error: 'save failed: ' + (e && e.message) }); }
            try { console.log('[viz] saved ' + game); } catch (e) {}
            return out(200, { ok: true, game: game, viz: st2.modes[game] || null });
          });
          req.on('error', function () {});
          return;
        }
        return out(405, { ok: false, error: 'method' });
      } catch (e) { out(500, { ok: false, error: String((e && e.message) || e) }); }
    });
    console.log('[viz] ready — GET/POST /api/viz (music visualizer config)');
  } catch (e) { try { console.error('[viz] init failed:', e && e.message); } catch (_) {} }
})();

/* ================= ROOMSCAPE PROFILES TIME MACHINE (2026-07-19) =================
   RS-TIMEMACHINE v1.1 — recover reverted mode edits from the native backups.
   The conductor's /api/profiles POST handler has always called
   backupFile(PROFILES_FILE) before every write, so _backups/ holds a
   timestamped profiles.json.<ISO>.bak for EVERY save and preview push.
   This block exposes that history + a surgical restore + a way to bank the
   still-good copy living in another PC's long-lived browser tab:
     GET  /api/profiles-baks            -> { ok, baks:[{file,bytes,t}] } newest first
     GET  /api/profiles-baks?file=NAME  -> that backup's JSON
     GET  /api/profiles-live            -> current on-disk profiles store
     POST /api/profiles-capture         -> body = a full profiles payload (as the
          app would POST it); saved as _backups/profiles.json.tabcapture-<ts>.bak
          WITHOUT touching the live store. Used by the paste-into-console
          snippet on the Time Machine page to milk a stale-but-richer tab.
     POST /api/profiles-restore {file, modes:[ids]} ->
          merge those modes from the backup into the CURRENT store by POSTing
          the merged map through the native /api/profiles handler (so the
          in-memory copy, broadcast, guard and backup chain all run normally).
     GET  /profiles-timemachine.html    -> console UI (embedded, no file deps)
   Appended to conductor.js. Uses prependListener + res-neutering (standard
   post-guard pattern). */
;(function () {
  try {
    var fs = require('fs'), path = require('path'), http = require('http');
    var PF = (typeof PROFILES_FILE !== 'undefined' && PROFILES_FILE) ||
             path.join((typeof APP_DIR !== 'undefined' && APP_DIR) || __dirname, 'profiles.json');
    var BDIR = (typeof BACKUP_DIR !== 'undefined' && BACKUP_DIR) || path.join(path.dirname(PF), '_backups');
    var OK_RE = /^profiles\.json\.[A-Za-z0-9._-]+\.bak$/;
    var SELF_PORT = (typeof PORT !== 'undefined' && PORT) || 8093;
    var TM_HTML = Buffer.from('PCFkb2N0eXBlIGh0bWw+CjxodG1sPjxoZWFkPjxtZXRhIGNoYXJzZXQ9InV0Zi04Ij48dGl0bGU+Um9vbVNjYXBlIOKAlCBQcm9maWxlcyBUaW1lIE1hY2hpbmU8L3RpdGxlPgo8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLGluaXRpYWwtc2NhbGU9MSI+CjxzdHlsZT4KICA6cm9vdCB7IC0tYmc6IzBlMTExNjsgLS1jYXJkOiMxNzFjMjQ7IC0tbGluZTojMjUyYzM4OyAtLXR4OiNkYmUzZWU7IC0tZGltOiM4Yjk3YTg7IC0tYWNjOiM0ZGEzZmY7IC0tb2s6IzM3YzI2ZTsgLS13YXJuOiNlOGEzM2Q7IC0tYmFkOiNlMDUyNTI7IH0KICAqIHsgYm94LXNpemluZzpib3JkZXItYm94OyB9CiAgYm9keSB7IG1hcmdpbjowOyBiYWNrZ3JvdW5kOnZhcigtLWJnKTsgY29sb3I6dmFyKC0tdHgpOyBmb250OjE1cHgvMS41IHN5c3RlbS11aSxTZWdvZSBVSSxzYW5zLXNlcmlmOyB9CiAgLndyYXAgeyBtYXgtd2lkdGg6MTIwMHB4OyBtYXJnaW46MCBhdXRvOyBwYWRkaW5nOjIycHggMThweCA4MHB4OyB9CiAgaDEgeyBmb250LXNpemU6MjJweDsgbWFyZ2luOjAgMCA0cHg7IH0gaDEgc3Bhbntjb2xvcjp2YXIoLS1hY2MpfQogIC5zdWIgeyBjb2xvcjp2YXIoLS1kaW0pOyBtYXJnaW4tYm90dG9tOjE4cHg7IH0KICAuY2FyZCB7IGJhY2tncm91bmQ6dmFyKC0tY2FyZCk7IGJvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7IGJvcmRlci1yYWRpdXM6MTJweDsgcGFkZGluZzoxNnB4IDE4cHg7IG1hcmdpbi1ib3R0b206MTZweDsgfQogIC5jYXJkIGgyIHsgbWFyZ2luOjAgMCA4cHg7IGZvbnQtc2l6ZToxNnB4OyB9CiAgYnV0dG9uIHsgYmFja2dyb3VuZDojMjAzMDRhOyBjb2xvcjp2YXIoLS10eCk7IGJvcmRlcjoxcHggc29saWQgIzMzNTA3YzsgYm9yZGVyLXJhZGl1czo4cHg7IHBhZGRpbmc6N3B4IDE0cHg7IGN1cnNvcjpwb2ludGVyOyBmb250OmluaGVyaXQ7IH0KICBidXR0b246aG92ZXIgeyBiYWNrZ3JvdW5kOiMyODQwNWY7IH0KICBidXR0b24ucHJpIHsgYmFja2dyb3VuZDojMWQ1YzM3OyBib3JkZXItY29sb3I6IzJjOTQ1NzsgfSBidXR0b24ucHJpOmhvdmVyeyBiYWNrZ3JvdW5kOiMyNDcyNDc7IH0KICBidXR0b246ZGlzYWJsZWQgeyBvcGFjaXR5Oi40NTsgY3Vyc29yOmRlZmF1bHQ7IH0KICBwcmUuc25pcHBldCB7IGJhY2tncm91bmQ6IzBhMGQxMjsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTsgYm9yZGVyLXJhZGl1czo4cHg7IHBhZGRpbmc6MTJweDsgb3ZlcmZsb3c6YXV0bzsgZm9udC1zaXplOjEycHg7IG1heC1oZWlnaHQ6MTgwcHg7IHdoaXRlLXNwYWNlOnByZTsgfQogIHRhYmxlIHsgYm9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlOyB3aWR0aDoxMDAlOyBmb250LXNpemU6MTRweDsgfQogIHRoLHRkIHsgdGV4dC1hbGlnbjpsZWZ0OyBwYWRkaW5nOjZweCAxMHB4OyBib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1saW5lKTsgdmVydGljYWwtYWxpZ246dG9wOyB9CiAgdHIuYmFrIHsgY3Vyc29yOnBvaW50ZXI7IH0gdHIuYmFrOmhvdmVyIHRkIHsgYmFja2dyb3VuZDojMWMyMzMwOyB9CiAgdHIuc2VsIHRkIHsgYmFja2dyb3VuZDojMWQyYTNmICFpbXBvcnRhbnQ7IH0KICAudGFnIHsgZGlzcGxheTppbmxpbmUtYmxvY2s7IHBhZGRpbmc6MXB4IDhweDsgYm9yZGVyLXJhZGl1czoyMHB4OyBmb250LXNpemU6MTJweDsgbWFyZ2luLWxlZnQ6NnB4OyB9CiAgLnRhZy5jYXAgeyBiYWNrZ3JvdW5kOiMzZDJmMTI7IGNvbG9yOnZhcigtLXdhcm4pOyBib3JkZXI6MXB4IHNvbGlkICM2YjUxMWI7IH0KICAudGFnLm5ldyB7IGJhY2tncm91bmQ6IzEyMzIxZjsgY29sb3I6dmFyKC0tb2spOyB9CiAgLnRhZy5jaGcgeyBiYWNrZ3JvdW5kOiMzMzI3MGY7IGNvbG9yOnZhcigtLXdhcm4pOyB9CiAgLmRpbSB7IGNvbG9yOnZhcigtLWRpbSk7IH0gLm9re2NvbG9yOnZhcigtLW9rKX0gLndhcm57Y29sb3I6dmFyKC0td2Fybil9IC5iYWR7Y29sb3I6dmFyKC0tYmFkKX0KICAjc3RhdHVzIHsgcG9zaXRpb246Zml4ZWQ7IGxlZnQ6MDsgcmlnaHQ6MDsgYm90dG9tOjA7IGJhY2tncm91bmQ6IzEwMTcyNDsgYm9yZGVyLXRvcDoxcHggc29saWQgdmFyKC0tbGluZSk7IHBhZGRpbmc6OXB4IDE4cHg7IGZvbnQtc2l6ZToxNHB4OyB9CiAgLnJvdzIgeyBkaXNwbGF5OmZsZXg7IGdhcDoxNnB4OyBmbGV4LXdyYXA6d3JhcDsgfSAucm93Mj5kaXZ7IGZsZXg6MSAxIDQ4MHB4OyBtaW4td2lkdGg6MDsgfQogIHVsLmNoZyB7IG1hcmdpbjoycHggMCAwOyBwYWRkaW5nLWxlZnQ6MThweDsgY29sb3I6dmFyKC0tZGltKTsgZm9udC1zaXplOjEycHg7IH0KICAuc2Nyb2xsIHsgbWF4LWhlaWdodDo0MjBweDsgb3ZlcmZsb3c6YXV0bzsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTsgYm9yZGVyLXJhZGl1czo4cHg7IH0KICBpbnB1dFt0eXBlPWNoZWNrYm94XXsgdHJhbnNmb3JtOnNjYWxlKDEuMik7IH0KICAuc3RlcHMgbGl7IG1hcmdpbi1ib3R0b206NnB4OyB9Cjwvc3R5bGU+PC9oZWFkPgo8Ym9keT48ZGl2IGNsYXNzPSJ3cmFwIj4KICA8aDE+4o+qIFByb2ZpbGVzIDxzcGFuPlRpbWUgTWFjaGluZTwvc3Bhbj48L2gxPgogIDxkaXYgY2xhc3M9InN1YiI+RXZlcnkgc2F2ZSB0aGUgd2FsbCBoYXMgZXZlciBtYWRlIGlzIGtlcHQgaW4gPGNvZGU+X2JhY2t1cHMvPC9jb2RlPi4gUGljayBhIGJhY2t1cCwgc2VlIGV4YWN0bHkgd2hpY2ggbW9kZXMgZGlmZmVyIGZyb20gd2hhdCdzIGxpdmUgbm93LCBhbmQgcmVzdG9yZSBqdXN0IHRob3NlIOKAlCBub3RoaW5nIGVsc2UgaXMgdG91Y2hlZCwgYW5kIHRoZSByZXN0b3JlIGl0c2VsZiBpcyBzYXZlZCB0aHJvdWdoIHRoZSBub3JtYWwgKGd1YXJkZWQsIGJhY2tlZC11cCkgcGlwZWxpbmUuPC9kaXY+CgogIDxkaXYgY2xhc3M9ImNhcmQiPgogICAgPGgyPvCfk6UgU3RlcCAwIOKAlCBiYW5rIHRoZSBnb29kIGNvcHkgZnJvbSB5b3VyIG90aGVyIFBDIChkbyB0aGlzIGZpcnN0ISk8L2gyPgogICAgPGRpdiBjbGFzcz0iZGltIiBzdHlsZT0ibWFyZ2luLWJvdHRvbTo4cHgiPklmIGFub3RoZXIgUEMgc3RpbGwgPGI+c2hvd3MgeW91ciBlZGl0czwvYj4gKHdpbmRvdyBmcmFtZXMsIHNlYXNvbiB2aWV3c+KApiksIHRoYXQgdGFiIGlzIGhvbGRpbmcgdGhlbSBpbiBtZW1vcnkuIDxiIGNsYXNzPSJ3YXJuIj5EbyBOT1QgcmVsb2FkIG9yIGNsb3NlIHRoYXQgdGFiLCBhbmQgZG8gTk9UIHByZXNzIFNhdmUgdGhlcmU8L2I+IOKAlCBhIHBsYWluIHNhdmUgd291bGQgb3ZlcndyaXRlIGV2ZXJ5dGhpbmcgbmV3ZXIgZnJvbSB0aGlzIHNpZGUuIEluc3RlYWQsIG9uIHRoYXQgUEM6PC9kaXY+CiAgICA8b2wgY2xhc3M9InN0ZXBzIj4KICAgICAgPGxpPlByZXNzIDxiPkYxMjwvYj4gaW4gdGhhdCB0YWIg4oaSIDxiPkNvbnNvbGU8L2I+IHRhYi48L2xpPgogICAgICA8bGk+Q2xpY2sgPGJ1dHRvbiBvbmNsaWNrPSJjb3B5U25pcCgpIj5Db3B5IGNhcHR1cmUgc2NyaXB0PC9idXR0b24+IGFuZCBwYXN0ZSBpdCBpbnRvIHRoZSBjb25zb2xlLCBwcmVzcyBFbnRlci48L2xpPgogICAgICA8bGk+TnVkZ2UgPGI+YW55PC9iPiBjb250cm9sIGluIHRoZSBEZXNpZ24gcGFuZWwgKG1vdmUgYSBzbGlkZXIgb25lIG5vdGNoIOKAlCBpdCBkb2Vzbid0IG1hdHRlciB3aGljaCwgbm90aGluZyB3aWxsIGJlIHNhdmVkIHRvIHRoZSB3YWxsKS48L2xpPgogICAgICA8bGk+QSBncmVlbiDigJzinJQgQ2FwdHVyZWQg4oCm4oCdIGJveCBhcHBlYXJzIOKAlCB0aGUgdGFiJ3MgZnVsbCBjb3B5IGlzIG5vdyBiYW5rZWQgYXMgYSBiYWNrdXAgYmVsb3cgKHByZXNzIDxiPuKfsyBSZWZyZXNoPC9iPiBoZXJlKS4gVGhlbiBkaWZmICsgcmVzdG9yZSBpdCBsaWtlIGFueSBvdGhlciBiYWNrdXAuPC9saT4KICAgIDwvb2w+CiAgICA8cHJlIGNsYXNzPSJzbmlwcGV0IiBpZD0ic25pcCI+PC9wcmU+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9ImNhcmQiPgogICAgPGgyPvCfl4IgQmFja3VwcyA8c3BhbiBjbGFzcz0iZGltIiBpZD0iYmNvdW50Ij48L3NwYW4+CiAgICAgIDxzcGFuIHN0eWxlPSJmbG9hdDpyaWdodCI+PGJ1dHRvbiBvbmNsaWNrPSJsb2FkQmFrcygpIj7in7MgUmVmcmVzaDwvYnV0dG9uPgogICAgICA8YnV0dG9uIG9uY2xpY2s9InNjYW5Ub3AoKSIgaWQ9InNjYW5idG4iPvCflI4gU2NhbiBuZXdlc3QgMjUgdnMgbGl2ZTwvYnV0dG9uPjwvc3Bhbj48L2gyPgogICAgPGRpdiBjbGFzcz0ic2Nyb2xsIj48dGFibGUgaWQ9ImJha3RibCI+PHRoZWFkPjx0cj48dGg+V2hlbjwvdGg+PHRoPkZpbGU8L3RoPjx0aD5TaXplPC90aD48dGg+dnMgbGl2ZTwvdGg+PC90cj48L3RoZWFkPjx0Ym9keSBpZD0iYmFrYm9keSI+PHRyPjx0ZCBjb2xzcGFuPSI0IiBjbGFzcz0iZGltIj5Mb2FkaW5n4oCmPC90ZD48L3RyPjwvdGJvZHk+PC90YWJsZT48L2Rpdj4KICA8L2Rpdj4KCiAgPGRpdiBjbGFzcz0iY2FyZCIgaWQ9ImRpZmZjYXJkIiBzdHlsZT0iZGlzcGxheTpub25lIj4KICAgIDxoMj7wn5SNIERpZmZlcmVuY2VzIGluIDxzcGFuIGlkPSJkZmlsZSIgY2xhc3M9Indhcm4iPjwvc3Bhbj48L2gyPgogICAgPGRpdiBjbGFzcz0iZGltIiBpZD0iZHN1bSIgc3R5bGU9Im1hcmdpbi1ib3R0b206OHB4Ij48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNjcm9sbCI+PHRhYmxlPjx0aGVhZD48dHI+PHRoIHN0eWxlPSJ3aWR0aDozNHB4Ij48aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSJzZWxhbGwiIG9uY2hhbmdlPSJzZWxBbGwodGhpcy5jaGVja2VkKSI+PC90aD48dGg+TW9kZTwvdGg+PHRoPlN0YXR1czwvdGg+PHRoPldoYXQgZGlmZmVycyAodG9wLWxldmVsKTwvdGg+PC90cj48L3RoZWFkPjx0Ym9keSBpZD0iZGlmZmJvZHkiPjwvdGJvZHk+PC90YWJsZT48L2Rpdj4KICAgIDxkaXYgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+CiAgICAgIDxidXR0b24gY2xhc3M9InByaSIgaWQ9InJlc3RvcmVidG4iIG9uY2xpY2s9ImRvUmVzdG9yZSgpIj7ij6ogUmVzdG9yZSBzZWxlY3RlZCBtb2RlcyBmcm9tIHRoaXMgYmFja3VwPC9idXR0b24+CiAgICAgIDxzcGFuIGNsYXNzPSJkaW0iPk9ubHkgdGlja2VkIG1vZGVzIGFyZSBvdmVyd3JpdHRlbiB3aXRoIHRoZSBiYWNrdXAncyB2ZXJzaW9uLiBNb2RlcyB0aGF0IGV4aXN0IG9ubHkgaW4gdGhlIGxpdmUgc3RvcmUgYXJlIG5ldmVyIGRlbGV0ZWQuPC9zcGFuPgogICAgPC9kaXY+CiAgPC9kaXY+CjwvZGl2Pgo8ZGl2IGlkPSJzdGF0dXMiIGNsYXNzPSJkaW0iPlJlYWR5LjwvZGl2Pgo8c2NyaXB0PgondXNlIHN0cmljdCc7CnZhciBTTklQID0gIihmdW5jdGlvbigpe1xuICBpZiAod2luZG93Ll9fcnNDYXApIHsgY29uc29sZS5sb2coJ2NhcHR1cmUgYWxyZWFkeSBhcm1lZCcpOyByZXR1cm47IH1cbiAgd2luZG93Ll9fcnNDYXAgPSAxO1xuICBmdW5jdGlvbiBub3RlKGope1xuICAgIHZhciBkPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGQuc3R5bGUuY3NzVGV4dD0ncG9zaXRpb246Zml4ZWQ7cmlnaHQ6MTRweDtib3R0b206MTRweDt6LWluZGV4OjIxNDc0ODM2NDc7cGFkZGluZzoxNnB4IDIwcHg7Ym9yZGVyLXJhZGl1czoxMHB4O2ZvbnQ6MTRweCBzeXN0ZW0tdWk7Y29sb3I6I2ZmZjtib3gtc2hhZG93OjAgNnB4IDI0cHggcmdiYSgwLDAsMCwuNSk7YmFja2dyb3VuZDonKyhqJiZqLm9rPycjMWQ3YTQ0JzonI2EzMycpO1xuICAgIGQudGV4dENvbnRlbnQgPSBqJiZqLm9rID8gKCdcXHUyNzE0IENhcHR1cmVkICcrai5tb2RlcysnIG1vZGVzIHNhZmVseSB0byAnK2ouZmlsZSsnLiBOb3RoaW5nIHdhcyBzYXZlZCB0byB0aGUgd2FsbC4gTGVhdmUgdGhpcyB0YWIgYWxvbmUgdW50aWwgdGhlIHJlc3RvcmUgaXMgZG9uZS4nKSA6ICgnXFx1MjcxNiBDYXB0dXJlIGZhaWxlZDogJysoKGomJmouZXJyb3IpfHwndW5rbm93bicpKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGQpOyBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dHJ5e2QucmVtb3ZlKCl9Y2F0Y2goZSl7fX0sIDMwMDAwKTtcbiAgfVxuICBmdW5jdGlvbiBiYW5rKGJvZHkpe1xuICAgIHZhciB4PW5ldyBYTUxIdHRwUmVxdWVzdCgpOyB4Lm9wZW4oJ1BPU1QnLCcvYXBpL3Byb2ZpbGVzLWNhcHR1cmUnKTtcbiAgICB4LnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICB4Lm9ubG9hZD1mdW5jdGlvbigpeyB0cnl7bm90ZShKU09OLnBhcnNlKHgucmVzcG9uc2VUZXh0KSl9Y2F0Y2goZSl7bm90ZSh7b2s6ZmFsc2UsZXJyb3I6J2JhZCByZXNwb25zZSd9KX0gfTtcbiAgICB4Lm9uZXJyb3I9ZnVuY3Rpb24oKXsgbm90ZSh7b2s6ZmFsc2UsZXJyb3I6J25ldHdvcmsnfSkgfTtcbiAgICB4LnNlbmQoYm9keSk7XG4gIH1cbiAgdmFyIE9GID0gd2luZG93LmZldGNoICYmIHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdyk7XG4gIGlmIChPRikgd2luZG93LmZldGNoID0gZnVuY3Rpb24odSxvKXtcbiAgICB2YXIgcyA9IFN0cmluZygodSYmdS51cmwpfHx1fHwnJyk7XG4gICAgaWYgKG8gJiYgU3RyaW5nKG8ubWV0aG9kfHwnJykudG9VcHBlckNhc2UoKT09PSdQT1NUJyAmJiAvXFwvYXBpXFwvcHJvZmlsZXMoXFw/fCQpLy50ZXN0KHMpKSB7XG4gICAgICB3aW5kb3cuZmV0Y2ggPSBPRjsgd2luZG93Ll9fcnNDYXAgPSAwOyBiYW5rKG8uYm9keSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBSZXNwb25zZSgne1wib2tcIjp0cnVlfScse3N0YXR1czoyMDAsaGVhZGVyczp7J0NvbnRlbnQtVHlwZSc6J2FwcGxpY2F0aW9uL2pzb24nfX0pKTtcbiAgICB9XG4gICAgcmV0dXJuIE9GKHUsbyk7XG4gIH07XG4gIHZhciBYTz1YTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUub3BlbiwgWFM9WE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLnNlbmQ7XG4gIFhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5vcGVuPWZ1bmN0aW9uKG0sdSl7IHRoaXMuX191PVN0cmluZyh1fHwnJyk7IHRoaXMuX19tPVN0cmluZyhtfHwnJykudG9VcHBlckNhc2UoKTsgcmV0dXJuIFhPLmFwcGx5KHRoaXMsYXJndW1lbnRzKTsgfTtcbiAgWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLnNlbmQ9ZnVuY3Rpb24oYil7XG4gICAgaWYgKHRoaXMuX19tPT09J1BPU1QnICYmIC9cXC9hcGlcXC9wcm9maWxlcyhcXD98JCkvLnRlc3QodGhpcy5fX3UpKSB7XG4gICAgICBYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUub3Blbj1YTzsgWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLnNlbmQ9WFM7IHdpbmRvdy5fX3JzQ2FwPTA7IGJhbmsoYik7XG4gICAgICB2YXIgczI9dGhpczsgc2V0VGltZW91dChmdW5jdGlvbigpeyB0cnl7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzMiwncmVhZHlTdGF0ZScse3ZhbHVlOjR9KTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHMyLCdzdGF0dXMnLHt2YWx1ZToyMDB9KTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHMyLCdyZXNwb25zZVRleHQnLHt2YWx1ZTone1wib2tcIjp0cnVlfSd9KTsgaWYoczIub25yZWFkeXN0YXRlY2hhbmdlKXMyLm9ucmVhZHlzdGF0ZWNoYW5nZSgpOyBpZihzMi5vbmxvYWQpczIub25sb2FkKCk7IH1jYXRjaChlKXt9IH0sMzApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gWFMuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICB9O1xuICBjb25zb2xlLmxvZygnJWNSb29tU2NhcGUgY2FwdHVyZSBhcm1lZC4gTm93IG51ZGdlIEFOWSBEZXNpZ24gY29udHJvbCBpbiB0aGlzIHRhYiAobm90aGluZyB3aWxsIGJlIHNhdmVkIHRvIHRoZSB3YWxsKS4nLCdjb2xvcjojM2M2O2ZvbnQtd2VpZ2h0OmJvbGQnKTtcbn0pKCk7IjsKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NuaXAnKS50ZXh0Q29udGVudCA9IFNOSVA7CmZ1bmN0aW9uIGNvcHlTbmlwKCl7IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KFNOSVApLnRoZW4oZnVuY3Rpb24oKXsgc3QoJ0NhcHR1cmUgc2NyaXB0IGNvcGllZCDigJQgcGFzdGUgaXQgaW50byB0aGUgY29uc29sZSBvZiB0aGUgdGFiIG9uIHlvdXIgT1RIRVIgUEMuJyk7IH0sIGZ1bmN0aW9uKCl7IHN0KCdDb3B5IGJsb2NrZWQg4oCUIHNlbGVjdCB0aGUgc2NyaXB0IHRleHQgYmVsb3cgYW5kIGNvcHkgbWFudWFsbHkuJyk7IH0pOyB9CmZ1bmN0aW9uIHN0KG0sIGNscyl7IHZhciBzPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdGF0dXMnKTsgcy50ZXh0Q29udGVudD1tOyBzLmNsYXNzTmFtZT1jbHN8fCdkaW0nOyB9CmZ1bmN0aW9uIGVzYyh4KXsgcmV0dXJuIFN0cmluZyh4KS5yZXBsYWNlKC9bJjw+Il0vZywgZnVuY3Rpb24oYyl7IHJldHVybiB7JyYnOicmYW1wOycsJzwnOicmbHQ7JywnPic6JyZndDsnLCciJzonJnF1b3Q7J31bY107IH0pOyB9CmZ1bmN0aW9uIEoodSxvcHQpeyByZXR1cm4gZmV0Y2godSxvcHQpLnRoZW4oZnVuY3Rpb24ocil7IHJldHVybiByLnRleHQoKS50aGVuKGZ1bmN0aW9uKHQpeyB2YXIgajsgdHJ5eyBqPUpTT04ucGFyc2UodCk7IH1jYXRjaChlKXsgaj17b2s6ZmFsc2UsZXJyb3I6J2JhZCBqc29uIGZyb20gJyt1fTsgfSBqLl9fY29kZT1yLnN0YXR1czsgcmV0dXJuIGo7IH0pOyB9KTsgfQpmdW5jdGlvbiByZWFsSWRzKG0peyByZXR1cm4gT2JqZWN0LmtleXMobXx8e30pLmZpbHRlcihmdW5jdGlvbihrKXsgcmV0dXJuIGsuY2hhckF0KDApIT09J18nOyB9KTsgfQpmdW5jdGlvbiBtYXBPZihqKXsgcmV0dXJuIChqICYmIGoucHJvZmlsZXMgJiYgdHlwZW9mIGoucHJvZmlsZXM9PT0nb2JqZWN0JykgPyBqLnByb2ZpbGVzIDogajsgfQpmdW5jdGlvbiBmbXRUKG1zKXsgaWYoIW1zKSByZXR1cm4gJz8nOyB2YXIgZD1uZXcgRGF0ZShtcyk7IHJldHVybiBkLnRvTG9jYWxlRGF0ZVN0cmluZyh1bmRlZmluZWQse3dlZWtkYXk6J3Nob3J0JyxkYXk6J251bWVyaWMnLG1vbnRoOidzaG9ydCd9KSsnICcrZC50b0xvY2FsZVRpbWVTdHJpbmcoKTsgfQpmdW5jdGlvbiBmbXRCKG4peyByZXR1cm4gbj4xMDQ4NTc2ID8gKG4vMTA0ODU3NikudG9GaXhlZCgxKSsnIE1CJyA6IChuPjIwNDggPyBNYXRoLnJvdW5kKG4vMTAyNCkrJyBLQicgOiBuKycgQicpOyB9Cgp2YXIgQkFLUz1bXSwgTElWRT1udWxsLCBDVVI9bnVsbDsKZnVuY3Rpb24gbG9hZEJha3MoKXsKICBzdCgnTG9hZGluZyBiYWNrdXBz4oCmJyk7CiAgUHJvbWlzZS5hbGwoW0ooJy9hcGkvcHJvZmlsZXMtYmFrcycpLCBKKCcvYXBpL3Byb2ZpbGVzLWxpdmUnKV0pLnRoZW4oZnVuY3Rpb24ocnMpewogICAgdmFyIGI9cnNbMF07IExJVkUgPSBtYXBPZihyc1sxXS5fX2NvZGU9PT0yMDAgPyByc1sxXSA6IG51bGwpOwogICAgaWYoIWIub2speyBzdCgnQ291bGQgbm90IGxpc3QgYmFja3VwczogJysoYi5lcnJvcnx8Yi5fX2NvZGUpLCdiYWQnKTsgcmV0dXJuOyB9CiAgICBCQUtTPWIuYmFrc3x8W107CiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmNvdW50JykudGV4dENvbnRlbnQgPSAnKCcrQkFLUy5sZW5ndGgrJyBmb3VuZCwgbmV3ZXN0IGZpcnN0KScrKExJVkU/JyDigJQgbGl2ZSBzdG9yZSBoYXMgJytyZWFsSWRzKExJVkUpLmxlbmd0aCsnIG1vZGVzJzonJyk7CiAgICB2YXIgdGI9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Jha2JvZHknKTsgdGIuaW5uZXJIVE1MPScnOwogICAgaWYoIUJBS1MubGVuZ3RoKXsgdGIuaW5uZXJIVE1MPSc8dHI+PHRkIGNvbHNwYW49IjQiIGNsYXNzPSJkaW0iPk5vIGJhY2t1cHMgZm91bmQgeWV0LjwvdGQ+PC90cj4nOyB9CiAgICBCQUtTLmZvckVhY2goZnVuY3Rpb24oayxpKXsKICAgICAgdmFyIHRyPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7IHRyLmNsYXNzTmFtZT0nYmFrJzsgdHIuZGF0YXNldC5pPWk7CiAgICAgIHZhciBjYXA9L3RhYmNhcHR1cmUvLnRlc3Qoay5maWxlKTsKICAgICAgdHIuaW5uZXJIVE1MPSc8dGQ+JytmbXRUKGsudCkrJzwvdGQ+PHRkPjxjb2RlIHN0eWxlPSJmb250LXNpemU6MTJweCI+Jytlc2Moay5maWxlKSsnPC9jb2RlPicrKGNhcD8nPHNwYW4gY2xhc3M9InRhZyBjYXAiPnRhYiBjYXB0dXJlPC9zcGFuPic6JycpKyc8L3RkPjx0ZD4nK2ZtdEIoay5ieXRlcykrJzwvdGQ+PHRkIGNsYXNzPSJkaW0iIGlkPSJ2cycraSsnIj7igJQ8L3RkPic7CiAgICAgIHRyLm9uY2xpY2s9ZnVuY3Rpb24oKXsgb3BlbkJhayhpKTsgfTsKICAgICAgdGIuYXBwZW5kQ2hpbGQodHIpOwogICAgfSk7CiAgICBzdCgnTG9hZGVkICcrQkFLUy5sZW5ndGgrJyBiYWNrdXBzLiBDbGljayBvbmUgdG8gZGlmZiBpdCBhZ2FpbnN0IHRoZSBsaXZlIHN0b3JlLicpOwogIH0pOwp9CmZ1bmN0aW9uIGRpZmZPZihibWFwKXsKICB2YXIgcmVzPXtuZXdzOltdLGNoZzpbXSxzYW1lOjB9OwogIHJlYWxJZHMoYm1hcCkuZm9yRWFjaChmdW5jdGlvbihpZCl7CiAgICBpZighTElWRSB8fCAhTElWRVtpZF0pIHsgcmVzLm5ld3MucHVzaCh7aWQ6aWR9KTsgcmV0dXJuOyB9CiAgICB2YXIgYT1KU09OLnN0cmluZ2lmeShibWFwW2lkXSksIGI9SlNPTi5zdHJpbmdpZnkoTElWRVtpZF0pOwogICAgaWYoYT09PWIpeyByZXMuc2FtZSsrOyByZXR1cm47IH0KICAgIHZhciBrZXlzPVtdOyB2YXIgYm89Ym1hcFtpZF0sIGxvPUxJVkVbaWRdOwogICAgT2JqZWN0LmtleXMoYm8pLmNvbmNhdChPYmplY3Qua2V5cyhsbykpLmZvckVhY2goZnVuY3Rpb24oayl7CiAgICAgIGlmKGtleXMuaW5kZXhPZihrKT49MCkgcmV0dXJuOwogICAgICBpZihKU09OLnN0cmluZ2lmeShib1trXSkhPT1KU09OLnN0cmluZ2lmeShsb1trXSkpIGtleXMucHVzaChrKTsKICAgIH0pOwogICAgcmVzLmNoZy5wdXNoKHtpZDppZCxrZXlzOmtleXN9KTsKICB9KTsKICByZXR1cm4gcmVzOwp9CmZ1bmN0aW9uIHNjYW5Ub3AoKXsKICBpZighQkFLUy5sZW5ndGgpeyBzdCgnTG9hZCB0aGUgYmFja3VwIGxpc3QgZmlyc3QuJywnd2FybicpOyByZXR1cm47IH0KICB2YXIgYnRuPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzY2FuYnRuJyk7IGJ0bi5kaXNhYmxlZD10cnVlOwogIHZhciB0b3A9QkFLUy5zbGljZSgwLDI1KSwgaT0wOwogIChmdW5jdGlvbiBuZXh0KCl7CiAgICBpZihpPj10b3AubGVuZ3RoKXsgYnRuLmRpc2FibGVkPWZhbHNlOyBzdCgnU2NhbiBmaW5pc2hlZCDigJQgInZzIGxpdmUiIGNvbHVtbiBub3cgc2hvd3Mgd2hhdCBlYWNoIGJhY2t1cCB3b3VsZCBicmluZyBiYWNrLicpOyByZXR1cm47IH0KICAgIHZhciBrPXRvcFtpXSwgY2VsbD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndnMnK2kpOwogICAgc3QoJ1NjYW5uaW5nICcrKGkrMSkrJy8nK3RvcC5sZW5ndGgrJzogJytrLmZpbGUpOwogICAgSignL2FwaS9wcm9maWxlcy1iYWtzP2ZpbGU9JytlbmNvZGVVUklDb21wb25lbnQoay5maWxlKSkudGhlbihmdW5jdGlvbihqKXsKICAgICAgdHJ5ewogICAgICAgIHZhciBkPWRpZmZPZihtYXBPZihqKSk7CiAgICAgICAgY2VsbC5pbm5lckhUTUw9KGQubmV3cy5sZW5ndGg/JzxzcGFuIGNsYXNzPSJ0YWcgbmV3Ij4rJytkLm5ld3MubGVuZ3RoKycgbWlzc2luZy1mcm9tLWxpdmU8L3NwYW4+JzonJykrKGQuY2hnLmxlbmd0aD8nPHNwYW4gY2xhc3M9InRhZyBjaGciPn4nK2QuY2hnLmxlbmd0aCsnIGNoYW5nZWQ8L3NwYW4+JzonJyl8fCc8c3BhbiBjbGFzcz0iZGltIj5pZGVudGljYWw8L3NwYW4+JzsKICAgICAgICBpZighZC5uZXdzLmxlbmd0aCYmIWQuY2hnLmxlbmd0aCkgY2VsbC5pbm5lckhUTUw9JzxzcGFuIGNsYXNzPSJkaW0iPmlkZW50aWNhbCB0byBsaXZlPC9zcGFuPic7CiAgICAgIH1jYXRjaChlKXsgY2VsbC50ZXh0Q29udGVudD0nPyc7IH0KICAgICAgaSsrOyBuZXh0KCk7CiAgICB9KTsKICB9KSgpOwp9CmZ1bmN0aW9uIG9wZW5CYWsoaSl7CiAgdmFyIGs9QkFLU1tpXTsgaWYoIWspIHJldHVybjsKICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3RyLmJhaycpLGZ1bmN0aW9uKHIpeyByLmNsYXNzTGlzdC50b2dnbGUoJ3NlbCcsICtyLmRhdGFzZXQuaT09PWkpOyB9KTsKICBzdCgnTG9hZGluZyAnK2suZmlsZSsn4oCmJyk7CiAgSignL2FwaS9wcm9maWxlcy1iYWtzP2ZpbGU9JytlbmNvZGVVUklDb21wb25lbnQoay5maWxlKSkudGhlbihmdW5jdGlvbihqKXsKICAgIENVUj17ZmlsZTprLmZpbGUsbWFwOm1hcE9mKGopfTsKICAgIHZhciBkPWRpZmZPZihDVVIubWFwKTsKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaWZmY2FyZCcpLnN0eWxlLmRpc3BsYXk9Jyc7CiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGZpbGUnKS50ZXh0Q29udGVudD1rLmZpbGU7CiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZHN1bScpLnRleHRDb250ZW50PSdUaGlzIGJhY2t1cCBob2xkcyAnK3JlYWxJZHMoQ1VSLm1hcCkubGVuZ3RoKycgbW9kZXMgKCcrZm10VChrLnQpKycpLiB2cyBsaXZlOiAnK2QubmV3cy5sZW5ndGgrJyBleGlzdCBvbmx5IGhlcmUsICcrZC5jaGcubGVuZ3RoKycgaGF2ZSBkaWZmZXJlbnQgc2V0dGluZ3MsICcrZC5zYW1lKycgaWRlbnRpY2FsLicrKExJVkU/JyBMaXZlLW9ubHkgbW9kZXMgYXJlIGxlZnQgdW50b3VjaGVkIGJ5IGEgcmVzdG9yZS4nOicnKTsKICAgIHZhciB0Yj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlmZmJvZHknKTsgdGIuaW5uZXJIVE1MPScnOwogICAgaWYoIWQubmV3cy5sZW5ndGggJiYgIWQuY2hnLmxlbmd0aCl7IHRiLmlubmVySFRNTD0nPHRyPjx0ZCBjb2xzcGFuPSI0IiBjbGFzcz0iZGltIj5JZGVudGljYWwgdG8gdGhlIGxpdmUgc3RvcmUg4oCUIG5vdGhpbmcgdG8gcmVzdG9yZSBmcm9tIGhlcmUuPC90ZD48L3RyPic7IH0KICAgIGQubmV3cy5mb3JFYWNoKGZ1bmN0aW9uKG0pewogICAgICB2YXIgbmFtZT0oQ1VSLm1hcFttLmlkXSYmKENVUi5tYXBbbS5pZF0ubmFtZXx8Q1VSLm1hcFttLmlkXS50aXRsZSkpfHxtLmlkOwogICAgICB0Yi5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsJzx0cj48dGQ+PGlucHV0IHR5cGU9ImNoZWNrYm94IiBjbGFzcz0icGljayIgdmFsdWU9IicrZXNjKG0uaWQpKyciIGNoZWNrZWQ+PC90ZD48dGQ+PGI+Jytlc2MobmFtZSkrJzwvYj4gPHNwYW4gY2xhc3M9ImRpbSI+KCcrZXNjKG0uaWQpKycpPC9zcGFuPjwvdGQ+PHRkPjxzcGFuIGNsYXNzPSJ0YWcgbmV3Ij5vbmx5IGluIGJhY2t1cDwvc3Bhbj48L3RkPjx0ZCBjbGFzcz0iZGltIj53aG9sZSBtb2RlIGlzIG1pc3NpbmcgZnJvbSBsaXZlIOKAlCByZXN0b3JpbmcgYnJpbmdzIGl0IGJhY2sgY29tcGxldGVseTwvdGQ+PC90cj4nKTsKICAgIH0pOwogICAgZC5jaGcuZm9yRWFjaChmdW5jdGlvbihtKXsKICAgICAgdmFyIG5hbWU9KENVUi5tYXBbbS5pZF0mJihDVVIubWFwW20uaWRdLm5hbWV8fENVUi5tYXBbbS5pZF0udGl0bGUpKXx8bS5pZDsKICAgICAgdGIuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCc8dHI+PHRkPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgY2xhc3M9InBpY2siIHZhbHVlPSInK2VzYyhtLmlkKSsnIiBjaGVja2VkPjwvdGQ+PHRkPjxiPicrZXNjKG5hbWUpKyc8L2I+IDxzcGFuIGNsYXNzPSJkaW0iPignK2VzYyhtLmlkKSsnKTwvc3Bhbj48L3RkPjx0ZD48c3BhbiBjbGFzcz0idGFnIGNoZyI+Y2hhbmdlZDwvc3Bhbj48L3RkPjx0ZD48dWwgY2xhc3M9ImNoZyI+PGxpPicrbS5rZXlzLm1hcChlc2MpLmpvaW4oJzwvbGk+PGxpPicpKyc8L2xpPjwvdWw+PC90ZD48L3RyPicpOwogICAgfSk7CiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VsYWxsJykuY2hlY2tlZD10cnVlOwogICAgc3QoJ1VudGljayBhbnl0aGluZyB5b3UgZG8gTk9UIHdhbnQgZnJvbSB0aGlzIGJhY2t1cCwgdGhlbiBwcmVzcyBSZXN0b3JlLicpOwogICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RpZmZjYXJkJykuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOidzbW9vdGgnfSk7CiAgfSk7Cn0KZnVuY3Rpb24gc2VsQWxsKHYpeyBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5waWNrJyksZnVuY3Rpb24oYyl7IGMuY2hlY2tlZD12OyB9KTsgfQpmdW5jdGlvbiBkb1Jlc3RvcmUoKXsKICBpZighQ1VSKSByZXR1cm47CiAgdmFyIGlkcz1BcnJheS5wcm90b3R5cGUubWFwLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBpY2s6Y2hlY2tlZCcpLGZ1bmN0aW9uKGMpe3JldHVybiBjLnZhbHVlO30pOwogIGlmKCFpZHMubGVuZ3RoKXsgc3QoJ05vdGhpbmcgdGlja2VkLicsJ3dhcm4nKTsgcmV0dXJuOyB9CiAgaWYoIWNvbmZpcm0oJ1Jlc3RvcmUgJytpZHMubGVuZ3RoKycgbW9kZShzKSBmcm9tXG4nK0NVUi5maWxlKydcblxuVGlja2VkIG1vZGVzIHdpbGwgdGFrZSB0aGUgYmFja3Vw4oCZcyB2ZXJzaW9uLiBFdmVyeXRoaW5nIGVsc2Ugc3RheXMgYXMgaXQgaXMgbm93LiBBIGZyZXNoIGJhY2t1cCBvZiB0aGUgY3VycmVudCBzdGF0ZSBpcyB0YWtlbiBhdXRvbWF0aWNhbGx5IGZpcnN0LiBDb250aW51ZT8nKSkgcmV0dXJuOwogIHZhciBidG49ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RvcmVidG4nKTsgYnRuLmRpc2FibGVkPXRydWU7CiAgc3QoJ1Jlc3RvcmluZyAnK2lkcy5sZW5ndGgrJyBtb2Rlc+KApicpOwogIEooJy9hcGkvcHJvZmlsZXMtcmVzdG9yZScse21ldGhvZDonUE9TVCcsaGVhZGVyczp7J0NvbnRlbnQtVHlwZSc6J2FwcGxpY2F0aW9uL2pzb24nfSxib2R5OkpTT04uc3RyaW5naWZ5KHtmaWxlOkNVUi5maWxlLG1vZGVzOmlkc30pfSkudGhlbihmdW5jdGlvbihqKXsKICAgIGJ0bi5kaXNhYmxlZD1mYWxzZTsKICAgIGlmKGoub2speyBzdCgn4pyUIFJlc3RvcmVkOiAnK2oucmVzdG9yZWQuam9pbignLCAnKSsnIOKAlCBjaGVjayB0aGUgd2FsbCAvIHJlbG9hZCB5b3VyIERlc2lnbiB0YWJzIChFWENFUFQgYSBub3QteWV0LWNhcHR1cmVkIHRhYiEpLicsJ29rJyk7IGxvYWRCYWtzKCk7IH0KICAgIGVsc2Ugc3QoJ+KcliBSZXN0b3JlIGZhaWxlZDogJysoai5lcnJvcnx8ai5fX2NvZGUpLCdiYWQnKTsKICB9KTsKfQpsb2FkQmFrcygpOwo8L3NjcmlwdD48L2JvZHk+PC9odG1sPgo=', 'base64');

    function listBaks() {
      var out = [];
      try {
        fs.readdirSync(BDIR).forEach(function (f) {
          if (!OK_RE.test(f)) return;
          var st = null; try { st = fs.statSync(path.join(BDIR, f)); } catch (e) {}
          out.push({ file: f, bytes: st ? st.size : 0, t: st ? st.mtimeMs : 0 });
        });
      } catch (e) {}
      out.sort(function (a, b) { return b.t - a.t; });
      return out.slice(0, 3000);
    }
    function realIds(map) { return Object.keys(map || {}).filter(function (k) { return k.charAt(0) !== '_'; }); }

    if (typeof server === 'undefined' || !server || !server.prependListener) { console.error('[timemachine] no server — inactive'); return; }
    var PATHS = { '/api/profiles-baks': 1, '/api/profiles-restore': 1, '/api/profiles-live': 1, '/api/profiles-capture': 1, '/profiles-timemachine.html': 1 };
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var p = u.pathname;
      if (!PATHS[p]) return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; };
      res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      try {
        if (p === '/profiles-timemachine.html' && req.method === 'GET') {
          try { W(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); E(TM_HTML); } catch (e) {}
          return;
        }
        if (p === '/api/profiles-live' && req.method === 'GET') {
          /* RS-REDACT v1: parse + strip music token before serving; parse fail = 500, never raw */
          try {
            var liveJ = JSON.parse(fs.readFileSync(PF, 'utf8'));
            if (liveJ && liveJ.settings) liveJ.settings = redactSettings(liveJ.settings);
            W(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(liveJ));
          } catch (e) { out(500, { ok: false, error: 'store unreadable' }); }
          return;
        }
        if (p === '/api/profiles-baks' && req.method === 'GET') {
          var f = u.searchParams.get('file');
          if (f) {
            if (!OK_RE.test(f)) return out(400, { ok: false, error: 'bad name' });
            var fp = path.join(BDIR, f);
            if (!fs.existsSync(fp)) return out(404, { ok: false, error: 'not found' });
            /* RS-REDACT v1: parse + strip music token before serving; parse fail = 500, never raw */
            try {
              var bakJ = JSON.parse(fs.readFileSync(fp, 'utf8'));
              if (bakJ && bakJ.settings) bakJ.settings = redactSettings(bakJ.settings);
              W(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(bakJ));
            } catch (e) { out(500, { ok: false, error: 'backup unreadable' }); }
            return;
          }
          return out(200, { ok: true, dir: BDIR, baks: listBaks() });
        }
        if (p === '/api/profiles-capture' && req.method === 'POST') {
          var cb = [], cs = 0;
          req.on('data', function (c) { cb.push(c); cs += c.length; if (cs > 64 * 1024 * 1024) { try { req.destroy(); } catch (e) {} } });
          req.on('end', function () {
            var body = Buffer.concat(cb), j2;
            try { j2 = JSON.parse(body.toString('utf8')); } catch (e) { return out(400, { ok: false, error: 'bad json' }); }
            var map = (j2 && j2.profiles && typeof j2.profiles === 'object') ? j2.profiles : (typeof j2 === 'object' ? j2 : null);
            var n = map ? realIds(map).length : 0;
            if (n < 3) return out(400, { ok: false, error: 'that does not look like a profiles map (' + n + ' modes)' });
            var name = 'profiles.json.tabcapture-' + new Date().toISOString().replace(/[:.]/g, '-') + '.bak';
            try { fs.mkdirSync(BDIR, { recursive: true }); fs.writeFileSync(path.join(BDIR, name), body); }
            catch (e) { return out(500, { ok: false, error: 'write failed: ' + e.message }); }
            try { console.log('[timemachine] tab capture banked: ' + name + ' (' + n + ' modes, ' + body.length + ' bytes)'); } catch (e) {}
            return out(200, { ok: true, file: name, modes: n, bytes: body.length });
          });
          req.on('error', function () {});
          return;
        }
        if (p === '/api/profiles-restore' && req.method === 'POST') {
          var b = '';
          req.on('data', function (c) { b += c; if (b.length > 1024 * 1024) { try { req.destroy(); } catch (e) {} } });
          req.on('end', function () {
            var j; try { j = JSON.parse(b || '{}'); } catch (e) { return out(400, { ok: false, error: 'bad json' }); }
            var f2 = j.file;
            if (!f2 || !OK_RE.test(f2)) return out(400, { ok: false, error: 'need {file}' });
            var ids = Array.isArray(j.modes) ? j.modes.filter(function (x) { return typeof x === 'string' && x && x.charAt(0) !== '_'; }) : [];
            if (!ids.length) return out(400, { ok: false, error: 'need {modes:[ids]}' });
            var bak; try { bak = JSON.parse(fs.readFileSync(path.join(BDIR, f2), 'utf8')); } catch (e) { return out(500, { ok: false, error: 'backup unreadable' }); }
            var bmap = bak.profiles || bak;
            var cur; try { cur = JSON.parse(fs.readFileSync(PF, 'utf8')); } catch (e) { return out(500, { ok: false, error: 'current store unreadable' }); }
            var cmap = cur.profiles || cur;
            var applied = [];
            ids.forEach(function (id) { if (bmap[id]) { cmap[id] = bmap[id]; applied.push(id); } });
            if (!applied.length) return out(404, { ok: false, error: 'none of those modes exist in that backup' });
            var payload = JSON.stringify({ profiles: cmap, tagmap: cur.tagmap, settings: cur.settings });
            // apply through the NATIVE handler so memory/broadcast/guard/backup all engage
            var preq = http.request({ host: '127.0.0.1', port: SELF_PORT, path: '/api/profiles', method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, function (pres) {
              var rb = ''; pres.on('data', function (c) { rb += c; });
              pres.on('end', function () {
                if (pres.statusCode === 200) { try { console.log('[timemachine] restored ' + applied.join(', ') + ' from ' + f2); } catch (e) {}
                  return out(200, { ok: true, restored: applied, from: f2 }); }
                return out(502, { ok: false, error: 'apply failed (' + pres.statusCode + '): ' + rb.slice(0, 200) });
              });
            });
            preq.on('error', function (e) { out(502, { ok: false, error: 'apply failed: ' + e.message }); });
            preq.end(payload);
          });
          req.on('error', function () {});
          return;
        }
        return out(405, { ok: false, error: 'method' });
      } catch (e) { out(500, { ok: false, error: String((e && e.message) || e) }); }
    });
    console.log('[timemachine] ready — ' + listBaks().length + ' profile backup(s) in ' + BDIR + ' — console at /profiles-timemachine.html');
  } catch (e) { try { console.error('[timemachine] init failed:', e && e.message); } catch (_) {} }
})();

/* ================= ROOMSCAPE HARDENING (2026-07-20) =================
   RS-HARDEN v1 — production hardening from the full QA review.
   1. CRASH GUARDS: uncaughtException / unhandledRejection no longer kill the
      wall mid-game; they are logged loudly and the process keeps serving.
      server 'error' + 'clientError' handled (was: none — EADDRINUSE or a bad
      client could take the conductor down).
   2. ATOMIC JSON WRITES: every fs.writeFileSync of a *.json store now writes
      to a temp file and renames into place — a container kill or power cut
      mid-write can no longer corrupt profiles/state/scores. Failures are
      LOGGED (was: swallowed by empty catch — the UI said Saved while the
      share write had failed).
   3. PROFILES WIPE-BLOCK (file layer, last resort under the HTTP guard):
      a write that would shrink the mode count by more than half is refused
      and logged CRITICAL — catches any future bug path, not just stale tabs.
   4. BACKUP ROTATION: _backups grows forever (934 files / 132 MB at review).
      Policy: keep every .bak from the last 48 h, the first of each day for
      60 days, hard cap 400 — pruned at boot and every 6 h.
   5. WS HEARTBEAT: dead kiosk sockets are pinged every 45 s and reaped, so
      the clients set and broadcasts stay clean after abrupt TV/PC power-offs.
   6. GET /api/harden-status -> live proof of all of the above for verification.
   Appended to conductor.js (post-guard prependListener pattern). */
;(function () {
  try {
    var fs = require('fs'), path = require('path');
    if (process.__rsHarden) return; process.__rsHarden = 1;
    var stats = { started: new Date().toISOString(), uncaught: 0, rejections: 0, atomicWrites: 0, writeFailures: 0, wipesBlocked: 0, baksPruned: 0, deadSocketsReaped: 0, lastPrune: null };
    var PF = (typeof PROFILES_FILE !== 'undefined' && PROFILES_FILE) ||
             path.join((typeof APP_DIR !== 'undefined' && APP_DIR) || __dirname, 'profiles.json');
    var BDIR = (typeof BACKUP_DIR !== 'undefined' && BACKUP_DIR) || path.join(path.dirname(PF), '_backups');

    /* ---- 1. crash guards ---- */
    process.on('uncaughtException', function (e) {
      stats.uncaught++;
      try { console.error('[harden] UNCAUGHT EXCEPTION (kept alive): ' + ((e && e.stack) || e)); } catch (x) {}
    });
    process.on('unhandledRejection', function (e) {
      stats.rejections++;
      try { console.error('[harden] UNHANDLED REJECTION (kept alive): ' + ((e && e.stack) || e)); } catch (x) {}
    });
    if (typeof server !== 'undefined' && server) {
      server.on('error', function (e) { try { console.error('[harden] server error: ' + (e && e.message)); } catch (x) {} });
      server.on('clientError', function (e, sock) { try { sock.destroy(); } catch (x) {} });
    }

    /* ---- 2 + 3. atomic JSON writes + profiles wipe-block ---- */
    function realIds(m) { return Object.keys(m || {}).filter(function (k) { return k.charAt(0) !== '_'; }); }
    var origWrite = fs.writeFileSync.bind(fs);
    fs.writeFileSync = function (file, data, opts) {
      var isJson = typeof file === 'string' && /\.json$/i.test(file) && file.indexOf('_backups') < 0;
      if (!isJson) return origWrite(file, data, opts);
      // profiles wipe-block: refuse a write that halves the mode count
      try {
        if (path.basename(file) === path.basename(PF)) {
          var oldN = -1, newN = -1;
          try { var oj = JSON.parse(fs.readFileSync(file, 'utf8')); oldN = realIds(oj.profiles || oj).length; } catch (e) {}
          try { var nj = JSON.parse(String(data)); newN = realIds(nj.profiles || nj).length; } catch (e) {}
          if (oldN >= 6 && newN >= 0 && newN < Math.ceil(oldN / 2)) {
            stats.wipesBlocked++;
            console.error('[harden] CRITICAL: blocked a profiles write that would shrink ' + oldN + ' modes to ' + newN + ' — copy of the refused payload in _backups/refused/');
            try { fs.mkdirSync(path.join(BDIR, 'refused'), { recursive: true }); origWrite(path.join(BDIR, 'refused', 'profiles-refused-' + Date.now() + '.json'), data); } catch (e) {}
            return;
          }
        }
      } catch (e) {}
      var tmp = file + '.tmp-' + process.pid;
      try {
        origWrite(tmp, data, opts);
        fs.renameSync(tmp, file);
        stats.atomicWrites++;
      } catch (e) {
        stats.writeFailures++;
        try { console.error('[harden] WRITE FAILED for ' + path.basename(file) + ': ' + (e && e.message) + ' — retrying direct'); } catch (x) {}
        try { fs.unlinkSync(tmp); } catch (x) {}
        try { origWrite(file, data, opts); stats.writeFailures--; } catch (e2) { try { console.error('[harden] direct write ALSO failed: ' + (e2 && e2.message)); } catch (x) {} }
      }
    };

    /* ---- 4. backup rotation ---- */
    function pruneBaks() {
      try {
        if (!fs.existsSync(BDIR)) return;
        var now = Date.now(), keepDays = {}, victims = [];
        var files = fs.readdirSync(BDIR).filter(function (f) { return /\.bak$/.test(f) && /\.json\./.test(f); })
          .map(function (f) { var st = null; try { st = fs.statSync(path.join(BDIR, f)); } catch (e) {}
            return { f: f, t: st ? st.mtimeMs : 0, sz: st ? st.size : 0 }; })
          .sort(function (a, b) { return b.t - a.t; });
        var kept = 0;
        files.forEach(function (x) {
          var age = now - x.t, day = new Date(x.t).toISOString().slice(0, 10) + ':' + x.f.split('.')[0];
          var keep = false;
          if (age < 48 * 3600 * 1000) keep = true;                       // everything from last 48h
          else if (age < 60 * 86400 * 1000 && !keepDays[day]) { keepDays[day] = 1; keep = true; }  // first-of-day per store, 60 days
          if (keep && kept >= 400) keep = false;                          // hard cap
          if (keep) kept++; else victims.push(x.f);
        });
        victims.forEach(function (f) { try { fs.unlinkSync(path.join(BDIR, f)); stats.baksPruned++; } catch (e) {} });
        stats.lastPrune = new Date().toISOString();
        if (victims.length) console.log('[harden] backup rotation: pruned ' + victims.length + ' old .bak files, kept ' + kept);
      } catch (e) { try { console.error('[harden] prune failed: ' + (e && e.message)); } catch (x) {} }
    }
    setTimeout(pruneBaks, 20000);
    setInterval(pruneBaks, 6 * 3600 * 1000);

    /* ---- 5. WS heartbeat ---- */
    if (typeof clients !== 'undefined' && clients && typeof encodeFrame === 'function') {
      setInterval(function () {
        try {
          clients.forEach(function (cl) {
            try {
              if (!cl.sock || cl.sock.destroyed) { clients.delete(cl); stats.deadSocketsReaped++; return; }
              // v2.52: reap half-open sockets. awaitingPong is zeroed by ANY
              // inbound traffic (onWsData); two silent heartbeat cycles (90s)
              // means the TCP path is dead — writes were just buffering in RAM.
              // Also reap clients whose outbound buffer has grown huge (a stalled
              // reader accumulating broadcastState + 2s clock messages).
              cl.awaitingPong = (cl.awaitingPong || 0) + 1;
              if (cl.awaitingPong > 2 || cl.sock.bufferSize > 5 * 1024 * 1024) {
                try { cl.sock.destroy(); } catch (x) {}
                clients.delete(cl); stats.deadSocketsReaped++; return;
              }
              cl.sock.write(encodeFrame(Buffer.alloc(0), 0x9));
            } catch (e) { try { cl.sock.destroy(); } catch (x) {} clients.delete(cl); stats.deadSocketsReaped++; }
          });
        } catch (e) {}
      }, 45000);
    }

    /* ---- 6. status endpoint ---- */
    if (typeof server !== 'undefined' && server && server.prependListener) {
      server.prependListener('request', function (req, res) {
        var p = (req.url || '').split('?')[0];
        if (p !== '/api/harden-status') return;
        var W = res.writeHead.bind(res), E = res.end.bind(res);
        res.writeHead = res.setHeader = function () { return res; };
        res.write = res.end = function () { return true; };
        try {
          var bakCount = 0; try { bakCount = fs.readdirSync(BDIR).filter(function (f) { return /\.bak$/.test(f); }).length; } catch (e) {}
          W(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
          E(JSON.stringify({ ok: true, harden: 'v1', stats: stats, bakCount: bakCount, wsClients: (typeof clients !== 'undefined' && clients) ? clients.size : -1 }));
        } catch (e) {}
      });
    }
    console.log('[harden] active — crash guards, atomic writes, wipe-block, backup rotation, WS heartbeat');
  } catch (e) { try { console.error('[harden] init failed:', e && e.message); } catch (x) {} }
})();

/* ================= ROOMSCAPE V2.62 (2026-07-24) =================
   RS-V262 — one block, six features (see header changelog):
   1. LAYOUT + /api/layout live in the core (top of file / coreHandler).
   2. __rsRescanAsync — non-blocking deep media rescan (post-/api/upload).
   3. __rsProfilePlaylistCfg — profile.framePlaylists (draft model) playlist
      source, consumed by resolveFrameImages; + a 5s ticker so profile-carried
      playlists advance on their intervals (the legacy RS-PLAYLISTS ticker only
      watches playlists.json).
   4. Autopilot v2 — settings.schedule weekly rules + settings.sunShift sunset
      warmth, one minute-ticker, GET/POST /api/schedule.
   5. Phase auto-advance — phase.autoS seconds; wraps applyPhase/applyProfile/
      setMode (chains on the rooms2.4 prompter wrapper).
   6. '_onthisday' virtual photo album — async walk, cached per calendar day.
   House prepend+neuter pattern for the one new endpoint. */
;(function () {
  try {
    function log(m) { try { console.log('[v262] ' + m); } catch (e) {} }

    /* ---- 2. async deep media rescan (same walk as the deepscan block, fs.promises) ---- */
    var _rescanBusy = false;
    global.__rsRescanAsync = function () {
      if (_rescanBusy) return; _rescanBusy = true;
      var fsp = fs.promises, MAXDEPTH = 6, SKIP = { '_backups': 1, '_to_delete': 1 };
      var idx = {}, n = 0;
      function add(rel) { var k = keyOf(path.basename(rel)); (idx[k] = idx[k] || []).push(rel); n++; }
      function walk(dir, rel, depth) {
        return fsp.readdir(dir, { withFileTypes: true }).then(function (ents) {
          var chain = Promise.resolve();
          ents.forEach(function (en) {
            var name = en.name;
            if (name.charAt(0) === '.') return;
            if (depth === 0 && SKIP[name] === 1) return;
            var childRel = rel ? rel + '/' + name : name;
            if (en.isFile()) { if (MEDIA_RE.test(name)) add(childRel); }
            else if (en.isDirectory() && depth < MAXDEPTH) chain = chain.then(function () { return walk(path.join(dir, name), childRel, depth + 1); });
          });
          return chain;
        }, function () {});
      }
      walk(MEDIA_DIR, '', 0).then(function () {
        landIndex = idx;
        try { manifestDirty(); } catch (e) {}     // also fixes: post-upload rescan never invalidated the manifest cache
        try { state._imgSig = null; } catch (e) {}
        log('async media rescan: ' + n + ' files, ' + Object.keys(idx).length + ' scene keys');
      }).catch(function (e) { log('async rescan failed: ' + (e && e.message)); }).then(function () { _rescanBusy = false; });
    };

    /* ---- 3. profile-carried playlists (draft model) ---- */
    function normPl(f) {   // same normalisation as the RS-PLAYLISTS store
      f = f || {};
      var items = Array.isArray(f.items) ? f.items.filter(function (x) { return typeof x === 'string' && x.length && x.length < 500; }).slice(0, 64) : [];
      var iv = parseInt(f.intervalS, 10); if (!(iv >= 0)) iv = 60; if (iv > 0 && iv < 5) iv = 5; if (iv > 86400) iv = 86400;
      var pin = parseInt(f.pinIdx, 10); if (!(pin >= 0)) pin = 0; if (items.length) pin = Math.min(pin, items.length - 1);
      return { items: items, order: (f.order === 'shuffle') ? 'shuffle' : 'seq', intervalS: iv, pinIdx: pin };
    }
    global.__rsProfilePlaylistCfg = function (prof) {
      var fp = prof && prof.framePlaylists;
      if (!Array.isArray(fp) || !fp.some(Boolean)) return null;   // mode doesn't use the draft model → legacy store
      var out = []; for (var i = 0; i < 6; i++) out.push(fp[i] ? normPl(fp[i]) : { items: [], order: 'seq', intervalS: 60, pinIdx: 0 });
      return { frames: out, staggerS: 0 };
    };
    var _plSig = '';
    setInterval(function () {   // advance profile-carried playlists on their intervals
      try {
        var cfg = global.__rsProfilePlaylistCfg(effProfile(state.game) || {});
        if (!cfg) return;
        var sig = '';
        cfg.frames.forEach(function (c, i) { if (c.items.length > 1 && c.intervalS > 0) sig += i + ':' + Math.floor(Date.now() / (c.intervalS * 1000)) + ';'; });
        if (sig !== _plSig) { _plSig = sig; if (sig) { state._imgSig = null; bump('playlists:profile'); } }
      } catch (e) {}
    }, 5000);

    /* ---- 5. phase auto-advance (phase.autoS seconds; no wrap — no loop flag exists) ---- */
    var _phT = null;
    function cancelPhaseAdvance() { if (_phT) { clearTimeout(_phT); _phT = null; } }
    function armPhaseAdvance() {
      cancelPhaseAdvance();
      var game = state.game, phId = activePhaseId;
      if (!phId) return;
      var p = profiles[game]; if (!p || !Array.isArray(p.phases)) return;
      var list = p.phases.filter(Boolean);
      var ix = -1; for (var i = 0; i < list.length; i++) if (list[i].id === phId) { ix = i; break; }
      if (ix < 0 || ix >= list.length - 1) return;                 // last phase (or unknown) → stop
      var autoS = +list[ix].autoS || 0; if (!(autoS > 0)) return;
      var nextId = list[ix + 1].id;
      _phT = setTimeout(function () {
        _phT = null;
        if (state.game !== game || activePhaseId !== phId) return; // stale mode/phase → never fire
        try { if (applyPhase(nextId)) logDiary('phase', 'auto-advance → ' + nextId); } catch (e) {}
      }, autoS * 1000);
    }
    var _origPhase = applyPhase, _origProfile = applyProfile, _origMode = setMode;
    applyPhase = function (phaseId) { cancelPhaseAdvance(); var ok = _origPhase(phaseId); if (ok) armPhaseAdvance(); return ok; };
    applyProfile = function (id) { cancelPhaseAdvance(); return _origProfile.apply(this, arguments); };   // mode change / panic cancels
    setMode = function (id) { cancelPhaseAdvance(); return _origMode.apply(this, arguments); };

    /* ---- 6. '_onthisday' virtual photo album ---- */
    var _otd = { date: '', photos: [], building: null };
    function dateKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function otdFresh() { return _otd.date === dateKey(); }
    function otdBuild() {
      if (_otd.building) return _otd.building;
      var fsp = fs.promises, mm = new Date().getMonth(), dd = new Date().getDate(), found = [];
      function walk(rel, depth) {
        return fsp.readdir(path.join(PHOTOS_DIR, rel), { withFileTypes: true }).then(function (ents) {
          var chain = Promise.resolve();
          ents.forEach(function (en) {
            if (en.name[0] === '.') return;
            var r = rel ? rel + '/' + en.name : en.name;
            if (en.isFile()) {
              if (!IMG_RE.test(en.name)) return;
              chain = chain.then(function () {
                return fsp.stat(path.join(PHOTOS_DIR, r)).then(function (st) {
                  var m = new Date(st.mtimeMs);
                  if (m.getMonth() === mm && m.getDate() === dd) found.push(r);
                }, function () {});
              });
            } else if (en.isDirectory() && depth < 4) chain = chain.then(function () { return walk(r, depth + 1); });
          });
          return chain;
        }, function () {});
      }
      _otd.building = walk('', 0).then(function () {
        _otd.date = dateKey(); _otd.photos = found.sort(); _otd.building = null;
        log('on-this-day: ' + found.length + ' photo(s) match ' + (mm + 1) + '/' + dd);
        return _otd.photos;
      }, function (e) { _otd.building = null; _otd.date = dateKey(); _otd.photos = []; return []; });
      return _otd.building;
    }
    global.__rsOnThisDayInfo = function () {   // /api/photodirs entry (native shape {dir,count} + display name)
      if (!otdFresh()) otdBuild();
      return { dir: '_onthisday', name: '📅 On this day', count: otdFresh() ? _otd.photos.length : 0 };
    };
    global.__rsOnThisDay = function (cb) {      // /api/photos?dir=_onthisday payload (native {ok,dir,count,photos} shape)
      (otdFresh() ? Promise.resolve(_otd.photos) : otdBuild()).then(function (photos) {
        if (photos && photos.length) {
          return cb({ ok: true, dir: '_onthisday', count: photos.length,
            photos: photos.map(function (f) { return '/photos/' + f.split('/').map(encodeURIComponent).join('/'); }) });
        }
        // no matches today → first real album (there is no whole-library mode to fall back to)
        var alb = (photoAlbums() || [])[0] || null;
        var files = alb ? (listPhotos(path.join(PHOTOS_DIR, alb.dir)) || []) : [];
        var base = alb ? '/photos/' + alb.dir.split('/').map(encodeURIComponent).join('/') : '';
        cb({ ok: true, dir: '_onthisday', fallback: alb ? alb.dir : null, count: files.length,
          photos: files.map(function (f) { return base + '/' + f.split('/').map(encodeURIComponent).join('/'); }) });
      });
    };

    /* ---- 4. autopilot v2: weekly schedule + sunset shift ---- */
    var sun = { nextSetMs: 0, targetMs: 0, checkedAt: 0, firedDay: '' };
    function pollSun() {
      var ss = settings.sunShift || {};
      if (!ss.on || !haOn()) return;                        // HA off → sunShift does nothing
      haFetch('GET', '/api/states/sun.sun', null, function (e, code, d) {
        var ns = d && d.attributes && d.attributes.next_setting;
        var t = ns ? Date.parse(ns) : NaN;
        if (isNaN(t)) return;
        sun.nextSetMs = t;
        var cand = t + (parseInt(ss.offsetMin, 10) || 0) * 60000;
        // latch: keep an armed future target (positive offsets survive HA rolling
        // next_setting to tomorrow the moment the sun goes down)
        if (cand > Date.now() && (!(sun.targetMs > Date.now()) || cand < sun.targetMs)) sun.targetMs = cand;
      });
    }
    function fireSunShift() {
      if (Date.now() < holdUntil) { logDiary('auto', 'sunset shift skipped (room held)'); return; }
      var prof = effProfile(state.game) || {};
      state.warmth = Math.min(100, (+state.warmth || 0) + 15);
      var ev = prof.eveningLight;                            // per-mode evening light scene (optional)
      if (ev && (haCfg().lightScenes || {})[ev]) state.light = ev;
      AUTO_SWITCH = true; try { bump('sunshift'); } finally { AUTO_SWITCH = false; }
      logDiary('auto', 'sunset shift — room warmed' + (ev ? ' → ' + ev : ''));
    }
    var _schedMin = '';
    setInterval(function () {                                // THE one new timer: schedule + sunShift, minute precision
      try {
        if (Date.now() - sun.checkedAt > 30 * 60000) { sun.checkedAt = Date.now(); pollSun(); }
        var now = new Date();
        var hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        var dk = dateKey(), minKey = dk + ' ' + hm;
        if (minKey !== _schedMin) {
          _schedMin = minKey;
          var held = Date.now() < holdUntil || !!promptState || !isAmbient();   // same override semantics as the rhythms autopilot
          (Array.isArray(settings.schedule) ? settings.schedule : []).forEach(function (r) {
            if (!r || r.time !== hm) return;
            if (Array.isArray(r.days) && r.days.length && r.days.indexOf(now.getDay()) < 0) return;
            if (!profiles[r.mode]) return;
            if (held) { logDiary('auto', 'schedule skipped (held/live): ' + r.mode); return; }
            AUTO_SWITCH = true; try { applyProfile(r.mode); } finally { AUTO_SWITCH = false; }
            logDiary('auto', 'schedule → ' + r.mode + (r.name ? ' (' + r.name + ')' : ''));
          });
        }
        var ss = settings.sunShift || {};
        if (ss.on && sun.targetMs && Date.now() >= sun.targetMs && sun.firedDay !== dk) {
          sun.firedDay = dk; sun.targetMs = 0;
          fireSunShift();
        }
      } catch (e) {}
    }, 60000);
    setTimeout(pollSun, 10000);

    /* ---- /api/schedule (GET both configs; POST saves via the guarded profiles-file path) ---- */
    if (typeof server !== 'undefined' && server && server.prependListener) {
      server.prependListener('request', function (req, res) {
        var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
        if (u.pathname !== '/api/schedule') return;
        var W = res.writeHead.bind(res), E = res.end.bind(res);
        res.writeHead = res.setHeader = function () { return res; };
        res.write = res.end = function () { return true; };
        function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
        function cfgOut(extra) {
          return Object.assign({ ok: true,
            schedule: Array.isArray(settings.schedule) ? settings.schedule : [],
            sunShift: Object.assign({ on: false, offsetMin: 0 }, settings.sunShift || {}),
            sun: { configured: haOn(), nextSetting: sun.nextSetMs || null, target: sun.targetMs || null } }, extra || {});
        }
        if (req.method === 'GET') return out(200, cfgOut());
        if (req.method !== 'POST') return out(405, { ok: false, error: 'GET or POST only' });
        readBody(req, function (b) {
          if (!b || typeof b !== 'object') return out(400, { ok: false, error: 'need {schedule?, sunShift?}' });
          if (b.schedule !== undefined) {
            if (!Array.isArray(b.schedule) || b.schedule.length > 100) return out(400, { ok: false, error: 'schedule must be an array (max 100 rules)' });
            var rules = [];
            for (var i = 0; i < b.schedule.length; i++) {
              var r = b.schedule[i] || {};
              var tm = /^(\d{1,2}):(\d{2})$/.exec(String(r.time || ''));
              if (!tm || +tm[1] > 23 || +tm[2] > 59) return out(400, { ok: false, error: 'rule ' + i + ': time must be HH:MM' });
              if (typeof r.mode !== 'string' || !r.mode) return out(400, { ok: false, error: 'rule ' + i + ': need mode' });
              var days = Array.isArray(r.days) ? r.days.map(Number).filter(function (d) { return d >= 0 && d <= 6 && d === Math.floor(d); }) : [];
              rules.push({ days: days, time: String(tm[1]).padStart(2, '0') + ':' + tm[2], mode: r.mode, name: (typeof r.name === 'string' && r.name) ? r.name.slice(0, 60) : undefined });
            }
            settings.schedule = rules;
          }
          if (b.sunShift !== undefined) {
            var s2 = b.sunShift || {};
            var off = parseInt(s2.offsetMin, 10); if (isNaN(off)) off = 0; off = Math.max(-240, Math.min(240, off));
            settings.sunShift = { on: !!s2.on, offsetMin: off };
            sun.targetMs = 0; sun.checkedAt = 0;             // re-arm from the new config
            if (settings.sunShift.on) setTimeout(pollSun, 50);
          }
          backupFile(PROFILES_FILE);                          // same guarded write path as the native profiles save
          var werr = null;
          try { fs.writeFileSync(PROFILES_FILE, JSON.stringify({ profiles: profiles, tagmap: tagmap, settings: settings }, null, 2)); } catch (e) { werr = e; }
          if (werr) return out(500, { ok: false, error: 'write failed: ' + werr.message });
          logDiary('auto', 'schedule saved (' + (settings.schedule || []).length + ' rule(s), sunShift ' + ((settings.sunShift || {}).on ? 'on' : 'off') + ')');
          out(200, cfgOut());
        });
      });
    }

    log('active — async rescan, profile playlists, phase autoS, schedule+sunShift, on-this-day');
  } catch (e) { try { console.error('[v262] init failed:', e && e.message); } catch (x) {} }
})();

/* ================= ROOMSCAPE INTRO ENGINE (RS-INTRO v1.0, 2026-08-01) =================
   Per-mode cue-timeline intros (INTRO-TAB-PLAN.md Phase 1, app v3.08 Intro lens).
   profiles[mode].intro = { on, skippable, kidSafeAlt:'skip'|'run',
     music:{kind:'file',src,gain}, cues:[{at,type,...}], endAtMs }
   Cue types (v1): sound|voice {src,where,gain} · screen {event} ·
     lights {action:flash|dip|off|on|scene, scene?, amount?, holdS?, transitionS?}
   ARCHITECTURE — the tablet only edits & triggers; sequencing runs HERE:
   - server.prependListener marks manual launches (/api/game/, /api/tag/) with a
     short-lived pending flag; the applyProfile WRAPPER (reassigned binding, same
     pattern as directorOnModeChange/modeMusicFollow) diverts flagged applies into
     runIntro(). Internal callers (rhythms, schedule, autopilot, panic, phases)
     never set the flag, so automations skip intros by construction.
   - state.intro rides every bump() broadcast (bump sends the mutated state object)
     so Play view + frames learn of start/skip/end for free.
   - /api/panic aborts a running intro BEFORE the core handler applies dining.
   - INVARIANTS: panic always wins instantly; kid-safe skips unless kidSafeAlt==='run';
     hard caps endAtMs<=60000, cues<=30; zero npm deps; final launch uses the REAL
     applyProfile so modeMusicFollow/audio director start at launch, not cue 0.
   Endpoints: POST /api/intro/preview {game?, intro?, cueIx?} (rehearse, no launch)
              POST /api/intro/skip
   ======================================================================= */
(function () {
  try {
    var RSI = { pending: null, pendingTs: 0 };
    var introRun = null;   // { game, preview, timers:[], endAtMs, startedTs }

    function introTimer(t) { if (introRun) introRun.timers.push(t); }
    function clearIntroTimers() { if (introRun) { introRun.timers.forEach(clearTimeout); introRun.timers = []; } }

    function normCues(I) {
      var cues = (Array.isArray(I.cues) ? I.cues : []).filter(function (c) { return c && typeof c.at === 'number' && c.at >= 0; }).slice(0, 30);
      if (I.music && I.music.src && I.music.kind !== 'ma')
        cues.unshift({ at: 0, type: 'sound', src: I.music.src, where: 'all', gain: (I.music.gain != null ? I.music.gain : 0.8) });
      cues.sort(function (a, b) { return a.at - b.at; });
      return cues;
    }
    function introEnd(I, cues) {
      var last = cues.length ? cues[cues.length - 1].at : 0;
      return Math.min(Math.max((typeof I.endAtMs === 'number' && I.endAtMs > last) ? I.endAtMs : last + 1500, 800), 60000);
    }

    function execCue(c) {
      try {
        if (c.type === 'sound' || c.type === 'voice') { if (c.src) fireAudio(c.src, c.where || 'all', (c.gain != null ? c.gain : 1)); return; }
        if (c.type === 'screen') {
          var msg = { ie: true, type: 'social', id: 'introfx', sfx: null, event: c.event || 'softflash', ms: (c.ms || null), kid: !!state.kid, t: Date.now() };
          for (var cl of clients) wsSend(cl.sock, msg);
          return;
        }
        if (c.type === 'frames') {   /* v4.03 title-card takeover */
          var media = c.media || null;
          if (!media && c.scene) { var ls = landIndex[c.scene]; if (ls && ls[0]) media = '/media/' + ls[0].split('/').map(encodeURIComponent).join('/'); }
          if (!media) return;
          var ts = Date.now();
          state.introMedia = { frames: (Array.isArray(c.frames) && c.frames.length) ? c.frames : null, media: media, ts: ts };
          bump('intro:media');
          if (c.ms) setTimeout(function () { if (state.introMedia && state.introMedia.ts === ts) { state.introMedia = null; bump('intro:mediaend'); } }, c.ms);
          return;
        }
        if (c.type === 'lights') {
          if (!haOn()) return; var L = haCfg().lights; if (!L || !L.length) return;
          var a = c.action;
          if (a === 'flash') return haCall('light', 'turn_on', { entity_id: L, flash: 'short' });
          if (a === 'off') return haCall('light', 'turn_off', { entity_id: L, transition: (c.transitionS || 0) });
          if (a === 'on') return haCall('light', 'turn_on', { entity_id: L, transition: (c.transitionS != null ? c.transitionS : 1) });
          if (a === 'dip') {
            var pct = Math.round((c.amount || 0.35) * 100);
            haCall('light', 'turn_on', { entity_id: L, brightness_step_pct: -pct, transition: 0.4 });
            introTimer(setTimeout(function () { haCall('light', 'turn_on', { entity_id: L, brightness_step_pct: pct, transition: 1.5 }); }, (c.holdS || 3) * 1000));
            return;
          }
          if (a === 'scene') { var sc = haCfg().lightScenes[c.scene]; if (sc) return haCall('light', 'turn_on', Object.assign({ entity_id: L, transition: (c.transitionS != null ? c.transitionS : 1) }, sc)); }
        }
      } catch (e) { console.log('[intro] cue failed:', e && e.message); }
    }

    function introCleanupFx() {   /* v4.03 — lift blackouts + title cards */
      try { var msg = { ie: true, type: 'social', id: 'introfx', sfx: null, event: 'blackclear', kid: !!state.kid, t: Date.now() }; for (var cl of clients) wsSend(cl.sock, msg); } catch (e) {}
      state.introMedia = null;
    }
    function abortIntro(reason) {
      if (!introRun) return;
      clearIntroTimers(); introRun = null;
      introCleanupFx();
      state.intro = null; bump('intro:' + (reason || 'abort'));
      try { logDiary('intro', '✕ intro ' + (reason || 'aborted')); } catch (e) {}
    }
    function finishIntro() {
      if (!introRun) return;
      var run = introRun; clearIntroTimers(); introRun = null; state.intro = null;
      introCleanupFx();
      if (run.preview) { bump('intro:end'); try { logDiary('intro', '✓ rehearsal finished'); } catch (e) {} }
      else { try { logDiary('intro', '🎬 intro done — launching ' + run.game); } catch (e) {} _rsIntroApply(run.game); }
    }
    function runIntro(game, I, preview) {
      if (introRun) abortIntro('superseded');
      var cues = normCues(I), endAt = introEnd(I, cues);
      introRun = { game: game, preview: !!preview, timers: [], endAtMs: endAt, startedTs: Date.now() };
      state.intro = { on: true, game: game, name: ((profiles[game] || {}).name) || game, startedTs: introRun.startedTs,
        endAtMs: endAt, skippable: I.skippable !== false, preview: !!preview };
      bump('intro:start');
      try { logDiary('intro', (preview ? '▶ rehearsing ' : '🎬 intro ') + game + ' (' + (endAt / 1000).toFixed(1) + 's, ' + cues.length + ' cue' + (cues.length === 1 ? '' : 's') + ')'); } catch (e) {}
      cues.forEach(function (c) { introTimer(setTimeout(function () { execCue(c); }, c.at)); });
      introTimer(setTimeout(finishIntro, endAt));
    }

    /* ---- broadcast guard: introRun (server var) is the single source of truth.
       A stale client POST /api/state (v2.51 push) may carry an old state.intro or
       replace the state object entirely — re-assert before every broadcast. ---- */
    var _rsIntroBcast = broadcastState;
    broadcastState = function (except) {
      if (!introRun && state.intro) state.intro = null;
      /* introMedia may legitimately outlive introRun (solo ▶ preview with ms auto-clear) — only purge stale resurrections */
      if (state.introMedia && !introRun && (Date.now() - (state.introMedia.ts || 0)) > 60000) state.introMedia = null;
      else if (introRun && !state.intro) state.intro = { on: true, game: introRun.game, name: ((profiles[introRun.game] || {}).name) || introRun.game, startedTs: introRun.startedTs, endAtMs: introRun.endAtMs, skippable: true, preview: !!introRun.preview };
      return _rsIntroBcast(except);
    };

    /* ---- applyProfile wrapper (reassigned binding — house pattern) ---- */
    var _rsIntroApply = applyProfile;
    applyProfile = function (id) {
      try {
        var flagged = (RSI.pending === id && (Date.now() - RSI.pendingTs) < 1500);
        RSI.pending = null;
        if (flagged) {
          var I = (profiles[id] || {}).intro;
          var kidBlocked = state.kid && (!I || I.kidSafeAlt !== 'run');
          if (I && I.on && Array.isArray(I.cues) && I.cues.length && !kidBlocked) { runIntro(id, I, false); return; }
        }
        if (introRun && !introRun.preview) abortIntro('superseded');   // a second launch always wins
      } catch (e) { console.log('[intro] wrapper error:', e && e.message); }
      return _rsIntroApply(id);
    };

    /* ---- routes + manual-launch flagging ---- */
    if (typeof server === 'undefined' || !server || !server.prependListener) { console.log('[intro] no server — engine idle'); return; }
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var p = u.pathname;
      if (p.indexOf('/api/game/') === 0) { if (u.searchParams.get('nointro') !== '1') { RSI.pending = decodeURIComponent(p.split('/')[3] || ''); RSI.pendingTs = Date.now(); } return; }
      if (p.indexOf('/api/tag/') === 0) { var g = tagmap[decodeURIComponent(p.split('/')[3] || '')]; if (g) { RSI.pending = g; RSI.pendingTs = Date.now(); } return; }
      if (p === '/api/panic') { if (introRun) abortIntro('panic'); return; }
      if (p !== '/api/intro/preview' && p !== '/api/intro/skip') return;

      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; }; res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      function body(cb) { var b = ''; req.on('data', function (d) { b += d; if (b.length > 512 * 1024) req.destroy(); }); req.on('end', function () { var j = null; try { j = b ? JSON.parse(b) : {}; } catch (e) { return out(400, { ok: false, error: 'bad json' }); } cb(j || {}); }); }
      if (req.method !== 'POST') return out(405, { ok: false, error: 'method' });

      if (p === '/api/intro/skip') {
        if (!introRun) return out(200, { ok: false, idle: true });
        var run = introRun; clearIntroTimers(); introRun = null; state.intro = null;
        introCleanupFx();
        try { logDiary('intro', '⏭ intro skipped'); } catch (e) {}
        if (run.preview) bump('intro:skip'); else _rsIntroApply(run.game);
        return out(200, { ok: true, skipped: true, launched: !run.preview });
      }
      /* /api/intro/preview — {intro} (unsaved draft) or {game}; {cueIx} fires one cue now */
      return body(function (b) {
        var game = (b.game && profiles[b.game]) ? b.game : state.game;
        var I = (b.intro && typeof b.intro === 'object') ? b.intro : ((profiles[game] || {}).intro);
        if (!I) return out(404, { ok: false, error: 'no intro on ' + game });
        if (Array.isArray(I.cues) && I.cues.length > 30) return out(400, { ok: false, error: 'max 30 cues' });
        if (b.cueIx != null) {
          var cues = normCues(I); var c = cues[+b.cueIx];
          if (!c) return out(404, { ok: false, error: 'no cue ' + b.cueIx });
          execCue(Object.assign({}, c, { at: 0 }));
          return out(200, { ok: true, fired: c.type });
        }
        runIntro(game, I, true);
        return out(200, { ok: true, preview: true, endAtMs: introRun ? introRun.endAtMs : 0 });
      });
    });
    console.log('[intro] RS-INTRO v1.0 ready — cue timelines on manual launches; POST /api/intro/preview | /api/intro/skip');
  } catch (e) { try { console.error('[intro] init failed:', e && e.message); } catch (x) {} }
})();

/* ================= ROOMSCAPE TTS BRIDGE (RS-TTS v1.0, 2026-08-01) =================
   Text-to-speech through the EXISTING Home Assistant bridge (zero new deps):
   HA runs the Piper add-on + Wyoming integration; POST /api/tts_get_url renders
   a line and returns a media URL which we download into sounds/voice/ (cached
   by engine|voice|text hash) and optionally fire into the room via fireAudio.
   Engine-agnostic: settings.tts = { engine:'tts.piper', voice, voices:[…] } —
   point engine at any HA TTS entity (cloud, ElevenLabs integration, Kokoro…)
   and everything downstream (intro voice cues, Say box) just works.
     POST /api/tts {text, voice?, speak?(default true), where?, gain?}
       -> { ok, file:'sounds/voice/tts_<slug>_<hash>.mp3', cached }
     GET  /api/tts/voices -> { ok, configured, engine, voices[] }
   ======================================================================= */
(function () {
  try {
    var cryptoT = require('crypto'), httpT = require('http');
    var VOICE_DIR = path.join(APP_DIR, 'sounds', 'voice');
    function ttsCfg() {
      var t = settings.tts || {};
      return { engine: t.engine || 'tts.piper', voice: t.voice || '',
        voices: (Array.isArray(t.voices) && t.voices.length) ? t.voices
          : ['en_GB-alba-medium', 'en_GB-northern_english_male-medium', 'en_GB-jenny_dioco-medium', 'en_US-amy-medium', 'en_US-ryan-high'] };
    }
    function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'line'; }
    function dl(url, dest, cb) {
      var u2; try { u2 = new URL(url); } catch (e) { return cb(e); }
      var req2 = httpT.get({ host: u2.hostname, port: u2.port || 80, path: u2.pathname + u2.search, timeout: 15000 }, function (r2) {
        if (r2.statusCode !== 200) { r2.resume(); return cb(new Error('HTTP ' + r2.statusCode)); }
        var ws2 = fs.createWriteStream(dest);
        r2.pipe(ws2); ws2.on('finish', function () { ws2.close(function () { cb(null); }); }); ws2.on('error', cb);
      });
      req2.on('error', cb); req2.on('timeout', function () { req2.destroy(new Error('timeout')); });
    }
    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var p = u.pathname;
      if (p !== '/api/tts' && p !== '/api/tts/voices') return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; }; res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      if (p === '/api/tts/voices') { var c0 = ttsCfg(); return out(200, { ok: true, configured: haOn(), engine: c0.engine, voices: c0.voices }); }
      if (req.method !== 'POST') return out(405, { ok: false, error: 'method' });
      var b0 = ''; req.on('data', function (d) { b0 += d; if (b0.length > 64 * 1024) req.destroy(); });
      req.on('end', function () {
        var b; try { b = JSON.parse(b0 || '{}'); } catch (e) { return out(400, { ok: false, error: 'bad json' }); }
        var text = (b && b.text || '').trim();
        if (!text) return out(400, { ok: false, error: 'need {text}' });
        if (text.length > 400) return out(400, { ok: false, error: 'max 400 chars' });
        if (!haOn()) return out(503, { ok: false, error: 'Home Assistant bridge not configured' });
        var cfg = ttsCfg(), voice = b.voice || cfg.voice || cfg.voices[0];
        var h = cryptoT.createHash('sha1').update(cfg.engine + '|' + voice + '|' + text).digest('hex').slice(0, 10);
        var fname = 'tts_' + slug(text) + '_' + h + '.mp3';
        var rel = 'sounds/voice/' + fname, abs = path.join(VOICE_DIR, fname), cached = false;
        function done() {
          if (b.speak !== false) { try { fireAudio(rel, b.where || ((settings.tts || {}).where) || 'R2', (b.gain != null ? b.gain : 1)); } catch (e) {} }   /* v4.24: one speaker, not six */
          try { logDiary('tts', '🗣 ' + (cached ? '(cached) ' : '') + text.slice(0, 60)); } catch (e) {}
          out(200, { ok: true, file: rel, cached: cached, voice: voice });
        }
        try { if (fs.existsSync(abs)) { cached = true; return done(); } fs.mkdirSync(VOICE_DIR, { recursive: true }); } catch (e) {}
        haFetch('POST', '/api/tts_get_url', { engine_id: cfg.engine, message: text, options: { voice: voice } }, function (e, code, j) {
          if (e || !j || !j.url) return out(502, { ok: false, error: e ? e.message : ('HA TTS replied ' + code + ' — is the Piper add-on + Wyoming integration installed? (engine ' + cfg.engine + ')') });
          dl(j.url, abs, function (e2) { if (e2) { try { fs.unlinkSync(abs); } catch (x) {} return out(502, { ok: false, error: 'download failed: ' + e2.message }); } done(); });
        });
      });
    });
    console.log('[tts] RS-TTS v1.0 ready — POST /api/tts via HA engine ' + ttsCfg().engine + ' → sounds/voice/');
  } catch (e) { try { console.error('[tts] init failed:', e && e.message); } catch (x) {} }
})();

/* ================= ROOMSCAPE PARTY GAMES (RS-GAMES v1.0, 2026-08-02) =================
   Server-owned party-game sessions (PARTY-GAMES-PLAN.md §6 locked decisions).
   state.partyGame rides every bump() broadcast — app (host console) + frames
   (fx.js v1.38 wall renderers) learn of every change for free. The launch four:
     charades  — heads-up / classic / reverse; word decks from decks/*.txt;
                 server round clock (endsAt) + TTS time warnings; got/pass scoring
     musicquiz — MA snippets from a chosen playlist (play → auto-pause after
                 cfg.snippetS); reveal resumes playback + surfaces the title
     quiz      — question|answer|A|B|C|D decks; corner TVs carry A–D during the
                 answer phase; reveal announces + fanfares
     werewolf  — TTS narration script, REAL lights out for night (haCall) +
                 scary ambience, dawn fades the lights back up; roles live in
                 state (the tablet console is host-eyes-only; frames never
                 render them); auto win-check
   Wall roles (LOCKED): L1+R1 rules card · L2+R2 game screens (heads-up word on
   the screen OPPOSITE the guesser) · L3+R3 live scores; quiz answers override
   the four corners during question/reveal, restored after.
   Endpoints:  GET  /api/games                     defs + decks (+kind/kidSafe)
               POST /api/games/start {id, cfg}
               POST /api/games/action {action, …}
               POST /api/games/end
               POST /api/games/deck {name, text | delete:true}   (backs up first)
   INVARIANTS: games never change state.game (overlay only); /api/panic ends any
   running game (hook below, never hijacks the response); kid-safe gates charades
   decks by the "(kid-safe)" filename convention; zero npm deps; inputs are
   hard-validated; broadcastState guard re-asserts the server session so a stale
   client state POST can never resurrect or clobber a game.
   ======================================================================= */
(function () {
  try {
    var httpPG = require('http');
    var G = { s: null, timers: [], items: [], order: [], qs: [], maStarted: false };

    var GAMES = [
      { id: 'charades', name: 'Charades', icon: '🎭', players: [3, 12], deck: 'words',
        variants: ['headsup', 'classic', 'reverse'], blurb: 'Heads-Up (word behind your head), Classic (actor peeks), Reverse (team acts, one guesses)' },
      { id: 'musicquiz', name: 'Music Quiz', icon: '🎵', players: [2, 12], deck: null, playlists: true,
        blurb: 'Snippet plays from your playlist, first shout wins — host awards the point' },
      { id: 'quiz', name: 'General Knowledge Quiz', icon: '🧠', players: [2, 12], deck: 'quiz',
        blurb: 'Question fills the wall; A–D on the corner TVs — stand under your answer' },
      { id: 'werewolf', name: 'Werewolf Narrator', icon: '🐺', players: [4, 12], deck: null,
        blurb: 'The room narrates, the lights go out for night, dawn reveals the victim' }
    ];
    var SND = { timeup: 'sounds/loops/alarm_call_2.mp3', fanfare: 'sounds/fanfare/fanfare_1.mp3',
                win: 'sounds/fanfare/huge_win.mp3', night: 'sounds/scary/ominous_suspenseful_ambience.mp3' };

    function gT(t) { G.timers.push(t); }
    function gClear() { G.timers.forEach(clearTimeout); G.timers = []; }
    function gBump(why) { if (G.s) { G.s.v = (G.s.v || 0) + 1; G.s.ts = Date.now(); } bump('game:' + why); }
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function selfPost(pathP, obj) {
      try {
        var payload = JSON.stringify(obj || {});
        var rq = httpPG.request({ host: '127.0.0.1', port: PORT, path: pathP, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
          function (r2) { r2.resume(); });
        rq.on('error', function () {});
        rq.end(payload);
      } catch (e) {}
    }
    function say(text) { if (!text) return; selfPost('/api/tts', { text: String(text).slice(0, 380), voice: (G.s && G.s.voice) || undefined, speak: true }); }
    function gLog(entry) { if (!G.s) return; G.s.log = G.s.log || []; G.s.log.unshift(entry); if (G.s.log.length > 12) G.s.log.pop(); }

    /* ---- decks (Cue Cards machinery; kind sniffed from the first line) ---- */
    function pgDecks() {
      return deckList().map(function (d) {
        var first = deckItemsById(d.id)[0] || '';
        return { id: d.id, name: d.name, count: d.count,
          kind: (first.split('|').length >= 3) ? 'quiz' : 'words',
          kidSafe: /kid-safe/i.test(d.name || ''),
          file: d.id.indexOf('file:') === 0 ? d.id.slice(5) : null };
      });
    }
    function quizItems(deckId) {
      var out = [];
      deckItemsById(deckId).forEach(function (l) {
        var pt = l.split('|').map(function (s) { return s.trim(); });
        if (pt.length >= 6 && pt[0]) {
          var opts = pt.slice(2, 6), ci = opts.indexOf(pt[1]);
          out.push({ q: pt[0], answer: pt[1], opts: opts, correctIx: ci >= 0 ? ci : null });
        } else if (pt.length >= 2 && pt[0]) out.push({ q: pt[0], answer: pt[1], opts: null, correctIx: null });
      });
      return out;
    }

    /* ---- lifecycle ---- */
    function endGame(reason, silent) {
      var s = G.s; if (!s) return false;
      gClear();
      try {
        if (s.id === 'musicquiz' && G.maStarted) {
          var mu = settings.music || {};
          if (mu.player) maCall('player_queues/stop', { queue_id: mu.player }, function () {});
        }
        if (s.id === 'werewolf' && s.phase === 'night' && haOn() && haCfg().lights.length)
          haCall('light', 'turn_on', { entity_id: haCfg().lights, transition: 2 });
      } catch (e) {}
      try {   /* auto-post to the Scores history when anyone actually scored */
        var ps = (s.players || []).filter(function (p) { return typeof p.score === 'number'; });
        if (!silent && ps.length && ps.some(function (p) { return p.score > 0; })) {
          var top = Math.max.apply(null, ps.map(function (p) { return p.score; }));
          selfPost('/api/scores/result', { game: s.name || s.id,
            players: ps.map(function (p) { return { name: p.name, score: p.score, won: p.score === top }; }) });
        }
      } catch (e) {}
      G.s = null; G.items = []; G.order = []; G.qs = []; G.maStarted = false;
      state.partyGame = null;
      bump('game:' + (reason || 'end'));
      try { logDiary('games', '⏹ ' + s.icon + ' ' + (s.name || s.id) + ' ended (' + (reason || 'host') + ')'); } catch (e) {}
      return true;
    }

    /* ---- charades ---- */
    function chDraw() {
      var s = G.s;
      if (!G.order.length) G.order = shuffle(G.items.map(function (_, i) { return i; }));
      s.card = { text: G.items[G.order.pop()] };
    }
    function chArm(skipLongWarn) {
      var s = G.s; gClear();
      s.phase = 'round';
      var ms = (s.pausedMs != null) ? s.pausedMs : s.roundS * 1000;
      s.endsAt = Date.now() + ms; s.pausedMs = null;
      if (!skipLongWarn && ms > 45000) gT(setTimeout(function () { if (G.s === s && s.phase === 'round') say('Thirty seconds left!'); }, ms - 30000));
      if (ms > 15000) gT(setTimeout(function () { if (G.s === s && s.phase === 'round') say('Ten seconds!'); }, ms - 10000));
      gT(setTimeout(function () {
        if (G.s !== s || s.phase !== 'round') return;
        s.phase = 'between'; s.endsAt = null;
        fireAudio(SND.timeup, 'all', 0.9);
        var nxt = s.players[(s.turnIx + 1) % s.players.length];
        say("Time's up! " + s.players[s.turnIx].name + ' made ' + (s.roundPts > 0 ? '+' : '') + (s.roundPts || 0) + ' this round. Next up: ' + nxt.name + '.');
        gBump('ch:timeup');
      }, ms));
    }
    function chNextPlayer() {
      var s = G.s;
      s.turnIx = (s.turnIx + 1) % s.players.length;
      if (s.turnIx === 0) s.round++;
      s.roundPts = 0; s.pausedMs = null;
      chDraw(); chArm();
      say('Round ' + s.round + ' — ' + s.players[s.turnIx].name + ", you're up!");
    }

    /* ---- quiz ---- */
    function qNext() {
      var s = G.s;
      if (!G.qs.length) {
        s.phase = 'over'; s.question = null; s.endsAt = null;
        var win = s.players.slice().sort(function (a, b) { return b.score - a.score; })[0];
        fireAudio(SND.win, 'all', 0.9);
        say("That's the end of the quiz! " + (win ? ('The winner is ' + win.name + ' with ' + win.score + ' points!') : ''));
        gBump('qz:over'); return;
      }
      var it = G.qs.shift();
      s.question = { n: (s.question ? s.question.n + 1 : 1), total: s.qTotal, q: it.q, opts: it.opts, answer: it.answer, correctIx: it.correctIx, revealed: false };
      s.phase = 'question';
      say('Question ' + s.question.n + '. ' + it.q);
      gBump('qz:q');
    }

    /* ---- music quiz ---- */
    function mqPlay(secs, out) {
      var s = G.s, mu = settings.music || {};
      if (!mu.player) return out(400, { ok: false, error: 'No Music Assistant player chosen — pick one in the Music tab first' });
      function pauseLater() {
        gT(setTimeout(function () {
          if (G.s !== s) return;
          maCall('player_queues/pause', { queue_id: mu.player }, function () {});
          s.track.playing = false; gBump('mq:pause');
        }, Math.max(1, secs) * 1000));
      }
      gClear();
      if (!G.maStarted) {
        maCall('player_queues/shuffle', { queue_id: mu.player, shuffle_enabled: true }, function () {
          maCall('player_queues/play_media', { queue_id: mu.player, media: s.playlist.uri, option: 'replace' }, function (e) {
            if (e) return out(502, { ok: false, error: e.message });
            G.maStarted = true; s.track.playing = true; pauseLater(); gBump('mq:play');
            out(200, { ok: true });
          });
        });
      } else {
        maCall('player_queues/play', { queue_id: mu.player }, function (e) {
          if (e) return out(502, { ok: false, error: e.message });
          s.track.playing = true; pauseLater(); gBump('mq:play');
          out(200, { ok: true });
        });
      }
    }
    function mqTitle(cb) {
      var mu = settings.music || {};
      maCall('player_queues/all', {}, function (e, queues) {
        if (e || !Array.isArray(queues)) return cb(null);
        var q = queues.find(function (x) { return x && x.queue_id === (mu.player || ''); });
        var cur = q && q.current_item, md = cur ? (cur.media_item || cur) : null;
        if (!md) return cb(null);
        var art = (md.artists && md.artists[0] && md.artists[0].name) || '';
        cb((md.name || cur.name || '') + (art ? ' — ' + art : ''));
      });
    }

    /* ---- werewolf ---- */
    function wwScript(s) {
      var L = ['Night falls on the village. Everyone — close your eyes.',
               'Werewolves — open your eyes, and silently agree on your victim.',
               'Werewolves — close your eyes.'];
      if (s.roles.seer) L.push('Seer — open your eyes, and point at someone to learn their true nature.', 'Seer — close your eyes.');
      if (s.roles.healer) L.push('Healer — open your eyes, and choose someone to protect tonight.', 'Healer — close your eyes.');
      L.push('Everyone — keep your eyes closed. Dawn is coming.');
      return L;
    }
    function wwWinCheck() {
      var s = G.s;
      var alive = s.players.filter(function (p) { return p.alive !== false; });
      var wolves = alive.filter(function (p) { return p.role === 'werewolf'; });
      if (!wolves.length) { s.winner = 'village'; s.phase = 'over'; fireAudio(SND.win, 'all', 0.9); say('The last werewolf is gone. The village wins!'); return true; }
      if (wolves.length >= alive.length - wolves.length) { s.winner = 'wolves'; s.phase = 'over'; say('The werewolves have taken the village. The wolves win!'); return true; }
      return false;
    }
    function wwLights(on) {
      try { if (haOn() && haCfg().lights.length) haCall('light', on ? 'turn_on' : 'turn_off', { entity_id: haCfg().lights, transition: 2 }); } catch (e) {}
    }

    /* ---- start ---- */
    function startGame(b, out) {
      var def = GAMES.find(function (g) { return g.id === (b && b.id); });
      if (!def) return out(400, { ok: false, error: 'unknown game — one of ' + GAMES.map(function (g) { return g.id; }).join('|') });
      var cfg = (b && b.cfg && typeof b.cfg === 'object') ? b.cfg : {};
      var names = (Array.isArray(cfg.players) ? cfg.players : []).map(function (n) { return String(n || '').trim().slice(0, 24); }).filter(Boolean).slice(0, 16);
      names = names.filter(function (n, i) { return names.indexOf(n) === i; });
      if (names.length < 2 && def.id !== 'charades') return out(400, { ok: false, error: 'need at least 2 players' });
      if (!names.length) names = ['Player 1', 'Player 2'];
      if (def.id === 'werewolf' && names.length < 4) return out(400, { ok: false, error: 'werewolf needs at least 4 players' });
      if (G.s) endGame('replaced', true);
      var s = { v: 0, id: def.id, name: def.name, icon: def.icon, phase: 'setup', startedTs: Date.now(), ts: Date.now(),
        players: names.map(function (n) { return { name: n, score: 0, alive: true }; }),
        turnIx: 0, round: 1, log: [],
        voice: (typeof cfg.voice === 'string' && cfg.voice) ? cfg.voice.slice(0, 60) : null };

      if (def.id === 'charades' || def.id === 'quiz') {
        var decks = pgDecks(), d = decks.find(function (x) { return x.id === cfg.deck; });
        if (!d) return out(400, { ok: false, error: 'need cfg.deck (an id from GET /api/games)' });
        var wantKind = def.deck; if (d.kind !== wantKind) return out(400, { ok: false, error: 'deck "' + d.name + '" is a ' + d.kind + ' deck — ' + def.name + ' needs ' + wantKind });
        if (def.id === 'charades' && state.kid && !d.kidSafe) return out(403, { ok: false, error: 'kid-safe is on — pick a deck marked (kid-safe)' });
        s.deckId = d.id; s.deckName = d.name;
      }

      if (def.id === 'charades') {
        s.variant = def.variants.indexOf(cfg.variant) >= 0 ? cfg.variant : 'headsup';
        s.guesserTv = (cfg.guesserTv === 'L2') ? 'L2' : 'R2';
        s.wordTv = (s.variant === 'classic') ? s.guesserTv : (s.guesserTv === 'R2' ? 'L2' : 'R2');
        s.roundS = Math.max(30, Math.min(300, +cfg.roundS || 90));
        s.roundPts = 0;
        G.items = deckItemsById(s.deckId);
        if (!G.items.length) return out(400, { ok: false, error: 'that deck is empty' });
        G.order = [];
        G.s = s; state.partyGame = s;
        chDraw(); chArm();
        say(def.name + '! Round one — ' + s.players[0].name + ", you're up. Go!");
      } else if (def.id === 'quiz') {
        var qs = shuffle(quizItems(s.deckId));
        if (!qs.length) return out(400, { ok: false, error: 'that deck has no readable questions (question|answer|A|B|C|D per line)' });
        s.qTotal = Math.min(qs.length, Math.max(3, Math.min(50, +cfg.count || 20)));
        G.qs = qs.slice(0, s.qTotal);
        s.question = null;
        G.s = s; state.partyGame = s;
        say('Welcome to the quiz! ' + s.qTotal + ' questions. Stand under your answer — here we go.');
        qNext();
      } else if (def.id === 'musicquiz') {
        var pl = cfg.playlist || {};
        if (!pl.uri || typeof pl.uri !== 'string') return out(400, { ok: false, error: 'need cfg.playlist {uri, name} — pick one from /api/music/playlists' });
        s.playlist = { uri: String(pl.uri).slice(0, 300), name: String(pl.name || 'playlist').slice(0, 80) };
        s.snippetS = Math.max(3, Math.min(60, +cfg.snippetS || 12));
        s.track = { n: 1, playing: false, revealed: false, title: null };
        s.phase = 'track';
        G.maStarted = false;
        G.s = s; state.partyGame = s;
        say('Music quiz! ' + s.snippetS + ' second snippets from ' + s.playlist.name + '. First shout wins!');
      } else if (def.id === 'werewolf') {
        var maxW = Math.max(1, Math.floor(names.length / 3));
        s.roles = { wolves: Math.max(1, Math.min(maxW, +((cfg.roles || {}).wolves) || (names.length >= 7 ? 2 : 1))),
                    seer: (cfg.roles || {}).seer !== false, healer: (cfg.roles || {}).healer !== false };
        var order = shuffle(s.players.map(function (_, i) { return i; })), k = 0;
        for (var w = 0; w < s.roles.wolves; w++) s.players[order[k++]].role = 'werewolf';
        if (s.roles.seer && k < order.length) s.players[order[k++]].role = 'seer';
        if (s.roles.healer && k < order.length) s.players[order[k++]].role = 'healer';
        for (; k < order.length; k++) s.players[order[k]].role = 'villager';
        s.night = 0; s.script = null; s.scriptIx = 0; s.victim = null; s.winner = null;
        G.s = s; state.partyGame = s;
        say('Welcome to the village. The host is dealing your roles — keep them secret.');
      }

      gBump('start:' + def.id);
      try { logDiary('games', '▶ ' + def.icon + ' ' + def.name + ' — ' + s.players.length + ' player' + (s.players.length === 1 ? '' : 's')); } catch (e) {}
      return out(200, { ok: true, partyGame: s });
    }

    /* ---- actions ---- */
    function doAction(b, out) {
      var s = G.s;
      if (!s) return out(409, { ok: false, error: 'no game running' });
      var a = String((b && b.action) || '');
      var name = (b && typeof b.name === 'string') ? b.name.trim().slice(0, 24) : null;
      function player(n) { return s.players.find(function (p) { return p.name === n; }); }
      function done(extra) { gBump(s.id + ':' + a); out(200, Object.assign({ ok: true, phase: s.phase }, extra || {})); }

      /* common */
      if (a === 'award') {
        var pw = player(name); if (!pw) return out(404, { ok: false, error: 'no such player' });
        pw.score += (b.delta === -1 ? -1 : 1);
        gLog({ s: '🏆', text: name + ' ' + (b.delta === -1 ? '−1' : '+1') });
        return done();
      }

      if (s.id === 'charades') {
        if (a === 'got' || a === 'pass') {
          if (s.phase !== 'round') return out(409, { ok: false, error: 'round not running' });
          var cur = s.players[s.turnIx], dd = (a === 'got') ? 1 : -1;
          cur.score += dd; s.roundPts = (s.roundPts || 0) + dd;
          gLog({ s: a === 'got' ? '✓' : '⏭', text: s.card ? s.card.text : '' });
          chDraw();
          return done();
        }
        if (a === 'pause') {
          if (s.phase !== 'round' || !s.endsAt) return out(409, { ok: false, error: 'nothing to pause' });
          s.pausedMs = Math.max(0, s.endsAt - Date.now()); s.endsAt = null; s.phase = 'paused'; gClear();
          return done();
        }
        if (a === 'resume') {
          if (s.phase !== 'paused') return out(409, { ok: false, error: 'not paused' });
          chArm(true);
          return done();
        }
        if (a === 'nextplayer') { chNextPlayer(); return done(); }
        if (a === 'setguesser') {
          var tv = (b && b.tv === 'L2') ? 'L2' : 'R2';
          s.guesserTv = tv; s.wordTv = (s.variant === 'classic') ? tv : (tv === 'R2' ? 'L2' : 'R2');
          return done();
        }
      }

      if (s.id === 'quiz') {
        if (a === 'reveal') {
          if (!s.question || s.question.revealed) return out(409, { ok: false, error: 'nothing to reveal' });
          s.question.revealed = true; s.phase = 'reveal';
          fireAudio(SND.fanfare, 'all', 0.9);
          say('The answer is: ' + s.question.answer + '.');
          return done();
        }
        if (a === 'next') { qNext(); return out(200, { ok: true, phase: s.phase }); }
      }

      if (s.id === 'musicquiz') {
        if (a === 'play') return mqPlay(s.snippetS, out);
        if (a === 'more') return mqPlay(Math.max(1, Math.min(30, +(b && b.s) || 5)), out);
        if (a === 'reveal') {
          var mu2 = settings.music || {};
          if (mu2.player && G.maStarted) { gClear(); maCall('player_queues/play', { queue_id: mu2.player }, function () {}); }
          s.track.revealed = true; s.track.playing = true;
          return mqTitle(function (title) { s.track.title = title || null; done({ title: s.track.title }); });
        }
        if (a === 'next') {
          var mu3 = settings.music || {};
          if (!G.maStarted || !mu3.player) { s.track = { n: s.track.n + 1, playing: false, revealed: false, title: null }; return done(); }
          gClear();
          return maCall('player_queues/next', { queue_id: mu3.player }, function (e) {
            gT(setTimeout(function () { maCall('player_queues/pause', { queue_id: mu3.player }, function () {}); }, 600));
            s.track = { n: s.track.n + 1, playing: false, revealed: false, title: null };
            done();
          });
        }
      }

      if (s.id === 'werewolf') {
        if (a === 'night') {
          if (s.phase === 'over') return out(409, { ok: false, error: 'game is over' });
          s.night++; s.phase = 'night'; s.victim = null;
          s.script = wwScript(s); s.scriptIx = 1;
          wwLights(false);
          fireAudio(SND.night, 'all', 0.7);
          say(s.script[0]);
          return done();
        }
        if (a === 'narrate') {
          if (!s.script) return out(409, { ok: false, error: 'no script — start a night first' });
          var ix = Math.max(0, Math.min(s.script.length - 1, +(b && b.ix != null ? b.ix : s.scriptIx)));
          say(s.script[ix]); s.scriptIx = ix + 1;
          return done({ ix: ix });
        }
        if (a === 'dawn') {
          if (s.phase !== 'night') return out(409, { ok: false, error: 'not night' });
          wwLights(true);
          var vp = name ? player(name) : null;
          if (name && !vp) return out(404, { ok: false, error: 'no such player' });
          if (vp) { vp.alive = false; s.victim = vp.name; }
          s.phase = 'day';
          say('Dawn breaks over the village. ' + (vp ? ('Sadly, ' + vp.name + ' did not survive the night.') : 'A miracle — everyone survived the night!'));
          wwWinCheck();
          return done();
        }
        if (a === 'lynch') {
          if (s.phase !== 'day') return out(409, { ok: false, error: 'not day' });
          var lp = name ? player(name) : null;
          if (name && !lp) return out(404, { ok: false, error: 'no such player' });
          if (lp) {
            lp.alive = false;
            say('The village has spoken. ' + lp.name + ' was ' + (lp.role === 'werewolf' ? 'a werewolf!' : ('not a wolf — ' + lp.name + ' was a ' + lp.role + '.')));
          } else say('The village cannot decide. No one is banished today.');
          if (!wwWinCheck()) s.phase = 'dusk';
          return done();
        }
        if (a === 'kill') {   /* manual toggle from the host roster */
          var kp = player(name); if (!kp) return out(404, { ok: false, error: 'no such player' });
          kp.alive = (b && b.alive === true) ? true : false;
          if (kp.alive) s.victim = (s.victim === kp.name) ? null : s.victim;
          wwWinCheck();
          return done();
        }
      }

      return out(400, { ok: false, error: 'unknown action "' + a + '" for ' + s.id });
    }

    /* ---- deck manager writes (backed up, whitelisted name, DECKS_DIR only) ---- */
    function deckWrite(b, out) {
      var name = String((b && b.name) || '').replace(/\.(txt|md)$/i, '').replace(/[^\w &()'\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!name || name.charAt(0) === '.') return out(400, { ok: false, error: 'need a sensible {name}' });
      var file = path.normalize(path.join(DECKS_DIR, name + '.txt'));
      if (!file.startsWith(DECKS_DIR + path.sep)) return out(400, { ok: false, error: 'bad name' });
      try { fs.mkdirSync(DECKS_DIR, { recursive: true }); } catch (e) {}
      var existed = fs.existsSync(file);
      if (existed) backupFile(file);   /* timestamped copy into _backups/ before any overwrite/delete */
      if (b && b.delete) {
        if (!existed) return out(404, { ok: false, error: 'no such deck' });
        try { fs.unlinkSync(file); } catch (e) { return out(500, { ok: false, error: e.message }); }
        try { logDiary('games', '🗑 deck deleted: ' + name + ' (backed up)'); } catch (e) {}
        return out(200, { ok: true, deleted: name });
      }
      var text = String((b && b.text) || '').replace(/\r\n?/g, '\n');
      if (text.length > 256 * 1024) return out(400, { ok: false, error: 'deck too big (256KB max)' });
      var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return out(400, { ok: false, error: 'deck is empty' });
      try { fs.writeFileSync(file, lines.join('\n') + '\n'); } catch (e) { return out(500, { ok: false, error: e.message }); }
      try { logDiary('games', '💾 deck saved: ' + name + ' (' + lines.length + ')'); } catch (e) {}
      return out(200, { ok: true, name: name, count: lines.length, id: 'file:' + name + '.txt', existed: existed });
    }

    /* ---- broadcast guard: G.s (server var) is the single source of truth; a stale
       client POST /api/state can neither clobber a live game nor resurrect a dead one ---- */
    var _pgBcast = broadcastState;
    broadcastState = function (except) {
      if (G.s) state.partyGame = G.s;
      else if (state.partyGame) state.partyGame = null;
      return _pgBcast(except);
    };
    if (state.partyGame) state.partyGame = null;   /* boot: a persisted session never survives a restart */

    /* ---- routes ---- */
    if (typeof server === 'undefined' || !server || !server.prependListener) { console.log('[games] no server — engine idle'); return; }
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      var p = u.pathname;
      if (p === '/api/panic') { if (G.s) endGame('panic', true); return; }   /* INVARIANT: panic ends any game; response stays with core */
      if (p !== '/api/games' && p.indexOf('/api/games/') !== 0) return;

      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; }; res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      function body(cb) { var bb = ''; req.on('data', function (d) { bb += d; if (bb.length > 512 * 1024) req.destroy(); }); req.on('end', function () { var j = null; try { j = bb ? JSON.parse(bb) : {}; } catch (e) { return out(400, { ok: false, error: 'bad json' }); } cb(j || {}); }); req.on('error', function () {}); }

      if (p === '/api/games' && req.method === 'GET')
        return out(200, { ok: true, engine: 'RS-GAMES v1.0', games: GAMES, decks: pgDecks(), kid: !!state.kid,
          session: G.s ? { id: G.s.id, phase: G.s.phase, players: G.s.players.length } : null });
      if (req.method !== 'POST') return out(405, { ok: false, error: 'method' });
      return body(function (b) {
        try {
          if (p === '/api/games/start') return startGame(b, out);
          if (p === '/api/games/end') { var was = G.s ? G.s.id : null; return out(200, { ok: true, ended: endGame((b && b.reason) || 'host'), was: was }); }
          if (p === '/api/games/action') return doAction(b, out);
          if (p === '/api/games/deck') return deckWrite(b, out);
          return out(404, { ok: false, error: 'unknown games route' });
        } catch (e) { return out(500, { ok: false, error: String((e && e.message) || e) }); }
      });
    });
    console.log('[games] RS-GAMES v1.0 ready — ' + GAMES.map(function (g) { return g.icon; }).join(' ') + '  GET /api/games · POST /api/games/start|action|end|deck');
  } catch (e) { try { console.error('[games] init failed:', e && e.message); } catch (x) {} }
})();

/* ================= ROOMSCAPE AUDIO STOP (RS-AUDIO-STOP v1.0, 2026-08-02) =================
   Panic button for sound (conductor v4.24, pairs with fx.js v1.39 + app v3.41).
   POST /api/audio/stop -> cancels queued mode-audio timers (clearAudioTimers)
   and broadcasts a social stop-all message; fx.js IE.stopAllSfx() pauses every
   tracked Audio element on every frame. Responds { ok:true, stopped:<clients> }.
   ======================================================================= */
(function () {
  try {
    if (typeof server === 'undefined' || !server || !server.prependListener) return;
    server.prependListener('request', function (req, res) {
      var u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { return; }
      if (u.pathname !== '/api/audio/stop') return;
      var W = res.writeHead.bind(res), E = res.end.bind(res);
      res.writeHead = res.setHeader = function () { return res; }; res.write = res.end = function () { return true; };
      function out(code, obj) { try { W(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); E(JSON.stringify(obj)); } catch (e) {} }
      if (req.method !== 'POST') return out(405, { ok: false, error: 'method' });
      req.resume();
      req.on('end', function () {
        try { if (typeof clearAudioTimers === 'function') clearAudioTimers(); } catch (e) {}
        var msg = { ie: true, type: 'social', id: 'stopall', sfx: null, event: null, stop: true, t: Date.now() };
        var n = 0;
        try { for (var cl of clients) { wsSend(cl.sock, msg); n++; } } catch (e) {}
        try { logDiary('audio', '\u23f9 stop all sounds (' + n + ' frames)'); } catch (e) {}
        out(200, { ok: true, stopped: n });
      });
      req.on('error', function () {});
    });
    console.log('[audio] RS-AUDIO-STOP v1.0 ready \u2014 POST /api/audio/stop');
  } catch (e) { try { console.error('[audio] stop init failed:', e && e.message); } catch (x) {} }
})();
