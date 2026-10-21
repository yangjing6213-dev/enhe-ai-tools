import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_COPY } from "@/lib/redesign/home/home-copy";

const valueSource = readFileSync(join(process.cwd(), "src/components/redesign/home/EnheRedesignBrandValue.tsx"), "utf8");
const heroSource = readFileSync(
  join(process.cwd(), "src/components/redesign/home/EnheRedesignHero.tsx"),
  "utf8",
);
const heroStyles = readFileSync(join(process.cwd(), "src/styles/redesign/home.css"), "utf8");
const footerStyles = readFileSync(join(process.cwd(), "src/styles/redesign/site-refresh.css"), "utf8");
const footerValueHeading = footerStyles.match(/\.redesign-footer \.redesign-home-brand-value-inner h2\s*\{([^}]*)\}/)?.[1] ?? "";

describe("homepage approved copy", () => {
  it("keeps the exact bilingual hero and value contract", () => {
    expect(HOME_COPY.zh.label).toBe("给你的人生添加AI外挂");
    expect(HOME_COPY.zh.h1).toBe("AI一站式平台 创造未来 改变生活");
    expect(HOME_COPY.zh.subtitle).toBe("发现值得使用的 AI 工具、实用方法与行业动态，让工作更高效，让创作更自由。");
    expect(HOME_COPY.zh.cta).toEqual({ label: "探索 AI 工具", href: "/software" });
    expect(HOME_COPY.zh.forumCta).toEqual({ label: "共创AI论坛", href: "/forum" });
    expect(HOME_COPY.zh.value.heading).toBe("让每一个人，都能驾驭AI，创造价值。");

    expect(HOME_COPY.en.label).toBe("Give your life an AI superpower");
    expect(HOME_COPY.en.h1).toBe("Your all-in-one AI platform. Let’s create the future together.");
    expect(HOME_COPY.en.subtitle).toBe("Discover practical AI tools, skills, and industry signals to work faster and create with confidence.");
    expect(HOME_COPY.en.cta).toEqual({ label: "Explore AI tools", href: "/en/software" });
    expect(HOME_COPY.en.forumCta).toEqual({ label: "Co-create AI Forum", href: "/en/forum" });
    expect(HOME_COPY.en.value.heading).toBe("Help everyone master AI and create value.");
    expect(HOME_COPY.zh.value).toEqual({ heading: "让每一个人，都能驾驭AI，创造价值。" });
  });

  it("keeps later review and value copy in the typed dictionary", () => {
    expect(HOME_COPY.zh.review).toEqual({
      heading: "用户评价",
      disclosure: "AI 生成示例（非真实用户反馈）",
    });
    expect(HOME_COPY.en.review).toEqual({
      heading: "Customer stories",
      disclosure: "AI-generated examples (not real customer feedback).",
    });
  });

  it("removes the footer exploration button", () => {
    expect(valueSource).not.toContain("redesign-home-brand-value-cta");
    expect(valueSource).not.toContain("<a");
  });

  it("keeps the hero server-rendered and semantically minimal", () => {
    expect(heroSource.match(/<h1\b/g)).toHaveLength(1);
    expect(heroSource).toContain('<p className="redesign-home-subtitle">');
    expect(heroSource).toContain("[copy.cta, copy.forumCta]");
    expect(heroSource).not.toContain('"use client"');
    expect(heroSource).not.toMatch(/prisma|database|fetch\(|\/api\//i);
  });

  it("does not paint a black fallback headline for either locale", () => {
    expect(heroSource).toContain("initialFallback={false}");
    expect(heroSource).not.toContain("initialFallback={locale === \"zh\"}");
    expect(heroStyles).toMatch(/\.redesign-home-hero\[data-locale=\"en\"\] \.redesign-home-animated-line\s*\{[^}]*font-size:\s*clamp\(20px,\s*6\.5vw,\s*56px\)/);
  });

  it("matches the homepage title type treatment in the footer without changing size or adding motion", () => {
    expect(valueSource).toContain('className="redesign-bold-copy"');
    expect(footerValueHeading).toMatch(/font-family:\s*\"Microsoft YaHei\",\s*Arial,\s*sans-serif;/);
    expect(footerValueHeading).toMatch(/font-weight:\s*800;/);
    expect(footerValueHeading).toMatch(/letter-spacing:\s*-0\.03em;/);
    expect(footerValueHeading).toContain("font-size: clamp(2.25rem, 3.2vw, 3rem);");
    expect(footerValueHeading).not.toMatch(/animation\s*:/i);
  });
});
