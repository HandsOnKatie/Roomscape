/* fx-audio.js — per-frame Web Audio engine for RoomScape.  v1.0
   ---------------------------------------------------------------------------
   Each Frame TV is one kiosk, and (via PULSE_SINK, xinitrc v1.7) its audio is
   routed to THAT TV's own speaker. So if each frame plays the right sound at the
   right moment, sound has a position in the room and can MOVE across the wall.

   This engine plays two things per frame:
     1. an ambient LOOP bed  (state.audio.bed)      — fills the room with texture
     2. transient ONE-SHOTS targeted at this frame  — whooshes, stings, thunder…
        a "sweep" is just the same one-shot scheduled at staggered times on each
        frame, so the listener hears it travel L1→L2→L3→R1→R2→R3.

   Wiring:  frame.html loads this after engine.js/fx.js, calls IE.audio.init(frameId)
   and IE.audio.apply(state) on every state update. The bus (engine.js) calls
   IE.onAudio(msg) for conductor-pushed  {type:'audio'}  events.

   Autoplay: kiosks launch Chrome with --autoplay-policy=no-user-gesture-required,
   so the AudioContext runs without a click. In a normal dev browser it resumes on
   the first pointer/key event. */
(function () {
  if (!window.IE) window.IE = {};

  var A = {
    ctx: null, master: null, frame: 'L1',
    buffers: {},                       // url -> AudioBuffer  (or in-flight Promise)
    bed: { url: null, src: null, gain: null },
    unlocked: false
  };

  function ctx() {
    if (!A.ctx) {
      try {
        var C = window.AudioContext || window.webkitAudioContext;
        A.ctx = new C();
        A.master = A.ctx.createGain();
        A.master.gain.value = 1;
        A.master.connect(A.ctx.destination);
      } catch (e) { A.ctx = null; }
    }
    return A.ctx;
  }

  function unlock() {
    var c = ctx();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    A.unlocked = true;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    try { window.addEventListener(ev, unlock, { passive: true }); } catch (e) {}
  });

  function load(url) {
    if (!url) return Promise.resolve(null);
    var cached = A.buffers[url];
    if (cached) return cached.then ? cached : Promise.resolve(cached);   // in-flight or ready
    var c = ctx(); if (!c) return Promise.resolve(null);
    var p = fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then(function (ab) { return c.decodeAudioData(ab); })
      .then(function (buf) { A.buffers[url] = buf; return buf; })
      .catch(function () { delete A.buffers[url]; return null; });
    A.buffers[url] = p;
    return p;
  }

  // schedule a one-shot on THIS frame, `at` ms after now, at `gain` (0..1+)
  function playOneShot(url, at, gain) {
    var c = ctx(); if (!c) return;
    unlock();
    load(url).then(function (buffer) {
      if (!buffer) return;
      var when = c.currentTime + Math.max(0, (at || 0) / 1000);
      var g = c.createGain(); g.gain.value = (gain == null ? 1 : gain);
      var s = c.createBufferSource(); s.buffer = buffer; s.loop = false;
      s.connect(g); g.connect(A.master);
      try { s.start(when); } catch (e) { try { s.start(); } catch (_) {} }
    });
  }

  // start / crossfade / stop the ambient loop bed for this frame
  function setBed(url, gain) {
    var c = ctx(); if (!c) return;
    gain = (gain == null ? 0.4 : gain);
    if (A.bed.url === url) { if (A.bed.gain) A.bed.gain.gain.setTargetAtTime(gain, c.currentTime, 0.4); return; }
    if (A.bed.src) {                                   // fade the old bed out, then stop it
      try {
        var og = A.bed.gain, os = A.bed.src;
        og.gain.setTargetAtTime(0, c.currentTime, 0.4);
        setTimeout(function () { try { os.stop(); } catch (e) {} }, 1500);
      } catch (e) {}
    }
    A.bed = { url: url, src: null, gain: null };
    if (!url) return;
    unlock();
    load(url).then(function (buffer) {
      if (!buffer || A.bed.url !== url) return;        // changed again while decoding
      var g = c.createGain(); g.gain.value = 0;
      var s = c.createBufferSource(); s.buffer = buffer; s.loop = true;
      s.connect(g); g.connect(A.master);
      try { s.start(); } catch (e) {}
      g.gain.setTargetAtTime(gain, c.currentTime, 0.6); // fade in
      A.bed.src = s; A.bed.gain = g;
    });
  }

  // ---- continuous playlist: this frame's background (songs / ambient beds) ----
  // plays tracks in sequence or shuffle, looping forever, crossfading on change.
  A.playlist = { key: '', tracks: [], idx: 0, order: 'sequence', gain: 0.5, src: null, gnode: null, on: false };
  function playlistStart(pl) {
    var c = ctx(); if (!c) return;
    var key = pl ? JSON.stringify([pl.tracks, pl.order]) : '';
    if (key && A.playlist.key === key) {               // same list — just adjust gain
      A.playlist.gain = pl.gain != null ? pl.gain : 0.5;
      if (A.playlist.gnode) A.playlist.gnode.gain.setTargetAtTime(A.playlist.gain, c.currentTime, 0.3);
      return;
    }
    playlistStop();
    A.playlist.key = key;
    if (!pl || !pl.tracks || !pl.tracks.length) return;
    A.playlist.tracks = pl.tracks.slice();
    A.playlist.order = pl.order || 'sequence';
    A.playlist.gain = pl.gain != null ? pl.gain : 0.5;
    A.playlist.idx = (A.playlist.order === 'shuffle') ? Math.floor(Math.random() * A.playlist.tracks.length) : 0;
    A.playlist.on = true;
    unlock();
    playlistNext();
  }
  function playlistNext() {
    if (!A.playlist.on || !A.playlist.tracks.length) return;
    var url = A.playlist.tracks[A.playlist.idx % A.playlist.tracks.length];
    load(url).then(function (buffer) {
      if (!A.playlist.on) return;
      if (!buffer) { setTimeout(playlistAdvance, 800); return; }   // skip a bad track
      var c = ctx();
      var g = c.createGain(); g.gain.value = A.playlist.gain;
      var s = c.createBufferSource(); s.buffer = buffer; s.loop = false;
      s.connect(g); g.connect(A.master);
      s.onended = function () { if (A.playlist.on && A.playlist.src === s) playlistAdvance(); };
      try { s.start(); } catch (e) {}
      A.playlist.src = s; A.playlist.gnode = g;
    });
  }
  function playlistAdvance() {
    if (A.playlist.order === 'shuffle') A.playlist.idx = Math.floor(Math.random() * A.playlist.tracks.length);
    else A.playlist.idx = (A.playlist.idx + 1) % A.playlist.tracks.length;
    playlistNext();
  }
  function playlistStop() {
    A.playlist.on = false;
    if (A.playlist.src) {
      try {
        var c = ctx(), og = A.playlist.gnode, os = A.playlist.src;
        if (og) og.gain.setTargetAtTime(0, c.currentTime, 0.4);
        setTimeout(function () { try { os.stop(); } catch (e) {} }, 1200);
      } catch (e) {}
    }
    A.playlist.src = null; A.playlist.gnode = null; A.playlist.key = '';
  }

  /* ---- public API ---- */

  // called from frame.html on every state update
  A.apply = function (state) {
    if (!state) return;
    var au = state.audio || null;
    // master volume (0..100) — one control for every TV; a mode can set its own.
    if (au && au.volume != null) {
      var c = ctx();
      if (c && A.master) A.master.gain.setTargetAtTime(Math.max(0, Math.min(1.5, au.volume / 100)), c.currentTime, 0.2);
    }
    // continuous background — a playlist (or a single 'bed', kept for back-compat)
    var pl = null;
    if (au && au.playlist && au.playlist.tracks && au.playlist.tracks.length) pl = au.playlist;
    else if (au && au.bed) pl = { tracks: [au.bed], order: 'sequence', gain: au.bedGain, frames: au.bedFrames };
    if (pl && pl.frames && pl.frames.length && pl.frames.indexOf(A.frame) < 0) pl = null;  // not one of this playlist's TVs
    playlistStart(pl);
  };

  // conductor-pushed transient event: { type:'audio', action, sound, hits:[{f,at,gain}], gain }
  IE.onAudio = function (d) {
    if (!d) return;
    if (d.action === 'stopbed') { setBed(null, 0); playlistStop(); return; }
    if (d.action !== 'play' || !d.sound) return;
    var base = (d.gain != null) ? d.gain : 1;
    if (d.hits && d.hits.length) {                     // list of hits — a frame may appear >1x (bounce/orbit)
      for (var i = 0; i < d.hits.length; i++) {
        var h = d.hits[i];
        if (h && h.f === A.frame) playOneShot(d.sound, h.at || 0, h.gain != null ? h.gain : base);
      }
    } else if (d.targets && d.targets[A.frame]) {      // back-compat: { frame:{at,gain} }
      var t = d.targets[A.frame];
      playOneShot(d.sound, t.at || 0, t.gain != null ? t.gain : base);
    }
  };

  // identify: flash THIS TV's corner frame-id, and optionally play a routed sound,
  // so you can walk the wall and confirm which physical TV is which frame.
  IE.onIdentify = function (sound) {
    try {
      var idEl = document.querySelector('[data-ieid]');
      if (idEl) {
        idEl.style.display = 'block';
        idEl.style.transition = 'opacity .35s';
        idEl.style.opacity = '1';
        clearTimeout(IE.onIdentify._t);
        IE.onIdentify._t = setTimeout(function () { idEl.style.opacity = '0'; }, 2800);
      }
    } catch (e) {}
    if (sound) playOneShot(sound, 0, 1);
  };

  A.init = function (frameId) { A.frame = (frameId || 'L1').toUpperCase(); ctx(); };
  A.playOneShot = playOneShot;      // exposed for local testing
  IE.audio = A;
})();
