import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("AI news detail presentation", () => {
  const source = readFileSync(resolve(root, "src/app/ai-news/[slug]/page-shell.tsx"), "utf8");

  it("places the icon interaction toolbar before the ordinary-user impact card", () => {
    expect(source.indexOf("<AiNewsInteractions")).toBeGreaterThan(-1);
    expect(source.indexOf("<AiNewsInteractions")).toBeLessThan(source.indexOf("{localized.impactNotes ?"));
  });

  it("omits the requested related tutorial, reference, contents, and latest-news panels", () => {
    expect(source).not.toContain("{t.aiNews.relatedTutorials}");
    expect(source).not.toContain('forceLocale === "en" ? "Related Tools And Tutorials" : "相关工具/教程"');
    expect(source).not.toContain("{t.aiNews.sources}");
    expect(source).not.toContain("{t.aiNews.tableOfContents}");
    expect(source).not.toContain("{t.aiNews.latestTitle}");
  });
});
