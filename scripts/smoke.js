#!/usr/bin/env node
/* Roomscape smoke test v1.1 — boots the conductor on a scratch port and checks
   the core API surface. No HA/MA needed. Exit 0 = pass.
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

function post(p, obj) {
  return new Promise((res, rej) => {
    const body = JSON.stringify(obj);
    const rq = http.request({ host: '127.0.0.1', port: PORT, path: p, method: 'POST', timeout: 4000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, r => {
      let s = ''; r.on('data', c => s += c);
      r.on('end', () => res({ code: r.statusCode, body: s }));
    });
    rq.on('error', rej).on('timeout', function () { rq.destroy(new Error('timeout')); });
    rq.end(body);
  });
}
function get(p) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p, timeout: 4000 }, r => {
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
  const fails = checks.filter(c => !c.ok).length;
  console.log('\n' + (fails ? 'SMOKE FAIL — ' + fails + ' failing' : 'SMOKE PASS — ' + checks.length + ' checks'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('smoke error:', e); child.kill(); process.exit(1); });
