import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db", () => ({ prisma: {} }));

import {
  filterPublicNewsTags,
  publicNewsTagLimit,
} from "@/lib/public-content";

describe("public AI news filter tags", () => {
  it("localizes or removes CJK tags from English listings and caps the option count", () => {
    const tags = [
      { id: "localized", slug: "ai-agent", name: "AI智能体" },
      { id: "unknown", slug: "unknown-cn", name: "量子模型" },
      { id: "mixed", slug: "tutorial", name: "Claude教程" },
      ...Array.from({ length: 70 }, (_, index) => ({
        id: `english-${index}`,
        slug: `english-${index}`,
        name: `English Topic ${index}`,
      })),
    ];

    const result = filterPublicNewsTags(tags, "en");

    expect(result.length).toBeLessThanOrEqual(publicNewsTagLimit);
    expect(result.find((tag) => tag.slug === "ai-agent")?.name).toBe(
      "AI Agents",
    );
    expect(result.some((tag) => tag.slug === "unknown-cn")).toBe(false);
    expect(result.every((tag) => !/[\u3400-\u9fff]/u.test(tag.name))).toBe(
      true,
    );
  });

  it("caps Chinese tags without rewriting their visible names", () => {
    const tags = Array.from({ length: 70 }, (_, index) => ({
      id: `tag-${index}`,
      slug: `tag-${index}`,
      name: `标签${index}`,
    }));

    const result = filterPublicNewsTags(tags, "zh");

    expect(result).toHaveLength(publicNewsTagLimit);
    expect(result[0]?.name).toBe("标签0");
  });
});
