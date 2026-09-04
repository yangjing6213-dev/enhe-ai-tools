import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getOperationManualAssetPath,
  getOperationManualBySlug,
  getOperationManualFilePath,
  operationManuals
} from "@/lib/operation-manuals";

describe("operation manuals registry", () => {
  it("registers the first two HTML manuals from docs/operation-manuals", () => {
    expect(operationManuals.map((manual) => manual.slug)).toEqual([
      "geo-monthly-audit-operations",
      "enhe-gsc-seo-tutorial"
    ]);

    for (const manual of operationManuals) {
      expect(manual.title).toBeTruthy();
      expect(manual.description).toBeTruthy();
      expect(manual.category).toBeTruthy();
      expect(manual.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(manual.fileName.endsWith(".html")).toBe(true);
      expect(existsSync(getOperationManualFilePath(manual))).toBe(true);
    }
  });

  it("resolves manuals by slug and rejects unknown slugs", () => {
    expect(getOperationManualBySlug("geo-monthly-audit-operations")?.title).toContain("GEO");
    expect(getOperationManualBySlug("../secret")).toBeNull();
    expect(getOperationManualBySlug("missing")).toBeNull();
  });

  it("resolves only safe asset paths inside a manual asset folder", () => {
    const assetPath = getOperationManualAssetPath("enhe-gsc-seo-tutorial/page-001.png");

    expect(assetPath).toContain("docs");
    expect(assetPath).toContain("operation-manuals");
    expect(assetPath).toContain("assets");
    expect(assetPath).toContain("enhe-gsc-seo-tutorial");
    expect(getOperationManualAssetPath("../private.env")).toBeNull();
    expect(getOperationManualAssetPath("enhe-gsc-seo-tutorial/../../private.env")).toBeNull();
  });
});
