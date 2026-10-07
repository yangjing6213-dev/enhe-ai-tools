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
    expect(HOME_COPY.zh.h1).toBe("让 AI 创意，落地为真实成果");
    expect(HOME_COPY.zh.subtitle).toBe("发现值得使用的 AI 工具、实用方法与行业动态，让工作更高效，让创作更自由。");
    expect(HOME_COPY.zh.cta).toEqual({ label: "探索 AI 工具", href: "/software" });
    expect(HOME_COPY.zh.value.heading).toBe("让每一个普通人，都能借助 AI，创造过去做不到的事。");

    expect(HOME_COPY.en.label).toBe("Give your life an AI superpower");
    expect(HOME_COPY.en.h1).toBe("Turn AI ideas into real results.");
    expect(HOME_COPY.en.subtitle).toBe("Discover practical AI tools, skills, and industry signals to work faster and create with confidence.");
    expect(HOME_COPY.en.cta).toEqual({ label: "Explore AI tools", href: "/en/software" });
    expect(HOME_COPY.en.value.heading).toBe("Let everyone use AI to create what once felt out of reach.");
  });

  it("keeps later review and value copy in the typed dictionary", () => {
    expect(HOME_COPY.zh.review).toEqual({
      heading: "产品用户评价",
      disclosure: "以下人物与评价内容由 AI 生成，仅作页面展示示意，并非真实用户评价。",
    });
    expect(HOME_COPY.en.review).toEqual({
      heading: "Product user reviews",
      disclosure: "These people and review texts are AI-generated illustrations, not real customer reviews.",
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
