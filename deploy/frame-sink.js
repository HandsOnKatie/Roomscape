#!/usr/bin/env node
/* frame-sink.js — resolve a frame id (e.g. "L1") to the PipeWire/Pulse SINK NAME
   for that TV's HDMI port, so its kiosk can be launched with PULSE_SINK=<name>
   and the sound comes out of that TV.

   Join:  frame --(settings.audioMap)--> "card,dev" --(pactl alsa.card/device)--> sink name

   Usage:  node frame-sink.js <FRAME> [server]     (server default http://localhost:8090)
   Prints the sink name (+newline), or nothing (kiosk then uses the default sink).
   Never throws; exits 0 either way. Tested: L1->hw:0,9 sink, unmapped->default. */
const http = require('http');
const { execFileSync } = require('child_process');

const frame = process.argv[2];
const server = (process.argv[3] || 'http://localhost:8090').replace(/\/+$/, '');

function getJSON(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (r) => {
      let d = '';
      r.on('data', (c) => { d += c; });
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

(async () => {
  let result = '';
  if (frame) {
    const prof = await getJSON(server + '/api/profiles');
    const map = prof && prof.settings && prof.settings.audioMap;
    if (map) {
      // find the "card,dev" whose mapped frame === ours (search every PC's entries)
      let cd = null;
      for (const pc of Object.keys(map)) {
        const ports = map[pc] || {};
        for (const key of Object.keys(ports)) { if (ports[key] === frame) { cd = key; break; } }
        if (cd) break;
      }
      if (cd) {
        const parts = cd.split(',');
        const card = String(parts[0]).trim(), dev = String(parts[1]).trim();
        let out = '';
        try { out = execFileSync('pactl', ['list', 'sinks'], { encoding: 'utf8', timeout: 5000 }); } catch (e) { out = ''; }
        const blocks = out.split(/\nSink #/);
        for (const b of blocks) {
          const nameM = b.match(/(?:^|\n)\s*Name:\s*(.+)/);
          const cardM = b.match(/alsa\.card\s*=\s*"(\d+)"/) || b.match(/api\.alsa\.pcm\.card\s*=\s*"(\d+)"/);
          const devM  = b.match(/alsa\.device\s*=\s*"(\d+)"/) || b.match(/api\.alsa\.pcm\.device\s*=\s*"(\d+)"/);
          if (nameM && cardM && devM && cardM[1] === card && devM[1] === dev) { result = nameM[1].trim(); break; }
        }
      }
    }
  }
  if (result) process.stdout.write(result + '\n');   // let the event loop flush + exit naturally
})();
