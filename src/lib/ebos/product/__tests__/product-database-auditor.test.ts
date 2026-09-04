import { describe, expect, test, vi } from "vitest";
import { auditProductDatabase } from "../product-database-auditor";

describe("product database auditor", () => {
  test("summarizes total, published, draft, price, download, FAQ, cover, and tag coverage", async () => {
    const prismaClient = {
      tool: {
        findMany: vi.fn(async () => [
          {
            status: "published",
            shortDescription: "Summary",
            content: "Long product content",
            coverImage: "/cover.png",
            screenshots: ["/screen.png"],
            videoUrl: "/demo.mp4",
            isDownloadPaid: true,
            downloadPrice: { toString: () => "19.00" },
            downloadFileId: "file-1",
            onlineUrl: null,
            priceSpecs: [{ id: "price-1" }],
            faqs: [{ id: "faq-1" }],
            tagLinks: [{ id: "tag-1" }]
          },
          {
            status: "draft",
            shortDescription: "Draft",
            content: "",
            coverImage: null,
            screenshots: [],
            videoUrl: null,
            isDownloadPaid: false,
            downloadPrice: { toString: () => "0" },
            downloadFileId: null,
            onlineUrl: null,
            priceSpecs: [],
            faqs: [],
            tagLinks: []
          }
        ])
      }
    };

    const result = await auditProductDatabase({ prismaClient });

    expect(result.databaseSummary).toMatchObject({
      totalProducts: 2,
      publishedProducts: 1,
      draftProducts: 1,
      productsWithPrice: 1,
      productsWithDownload: 1,
      productsWithFaq: 1,
      productsWithCover: 1,
      productsWithTags: 1,
      productsWithSeoFields: 1,
      productsWithGeoFields: 1
    });
    expect(result.warnings).toEqual([]);
  });

  test("does not crash when expected fields are missing from database rows", async () => {
    const prismaClient = {
      tool: {
        findMany: vi.fn(async () => [{ status: "published" }])
      }
    };

    const result = await auditProductDatabase({ prismaClient });

    expect(result.databaseSummary.totalProducts).toBe(1);
    expect(result.databaseSummary.publishedProducts).toBe(1);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "database_field_unavailable"
    }));
  });

  test("returns a warning when the database query is unavailable", async () => {
    const prismaClient = {
      tool: {
        findMany: vi.fn(async () => {
          throw new Error("database unavailable");
        })
      }
    };

    const result = await auditProductDatabase({ prismaClient });

    expect(result.databaseSummary).toMatchObject({
      totalProducts: 0,
      publishedProducts: 0,
      draftProducts: 0
    });
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "database_unavailable",
      severity: "warning"
    }));
  });
});
