import { describe, expect, it } from "vitest";
import {
  GEO_MONITORING_PROVIDERS,
  GEO_MONITORING_QUERIES,
  GEO_MINIMUM_VALID_SAMPLE_SIZE,
  buildGeoMonitoringReport,
  isConfiguredGeoProvider,
  isConfiguredGeoQuery,
  isOfficialEnheCitationUrl,
  resolveGeoVisibilityStatus
} from "@/lib/geo-monitoring";

describe("GEO monitoring rules", () => {
  it("ships at least 20 core GEO queries for ENHE AI content planning", () => {
    expect(GEO_MONITORING_QUERIES.length).toBeGreaterThanOrEqual(20);

    const queries = GEO_MONITORING_QUERIES.map((item) => item.query);
    expect(queries).toContain("AI智能体工具推荐");
    expect(queries).toContain("本地部署AI应用");
    expect(queries).toContain("AI账号服务合规使用");
    expect(queries).toContain("AI Agent tools for workflow automation");
  });

  it("covers global and China AI search providers with stable review modes", () => {
    const providerIds = GEO_MONITORING_PROVIDERS.map((provider) => provider.id);

    for (const id of [
      "google-ai-overview",
      "chatgpt-search",
      "perplexity",
      "bing-copilot",
      "claude-search",
      "baidu-search",
      "doubao",
      "kimi",
      "tongyi",
      "tencent-yuanbao",
      "deepseek"
    ]) {
      expect(providerIds).toContain(id);
    }

    expect(GEO_MONITORING_PROVIDERS.filter((provider) => provider.region === "china").length).toBeGreaterThanOrEqual(6);
    expect(GEO_MONITORING_PROVIDERS.find((provider) => provider.id === "doubao")?.mode).toBe("manual_browser");
    expect(GEO_MONITORING_PROVIDERS.find((provider) => provider.id === "baidu-search")?.mode).toBe("manual_browser");
  });

  it("turns citation gaps into prioritized GEO content actions", () => {
    const report = buildGeoMonitoringReport({
      queryResults: [
        {
          query: "AI账号服务合规使用",
          providerId: "baidu-search",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: ["example competitor"]
        },
        {
          query: "本地部署AI应用",
          providerId: "perplexity",
          isBrandMentioned: true,
          isDomainCited: false,
          citedUrls: ["https://example.com/local-ai"],
          competitors: []
        }
      ]
    });

    expect(report.summary.totalQueries).toBeGreaterThanOrEqual(20);
    expect(report.summary.totalProviders).toBeGreaterThanOrEqual(11);
    expect(report.summary.chinaProviders).toBeGreaterThanOrEqual(6);
    expect(report.recommendations.some((item) => item.type === "faq")).toBe(true);
    expect(report.recommendations.some((item) => item.type === "comparison_table")).toBe(true);
    expect(report.recommendations.some((item) => item.type === "source_citation")).toBe(true);
    expect(report.recommendations.some((item) => item.type === "okf_concept")).toBe(true);
  });

  it("prioritizes Chinese ordinary AI user demand rather than technical-only GEO prompts", () => {
    const queries = GEO_MONITORING_QUERIES.map((item) => item.query);

    for (const query of [
      "普通人怎么用AI提高工作效率",
      "适合创作者的AI工具推荐",
      "AI视频生成工具怎么选",
      "AI工具隐私安全吗",
      "AI提示词怎么学",
      "怎么用AI整理资料",
      "AI工具购买前要注意什么",
      "AI账号服务安全吗"
    ]) {
      expect(queries).toContain(query);
    }

    const chinaQueries = GEO_MONITORING_QUERIES.filter((item) => item.locale === "zh");
    expect(chinaQueries.filter((item) => item.tags.includes("普通AI用户")).length).toBeGreaterThanOrEqual(8);
    expect(chinaQueries.filter((item) => item.targetPath === "/software").length).toBeGreaterThanOrEqual(5);
  });

  it("excludes uncollected and unavailable checks from citation-rate denominators", () => {
    const report = buildGeoMonitoringReport({
      queryResults: [
        {
          query: "AI Agent tools for workflow automation",
          providerId: "perplexity",
          isBrandMentioned: true,
          isDomainCited: true,
          citedUrls: ["https://www.enhe-tech.com.cn/software"],
          answerSummary: "ENHE AI is cited as an official source.",
          competitors: []
        },
        {
          query: "best AI productivity tools for creators",
          providerId: "chatgpt-search",
          isBrandMentioned: true,
          isDomainCited: false,
          citedUrls: [],
          competitors: []
        },
        {
          query: "AI工具隐私安全吗",
          providerId: "doubao",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: []
        },
        {
          query: "generative AI search optimization",
          providerId: "claude-search",
          collectionStatus: "unavailable",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: []
        }
      ]
    });

    expect(report.summary.recordedResults).toBe(4);
    expect(report.summary.reviewedResults).toBe(3);
    expect(report.summary.domainCitationRate).toBe(33);
    expect(report.summary.brandMentionRate).toBe(67);
    expect(report.summary.unavailableResults).toBe(1);
    expect(report.summary.openGaps).toBe(2);
  });

  it("does not create content recommendations from missing collection data", () => {
    const result = {
      query: "AI Agent tools for workflow automation",
      providerId: "chatgpt-search",
      collectionStatus: "uncollected" as const,
      isBrandMentioned: false,
      isDomainCited: false,
      citedUrls: [],
      competitors: []
    };
    const report = buildGeoMonitoringReport({ queryResults: [result] });

    expect(resolveGeoVisibilityStatus(result)).toBe("uncollected");
    expect(report.summary.reviewedResults).toBe(0);
    expect(report.recommendations).toEqual([]);
  });

  it("requires an official citation URL plus answer or screenshot evidence", () => {
    const baseResult = {
      query: "AI Agent tools for workflow automation",
      providerId: "perplexity",
      collectionStatus: "collected" as const,
      isBrandMentioned: false,
      isDomainCited: true,
      competitors: []
    };

    expect(resolveGeoVisibilityStatus({
      ...baseResult,
      citedUrls: [],
      answerSummary: "The checkbox alone must not count."
    })).toBe("absent");
    expect(resolveGeoVisibilityStatus({
      ...baseResult,
      citedUrls: ["https://www.enhe-tech.com.cn/software"]
    })).toBe("absent");
    expect(resolveGeoVisibilityStatus({
      ...baseResult,
      citedUrls: ["https://www.enhe-tech.com.cn/software"],
      answerSummary: "The answer cites ENHE AI."
    })).toBe("cited");
    expect(resolveGeoVisibilityStatus({
      ...baseResult,
      citedUrls: ["https://enhe-tech.com.cn/ai-news/example"],
      screenshotUrl: "https://evidence.example/geo-check.png"
    })).toBe("cited");
  });

  it("recognizes only the official ENHE hostnames", () => {
    expect(isOfficialEnheCitationUrl("https://enhe-tech.com.cn/software")).toBe(true);
    expect(isOfficialEnheCitationUrl("https://www.enhe-tech.com.cn/ai-news/example")).toBe(true);
    expect(isOfficialEnheCitationUrl("https://enhe-tech.com.cn.evil.example/path")).toBe(false);
    expect(isOfficialEnheCitationUrl("https://evil.example/?url=enhe-tech.com.cn")).toBe(false);
    expect(isOfficialEnheCitationUrl("not a URL containing enhe-tech.com.cn")).toBe(false);
  });

  it("uses only the latest result for each query and provider", () => {
    const report = buildGeoMonitoringReport({
      queryResults: [
        {
          query: "AI Agent tools for workflow automation",
          providerId: "perplexity",
          checkedAt: "2026-07-01T09:00:00.000Z",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: ["old competitor"]
        },
        {
          query: "AI Agent tools for workflow automation",
          providerId: "perplexity",
          checkedAt: "2026-07-02T09:00:00.000Z",
          isBrandMentioned: true,
          isDomainCited: true,
          citedUrls: ["https://www.enhe-tech.com.cn/software"],
          answerSummary: "The latest answer cites ENHE AI.",
          competitors: []
        }
      ]
    });

    expect(report.summary.recordedResults).toBe(1);
    expect(report.summary.reviewedResults).toBe(1);
    expect(report.summary.citedResults).toBe(1);
    expect(report.summary.absentResults).toBe(0);
    expect(report.summary.domainCitationRate).toBeNull();
    expect(report.recommendations).toEqual([]);
  });

  it("does not reuse an old absent result when the latest check is unavailable", () => {
    const report = buildGeoMonitoringReport({
      queryResults: [
        {
          query: "best AI productivity tools for creators",
          providerId: "chatgpt-search",
          checkedAt: "2026-07-01T09:00:00.000Z",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: []
        },
        {
          query: "best AI productivity tools for creators",
          providerId: "chatgpt-search",
          checkedAt: "2026-07-02T09:00:00.000Z",
          collectionStatus: "unavailable",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: []
        }
      ]
    });

    expect(report.summary.recordedResults).toBe(1);
    expect(report.summary.reviewedResults).toBe(0);
    expect(report.summary.unavailableResults).toBe(1);
    expect(report.summary.evidenceStatus).toBe("insufficient");
    expect(report.summary.firstCheckedAt).toBe("2026-07-02T09:00:00.000Z");
    expect(report.summary.lastCheckedAt).toBe("2026-07-02T09:00:00.000Z");
    expect(report.summary.openGaps).toBe(0);
    expect(report.recommendations).toEqual([]);
  });

  it("requires a minimum sample before displaying visibility percentages", () => {
    const report = buildGeoMonitoringReport({
      queryResults: [
        {
          query: "AI Agent tools for workflow automation",
          providerId: "perplexity",
          isBrandMentioned: true,
          isDomainCited: true,
          citedUrls: ["https://www.enhe-tech.com.cn/software"],
          answerSummary: "The answer cites ENHE AI.",
          competitors: []
        }
      ]
    });

    expect(GEO_MINIMUM_VALID_SAMPLE_SIZE).toBe(3);
    expect(report.summary.validSampleCount).toBe(1);
    expect(report.summary.hasSufficientSample).toBe(false);
    expect(report.summary.evidenceStatus).toBe("insufficient");
    expect(report.summary.brandMentionRate).toBeNull();
    expect(report.summary.domainCitationRate).toBeNull();
  });

  it("keeps an empty report free of fabricated dates and percentages", () => {
    const report = buildGeoMonitoringReport();

    expect(report.summary.recordedResults).toBe(0);
    expect(report.summary.validSampleCount).toBe(0);
    expect(report.summary.evidenceStatus).toBe("no_records");
    expect(report.summary.brandMentionRate).toBeNull();
    expect(report.summary.domainCitationRate).toBeNull();
    expect(report.summary.targetCoverageRate).toBeNull();
    expect(report.summary.firstCheckedAt).toBeNull();
    expect(report.summary.lastCheckedAt).toBeNull();
    expect(report.recommendations).toEqual([]);
  });

  it("reports target coverage, date range, and the latest manual check", () => {
    const queryResults = [
      ["AI Agent tools for workflow automation", "perplexity", "2026-07-01T01:00:00.000Z"],
      ["AI工具隐私安全吗", "doubao", "2026-07-02T01:00:00.000Z"],
      ["AI提示词怎么学", "chatgpt-search", "2026-07-03T01:00:00.000Z"]
    ].map(([query, providerId, checkedAt]) => ({
      query,
      providerId,
      checkedAt,
      isBrandMentioned: false,
      isDomainCited: false,
      citedUrls: [],
      competitors: []
    }));
    const report = buildGeoMonitoringReport({ queryResults });

    expect(report.summary.validSampleCount).toBe(3);
    expect(report.summary.targetSampleCount).toBe(
      GEO_MONITORING_QUERIES.length * report.summary.eligibleProviders,
    );
    expect(report.summary.targetCoverageRate).toBe(1);
    expect(report.summary.evidenceStatus).toBe("sufficient");
    expect(report.summary.firstCheckedAt).toBe("2026-07-01T01:00:00.000Z");
    expect(report.summary.lastCheckedAt).toBe("2026-07-03T01:00:00.000Z");
  });

  it("excludes search performance providers from AI rates and recommendations", () => {
    const report = buildGeoMonitoringReport({
      queryResults: [
        {
          query: "AI Agent tools for workflow automation",
          providerId: "google-search-console",
          isBrandMentioned: true,
          isDomainCited: true,
          citedUrls: ["https://www.enhe-tech.com.cn/software"],
          answerSummary: "Search Console reported an impression.",
          competitors: []
        },
        {
          query: "best local AI deployment tools",
          providerId: "bing-copilot",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: ["Competitor"]
        },
        {
          query: "AI工具隐私安全吗",
          providerId: "doubao",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: ["Competitor"]
        },
        {
          query: "AI提示词怎么学",
          providerId: "perplexity",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: []
        },
        {
          query: "AI账号服务安全吗",
          providerId: "chatgpt-search",
          isBrandMentioned: false,
          isDomainCited: false,
          citedUrls: [],
          competitors: []
        }
      ]
    });

    expect(report.summary.recordedResults).toBe(5);
    expect(report.summary.excludedResults).toBe(2);
    expect(report.summary.validSampleCount).toBe(3);
    expect(report.summary.domainCitationRate).toBe(0);
    expect(report.recommendations.every((item) => item.query !== "AI Agent tools for workflow automation")).toBe(true);
    expect(report.recommendations.every((item) => item.query !== "best local AI deployment tools")).toBe(true);
  });

  it("uses a deterministic winner when same-time results conflict", () => {
    const result = {
      query: "AI Agent tools for workflow automation",
      providerId: "perplexity",
      checkedAt: "2026-07-02T09:00:00.000Z",
      isBrandMentioned: true,
      isDomainCited: true,
      citedUrls: ["https://www.enhe-tech.com.cn/software"],
      answerSummary: "The answer cites ENHE AI.",
      competitors: []
    };
    const conflicting = {
      ...result,
      isBrandMentioned: false,
      isDomainCited: false,
      citedUrls: [],
      answerSummary: null
    };

    const first = buildGeoMonitoringReport({ queryResults: [result, conflicting] });
    const second = buildGeoMonitoringReport({ queryResults: [conflicting, result] });

    expect(second.summary).toEqual(first.summary);
    expect(second.recommendations).toEqual(first.recommendations);
  });

  it("only recognizes configured query and provider values", () => {
    expect(isConfiguredGeoQuery("AI Agent tools for workflow automation")).toBe(true);
    expect(isConfiguredGeoQuery("arbitrary query")).toBe(false);
    expect(isConfiguredGeoProvider("perplexity")).toBe(true);
    expect(isConfiguredGeoProvider("arbitrary-provider")).toBe(false);
  });
});
