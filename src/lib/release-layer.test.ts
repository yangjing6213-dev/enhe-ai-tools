import { describe, expect, it } from "vitest";
import { productReleaseStatusMeta, releaseLayerLabels, summarizeReleaseLayers } from "@/lib/release-layer";

describe("release layer helpers", () => {
  it("names the three release layers clearly", () => {
    expect(releaseLayerLabels).toEqual({
      development: "开发版本",
      product: "产品版本",
      tool: "工具版本"
    });
  });

  it("summarizes release layer counts", () => {
    expect(summarizeReleaseLayers({ developmentVersions: 2, productReleases: 1, toolChangelogs: 5 })).toEqual([
      { key: "development", label: "开发版本", count: 2 },
      { key: "product", label: "产品版本", count: 1 },
      { key: "tool", label: "工具版本", count: 5 }
    ]);
  });

  it("uses the approved night glass accent classes for release status chips", () => {
    const classNames = Object.values(productReleaseStatusMeta).map((meta) => meta.className).join(" ");

    expect(classNames).toContain("var(--marketing-accent)");
    expect(classNames).not.toContain("#48F5D3");
    expect(classNames).not.toContain("#7AA7FF");
    expect(classNames).not.toContain("#7DD3FC");
  });
});
