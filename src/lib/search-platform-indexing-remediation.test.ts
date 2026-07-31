import { generateAccountServicesPageMetadata } from "@/app/account-services/page-shell";
import { generateProductDemoListingMetadata } from "@/app/product-demos/page-shell";
import { generateSkillLearningPageMetadata } from "@/app/skill-learning/page-shell";
import { generateSoftwarePageMetadata } from "@/app/software/page-shell";
import { describe, expect, it } from "vitest";

describe("search platform indexing remediation", () => {
  it.each([
    {
      generate: generateSoftwarePageMetadata,
      params: { q: "AI workflow", sort: "latest" },
      canonical: "https://www.enhe-tech.com.cn/en/software",
    },
    {
      generate: generateSkillLearningPageMetadata,
      params: { category: "prompt", sort: "popular" },
      canonical: "https://www.enhe-tech.com.cn/en/skill-learning",
    },
    {
      generate: generateAccountServicesPageMetadata,
      params: { q: "ChatGPT", category: "account" },
      canonical: "https://www.enhe-tech.com.cn/en/account-services",
    },
    {
      generate: generateProductDemoListingMetadata,
      params: { type: "software" },
      canonical: "https://www.enhe-tech.com.cn/en/product-demos",
    },
  ])(
    "keeps $canonical as canonical and noindexes filtered URLs",
    async ({ generate, params, canonical }) => {
      const metadata = await generate("en", Promise.resolve(params));

      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.canonical).toBe(canonical);
    },
  );

  it("keeps clean listing URLs indexable", async () => {
    const metadata = await generateSoftwarePageMetadata(
      "zh",
      Promise.resolve({}),
    );

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/software",
    );
  });
});
