import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_COPY } from "@/lib/redesign/home/home-copy";

const heroSource = readFileSync(
  join(process.cwd(), "src/components/redesign/home/EnheRedesignHero.tsx"),
  "utf8",
);

describe("homepage approved copy", () => {
  it("keeps the exact bilingual hero and value contract", () => {
    expect(HOME_COPY.zh.label).toBe("给你的人生添加AI外挂");
    expect(HOME_COPY.zh.h1).toBe("AI一站式平台 一起创造未来");
    expect(HOME_COPY.zh.subtitle).toBe("发现值得使用的 AI 工具、实用方法与行业动态，让工作更高效，让创作更自由。");
    expect(HOME_COPY.zh.cta).toEqual({ label: "探索 AI 工具", href: "/software" });
    expect(HOME_COPY.zh.value.heading).toBe("让每一个人，都能驾驭AI，创造价值。");

    expect(HOME_COPY.en.label).toBe("Give your life an AI superpower");
    expect(HOME_COPY.en.h1).toBe("Your all-in-one AI platform. Let’s create the future together.");
    expect(HOME_COPY.en.subtitle).toBe("Discover practical AI tools, skills, and industry signals to work faster and create with confidence.");
    expect(HOME_COPY.en.cta).toEqual({ label: "Explore AI tools", href: "/en/software" });
    expect(HOME_COPY.en.value.heading).toBe("Help everyone master AI and create value.");
  });

  it("keeps later review and value copy in the typed dictionary", () => {
    expect(HOME_COPY.zh.review).toEqual({
      heading: "客户的心得",
      disclosure: "AI 生成示例（非真实用户反馈）",
    });
    expect(HOME_COPY.en.review).toEqual({
      heading: "Customer stories",
      disclosure: "AI-generated examples (not real customer feedback).",
    });
    expect(HOME_COPY.zh.value.cta).toEqual({ label: "探索 AI 工具", href: "/software" });
    expect(HOME_COPY.en.value.cta).toEqual({ label: "Explore AI tools", href: "/en/software" });
  });

  it("keeps the hero server-rendered and semantically minimal", () => {
    expect(heroSource.match(/<h1\b/g)).toHaveLength(1);
    expect(heroSource).toContain('<p className="redesign-home-subtitle">');
    expect(heroSource).toContain("href={copy.cta.href}");
    expect(heroSource).not.toContain('"use client"');
    expect(heroSource).not.toMatch(/prisma|database|fetch\(|\/api\//i);
  });
});
