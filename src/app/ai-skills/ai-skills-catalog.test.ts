import { describe, expect, it } from "vitest";

import type { SoftwareCatalogItem } from "@/lib/redesign/software/software-production";
import { filterAiSkillCatalog } from "./ai-skills-catalog";

const product = (overrides: Partial<SoftwareCatalogItem>): SoftwareCatalogItem => ({
  id: "skill-1",
  type: "ai_skill",
  secondaryName: "Local debugging helper",
  isPaid: false,
  highlights: ["Codex", "OpenClaw"],
  downloadCount: 1,
  usageCount: 0,
  categoryId: "skill",
  name: "本地开发排错 Skill",
  description: "定位项目中的问题，并保留可重复的验证步骤。",
  price: "免费",
  detailHref: "/ai-skills/local-debugging",
  media: null,
  ...overrides,
});

const entries = [
  { product: product({}), categoryLabel: "AI Skill" },
  {
    product: product({
      id: "skill-2",
      name: "文案整理 Skill",
      description: "把长内容整理成摘要和行动清单。",
      highlights: ["Claude Code"],
    }),
    categoryLabel: "内容创作",
  },
];

describe("AI Skill catalog filtering", () => {
  it("filters localized titles and descriptions immediately by partial text", () => {
    expect(filterAiSkillCatalog(entries, "本地开发", "zh").map(({ product: item }) => item.id))
      .toEqual(["skill-1"]);
    expect(filterAiSkillCatalog(entries, "摘要", "zh").map(({ product: item }) => item.id))
      .toEqual(["skill-2"]);
  });

  it("also finds supported agent names and returns all cards for an empty search", () => {
    expect(filterAiSkillCatalog(entries, "claude code", "en").map(({ product: item }) => item.id))
      .toEqual(["skill-2"]);
    expect(filterAiSkillCatalog(entries, "  ", "zh")).toBe(entries);
  });
});
