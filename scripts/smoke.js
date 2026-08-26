#!/usr/bin/env node
/* Roomscape smoke test v2.0 — boots the conductor on a scratch port and checks
   the core API surface. No HA/MA needed. Exit 0 = pass.
   v2.0 (RS-SEC v1.03, documentation-inventory pass): one check per G-fix.
     G1  GET /api/log is 401 tokenless and 200 with the token; the ring buffer
         never contains the live admin token (boot 3 asks the first-run install
         for /api/log?q=admin with its own token and greps the reply), while the
         boot log still shows the token to whoever can read the container logs.
     G2  the internal loopback POST helpers attach x-rs-token (source canary on
         rsSelfHeaders + both call sites), and a party game that ends with
         scores really does reach /api/scores/result — proved end to end by
         starting a game, scoring, ending it, and reading the result back out of
         GET /api/scores. No 401 appears in the boot log.
     G3  MEDIA_DIR defaults to <APP_DIR>/media (boot 6, a scratch APP_DIR with
         neither folder), the legacy "Images & Videos" name still wins when it
         is the only one present, and the banner says which it chose.
     G4  with DATA_DIR set, the JSON stores, _backups and .thumbs land under it
         and nothing is written into APP_DIR; a legacy store beside APP_DIR is
         migrated in on first boot; backupFile() failure is loud.
     G5  POST /api/schedule rejects an unknown mode (400) and accepts a real one
         and the at-rest id; the served static allow-list no longer carries
         /control.html or /editor.html; a ping over the WS gets a pong; the
         weather poll reads the live pollMinutes (source canary).
     G6  version coherence — banner v5.05 (community v1.05), /api/health
         version 5.05 + repo 1.05, package.json 1.0.5, README/SECURITY/
         ARCHITECTURE/CHANGELOG headers all read 1.03.
   v1.9 (RS-SEC v1.02, frontend pass): 24 SERVED-FILE canaries in boot 1. There
   is no browser here, so the XSS and wiring fixes are proved by asserting on
   the bytes the conductor hands a client — /app.js, /engine.js, /fx.js,
   /frame.html, /scores.html are fetched over HTTP and checked for:
     A1  the app's WS URL carries token=, setAdminTok re-dials the socket
         (__rsWsReconnect + the engine's reconnect export), and frame.html
         still sends NO token (frames are read-only consumers).
     A2  /api/kid is no longer a bare fetch GET, and no bare fetch( survives
         against any mutating-GET path.
     B1/B4 both card builders escape the mode id; no url('…') style attribute
         is fed a %27-only-escaped path.
     B2  opt() escapes value AND label.
     B3  the wizard's frame-id regex is present and walls use Object.create(null).
     B5/B6 frame.html + scores.html escape " and ' (not just & and <), and the
         YouTube id is validated before it reaches an iframe src.
     B7  fx.js/engine.js attribute-escape WS-supplied media URLs.
     B8  the postMessage blank-origin exemption is file://-only.
     C2  the wall helpers can't throw on a non-array wall.
     C4  scores.html carries the admin token on its writes.
     C5  the fetch wrapper is same-origin-only / Headers-aware / Request-aware.
     C6/C12 frame.html fetches /api/layout absolutely, has a boot .catch, and
         acts on a late layout reply.
     C7  one IE.adoptLayoutPayload used by all three adoption sites.
     C10 the fx media-error fallback no longer detaches the failing node.
     C11 the legacy deck uses absolute /api paths + the token.
     C13 the dead Sound-Studio VIZ_STYLES copy is gone.
     plus a version canary for all five touched frontend files.
   v1.8 (RS-SEC v1.01): one check per security fix from the pre-release
   penetration audits.
     F1  static allow-list — app/frame/engine/fx/starter-sound still serve;
         /profiles.json /config.example.json /package.json /.gitignore
         /docs/INSTALL.md /conductor.js /data/admin-token /.env all 404.
     F2  a tokenless WebSocket cannot replace server state; the same push WITH
         ?token= does; a cross-origin upgrade is refused (403, not 101).
     F3  mutating GETs (/api/panic, /api/rescan, /api/game/…, /api/mode/…,
         /api/kid, /api/warmthumbs) are 401 without the token, 200 with it,
         while ordinary GETs stay open.
     F4  /api/tag/<id> is CLOSED by default (401 on GET and POST).
     F5  {"ha":{"__proto__":{"enabled":false}}} does NOT switch the auth gate off.
     F6  a symlink inside the media folder is not served (skipped with a note
         on filesystems that can't create one).
     F7  POST {layout:{walls:{…}}} REPLACES the wall set instead of adding to it.
     F8  a corrupt config.json is refused with 500, and left untouched.
     F9  a profiles write the wipe-block refuses answers 500, not ok:true.
     F10 a zip entry declaring more than the remaining budget is rejected
         before inflation.
     F12 bad / duplicate / empty frame ids -> 400.
     F13/F11/F14 source canaries + packIdOk('--')===false, oversize body -> 413,
         .bak rotation caps at 10, boot banner reads v5.01 (community v1.01).
   v1.7 (Phase 4b, RS-WIZARD): boot 1 gains the wizard canaries — the served
   app page carries the ✏️ Design toggle (id="designtgl") and the served
   /app.js carries openSetupWizard + the starter-sound remap
   (sounds/starter/, zero private-library sound paths); POST /api/identify
   {frame} answers 200 ok with the token and 401 without (it broadcasts the
   WS identify message — client count may be 0 here, that's fine); the six
   starter WAVs + LICENSES.md exist, each < 500 KB, total < 2 MB, and serve
   over HTTP. Boot 4 is an EMPTY-profiles boot (PROFILES_FILE containing
   {"profiles":{},"tagmap":{},"settings":{}}): GET / and /api/profiles must
   serve without a crash. NOTE: the JS empty-state itself (🪄 card, Design
   invitation, setup card) runs in the browser — no browser boots here, so
   those are covered only by the canaries above.
   v1.6 (Phase 4a, RS-AUTH): boots 1+2 run with ADMIN_TOKEN=smoketoken and the
   POST helpers all send x-rs-token — so every pre-existing mutation check now
   proves the route works WITH the token (and never writes a token file into
   the repo data/, which APP_DIR=ROOT would otherwise do). New checks:
   tokenless POST -> 401 {error:'auth'} while GETs stay open; GET
   /api/ha/entities is the one gated GET (401 tokenless; with token + no HA ->
   200 {ok:false,'ha not configured'}); boot 2 POSTs /api/config
   {atRestMode:'calm2'} against its scratch CONFIG_FILE (timestamped .bak
   appears beside it, /api/layout flips live, repo config untouched); boot 3 is
   a fresh scratch APP_DIR with NO ADMIN_TOKEN — the token generates, prints
   ("admin token (first run)"), lands in data/admin-token, and the file token
   authorizes a POST that a tokenless call can't make. There is deliberately NO
   localhost exemption in the gate — smoke IS localhost, so these checks
   genuinely exercise it.
   v1.5 (Phase 3c, RS-THEMES-UI): one cheap regression canary — the served app
   page must carry the theme-sheet markup hook (the static id="themesImport"
   file input that Settings → Theme packs → Import theme… clicks). No browser
   is booted; a grep of GET / suffices.
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
const TOK = 'smoketoken';   // v1.6: fixed admin token for boots 1+2 (env-injected)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-smoke-'));

// v1.4: boot 1 gets a THROWAWAY copy of the repo's themes/ — the import
// overwrite check replaces the pack and writes .trash, which must never
// touch the repo working tree (APP_DIR=ROOT would otherwise scan it live).
const themesTmp = path.join(tmp, 'themes');
fs.cpSync(path.join(ROOT, 'themes'), themesTmp, { recursive: true });

// v2.0 (G4): boot 1's writable state root. Everything the conductor writes —
// JSON stores, _backups, .thumbs — must resolve under DATA_DIR, so pointing it
// at a scratch dir both proves the fix and stops smoke littering the repo.
// (the legacy-store migration is exercised by boot 6, on a scratch APP_DIR —
//  nothing is ever planted in the repo working tree)
const dataTmp = path.join(tmp, 'data1');

const child = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
  env: Object.assign({}, process.env, {
    PORT: String(PORT),
    APP_DIR: ROOT,
    ADMIN_TOKEN: TOK,                            // v1.6: env token — nothing writes into the repo data/
    STATE_FILE: path.join(tmp, 'state.json'),
    PROFILES_FILE: path.join(tmp, 'profiles1.json'),   // v1.3: round-trip check WRITES profiles — scratch file, never the repo store
    DATA_DIR: dataTmp,                           // v2.0 (G4): the single writable state root — every JSON store must land HERE, not in the repo
    MEDIA_DIR: path.join(tmp, 'media'),          // v1.1: upload check writes here, not the repo
    THEMES_DIR: themesTmp,                       // v1.4: import/overwrite checks write here, not the repo
    HA_URL: '', HA_TOKEN: '', MA_URL: '', MA_TOKEN: ''
  }),
  stdio: ['ignore', 'pipe', 'pipe']
});
let bootLog = '';
child.stdout.on('data', d => bootLog += d);
child.stderr.on('data', d => bootLog += d);

function post(p, obj, port, tok) {   // v1.6: tok undefined -> smoke token; tok null -> tokenless; string -> that token
  return new Promise((res, rej) => {
    const body = JSON.stringify(obj);
    const hdrs = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    const t = (tok === undefined) ? TOK : tok;
    if (t) hdrs['x-rs-token'] = t;
    const rq = http.request({ host: '127.0.0.1', port: port || PORT, path: p, method: 'POST', timeout: 4000,
      headers: hdrs }, r => {
      let s = ''; r.on('data', c => s += c);
      r.on('end', () => res({ code: r.statusCode, body: s }));
    });
    rq.on('error', rej).on('timeout', function () { rq.destroy(new Error('timeout')); });
    rq.end(body);
  });
}
// v1.8: POST a body EXACTLY as given (JSON.stringify can't express a __proto__ key)
function postStr(p, body, port, tok) {
  return new Promise((res, rej) => {
    const hdrs = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    const t = (tok === undefined) ? TOK : tok;
    if (t) hdrs['x-rs-token'] = t;
    const rq = http.request({ host: '127.0.0.1', port: port || PORT, path: p, method: 'POST', timeout: 4000, headers: hdrs }, r => {
      let s = ''; r.on('data', c => s += c); r.on('end', () => res({ code: r.statusCode, body: s }));
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
// v1.6: GET carrying the admin token (for the one gated GET, /api/ha/entities)
function getTok(p, port, tok) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: port || PORT, path: p, timeout: 4000, headers: { 'x-rs-token': tok || TOK } }, r => {
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
      headers: { 'Content-Type': ctype || 'application/zip', 'Content-Length': buf.length, 'x-rs-token': TOK } }, r => {
      let s = ''; r.on('data', c => s += c);
      r.on('end', () => res({ code: r.statusCode, body: s }));
    });
    rq.on('error', rej).on('timeout', function () { rq.destroy(new Error('timeout')); });
    rq.end(buf);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---- v1.8 (RS-SEC v1.01) helpers ---- */
const crypto = require('crypto');
// raw WebSocket handshake: resolves { code, socket } — code 101 = upgraded
function wsConnect(pathQ, extraHeaders, port) {
  return new Promise((resolve) => {
    const rq = http.request({
      host: '127.0.0.1', port: port || PORT, path: pathQ || '/', timeout: 5000,
      headers: Object.assign({
        Connection: 'Upgrade', Upgrade: 'websocket',
        'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
        'Sec-WebSocket-Version': '13'
      }, extraHeaders || {})
    });
    let settled = false;
    const fin = (o) => { if (!settled) { settled = true; resolve(o); } };
    rq.on('upgrade', (res, socket) => { socket.on('error', () => {}); fin({ code: 101, socket }); });
    rq.on('response', (res) => { res.resume(); fin({ code: res.statusCode, socket: null }); });
    rq.on('error', (e) => fin({ code: 0, socket: null, err: String(e && e.message) }));
    rq.on('timeout', () => { try { rq.destroy(); } catch (e) {} fin({ code: 0, socket: null, err: 'timeout' }); });
    rq.end();
  });
}
// client -> server text frame (clients MUST mask, per RFC 6455)
function wsSendText(socket, obj) {
  const payload = Buffer.from(JSON.stringify(obj), 'utf8');
  const mask = crypto.randomBytes(4), len = payload.length;
  let header;
  if (len < 126) { header = Buffer.alloc(2); header[0] = 0x81; header[1] = 0x80 | len; }
  else { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i & 3];
  try { socket.write(Buffer.concat([header, mask, masked])); } catch (e) {}
}
/* v2.3 (I1): a raw masked frame with FIN under our control, so the fragment
   attack can actually be attempted rather than merely asserted about in source.
   opcode 0x1 = text (first fragment), 0x0 = continuation. */
function wsSendFragment(socket, bytes, opcode, fin) {
  const payload = Buffer.alloc(bytes, 0x61);           // 'a' — content is irrelevant
  const mask = crypto.randomBytes(4);
  const b0 = (fin ? 0x80 : 0x00) | opcode;
  let header;
  if (bytes < 126) { header = Buffer.alloc(2); header[0] = b0; header[1] = 0x80 | bytes; }
  else if (bytes < 65536) { header = Buffer.alloc(4); header[0] = b0; header[1] = 0x80 | 126; header.writeUInt16BE(bytes, 2); }
  else { header = Buffer.alloc(10); header[0] = b0; header[1] = 0x80 | 127; header.writeUInt32BE(0, 2); header.writeUInt32BE(bytes, 6); }
  const masked = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) masked[i] = payload[i] ^ mask[i & 3];
  try { return socket.write(Buffer.concat([header, mask, masked])); } catch (e) { return false; }
}
/* v2.3 (I1): the same, deliberately UNMASKED — illegal from a client per RFC 6455. */
function wsSendUnmasked(socket, text) {
  const payload = Buffer.from(text, 'utf8');
  const header = Buffer.alloc(2); header[0] = 0x81; header[1] = payload.length;   // no mask bit
  try { return socket.write(Buffer.concat([header, payload])); } catch (e) { return false; }
}
// oversize POST: the server answers 413 mid-upload and then hangs up, so a
// transport error after a 413 is expected — report whichever arrives first.
function postBig(p, bytes, port) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ pad: 'x'.repeat(bytes) });
    let done = false;
    const fin = (o) => { if (!done) { done = true; resolve(o); } };
    const rq = http.request({ host: '127.0.0.1', port: port || PORT, path: p, method: 'POST', timeout: 8000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-rs-token': TOK } }, r => {
      let s = ''; r.on('data', c => s += c); r.on('end', () => fin({ code: r.statusCode, body: s }));
    });
    rq.on('error', (e) => fin({ code: 0, body: String(e && e.message) }));
    rq.on('timeout', () => { try { rq.destroy(); } catch (e) {} fin({ code: 0, body: 'timeout' }); });
    rq.end(body);
  });
}

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
    // v1.5 (Phase 3c): theme-UI canary — the static import input the theme sheet clicks
    check('app page carries the theme-packs markup hook (id="themesImport")',
      app.body.indexOf('id="themesImport"') >= 0, 'themesImport input missing from served app.html');

    // ---- v1.7 (Phase 4b, RS-WIZARD): first-run wizard + empty states + starter sounds ----
    check('app page carries the visible Design toggle (id="designtgl")',
      app.body.indexOf('id="designtgl"') >= 0, 'designtgl button missing from served app.html');
    const appjs = await get('/app.js');
    check('served /app.js carries the first-run wizard (openSetupWizard)',
      appjs.code === 200 && appjs.body.indexOf('openSetupWizard') >= 0, 'code ' + appjs.code + ', openSetupWizard missing');
    check('served /app.js intro templates use sounds/starter/, zero private-library sound paths',
      appjs.body.indexOf('sounds/starter/') >= 0
        && !/sounds\/(sfx|loops|fanfare|ambient|scary)\//.test(appjs.body),
      'starter refs ' + (appjs.body.indexOf('sounds/starter/') >= 0) + ', private refs ' + /sounds\/(sfx|loops|fanfare|ambient|scary)\//.test(appjs.body));
    const idOk = await post('/api/identify', { frame: 'L1' });
    let idj = null; try { idj = JSON.parse(idOk.body); } catch (e) {}
    check('POST /api/identify {frame:"L1"} with token -> 200 ok (broadcasts WS identify)',
      idOk.code === 200 && !!(idj && idj.ok && idj.frame === 'L1'), 'code ' + idOk.code + ' ' + idOk.body.slice(0, 120));
    const idNo = await post('/api/identify', { frame: 'L1' }, PORT, null);
    check('POST /api/identify without token -> 401', idNo.code === 401, 'code ' + idNo.code);
    const WAVS = ['chime_soft.wav', 'boom_low.wav', 'whoosh.wav', 'tick.wav', 'fanfare_synth.wav', 'alarm_gentle.wav'];
    let wavTotal = 0, wavBad = [];
    for (const w of WAVS) {
      try {
        const szb = fs.statSync(path.join(ROOT, 'sounds', 'starter', w)).size;
        wavTotal += szb;
        if (szb <= 44 || szb >= 500 * 1024) wavBad.push(w + ':' + szb);
      } catch (e) { wavBad.push(w + ':missing'); }
    }
    check('six starter WAVs exist, each < 500 KB, total < 2 MB',
      wavBad.length === 0 && wavTotal < 2 * 1024 * 1024, 'bad ' + JSON.stringify(wavBad) + ' total ' + wavTotal);
    check('sounds/starter/LICENSES.md exists (CC0 provenance)',
      fs.existsSync(path.join(ROOT, 'sounds', 'starter', 'LICENSES.md')), 'LICENSES.md missing');
    const wavHttp = await getBuf('/sounds/starter/chime_soft.wav');
    check('starter sound serves over HTTP (RIFF magic)',
      wavHttp.code === 200 && wavHttp.body.length > 44 && wavHttp.body.slice(0, 4).toString() === 'RIFF',
      'code ' + wavHttp.code + ' len ' + wavHttp.body.length);

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

    // ---- v1.6 (Phase 4a): RS-AUTH v1 — admin-token gate ----
    check('boot log announces the auth gate', bootLog.indexOf('[auth] RS-AUTH v1.1 active') >= 0, 'no [auth] line in boot log');
    const nt = await post('/api/mode/dining', {}, PORT, null);
    let ntj = null; try { ntj = JSON.parse(nt.body); } catch (e) {}
    check('POST /api/mode/dining without token -> 401 {error:"auth"}',
      nt.code === 401 && !!(ntj && ntj.error === 'auth'), 'code ' + nt.code + ' ' + nt.body.slice(0, 120));
    const og = await get('/api/state');
    check('GETs stay open without token', og.code === 200, 'code ' + og.code);
    const he0 = await get('/api/ha/entities?domain=media_player');
    check('GET /api/ha/entities without token -> 401 (the one gated GET)', he0.code === 401, 'code ' + he0.code);
    const he1 = await getTok('/api/ha/entities?domain=media_player');
    let hej = null; try { hej = JSON.parse(he1.body); } catch (e) {}
    check('GET /api/ha/entities with token + no HA -> 200 {ok:false,"ha not configured"}',
      he1.code === 200 && !!(hej && hej.ok === false && hej.error === 'ha not configured'),
      'code ' + he1.code + ' ' + he1.body.slice(0, 160));
    check('boot banner reads v5.05 (community v1.05)',
      bootLog.indexOf('Roomscape Conductor  v5.05 (community v1.05)') >= 0, bootLog.slice(0, 400));

    // ================= v1.8 (RS-SEC v1.01) =================

    // ---- F1: the static web root is an allow-list, not "everything in APP_DIR" ----
    // APP_DIR is the repo ROOT here, exactly as docker/compose.yaml arranges it.
    for (const [pth, what] of [['/app.js', 'app.js'], ['/engine.js', 'engine.js'], ['/fx.js', 'fx.js'],
                               ['/fx-audio.js', 'fx-audio.js'], ['/frame.html', 'frame.html'], ['/scores.html', 'scores.html']]) {
      const r = await get(pth);
      check('F1 app asset still serves: ' + what, r.code === 200 && r.body.length > 200, 'code ' + r.code + ' len ' + r.body.length);
    }
    // every one of these files EXISTS in the repo root — the 404 proves the
    // allow-list refused it, not that it was simply missing.
    const LEAKS = ['/profiles.json', '/config.example.json', '/package.json', '/.gitignore',
                   '/SECURITY.md', '/docs/INSTALL.md', '/scripts/smoke.js', '/conductor.js',
                   '/conductor-lib/media.js', '/docker/compose.yaml', '/.env', '/data/admin-token',
                   '/_backups/anything.bak', '/themes/ocean-depths/theme.json'];
    const leaked = [];
    for (const pth of LEAKS) {
      const onDisk = fs.existsSync(path.join(ROOT, pth.replace(/^\//, '')));
      const r = await get(pth);
      if (r.code !== 404) leaked.push(pth + ' -> ' + r.code + (onDisk ? ' (file exists!)' : ''));
    }
    check('F1 static server 404s .env / data/admin-token / profiles.json / config + docs + source files',
      leaked.length === 0, JSON.stringify(leaked));

    // ---- F3: handlers that mutate but answer GET now need the token ----
    const MUTGET = ['/api/panic', '/api/rescan', '/api/warmthumbs', '/api/kid?on=1',
                    '/api/game/dining', '/api/mode/dining'];
    const ungated = [];
    for (const pth of MUTGET) { const r = await get(pth); if (r.code !== 401) ungated.push(pth + ' -> ' + r.code); }
    check('F3 mutating GET routes 401 without the token (' + MUTGET.length + ' routes)',
      ungated.length === 0, JSON.stringify(ungated));
    const panicOk = await getTok('/api/panic');
    check('F3 GET /api/panic WITH the token still works (200 ok:true)',
      panicOk.code === 200 && panicOk.body.indexOf('"ok":true') >= 0, 'code ' + panicOk.code + ' ' + panicOk.body.slice(0, 120));
    const stillOpen = await get('/api/layout');
    check('F3 ordinary GETs are untouched (/api/layout still open)', stillOpen.code === 200, 'code ' + stillOpen.code);

    // ---- F4: /api/tag/* is closed by default (auth.tagOpen now defaults false) ----
    const tagG = await get('/api/tag/04:AB:CD');
    const tagP = await post('/api/tag/04:AB:CD', {}, PORT, null);
    check('F4 /api/tag/<id> needs the token by default (GET + POST both 401)',
      tagG.code === 401 && tagP.code === 401, 'GET ' + tagG.code + ' POST ' + tagP.code);
    check('F4 boot log reports the tag route closed',
      bootLog.indexOf('[tag route closed]') >= 0, bootLog.slice(-600));

    // ---- F6: symlink escape out of the media folder ----
    const secretPath = path.join(tmp, 'outside-secret.txt');
    fs.writeFileSync(secretPath, 'SMOKE-SECRET-DO-NOT-SERVE');
    let linkMade = false;
    try { fs.mkdirSync(path.join(tmp, 'media'), { recursive: true }); fs.symlinkSync(secretPath, path.join(tmp, 'media', 'escape.txt')); linkMade = true; } catch (e) {}
    if (linkMade) {
      const esc = await get('/media/escape.txt');
      check('F6 a symlink inside the media folder is NOT served',
        esc.code >= 400 && esc.body.indexOf('SMOKE-SECRET') < 0, 'code ' + esc.code + ' body ' + esc.body.slice(0, 80));
      try { fs.unlinkSync(path.join(tmp, 'media', 'escape.txt')); } catch (e) {}
    } else {
      check('F6 a symlink inside the media folder is NOT served', true, 'skipped — this filesystem cannot create symlinks');
    }

    // ---- F2: WebSocket state pushes ----
    const wsBad = await wsConnect('/', {}, PORT);
    check('F2 a tokenless WS upgrade is still accepted (frames stay read-only consumers)', wsBad.code === 101, 'code ' + wsBad.code);
    if (wsBad.socket) {
      wsSendText(wsBad.socket, { ie: true, type: 'state', state: { game: 'dining', mode: 'smoke-hijack', rev: 9001 } });
      await sleep(700);
      const s1 = await get('/api/state');
      let sj1 = null; try { sj1 = JSON.parse(s1.body); } catch (e) {}
      check('F2 tokenless WS {type:"state"} does NOT replace server state',
        !!sj1 && sj1.mode !== 'smoke-hijack', 'mode is now ' + JSON.stringify(sj1 && sj1.mode));
      check('F2 the refusal is logged', bootLog.indexOf('REFUSED state push from a tokenless socket') >= 0, bootLog.slice(-600));
      try { wsBad.socket.destroy(); } catch (e) {}
    } else check('F2 tokenless WS {type:"state"} does NOT replace server state', false, 'no socket: ' + JSON.stringify(wsBad));

    const wsGood = await wsConnect('/?token=' + TOK, {}, PORT);
    if (wsGood.socket) {
      wsSendText(wsGood.socket, { ie: true, type: 'state', state: { game: 'dining', mode: 'smoke-authed', rev: 9002 } });
      await sleep(700);
      const s2 = await get('/api/state');
      let sj2 = null; try { sj2 = JSON.parse(s2.body); } catch (e) {}
      check('F2 WS with ?token= CAN still publish state (app volume/FX path)',
        !!sj2 && sj2.mode === 'smoke-authed', 'mode is ' + JSON.stringify(sj2 && sj2.mode));
      try { wsGood.socket.destroy(); } catch (e) {}
    } else check('F2 WS with ?token= CAN still publish state (app volume/FX path)', false, 'no socket: ' + JSON.stringify(wsGood));

    const wsEvil = await wsConnect('/', { Origin: 'http://evil.example' }, PORT);
    check('F2 a cross-origin WS upgrade is refused (403, not 101)', wsEvil.code === 403, 'code ' + wsEvil.code + ' ' + (wsEvil.err || ''));
    check('F2 the cross-origin rejection is logged', bootLog.indexOf('REJECTED upgrade: cross-origin handshake') >= 0, bootLog.slice(-600));
    const wsSame = await wsConnect('/', { Origin: 'http://127.0.0.1:' + PORT }, PORT);
    check('F2 a same-origin WS upgrade is accepted', wsSame.code === 101, 'code ' + wsSame.code);
    if (wsSame.socket) { try { wsSame.socket.destroy(); } catch (e) {} }

    /* ---- v2.3 (I1): the unbounded-fragment attack, actually attempted ----
       Before 1.05 client.frag had no cumulative cap: a TOKENLESS socket could
       send frames of just under WS_MAX_BUF with FIN=0 forever, each one passing
       every check, emptying the receive buffer and accumulating in memory. This
       sends 1 MB continuation fragments without ever setting FIN and requires
       the server to hang up rather than keep swallowing them. */
    const wsFrag = await wsConnect('/', {}, PORT);
    if (wsFrag.socket) {
      let closed = false;
      wsFrag.socket.on('close', () => { closed = true; });
      wsFrag.socket.on('error', () => { closed = true; });
      wsSendFragment(wsFrag.socket, 1024 * 1024, 0x1, false);        // first fragment, FIN=0
      for (let i = 0; i < 8 && !closed; i++) {
        wsSendFragment(wsFrag.socket, 1024 * 1024, 0x0, false);      // continuations, never FIN
        await sleep(120);
      }
      await sleep(400);
      check('I1 an endless fragmented WS message is cut off, not accumulated',
        closed, 'the socket is still open after ~9 MB of unfinished fragments');
      check('I1 the fragment cap is logged with a reason',
        bootLog.indexOf('fragmented message over cap') >= 0, bootLog.slice(-600));
      try { wsFrag.socket.destroy(); } catch (e) {}
    } else check('I1 an endless fragmented WS message is cut off, not accumulated', false, 'no socket: ' + JSON.stringify(wsFrag));

    /* v2.3 (I1): RFC 6455 5.1 — a client MUST mask. We used to read the bit and
       accept either way. */
    const wsUnmasked = await wsConnect('/', {}, PORT);
    if (wsUnmasked.socket) {
      let umClosed = false;
      wsUnmasked.socket.on('close', () => { umClosed = true; });
      wsUnmasked.socket.on('error', () => { umClosed = true; });
      /* wsConnect leaves the socket paused (no 'data' listener), and a paused
         socket never processes the peer's FIN — so without this the close is
         invisible to the test even though the server sent it. */
      wsUnmasked.socket.resume();
      wsSendUnmasked(wsUnmasked.socket, '{"ie":true,"type":"ping"}');
      await sleep(700);
      check('I1 an unmasked client frame is refused (RFC 6455 requires masking)',
        bootLog.indexOf('unmasked client frame') >= 0,
        'the server accepted an unmasked frame; client closed = ' + umClosed);
      check('I1 a dropped client is closed politely, not just destroyed',
        umClosed, 'the peer never observed the close — dropClient should end() after a close frame');
      try { wsUnmasked.socket.destroy(); } catch (e) {}
    } else check('I1 an unmasked client frame is refused (RFC 6455 requires masking)', false, 'no socket');

    /* v2.3 (I1): a legitimately fragmented message must still be reassembled —
       the cap must not have broken normal multi-frame traffic. */
    check('I1 ws.js still reassembles an honest fragmented message',
      /if \(fin\) \{\s*\n?\s*const full = Buffer\.concat\(client\.frag\)/.test(
        fs.readFileSync(path.join(ROOT, 'conductor-lib', 'ws.js'), 'utf8')),
      'the FIN reassembly path is gone');

    // ---- F14: an oversize body gets 413, not a hung connection ----
    const big = await postBig('/api/state', 2.5 * 1024 * 1024);
    check('F14 an oversize POST body answers 413 (not a silent destroy)', big.code === 413, 'code ' + big.code + ' ' + String(big.body).slice(0, 120));

    /* ---- v1.9 (RS-SEC v1.02): SERVED-FILE canaries for the frontend pass ----
       There is no browser here, so the XSS and wiring fixes can only be proved
       by asserting on the bytes the conductor actually hands a client. Each
       check below names the audit item it guards. */
    const fjs = await get('/app.js');
    const fframe = await get('/frame.html');
    const fscores = await get('/scores.html');
    const fengine = await get('/engine.js');
    const ffx = await get('/fx.js');
    check('v1.02 the frame + scores pages still serve', fframe.code === 200 && fscores.code === 200,
      'frame ' + fframe.code + ', scores ' + fscores.code);

    // A1: the app's WebSocket URL carries the admin token (tokenless sockets can't publish state)
    check('A1 served /app.js builds its WS URL with token=',
      /'token=' \+ encodeURIComponent\(tok\)/.test(fjs.body), 'no token= in the app WS URL builder');
    check('A1 storing a token re-dials the socket (__rsWsReconnect)',
      fjs.body.indexOf('__rsWsReconnect') >= 0 && fengine.body.indexOf('reconnect: reconnect') >= 0,
      'app hook ' + (fjs.body.indexOf('__rsWsReconnect') >= 0) + ', engine export ' + (fengine.body.indexOf('reconnect: reconnect') >= 0));
    check('A1 frame.html stays TOKENLESS (frames only listen)',
      fframe.body.indexOf('token=') < 0, 'frame.html now sends a token on its socket');

    // A2: no bare fetch GET against a mutating, token-gated path
    check('A2 /api/kid is no longer a bare fetch GET in the served app',
      fjs.body.indexOf("fetch('/api/kid") < 0 && fjs.body.indexOf("post('/api/kid?on=") >= 0,
      'bare fetch ' + (fjs.body.indexOf("fetch('/api/kid") >= 0) + ', post ' + (fjs.body.indexOf("post('/api/kid?on=") >= 0));
    check('A2 no bare fetch GET remains against any mutating-GET path',
      !/fetch\('\/api\/(kid|panic|rescan|warmthumbs|game\/|mode\/)/.test(fjs.body),
      'a bare fetch( survives on a gated path');

    // B1/B4: mode ids and thumbnail URLs are escaped in the two card builders
    check('B1 the Play + Design card builders escape the mode id',
      (fjs.body.match(/data-id="' \+ esc\(id\) \+ '"/g) || []).length >= 2,
      'esc(id) found ' + ((fjs.body.match(/data-id="' \+ esc\(id\) \+ '"/g) || []).length) + ' time(s), expected 2');
    check('B4 background-image thumbs go through esc(), not %27 alone',
      !/url\(\\'' \+ th\.replace/.test(fjs.body) && /esc\(th\.replace/.test(fjs.body),
      'a raw th.replace(%27) still reaches a style attribute');

    // B2: one escape for every <option>
    check('B2 opt() escapes both the value and the label',
      /'<option value="' \+ esc\(v\) \+ '"/.test(fjs.body) && /'>' \+ esc\(l\) \+ '<\/option>'/.test(fjs.body),
      'opt() still interpolates raw v / l');

    // B3: wizard frame-id validation + no prototype write
    check('B3 the wizard validates custom frame ids and builds walls with a null prototype',
      fjs.body.indexOf('/^[A-Za-z0-9_-]{1,12}$/') >= 0 && /walls = Object\.create\(null\)/.test(fjs.body),
      'regex ' + (fjs.body.indexOf('/^[A-Za-z0-9_-]{1,12}$/') >= 0) + ', Object.create(null) ' + /walls = Object\.create\(null\)/.test(fjs.body));

    // B5/B6: the two standalone pages escape quotes, not just & and <
    const weakEsc = /replace\(\/&\/g, ?["']&amp;["']\)\.replace\(\/<\/g/;
    check('B5 frame.html escaping covers " and \' (both inline lanes)',
      (fframe.body.match(/\[&<>"'\]/g) || []).length >= 2 && !weakEsc.test(fframe.body),
      'full escapes ' + ((fframe.body.match(/\[&<>"'\]/g) || []).length) + ', weak escape left ' + weakEsc.test(fframe.body));
    check('B5 frame.html validates the YouTube id before it reaches an iframe src',
      fframe.body.indexOf('/^[A-Za-z0-9_-]{6,20}$/') >= 0 && fframe.body.indexOf("embed/' + st.videoId") < 0,
      'validator ' + (fframe.body.indexOf('/^[A-Za-z0-9_-]{6,20}$/') >= 0) + ', raw videoId still in the src ' + (fframe.body.indexOf("embed/' + st.videoId") >= 0));
    check('B6 scores.html escaping covers " and \'',
      /\[&<>"'\]/.test(fscores.body) && !/replace\(\/&\/g,"&amp;"\)\.replace\(\/</.test(fscores.body),
      'scores.html still on the &/< escape');

    // B7: media URLs in the render paths are attribute-escaped
    check('B7 fx.js + engine.js attribute-escape WS-supplied media URLs',
      ffx.body.indexOf("<source src=\"' + escA(url)") >= 0 && fengine.body.indexOf('escAttr(img)') >= 0,
      'fx escA ' + (ffx.body.indexOf("<source src=\"' + escA(url)") >= 0) + ', engine escAttr ' + (fengine.body.indexOf('escAttr(img)') >= 0));

    // B8: the postMessage escape hatch is file:// only
    check('B8 the bus accepts a blank postMessage origin only on file://',
      /diskDev = \(location\.protocol === 'file:'\)/.test(fengine.body) && /if \(diskDev && \(o === '' \|\| o === 'null'\)\)/.test(fengine.body),
      'the ""/"null" origin exemption is still unconditional');

    // C2 / C7: the layout helpers
    check('C2 the wall helpers cannot throw on a non-array wall',
      /function wallArr\(k\)/.test(fengine.body) && !/LAYOUT\.walls\[wallKeyOf\(idx\)\] \|\| \[\]/.test(fengine.body),
      'wallArr missing, or a raw LAYOUT.walls[...] lookup survives');
    check('C7 one shared layout-adoption predicate (IE.adoptLayoutPayload) used by all three pages',
      fengine.body.indexOf('adoptLayoutPayload: adoptLayoutPayload') >= 0
        && (fjs.body.match(/IE\.adoptLayoutPayload/g) || []).length >= 2
        && fframe.body.indexOf('IE.adoptLayoutPayload') >= 0,
      'engine export ' + (fengine.body.indexOf('adoptLayoutPayload: adoptLayoutPayload') >= 0)
        + ', app uses ' + ((fjs.body.match(/IE\.adoptLayoutPayload/g) || []).length) + ', frame uses ' + (fframe.body.indexOf('IE.adoptLayoutPayload') >= 0));

    // C4 / C11: the two token-less standalone pages
    check('C4 scores.html sends the admin token on its writes',
      fscores.body.indexOf('x-rs-token') >= 0 && fscores.body.indexOf('rs-admin-token') >= 0,
      'scores.html still POSTs anonymously');
    check('C11 the legacy control deck uses absolute /api paths and carries the token',
      fengine.body.indexOf('function deckFetch') >= 0 && !/fetch\('api\//.test(fengine.body),
      'deckFetch ' + (fengine.body.indexOf('function deckFetch') >= 0) + ', path-relative fetch left ' + /fetch\('api\//.test(fengine.body));

    // C5: the fetch wrapper
    check('C5 the fetch wrapper is same-origin-only, Headers-aware and Request-aware',
      /function sameOrigin\(u\)/.test(fjs.body) && fjs.body.indexOf('Object.fromEntries(bh.entries())') >= 0
        && fjs.body.indexOf('input instanceof Request') >= 0,
      'sameOrigin ' + /function sameOrigin\(u\)/.test(fjs.body)
        + ', Headers ' + (fjs.body.indexOf('Object.fromEntries(bh.entries())') >= 0)
        + ', Request ' + (fjs.body.indexOf('input instanceof Request') >= 0));

    // C6 / C12: frame.html boot
    check('C6/C12 frame.html fetches /api/layout absolutely, catches boot failure and honours a late reply',
      fframe.body.indexOf("fetch('/api/layout')") >= 0
        && fframe.body.indexOf("fetch('api/layout')") < 0
        && fframe.body.indexOf('rs-late-layout-reload') >= 0
        && /__rsFrameBoot \|\| Promise\.resolve\(\)\)\.catch/.test(fframe.body),
      'absolute ' + (fframe.body.indexOf("fetch('/api/layout')") >= 0)
        + ', late-reload ' + (fframe.body.indexOf('rs-late-layout-reload') >= 0)
        + ', catch ' + /__rsFrameBoot \|\| Promise\.resolve\(\)\)\.catch/.test(fframe.body));

    // C10 / C13
    check('C10 the fx media-error fallback no longer detaches the failing node',
      ffx.body.indexOf('parentNode.replaceChild(d, t)') < 0 && /insertBefore\(d, t\.nextSibling\)/.test(ffx.body),
      'replaceChild still present in fx.js');
    check('C13 the dead Sound-Studio VIZ_STYLES copy is gone',
      (fjs.body.match(/var VIZ_STYLES/g) || []).length === 1,
      'VIZ_STYLES declared ' + ((fjs.body.match(/var VIZ_STYLES/g) || []).length) + ' time(s), expected 1');

    /* ---- v2.0 (RS-SEC v1.03): the documentation-inventory fixes ---- */

    // G1b: /api/log joins /api/ha/entities as a gated read
    const logNo = await get('/api/log?n=5');
    check('G1b GET /api/log is 401 without the admin token',
      logNo.code === 401 && logNo.body.indexOf('"auth"') >= 0, 'code ' + logNo.code + ' ' + logNo.body.slice(0, 160));
    const logYes = await getTok('/api/log?n=5');
    let logJ = null; try { logJ = JSON.parse(logYes.body); } catch (e) {}
    check('G1b GET /api/log answers 200 with lines[] WITH the token',
      logYes.code === 200 && !!(logJ && logJ.ok && Array.isArray(logJ.lines)), 'code ' + logYes.code + ' ' + logYes.body.slice(0, 160));

    // G1a: the ring buffer must not contain the live token (env token here)
    const logAll = await getTok('/api/log?n=500');
    check('G1a the log ring buffer contains no copy of the live admin token',
      logAll.code === 200 && logAll.body.indexOf(TOK) < 0, 'the token "' + TOK + '" appears in GET /api/log output');

    // G2: source canaries — the loopback helper and both call sites
    const condSrc1 = fs.readFileSync(path.join(ROOT, 'conductor.js'), 'utf8');
    check('G2 the internal loopback helper attaches x-rs-token lazily',
      /function rsSelfHeaders/.test(condSrc1) && condSrc1.indexOf("global.__rsAdminToken || process.env.ADMIN_TOKEN") >= 0,
      'rsSelfHeaders missing or not reading the token lazily');
    check('G2 both internal loopback POSTs (party games + Time Machine) go through rsSelfHeaders',
      (condSrc1.match(/headers: rsSelfHeaders\(/g) || []).length === 2
        && (condSrc1.match(/host: '127\.0\.0\.1'/g) || []).length === 2,
      'rsSelfHeaders call sites: ' + ((condSrc1.match(/headers: rsSelfHeaders\(/g) || []).length)
        + ', loopback requests: ' + ((condSrc1.match(/host: '127\.0\.0\.1'/g) || []).length));

    // G2 end to end: a party game that ends with a scorer must reach
    // POST /api/scores/result over loopback THROUGH the auth gate. Before the
    // fix that call carried no token, so it 401'd and the result vanished.
    const gStart = await post('/api/games/start', { id: 'werewolf', cfg: { players: ['SmokeAnn', 'SmokeBo', 'SmokeCy', 'SmokeDi'] } });
    let gsj = null; try { gsj = JSON.parse(gStart.body); } catch (e) {}
    check('G2 a party game starts', gStart.code === 200 && !!(gsj && gsj.ok), 'code ' + gStart.code + ' ' + gStart.body.slice(0, 200));
    if (gStart.code === 200) {
      await post('/api/games/action', { action: 'award', name: 'SmokeAnn' });
      await post('/api/games/end', {});
      await sleep(800);   // selfPost is fire-and-forget over loopback
      const sc = await get('/api/scores');
      let scj = null; try { scj = JSON.parse(sc.body); } catch (e) {}
      const results = (scj && scj.results) || [];
      check('G2 the automatic score post reached /api/scores/result through the auth gate',
        results.length >= 1 && JSON.stringify(results).indexOf('SmokeAnn') >= 0,
        'no result banked — results: ' + JSON.stringify(results).slice(0, 240));
    }
    check('G2 no internal loopback call was refused with 401',
      bootLog.indexOf('admin token missing on the loopback call') < 0,
      bootLog.split('\n').filter(l => l.indexOf('internal POST') >= 0).join(' | '));

    // G4: every JSON store resolves under DATA_DIR, and nothing lands in the repo
    const inData = fs.existsSync(dataTmp) ? fs.readdirSync(dataTmp) : [];
    check('G4 the JSON stores + _backups land under DATA_DIR',
      inData.indexOf('scores.json') >= 0 && inData.indexOf('_backups') >= 0,
      'DATA_DIR (' + dataTmp + ') holds: ' + JSON.stringify(inData));
    check('G4 no JSON store was written into the repo root',
      !fs.existsSync(path.join(ROOT, 'scores.json')) && !fs.existsSync(path.join(ROOT, 'viz.json'))
        && !fs.existsSync(path.join(ROOT, 'playlists.json')) && !fs.existsSync(path.join(ROOT, 'mediafx.json')),
      'a store leaked into ' + ROOT);
    check('G4 backupFile reports failure loudly instead of swallowing it',
      /\[backup\] ' \+ lastBackupError/.test(condSrc1) && condSrc1.indexOf('the save is going ahead WITHOUT a backup') >= 0,
      'backupFile still has a silent catch');

    // G5: schedule validation
    const badSched = await post('/api/schedule', { schedule: [{ time: '07:30', mode: 'no-such-mode-xyz', days: [1] }] });
    check('G5 POST /api/schedule rejects an unknown mode id with 400',
      badSched.code === 400 && badSched.body.indexOf('unknown mode') >= 0, 'code ' + badSched.code + ' ' + badSched.body.slice(0, 200));
    const goodSched = await post('/api/schedule', { schedule: [{ time: '07:30', mode: 'dining', days: [1] }] });
    check('G5 POST /api/schedule accepts a real mode id',
      goodSched.code === 200, 'code ' + goodSched.code + ' ' + goodSched.body.slice(0, 200));

    // G5: the dead pages are out of the allow-list
    const ctl = await get('/control.html'), edt = await get('/editor.html');
    check('G5 /control.html and /editor.html are no longer allow-listed',
      ctl.code === 404 && edt.code === 404, 'control ' + ctl.code + ', editor ' + edt.code);

    // G5: the client's 20 s liveness ping is answered
    const wsP = await wsConnect('/');
    if (wsP.code === 101) {
      const pong = await new Promise((resolve) => {
        let buf = '';
        wsP.socket.on('data', (c) => { buf += c.toString('utf8'); });
        wsSendText(wsP.socket, { ie: true, type: 'ping', t: Date.now() });
        setTimeout(() => resolve(buf), 1200);
      });
      check('G5 a WS ping is answered with a pong', pong.indexOf('"pong"') >= 0, 'frames seen: ' + JSON.stringify(pong.slice(0, 200)));
      try { wsP.socket.destroy(); } catch (e) {}
    } else check('G5 a WS ping is answered with a pong', false, 'upgrade failed: ' + wsP.code);

    // G5: the weather poll reads the LIVE setting
    check('G5 the weather poll reads settings.weather.pollMinutes live',
      /function weatherEveryMs/.test(condSrc1) && condSrc1.indexOf('setInterval(pollWeather') < 0,
      'still a fixed setInterval built from DEFAULT_SETTINGS');

    // G6: /api/health carries the version
    const health = await get('/api/health');
    let hj = null; try { hj = JSON.parse(health.body); } catch (e) {}
    check('G6 /api/health reports version 5.05 / repo 1.05',
      !!(hj && hj.version === '5.05' && hj.repo === '1.05'), health.body.slice(0, 200));

    // versions (rule 11: never change behaviour without changing the version)
    /* v1.04: app.js -> v3.85 (the two shadowed-declaration fixes) and fx.js ->
       v1.63 (scoreboard escaping). engine/frame/scores were not touched. */
    check('the five frontend files carry the versions their last change earned',
      /app\.js\)  v3\.85/.test(fjs.body) && /engine\.js\)  v0\.92/.test(fengine.body)
        && /fx\.js\)  v1\.63/.test(ffx.body) && fframe.body.indexOf('frame page — v1.3') >= 0
        && fscores.body.indexOf('scoreboard — v1.1') >= 0,
      'app ' + /app\.js\)  v3\.85/.test(fjs.body) + ', engine ' + /engine\.js\)  v0\.92/.test(fengine.body)
        + ', fx ' + /fx\.js\)  v1\.63/.test(ffx.body) + ', frame ' + (fframe.body.indexOf('frame page — v1.3') >= 0)
        + ', scores ' + (fscores.body.indexOf('scoreboard — v1.1') >= 0));
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
      ADMIN_TOKEN: TOK,                          // v1.6
      DATA_DIR: path.join(tmp, 'data2'),         // v2.0 (G4)
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

      // v1.6 (Phase 4a): POST /api/config — scratch CONFIG_FILE, atRestMode flips live
      const cp = await post('/api/config', { atRestMode: 'calm2' }, PORT2);
      let cpj = null; try { cpj = JSON.parse(cp.body); } catch (e) {}
      check('POST /api/config {atRestMode:"calm2"} -> ok:true, no restart advised',
        cp.code === 200 && !!(cpj && cpj.ok && cpj.restartAdvised !== true), 'code ' + cp.code + ' ' + cp.body.slice(0, 200));
      const lay3 = await get('/api/layout', PORT2);
      let l3 = null; try { l3 = JSON.parse(lay3.body); } catch (e) {}
      check('config change is live: /api/layout atRest === "calm2"', !!l3 && l3.atRest === 'calm2', lay3.body.slice(0, 200));
      check('config write left a timestamped .bak beside the scratch config',
        fs.readdirSync(tmp).some(f => f.indexOf('smoke-config.json.') === 0 && /\.bak$/.test(f)),
        JSON.stringify(fs.readdirSync(tmp).filter(f => f.indexOf('smoke-config') === 0)));

      // ================= v1.8 (RS-SEC v1.01) — config surface =================

      // ---- F7: layout.walls REPLACES, it does not merge ----
      // boot 2 started with walls {W:[W1,W2,W3]}; asking for {A:[A1,A2]} must
      // leave exactly two frames, not five.
      const rep = await post('/api/config', { layout: { walls: { A: ['A1', 'A2'] } } }, PORT2);
      const layR = await get('/api/layout', PORT2);
      let lr = null; try { lr = JSON.parse(layR.body); } catch (e) {}
      check('F7 POST layout.walls REPLACES the wall set (2 frames, not 5)',
        rep.code === 200 && !!lr && JSON.stringify(lr.frames) === '["A1","A2"]' && JSON.stringify(Object.keys(lr.walls)) === '["A"]',
        'frames ' + JSON.stringify(lr && lr.frames) + ' walls ' + JSON.stringify(lr && Object.keys(lr.walls)));

      // ---- F12: frame id validation ----
      const badId = await post('/api/config', { layout: { walls: { Z: ['bad id <script>'] } } }, PORT2);
      check('F12 illegal frame id -> 400', badId.code === 400 && badId.body.indexOf('illegal frame id') >= 0, 'code ' + badId.code + ' ' + badId.body.slice(0, 160));
      const dupId = await post('/api/config', { layout: { walls: { Z: ['Z1'], Y: ['Z1'] } } }, PORT2);
      check('F12 duplicate frame id across walls -> 400', dupId.code === 400 && dupId.body.indexOf('duplicate frame id') >= 0, 'code ' + dupId.code + ' ' + dupId.body.slice(0, 160));
      const emptyW = await post('/api/config', { layout: { walls: {} } }, PORT2);
      check('F12 empty walls object -> 400', emptyW.code === 400 && emptyW.body.indexOf('empty') >= 0, 'code ' + emptyW.code + ' ' + emptyW.body.slice(0, 160));
      const layR2 = await get('/api/layout', PORT2);
      let lr2 = null; try { lr2 = JSON.parse(layR2.body); } catch (e) {}
      check('F12 a rejected layout changed nothing (still A1/A2)',
        !!lr2 && JSON.stringify(lr2.frames) === '["A1","A2"]', JSON.stringify(lr2 && lr2.frames));

      // ---- F5: prototype pollution through the config deep-merge ----
      // The proved exploit turned the auth gate off process-wide.
      // NB: written as a raw JSON string — an object literal's __proto__ key
      // sets the literal's prototype and would never survive JSON.stringify.
      const poll = await postStr('/api/config', '{"ha":{"__proto__":{"enabled":false}}}', PORT2);
      const stillGated = await post('/api/mode/dining', {}, PORT2, null);
      check('F5 {"ha":{"__proto__":{"enabled":false}}} does NOT disable the auth gate',
        stillGated.code === 401, 'config POST ' + poll.code + ', tokenless POST now ' + stillGated.code + ' (401 expected)');
      const stillUp = await get('/api/health', PORT2);
      check('F5 the conductor is still healthy after the pollution attempt', stillUp.code === 200, 'code ' + stillUp.code);

      // ---- F14: config .bak rotation caps at 10 ----
      for (let i = 0; i < 12; i++) await post('/api/config', { atRestMode: 'rot' + i }, PORT2);
      const baks = fs.readdirSync(tmp).filter(f => f.indexOf('smoke-config.json.') === 0 && /\.bak$/.test(f));
      check('F14 config .bak files are rotated (<= 10 kept)', baks.length <= 10, baks.length + ' .bak files');

      // ---- F8: a corrupt config.json is refused, not silently replaced ----
      // LAST in this boot: it deliberately leaves the scratch config unparseable.
      fs.writeFileSync(cfgFile, '{ this is not json ');
      const corrupt = await post('/api/config', { atRestMode: 'shouldnotstick' }, PORT2);
      check('F8 a corrupt config.json -> 500 "refusing to overwrite"',
        corrupt.code === 500 && corrupt.body.indexOf('refusing to overwrite') >= 0, 'code ' + corrupt.code + ' ' + corrupt.body.slice(0, 200));
      check('F8 the corrupt config.json was left exactly as-is',
        fs.readFileSync(cfgFile, 'utf8') === '{ this is not json ', JSON.stringify(fs.readFileSync(cfgFile, 'utf8')).slice(0, 120));
    }
  } catch (e) { check('config boot: layout checks ran', false, String(e)); }
  child2.kill();

  // ---- boot 3 (v1.6, Phase 4a): NO ADMIN_TOKEN -> first-run generation into a scratch APP_DIR ----
  const PORT3 = PORT + 2;
  const app3 = path.join(tmp, 'app3');
  fs.mkdirSync(app3, { recursive: true });
  const child3 = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT3),
      APP_DIR: app3,                             // scratch — the generated data/admin-token must never land in the repo
      ADMIN_TOKEN: '',
      MEDIA_DIR: path.join(tmp, 'media'),
      HA_URL: '', HA_TOKEN: '', MA_URL: '', MA_TOKEN: ''
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let bootLog3 = '';
  child3.stdout.on('data', d => bootLog3 += d);
  child3.stderr.on('data', d => bootLog3 += d);
  try {
    let up3 = false;
    for (let i = 0; i < 30 && !up3; i++) { await sleep(500); try { up3 = (await get('/api/health', PORT3)).code === 200; } catch (e) {} }
    check('first-run boot: conductor boots with no ADMIN_TOKEN (scratch APP_DIR)', up3, 'no response after 15s. Boot log:\n' + bootLog3.slice(-2000));
    if (up3) {
      check('first-run boot log prints "admin token (first run)"', bootLog3.indexOf('admin token (first run):') >= 0, bootLog3.slice(-1200));
      let genTok = '';
      try { genTok = fs.readFileSync(path.join(app3, 'data', 'admin-token'), 'utf8').trim(); } catch (e) {}
      check('generated token written to data/admin-token', genTok.length >= 24, 'token file missing/short: "' + genTok + '"');
      const nt3 = await post('/api/mode/dining', {}, PORT3, null);
      check('first-run boot: tokenless POST -> 401', nt3.code === 401, 'code ' + nt3.code);
      const ok3 = await post('/api/mode/dining', {}, PORT3, genTok);
      let ok3j = null; try { ok3j = JSON.parse(ok3.body); } catch (e) {}
      check('first-run boot: POST with the file token -> 200 ok', ok3.code === 200 && !!(ok3j && ok3j.ok), 'code ' + ok3.code + ' ' + ok3.body.slice(0, 120));

      /* ---- v2.0 (G1) the whole point of the critical fix ----
         On a FIRST-RUN install the generated token used to be printed with
         console.log, which RS-LOG-BUFFER wraps — so it sat in the ring and
         `GET /api/log?q=admin` handed it to any unauthenticated LAN client.
         Both ends are checked: the route is closed, and even a caller who HAS
         the token (or any future path into the ring) cannot read it back. */
      const logOpen3 = await get('/api/log?q=admin', PORT3);
      check('G1 first-run boot: GET /api/log is closed to an unauthenticated client',
        logOpen3.code === 401, 'code ' + logOpen3.code + ' — body: ' + logOpen3.body.slice(0, 200));
      check('G1 first-run boot: the unauthenticated /api/log reply cannot contain the token',
        genTok.length >= 24 && logOpen3.body.indexOf(genTok) < 0, 'the generated token leaked in the 401 body');
      const logTok3 = await getTok('/api/log?n=500', PORT3, genTok);
      check('G1 first-run boot: the generated token is NOT in the ring buffer even for an authorised reader',
        logTok3.code === 200 && genTok.length >= 24 && logTok3.body.indexOf(genTok) < 0,
        'code ' + logTok3.code + ' — token found in the buffered log');
      check('G1 first-run boot: the token still reaches the boot log (container logs)',
        bootLog3.indexOf('admin token (first run): ' + genTok) >= 0, bootLog3.slice(-500));
    }
  } catch (e) { check('first-run boot checks ran', false, String(e)); }
  child3.kill();

  // ---- boot 4 (v1.7, Phase 4b): EMPTY profiles store — a truly fresh install must serve ----
  // The browser-side empty states (🪄 card, Design "＋ New mode" invitation, 🚀 setup
  // card) can't be asserted without a browser; this proves the server side of a
  // zero-mode boot never crashes and still serves the app.
  const PORT4 = PORT + 3;
  const emptyProf = path.join(tmp, 'profiles-empty.json');
  fs.writeFileSync(emptyProf, JSON.stringify({ profiles: {}, tagmap: {}, settings: {} }));
  const child4 = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT4),
      APP_DIR: ROOT,
      ADMIN_TOKEN: TOK,
      PROFILES_FILE: emptyProf,
      STATE_FILE: path.join(tmp, 'state4.json'),
      DATA_DIR: path.join(tmp, 'data4'),        // v2.0 (G4): keep every boot's writable state out of the repo

      MEDIA_DIR: path.join(tmp, 'media'),
      HA_URL: '', HA_TOKEN: '', MA_URL: '', MA_TOKEN: ''
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let bootLog4 = '';
  child4.stdout.on('data', d => bootLog4 += d);
  child4.stderr.on('data', d => bootLog4 += d);
  try {
    let up4 = false;
    for (let i = 0; i < 30 && !up4; i++) { await sleep(500); try { up4 = (await get('/api/health', PORT4)).code === 200; } catch (e) {} }
    check('empty-profiles boot: conductor boots with {"profiles":{},"tagmap":{},"settings":{}}', up4, 'no response after 15s. Boot log:\n' + bootLog4.slice(-2000));
    if (up4) {
      const app4 = await get('/', PORT4);
      check('empty-profiles boot: app page still serves (no crash)', app4.code === 200 && app4.body.length > 1000, 'code ' + app4.code);
      const prof4 = await get('/api/profiles', PORT4);
      let pj4 = null; try { pj4 = JSON.parse(prof4.body); } catch (e) {}
      check('empty-profiles boot: /api/profiles answers 200 with a JSON map', prof4.code === 200 && !!(pj4 && pj4.profiles), 'code ' + prof4.code + ' ' + prof4.body.slice(0, 160));
    }
  } catch (e) { check('empty-profiles boot checks ran', false, String(e)); }
  child4.kill();

  // ---- boot 5 (v1.8, RS-SEC F9): the profiles wipe-block must REPORT failure ----
  // Six real modes on disk; a POST that collapses them to one is refused by the
  // file-layer guard. Before v1.01 that refusal was a silent `return`, so the
  // route answered ok:true while memory and disk had diverged.
  const PORT5 = PORT + 4;
  const sixProf = path.join(tmp, 'profiles-six.json');
  const six = { profiles: {}, tagmap: {}, settings: {} };
  ['dining', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'].forEach(id => { six.profiles[id] = { name: id, frames: ['pano'], kidSafe: true }; });
  fs.writeFileSync(sixProf, JSON.stringify(six, null, 2));
  const child5 = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT5), APP_DIR: ROOT, ADMIN_TOKEN: TOK,
      PROFILES_FILE: sixProf,
      STATE_FILE: path.join(tmp, 'state5.json'),
      DATA_DIR: path.join(tmp, 'data5'),        // v2.0 (G4)

      MEDIA_DIR: path.join(tmp, 'media'),
      HA_URL: '', HA_TOKEN: '', MA_URL: '', MA_TOKEN: ''
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let bootLog5 = '';
  child5.stdout.on('data', d => bootLog5 += d);
  child5.stderr.on('data', d => bootLog5 += d);
  try {
    let up5 = false;
    for (let i = 0; i < 30 && !up5; i++) { await sleep(500); try { up5 = (await get('/api/health', PORT5)).code === 200; } catch (e) {} }
    check('wipe-block boot: conductor boots with a 7-mode profiles store', up5, 'no response after 15s. Boot log:\n' + bootLog5.slice(-2000));
    if (up5) {
      // allowBulkDelete gets us past the HTTP-layer PROFILES-GUARD so the
      // file-layer wipe-block is what actually decides.
      const wipe = await post('/api/profiles', { profiles: { dining: { name: 'dining', frames: ['pano'] } }, tagmap: {}, settings: {}, allowBulkDelete: true }, PORT5);
      check('F9 a wipe-blocked profiles write answers an ERROR, not ok:true',
        wipe.code >= 400 && wipe.body.indexOf('"ok":true') < 0, 'code ' + wipe.code + ' ' + wipe.body.slice(0, 220));
      let disk5 = null; try { disk5 = JSON.parse(fs.readFileSync(sixProf, 'utf8')); } catch (e) {}
      check('F9 the guard still prevented the write (7 modes intact on disk)',
        !!(disk5 && disk5.profiles && Object.keys(disk5.profiles).length === 7),
        'modes on disk: ' + JSON.stringify(disk5 && disk5.profiles && Object.keys(disk5.profiles)));
      check('F9 the refusal is logged CRITICAL',
        bootLog5.indexOf('blocked a profiles write that would shrink') >= 0, bootLog5.slice(-600));
    }
  } catch (e) { check('wipe-block boot checks ran', false, String(e)); }
  child5.kill();

  /* ---- boot 6 (v2.0, RS-SEC v1.03 G3+G4): a STOCK install ----
     Scratch APP_DIR, no MEDIA_DIR, no DATA_DIR — exactly what `docker compose
     up` produces. Two things must be true that were not true in v1.02:
       G3  MEDIA_DIR resolves to <APP_DIR>/media (the code shipped with the
           private install's "Images & Videos", which no stock install has, so
           the conductor scanned a folder that did not exist);
       G4  a legacy JSON store sitting beside APP_DIR is migrated into DATA_DIR
           on first boot, and every store resolves under DATA_DIR from then on.
     A second boot with ONLY the legacy media folder present proves the
     back-compat fallback still wins for an existing install. */
  const PORT6 = PORT + 5;
  const app6 = path.join(tmp, 'app6');
  fs.mkdirSync(path.join(app6, 'media'), { recursive: true });
  // plant a legacy store beside APP_DIR (the pre-1.03 home) — must be migrated
  fs.writeFileSync(path.join(app6, 'viz.json'), JSON.stringify({ modes: { __smoke__: { on: true, style: 'bars' } } }, null, 2));
  const child6 = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT6), APP_DIR: app6, ADMIN_TOKEN: TOK,
      MEDIA_DIR: '', DATA_DIR: '',            // <- deliberately unset: exercise the DEFAULTS
      HA_URL: '', HA_TOKEN: '', MA_URL: '', MA_TOKEN: ''
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let bootLog6 = '';
  child6.stdout.on('data', d => bootLog6 += d);
  child6.stderr.on('data', d => bootLog6 += d);
  try {
    let up6 = false;
    for (let i = 0; i < 30 && !up6; i++) { await sleep(500); try { up6 = (await get('/api/health', PORT6)).code === 200; } catch (e) {} }
    check('stock boot: conductor boots with no MEDIA_DIR and no DATA_DIR', up6, 'no response after 15s. Boot log:\n' + bootLog6.slice(-2000));
    if (up6) {
      check('G3 MEDIA_DIR defaults to <APP_DIR>/media (matching .env.example and compose)',
        bootLog6.indexOf(path.join(app6, 'media')) >= 0 && bootLog6.indexOf('Images & Videos') < 0,
        bootLog6.split('\n').filter(l => l.indexOf('media') >= 0).join(' | ').slice(0, 400));
      check('G3 the boot banner says which media folder it chose',
        /from default <APP_DIR>\/media/.test(bootLog6), bootLog6.split('\n').filter(l => /^\s*media/.test(l)).join(' | '));
      check('G4 DATA_DIR defaults to <APP_DIR>/data and is announced at boot',
        bootLog6.indexOf(path.join(app6, 'data')) >= 0, bootLog6.split('\n').filter(l => l.indexOf('data') >= 0).join(' | ').slice(0, 300));
      check('G4 a legacy store beside APP_DIR is migrated into DATA_DIR on first boot',
        fs.existsSync(path.join(app6, 'data', 'viz.json')) && bootLog6.indexOf('[store] migrated') >= 0,
        'viz.json under data/: ' + fs.existsSync(path.join(app6, 'data', 'viz.json'))
          + ' — ' + bootLog6.split('\n').filter(l => l.indexOf('[store]') >= 0).join(' | '));
      let vizMig = null; try { vizMig = JSON.parse(fs.readFileSync(path.join(app6, 'data', 'viz.json'), 'utf8')); } catch (e) {}
      check('G4 the migrated store kept its contents',
        !!(vizMig && vizMig.modes && vizMig.modes.__smoke__), JSON.stringify(vizMig));
      // a write must land under DATA_DIR, never back in APP_DIR
      const scRes = await post('/api/scores/result', { game: 'Smoke', players: [{ name: 'Zed', score: 1, won: true }] }, PORT6);
      check('G4 a store WRITE lands under DATA_DIR, not APP_DIR',
        scRes.code === 200 && fs.existsSync(path.join(app6, 'data', 'scores.json')) && !fs.existsSync(path.join(app6, 'scores.json')),
        'code ' + scRes.code + ', data/scores.json ' + fs.existsSync(path.join(app6, 'data', 'scores.json'))
          + ', APP_DIR/scores.json ' + fs.existsSync(path.join(app6, 'scores.json')));
    }
  } catch (e) { check('stock boot checks ran', false, String(e)); }
  child6.kill();

  // ---- boot 7 (v2.0, G3): the LEGACY media folder must still win ----
  const PORT7 = PORT + 6;
  const app7 = path.join(tmp, 'app7');
  fs.mkdirSync(path.join(app7, 'Images & Videos'), { recursive: true });   // and NO media/
  const child7 = spawn(process.execPath, [path.join(ROOT, 'conductor.js')], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT7), APP_DIR: app7, ADMIN_TOKEN: TOK, MEDIA_DIR: '', DATA_DIR: '',
      HA_URL: '', HA_TOKEN: '', MA_URL: '', MA_TOKEN: ''
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let bootLog7 = '';
  child7.stdout.on('data', d => bootLog7 += d);
  child7.stderr.on('data', d => bootLog7 += d);
  try {
    let up7 = false;
    for (let i = 0; i < 30 && !up7; i++) { await sleep(500); try { up7 = (await get('/api/health', PORT7)).code === 200; } catch (e) {} }
    check('legacy-media boot: conductor boots', up7, 'no response after 15s. Boot log:\n' + bootLog7.slice(-2000));
    if (up7) {
      check('G3 an existing "Images & Videos" install keeps working (fallback wins when media/ is absent)',
        bootLog7.indexOf(path.join(app7, 'Images & Videos')) >= 0 && /legacy "Images & Videos" folder/.test(bootLog7),
        bootLog7.split('\n').filter(l => /^\s*media/.test(l)).join(' | '));
    }
  } catch (e) { check('legacy-media boot checks ran', false, String(e)); }
  child7.kill();

  // ---- library + source checks (no boot needed) ----
  try {
    const zipLib2 = require(path.join(ROOT, 'conductor-lib', 'zip.js'));
    // F10: a central-directory entry that DECLARES more than the whole budget
    // must be rejected before zlib is asked to allocate anything.
    const okZip = zipLib2.writeZip([{ name: 'p/theme.json', data: Buffer.from('{"format":1}') }]);
    const bomb = Buffer.from(okZip);
    // patch the central-directory uncompressed-size field (offset +24) to ~4 GB
    const eo = (function () { for (let i = bomb.length - 22; i >= 0; i--) if (bomb.readUInt32LE(i) === 0x06054b50) return i; return -1; })();
    const cdOff = bomb.readUInt32LE(eo + 16);
    bomb.writeUInt32LE(0xFFFFFFF0, cdOff + 24);
    let bombErr = '';
    try { zipLib2.readZip(bomb); } catch (e) { bombErr = String(e && e.message); }
    check('F10 a zip entry declaring more than the remaining budget is rejected before inflating',
      bombErr.indexOf('uncompressed size exceeds') >= 0, 'error was: ' + JSON.stringify(bombErr));
    check('F10 an honest zip still parses', zipLib2.readZip(okZip).length === 1, 'entries ' + zipLib2.readZip(okZip).length);

    // F14: pack ids must contain at least one alphanumeric
    const themesLib = require(path.join(ROOT, 'conductor-lib', 'themes.js'))({});
    check('F14 packIdOk rejects "-" and "--" but accepts a real id',
      themesLib.packIdOk('-') === false && themesLib.packIdOk('--') === false && themesLib.packIdOk('ocean-depths') === true,
      '- ' + themesLib.packIdOk('-') + ', -- ' + themesLib.packIdOk('--') + ', ocean-depths ' + themesLib.packIdOk('ocean-depths'));

    // source canaries for the fixes that need live HA / Music Assistant to exercise
    const condSrc = fs.readFileSync(path.join(ROOT, 'conductor.js'), 'utf8');
    const haSrc = fs.readFileSync(path.join(ROOT, 'conductor-lib', 'ha.js'), 'utf8');
    check('F11 mode-music gate accepts MA_URL from the environment',
      condSrc.indexOf('!(process.env.MA_URL || mu.url)') >= 0, 'gate still keyed on settings.music.url alone');
    check('F11 the music-query substring fallback requires terms of 3+ characters',
      /t\.length >= 3/.test(condSrc), 'no minimum term length found');
    check('F13 the HA client bounds its response size and total time',
      haSrc.indexOf('HA_MAX_BODY') >= 0 && haSrc.indexOf('HA_DEADLINE') >= 0, 'no cap/deadline in conductor-lib/ha.js');
    check('F14 the admin-token comparison is constant-time',
      condSrc.indexOf('timingSafeEqual') >= 0, 'no timingSafeEqual in conductor.js');
    check('F14 .gitignore covers config.json.*.bak',
      fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').indexOf('config.json.*.bak') >= 0, 'not ignored');
    const compose = fs.readFileSync(path.join(ROOT, 'docker', 'compose.yaml'), 'utf8');
    check('F1b docker keeps runtime data OUT of the web root (DATA_DIR=/app/data)',
      compose.indexOf('DATA_DIR=/app/data') >= 0 && compose.indexOf('../data:/app/data') >= 0 && compose.indexOf(':/app/web/data') < 0,
      'compose still mounts data inside /app/web');
    check('F4 config.example.json ships auth.tagOpen false',
      /"tagOpen"\s*:\s*false/.test(fs.readFileSync(path.join(ROOT, 'config.example.json'), 'utf8')), 'tagOpen not defaulted to false');

    /* ---- v2.0 (G6): version coherence. Rule 11 — every surface agrees. ---- */
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
    const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
    const secmd = fs.readFileSync(path.join(ROOT, 'SECURITY.md'), 'utf8');
    const archmd = fs.readFileSync(path.join(ROOT, 'docs', 'ARCHITECTURE.md'), 'utf8');
    check('G6 package.json is 1.0.5', pkg.version === '1.0.5', 'version ' + pkg.version);
    check('G6 conductor.js header reads v5.05 (community release v1.05)',
      condSrc.indexOf('Conductor backend  v5.05 (community release v1.05)') >= 0, 'header version stale');
    /* the release-stage suffix ("(alpha)") is allowed to ride along inside the
       bold, so this matches the number and not the whole label. */
    check('G6 README says Version: 1.05', /\*\*Version:\s*1\.05\b/.test(readme), 'README version line stale');
    check('G6 CHANGELOG has a 1.05 entry at the top',
      /^# Changelog\s*\n\s*## 1\.05 /m.test(changelog), 'no 1.05 entry heading the changelog');
    check('G6 SECURITY.md says Version 1.05', /\*\*Version 1\.05\*\*/.test(secmd), 'SECURITY.md version stale');
    check('G6 docs/ARCHITECTURE.md header reads 1.05 / conductor v5.05',
      /\*\*Doc version 1\.05\*\*/.test(archmd) && archmd.indexOf('conductor v5.05') >= 0 && archmd.indexOf('Repo: v1.05') >= 0,
      archmd.split('\n').slice(0, 4).join(' | '));
    check('G6 README project status no longer claims the shipped work is pending',
      readme.indexOf('still to land') < 0 && readme.indexOf('pre-release scaffold') < 0,
      'the stale "still to land" project-status paragraph is still there');

    /* ---- v2.1 (H1-H3): the 1.04 pre-publication review fixes stay fixed. ----
       H1/H2 are shadowed-declaration regressions: a second `function foo()` in
       the SAME IIFE silently wins for every caller. Counting declarations is the
       only cheap way to catch it — the file parses fine either way. */
    const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const fxSrc = fs.readFileSync(path.join(ROOT, 'fx.js'), 'utf8');
    const declCount = (src, name) =>
      (src.match(new RegExp('(^|[^.\\w])function\\s+' + name + '\\s*\\(', 'g')) || []).length;

    check('H1 recordRecent() is declared exactly once (the mode-history one)',
      declCount(appSrc, 'recordRecent') === 1,
      'found ' + declCount(appSrc, 'recordRecent') + ' declarations — a shadow makes every mode launch POST profiles.json');
    check('H1 the music helper is recordRecentMusic() and is actually called',
      declCount(appSrc, 'recordRecentMusic') === 1 && /recordRecentMusic\(uri, label, image\)/.test(appSrc),
      'the renamed music recents helper is missing or uncalled');
    check('H2 edBase() is declared exactly once',
      declCount(appSrc, 'edBase') === 1,
      'found ' + declCount(appSrc, 'edBase') + ' declarations — the intro-lens shadow drops paintCanvas()');
    check('H2 the surviving edBase() still repaints the canvas and pushes preview',
      /function edBase\(fn\)\s*\{[^}]*paintCanvas\(\)[^}]*schedPreview\(\)/.test(appSrc),
      'edBase() no longer calls paintCanvas() + schedPreview()');

    /* H3: scoreboard escaping. Player name/nick are the least-privileged write in
       the product and land on every wall TV, so no raw interpolation may return. */
    const scorePanelSrc = (function () {
      const i = fxSrc.indexOf('function scorePanel');
      return i < 0 ? '' : fxSrc.slice(i, fxSrc.indexOf('function mapPanel', i));
    })();
    check('H3 scorePanel() exists and was located for inspection', scorePanelSrc.length > 200, 'could not slice scorePanel');
    check('H3 scorePanel() escapes player name and nickname',
      scorePanelSrc.indexOf("escA(w.name || '')") >= 0 && scorePanelSrc.indexOf('escA(w.nick)') >= 0
        && scorePanelSrc.indexOf("escA(p.name || '')") >= 0 && scorePanelSrc.indexOf('escA(p.nick)') >= 0,
      'a name/nick is still interpolated raw');
    check('H3 scorePanel() leaves no unescaped name/nick interpolation behind',
      !/\+ \((?:w|p)\.(?:name|nick)(?: \|\| '')?\)/.test(scorePanelSrc.replace(/escA\([^)]*\)/g, 'ESC')),
      'found a bare (p.name || \'\') style interpolation');
    check('H3 mapPanel() escapes the accent and the pano background',
      /function mapPanel\(g0\)[^\n]*escA\(g0\.accent\)[^\n]*escA\(g0\.pano\)/.test(fxSrc),
      'mapPanel still interpolates g0.accent / g0.pano raw');
    check('H3 fx.js header records the v1.63 escaping pass',
      /effects layer \(fx\.js\)\s+v1\.63/.test(fxSrc), 'fx.js header version stale');
    check('H4 SECURITY.md gives the edge service port as 8090, not 8093',
      secmd.indexOf('8093') < 0 && /port 8090 — `PORT` in `deploy\/immersion-edge\.service`/.test(secmd),
      'SECURITY.md still references port 8093');

    /* ---- v2.2 (H5-H9): documentation coherence. The 1.04 docs pass. ---- */
    const docPath = (f) => path.join(ROOT, 'docs', f);
    const docs = {};
    ['GUIDE.md', 'INSTALL.md', 'HA-SETUP.md', 'REFERENCE.md', 'FAQ.md',
      'TROUBLESHOOTING.md', 'THEMES.md', 'ARCHITECTURE.md'].forEach(function (f) {
      try { docs[f] = fs.readFileSync(docPath(f), 'utf8'); } catch (e) { docs[f] = ''; }
    });

    check('H5 docs/GUIDE.md exists and is a real walkthrough, not a stub',
      docs['GUIDE.md'].length > 8000 && /## The shape of the thing/.test(docs['GUIDE.md']),
      'GUIDE.md missing or too short (' + docs['GUIDE.md'].length + ' bytes)');
    check('H5 README points a newcomer at INSTALL then GUIDE',
      /docs\/INSTALL\.md/.test(readme) && /docs\/GUIDE\.md/.test(readme),
      'README doc index does not link both INSTALL and GUIDE');

    /* H6: an unfilled clone placeholder in the quick-start is the single most
       embarrassing thing a public repo can ship. Fail loudly on any of them. */
    const placeholderFiles = ['README.md', 'docs/INSTALL.md', 'docs/HA-SETUP.md', 'CONTRIBUTING.md'];
    const withPlaceholder = placeholderFiles.filter(function (f) {
      try { return /<you>|<YOUR-?NAME>|YOUR_USERNAME_HERE|<username>/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')); }
      catch (e) { return false; }
    });
    check('H6 no unfilled <you> style placeholders in the user-facing docs',
      withPlaceholder.length === 0, 'placeholder still in: ' + withPlaceholder.join(', '));

    /* H7: overlays/ must survive a fresh clone — .gitignore had `overlays/*`
       with a negation for a .gitkeep that did not exist, so neither the folder
       nor its README shipped. */
    const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    check('H7 overlays/ ships in a fresh clone (.gitkeep present and un-ignored)',
      fs.existsSync(path.join(ROOT, 'overlays', '.gitkeep')) && gi.indexOf('!overlays/.gitkeep') >= 0,
      'overlays/.gitkeep ' + fs.existsSync(path.join(ROOT, 'overlays', '.gitkeep')));
    check('H7 overlays/README.txt ships and no longer points at the removed editor.html',
      fs.existsSync(path.join(ROOT, 'overlays', 'README.txt'))
        && gi.indexOf('!overlays/README.txt') >= 0
        && fs.readFileSync(path.join(ROOT, 'overlays', 'README.txt'), 'utf8').indexOf('editor.html') < 0,
      'overlays/README.txt missing, ignored, or still references editor.html');

    /* H8: the audit-count claim was stated three different ways across four files. */
    const auditClaims = ['REFERENCE.md', 'FAQ.md'].filter(function (f) {
      return /two independent (penetration )?(audits|adversarial audits)/i.test(docs[f] || '');
    });
    check('H8 no doc still claims "two independent audits"',
      auditClaims.length === 0, 'stale audit count in: ' + auditClaims.join(', '));

    /* H9: config.example.json must name an at-rest mode that the shipped
       starter profiles store actually provides, or panic has nowhere to go. */
    const cfgEx = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.example.json'), 'utf8'));
    const starter = JSON.parse(fs.readFileSync(path.join(ROOT, 'profiles.json'), 'utf8'));
    check('H9 config.example.json atRestMode exists in the shipped starter profiles',
      !!(starter.profiles && starter.profiles[cfgEx.atRestMode]),
      'atRestMode "' + cfgEx.atRestMode + '" is not in profiles.json ('
        + Object.keys((starter.profiles || {})).join(', ') + ')');
    check('H9 config.example.json documents ha.lights, which is a live key',
      !!(cfgEx.ha && Array.isArray(cfgEx.ha.lights)),
      'ha.lights absent from config.example.json — /api/lightscene reads it');

    /* ---- v2.3 (I1-I5): the 1.05 High fixes and the public-repo plumbing. ---- */
    const wsSrc = fs.readFileSync(path.join(ROOT, 'conductor-lib', 'ws.js'), 'utf8');

    check('I1 ws.js tracks a cumulative fragment length and caps it',
      /client\.fragLen \+= payload\.length/.test(wsSrc)
        && /client\.fragLen > WS_MAX_BUF/.test(wsSrc)
        && /fragLen: 0/.test(wsSrc),
      'the fragment accumulator is uncapped again — a tokenless client can OOM the conductor');
    check('I1 ws.js resets the fragment state after a completed message',
      /client\.frag = \[\]; client\.fragLen = 0;/.test(wsSrc),
      'fragLen is not reset on FIN — it would leak across messages and false-trip the cap');
    check('I1 ws.js policies the continuation state machine',
      /new text frame arrived mid-fragment/.test(wsSrc)
        && /continuation frame with nothing to continue/.test(wsSrc)
        && /fragOpen/.test(wsSrc),
      'continuation frames are unpoliced');
    check('I2 ws.js caps concurrent clients and refuses past it',
      /WS_MAX_CLIENTS\s*=\s*\d+/.test(wsSrc) && /clients\.size >= WS_MAX_CLIENTS/.test(wsSrc),
      'no concurrent-socket cap');

    check('I3 the theme export sizes the pack before reading any of it',
      /function packSize\(/.test(condSrc) && /EXPORT_CAP/.test(condSrc)
        && condSrc.indexOf('var sz = packSize(pdir, 0);') >= 0,
      'GET /api/theme/export still walks and reads with no budget');
    check('I3 the theme export refuses an oversized pack with 413',
      /real\.json\(413, \{ ok: false, error: 'pack is too large to export/.test(condSrc),
      'no 413 refusal path on the export route');
    check('I3 the theme export single-flights and yields before building',
      /EXPORT_INFLIGHT/.test(condSrc) && /setImmediate\(function \(\) \{\s*\n?\s*try \{ finish\(null, zip\.writeZip\(files\)/.test(condSrc),
      'concurrent exports still each build their own zip on the request tick');
    check('I3 every waiting exporter is answered on failure as well as success',
      /err \? w\.fail\(err\) : w\.ok\(buf, nfiles\)/.test(condSrc),
      'a failed build would leave queued clients hanging');

    /* I4: CI must exist and must actually run the suite, or none of the above
       protects anyone after the first merge. */
    const wf = path.join(ROOT, '.github', 'workflows', 'smoke.yml');
    check('I4 a CI workflow exists and runs the smoke suite',
      fs.existsSync(wf) && /node scripts\/smoke\.js/.test(fs.readFileSync(wf, 'utf8')),
      '.github/workflows/smoke.yml missing or does not run smoke.js');
    check('I4 CI also guards against a tracked secret or state file',
      fs.existsSync(wf) && /BEGIN \[A-Z \]\*PRIVATE KEY/.test(fs.readFileSync(wf, 'utf8')),
      'the CI secret-scan step is missing');
    check('I5 issue and PR templates ship',
      fs.existsSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml'))
        && fs.existsSync(path.join(ROOT, '.github', 'pull_request_template.md')),
      '.github templates missing');
    check('I5 package.json declares a license and author for a public repo',
      pkg.license === 'MIT' && !!pkg.author,
      'license ' + pkg.license + ', author ' + pkg.author);

    /* I6: REFERENCE.md states the ENGINE version in its header, so it is a
       factual claim that goes stale silently. The other doc headers are just
       "reviewed as of", and are not asserted on. */
    check('I6 docs/REFERENCE.md names the current conductor and repo version',
      /\*\*Doc version 1\.05\*\* · Conductor v5\.05 · Repo v1\.05/.test(docs['REFERENCE.md']),
      'REFERENCE.md header: ' + (docs['REFERENCE.md'] || '').split('\n')[2]);

    /* I7: the alpha notice sets expectations before anyone spends an evening on
       this. It is the single most important paragraph in the repo for a first-
       time visitor, and exactly the sort of thing that gets lost in a later
       README tidy-up. Assert it is present, prominent, and says the three
       things that matter: alpha, not-a-product, expect-breaking-changes. */
    check('I7 README carries the alpha notice, above the fold',
      /ALPHA/.test(readme) && readme.indexOf('ALPHA') < 1200,
      'the alpha notice is missing or has drifted below the fold');
    check('I7 the alpha notice frames this as a starting point, not a product',
      /This is not a product/i.test(readme) && /starting point/i.test(readme),
      'the "not a product / starting point" framing is gone');
    check('I7 the alpha notice warns about breaking changes',
      /breaking changes/i.test(readme), 'no breaking-change warning in the README');
    check('I7 INSTALL.md repeats the alpha warning before the install steps',
      /alpha/i.test(docs['INSTALL.md']) && docs['INSTALL.md'].indexOf('alpha') < 1500,
      'INSTALL.md does not flag the alpha status up front');

    /* ---- v2.0 (G3): the repo must ship the folders the defaults point at ---- */
    check('G3 the repo ships media/.gitkeep and .gitignore keeps the folder but not its contents',
      fs.existsSync(path.join(ROOT, 'media', '.gitkeep'))
        && fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').indexOf('!media/.gitkeep') >= 0,
      'media/.gitkeep ' + fs.existsSync(path.join(ROOT, 'media', '.gitkeep')));
    check('G3 .env.example documents the media default and the legacy fallback',
      /defaults to <APP_DIR>\/media/i.test(fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8'))
        && /Images & Videos/.test(fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8')),
      '.env.example does not describe MEDIA_DIR');

    /* ---- v2.0 (G7): the loud ones are written down ---- */
    check('G7 SECURITY.md documents the four known-open surfaces',
      secmd.indexOf('"auth": { "enabled": false }') >= 0
        && secmd.indexOf('/api/theme/export/') >= 0
        && secmd.indexOf('deploy/edge.js') >= 0
        && /known read-surface/i.test(secmd),
      'auth-off ' + (secmd.indexOf('"auth": { "enabled": false }') >= 0)
        + ', theme-export ' + (secmd.indexOf('/api/theme/export/') >= 0)
        + ', edge ' + (secmd.indexOf('deploy/edge.js') >= 0)
        + ', read-surface ' + /known read-surface/i.test(secmd));
  } catch (e) { check('library + source checks ran', false, String(e && e.stack || e)); }

  const fails = checks.filter(c => !c.ok).length;
  console.log('\n' + (fails ? 'SMOKE FAIL — ' + fails + ' failing' : 'SMOKE PASS — ' + checks.length + ' checks'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('smoke error:', e); child.kill(); process.exit(1); });
