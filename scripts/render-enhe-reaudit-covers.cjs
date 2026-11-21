"use strict";

// Raster typesetting for the original 1672 × 941 covers. Input files are the
// original public images identified in the reversible content manifest.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const changes = require("./enhe-content-reaudit-20261121.json");

// Coordinates are measured on a 440 × 248 proof of each original design.
// The area outside each headline is copied directly from the original.
const headlineBoxes = [
  [12, 42, 147, 37], [12, 41, 149, 37], [12, 41, 147, 38], [12, 40, 152, 40],
  [15, 50, 183, 57], [292, 62, 123, 71], [15, 45, 171, 103], [12, 26, 152, 80],
  [18, 65, 193, 81], [12, 40, 150, 43], [14, 54, 182, 73], [15, 51, 186, 82],
  [13, 29, 161, 71], [12, 35, 154, 45], [12, 40, 151, 42], [12, 39, 153, 46],
  [12, 41, 178, 41], [12, 40, 151, 42], [39, 173, 362, 51], [66, 174, 307, 55],
];
const escapeMarkup = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

async function lineImage(value, size, bold, color) {
  const text = '<span foreground="' + color + '" weight="' + (bold ? "bold" : "normal") + '">' + escapeMarkup(value) + "</span>";
  const image = sharp({ text: { text, font: "Microsoft YaHei " + size, dpi: 72, rgba: true } });
  return image.png().toBuffer({ resolveWithObject: true });
}

async function typeset(originals, output) {
  fs.mkdirSync(output, { recursive: true });
  const titles = changes.filter((r) => /^N\d\d$/.test(r.ref));
  for (const [i, row] of titles.entries()) {
    const input = path.join(originals, row.ref + ".img");
    const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const sx = info.width / 440, sy = info.height / 248;
    if (Math.abs(sx - sy) > 0.02) throw Error("Unexpected original aspect ratio for " + row.ref);
    const box = headlineBoxes[i];
    const [left, top, width, height] = box.map((n, j) => Math.round(n * (j % 2 ? sy : sx)));
    // Sample the existing continuous background on each edge of the type area.
    // A median along the edge removes compression speckles and single-pixel lines.
    const channelAt = (x, y, channel) => data[(y * info.width + x) * 3 + channel];
    const background = (x, y, channel) => {
      const values = [];
      for (let dx = -2; dx <= 2; dx++) values.push(channelAt(x + dx, y, channel));
      return values.sort((a, b) => a - b)[2];
    };
    for (let x = left; x < left + width; x++) {
      for (let c = 0; c < 3; c++) {
        const upper = background(x, top - 1, c), lower = background(x, top + height, c);
        for (let y = 0; y < height; y++) {
          data[((top + y) * info.width + x) * 3 + c] = Math.round(upper + (lower - upper) * (y + 1) / (height + 1));
        }
      }
    }
    const zh = row.after.name.split("｜");
    const english = row.after.englishName;
    const lines = [...zh.map((value) => ({ value, bold: true })), { value: english, bold: false }];
    const centered = i >= 18;
    const maxWidth = width - Math.round(8 * sx);
    const gap = Math.round(height * 0.065);
    const rendered = [];
    for (const { value, bold } of lines) {
      let size = Math.floor(height * (bold ? (zh.length === 1 ? 0.44 : 0.31) : 0.17));
      let image = await lineImage(value, size, bold, bold ? "#102140" : "#354b68");
      if (image.info.width > maxWidth) {
        size = Math.max(10, Math.floor(size * maxWidth / image.info.width));
        image = await lineImage(value, size, bold, bold ? "#102140" : "#354b68");
      }
      while (image.info.width > maxWidth && size > 10) {
        image = await lineImage(value, --size, bold, bold ? "#102140" : "#354b68");
      }
      if (image.info.width > maxWidth) throw Error("Title does not fit " + row.ref);
      rendered.push(image);
    }
    const used = rendered.reduce((sum, r) => sum + r.info.height, gap * (rendered.length - 1));
    if (used > height) throw Error("Headline height exceeded for " + row.ref);
    let y = top + Math.floor((height - used) / 2);
    const composite = rendered.map((r) => {
      const x = centered ? left + Math.floor((width - r.info.width) / 2) : left + Math.round(4 * sx);
      const part = { input: r.data, left: x, top: y };
      y += r.info.height + gap;
      return part;
    });
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
      .composite(composite).webp({ quality: 92, smartSubsample: true })
      .toFile(path.join(output, row.scope.slug + ".webp"));
  }
}
if (process.argv.length !== 4) throw Error("Expected the original-cover directory and the output directory");
typeset(process.argv[2], process.argv[3]).catch((err) => { console.error(err.message); process.exitCode = 1; });
