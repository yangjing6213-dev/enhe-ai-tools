import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const source = join(process.cwd(), "public/images/brand/enhe-favicon-source.png");
const version = "?v=blue-mascot-20261015";

async function expectMascot(buffer: Buffer, size: number) {
  const icon = sharp(buffer);
  const metadata = await icon.metadata();
  expect(metadata.width).toBe(size);
  expect(metadata.height).toBe(size);
  expect(metadata.hasAlpha).toBe(true);
  const actual = await icon.ensureAlpha().raw().toBuffer();
  const expected = await sharp(source).resize(size, size).ensureAlpha().raw().toBuffer();
  expect(actual.equals(expected)).toBe(true);
  for (const pixel of [0, size - 1, size * (size - 1), size * size - 1]) {
    expect(actual[pixel * 4 + 3]).toBe(0);
  }
}

describe("favicon and app icon source contract", () => {
  it("uses the exact supplied blue mascot as its source", () => {
    expect(createHash("sha256").update(readFileSync(source)).digest("hex"))
      .toBe("048746c879e369d333b2db2beccc1d28a54456317e77b64ee46a1e136d355375");
  });

  it("links versioned icons from metadata and the installable app manifest", async () => {
    const { sharedRootMetadata } = await import("@/app/root-layout-shared");
    expect(sharedRootMetadata.manifest).toBe("/manifest.webmanifest");
    expect(sharedRootMetadata.icons).toMatchObject({
      shortcut: `/favicon.ico${version}`,
      apple: [{ url: "/apple-touch-icon-20261016.png", type: "image/png", sizes: "180x180" }]
    });
    expect(manifest().icons?.map(icon => icon.src)).toEqual([
      `/icon-192.png${version}`, `/icon-512.png${version}`
    ]);
  });

  it("preserves the mascot colors and transparent corners in all app sizes", async () => {
    for (const [file, size] of [["icon-192.png", 192], ["icon-512.png", 512]] as const) {
      await expectMascot(readFileSync(join(process.cwd(), "public", file)), size);
    }
  });

  it("provides an opaque Apple home-screen icon and the conventional root fallback", async () => {
    const expected = await sharp(source).resize(180, 180).flatten({ background: "#fff" }).raw().toBuffer();
    for (const file of ["apple-touch-icon-20261016.png", "apple-touch-icon.png", "apple-icon.png"]) {
      const icon = sharp(join(process.cwd(), "public", file));
      const metadata = await icon.metadata();
      expect(metadata.format).toBe("png");
      expect(metadata.width).toBe(180);
      expect(metadata.height).toBe(180);
      expect(metadata.hasAlpha).toBe(false);
      expect((await icon.raw().toBuffer()).equals(expected)).toBe(true);
    }
  });

  it("encodes transparent mascot PNG frames at standard favicon sizes", async () => {
    const buffer = readFileSync(join(process.cwd(), "public/favicon.ico"));
    expect(buffer.readUInt16LE(0)).toBe(0);
    expect(buffer.readUInt16LE(2)).toBe(1);
    expect(buffer.readUInt16LE(4)).toBe(4);
    for (const [index, size] of [16, 32, 48, 64].entries()) {
      const entry = 6 + index * 16;
      const length = buffer.readUInt32LE(entry + 8);
      const offset = buffer.readUInt32LE(entry + 12);
      const frame = buffer.subarray(offset, offset + length);
      expect(frame.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      await expectMascot(frame, size);
    }
  });

  it("replaces only the sharing image logo and preserves the photo and text", async () => {
    const original = await sharp("public/images/brand/enhe-ai-og-1200x630.png").removeAlpha().raw().toBuffer();
    const updated = await sharp("public/images/brand/enhe-ai-og-white-1200x630.png").removeAlpha().raw().toBuffer();
    expect(updated.length).toBe(1200 * 630 * 3);
    let whitePixels = 0;
    for (let y = 0; y < 630; y += 1) {
      for (let x = 0; x < 1200; x += 1) {
        const offset = (y * 1200 + x) * 3;
        if (x >= 78 && x < 190 && y >= 54 && y < 142) {
          if (updated[offset] > 240 && updated[offset + 1] > 240 && updated[offset + 2] > 240) whitePixels += 1;
        } else if (!original.subarray(offset, offset + 3).equals(updated.subarray(offset, offset + 3))) {
          throw new Error(`Unexpected sharing image change outside logo at ${x},${y}`);
        }
      }
    }
    expect(whitePixels).toBeGreaterThan(2000);
  });
});
