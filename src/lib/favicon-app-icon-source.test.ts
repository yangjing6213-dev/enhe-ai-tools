import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

async function loadImageAsset(path: string) {
  const { default: sharp } = await import("sharp");
  const image = sharp(join(root, path), { animated: false });
  const metadata = await image.metadata();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info, metadata };
}

function averageOpaqueColor(data: Buffer, alphaThreshold = 16) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    if (alpha <= alphaThreshold) continue;
    r += data[index] ?? 0;
    g += data[index + 1] ?? 0;
    b += data[index + 2] ?? 0;
    count += 1;
  }

  return {
    r: Math.round(r / Math.max(1, count)),
    g: Math.round(g / Math.max(1, count)),
    b: Math.round(b / Math.max(1, count))
  };
}

function cornerAlpha(data: Buffer, width: number, x: number, y: number) {
  return data[(y * width + x) * 4 + 3] ?? 255;
}

describe("favicon and app icon source contract", () => {
  it("exposes standard icon files and a web app manifest", () => {
    expect(existsSync(join(root, "public/favicon.ico"))).toBe(true);
    expect(existsSync(join(root, "public/icon-192.png"))).toBe(true);
    expect(existsSync(join(root, "public/icon-512.png"))).toBe(true);
    expect(existsSync(join(root, "public/apple-icon.png"))).toBe(true);
    expect(existsSync(join(root, "src/app/manifest.ts"))).toBe(true);
  });

  it("links favicon, apple icon, and manifest from shared root metadata", async () => {
    const source = await import("@/app/root-layout-shared");

    expect(source.sharedRootMetadata.manifest).toBe("/manifest.webmanifest");
    expect(source.sharedRootMetadata.icons).toMatchObject({
      shortcut: "/favicon.ico",
      apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }]
    });
  });

  it("keeps logo and app icons in the approved ENHE orange with rounded app icon corners", async () => {
    const brand = await loadImageAsset("public/images/brand/enhe-icon-gradient-transparent-cropped.png");
    const appIcon = await loadImageAsset("public/icon-192.png");

    expect(averageOpaqueColor(brand.data)).toMatchObject({
      r: expect.closeTo(240, 14),
      g: expect.closeTo(90, 14),
      b: expect.closeTo(53, 14)
    });
    expect(appIcon.metadata.hasAlpha).toBe(true);
    expect(cornerAlpha(appIcon.data, appIcon.info.width, 0, 0)).toBe(0);
    expect(cornerAlpha(appIcon.data, appIcon.info.width, appIcon.info.width - 1, 0)).toBe(0);
    expect(cornerAlpha(appIcon.data, appIcon.info.width, 0, appIcon.info.height - 1)).toBe(0);
    expect(cornerAlpha(appIcon.data, appIcon.info.width, appIcon.info.width - 1, appIcon.info.height - 1)).toBe(0);
  });
});
