/* ===================================================================
   conductor-lib/themes.js  v1.1  (RS-THEMES v1, community v0.32)
   v1.1 (Phase 3b, RS-THEME-ZIP): manifest validation extracted into
   validateManifest(j) (pure, no fs) so the zip-import endpoint can vet a
   theme.json BEFORE writing anything; packIdOk(id) exposes the pack-id
   charset rule. scanThemes behaviour unchanged (it now calls both).
   Theme-pack loader: pure scan/validate/expand logic for docs/THEMES.md
   format 1 packs. One folder under THEMES_DIR = one pack; a pack's modes
   are registered in-memory under the namespaced id "<pack>.<modeId>"
   (DOT separator — mode ids travel in URL paths like /api/mode/<id>,
   and encoded slashes are unreliable across proxies).
   SAFETY RULES (absolute):
   1. NEVER require npm packages here — node builtins (fs/path) ONLY.
      This file lives on the share; an npm require would resolve against
      the share's Windows-only node_modules and shadow the container's.
   2. Functions that appended patch blocks REASSIGN stay in conductor.js —
      this module is called from the RS-THEMES block through stable refs.
   ctx surface: none read at construction time; ctx is accepted for parity
   with the other lib modules (future use: log sinks, regexes).
   API:
     scanThemes(dir)  -> { dir, packs:[{id,dir,name,author,version,kidSafe,
                            section,requires,cover,modes:{id:def},errors[]}] }
     expandMode(pack, modeId, modeDef, layout, settings)
                      -> { profile, lightScenePayload, missing[], warnings[] }
       profile is LEGACY-SHAPE (frames[]/frameScenes[]/overlays[]/effects[]
       sized from layout.frames), media refs rewritten to the pseudo-rels
       __theme__/<pack>/<relpath> (file exists) or __missing__/<pack>/<relpath>
       (file absent — serving returns 404, the app renders a placeholder).
       Sound refs get a "media/" prefix so fx-audio's relative fetch()es hit
       the /media/__theme__/ route with zero frontend changes.
   =================================================================== */
'use strict';
const fs = require('fs'), path = require('path');

module.exports = function (ctx) {
  const PACK_ID_RE = /^[a-z0-9-]+$/;                 // pack folder names (THEMES.md rule)
  const MODE_ID_RE = /^[A-Za-z0-9_-]+$/;             // mode ids — no dots (dot = namespace separator)
  const KINDS = { pano: 1, portrait: 1, photos: 1, viz: 1, playlist: 1, score: 1, map: 1, clock: 1, off: 1 };

  function relOk(rel) {                              // pack-relative media path: contained, forward slashes only
    if (typeof rel !== 'string' || !rel || rel.length > 300) return false;
    if (rel.indexOf('\\') >= 0 || rel.charAt(0) === '/') return false;
    if (rel.split('/').some(function (s) { return s === '' || s === '.' || s === '..'; })) return false;
    return true;
  }

  function packIdOk(id) { return typeof id === 'string' && !!id && PACK_ID_RE.test(id); }

  /* ---------- manifest validation: PURE (no fs) — shared by scanThemes and the
     RS-THEME-ZIP import endpoint. Takes the PARSED theme.json; returns
     { errors:[], name, author, version, kidSafe, section, requires, modes:{id:def} }.
     Fatal problems (not an object / wrong format / no modes) leave modes empty. ---------- */
  function validateManifest(j) {
    const v = { errors: [], name: '', author: '', version: '', kidSafe: false, section: null, requires: null, modes: {} };
    if (!j || typeof j !== 'object' || Array.isArray(j)) { v.errors.push('theme.json: not an object'); return v; }
    if (j.format !== 1) { v.errors.push('unsupported format ' + JSON.stringify(j.format) + ' (this loader speaks format 1)'); return v; }
    if (typeof j.name === 'string') v.name = j.name;
    if (typeof j.author === 'string') v.author = j.author;
    if (typeof j.version === 'string') v.version = j.version;
    v.kidSafe = j.kidSafe === true;
    v.requires = (j.requires && typeof j.requires === 'object') ? j.requires : null;
    if (j.section && typeof j.section === 'object' && typeof j.section.id === 'string' && j.section.id) {
      v.section = { id: String(j.section.id).slice(0, 40),
                    name: String(j.section.name || j.section.id).slice(0, 60),
                    icon: String(j.section.icon || '').slice(0, 8) };
    }
    const modes = (j.modes && typeof j.modes === 'object' && !Array.isArray(j.modes)) ? j.modes : null;
    if (!modes || !Object.keys(modes).length) { v.errors.push('theme.json has no modes'); return v; }
    Object.keys(modes).forEach(function (mid) {
      const m = modes[mid];
      if (!MODE_ID_RE.test(mid)) { v.errors.push('mode "' + mid + '": illegal id (allowed: A-Z a-z 0-9 _ -; no dots)'); return; }
      if (!m || typeof m !== 'object' || Array.isArray(m)) { v.errors.push('mode "' + mid + '": not an object'); return; }
      if (!m.wall || typeof m.wall !== 'object') { v.errors.push('mode "' + mid + '": missing "wall" (required by format 1)'); return; }
      v.modes[mid] = m;
    });
    if (!Object.keys(v.modes).length && !v.errors.length) v.errors.push('no valid modes');
    return v;
  }

  /* ---------- scan: one level of THEMES_DIR; every folder becomes a report entry ---------- */
  function scanThemes(dir) {
    const packs = [];
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { return { dir: dir, packs: packs }; }   // no themes dir = no packs (not an error)
    for (const en of ents) {
      if (!en.isDirectory() || en.name.charAt(0) === '.' || en.name.charAt(0) === '_') continue;
      const id = en.name, pdir = path.join(dir, id);
      const pack = { id: id, dir: pdir, name: id, author: '', version: '', kidSafe: false,
                     section: null, requires: null, cover: null, modes: {}, errors: [] };
      packs.push(pack);
      if (!PACK_ID_RE.test(id)) { pack.errors.push('illegal pack folder name "' + id + '" (allowed: a-z 0-9 -)'); continue; }
      let raw;
      try { raw = fs.readFileSync(path.join(pdir, 'theme.json'), 'utf8'); }
      catch (e) { pack.errors.push('theme.json missing'); continue; }
      let j;
      try { j = JSON.parse(raw.replace(/^\uFEFF/, '')); }
      catch (e) { pack.errors.push('theme.json: ' + (e && e.message)); continue; }
      const v = validateManifest(j);                 // v1.1: shared with the RS-THEME-ZIP import
      v.errors.forEach(function (e2) { pack.errors.push(e2); });
      pack.name = v.name || id;
      pack.author = v.author; pack.version = v.version; pack.kidSafe = v.kidSafe;
      pack.requires = v.requires; pack.section = v.section;
      pack.modes = v.modes;
      // conventional pack poster (cover.jpg per THEMES.md; .png accepted) — pack-level, not a mode ref
      if (fs.existsSync(path.join(pdir, 'cover.jpg'))) pack.cover = '__theme__/' + id + '/cover.jpg';
      else if (fs.existsSync(path.join(pdir, 'cover.png'))) pack.cover = '__theme__/' + id + '/cover.png';
    }
    return { dir: dir, packs: packs };
  }

  /* ---------- expand: one pack mode -> one legacy-shape profile ---------- */
  function expandMode(pack, modeId, m, layout, settings) {
    const missing = [], warnings = [];
    function mediaRef(rel, what) {                    // visual media: stored as the raw pseudo-rel (scene keys / overlays / effects)
      if (!relOk(rel)) { warnings.push('mode "' + modeId + '": bad ' + (what || 'media') + ' path ' + JSON.stringify(rel) + ' — dropped'); return null; }
      if (fs.existsSync(path.join(pack.dir, rel))) return '__theme__/' + pack.id + '/' + rel;
      if (missing.indexOf(rel) < 0) missing.push(rel);
      return '__missing__/' + pack.id + '/' + rel;
    }
    function soundRef(rel, what) {                    // audio: fx-audio fetch()es the ref relative to / — prefix media/ so it rides the /media theme route
      const r = mediaRef(rel, what);
      return r ? ('media/' + r) : null;
    }

    const frameIds = (layout && Array.isArray(layout.frames) && layout.frames.length) ? layout.frames : ['F1'];
    const n = frameIds.length;
    const wall = m.wall || {};
    const baseKind = (typeof wall.kind === 'string' && KINDS[wall.kind]) ? wall.kind : 'pano';
    if (wall.kind && !KINDS[wall.kind]) warnings.push('mode "' + modeId + '": unknown wall.kind "' + wall.kind + '" -> pano');
    const baseScene = (wall.scene != null) ? mediaRef(wall.scene, 'wall.scene') : null;
    const frames = [], frameScenes = [];
    for (let i = 0; i < n; i++) { frames.push(baseKind); frameScenes.push(baseScene); }

    // roles override the arrays at the HOST layout's role positions ('primary' is a single frame id)
    const roleMap = (layout && layout.roles) || {};
    if (m.roles && typeof m.roles === 'object') {
      Object.keys(m.roles).forEach(function (role) {
        const r = m.roles[role];
        if (!r || typeof r !== 'object') return;
        let ids = roleMap[role];
        if (role === 'primary') ids = ids ? [ids] : [];
        if (!Array.isArray(ids) || !ids.length) {
          warnings.push('mode "' + modeId + '": layout role "' + role + '" not on this host (roles: ' + Object.keys(roleMap).join(', ') + ') — ignored');
          return;
        }
        const rKind = (typeof r.kind === 'string' && KINDS[r.kind]) ? r.kind : baseKind;
        const rScene = (r.scene != null) ? mediaRef(r.scene, 'roles.' + role + '.scene') : null;
        ids.forEach(function (f) {
          const ix = frameIds.indexOf(f);
          if (ix < 0) return;
          frames[ix] = rKind;
          if (rScene) frameScenes[ix] = rScene;
        });
      });
    }

    const prof = {
      name: (typeof m.name === 'string' && m.name) ? m.name : (pack.name + ' · ' + modeId),
      theme: pack.id,                                 // marker: in-memory theme mode, owned by this pack
      kidSafe: (m.kidSafe != null) ? !!m.kidSafe : !!pack.kidSafe,
      frames: frames,
      frameScenes: frameScenes,
      light: 'gallery'                                // safe default; light.scene below upgrades it to theme:<pack>
    };
    if (typeof m.accent === 'string') prof.accent = m.accent;
    if (typeof m.ambience === 'string') prof.ambience = m.ambience;
    if (baseScene) prof.scene = baseScene;            // Play-card thumbnail source (passthrough scene key)
    if (pack.section) prof.category = pack.section.id;// mode files under the pack's Play section chip
    if (m.overlay != null) { const o = mediaRef(m.overlay, 'overlay'); if (o) prof.overlays = frameIds.map(function () { return o; }); }
    if (m.effect != null) { const e = mediaRef(m.effect, 'effect'); if (e) prof.effects = frameIds.map(function () { return e; }); }
    if (m.transition && typeof m.transition === 'object') prof.transition = m.transition;

    let lightScenePayload = null;                     // caller registers it as lightScene 'theme:<pack>' and sets prof.light
    if (m.light && typeof m.light === 'object') {
      if (m.light.scene && typeof m.light.scene === 'object') lightScenePayload = m.light.scene;
      if (m.light.zones && typeof m.light.zones === 'object') {
        const hostZones = (((settings || {}).ha) || {}).lightZones || {};
        const lz = {};
        Object.keys(m.light.zones).forEach(function (z) {
          if (Object.prototype.hasOwnProperty.call(hostZones, z)) lz[z] = m.light.zones[z];
          else warnings.push('mode "' + modeId + '": light zone "' + z + '" not on this host (zones: ' + (Object.keys(hostZones).join(', ') || 'none') + ') — dropped');
        });
        if (Object.keys(lz).length) prof.lightZones = lz;
      }
    }
    if (m.music && typeof m.music === 'object' && typeof m.music.query === 'string' && m.music.query.trim()) {
      prof.music = m.music.query.trim();              // a QUERY, not a playlist name — modeMusicFollow falls back to substring match
      prof.musicQuery = true;
    }
    if (m.audio && typeof m.audio === 'object' && m.audio.loop != null) {
      const bed = soundRef(m.audio.loop, 'audio.loop');
      if (bed) prof.audio = { bed: bed, bedGain: (m.audio.gain != null ? +m.audio.gain : 0.4) };
    }
    if (m.intro && typeof m.intro === 'object') {
      const I = JSON.parse(JSON.stringify(m.intro));
      I.on = (I.on !== false);                        // presence in a pack = enabled (RS-INTRO requires .on)
      if (I.music && I.music.src != null && I.music.kind !== 'ma') I.music.src = soundRef(I.music.src, 'intro.music.src');
      if (Array.isArray(I.cues)) I.cues.forEach(function (c) { if (c && c.src != null) c.src = soundRef(c.src, 'intro.cue.src'); });
      prof.intro = I;
    }
    if (m.reveal && typeof m.reveal === 'object' && Array.isArray(m.reveal.videos)) {
      prof.reveal = {
        videos: m.reveal.videos.map(function (v) { return (v != null) ? mediaRef(v, 'reveal.video') : null; }),
        trigger: (m.reveal.trigger === 'random') ? 'random' : 'manual',
        everyS: m.reveal.everyS, jitter: m.reveal.jitter, fadeS: m.reveal.fadeS
      };
    }
    return { profile: prof, lightScenePayload: lightScenePayload, missing: missing, warnings: warnings };
  }

  return { scanThemes, expandMode, relOk, validateManifest, packIdOk };
};
