// Génère "app-icon.png" (1024x1024) sans dépendance externe.
// Sert de source à `tauri icon` qui produit tous les formats requis
// (png multi-tailles, .ico, .icns).  Lancer via : npm run icons
import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

const S = 1024;
const stride = 1 + S * 4; // 1 octet de filtre + RGBA par ligne
const buf = Buffer.alloc(S * stride); // zéros = transparent + filtre "none"

const put = (x, y, r, g, b, a) => {
  const o = y * stride + 1 + x * 4;
  buf[o] = r;
  buf[o + 1] = g;
  buf[o + 2] = b;
  buf[o + 3] = a;
};

const cx = S / 2;
const cy = S / 2;
const margin = 44;
const corner = 220;

const distToSegment = (px, py, ax, ay, bx, by) => {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
};

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    // Masque "rounded rect"
    const rx = Math.min(x - margin, S - margin - x);
    const ry = Math.min(y - margin, S - margin - y);
    if (rx < 0 || ry < 0) continue;
    if (rx < corner && ry < corner) {
      const dx = corner - rx;
      const dy = corner - ry;
      if (dx * dx + dy * dy > corner * corner) continue;
    }

    // Fond dégradé indigo (vertical)
    const t = y / S;
    let r = Math.round(99 - t * 22);
    let g = Math.round(90 - t * 24);
    let b = Math.round(240 - t * 34);

    const d = Math.hypot(x - cx, y - cy);

    // Anneau (cadran d'horloge)
    if (Math.abs(d - 300) < 26) {
      r = g = b = 255;
    }

    // Aiguilles + moyeu
    const hourTip = [cx + Math.cos(-Math.PI / 2 - 0.5) * 150, cy + Math.sin(-Math.PI / 2 - 0.5) * 150];
    const minTip = [cx + Math.cos(-Math.PI / 6) * 232, cy + Math.sin(-Math.PI / 6) * 232];
    if (
      distToSegment(x, y, cx, cy, hourTip[0], hourTip[1]) < 22 ||
      distToSegment(x, y, cx, cy, minTip[0], minTip[1]) < 18 ||
      d < 34
    ) {
      r = g = b = 255;
    }

    put(x, y, r, g, b, 255);
  }
}

// --- Encodage PNG (RGBA, 8 bits, non entrelacé) ---
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(buf, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync("app-icon.png", png);
console.log("app-icon.png généré (1024x1024).");
