import { describe, expect, test, vi } from "vitest";
import {
  buildCompetitorAuditUrlList,
  runCompetitorSiteAudit
} from "../competitor-site-auditor";
import type { EbosCompetitorSeed } from "../competitor-evidence-types";

function seed(overrides: Partial<EbosCompetitorSeed> = {}): EbosCompetitorSeed {
  return {
    id: "futurepedia",
    name: "Futurepedia",
    url: "https://www.futurepedia.io",
    category: "ai_tool_directory",
    priority: "high",
    source: "manual",
    recommendedAuditPaths: ["/", "/pricing", "/tools"],
    ...overrides
  };
}

describe("competitor site auditor", () => {
  test("builds at most three public audit URLs per competitor", () => {
    const urls = buildCompetitorAuditUrlList(seed(), {
      maxPagesPerCompetitor: 10
    });

    expect(urls.length).toBeLessThanOrEqual(3);
    expect(urls[0]).toBe("https://www.futurepedia.io/");
    expect(urls).toContain("https://www.futurepedia.io/pricing");
  });

  test("does not fetch when network sources are disabled", async () => {
    const fetcher = vi.fn();

    const result = await runCompetitorSiteAudit({
      seeds: [seed()],
      includeNetworkSources: false,
      fetcher
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.competitorAudits).toHaveLength(1);
    expect(result.competitorAudits[0]?.pagesAudited).toBe(0);
    expect(result.competitorAudits[0]?.warnings).toContainEqual(expect.objectContaining({
      code: "competitor_network_disabled"
    }));
  });

  test("network failures produce warnings instead of crashing and stay within page limits", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith("/pricing")) {
        throw new Error("network down");
      }

      return {
        ok: true,
        status: 200,
        text: async () => "<html><title>AI workflow tools</title><body><h1>AI Agent Workflow Pack</h1><a>Pricing</a><button>Buy now</button></body></html>"
      };
    });

    const result = await runCompetitorSiteAudit({
      seeds: [seed()],
      includeNetworkSources: true,
      fetcher,
      maxPagesPerCompetitor: 3
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(result.competitorAudits).toHaveLength(1);
    expect(result.competitorAudits[0]?.pagesAudited).toBe(2);
    expect(result.competitorsAuditedCount).toBe(1);
    expect(result.competitorAudits[0]?.averageScore).toBeGreaterThan(0);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "competitor_page_unavailable",
      source: "market_research"
    }));
  });

  test("honors maxCompetitors and maxTotalUrls across sequential public URL reads", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "<html><title>Prompt Kit Marketplace</title><body><h1>AI Prompt Kit</h1><a>Pricing</a><button>Get started</button><section>FAQ</section></body></html>"
    }));

    const result = await runCompetitorSiteAudit({
      seeds: [
        seed({ id: "one", name: "One", url: "https://one.example" }),
        seed({ id: "two", name: "Two", url: "https://two.example" }),
        seed({ id: "three", name: "Three", url: "https://three.example" })
      ],
      includeNetworkSources: true,
      fetcher,
      maxCompetitors: 2,
      maxPagesPerCompetitor: 3,
      maxTotalUrls: 4
    });

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(result.competitorAudits).toHaveLength(2);
    expect(result.pagesAttempted).toBe(4);
    expect(result.pagesSucceeded).toBe(4);
    expect(result.pagesFailed).toBe(0);
    expect(result.competitorsAuditedCount).toBe(2);
  });

  test("requestTimeoutMs records a failed page without hanging the audit", async () => {
    const result = await runCompetitorSiteAudit({
      seeds: [seed()],
      includeNetworkSources: true,
      fetcher: () => new Promise(() => undefined),
      maxPagesPerCompetitor: 1,
      requestTimeoutMs: 1
    });

    expect(result.pagesAttempted).toBe(1);
    expect(result.pagesSucceeded).toBe(0);
    expect(result.pagesFailed).toBe(1);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "competitor_page_unavailable"
    }));
  });
});
