import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AI news keyword admin guidance", () => {
  it("explains the website data sources and minimum content threshold", () => {
    const source = readFileSync(
      new URL("../app/admin/ai-news/keywords/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("已发布资讯");
    expect(source).toContain("近 30 天站内搜索");
    expect(source).toContain("至少关联 3 篇资讯");
    expect(source).toContain("没有足够资讯支撑的新词不会出现在前台");
  });

  it("invalidates the public keyword cache after a rule is changed", () => {
    const actions = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");

    expect(actions).toContain('revalidateTag("public-news")');
  });
});
