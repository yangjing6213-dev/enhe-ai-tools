import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { shareForumPostLink } from "./forum-post-actions";

Object.assign(globalThis, { React });
vi.mock("@/app/forum/actions", () => ({ toggleForumLikeAction: vi.fn(), setForumBookmarkAction: vi.fn(), recordForumShareAction: vi.fn() }));

const topic = { url: "https://enhe.ai/forum/topic-1", title: "测试话题" };

describe("forum topic sharing", () => {
  it("uses the system share sheet on mobile and waits for its result", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    await expect(shareForumPostLink(topic, { userAgent: "iPhone", share, clipboard: { writeText } })).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith(topic);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the actual topic link on desktop even when system sharing exists", async () => {
    const share = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareForumPostLink(topic, { userAgent: "Windows NT", share, clipboard: { writeText } })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(topic.url);
    expect(share).not.toHaveBeenCalled();
  });

  it("does not copy or report success when a mobile share is cancelled", async () => {
    const share = vi.fn().mockRejectedValue({ name: "AbortError" });
    const writeText = vi.fn();
    await expect(shareForumPostLink(topic, { userAgent: "Android", share, clipboard: { writeText } })).resolves.toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to copying when the native share sheet cannot open", async () => {
    const share = vi.fn().mockRejectedValue(new Error("Unavailable"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareForumPostLink(topic, { userAgent: "iPad", share, clipboard: { writeText } })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(topic.url);
  });

  it("offers manual selection when automatic clipboard access fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard denied"));
    await expect(shareForumPostLink(topic, { userAgent: "Windows NT", clipboard: { writeText } })).resolves.toBe("manual");
    await expect(shareForumPostLink(topic, {})).resolves.toBe("manual");
  });

  it("recognizes an iPad using a desktop user agent", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    await expect(shareForumPostLink(topic, { userAgent: "Macintosh", maxTouchPoints: 5, share })).resolves.toBe("shared");
  });
});
