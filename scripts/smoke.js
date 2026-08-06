#!/usr/bin/env node
/* Roomscape smoke test v1.4 — boots the conductor on a scratch port and checks
   the core API surface. No HA/MA needed. Exit 0 = pass.
   v1.4 (Phase 3b, RS-THEME-ZIP): export/import over zip — boot 1 now points
   THEMES_DIR at a TMP COPY of the repo's themes/ (import/overwrite writes
   .trash + replaces the pack; the repo tree must stay byte-identical).
   Checks: export ocean-depths -> 200 application/zip with PK magic, the zip
   parses (conductor-lib/zip.js) and carries theme.json + the pano scene;
   re-import -> 409 exists; ?overwrite=1 -> ok with mode ocean-depths.main and
   the old pack moved into THEMES_DIR/.trash; a crafted '..' zip entry -> 400;
   unknown pack export -> 404.
   v1.3 (Phase 3a, RS-THEMES v1): theme-pack loader — /api/themes lists the
   shipped ocean-depths pack (mode 'ocean-depths.main', non-empty missing[]),
   the expanded in-memory profile has layout-sized frames[] + __theme__/ scene
   refs, pack media serves via /media/__theme__%2F..., a /api/profiles
   round-trip neither persists nor deletes theme modes, and a traversal
   attempt on the theme media route is rejected. Boot 1 now uses a scratch
   PROFILES_FILE so the round-trip write never touches the repo store.
   v1.2 (Phase 2c): /api/layout must always carry derived roles + atRest; a
   second boot with a custom CONFIG_FILE (atRestMode + single wall of three)
   verifies config-driven at-rest + role derivation.
   Usage: node scripts/smoke.js                                                */
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PORT = 8190;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-smoke-'));

// v1.4: boot 1 gets a THROWAWAY copy of the repo's themes/ — the import
// overwrite check replaces the pack and writes .trash, which must never
// touch the repo working tree (APP_DIR=ROOT would otherwise scan it live).
const themesTmp = path.join(tmp, 'themes');
fs.cpSync(path.join(ROOT, 'themes'), themesTmp, { recursive: true });

const child = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
  env: Object.assign({}, process.env, {
    PORT: String(PORT),
    APP_DIR: ROOT,
    STATE_FILE: path.join(tmp, 'state.json'),
    PROFILES_FILE: path.join(tmp, 'profiles1.json'),   // v1.3: round-trip check WRITES profiles — scratch file, never the repo store
    MEDIA_DIR: path.join(tmp, 'media'),          // v1.1: upload check writes here, not the repo
    THEMES_DIR: themesTmp,                       // v1.4: import/overwrite checks write here, not the repo
    HA_URL: '', HA_TOKEN: '', MA_URL: '', MA_TOKEN: ''
  }),
  stdio: ['ignore', 'pipe', 'pipe']
});
let bootLog = '';
child.stdout.on('data', d => bootLog += d);
child.stderr.on('data', d => bootLog += d);

function post(p, obj, port) {
  return new Promise((res, rej) => {
    const body = JSON.stringify(obj);
    const rq = http.request({ host: '127.0.0.1', port: port || PORT, path: p, method: 'POST', timeout: 4000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, r => {
      let s = ''; r.on('data', c => s += c);
      r.on('end', () => res({ code: r.statusCode, body: s }));
    });
    rq.on('error', rej).on('timeout', function () { rq.destroy(new Error('timeout')); });
    rq.end(body);
  });
}
function get(p, port) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: port || PORT, path: p, timeout: 4000 }, r => {
      let s = ''; r.on('data', c => s += c);
      r.on('end', () => res({ code: r.statusCode, body: s }));
    }).on('error', rej).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
// v1.4: binary-safe GET (zip export) + raw-body POST (zip import)
function getBuf(p, port) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: port || PORT, path: p, timeout: 8000 }, r => {
      const cs = []; r.on('data', c => cs.push(c));
      r.on('end', () => res({ code: r.statusCode, headers: r.headers, body: Buffer.concat(cs) }));
    }).on('error', rej).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
function postRaw(p, buf, ctype, port) {
  return new Promise((res, rej) => {
    const rq = http.request({ host: '127.0.0.1', port: port || PORT, path: p, method: 'POST', timeout: 8000,
      headers: { 'Content-Type': ctype || 'application/zip', 'Content-Length': buf.length } }, r => {
      let s = ''; r.on('data', c => s += c);
      r.on('end', () => res({ code: r.statusCode, body: s }));
    });
    rq.on('error', rej).on('timeout', function () { rq.destroy(new Error('timeout')); });
    rq.end(buf);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const checks = [];
function check(name, ok, detail) { checks.push({ name, ok, detail }); console.log((ok ? '  ✔ ' : '  ✘ ') + name + (ok ? '' : '  — ' + detail)); }

(async () => {
  // wait for boot
  let up = false;
  for (let i = 0; i < 30 && !up; i++) { await sleep(500); try { up = (await get('/api/health')).code === 200; } catch (e) {} }
  check('conductor boots and serves /api/health', up, 'no response after 15s. Boot log:\n' + bootLog.slice(-2000));
  if (up) {
    const state = await get('/api/state');
    check('/api/state returns JSON', state.code === 200 && !!JSON.parse(state.body), 'code ' + state.code);

    const layout = await get('/api/layout');
    let lj = null; try { lj = JSON.parse(layout.body); } catch (e) {}
    check('/api/layout has frames[]', !!(lj && Array.isArray(lj.frames) && lj.frames.length), layout.body.slice(0, 200));

    // v1.2 (Phase 2c): roles are ALWAYS served — derived defaults on the reference layout
    const ro = (lj && lj.roles) || {};
    check('/api/layout roles derived (primary R2, centers L2/R2, corners L1/L3/R1/R3, sweepOrder=frames)',
      ro.primary === 'R2'
        && JSON.stringify(ro.centers) === '["L2","R2"]'
        && JSON.stringify(ro.corners) === '["L1","L3","R1","R3"]'
        && JSON.stringify(ro.sweepOrder) === JSON.stringify(lj && lj.frames),
      JSON.stringify(ro));
    check('/api/layout atRest defaults to dining', !!lj && lj.atRest === 'dining', JSON.stringify(lj && lj.atRest));

    const prof = await get('/api/profiles');
    check('/api/profiles returns 200', prof.code === 200, 'code ' + prof.code);
    check('NO music token/url leak in /api/profiles', prof.body.indexOf('"token"') === -1 && prof.body.indexOf('eyJ') === -1, 'settings.music leaked');
    let pj = null; try { pj = JSON.parse(prof.body); } catch (e) {}
    check('/api/profiles has at-rest profile', !!(pj && pj.profiles && Object.keys(pj.profiles).length >= 1), 'no profiles');

    const rooms = await get('/api/rooms');
    let rj = null; try { rj = JSON.parse(rooms.body); } catch (e) {}
    check('/api/rooms ok:true with rooms[]', !!(rj && rj.ok && Array.isArray(rj.rooms) && rj.rooms.length), rooms.body.slice(0, 200));

    const games = await get('/api/games');
    check('/api/games responds', games.code === 200, 'code ' + games.code);

    const scenes = await get('/api/scenes');
    check('/api/scenes responds', scenes.code === 200, 'code ' + scenes.code);

    const app = await get('/');
    check('app page serves', app.code === 200 && app.body.length > 1000, 'code ' + app.code);

    const frame = await get('/frame.html?frame=L1');
    check('frame page serves', frame.code === 200, 'code ' + frame.code);

    // v1.1 (Phase 2b): router-ported routes + revived POST /api/upload
    const PNG1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==';
    const up = await post('/api/upload', { name: 'smoke-upload.png', b64: PNG1x1 });
    let uj = null; try { uj = JSON.parse(up.body); } catch (e) {}
    const upFile = path.join(tmp, 'media', 'smoke-upload.png');
    check('POST /api/upload saves into media dir', up.code === 200 && !!(uj && uj.ok) && fs.existsSync(upFile),
      'code ' + up.code + ' body ' + up.body.slice(0, 200));
    try { fs.unlinkSync(upFile); } catch (e) {}
    const upBad = await post('/api/upload', { name: '../evil.png', b64: PNG1x1 });
    check('POST /api/upload rejects path traversal', upBad.code === 400, 'code ' + upBad.code);

    for (const [pth, key] of [['/api/mediafx', 'imgAdjust'], ['/api/modeposters', 'posters'],
                              ['/api/social-config', 'effects'], ['/api/viz', 'modes']]) {
      const r = await get(pth);
      let j = null; try { j = JSON.parse(r.body); } catch (e) {}
      check('GET ' + pth + ' ok:true (router)', r.code === 200 && !!(j && j.ok && (key in j)), 'code ' + r.code + ' ' + r.body.slice(0, 120));
    }

    // ---- v1.3 (Phase 3a): RS-THEMES v1 — theme-pack loader ----
    check('boot log shows theme scan summary', bootLog.indexOf('[themes] scan:') >= 0, 'no [themes] scan line in boot log');

    const th = await get('/api/themes');
    let tj = null; try { tj = JSON.parse(th.body); } catch (e) {}
    const od = tj && tj.ok && Array.isArray(tj.themes) ? tj.themes.find(t => t && t.id === 'ocean-depths') : null;
    check('/api/themes lists ocean-depths with mode ocean-depths.main',
      !!(od && Array.isArray(od.modes) && od.modes.indexOf('ocean-depths.main') >= 0 && (!od.errors || !od.errors.length)),
      th.body.slice(0, 300));
    check('/api/themes reports the pack\'s absent sound in missing[]',
      !!(od && Array.isArray(od.missing) && od.missing.length && od.missing.indexOf('sounds/underwater_loop.mp3') >= 0),
      JSON.stringify(od && od.missing));

    const prof2 = await get('/api/profiles');
    let pj2 = null; try { pj2 = JSON.parse(prof2.body); } catch (e) {}
    const tm = pj2 && pj2.profiles && pj2.profiles['ocean-depths.main'];
    const nFrames = lj && lj.frames ? lj.frames.length : -1;
    check('profiles[ocean-depths.main] expanded: frames[] sized to layout, frameScenes[0] is a __theme__/ ref',
      !!(tm && Array.isArray(tm.frames) && tm.frames.length === nFrames
         && Array.isArray(tm.frameScenes) && typeof tm.frameScenes[0] === 'string' && tm.frameScenes[0].indexOf('__theme__/') === 0),
      JSON.stringify(tm && { frames: tm.frames, frameScenes: tm.frameScenes }).slice(0, 300));

    // pack media serves through /media with the frontend's whole-rel encoding (pickScene convention)
    const sceneUrl = '/media/' + encodeURIComponent('__theme__/ocean-depths/scenes/depths_pano.png');
    const img = await get(sceneUrl);
    check('theme scene serves via ' + sceneUrl, img.code === 200 && img.body.length > 100, 'code ' + img.code + ' len ' + img.body.length);

    // round-trip: POST the served map straight back — theme modes must survive in memory but never reach disk
    if (pj2 && pj2.profiles) {
      const rt = await post('/api/profiles', { profiles: pj2.profiles, tagmap: pj2.tagmap || {}, settings: pj2.settings || {} });
      const prof3 = await get('/api/profiles');
      let pj3 = null; try { pj3 = JSON.parse(prof3.body); } catch (e) {}
      check('POST /api/profiles round-trip keeps theme modes in memory (re-expanded, not deleted)',
        rt.code === 200 && !!(pj3 && pj3.profiles && pj3.profiles['ocean-depths.main']),
        'post ' + rt.code + ' ' + rt.body.slice(0, 160));
      let disk = null; try { disk = JSON.parse(fs.readFileSync(path.join(tmp, 'profiles1.json'), 'utf8')); } catch (e) {}
      const diskDots = disk && disk.profiles ? Object.keys(disk.profiles).filter(k => k.indexOf('.') >= 0) : ['unreadable'];
      const diskThemeSecs = disk && disk.settings && Array.isArray(disk.settings.playSections)
        ? disk.settings.playSections.filter(s => s && s._theme) : [];
      check('theme modes + _theme sections NOT persisted to profiles.json',
        diskDots.length === 0 && diskThemeSecs.length === 0,
        'dot ids on disk: ' + JSON.stringify(diskDots) + ' theme sections: ' + diskThemeSecs.length);
    } else check('round-trip prerequisites (profiles GET parsed)', false, prof2.body.slice(0, 160));

    const trav = await get('/media/' + encodeURIComponent('__theme__/../profiles.json'));
    check('theme media route rejects traversal', trav.code >= 400 && trav.code < 500, 'code ' + trav.code);

    const rs = await post('/api/themes/rescan', {});
    let rsj = null; try { rsj = JSON.parse(rs.body); } catch (e) {}
    check('POST /api/themes/rescan re-reports the pack', rs.code === 200 && !!(rsj && rsj.ok && (rsj.themes || []).some(t => t && t.id === 'ocean-depths')), 'code ' + rs.code + ' ' + rs.body.slice(0, 160));

    // ---- v1.4 (Phase 3b): RS-THEME-ZIP — export/import over zip ----
    const zipLib = require(path.join(ROOT, 'conductor-lib', 'zip.js'));

    const exp = await getBuf('/api/theme/export/ocean-depths');
    check('GET /api/theme/export/ocean-depths -> 200 application/zip with PK magic',
      exp.code === 200 && String(exp.headers['content-type']).indexOf('application/zip') === 0
        && exp.body.length > 4 && exp.body[0] === 0x50 && exp.body[1] === 0x4b,
      'code ' + exp.code + ' ct ' + exp.headers['content-type'] + ' len ' + exp.body.length);

    let znames = [];
    try { znames = zipLib.readZip(exp.body).map(e => e.name); } catch (e) { znames = ['readZip: ' + e.message]; }
    check('exported zip parses and carries ocean-depths/theme.json + scenes/depths_pano.png',
      znames.indexOf('ocean-depths/theme.json') >= 0 && znames.indexOf('ocean-depths/scenes/depths_pano.png') >= 0,
      JSON.stringify(znames).slice(0, 300));

    const exp404 = await getBuf('/api/theme/export/no-such-pack');
    check('GET /api/theme/export/<unknown> -> 404', exp404.code === 404, 'code ' + exp404.code);

    const imp409 = await postRaw('/api/theme/import', exp.body, 'application/zip');
    let i9 = null; try { i9 = JSON.parse(imp409.body); } catch (e) {}
    check('POST /api/theme/import of an existing pack -> 409 {error:"exists"}',
      imp409.code === 409 && !!(i9 && i9.error === 'exists' && i9.pack === 'ocean-depths'),
      'code ' + imp409.code + ' ' + imp409.body.slice(0, 160));

    const impOw = await postRaw('/api/theme/import?overwrite=1', exp.body, 'application/octet-stream');
    let io = null; try { io = JSON.parse(impOw.body); } catch (e) {}
    check('POST /api/theme/import?overwrite=1 -> ok:true with mode ocean-depths.main',
      impOw.code === 200 && !!(io && io.ok && io.pack === 'ocean-depths'
        && Array.isArray(io.modes) && io.modes.indexOf('ocean-depths.main') >= 0),
      'code ' + impOw.code + ' ' + impOw.body.slice(0, 200));

    let trashed = [];
    try { trashed = fs.readdirSync(path.join(themesTmp, '.trash')); } catch (e) {}
    check('overwrite moved the old pack into THEMES_DIR/.trash (never deleted)',
      trashed.some(n => n.indexOf('ocean-depths.replaced-') === 0), JSON.stringify(trashed));

    const evil = zipLib.writeZip([{ name: '../evil/theme.json', data: Buffer.from('{"format":1}') }]);
    const impBad = await postRaw('/api/theme/import', evil, 'application/zip');
    check('POST /api/theme/import rejects a ".." zip entry -> 400',
      impBad.code === 400, 'code ' + impBad.code + ' ' + impBad.body.slice(0, 160));
  }
  child.kill();

  // ---- boot 2 (v1.2, Phase 2c): custom CONFIG_FILE — at-rest override + one wall of three ----
  const PORT2 = PORT + 1;
  const cfgFile = path.join(tmp, 'smoke-config.json');
  fs.writeFileSync(cfgFile, JSON.stringify({ atRestMode: 'calm', layout: { walls: { W: ['W1', 'W2', 'W3'] } } }));
  const child2 = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT2),
      APP_DIR: ROOT,
      CONFIG_FILE: cfgFile,
      STATE_FILE: path.join(tmp, 'state2.json'),
      PROFILES_FILE: path.join(tmp, 'profiles2.json'),
      MEDIA_DIR: path.join(tmp, 'media'),
      HA_URL: '', HA_TOKEN: '', MA_URL: '', MA_TOKEN: ''
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let bootLog2 = '';
  child2.stdout.on('data', d => bootLog2 += d);
  child2.stderr.on('data', d => bootLog2 += d);
  try {
    let up2 = false;
    for (let i = 0; i < 30 && !up2; i++) { await sleep(500); try { up2 = (await get('/api/health', PORT2)).code === 200; } catch (e) {} }
    check('config boot: conductor boots with CONFIG_FILE (atRestMode calm, wall W of 3)', up2, 'no response after 15s. Boot log:\n' + bootLog2.slice(-2000));
    if (up2) {
      const lay2 = await get('/api/layout', PORT2);
      let l2 = null; try { l2 = JSON.parse(lay2.body); } catch (e) {}
      const r2 = (l2 && l2.roles) || {};
      check('config boot: layout.atRest === "calm"', !!l2 && l2.atRest === 'calm', lay2.body.slice(0, 200));
      check('config boot: derived roles on wall W (primary W2, corners include W1+W3)',
        r2.primary === 'W2'
          && Array.isArray(r2.corners) && r2.corners.indexOf('W1') >= 0 && r2.corners.indexOf('W3') >= 0
          && JSON.stringify(r2.centers) === '["W2"]'
          && JSON.stringify(r2.sweepOrder) === '["W1","W2","W3"]',
        JSON.stringify(r2));
    }
  } catch (e) { check('config boot: layout checks ran', false, String(e)); }
  child2.kill();

  const fails = checks.filter(c => !c.ok).length;
  console.log('\n' + (fails ? 'SMOKE FAIL — ' + fails + ' failing' : 'SMOKE PASS — ' + checks.length + ' checks'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('smoke error:', e); child.kill(); process.exit(1); });
