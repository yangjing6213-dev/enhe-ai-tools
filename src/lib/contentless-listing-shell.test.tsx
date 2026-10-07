import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Container: ({
      className,
      children,
    }: {
      className?: string;
      children?: React.ReactNode;
    }) => React.createElement("div", { className }, children),
  };
});

import {
  AiTrendDailyArchivePageShell,
  generateAiTrendDailyArchiveMetadata,
} from "@/app/ai-trends/daily/page-shell";
import {
  generateProductDemoListingMetadata,
  ProductDemoListingPageShell,
} from "@/app/product-demos/page-shell";

describe("contentless public listing shells", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the DB-free product demo route as a noindex contentless shell", async () => {
    const metadata = await generateProductDemoListingMetadata(
      "en",
      Promise.resolve({}),
    );
    const markup = renderToStaticMarkup(
      await ProductDemoListingPageShell({
        forceLocale: "en",
        searchParams: Promise.resolve({}),
      }),
    );

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(markup).toContain('data-shell-state="contentless"');
    expect(markup).toContain("UNVERIFIED");
    expect(markup).not.toContain("CollectionPage");
    expect(markup).not.toContain("ItemList");
    expect(markup).not.toMatch(/[\u3400-\u9fff]/);
  });

  it("keeps the DB-free daily trend archive as a noindex contentless shell", async () => {
    const metadata = generateAiTrendDailyArchiveMetadata("zh");
    const markup = renderToStaticMarkup(
      await AiTrendDailyArchivePageShell({ forceLocale: "zh" }),
    );

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(markup).toContain('data-shell-state="contentless"');
    expect(markup).toContain("UNVERIFIED");
    expect(markup).not.toContain("暂无分析");
  });
});
