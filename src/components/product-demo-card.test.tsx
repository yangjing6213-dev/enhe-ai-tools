import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicProductDemo } from "@/lib/product-demos";
import { ProductDemoCard } from "./product-demo-card";

Object.assign(globalThis, { React });
vi.mock("@/components/product-demo-motion-card", () => ({ ProductDemoMotionCard: ({ children }: { children: React.ReactNode }) => <article>{children}</article> }));
vi.mock("@/lib/product-demos", () => ({
  buildProductDemoPath: () => "/product-demos/demo", getProductDemoCategoryLabel: () => "Software",
  getProductDemoCoverImage: () => null, getLocalizedProductDemoCoverAlt: () => "Demo cover",
  getLocalizedProductDemoDescription: () => "A useful demo", getLocalizedProductDemoProductType: () => "Software",
  getLocalizedProductDemoTags: () => [], getLocalizedProductDemoTitle: () => "Demo title",
  getProductDemoRelatedProductHref: () => "/software/demo",
}));

describe("product demo card heading hierarchy", () => {
  it.each([["listing", "h2"], ["home", "h3"]] as const)("uses %s card headings at %s", (variant, heading) => {
    const html = renderToStaticMarkup(<ProductDemoCard demo={{ slug: "demo" } as PublicProductDemo} locale="en" variant={variant} />);
    expect(html).toContain(`<${heading}><a href="/product-demos/demo">Demo title</a></${heading}>`);
  });
});
