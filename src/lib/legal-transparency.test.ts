import { describe, expect, it } from "vitest";
import { getLegalPage, legalSlugs } from "@/lib/legal";

describe("public privacy and service transparency", () => {
  it.each(["zh", "en"] as const)("explains Google scopes, retention, manual erasure and contact roles in %s", (locale) => {
    const page = getLegalPage("privacy-policy", locale)!;
    const text = page.sections.flatMap((s) => s.paragraphs).join(" ");
    expect(text).toContain("Google");
    expect(text).toContain("openid");
    expect(text).toContain(locale === "zh" ? "论坛" : "forum");
    expect(text).toContain(locale === "zh" ? "注销" : "deletion");
    expect(text).toContain(locale === "zh" ? "预计完成日期" : "expected completion date");
    expect(text).toContain(locale === "zh" ? "密码" : "password");
    for (const slug of legalSlugs) {
      const p = getLegalPage(slug, locale)!;
      expect(p).toHaveProperty("updatedAt", "2026-10-18");
      expect(p.sections.at(-1)?.paragraphs.join(" ")).toContain("292055066@qq.com");
    }
  });
});
