#!/usr/bin/env node
/* ============================================================================
 * Roomscape — EDGE media mirror   v1.12 (public)
 * v1.11: PER-SCREEN rotation — /edge/screens reads/writes ROTATE_MAP in ~/.xinitrc
 *        (output=left|right|inverted|normal overrides, xinitrc v1.9 applies them),
 *        POST accepts {rotations:{output:rot}}; '' clears an override.
 * v1.10: /edge/screens also toggles the corner frame-ids (labels) so the admin can
 *        identify which physical TV is which after applying an arrangement.
 * v1.9: GET /edge/audiodevices (list HDMI outputs) + GET /edge/tone?card&dev (play a
 *       test tone on one TV) — powers the sound-test "Room speakers" per-TV tester.
 * v1.8: GET/POST /edge/screens — read + rewrite the kiosk's OUTPUTS order & ROTATE
 *       in ~/.xinitrc and restart the wall, so the admin can drag-reorder screens
 *       without SSH (same effect as configure-screens.sh).
 * v1.7: downloads now have a stall timeout (DL_IDLE_MS, default 20s of no data →
 *       drop it so it can't hog a slot) + automatic retries of transient network
 *       errors (DL_RETRIES, default 2). Big throughput win on flaky WiFi.
 * v1.6: non-destructive orphan scan (boot + every 5 min) → /edge/status.orphans
 *       {count,bytes} so the admin shows how many stale files & how much space
 *       before you clean.
 * v1.5: GET /edge/cleanup — manual prune of local files no longer on the upstream server (+ stale
 *       .part), guarded against wiping on an empty/failed manifest; result in
 *       /edge/status.lastCleanup. Sync stays additive; cleanup is opt-in.
 * v1.4: /edge/status prewarm now also reports the pending video/image split
 *       (videos/images {total,done}), bytesTotal/bytesDone, a rolling speedBps and
 *       etaS, plus library.bytesPresent — for the admin's speed/ETA + type breakdown.
 * v1.3: reports library coverage (present/total/bytes) in /edge/status for the admin
 *       progress bars; GET /edge/prewarm triggers a sync now; CORS on /edge/* .
 * v1.2: logs to a file (~/immersion-edge/edge.log) since snap-Node stdio doesn't
 *       reach journald; recent pre-warm failures surfaced in /edge/status.errors.
 * v1.1: pre-warm logs each failure with its reason + saved/failed summary;
 *       double-callback guard in downloadToCache (fixes the concurrency storm).
 * ----------------------------------------------------------------------------
 * Runs on each display PC. The kiosks point at THIS server (http://localhost:8090)
 * instead of the upstream Conductor. It splits the two planes:
 *
 *   CONTROL PLANE (tiny)  — HTML pages, /api/*, the WebSocket state sync:
 *       reverse-proxied straight through to the upstream upstream Conductor, so the
 *       room still has exactly one source of truth.
 *
 *   MEDIA PLANE (heavy)   — /media /overlays /photos (the 4K videos & images):
 *       served from a LOCAL cache on this PC's disk. On a cache miss the file is
 *       proxied through from the upstream server once (so it still plays immediately) while a
 *       background download saves it locally for every future play. A pre-warm
 *       loop pulls the whole library from the Conductor's /api/manifest on boot
 *       and hourly, so by game night nothing streams over the network.
 *
 * No changes to the web app are needed: every /media/... URL already resolves to
 * whichever host served the page, so pointing the kiosk here makes media local.
 *
 * Env:
 *   PORT             local port the kiosks connect to        (default 8090)
 *   UPSTREAM         the upstream Conductor base URL         (REQUIRED, e.g. http://<server-ip>:8090)
 *   CACHE_DIR        where cached media is stored            (default ~/framecache)
 *   PREWARM          "1" to pre-download the whole library   (default 1)
 *   PREWARM_INTERVAL_MS  re-sync period                      (default 3600000 = 1h)
 *   CONCURRENCY      parallel pre-warm downloads             (default 3)
 * ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = parseInt(process.env.PORT || '8090', 10);
const UPSTREAM = (process.env.UPSTREAM || '').replace(/\/+$/, '');
if (!UPSTREAM) {
  console.error('edge: UPSTREAM is not set. Set it to your Conductor base URL, e.g.');
  console.error('  UPSTREAM=http://<server-ip>:8090 node edge.js');
  console.error('(install-edge.sh writes it into immersion-edge.service for you.)');
  process.exit(1);
}
const CACHE_DIR = process.env.CACHE_DIR || path.join(process.env.HOME || '/tmp', 'framecache');
const PREWARM = process.env.PREWARM !== '0';
const PREWARM_INTERVAL_MS = parseInt(process.env.PREWARM_INTERVAL_MS || '3600000', 10);
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '3', 10));
const DL_IDLE_MS = parseInt(process.env.DL_IDLE_MS || '20000', 10);   // drop a stalled download (no data for this long) so it can't hog a slot
const DL_RETRIES = parseInt(process.env.DL_RETRIES || '2', 10);       // retry transient network errors (not 4xx) this many times

/* ---- v1.12 LIVE GUARD: never let a background sync make the wall stutter ----
   The edge polls the Conductor's /api/state; while the wall is LIVE
   (state.live === true — falls back to "a game is set" on older conductors)
   the pre-warm downloads HOLD (default) or trickle 1-at-a-time (LIVE_TRICKLE=1).
   On-demand cache-miss fetches are NOT touched — those are files the wall
   needs right now. Status shows .live + prewarm.liveHold so the admin can see
   why a sync is waiting.
   Env: LIVE_GUARD=0 disable | LIVE_POLL_MS (10000) | LIVE_TRICKLE=1 | LIVE_GAP_MS (5000) */
const LIVE_GUARD = process.env.LIVE_GUARD !== '0';
const LIVE_POLL_MS = Math.max(3000, parseInt(process.env.LIVE_POLL_MS || '10000', 10));
const LIVE_TRICKLE = process.env.LIVE_TRICKLE === '1';
const LIVE_GAP_MS = Math.max(500, parseInt(process.env.LIVE_GAP_MS || '5000', 10));
let live = { on: false, game: null, since: 0, checkedAt: 0 };
let __lgHold = null;
function allowedSlots() { if (!LIVE_GUARD || !live.on) return CONCURRENCY; return LIVE_TRICKLE ? 1 : 0; }
function pollLive() {
  httpGetJson('/api/state', (e, st) => {
    live.checkedAt = Date.now();
    let on = false, g = null;
    if (!e && st) {
      g = (typeof st.game === 'string' && st.game) ? st.game : null;
      on = (typeof st.live === 'boolean') ? st.live : !!g; // conductor's own live flag wins
    }
    if (on !== live.on) {
      live.since = Date.now();
      log('live-guard: wall ' + (on ? ('LIVE (' + (g || '?') + ') — prewarm ' + (LIVE_TRICKLE ? 'throttled to 1-at-a-time' : 'holding')) : 'idle — prewarm at full speed'));
    }
    live.on = on; live.game = g;
  });
}
if (LIVE_GUARD) { setTimeout(pollLive, 2500); setInterval(pollLive, LIVE_POLL_MS); }

const U = new URL(UPSTREAM);
const UP = { host: U.hostname, port: U.port || 80 };
const CACHE_PREFIXES = ['/media/', '/overlays/', '/photos/'];   // heavy, cached locally
const HOME = process.env.HOME || '/tmp';
const XINITRC = process.env.XINITRC || path.join(HOME, '.xinitrc');
const XENV = { DISPLAY: ':0', XAUTHORITY: path.join(HOME, '.Xauthority'), PATH: '/usr/bin:/bin:/usr/local/bin' };
const VID_RE = /\.(mp4|webm|m4v|mov)$/i;
function isVideo(p) { return VID_RE.test((p || '').split('?')[0]); }
const MIME = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4v': 'video/x-m4v', '.mov': 'video/quicktime',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml'
};

let stats = { hits: 0, misses: 0, cached: 0, bytes: 0, library: null, orphans: null, lastCleanup: null, prewarm: { total: 0, done: 0, running: false, last: 0 } };
const inflight = new Set();   // absolute cache paths currently downloading

// rolling transfer-speed + ETA sampler — updates the running prewarm every 2 s
let _spd = { t: Date.now(), bytes: 0 };
setInterval(() => {
  const pw = stats.prewarm;
  if (!pw || !pw.running) { _spd = { t: Date.now(), bytes: (pw && pw.bytesDone) || 0 }; return; }
  const now = Date.now(), dt = (now - _spd.t) / 1000, db = (pw.bytesDone || 0) - _spd.bytes;
  if (dt >= 1) {
    pw.speedBps = Math.max(0, db / dt);
    pw.etaS = pw.speedBps > 0 ? Math.round(Math.max(0, (pw.bytesTotal || 0) - (pw.bytesDone || 0)) / pw.speedBps) : null;
    _spd = { t: now, bytes: pw.bytesDone || 0 };
  }
}, 2000);

// snap-Node's stdout/stderr often doesn't reach journald, so log to a file too.
const LOG_FILE = process.env.LOG_FILE || path.join(__dirname, 'edge.log');
function log() {
  const line = '[' + new Date().toISOString() + '] ' + Array.prototype.map.call(arguments, String).join(' ');
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (e) {}
  try { console.error('[edge]', line); } catch (e) {}
}
function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

/* map a request URL to a safe absolute path inside CACHE_DIR (traversal-guarded) */
function cachePathFor(reqUrl) {
  const clean = reqUrl.split('?')[0];
  const rel = safeDecode(clean).replace(/^\/+/, '');
  const abs = path.resolve(CACHE_DIR, rel);
  if (abs !== path.resolve(CACHE_DIR) && !abs.startsWith(path.resolve(CACHE_DIR) + path.sep)) return null;
  return abs;
}
function isCacheable(method, reqUrl) {
  if (method !== 'GET') return false;
  if (reqUrl.indexOf('?') >= 0) return false;                 // keep cache keys clean (thumbs etc. are proxied)
  const p = safeDecode(reqUrl.split('?')[0]);
  return CACHE_PREFIXES.some((pre) => p.indexOf(pre) === 0);
}

/* ---- serve a local cached file, with byte-range support (mirrors serveFile) ---- */
function serveLocal(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { proxy(req, res); return; }       // vanished — fall back to upstream
    stats.hits++;
    const h = {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600', 'X-Edge-Cache': 'HIT'
    };
    let start = 0, end = st.size - 1, code = 200;
    const rng = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (rng && (rng[1] !== '' || rng[2] !== '')) {
      if (rng[1] === '') start = Math.max(0, st.size - parseInt(rng[2], 10));
      else { start = parseInt(rng[1], 10); if (rng[2] !== '') end = Math.min(parseInt(rng[2], 10), st.size - 1); }
      if (start >= st.size || start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); res.end(); return; }
      code = 206; h['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
    }
    h['Content-Length'] = end - start + 1;
    res.writeHead(code, h);
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = fs.createReadStream(file, { start: start, end: end });
    stream.pipe(res);
    stream.on('error', () => { try { res.end(); } catch (e) {} });
  });
}

/* ---- generic reverse proxy to the upstream upstream Conductor ---- */
function proxy(req, res) {
  const opts = { host: UP.host, port: UP.port, method: req.method, path: req.url, headers: Object.assign({}, req.headers, { host: U.host }) };
  const preq = http.request(opts, (pres) => {
    res.writeHead(pres.statusCode, pres.headers);
    pres.pipe(res);
  });
  preq.on('error', (e) => { try { res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end('edge: upstream unreachable (' + e.code + ')'); } catch (x) {} });
  req.pipe(preq);
}

/* ---- WebSocket (and any Upgrade) proxy to upstream ---- */
function proxyUpgrade(req, socket, head) {
  const opts = { host: UP.host, port: UP.port, method: req.method, path: req.url, headers: Object.assign({}, req.headers, { host: U.host }) };
  const preq = http.request(opts);
  preq.on('upgrade', (pres, psock, phead) => {
    let raw = 'HTTP/1.1 ' + pres.statusCode + ' ' + (pres.statusMessage || 'Switching Protocols') + '\r\n';
    for (let i = 0; i < pres.rawHeaders.length; i += 2) raw += pres.rawHeaders[i] + ': ' + pres.rawHeaders[i + 1] + '\r\n';
    raw += '\r\n';
    socket.write(raw);
    if (phead && phead.length) psock.unshift(phead);
    psock.pipe(socket); socket.pipe(psock);
    psock.on('error', () => { try { socket.destroy(); } catch (e) {} });
    socket.on('error', () => { try { psock.destroy(); } catch (e) {} });
  });
  preq.on('error', () => { try { socket.destroy(); } catch (e) {} });
  if (head && head.length) preq.write(head);
  preq.end();
}

/* ---- download a full file from upstream into the local cache (atomic) ---- */
function downloadToCache(reqUrl, cb) {
  const abs = cachePathFor(reqUrl);
  if (!abs) return cb && cb(new Error('bad path'));
  if (inflight.has(abs)) return cb && cb(null, 'inflight');
  inflight.add(abs);
  const tmp = abs + '.part';
  const done = (err, note) => { inflight.delete(abs); cb && cb(err, note); };
  try { fs.mkdirSync(path.dirname(abs), { recursive: true }); } catch (e) { return done(e); }
  const attempt = (tryN) => {
    let settled = false;
    const fin = (err) => {
      if (settled) return; settled = true;
      if (err && tryN < DL_RETRIES && !/upstream 4\d\d/.test(err.message)) {   // retry transient network errors, not 404s
        try { fs.unlinkSync(tmp); } catch (x) {}
        return setTimeout(() => attempt(tryN + 1), 1500 * (tryN + 1));
      }
      done(err, err ? null : 'saved');
    };
    const preq = http.get({ host: UP.host, port: UP.port, path: reqUrl, headers: { host: U.host } }, (pres) => {
      if (pres.statusCode !== 200) { pres.resume(); return fin(new Error('upstream ' + pres.statusCode)); }
      const ws = fs.createWriteStream(tmp);
      pres.pipe(ws);
      ws.on('finish', () => ws.close(() => {
        try { fs.renameSync(tmp, abs); const st = fs.statSync(abs); stats.cached++; stats.bytes += st.size; fin(null); }
        catch (e) { fin(e); }
      }));
      ws.on('error', (e) => { try { fs.unlinkSync(tmp); } catch (x) {} fin(e); });
      pres.on('error', (e) => { try { ws.destroy(); fs.unlinkSync(tmp); } catch (x) {} fin(e); });
    });
    preq.setTimeout(DL_IDLE_MS, () => preq.destroy(new Error('idle timeout')));   // no data for DL_IDLE_MS → drop it
    preq.on('error', (e) => fin(e));
  };
  attempt(0);
}
function backgroundFetch(reqUrl) {
  const abs = cachePathFor(reqUrl);
  if (!abs || inflight.has(abs)) return;
  fs.stat(abs, (err) => { if (!err) return; downloadToCache(reqUrl, (e) => { if (e && String(e.message).indexOf('inflight') < 0) log('miss-fetch failed', reqUrl, e.message); }); });
}

/* ---- pre-warm: pull the whole library from the manifest ---- */
function httpGetJson(pathUrl, cb) {
  const preq = http.get({ host: UP.host, port: UP.port, path: pathUrl, headers: { host: U.host } }, (pres) => {
    if (pres.statusCode !== 200) { pres.resume(); return cb(new Error('status ' + pres.statusCode)); }
    let s = ''; pres.on('data', (c) => s += c); pres.on('end', () => { try { cb(null, JSON.parse(s)); } catch (e) { cb(e); } });
  });
  preq.on('error', cb);
}
function needsFile(f, done) {
  const abs = cachePathFor(f.path);
  if (!abs) return done(false);
  fs.stat(abs, (err, st) => { if (err) return done(true); done(!!(f.size && st.size !== f.size)); });
}
function prewarm() {
  if (stats.prewarm.running) return;
  httpGetJson('/api/manifest', (err, m) => {
    if (err || !m || !Array.isArray(m.files)) { log('prewarm: manifest unavailable —', err ? err.message : 'no files'); return; }
    log('prewarm: manifest = ' + m.files.length + ' files, ' + (m.bytes || '?') + ' bytes');
    stats.library = { total: m.files.length, present: 0, bytes: m.bytes || 0, bytesPresent: 0 };
    // figure out which files are missing/stale, then download with bounded concurrency
    let idx = 0; const queue = [];
    const check = () => {
      if (idx >= m.files.length) return start(queue);
      const f = m.files[idx++];
      needsFile(f, (need) => { if (need) queue.push(f); check(); });
    };
    const start = (list) => {
      let qBytes = 0, vFiles = 0, iFiles = 0;   // split the pending queue into videos vs images
      list.forEach((f) => { const sz = f.size || 0; qBytes += sz; if (isVideo(f.path)) vFiles++; else iFiles++; });
      stats.library.present = m.files.length - list.length;
      stats.library.bytesPresent = Math.max(0, (m.bytes || 0) - qBytes);
      stats.prewarm = {
        total: list.length, done: 0, ok: 0, failed: 0, errors: [], running: list.length > 0, last: Date.now(),
        videos: { total: vFiles, done: 0 }, images: { total: iFiles, done: 0 },
        bytesTotal: qBytes, bytesDone: 0, startedAt: Date.now(), speedBps: 0, etaS: null
      };
      if (!list.length) { log('prewarm: cache already complete (' + m.files.length + ' files)'); return; }
      log('prewarm: fetching ' + list.length + ' of ' + m.files.length + ' files (' + vFiles + ' video, ' + iFiles + ' image)…');
      let active = 0, i = 0, logged = 0;
      const next = () => {
        if (i >= list.length) {
          if (active === 0 && stats.prewarm.running) { stats.prewarm.running = false; stats.prewarm.speedBps = 0; stats.prewarm.etaS = 0; log('prewarm: done — saved ' + stats.prewarm.ok + ', failed ' + stats.prewarm.failed); setTimeout(scanOrphans, 800); }
          return;
        }
        const cap = allowedSlots();
      stats.prewarm.liveHold = (cap === 0);
      if (cap === 0 && active === 0) { if (!__lgHold) __lgHold = setTimeout(() => { __lgHold = null; next(); }, 15000); return; }
      while (active < cap && i < list.length) {
          const f = list[i++]; active++;
          downloadToCache(f.path, (e2) => {
            active--; stats.prewarm.done++;
            if (e2) { stats.prewarm.failed++; if (logged < 8) { logged++; stats.prewarm.errors.push(f.path + ' -> ' + e2.message); log('prewarm FAIL ' + f.path + ' -> ' + e2.message); } }
            else {
              stats.prewarm.ok++;
              const sz = f.size || 0;
              stats.prewarm.bytesDone += sz;
              if (isVideo(f.path)) stats.prewarm.videos.done++; else stats.prewarm.images.done++;
              if (stats.library) { stats.library.present++; stats.library.bytesPresent = (stats.library.bytesPresent || 0) + sz; }
            }
            if (LIVE_GUARD && live.on && LIVE_TRICKLE) setTimeout(next, LIVE_GAP_MS); else next();
          });
        }
      };
      next();
    };
    check();
  });
}

/* ---- manual cleanup: delete local files no longer on the upstream server (+ stale .part). GUARDED:
   never prunes if the manifest is missing/empty, and only ever touches the cache's own
   media/overlays/photos folders. */
function cleanup(cb) {
  httpGetJson('/api/manifest', (err, m) => {
    if (err || !m || !Array.isArray(m.files) || m.files.length === 0) return cb(new Error('manifest unavailable or empty — not pruning'));
    const keep = new Set();
    m.files.forEach((f) => { const abs = cachePathFor(f.path); if (abs) keep.add(abs); });
    let removed = 0, bytes = 0;
    const walk = (dir) => {
      let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const en of ents) {
        const p = path.join(dir, en.name);
        if (en.isDirectory()) { walk(p); try { if (fs.readdirSync(p).length === 0) fs.rmdirSync(p); } catch (e) {} }
        else if (en.isFile()) {
          if (en.name.endsWith('.part') || !keep.has(p)) { try { const st = fs.statSync(p); fs.unlinkSync(p); removed++; bytes += st.size; } catch (e) {} }
        }
      }
    };
    CACHE_PREFIXES.forEach((pre) => walk(path.join(CACHE_DIR, pre.replace(/^\/+|\/+$/g, ''))));
    stats.lastCleanup = { removed: removed, bytes: bytes, at: Date.now() };
    stats.orphans = { count: 0, bytes: 0, at: Date.now() };   // just cleared them
    log('cleanup: removed ' + removed + ' orphan file(s), ' + bytes + ' bytes');
    cb(null, { removed: removed, bytes: bytes });
  });
}

/* ---- non-destructive orphan scan: count local files not on the upstream server (+ stale .part),
   so the admin can show "N orphans · X GB" and decide when to clean. ---- */
function scanOrphans() {
  if (stats.prewarm && stats.prewarm.running) return;   // .part churn during a sync would skew the count
  httpGetJson('/api/manifest', (err, m) => {
    if (err || !m || !Array.isArray(m.files) || m.files.length === 0) return;
    const keep = new Set(); m.files.forEach((f) => { const abs = cachePathFor(f.path); if (abs) keep.add(abs); });
    let count = 0, bytes = 0;
    const walk = (dir) => {
      let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const en of ents) {
        const p = path.join(dir, en.name);
        if (en.isDirectory()) walk(p);
        else if (en.isFile() && (en.name.endsWith('.part') || !keep.has(p))) { try { count++; bytes += fs.statSync(p).size; } catch (e) {} }
      }
    };
    CACHE_PREFIXES.forEach((pre) => walk(path.join(CACHE_DIR, pre.replace(/^\/+|\/+$/g, ''))));
    stats.orphans = { count: count, bytes: bytes, at: Date.now() };
  });
}

/* ---- kiosk screen layout: read/rewrite ~/.xinitrc OUTPUTS + ROTATE, then restart
   the kiosk. Lets the admin drag-reorder screens without SSH (same as configure-screens.sh). ---- */
function readReqBody(req, cb) { var s = ''; req.on('data', (c) => { s += c; if (s.length > 1e5) req.destroy(); }); req.on('end', () => { try { cb(JSON.parse(s || '{}')); } catch (e) { cb({}); } }); }
function xinitGet(txt, key) { var m = new RegExp('^' + key + '="([^"]*)"', 'm').exec(txt); return m ? m[1] : ''; }
function readScreens(cb) {
  fs.readFile(XINITRC, 'utf8', (e, txt) => {
    if (e) return cb(e);
    var rotations = {};
    xinitGet(txt, 'ROTATE_MAP').split(/\s+/).filter(Boolean).forEach((kv) => { var ix = kv.indexOf('='); if (ix > 0) rotations[kv.slice(0, ix)] = kv.slice(ix + 1); });
    cb(null, { text: txt, outputs: xinitGet(txt, 'OUTPUTS').split(/\s+/).filter(Boolean), frames: xinitGet(txt, 'FRAMES').split(/\s+/).filter(Boolean), rotate: xinitGet(txt, 'ROTATE') || 'left', rotations: rotations });
  });
}
function connectedOutputs(cb) {
  execFile('xrandr', [], { env: XENV, timeout: 8000 }, (e, out) => {
    if (e) return cb(e);
    var list = []; String(out).split('\n').forEach((l) => { var m = /^(\S+) connected/.exec(l); if (m) list.push(m[1]); });
    cb(null, list);
  });
}
function getScreens(cb) {
  readScreens((e, cfg) => {
    if (e) return cb(e);
    connectedOutputs((e2, connected) => cb(null, { config: { outputs: cfg.outputs, frames: cfg.frames, rotate: cfg.rotate, rotations: cfg.rotations || {} }, connected: e2 ? [] : connected }));
  });
}
function setScreens(order, rotate, labels, rotations, cb) {
  if (!Array.isArray(order) || !order.length) return cb(new Error('need order[]'));
  if (rotate && rotate !== 'left' && rotate !== 'right') return cb(new Error('rotate must be left|right'));
  for (var i = 0; i < order.length; i++) if (!/^[A-Za-z0-9_-]+$/.test(order[i])) return cb(new Error('bad output name'));   // guard the rewrite
  var ROTS = { left: 1, right: 1, inverted: 1, normal: 1 };
  var rotMap = null;
  if (rotations && typeof rotations === 'object') {
    rotMap = {};
    for (var k in rotations) {
      if (!/^[A-Za-z0-9_-]+$/.test(k)) return cb(new Error('bad output name in rotations'));
      var rv = rotations[k];
      if (rv === '' || rv == null) continue;               // '' = clear the override
      if (!ROTS[rv]) return cb(new Error('rotation must be left|right|inverted|normal'));
      rotMap[k] = rv;
    }
  }
  readScreens((e, cfg) => {
    if (e) return cb(e);
    var txt = cfg.text.replace(/^OUTPUTS=.*/m, 'OUTPUTS="' + order.join(' ') + '"');
    if (rotate) txt = txt.replace(/^ROTATE=.*/m, 'ROTATE="' + rotate + '"');
    if (rotMap) {                                          // v1.11: per-screen overrides
      var mapStr = Object.keys(rotMap).map((o) => o + '=' + rotMap[o]).join(' ');
      if (/^ROTATE_MAP=.*/m.test(txt)) txt = txt.replace(/^ROTATE_MAP=.*/m, 'ROTATE_MAP="' + mapStr + '"');
      else txt = txt.replace(/^(ROTATE=.*)$/m, '$1\nROTATE_MAP="' + mapStr + '"');
    }
    txt = txt.replace(/label=[01]/g, 'label=' + (labels ? '1' : '0'));   // corner frame-ids on/off (identify screens)
    try { fs.copyFileSync(XINITRC, XINITRC + '.bak.' + Date.now()); } catch (x) {}
    fs.writeFile(XINITRC, txt, (e2) => {
      if (e2) return cb(e2);
      log('screens: OUTPUTS="' + order.join(' ') + '"' + (rotate ? ' ROTATE="' + rotate + '"' : '') + (rotMap ? ' ROTATE_MAP="' + Object.keys(rotMap).map((o) => o + '=' + rotMap[o]).join(' ') + '"' : '') + ' — restarting kiosk');
      execFile('sudo', ['systemctl', 'restart', 'getty@tty1'], { timeout: 8000 }, (e3) => cb(null, { ok: true, restart: e3 ? ('warn: ' + e3.message) : 'ok' }));
    });
  });
}

/* ---- audio: list the HDMI output devices + play a test tone on one (for the
   "Room speakers" tester — hear which TV is which). Args are ints, run via execFile
   (no shell), so nothing to inject. ---- */
function audioDevices(cb) {
  execFile('aplay', ['-l'], { env: XENV, timeout: 5000 }, (e, out) => {
    if (e) return cb(e);
    var list = [];
    String(out).split('\n').forEach((l) => {
      var m = /^card (\d+):.*device (\d+): (.+)$/.exec(l);
      if (m && /hdmi/i.test(l)) list.push({ card: +m[1], dev: +m[2], name: m[3].replace(/[\[\]]/g, '').trim() });
    });
    cb(null, list);
  });
}
function playTone(card, dev, cb) {
  card = parseInt(card, 10); dev = parseInt(dev, 10);
  if (isNaN(card) || isNaN(dev)) return cb(new Error('bad device'));
  execFile('timeout', ['2', 'speaker-test', '-D', 'plughw:' + card + ',' + dev, '-c2', '-t', 'sine', '-f', '500', '-l', '1'], { env: XENV, timeout: 6000 }, () => cb(null, { ok: true, card: card, dev: dev }));
}

/* ---- request router ---- */
const server = http.createServer((req, res) => {
  const url = req.url;
  if (url === '/edge/health') { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end(JSON.stringify({ ok: true, edge: 'v1.12', upstream: UPSTREAM })); }
  if (url === '/edge/status') { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end(JSON.stringify({ ok: true, cacheDir: CACHE_DIR, upstream: UPSTREAM, library: stats.library, prewarm: stats.prewarm, orphans: stats.orphans, lastCleanup: stats.lastCleanup, hits: stats.hits, misses: stats.misses, cached: stats.cached, inflight: inflight.size, live: { guard: LIVE_GUARD, on: live.on, game: live.game, trickle: LIVE_TRICKLE } })); }
  if (url === '/edge/prewarm') { const was = stats.prewarm.running; if (!was) prewarm(); res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end(JSON.stringify({ ok: true, started: !was, alreadyRunning: was })); }
  if (url === '/edge/cleanup') { return cleanup((err, r) => { res.writeHead(err ? 409 : 200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(err ? { ok: false, error: err.message } : Object.assign({ ok: true }, r))); }); }
  if (url === '/edge/screens' && req.method === 'GET') { return getScreens((e, d) => { res.writeHead(e ? 500 : 200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(e ? { ok: false, error: e.message } : Object.assign({ ok: true }, d))); }); }
  if (url === '/edge/screens' && req.method === 'POST') { return readReqBody(req, (b) => setScreens(b && b.order, b && b.rotate, b && b.labels, b && b.rotations, (e, d) => { res.writeHead(e ? 400 : 200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(e ? { ok: false, error: e.message } : d)); })); }
  if (url.split('?')[0] === '/edge/audiodevices') { return audioDevices((e, d) => { res.writeHead(e ? 500 : 200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(e ? { ok: false, error: e.message } : { ok: true, devices: d })); }); }
  if (url.split('?')[0] === '/edge/tone') { var qs = new URLSearchParams(url.split('?')[1] || ''); return playTone(qs.get('card'), qs.get('dev'), (e, r) => { res.writeHead(e ? 400 : 200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(e ? { ok: false, error: e.message } : r)); }); }
  if (isCacheable(req.method, url)) {
    const abs = cachePathFor(url);
    if (abs) {
      return fs.stat(abs, (err, st) => {
        if (!err && st.isFile()) return serveLocal(req, res, abs);
        stats.misses++;
        backgroundFetch(url);     // populate cache for next time
        proxy(req, res);          // serve now from upstream so playback isn't blocked
      });
    }
  }
  proxy(req, res);
});
server.on('upgrade', (req, socket, head) => proxyUpgrade(req, socket, head));
server.on('clientError', (e, sock) => { try { sock.destroy(); } catch (x) {} });

try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}
server.listen(PORT, () => {
  log('listening on http://localhost:' + PORT);
  log('upstream :', UPSTREAM);
  log('cache    :', CACHE_DIR);
  if (PREWARM) {
    setTimeout(prewarm, 4000);                     // let the network settle after boot
    setInterval(prewarm, PREWARM_INTERVAL_MS);
  } else log('prewarm  : disabled (read-through cache only)');
  setTimeout(scanOrphans, 15000);            // first orphan count shortly after boot
  setInterval(scanOrphans, 300000);          // refresh every 5 min
});
