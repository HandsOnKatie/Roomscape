/* ===================================================================
   conductor-lib/zip.js  v1.0  (RS-THEME-ZIP, community v0.32)
   Minimal ZIP reader/writer for theme-pack export/import.
   PURE module: no ctx, no fs, node builtins (zlib) ONLY — the zero-npm-deps
   rule is absolute here. Operates on Buffers; callers own every path /
   containment decision beyond the per-entry name hygiene below.
   API:
     writeZip(entries) -> Buffer
       entries: [{name, data:Buffer|string}]. Every entry is deflated
       (method 8), names are UTF-8 (general-purpose flag bit 11 set),
       local headers + central directory + EOCD per APPNOTE.TXT.
     readZip(buf) -> [{name, data:Buffer}]
       EOCD scan from the end (up to 64K comment) -> central directory ->
       local headers. Supports method 0 (store) and 8 (deflate).
       REJECTS (throws Error with a specific message):
         - encrypted entries (flag bit 0)
         - zip64 (0xFFFF/0xFFFFFFFF sentinels in EOCD or any entry)
         - unsafe names: absolute paths, drive letters, '.'/'..'/empty
           segments (backslashes are normalized to '/' BEFORE the check)
         - > 500 entries, > 200 MB total uncompressed (zlib maxOutputLength
           also bounds each inflate — zip-bomb guard)
         - CRC32 or size mismatches, truncated/garbled structures
       Directory entries (trailing '/') are skipped, not returned.
     crc32(buf) -> uint32 (standard reflected IEEE table)
   =================================================================== */
'use strict';
const zlib = require('zlib');

const MAX_ENTRIES = 500;
const MAX_TOTAL = 200 * 1024 * 1024;   // uncompressed bytes across the archive

/* ---------- CRC32: standard reflected table (poly 0xEDB88320) ---------- */
const CRC_TABLE = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(d) {
  d = d || new Date();
  const yr = Math.max(1980, d.getFullYear());
  return {
    time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() >> 1) & 31),
    date: (((yr - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31)
  };
}

/* ---------- writer ---------- */
function writeZip(entries) {
  const dt = dosDateTime();
  const parts = [], centrals = [];
  let offset = 0;
  for (const en of entries) {
    const name = Buffer.from(String(en.name), 'utf8');
    const data = Buffer.isBuffer(en.data) ? en.data : Buffer.from(en.data == null ? '' : en.data);
    const crc = crc32(data);
    const comp = zlib.deflateRawSync(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);   // local file header signature
    lh.writeUInt16LE(20, 4);           // version needed (2.0 = deflate)
    lh.writeUInt16LE(0x0800, 6);       // flags: bit 11 = UTF-8 names
    lh.writeUInt16LE(8, 8);            // method: deflate
    lh.writeUInt16LE(dt.time, 10); lh.writeUInt16LE(dt.date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18); // compressed size
    lh.writeUInt32LE(data.length, 22); // uncompressed size
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);           // extra field length
    parts.push(lh, name, comp);
    const ch = Buffer.alloc(46);       // central directory record (tail fields stay 0)
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);           // version made by
    ch.writeUInt16LE(20, 6);           // version needed
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(dt.time, 12); ch.writeUInt16LE(dt.date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);      // relative offset of local header
    centrals.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);   // end of central directory signature
  eocd.writeUInt16LE(entries.length, 8);   // entries on this disk
  eocd.writeUInt16LE(entries.length, 10);  // entries total
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);      // central directory offset
  return Buffer.concat(parts.concat([cd, eocd]));
}

/* ---------- reader ---------- */
function readZip(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) throw new Error('not a zip (too short)');
  // EOCD: scan backwards — the record may be followed by up to a 64K comment
  let eo = -1;
  const floor = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= floor; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eo = i; break; }
  }
  if (eo < 0) throw new Error('not a zip (no end-of-central-directory record)');
  const count = buf.readUInt16LE(eo + 10);
  const cdSize = buf.readUInt32LE(eo + 12);
  const cdOff = buf.readUInt32LE(eo + 16);
  if (count === 0xFFFF || cdSize === 0xFFFFFFFF || cdOff === 0xFFFFFFFF)
    throw new Error('zip64 archives are not supported');
  if (count > MAX_ENTRIES) throw new Error('too many entries (' + count + ' > ' + MAX_ENTRIES + ')');
  if (cdOff + cdSize > buf.length) throw new Error('central directory out of bounds');

  const out = [];
  let p = cdOff, total = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory record');
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const lhOff = buf.readUInt32LE(p + 42);
    const rawName = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (flags & 0x0001) throw new Error('encrypted entry: ' + rawName);
    if (csize === 0xFFFFFFFF || usize === 0xFFFFFFFF || lhOff === 0xFFFFFFFF)
      throw new Error('zip64 entry not supported: ' + rawName);

    const name = rawName.replace(/\\/g, '/');           // normalize backslashes, then vet
    const isDir = name.charAt(name.length - 1) === '/';
    const segs = (isDir ? name.slice(0, -1) : name).split('/');
    if (!name || name.charAt(0) === '/' || /^[A-Za-z]:/.test(name)
        || segs.some(function (s) { return s === '' || s === '.' || s === '..'; }))
      throw new Error('unsafe entry path: ' + JSON.stringify(rawName));
    if (isDir) continue;                                // directory marker — no data

    total += usize;
    if (total > MAX_TOTAL) throw new Error('total uncompressed size exceeds ' + (MAX_TOTAL / 1024 / 1024) + ' MB');

    // local header: its name/extra lengths can differ from the central copy — use them for the data offset
    if (lhOff + 30 > buf.length || buf.readUInt32LE(lhOff) !== 0x04034b50) throw new Error('bad local header: ' + name);
    const dataOff = lhOff + 30 + buf.readUInt16LE(lhOff + 26) + buf.readUInt16LE(lhOff + 28);
    if (dataOff + csize > buf.length) throw new Error('truncated entry: ' + name);
    const comp = buf.subarray(dataOff, dataOff + csize);
    let data;
    if (method === 0) data = Buffer.from(comp);
    else if (method === 8) {
      try { data = zlib.inflateRawSync(comp, { maxOutputLength: MAX_TOTAL }); }
      catch (e) { throw new Error('inflate failed for ' + name + ': ' + (e && e.message)); }
    } else throw new Error('unsupported compression method ' + method + ': ' + name);
    if (data.length !== usize) throw new Error('size mismatch for ' + name + ' (' + data.length + ' != ' + usize + ')');
    if (crc32(data) !== crc) throw new Error('CRC mismatch for ' + name);
    out.push({ name: name, data: data });
  }
  return out;
}

module.exports = { writeZip, readZip, crc32 };
