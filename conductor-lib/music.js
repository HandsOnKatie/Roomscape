/* ===================================================================
   conductor-lib/music.js  v1.0
   Extracted verbatim from conductor.js v2.62 (RoomScape Conductor v3.62 split).
   Music Assistant transport layer: maCall (hand-rolled masked-frame WS client,
   one connection per command) + maItems / maImage helpers.
   musicHold / musicNow / musicOff / musicPollNow stay in conductor.js — they
   reassign core state that bump()/resolveOverlays and many patch blocks read.
   SAFETY RULES (absolute):
   1. NEVER require npm packages here — node builtins (http/crypto) ONLY. This
      file lives on the share; the share's Windows-only node_modules must not
      shadow the container's Linux ones.
   2. Functions that appended patch blocks REASSIGN stay in conductor.js.
   ctx surface: getter settings() (read at call time — core reassigns settings
   on /api/profiles saves). No ctx accessor is called at construction time.
   =================================================================== */
'use strict';
const http = require('http'), crypto = require('crypto');

module.exports = function (ctx) {

  function maCall(command, args, cb) {
    let done = false, sock = null;
    const fin = (e, r) => { if (done) return; done = true; try { if (sock) sock.destroy(); } catch (x) {} cb(e, r); };
    const base = (process.env.MA_URL || (ctx.settings().music || {}).url || '').replace(/\/+$/, '');
    if (!base) return cb(new Error('Music Assistant URL not set'));
    let u; try { u = new URL(base); } catch (e) { return cb(e); }
    const key = crypto.randomBytes(16).toString('base64');
    const req = http.request({ host: u.hostname, port: u.port || 8095, path: '/ws', timeout: 6000,
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': 13, 'Sec-WebSocket-Key': key } });
    req.on('upgrade', (res2, socket) => {
      sock = socket;
      let buf = Buffer.alloc(0), sent = false, authSent = false;
      const msgId = 'ie' + Math.floor(Math.random() * 1e9);
      const authId = 'auth' + Math.floor(Math.random() * 1e9);
      function wsSendObj(obj) {
        const payload = Buffer.from(JSON.stringify(obj), 'utf8');
        const mask = crypto.randomBytes(4); const len = payload.length; let header;
        if (len < 126) header = Buffer.from([0x81, 0x80 | len]);
        else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
        else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 0x80 | 127; header.writeUInt32BE(0, 2); header.writeUInt32BE(len, 6); }
        const masked = Buffer.alloc(len);
        for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i & 3];
        try { sock.write(Buffer.concat([header, mask, masked])); } catch (e) { fin(e); }
      }
      function greetingSeen() {                             // auth first when a token is set (MA 2.5+)
        const tok = process.env.MA_TOKEN || (ctx.settings().music || {}).token || '';
        if (tok && !authSent) { authSent = true; wsSendObj({ message_id: authId, command: 'auth', args: { token: tok } }); return; }
        sendCmd();
      }
      function sendCmd() {
        if (sent) return; sent = true;
        wsSendObj({ message_id: msgId, command: command, args: args || {} });
      }
      sock.on('data', (c) => {
        buf = Buffer.concat([buf, c]);
        while (buf.length >= 2) {
          const b1 = buf[1]; let len = b1 & 0x7f, off = 2;
          if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
          else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
          if (b1 & 0x80) off += 4;                                    // (servers don't mask, but be safe)
          if (buf.length < off + len) return;
          const opcode = buf[0] & 0x0f;
          const payload = buf.slice(off, off + len);
          buf = buf.slice(off + len);
          if (opcode === 0x8) return fin(new Error('Music Assistant closed the connection'));
          if (opcode !== 0x1) continue;
          let m; try { m = JSON.parse(payload.toString('utf8')); } catch (e) { continue; }
          if (m.server_version !== undefined || m.server_id !== undefined) { greetingSeen(); continue; }   // ServerInfo greeting → go
          if (m.message_id === authId) {
            if (m.error_code !== undefined || m.error !== undefined) return fin(new Error('Music Assistant rejected the token' + (m.details ? ': ' + m.details : '')));
            sendCmd(); continue;
          }
          if (m.message_id === msgId) {
            if (m.error_code !== undefined || m.error !== undefined) return fin(new Error(String(m.error_code || m.error) + (m.details ? ': ' + m.details : '')));
            return fin(null, m.result !== undefined ? m.result : null);
          }
          /* anything else = event broadcast — ignore */
        }
      });
      sock.on('error', fin);
      sock.on('end', () => fin(new Error('Music Assistant connection ended')));
      setTimeout(greetingSeen, 800);                                  // fallback if no greeting arrives
      setTimeout(() => fin(new Error('Music Assistant timed out')), 9000);
    });
    req.on('error', (e) => fin(new Error('Music Assistant unreachable: ' + e.message)));
    req.on('timeout', () => { try { req.destroy(); } catch (x) {} fin(new Error('Music Assistant unreachable (timeout)')); });
    req.end();
  }
  function maItems(r) { return Array.isArray(r) ? r : ((r && r.items) || []); }
  function maImage(md) {
    try {
      const img = md.metadata && md.metadata.images && md.metadata.images[0];
      if (!img || !img.path) return null;
      if (/^https?:\/\//.test(img.path)) return img.path;
      const base = (process.env.MA_URL || (ctx.settings().music || {}).url || '').replace(/\/+$/, '');
      return base ? (base + '/imageproxy?path=' + encodeURIComponent(img.path) + '&provider=' + encodeURIComponent(img.provider || 'builtin') + '&size=256') : null;
    } catch (e) { return null; }
  }

  return { maCall, maItems, maImage };
};
