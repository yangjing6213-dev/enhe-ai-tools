import { describe, expect, it } from "vitest";
import { isImagePath, normalizeImageSrc } from "@/lib/media";

describe("media helpers", () => {
  it("detects image paths so QR codes render as images instead of text", () => {
    expect(isImagePath("/images/payment/alipay-qr.jpg")).toBe(true);
    expect(isImagePath("https://example.com/qr.png")).toBe(true);
    expect(isImagePath("plain payment note")).toBe(false);
  });

  it("normalizes runtime upload image paths through the upload API", () => {
    expect(normalizeImageSrc("uploads/proof.jpg")).toBe("/api/uploads/proof.jpg");
    expect(normalizeImageSrc("/uploads/proof.jpg")).toBe("/api/uploads/proof.jpg");
  });

  it("normalizes bundled image paths for Next image rendering", () => {
    expect(normalizeImageSrc("/images/qr.jpg")).toBe("/images/qr.jpg");
    expect(normalizeImageSrc("images/qr.jpg")).toBe("/images/qr.jpg");
    expect(normalizeImageSrc("https://example.com/qr.png")).toBe("https://example.com/qr.png");
  });
});
