import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-content", () => ({
  getPublicNewsListing: vi.fn(async () => ({ articles: [], total: 60 })),
}));

import { generateAiNewsPageMetadata } from "@/app/ai-news/page-shell";

type GenerateListingMetadata = (
  locale: "zh" | "en",
  searchParams?: Record<string, string | undefined>,
) => Promise<Metadata>;

const generateListingMetadata =
  generateAiNewsPageMetadata as GenerateListingMetadata;

describe("AI news listing SEO state", () => {
  it("keeps the unfiltered first page indexable with the listing canonical", async () => {
    const metadata = await generateListingMetadata("zh");

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/ai-news",
    );
  });

  it("marks search and filter result URLs noindex while retaining follow", async () => {
    const metadata = await generateListingMetadata("en", {
      q: "AI workflow automation",
      sort: "hot",
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/en/ai-news",
    );
  });

  it("uses a self canonical for unfiltered pagination after page one", async () => {
    const metadata = await generateListingMetadata("zh", { page: "6" });

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/ai-news/page/6",
    );
    expect(metadata.alternates?.languages?.["en-US"]).toBe(
      "https://www.enhe-tech.com.cn/en/ai-news/page/6",
    );
  });
});
