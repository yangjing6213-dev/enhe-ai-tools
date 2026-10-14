import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareEmojiUpload, readBoundedEmojiRequest } from "./emojis-upload";

describe("sticker image upload", () => {
  it("re-encodes a valid raster to bounded webp without keeping its original filename", async () => {
    const bytes = await sharp({ create: { width: 800, height: 600, channels: 4, background: "#00aaff" } }).png().toBuffer();
    const output = await prepareEmojiUpload(new File([new Uint8Array(bytes)], "../untrusted.png", { type: "image/png" }), "enhe_abcdef123456");
    const metadata = await sharp(Buffer.from(await output.arrayBuffer())).metadata();
    expect(output.name).toBe("enhe_abcdef123456.webp");
    expect(output.type).toBe("image/webp");
    expect(metadata.width).toBeLessThanOrEqual(256);
    expect(metadata.height).toBeLessThanOrEqual(256);
  });

  it("rejects SVG, signature spoofing, malformed images and oversized uploads", async () => {
    await expect(prepareEmojiUpload(new File(["<svg/>"], "evil.svg", { type: "image/svg+xml" }), "enhe_abcdef123456")).rejects.toThrow();
    await expect(prepareEmojiUpload(new File(["<script>"], "evil.png", { type: "image/png" }), "enhe_abcdef123456")).rejects.toThrow();
    await expect(prepareEmojiUpload(new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "broken.png", { type: "image/png" }), "enhe_abcdef123456")).rejects.toThrow();
    await expect(prepareEmojiUpload(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), "enhe_abcdef123456")).rejects.toThrow();
  });

  it("bounds actual request bytes even without a content-length header", async () => {
    const request = new Request("https://example.test/emojis", { method: "POST", body: "123456789" });
    await expect(readBoundedEmojiRequest(request, 8)).rejects.toThrow("大小限制");
    const valid = await readBoundedEmojiRequest(new Request("https://example.test/emojis", { method: "POST", body: "1234" }), 8);
    expect(await valid.text()).toBe("1234");
  });
});
