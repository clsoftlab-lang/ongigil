// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 CLSOFTLAB (씨엘소프트랩), Dr. Lee Il-guk (이일국)
//
// generate-icons.js — dependency-free PNG icon generator (uses only Node's
// built-in `zlib`). Draws the same emblem as icon.svg (warm square + green
// upward arrow + sound waves) and writes icon-192.png and icon-512.png.
//
//   node icons/generate-icons.js

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- minimal PNG encoder ----------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  // filtered scanlines (filter byte 0 per row)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- draw the emblem --------------------------------------------------------

function px(rgba, w, x, y, [r, g, b, a]) {
  const i = (y * w + x) * 4;
  rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
}

function pointInTri(px_, py_, ax, ay, bx, by, cx, cy) {
  const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  const s = ((px_ - ax) * (cy - ay) - (cx - ax) * (py_ - ay)) / d;
  const t = ((bx - ax) * (py_ - ay) - (px_ - ax) * (by - ay)) / d;
  return s >= 0 && t >= 0 && s + t <= 1;
}

function draw(size) {
  const w = size;
  const rgba = Buffer.alloc(w * w * 4);
  const WARM = [122, 74, 18, 255];
  const GREEN = [87, 199, 120, 255];
  const N = (v) => Math.round(v * size);
  // arrow head triangle (normalized coords match icon.svg)
  const ax = N(256 / 512), ay = N(104 / 512);
  const bx = N(140 / 512), by = N(248 / 512);
  const cx = N(372 / 512), cy = N(248 / 512);
  // arrow stem rect (union of svg stem+shoulders, simplified)
  const sx0 = N(212 / 512), sx1 = N(300 / 512), sy0 = N(248 / 512), sy1 = N(420 / 512);

  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      let c = WARM;
      if (pointInTri(x, y, ax, ay, bx, by, cx, cy)) c = GREEN;
      else if (x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1) c = GREEN;
      px(rgba, w, x, y, c);
    }
  }
  return encodePng(w, w, rgba);
}

for (const size of [192, 512]) {
  const buf = draw(size);
  const out = join(HERE, `icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`wrote ${out} (${buf.length} bytes)`);
}
