#!/usr/bin/env node
/* Roomscape smoke test v1.2 — boots the conductor on a scratch port and checks
   the core API surface. No HA/MA needed. Exit 0 = pass.
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

const child = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
  env: Object.assign({}, process.env, {
    PORT: String(PORT),
    APP_DIR: ROOT,
    STATE_FILE: path.join(tmp, 'state.json'),
    MEDIA_DIR: path.join(tmp, 'media'),          // v1.1: upload check writes here, not the repo
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
