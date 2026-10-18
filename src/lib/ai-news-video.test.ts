import { describe, expect, it } from "vitest";
import { resolveArticleVideoMedia, localizeArticleVideoText } from "@/lib/ai-news-video";

describe("AI article videos", () => {
  it("recognizes direct media with query parameters", () => {
    expect(resolveArticleVideoMedia("https://cdn.example.com/demo.mp4?version=2")).toEqual({
      kind: "native", src: "https://cdn.example.com/demo.mp4?version=2",
    });
  });

  it.each([
    "https://www.youtube.com/watch?v=abcdefghijk",
    "https://youtu.be/abcdefghijk?t=5",
    "https://www.youtube.com/shorts/abcdefghijk",
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  ])("builds a privacy-enhanced YouTube embed for %s", (url) => {
    expect(resolveArticleVideoMedia(url)).toEqual({
      kind: "embed", src: "https://www.youtube-nocookie.com/embed/abcdefghijk",
    });
  });

  it("accepts Vimeo numeric video pages", () => {
    expect(resolveArticleVideoMedia("https://vimeo.com/123456789")).toEqual({
      kind: "embed", src: "https://player.vimeo.com/video/123456789?dnt=1",
    });
  });

  it.each([
    "https://youtube.com.evil.example/watch?v=abcdefghijk",
    "https://example.com/embed/abcdefghijk",
    "https://www.youtube.com/watch?v=not-a-valid-id",
    "https://username:password@www.youtube.com/watch?v=abcdefghijk",
    "http://www.youtube.com/watch?v=abcdefghijk",
    "javascript:alert(1)",
    "/uploads/demo.mp4",
  ])("does not embed unrecognized or unsafe media %s", (url) => {
    expect(resolveArticleVideoMedia(url)).toBeNull();
  });

  it("uses localized video text without changing the shared media", () => {
    const value = JSON.stringify({ zh: "官方操作演示", en: "Official walkthrough" });
    expect(localizeArticleVideoText(value, "zh", "fallback")).toBe("官方操作演示");
    expect(localizeArticleVideoText(value, "en", "fallback")).toBe("Official walkthrough");
    expect(localizeArticleVideoText("Existing plain title", "en", "fallback")).toBe("Existing plain title");
    expect(localizeArticleVideoText('{"zh":"仅有中文"}', "en", "fallback")).toBe("fallback");
    expect(localizeArticleVideoText("{invalid", "en", "fallback")).toBe("fallback");
    expect(localizeArticleVideoText(null, "en", "fallback")).toBe("fallback");
  });
});
