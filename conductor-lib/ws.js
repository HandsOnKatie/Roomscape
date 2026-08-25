/* ===================================================================
   conductor-lib/ws.js  v1.2
   v1.2 (v1.05, I1+I2): the receive loop grew three teeth it was missing.
     - client.frag had no cumulative cap. WS_MAX_BUF capped the receive buffer
       and the DECLARED frame length, but a frame that parsed was spliced out of
       buf and appended to frag, so a tokenless client sending just-under-4MB
       frames with FIN=0 and never finishing could allocate without limit.
     - continuation frames were not policed: a text frame mid-fragment, or a
       continuation with nothing to continue, were both accepted.
     - unmasked client frames were accepted although RFC 6455 5.1 requires a
       client to mask. Now refused.
     Plus WS_MAX_CLIENTS (64) refuses new upgrades past a sane ceiling.
   v1.1 (RS-SEC v1.01, F2): the upgrade handshake gained two checks.
     1. ORIGIN. Browsers ALWAYS send Origin on a WebSocket handshake; native
        clients and kiosk shells may omit it. So: absent Origin -> allowed
        (kiosks, curl, the smoke test); present Origin whose host differs from
        the request Host -> 403, connection refused and logged. Without this
        any web page the household visits could open a socket to the conductor
        on the LAN and talk to it.
     2. MUTATION RIGHTS. A socket is a read-only consumer unless the handshake
        URL carries ?token=<admin token>. client.canMutate records the answer;
        conductor.js's handleClientMessage refuses inbound {type:'state'} on a
        socket without it. (Frames only ever send hello/ping, so they stay
        tokenless; the app's volume slider + FX picker DO publish state and
        must therefore connect with ?token=.)
   Extracted verbatim from conductor.js v2.62 (RoomScape Conductor v3.62 split).
   Minimal WebSocket layer: handshake, frame codec, upgrade + receive loop.
   SAFETY RULES (absolute):
   1. NEVER require npm packages here — node builtins (crypto) ONLY. This file
      lives on the share; the share's Windows-only node_modules must not shadow
      the container's Linux ones.
   2. Functions that appended patch blocks REASSIGN stay in conductor.js —
      broadcastState (reveal-reel wrap) and handleClientMessage live in core.
      handleClientMessage is invoked through ctx AT CALL TIME so later patches
      to core still apply. state is read via ctx.state() at call time (core
      reassigns it on client pushes).
   ctx surface: value WS_GUID; stable reference clients (the Set itself — the
   harden block heartbeats the SAME Set); getter state(); callback
   handleClientMessage(client, text). No ctx accessor is called at
   construction time.
   =================================================================== */
'use strict';
const crypto = require('crypto');

module.exports = function (ctx) {
  const clients = ctx.clients;

  function wsAccept(key) { return crypto.createHash('sha1').update(key + ctx.WS_GUID).digest('base64'); }
  function encodeFrame(data, opcode) {
    opcode = opcode || 0x1;
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8'); const len = payload.length; let header;
    if (len < 126) header = Buffer.from([0x80 | opcode, len]);
    else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[0] = 0x80 | opcode; header[1] = 127; header.writeUInt32BE(0, 2); header.writeUInt32BE(len, 6); }
    return Buffer.concat([header, payload]);
  }
  function wsSend(sock, obj) { try { sock.write(encodeFrame(JSON.stringify(obj))); } catch (e) {} }

  /* RS-SEC v1.01 (F2b): same-origin check. Absent Origin = a non-browser client
     (kiosk shell, curl, the smoke test) -> allowed. Present Origin = a browser
     -> its host must equal the Host we were asked for. */
  function originOk(req) {
    const o = req.headers && req.headers.origin;
    if (!o) return true;                                   // no Origin header — not a browser
    if (o === 'null') return true;                         // file:// dev pages (wall-test) have origin 'null'
    let oh; try { oh = new URL(o).host; } catch (e) { return false; }
    const host = String((req.headers && req.headers.host) || '');
    return !!host && oh === host;
  }
  function upgradeToken(req) {
    try { return String(new URL(req.url || '/', 'http://x').searchParams.get('token') || '').trim(); }
    catch (e) { return ''; }
  }

  function handleUpgrade(req, sock) {
    const key = req.headers['sec-websocket-key']; if (!key) { sock.destroy(); return; }
    if (!originOk(req)) {                                  // RS-SEC v1.01 (F2b)
      console.log('[ws] REJECTED upgrade: cross-origin handshake (Origin ' + JSON.stringify(req.headers.origin) + ' != Host ' + JSON.stringify(req.headers.host) + ')');
      try { sock.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); } catch (e) {}
      try { sock.destroy(); } catch (e) {}
      return;
    }
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + wsAccept(key) + '\r\n\r\n');
    /* RS-SEC v1.01 (F2a): mutation rights are decided ONCE, at handshake time. */
    const tok = upgradeToken(req);
    const admin = (typeof ctx.adminToken === 'function') ? String(ctx.adminToken() || '') : '';
    const canMutate = (typeof ctx.authDisabled === 'function' && ctx.authDisabled())
      || (!!admin && !!tok && tok.length === admin.length && crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(admin)));
    /* v1.05 (I2): cap concurrent sockets. A real room has one consumer per frame
       plus the app — single digits. An unauthenticated client opening thousands
       would otherwise get a full JSON.stringify(state) each on every bump() and
       on the 2s clock tick, with only the 45s heartbeat reaper to stop it — and
       a socket that keeps reading never trips that. Refuse politely instead. */
    if (clients.size >= WS_MAX_CLIENTS) {
      console.log('[ws] REJECTED upgrade: ' + clients.size + ' clients already connected (cap ' + WS_MAX_CLIENTS + ')');
      try { sock.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); } catch (e) {}
      try { sock.destroy(); } catch (e) {}
      return;
    }
    const client = { sock, buf: Buffer.alloc(0), frag: [], fragLen: 0, fragOpen: false, canMutate: canMutate }; clients.add(client);
    wsSend(sock, { ie: true, type: 'state', state: ctx.state(), t: Date.now() });
    sock.on('data', (c) => onWsData(client, c));
    sock.on('close', () => clients.delete(client));
    sock.on('error', () => { clients.delete(client); try { sock.destroy(); } catch (e) {} });
  }
  const WS_MAX_BUF = 4 * 1024 * 1024;   // v2.52: cap per-client receive buffer / declared frame length
  const WS_MAX_CLIENTS = 64;            // v1.05 (I2): concurrent sockets — far above the ~7 a real room uses

  /* v1.05 (I1): one place to hang up on a misbehaving client.
     Send a proper close frame (1009 "message too big") and end() before
     destroy(): a bare destroy() can leave a peer that is not writing unaware it
     has been disconnected until its own timeout, which makes the hang-up look
     like a hang. Then destroy on a short unref'd timer so a peer that ignores
     the close still goes away. */
  function dropClient(client, why) {
    console.log('[ws] dropping client' + (client.frame ? ' ' + client.frame : '') + ': ' + why);
    clients.delete(client);
    try {
      var reason = Buffer.from(String(why).slice(0, 120), 'utf8');
      var body = Buffer.alloc(2 + reason.length);
      body.writeUInt16BE(1009, 0);                     // 1009 = message too big
      reason.copy(body, 2);
      client.sock.write(encodeFrame(body, 0x8));
    } catch (e) {}
    try { client.sock.end(); } catch (e) {}
    try {
      var t = setTimeout(function () { try { client.sock.destroy(); } catch (e) {} }, 250);
      if (t.unref) t.unref();
    } catch (e) { try { client.sock.destroy(); } catch (e2) {} }
  }

  function onWsData(client, chunk) {
    client.awaitingPong = 0;   // v2.52: ANY inbound traffic (incl. pongs) proves the client is alive
    client.buf = Buffer.concat([client.buf, chunk]); let buf = client.buf;
    if (buf.length > WS_MAX_BUF) {   // v2.52: a corrupt/malicious frame can't grow memory unbounded
      return dropClient(client, 'receive buffer over cap');
    }
    while (buf.length >= 2) {
      const b0 = buf[0], b1 = buf[1], fin = (b0 & 0x80) !== 0, opcode = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, offset = 2;
      if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); offset = 4; }
      else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); offset = 10; }
      if (len > WS_MAX_BUF) { client.buf = buf; return dropClient(client, 'oversized frame declared'); }   // v2.52
      /* v1.05 (I1): RFC 6455 §5.1 — a client MUST mask. An unmasked client frame
         is either a broken implementation or someone hand-rolling an attack; we
         used to read the bit and then accept either way. */
      if (!masked) { client.buf = buf; return dropClient(client, 'unmasked client frame (RFC 6455 requires masking)'); }
      let mask; if (buf.length < offset + 4) break; mask = buf.slice(offset, offset + 4); offset += 4;
      if (buf.length < offset + len) break;
      let payload = buf.slice(offset, offset + len);
      { const o = Buffer.alloc(len); for (let i = 0; i < len; i++) o[i] = payload[i] ^ mask[i & 3]; payload = o; }
      buf = buf.slice(offset + len);
      if (opcode === 0x8) { try { client.sock.write(encodeFrame(payload, 0x8)); } catch (e) {} try { client.sock.end(); } catch (e) {} clients.delete(client); return; }
      else if (opcode === 0x9) { try { client.sock.write(encodeFrame(payload, 0xA)); } catch (e) {} }
      else if (opcode === 0x1 || opcode === 0x0) {
        /* v1.05 (I1): the fragment accumulator was the hole. WS_MAX_BUF bounds the
           receive buffer and the DECLARED frame length, but once a frame parsed it
           was spliced out of buf and pushed onto client.frag, which had no cap at
           all. A tokenless client (upgrades are deliberately open so kiosk frames
           work, and a non-browser sends no Origin) could send frames of just under
           4 MB with FIN=0 forever: each one passed every check, emptied buf, and
           accumulated. ~1000 frames = ~4 GB resident and an OOM kill. Cap the
           running total, and police the continuation state machine while here. */
        if (opcode === 0x1 && client.fragOpen) { client.buf = buf; return dropClient(client, 'new text frame arrived mid-fragment'); }
        if (opcode === 0x0 && !client.fragOpen) { client.buf = buf; return dropClient(client, 'continuation frame with nothing to continue'); }
        client.fragOpen = !fin;   // a zero-length first fragment is legal, so track state, not byte count
        client.fragLen += payload.length;
        if (client.fragLen > WS_MAX_BUF) { client.buf = buf; return dropClient(client, 'fragmented message over cap'); }
        client.frag.push(payload);
        if (fin) {
          const full = Buffer.concat(client.frag).toString('utf8');
          client.frag = []; client.fragLen = 0;
          ctx.handleClientMessage(client, full);
        }
      }
    }
    client.buf = buf;
  }

  return { wsAccept, encodeFrame, wsSend, handleUpgrade, onWsData, WS_MAX_BUF, WS_MAX_CLIENTS };
};
