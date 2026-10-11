import { describe, expect, it } from "vitest";
import { isImagePath, isLikelyUploadableVideo, normalizeImageSrc, normalizeMediaSrc } from "@/lib/media";

describe("media helpers", () => {
  it("detects image paths so QR codes render as images instead of text", () => {
    expect(isImagePath("/images/payment/alipay-qr.jpg")).toBe(true);
    expect(isImagePath("https://example.com/qr.png")).toBe(true);
    expect(isImagePath("plain payment note")).toBe(false);
  });

  it("normalizes runtime upload image paths through the upload API", () => {
    expect(normalizeImageSrc("uploads/proof.jpg")).toBe("/api/uploads/proof.jpg");
    expect(normalizeImageSrc("/uploads/proof.jpg")).toBe("/api/uploads/proof.jpg");
    expect(normalizeImageSrc("https://www.enhe-tech.com.cn/uploads/user-avatars/avatar.png")).toBe(
      "/api/uploads/user-avatars/avatar.png"
    );
    expect(normalizeImageSrc("https://www.enhe-tech.com.cn/uploads/user-avatars/avatar.png?v=2")).toBe(
      "/api/uploads/user-avatars/avatar.png?v=2"
    );
  });

  it("normalizes media URLs without stripping upload subdirectories", () => {
    expect(normalizeMediaSrc("uploads/tool-videos/demo.mp4")).toBe("/api/uploads/tool-videos/demo.mp4");
    expect(normalizeMediaSrc("/uploads/tool-videos/demo.mp4")).toBe("/api/uploads/tool-videos/demo.mp4");
    expect(normalizeMediaSrc("videos/demo.mp4")).toBe("/videos/demo.mp4");
    expect(normalizeMediaSrc("https://example.com/demo.mp4")).toBe("https://example.com/demo.mp4");
  });

  it("detects uploadable product video files", () => {
    const mp4 = new File(["demo"], "demo.mp4", { type: "video/mp4" });
    const webm = new File(["demo"], "demo.webm", { type: "video/webm" });
    const mov = new File(["demo"], "demo.mov", { type: "video/quicktime" });
    const text = new File(["demo"], "demo.txt", { type: "text/plain" });

    expect(isLikelyUploadableVideo(mp4)).toBe(true);
    expect(isLikelyUploadableVideo(webm)).toBe(true);
    expect(isLikelyUploadableVideo(mov)).toBe(true);
    expect(isLikelyUploadableVideo(text)).toBe(false);
  });

  it("normalizes bundled image paths for Next image rendering", () => {
    expect(normalizeImageSrc("/images/qr.jpg")).toBe("/images/qr.jpg");
    expect(normalizeImageSrc("images/qr.jpg")).toBe("/images/qr.jpg");
    expect(normalizeImageSrc("https://example.com/qr.png")).toBe("https://example.com/qr.png");
  });

  it("does not turn a private COS object reference into a broken browser URL", () => {
    expect(normalizeImageSrc("cos://enhe-bucket/user-avatars/avatar.png")).toBeNull();
  });
});
