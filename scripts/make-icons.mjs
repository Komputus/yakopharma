// Génère les icônes PNG de la PWA (croix blanche sur vert), sans dépendance. node scripts/make-icons.mjs
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, c]);
};

function png(size) {
  // Croix dans la zone sûre "maskable" (80 % centraux) : bras = 15 % de la taille.
  const arm = size * 0.15, half = size * 0.3, mid = size / 2;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const inV = Math.abs(x + 0.5 - mid) <= arm / 2 && Math.abs(y + 0.5 - mid) <= half;
      const inH = Math.abs(y + 0.5 - mid) <= arm / 2 && Math.abs(x + 0.5 - mid) <= half;
      const [r, g, b] = inV || inH ? [255, 255, 255] : [0x23, 0x7a, 0x49];
      row.set([r, g, b], 1 + x * 3);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const s of [192, 512]) writeFileSync(`public/icons/icon-${s}.png`, png(s));
writeFileSync("public/icons/apple-touch-icon.png", png(180));
console.log("Icônes générées.");
