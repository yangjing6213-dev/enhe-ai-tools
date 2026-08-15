import { describe, expect, it } from "vitest";

import {
  SOFTWARE_CATALOG_PAGE_SIZE,
  buildSoftwareCatalogLanguageHrefs,
  buildSoftwareCatalogPage,
  parseSoftwareCatalogSearchParams,
  type PublicSoftwareCatalogRow,
} from "@/lib/redesign/software/software-production";

function buildRows(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const item = index + 1;

    return {
      id: `tool-${item}`,
      slug: `tool-${item}`,
      name: `工具 ${item}`,
      englishName: `Practical AI Tool ${item}`,
      type: "software" as const,
      shortDescription:
        "[[zh]]用于完成真实工作任务。[[/zh]][[en]]A practical AI tool for completing a clear everyday workflow.[[/en]]",
      content:
        "[[zh]]用于完成真实工作任务，并提供可复用的操作流程。[[/zh]][[en]]This practical AI tool explains the complete workflow, expected outcome, operating boundary, and useful next steps for everyday work.[[/en]]",
      coverImage: item % 2 === 0 ? `/images/tool-${item}.png` : null,
      isDownloadPaid: item % 2 === 0,
      downloadPrice: item % 2 === 0 ? item : 0,
      isHomeRecommended: item <= 3,
      sortOrder: item,
      createdAt: new Date(Date.UTC(2026, 0, item)),
      category: { name: "视频生成" },
      priceSpecs: [],
    };
  });
}

describe("production software catalog adapter", () => {
  it("uses an exact 12-item server pagination contract for 25 published rows", () => {
    const rows = buildRows(25);
    const first = buildSoftwareCatalogPage({ rows, locale: "zh", page: 1 });
    const second = buildSoftwareCatalogPage({ rows, locale: "zh", page: 2 });
    const third = buildSoftwareCatalogPage({ rows, locale: "zh", page: 3 });

    expect(SOFTWARE_CATALOG_PAGE_SIZE).toBe(12);
    expect(first?.items).toHaveLength(12);
    expect(second?.items).toHaveLength(12);
    expect(third?.items).toHaveLength(1);
    expect(first).toMatchObject({
      total: 25,
      page: 1,
      pageSize: 12,
      totalPages: 3,
      hasPrevious: false,
      hasNext: true,
      previousHref: null,
      nextHref: "/software?page=2",
    });
    expect(second).toMatchObject({
      page: 2,
      hasPrevious: true,
      hasNext: true,
      previousHref: "/software",
      nextHref: "/software?page=3",
    });
    expect(third).toMatchObject({
      page: 3,
      hasPrevious: true,
      hasNext: false,
      previousHref: "/software?page=2",
      nextHref: null,
    });
    expect(first?.items[0]?.id).toBe("tool-1");
    expect(second?.items[0]?.id).toBe("tool-13");
    expect(third?.items[0]?.id).toBe("tool-25");
  });

  it("returns null for an out-of-range page instead of a soft 404", () => {
    expect(buildSoftwareCatalogPage({ rows: buildRows(25), locale: "zh", page: 4 })).toBeNull();
    expect(buildSoftwareCatalogPage({ rows: [], locale: "zh", page: 2 })).toBeNull();
    expect(buildSoftwareCatalogPage({ rows: [], locale: "zh", page: 1 })).toMatchObject({
      items: [],
      total: 0,
      totalPages: 0,
    });
  });

  it("builds bilingual canonical detail links and only public card fields", () => {
    const zh = buildSoftwareCatalogPage({ rows: buildRows(2), locale: "zh", page: 1 });
    const en = buildSoftwareCatalogPage({ rows: buildRows(2), locale: "en", page: 1 });

    expect(zh?.items.map((item) => item.detailHref)).toEqual([
      "/software/tool-1",
      "/software/tool-2",
    ]);
    expect(en?.items.map((item) => item.detailHref)).toEqual([
      "/en/software/tool-1",
      "/en/software/tool-2",
    ]);
    expect(en?.items.every((item) => item.name.startsWith("Practical AI Tool"))).toBe(true);
    expect(JSON.stringify({ zh, en })).not.toMatch(
      /fileUrl|filePath|downloadFile|objectKey|delivery|orders|permanentUrl/i,
    );
  });

  it("caps new releases at four and featured products at three using tracked fields", () => {
    const page = buildSoftwareCatalogPage({ rows: buildRows(25), locale: "zh", page: 1 });

    expect(page?.newReleases).toHaveLength(4);
    expect(page?.newReleases.map((item) => item.id)).toEqual([
      "tool-25",
      "tool-24",
      "tool-23",
      "tool-22",
    ]);
    expect(page?.featuredProducts).toHaveLength(3);
    expect(page?.featuredProducts.map((item) => item.id)).toEqual([
      "tool-1",
      "tool-2",
      "tool-3",
    ]);
  });

  it("accepts cache-hit rows after a JSON round trip", () => {
    const cachedRows = JSON.parse(
      JSON.stringify(buildRows(2)),
    ) as PublicSoftwareCatalogRow[];

    expect(
      buildSoftwareCatalogPage({ rows: cachedRows, locale: "zh", page: 1 })
        ?.items,
    ).toHaveLength(2);
  });

  it("uses downloadPrice fallback only for downloadable product types", () => {
    const base = buildRows(1)[0];
    const page = buildSoftwareCatalogPage({
      rows: [
        {
          ...base,
          id: "online-fallback",
          slug: "online-fallback",
          type: "online",
          downloadPrice: 99,
          priceSpecs: [],
        },
        {
          ...base,
          id: "online-spec",
          slug: "online-spec",
          type: "online",
          downloadPrice: 99,
          priceSpecs: [{ price: 8, status: "active", sortOrder: 0 }],
        },
        {
          ...base,
          id: "software-fallback",
          slug: "software-fallback",
          type: "software",
          isDownloadPaid: true,
          downloadPrice: 19,
          priceSpecs: [],
        },
      ],
      locale: "zh",
      page: 1,
    });
    const prices = Object.fromEntries(
      page?.items.map((item) => [item.id, item.price]) ?? [],
    );

    expect(prices).toMatchObject({
      "online-fallback": "免费",
      "online-spec": "¥8.00",
      "software-fallback": "¥19.00",
    });
  });

  it("uses opaque same-origin media URLs and rejects arbitrary external images", () => {
    const base = buildRows(1)[0];
    const page = buildSoftwareCatalogPage({
      rows: [
        {
          ...base,
          id: "cos-cover",
          slug: "cos-cover",
          coverImage:
            "https://enhe-ai-tools-1303691623.cos.ap-shanghai.myqcloud.com/tool-cover-a-skill/cover.png",
        },
        {
          ...base,
          id: "external-cover",
          slug: "external-cover",
          coverImage: "https://tracker.example/cover.png",
        },
      ],
      locale: "zh",
      page: 1,
    });

    expect(page?.items.find((item) => item.id === "cos-cover")?.media?.src).toBe(
      "/api/tool-images?id=cos-cover",
    );
    expect(page?.items.find((item) => item.id === "external-cover")?.media).toBeNull();
    expect(JSON.stringify(page)).not.toContain("myqcloud.com");
  });

  it("falls language switching back to page one when the peer locale lacks that page", () => {
    const rows: PublicSoftwareCatalogRow[] = buildRows(13);
    rows[12] = {
      ...rows[12],
      englishName: null,
      shortDescription: "[[zh]]仅中文公开说明。[[/zh]]",
      content: "[[zh]]仅中文公开内容。[[/zh]]",
    };

    expect(buildSoftwareCatalogLanguageHrefs(rows, undefined, 2)).toEqual({
      zh: "/software?page=2",
      en: "/en/software",
    });
    expect(buildSoftwareCatalogLanguageHrefs(rows, "video", 1)).toEqual({
      zh: "/software?category=video",
      en: "/en/software?category=video",
    });
  });

  it("maps the approved category parameter to a server-filtered result and preserves it in pagination", () => {
    const rows = [
      ...buildRows(13),
      {
        ...buildRows(1)[0],
        id: "audio-tool",
        slug: "audio-tool",
        category: { name: "语音生成" },
      },
    ];
    const video = buildSoftwareCatalogPage({
      rows,
      locale: "zh",
      category: "video",
      page: 1,
    });

    expect(video?.total).toBe(13);
    expect(video?.items).toHaveLength(12);
    expect(video?.nextHref).toBe("/software?category=video&page=2");
    expect(video?.items.every((item) => item.categoryId === "video")).toBe(true);
  });

  it("normalizes page one and rejects invalid pages or categories", () => {
    expect(parseSoftwareCatalogSearchParams({})).toEqual({ page: 1, category: undefined });
    expect(parseSoftwareCatalogSearchParams({ page: "1" })).toEqual({
      page: 1,
      category: undefined,
    });
    expect(parseSoftwareCatalogSearchParams({ category: "all" })).toEqual({
      page: 1,
      category: undefined,
    });
    expect(parseSoftwareCatalogSearchParams({ page: "2", category: "audio" })).toEqual({
      page: 2,
      category: "audio",
    });
    expect(parseSoftwareCatalogSearchParams({ page: "0" })).toBeNull();
    expect(parseSoftwareCatalogSearchParams({ page: "1.5" })).toBeNull();
    expect(parseSoftwareCatalogSearchParams({ page: ["1", "2"] })).toBeNull();
    expect(parseSoftwareCatalogSearchParams({ category: "unknown" })).toBeNull();
  });
});
