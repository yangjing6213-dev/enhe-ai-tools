import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

// Keep the supplied mascot unchanged; only resize/encode its transparent artwork.
const source = resolve("public/images/brand/enhe-favicon-source.png");
const resizeIcon = size => sharp(source).resize(size, size).png().toBuffer();

for (const [size, path] of [[192, "icon-192.png"], [512, "icon-512.png"]]) {
  await writeFile(resolve("public", path), await resizeIcon(size));
}

// Keep an opaque Apple-specific tile, a fresh declared URL, and Apple's root fallback.
const appleIcon = await sharp(source).resize(180, 180).flatten({ background: "#fff" }).png().toBuffer();
for (const path of ["apple-touch-icon-20261016.png", "apple-touch-icon.png", "apple-icon.png"]) {
  await writeFile(resolve("public", path), appleIcon);
}

const sizes = [16, 32, 48, 64];
const frames = await Promise.all(sizes.map(resizeIcon));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let index = 0; index < sizes.length; index += 1) {
  const entry = 6 + index * 16;
  header.writeUInt8(sizes[index], entry);
  header.writeUInt8(sizes[index], entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frames[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frames[index].length;
}
await writeFile(resolve("public/favicon.ico"), Buffer.concat([header, ...frames]));

// Preserve the existing sharing image pixel-for-pixel outside the logo patch.
const base = resolve("public/images/brand/enhe-ai-og-1200x630.png");
const { data } = await sharp(base).extract({ left: 80, top: 58, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
const clear = await sharp({ create: { width: 112, height: 88, channels: 3, background: { r: data[0], g: data[1], b: data[2] } } }).png().toBuffer();
const mark = await sharp(resolve("public/images/brand/enhe-share-mark-white.png")).trim().resize(100, 76, { fit: "inside" }).png().toBuffer();
await sharp(base).composite([
  { input: clear, left: 78, top: 54 },
  { input: mark, left: 80, top: 60 }
]).png().toFile(resolve("public/images/brand/enhe-ai-og-white-1200x630.png"));
