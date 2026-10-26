#!/usr/bin/env node
/**
 * Generates the extension icons (public/icons/icon{16,48,128}.png).
 *
 * The manifest references these files but none were ever committed, which
 * by itself makes the extension unloadable. The design is deliberately
 * simple and drawn programmatically (no binary assets to license or lose):
 * a sage-green rounded square with a white magnifier — Scout's lens.
 *
 * PNG encoding is done by hand (zlib deflate + CRC32) so the script has
 * no dependencies. Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// --- CRC32 ---------------------------------------------------------------
const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, pixels) {
  // pixels: Uint8Array of RGBA, row-major
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// --- Drawing ---------------------------------------------------------------
const SAGE = [76, 140, 74, 255];      // deep sage green
const SAGE_LIGHT = [129, 199, 132, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const set = (x, y, [r, g, b, a]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };

  const radius = size * 0.22;
  const cx = size * 0.44, cy = size * 0.44;      // lens center
  const lensR = size * 0.26;                     // lens radius
  const ringW = Math.max(1.5, size * 0.055);     // lens ring thickness
  // handle: from lens edge toward bottom-right
  const hx = cx + lensR * 0.72, hy = cy + lensR * 0.72;
  const handleLen = size * 0.30;
  const handleW = ringW * 0.95;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // rounded-square background
      const dx = Math.max(Math.abs(x - size / 2) - (size / 2 - radius), 0);
      const dy = Math.max(Math.abs(y - size / 2) - (size / 2 - radius), 0);
      if (Math.hypot(dx, dy) > radius) { set(x, y, CLEAR); continue; }
      // subtle vertical gradient
      const t = y / size;
      const base = SAGE.map((c, i) => Math.round(c + (SAGE_LIGHT[i] - c) * t * 0.45));
      set(x, y, [base[0], base[1], base[2], 255]);

      // lens ring
      const dist = Math.hypot(x - cx, y - cy);
      if (Math.abs(dist - lensR) <= ringW / 2) set(x, y, WHITE);
      // lens glass tint
      if (dist < lensR - ringW / 2) set(x, y, [255, 255, 255, 70]);

      // handle (thick line segment)
      const tSeg = ((x - hx) + (y - hy)) / 2;
      const perp = Math.abs((x - hx) - (y - hy)) / 2;
      if (tSeg >= 0 && tSeg <= handleLen && perp <= handleW / 2) set(x, y, WHITE);
    }
  }
  return encodePNG(size, px);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, drawIcon(size));
  console.log(`wrote ${file}`);
}
