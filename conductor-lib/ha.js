/* ===================================================================
   conductor-lib/ha.js  v1.0
   Extracted verbatim from conductor.js v2.62 (RoomScape Conductor v3.62 split).
   Home Assistant bridge HELPER layer only: haOn / haCfg / haFetch / haCall.
   The /api/ha/* route handlers stay woven into coreHandler in conductor.js;
   haApplyRoom stays in core (it is REASSIGNED by the rooms2.5 TV-wake patch).
   SAFETY RULES (absolute):
   1. NEVER require npm packages here — node builtins (http/https) ONLY. This
      file lives on the share; the share's Windows-only node_modules must not
      shadow the container's Linux ones.
   2. Functions that appended patch blocks REASSIGN stay in conductor.js.
   ctx surface: values HA_URL, HA_TOKEN, DEFAULT_SETTINGS; getter settings()
   (read at call time — core reassigns settings on /api/profiles saves).
   No ctx accessor is called at construction time.
   =================================================================== */
'use strict';
const http = require('http');

module.exports = function (ctx) {
  const HA_URL = ctx.HA_URL, HA_TOKEN = ctx.HA_TOKEN, DEFAULT_SETTINGS = ctx.DEFAULT_SETTINGS;

  function haOn() { return !!(HA_URL && HA_TOKEN); }
  function haCfg() { const h = ctx.settings().ha || {}; return { tvs: h.tvs || {}, lights: h.lights || [], zones: h.lightZones || DEFAULT_SETTINGS.ha.lightZones, lightScenes: Object.assign({}, DEFAULT_SETTINGS.ha.lightScenes, h.lightScenes || {}) }; }

  function haFetch(method, apiPath, body, cb) {
    cb = cb || function () {};
    if (!haOn()) return cb(new Error('HA not configured (set HA_URL and HA_TOKEN)'));
    let req2;
    try {
      const url = new URL(HA_URL + apiPath);
      const lib = url.protocol === 'https:' ? require('https') : http;
      req2 = lib.request(url, { method, headers: { Authorization: 'Bearer ' + HA_TOKEN, 'Content-Type': 'application/json' }, timeout: 8000 }, (r) => {
        let s = ''; r.on('data', (c) => { s += c; }); r.on('end', () => { let j = null; try { j = JSON.parse(s || 'null'); } catch (e) {} cb(null, r.statusCode, j); });
      });
    } catch (e) { return cb(e); }
    req2.on('error', (e) => cb(e));
    req2.on('timeout', () => { req2.destroy(new Error('HA timeout')); });
    if (body) req2.write(JSON.stringify(body));
    req2.end();
  }
  function haCall(domain, service, data, cb) { haFetch('POST', '/api/services/' + domain + '/' + service, data || {}, cb); }

  return { haOn, haCfg, haFetch, haCall };
};
