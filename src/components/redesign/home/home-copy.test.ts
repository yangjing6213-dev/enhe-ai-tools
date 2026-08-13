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
    expect(HOME_COPY.zh.label).toBe("给人生加一个 AI 外挂");
    expect(HOME_COPY.zh.h1).toBe("一站式AI平台");
    expect(HOME_COPY.zh.subtitle).toBe(
      "发现真正好用的 AI 工具、智能体与实战方法，让工作更快、创作更自由，把每个灵感变成看得见的成果。",
    );
    expect(HOME_COPY.zh.cta).toEqual({ label: "开始探索AI", href: "/software" });
    expect(HOME_COPY.zh.value.heading).toBe("让每一个普通人，都能借助 AI，创造过去做不到的事。");

    expect(HOME_COPY.en.label).toBe("An AI upgrade for everyday life");
    expect(HOME_COPY.en.h1).toBe("The All-in-One AI Platform.");
    expect(HOME_COPY.en.subtitle).toBe(
      "Find genuinely useful AI tools, agents, and practical methods to work faster, create more freely, and turn every spark into a visible result.",
    );
    expect(HOME_COPY.en.cta).toEqual({ label: "Start exploring AI", href: "/en/software" });
    expect(HOME_COPY.en.value.heading).toBe("Let everyone use AI to create what once felt out of reach.");
  });

  it("keeps later review and value copy in the typed dictionary", () => {
    expect(HOME_COPY.zh.review).toEqual({ heading: "体验反馈", exampleLabel: "示例体验反馈" });
    expect(HOME_COPY.en.review).toEqual({ heading: "Experience feedback", exampleLabel: "Example experience feedback" });
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
