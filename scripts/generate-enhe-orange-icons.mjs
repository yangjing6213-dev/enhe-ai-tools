import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const accent = { r: 240, g: 90, b: 53 };
const darkBg = { r: 34, g: 36, b: 42, alpha: 255 };
const whiteBg = { r: 255, g: 255, b: 255, alpha: 255 };

async function recolorLogoPng(inputPath, outputPath, background = null) {
  const source = sharp(join(root, inputPath)).ensureAlpha();
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(data.length);

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    output[index] = accent.r;
    output[index + 1] = accent.g;
    output[index + 2] = accent.b;
    output[index + 3] = alpha;
  }

  let image = sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  });

  if (background) {
    image = image.flatten({ background });
  }

  await image.png().toFile(join(root, outputPath));
}

async function makeRoundedIconBuffer(size) {
  const padding = Math.round(size * 0.18);
  const radius = Math.round(size * 0.22);
  const logoBuffer = await sharp(join(root, "public/images/brand/enhe-icon-gradient-transparent-cropped.png"))
    .ensureAlpha()
    .resize(size - padding * 2, size - padding * 2, { fit: "contain" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const logoPixels = Buffer.alloc(logoBuffer.data.length);
  for (let index = 0; index < logoBuffer.data.length; index += 4) {
    const alpha = logoBuffer.data[index + 3] ?? 0;
    logoPixels[index] = accent.r;
    logoPixels[index + 1] = accent.g;
    logoPixels[index + 2] = accent.b;
    logoPixels[index + 3] = alpha;
  }

  const logo = await sharp(logoPixels, {
    raw: {
      width: logoBuffer.info.width,
      height: logoBuffer.info.height,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  const roundedMask = Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`
  );

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: darkBg
    }
  })
    .composite([
      {
        input: logo,
        left: padding,
        top: padding
      },
      {
        input: roundedMask,
        blend: "dest-in"
      }
    ]);
}

async function makeRoundedAppIcon(size, outputPath) {
  await (await makeRoundedIconBuffer(size)).png().toFile(join(root, outputPath));
}

async function makeFaviconIco(outputPath) {
  const sizes = [16, 32, 48, 64];
  const images = await Promise.all(sizes.map(async (size) => ({
    size,
    buffer: await (await makeRoundedIconBuffer(size)).png().toBuffer()
  })));
  const directorySize = 6 + images.length * 16;
  let offset = directorySize;
  const header = Buffer.alloc(directorySize);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  for (let index = 0; index < images.length; index += 1) {
    const entryOffset = 6 + index * 16;
    const image = images[index];
    header.writeUInt8(image.size === 256 ? 0 : image.size, entryOffset);
    header.writeUInt8(image.size === 256 ? 0 : image.size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(image.buffer.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += image.buffer.length;
  }

  await writeFile(join(root, outputPath), Buffer.concat([header, ...images.map((image) => image.buffer)]));
}

async function recolorSvg(inputPath, outputPath) {
  let svg = await readFile(join(root, inputPath), "utf8");
  svg = svg
    .replace(/<defs>[\s\S]*?<\/defs>\s*/u, "")
    .replace(/filter="url\([^"]+\)"/gu, "")
    .replace(/fill="url\([^"]+\)"/gu, 'fill="#f05a35"')
    .replace(/stroke="url\([^"]+\)"/gu, 'stroke="#f05a35"')
    .replace(/stroke="#[0-9A-Fa-f]{6}"/gu, 'stroke="#ff8a6a"')
    .replace(/fill="#[0-9A-Fa-f]{6}"/gu, 'fill="#f05a35"');
  await writeFile(join(root, outputPath), svg, "utf8");
}

await recolorLogoPng(
  "public/images/brand/enhe-icon-gradient-transparent-cropped.png",
  "public/images/brand/enhe-icon-gradient-transparent-cropped.png"
);
await recolorLogoPng(
  "public/images/brand/enhe-icon-gradient-transparent-cropped.png",
  "public/images/brand/enhe-icon-gradient-white-bg-cropped.png",
  whiteBg
);
await makeRoundedAppIcon(192, "public/icon-192.png");
await makeRoundedAppIcon(512, "public/icon-512.png");
await makeRoundedAppIcon(180, "public/apple-icon.png");
await makeFaviconIco("public/favicon.ico");
await recolorSvg("public/images/enhe-logo-mark.svg", "public/images/enhe-logo-mark.svg");
await recolorSvg("public/images/enhe-logo.svg", "public/images/enhe-logo.svg");
