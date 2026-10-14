import { describe, expect, it } from "vitest";
import { assertForumAttachmentSelection, canReadForumAttachment, parseForumMediaRange, prepareForumMediaUpload } from "@/lib/forum-media";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWP4z8DwnwGM/zMwAAAf7gP9qS/A4gAAAABJRU5ErkJggg==", "base64");
const attachment = { id: "a-1", authorId: "u-1", kind: "image", fileSize: 1024, postId: null, replyId: null, discardedAt: null, createdAt: new Date() };

describe("forum media boundaries", () => {
  it("re-encodes accepted images and gives them a safe generated name", async () => {
    const result = await prepareForumMediaUpload(new File([png], "../../秘密.png", { type: "image/png" }), "reply");
    expect(result.kind).toBe("image");
    expect(result.file.type).toBe("image/webp");
    expect(result.file.name).toMatch(/^[a-f0-9-]+\.webp$/);
    const bytes = Buffer.from(await result.file.arrayBuffer());
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  });

  it("rejects spoofed images, SVG, mismatched MIME and oversized images", async () => {
    await expect(prepareForumMediaUpload(new File(["<script>alert(1)</script>"], "fake.png", { type: "image/png" }), "post")).rejects.toThrow("FORUM_MEDIA_TYPE");
    await expect(prepareForumMediaUpload(new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" }), "post")).rejects.toThrow("FORUM_MEDIA_TYPE");
    await expect(prepareForumMediaUpload(new File([png], "fake.jpg", { type: "image/jpeg" }), "post")).rejects.toThrow("FORUM_MEDIA_TYPE");
    const large = new File([png], "image.png", { type: "image/png" });
    Object.defineProperty(large, "size", { value: 8 * 1024 * 1024 + 1 });
    await expect(prepareForumMediaUpload(large, "reply")).rejects.toThrow("FORUM_MEDIA_SIZE");
  });

  it("accepts MP4 signatures for posts and rejects videos in replies", async () => {
    const mp4 = Buffer.from("000000186674797069736f6d0000000069736f6d6d703432000000086d646174", "hex");
    const file = new File([mp4], "demo.mp4", { type: "video/mp4" });
    expect((await prepareForumMediaUpload(file, "post")).kind).toBe("video");
    await expect(prepareForumMediaUpload(file, "reply")).rejects.toThrow("FORUM_MEDIA_TYPE");
    await expect(prepareForumMediaUpload(new File([png], "demo.mp4", { type: "video/mp4" }), "post")).rejects.toThrow("FORUM_MEDIA_TYPE");
  });

  it("checks ownership, freshness, previous assignment, duplicates and per-surface limits", () => {
    expect(() => assertForumAttachmentSelection(["a-1"], [attachment], "u-1", "post")).not.toThrow();
    for (const invalid of [{ ...attachment, authorId: "u-2" }, { ...attachment, postId: "post-1" }, { ...attachment, discardedAt: new Date() }, { ...attachment, createdAt: new Date(0) }, { ...attachment, fileSize: 9 * 1024 * 1024 }]) {
      expect(() => assertForumAttachmentSelection(["a-1"], [invalid], "u-1", "post")).toThrow("FORUM_INVALID_ATTACHMENTS");
    }
    expect(() => assertForumAttachmentSelection(["a-1", "a-1"], [attachment], "u-1", "post")).toThrow();
    expect(() => assertForumAttachmentSelection(["a-1"], [{ ...attachment, kind: "video" }], "u-1", "reply")).toThrow();
    const images = Array.from({ length: 7 }, (_, index) => ({ ...attachment, id: `a-${index}` }));
    expect(() => assertForumAttachmentSelection(images.map((item) => item.id), images, "u-1", "post")).toThrow();
  });

  it("makes media public only while its own parent and the reply post are approved", () => {
    expect(canReadForumAttachment({ authorId: "u-1", post: null, reply: null }, null)).toBe(false);
    expect(canReadForumAttachment({ authorId: "u-1", post: { status: "pending" }, reply: null }, { id: "u-1", role: "user" })).toBe(true);
    expect(canReadForumAttachment({ authorId: "u-1", post: { status: "pending" }, reply: null }, { id: "u-2", role: "user" })).toBe(false);
    expect(canReadForumAttachment({ authorId: "u-1", post: null, reply: null }, { id: "admin", role: "admin" })).toBe(true);
    expect(canReadForumAttachment({ authorId: "u-1", post: { status: "approved" }, reply: null }, null)).toBe(true);
    expect(canReadForumAttachment({ authorId: "u-1", post: null, reply: { status: "approved", post: { status: "rejected" } } }, null)).toBe(false);
    expect(canReadForumAttachment({ authorId: "u-1", post: null, reply: { status: "approved", post: { status: "approved" } } }, null)).toBe(true);
  });

  it("handles video byte ranges and rejects malformed or multiple ranges", () => {
    expect(parseForumMediaRange("bytes=2-5", 10)).toEqual({ start: 2, end: 5 });
    expect(parseForumMediaRange("bytes=-3", 10)).toEqual({ start: 7, end: 9 });
    expect(parseForumMediaRange("bytes=5-", 10)).toEqual({ start: 5, end: 9 });
    expect(parseForumMediaRange("bytes=2-99", 10)).toEqual({ start: 2, end: 9 });
    expect(parseForumMediaRange(null, 10)).toBeNull();
    for (const range of ["bytes=10-", "bytes=2-1", "bytes=0-1,5-7", "items=0-1", "bytes=1e1-", "bytes=-0"]) expect(parseForumMediaRange(range, 10)).toBe("invalid");
  });
});
