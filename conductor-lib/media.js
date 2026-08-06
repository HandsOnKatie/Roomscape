/* ===================================================================
   conductor-lib/media.js  v1.2
   v1.2 (RS-SEC v1.01, F6): mediaSafe/themeSafe/photoSafe now resolve symlinks
        (fs.realpathSync.native) and re-check containment — lexical resolve()
        alone let a symlink inside media/ or a theme pack read any host file.
   v1.1 (Phase 4a, RS-AUTH): serveFile CORS header now flows through the
        conductor's ctx.corsHdr policy (config-driven; default = no ACAO).
   Extracted verbatim from conductor.js v2.62 (RoomScape Conductor v3.62 split).
   Media serving + photo listing + media manifest + thumbnail pipeline.
   SAFETY RULES (absolute):
   1. NEVER require npm packages here — node builtins (fs/path/...) ONLY.
      This file lives on the share; an npm require would resolve against the
      share's Windows-only node_modules and shadow the container's Linux ones.
      sharp/jimp are injected by the entry file via ctx.thumbLib()/ctx.thumbKind().
   2. Functions that appended patch blocks REASSIGN stay in conductor.js —
      scanMedia, scanOverlays, pickScene, and the landIndex/overlayList state
      live in core; this module reads them through ctx getters at call time.
   ctx surface: values MEDIA_DIR, OVERLAY_DIR, PHOTOS_DIR, THUMB_DIR, IMG_RE,
   VID_RE, MEDIA_RE, OVL_RE; getters thumbLib(), thumbKind(), landIndex(),
   overlayList(). Discipline: no ctx accessor is called at construction time.
   =================================================================== */
'use strict';
const fs = require('fs'), path = require('path');

module.exports = function (ctx) {
  const MEDIA_DIR = ctx.MEDIA_DIR, OVERLAY_DIR = ctx.OVERLAY_DIR, PHOTOS_DIR = ctx.PHOTOS_DIR, THUMB_DIR = ctx.THUMB_DIR;
  const IMG_RE = ctx.IMG_RE, VID_RE = ctx.VID_RE, MEDIA_RE = ctx.MEDIA_RE, OVL_RE = ctx.OVL_RE;

  /* ---------- containment (RS-SEC v1.01, F6) ----------
     mediaSafe / themeSafe / photoSafe used to do LEXICAL containment only:
     path.resolve() collapses '..' but knows nothing about symlinks. A symlink
     dropped inside the media folder — or shipped in a hand-unzipped theme pack
     — therefore read any file on the host: the audit demonstrated
     /media/__theme__/evil/link.txt returning /etc/passwd.
     Fix: after the lexical check, resolve BOTH the target and the root with
     fs.realpathSync.native and re-check containment, so the path the OS will
     actually open is the one we vetted. A path that doesn't exist yet is not an
     escape — realpath throws ENOENT, and we fall back to the (already
     containment-checked) lexical answer for the callers that write. Anything
     else that throws returns null cleanly rather than propagating.
     PERFORMANCE NOTE: this adds one realpath (a stat-class syscall) per media
     request. Media responses already stat + open + stream the file, and the
     roots are cached below, so the overhead is in the noise next to the
     existing per-request I/O — measured as acceptable for wall playback. */
  // Only SUCCESSFUL resolutions are cached: a root that doesn't exist yet
  // (fresh install, media share not mounted at boot) must not be remembered as
  // "unresolvable" forever — that would kill media serving until a restart.
  const _realRoot = Object.create(null);
  function realRoot(dir) {
    if (_realRoot[dir]) return _realRoot[dir];
    let r = null;
    try { r = fs.realpathSync.native(dir); } catch (e) { return null; }
    _realRoot[dir] = r;
    return r;
  }
  function contained(root, rel) {
    if (!root) return null;
    const rootAbs = path.resolve(root);
    const abs = path.resolve(rootAbs, rel || '');
    if (!abs.startsWith(rootAbs + path.sep)) return null;          // lexical: '..' and absolute rels
    let realTarget;
    try { realTarget = fs.realpathSync.native(abs); }
    catch (e) { return (e && e.code === 'ENOENT') ? abs : null; }   // not there yet -> nothing to escape through
    const rr = realRoot(rootAbs);
    if (!rr) return null;
    if (realTarget !== rr && !realTarget.startsWith(rr + path.sep)) return null;   // symlink pointed outside
    return abs;
  }

  function mediaSafe(rel) {   // resolve a media-relative path strictly inside MEDIA_DIR (v1.5; v1.2 symlink-checked)
    return contained(MEDIA_DIR, rel);
  }
  /* v1.1 (RS-THEMES v1): resolve a theme-pack path (the part after the
     __theme__/ pseudo-rel prefix) strictly inside THEMES_DIR — same
     containment pattern as mediaSafe/photoSafe. */
  function themeSafe(rel) {
    const THEMES_DIR = ctx.THEMES_DIR;
    if (!THEMES_DIR) return null;
    return contained(THEMES_DIR, rel);
  }

  /* -------------------- THUMBNAILS (optional sharp/jimp, disk-cached) -------------------- */
  function thumbOut(tag, w, fn) { try { fs.mkdirSync(THUMB_DIR, { recursive: true }); } catch (e) {} return path.join(THUMB_DIR, (tag === 'p' ? 'p2' : tag) + '_' + w + '_' + fn.replace(/[^a-z0-9_.-]/gi, '_') + (tag === 'p' ? '.jpg' : '.png')); }   // v2.33: p2 = EXIF-oriented generation   // photos -> jpeg (much smaller)
  var _tInflight = {};
  // v2.52: bounded concurrency. _tInflight only deduplicates per output file — a
  // picker page requesting 100 DISTINCT thumbnails used to spawn 100 concurrent
  // sharp pipelines on the NAS (memory/CPU spike, starving the video streams).
  // All generation now flows through a 3-wide queue.
  var _tQueue = [], _tRunning = 0, T_CONC = 3;
  function _tPump() {
    while (_tRunning < T_CONC && _tQueue.length) {
      var job = _tQueue.shift(); _tRunning++;
      _tStart(job.srcPath, job.outPath, job.w, function (err) { _tRunning--; job.done(err); setImmediate(_tPump); });
    }
  }
  function genThumb(srcPath, outPath, w, cb) {
    if (!ctx.thumbLib()) return cb(new Error('nolib'));
    if (_tInflight[outPath]) { _tInflight[outPath].push(cb); return; }
    _tInflight[outPath] = [cb];
    function done(err) { var l = _tInflight[outPath] || []; delete _tInflight[outPath]; l.forEach(function (f) { f(err); }); }
    _tQueue.push({ srcPath: srcPath, outPath: outPath, w: w, done: done }); _tPump();
  }
  function _tStart(srcPath, outPath, w, done) {
    try {
      var thumbLib = ctx.thumbLib(), thumbKind = ctx.thumbKind();
      if (thumbKind === 'sharp') { const pipe = thumbLib(srcPath).rotate().resize({ width: w, withoutEnlargement: true }); /* v2.33: .rotate() = EXIF auto-orient */ (/\.jpg$/.test(outPath) ? pipe.jpeg({ quality: 82 }) : pipe.png()).toFile(outPath).then(function () { done(); }).catch(done); }
      else { thumbLib.read(srcPath).then(function (img) { img.resize(w, thumbLib.AUTO); return img.writeAsync(outPath); }).then(function () { done(); }).catch(done); }
    } catch (e) { done(e); }
  }
  function warmThumbs() {
    if (!ctx.thumbLib()) { console.log('[thumbs] disabled (npm i sharp to enable)'); return; }
    var jobs = [];
    var landIndex = ctx.landIndex(), overlayList = ctx.overlayList();
    Object.keys(landIndex).forEach(function (k) { jobs.push(['m', landIndex[k][0], 320]); });
    overlayList.forEach(function (f) { jobs.push(['o', f, 240]); });
    var i = 0, made = 0;
    (function next() {
      if (i >= jobs.length) { console.log('[thumbs] warmed ' + made + '/' + jobs.length + ' (' + ctx.thumbKind() + ')'); return; }
      var j = jobs[i++], tag = j[0], fn = j[1], w = j[2];
      if (VID_RE.test(fn)) return setImmediate(next);
      var out = thumbOut(tag, w, fn);
      if (fs.existsSync(out)) return setImmediate(next);
      genThumb(path.join(tag === 'o' ? OVERLAY_DIR : MEDIA_DIR, fn), out, w, function (err) { if (!err) made++; setImmediate(next); });
    })();
  }

  /* -------------------- HTTP media helpers -------------------- */
  const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.webm':'video/webm', '.mp4':'video/mp4', '.m4v':'video/mp4', '.mov':'video/quicktime', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ogg':'audio/ogg', '.txt':'text/plain; charset=utf-8', '.md':'text/plain; charset=utf-8' };
  function serveFile(res, file, cache) {
    // v1.62: streaming + byte ranges + Content-Length. Without ranges, <video>
    // elements decode one frame and stall — and unknown-length bodies kept
    // connections dangling. Streams also stop 4K videos being read into RAM.
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
      const h = ctx.corsHdr(res.req, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' });   /* RS-AUTH v1: CORS via the conductor policy (call-time ctx use, per the discipline note) */
      // app files must never be heuristically cached (stale engine/fx in open tabs); media may cache
      h['Cache-Control'] = cache ? 'public, max-age=3600' : 'no-store';
      let start = 0, end = st.size - 1, code = 200;
      const rng = res.req && res.req.headers.range && /bytes=(\d*)-(\d*)/.exec(res.req.headers.range);
      if (rng && (rng[1] !== '' || rng[2] !== '')) {
        if (rng[1] === '') { start = Math.max(0, st.size - parseInt(rng[2], 10)); }
        else { start = parseInt(rng[1], 10); if (rng[2] !== '') end = Math.min(parseInt(rng[2], 10), st.size - 1); }
        if (start >= st.size || start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); res.end(); return; }
        code = 206; h['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
      }
      h['Content-Length'] = end - start + 1;
      res.writeHead(code, h);
      if (res.req && res.req.method === 'HEAD') { res.end(); return; }
      // v2.51: zero-byte guard — createReadStream({start:0,end:-1}) throws
      // synchronously AFTER headers are sent, hanging the response forever
      // (realistic hazard: FUSE partial writes leave 0-byte files on the share).
      if (st.size === 0 || end < start) { res.end(); return; }
      const stream = fs.createReadStream(file, { start: start, end: end });
      stream.pipe(res);
      // v2.51: destroy, don't end. res.end() after Content-Length was promised
      // leaves the client waiting for bytes that never come — the classic
      // Chromium media-pipeline stall. A hard reset lets it retry cleanly.
      stream.on('error', () => { try { res.destroy(); } catch (e) {} });
      // v2.51: reap the read stream when the client goes away. Kiosks abort
      // Range requests constantly while seeking video; without this every abort
      // leaked an fd on the FUSE share → eventual EMFILE → all media breaks.
      res.on('close', () => { try { stream.destroy(); } catch (e) {} });
      res.on('error', () => { try { stream.destroy(); } catch (e) {} });
    });
  }
  function listPhotos(dir) {   // images in an album, including one level of subfolders (v1.11)
    const out = []; let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return null; }
    for (const en of ents) {
      if (en.name[0] === '.') continue;   // skip hidden files + Android '.trashed-*' recycle-bin junk
      if (en.isFile() && IMG_RE.test(en.name)) out.push(en.name);
      else if (en.isDirectory()) { try { fs.readdirSync(path.join(dir, en.name)).filter((f) => f[0] !== '.' && IMG_RE.test(f)).forEach((f) => out.push(en.name + '/' + f)); } catch (e) {} }
    }
    return out.sort();
  }
  function photoSafe(rel) {   // resolve an album-relative path strictly inside PHOTOS_DIR (v1.2; v1.2 symlink-checked — RS-SEC F6)
    return contained(PHOTOS_DIR, rel);
  }

  /* v1.92: media manifest — every servable media/overlay/photo file with its URL
     path + size + mtime, so an edge mirror (deploy/edge) can diff and pre-sync the
     whole library to each mini-PC's local disk. */
  async function buildManifest() {   // v2.62: async fs.promises walk — no longer blocks the event loop (video streams keep flowing)
    const fsp = fs.promises;
    const files = [];
    async function walk(root, urlPrefix, re, rel, depth) {
      let ents = [];
      try { ents = await fsp.readdir(path.join(root, rel), { withFileTypes: true }); } catch (e) { return; }
      for (const en of ents) {
        const r = rel ? rel + '/' + en.name : en.name;
        if (en.isFile()) {
          if (!re.test(en.name)) continue;
          let st; try { st = await fsp.stat(path.join(root, r)); } catch (e) { continue; }
          files.push({ path: urlPrefix + r.split('/').map(encodeURIComponent).join('/'), size: st.size, mtime: Math.round(st.mtimeMs) });
        } else if (en.isDirectory() && depth < 5) { await walk(root, urlPrefix, re, r, depth + 1); }
      }
    }
    await walk(MEDIA_DIR, '/media/', MEDIA_RE, '', 0);
    await walk(OVERLAY_DIR, '/overlays/', OVL_RE, '', 0);
    await walk(PHOTOS_DIR, '/photos/', IMG_RE, '', 0);
    return files;
  }
  // v2.52: cache the manifest. The synchronous recursive walk over the FUSE share
  // blocks the event loop for seconds — while it runs, NO bytes flow on any active
  // video stream (a media-stall trigger). Edge mirrors poll /api/manifest, so the
  // walk used to run repeatedly during live modes. Cache for 5 min; a rescan
  // (upload / Refresh library) invalidates immediately.
  let _manifestCache = null, _manifestAt = 0, _manifestBuilding = null, _manifestGen = 0;
  function manifestDirty() { _manifestCache = null; _manifestGen++; }   // v2.62: gen bump — an in-flight async build can't repopulate a dirtied cache
  function buildManifestCached() {   // v2.62: returns a Promise (async walk); concurrent callers share one build
    const now = Date.now();
    if (_manifestCache && now - _manifestAt < 300000) return Promise.resolve(_manifestCache);
    if (_manifestBuilding) return _manifestBuilding;
    const gen = _manifestGen;
    _manifestBuilding = buildManifest().then(
      (files) => { if (gen === _manifestGen) { _manifestCache = files; _manifestAt = Date.now(); } _manifestBuilding = null; return files; },
      (e) => { _manifestBuilding = null; throw e; }
    );
    return _manifestBuilding;
  }

  return { MIME, serveFile, mediaSafe, themeSafe, photoSafe, listPhotos, buildManifest, manifestDirty, buildManifestCached, thumbOut, genThumb, warmThumbs };
};
