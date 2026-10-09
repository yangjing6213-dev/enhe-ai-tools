import React, { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StructuredData } from "@/components/structured-data";
import {
  SoftwarePageShell,
} from "@/app/software/page-shell";
import type { SoftwareCatalogPage } from "@/lib/redesign/software/software-production";

Object.assign(globalThis, { React });

function findElement(node: ReactNode, type: unknown): ReactNode | null {
  if (!isValidElement<{ children?: ReactNode }>(node)) return null;
  if (node.type === type) return node;

  for (const child of Children.toArray(node.props.children)) {
    const match = findElement(child, type);
    if (match) return match;
  }

  return null;
}

function emptyListing(): SoftwareCatalogPage {
  return {
    items: [],
    newReleases: [],
    featuredProducts: [],
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0,
    hasPrevious: false,
    hasNext: false,
    previousHref: null,
    nextHref: null,
  };
}

describe("software page schema boundary", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps BreadcrumbList but omits an empty CollectionPage and ItemList", async () => {
    const tree = await SoftwarePageShell({
      searchParams: Promise.resolve({}),
      forceLocale: "en",
      preloadedListing: emptyListing(),
    });
    const structuredData = findElement(tree, StructuredData);
    expect(isValidElement(structuredData)).toBe(true);

    const schemas = (structuredData as ReturnType<typeof StructuredData>).props
      .data as Array<{ "@type": string }>;
    expect(schemas.map((schema) => schema["@type"])).toEqual(["BreadcrumbList"]);
  });

  it("renders the DB-free state inside the redesign shell with one recovery action", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const tree = await SoftwarePageShell({
      searchParams: Promise.resolve({}),
      forceLocale: "en",
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('class="redesign-software redesign-software-page"');
    expect(html).toContain('data-content-status="UNVERIFIED"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Software catalog preview");
    expect(html).toContain(
      "Software catalog content is not available in this local preview.",
    );
    expect(html).toContain("Return to ENHE AI home");
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html.match(/redesign-software-empty-action/g)).toHaveLength(1);
    const statusStart = html.indexOf('role="status"');
    const statusEnd = html.indexOf("</p>", statusStart);
    const actionStart = html.indexOf("redesign-software-empty-action");
    expect(actionStart).toBeGreaterThan(statusEnd);
  });

  it("keeps the configured empty-catalog recovery action outside the status message", async () => {
    const tree = await SoftwarePageShell({
      searchParams: Promise.resolve({}),
      forceLocale: "en",
      preloadedListing: emptyListing(),
    });
    const html = renderToStaticMarkup(tree);
    const statusStart = html.indexOf('role="status"');
    const statusEnd = html.indexOf("</p>", statusStart);
    const actionStart = html.indexOf("redesign-software-empty-action");

    expect(statusStart).toBeGreaterThanOrEqual(0);
    expect(statusEnd).toBeGreaterThan(statusStart);
    expect(actionStart).toBeGreaterThan(statusEnd);
  });

  it("keeps the collection schema for a non-empty configured catalog", async () => {
    const tree = await SoftwarePageShell({
      searchParams: Promise.resolve({}),
      forceLocale: "en",
      preloadedListing: {
        ...emptyListing(),
        items: [
          {
            id: "tool-1",
            type: "software", secondaryName: null, isPaid: false, highlights: ["Software app", "Free trial", "Clear access"], downloadCount: 0, usageCount: 0,
            categoryId: "video",
            name: "Verified Tool",
            description: "A verified public tool.",
            price: "Free",
            detailHref: "/en/software/tool-1",
            media: null,
          },
        ],
        total: 1,
        totalPages: 1,
      },
    });
    const structuredData = findElement(tree, StructuredData);
    const schemas = (structuredData as ReturnType<typeof StructuredData>).props
      .data as Array<{ "@type": string }>;
    expect(schemas.map((schema) => schema["@type"])).toEqual([
      "BreadcrumbList",
      "CollectionPage",
    ]);
  });
});
