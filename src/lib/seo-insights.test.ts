import { describe, expect, it } from "vitest";
import {
  buildSeoInsightReport,
  classifyTrafficSource,
  getSeoContentType,
  seoConversionFunnelSteps
} from "@/lib/seo-insights";

describe("SEO insight helpers", () => {
  it("classifies organic search referrers and keeps available query terms", () => {
    const traffic = classifyTrafficSource({
      pageUrl: "https://www.enhe-tech.com.cn/ai-news?utm_campaign=weekly",
      referrer: "https://www.google.com/search?q=local+ai+deployment"
    });

    expect(traffic.medium).toBe("organic_search");
    expect(traffic.source).toBe("google");
    expect(traffic.searchEngine).toBe("google");
    expect(traffic.searchQuery).toBe("local ai deployment");
    expect(traffic.utmCampaign).toBe("weekly");
  });

  it("requires an exact search-engine domain boundary", () => {
    const spoofed = classifyTrafficSource({
      pageUrl: "https://www.enhe-tech.com.cn/ai-news",
      referrer: "https://google.com.attacker.example/search?q=fake"
    });
    const regionalGoogle = classifyTrafficSource({
      pageUrl: "https://www.enhe-tech.com.cn/ai-news",
      referrer: "https://www.google.com.hk/search?q=ai+workflow"
    });

    expect(spoofed.medium).toBe("referral");
    expect(spoofed.source).toBe("google.com.attacker.example");
    expect(regionalGoogle).toMatchObject({
      medium: "organic_search",
      source: "google",
      searchQuery: "ai workflow"
    });
  });

  it("identifies supported Chinese answer engines by hostname only", () => {
    const cases = [
      ["https://www.doubao.com/chat/123", "doubao"],
      ["https://kimi.com/chat/123", "kimi"],
      ["https://yuanbao.tencent.com/chat/123", "yuanbao"],
      ["https://chat.deepseek.com/a/chat/s/123", "deepseek"]
    ] as const;

    for (const [referrer, source] of cases) {
      expect(classifyTrafficSource({ pageUrl: "https://www.enhe-tech.com.cn/ai-news", referrer })).toMatchObject({
        source,
        medium: "ai_answer_engine"
      });
    }

    expect(classifyTrafficSource({
      pageUrl: "https://www.enhe-tech.com.cn/ai-news",
      referrer: "https://doubao.com.attacker.example/chat"
    })).toMatchObject({ source: "doubao.com.attacker.example", medium: "referral" });
  });

  it("maps public paths to SEO content types", () => {
    expect(getSeoContentType("/")).toBe("home");
    expect(getSeoContentType("/ai-news")).toBe("ai_news_listing");
    expect(getSeoContentType("/en/ai-news/open-source-llm")).toBe("ai_news_article");
    expect(getSeoContentType("/software/faceswap-studio")).toBe("software_detail");
    expect(getSeoContentType("/tools/faceswap-studio")).toBe("software_detail");
    expect(getSeoContentType("/en/account-services/chatgpt-plus")).toBe("account_service_detail");
    expect(getSeoContentType("/skill-learning")).toBe("skill_learning_listing");
    expect(getSeoContentType("/skill-learning/prompt-engineering")).toBe("skill_learning_detail");
  });

  it("turns search and landing-page signals into next action recommendations", () => {
    const report = buildSeoInsightReport({
      events: [
        {
          eventName: "seo_landing_view",
          path: "/ai-news/local-ai-deployment-guide",
          metadata: {
            trafficMedium: "organic_search",
            source: "google",
            contentType: "ai_news_article",
            landingPath: "/ai-news/local-ai-deployment-guide"
          }
        },
        {
          eventName: "search_ai_news",
          path: "/ai-news",
          metadata: { query: "private ai agent deployment" }
        }
      ],
      articles: [{ title: "Local AI deployment guide", keywords: "local ai, deployment" }],
      tools: [{ title: "AI Video Studio", type: "software", categoryName: "AI video" }],
      tutorials: []
    });

    expect(report.summary.organicLandings).toBe(0);
    expect(report.trafficSources.some((item) => item.medium === "organic_search")).toBe(false);
    expect(report.topLandingPages[0]?.path).toBe("/ai-news/local-ai-deployment-guide");
    expect(report.recommendations.some((item) => item.targetType === "article")).toBe(true);
    expect(report.recommendations.some((item) => item.targetType === "service" || item.targetType === "software")).toBe(true);
  });

  it("builds independent content and direct conversion funnels from unique attributable landings", () => {
    const attributed = (
      eventName: string,
      landingId: string,
      firstLandingPath = "/ai-news/guide",
      trafficMedium = "organic_search"
    ) => ({
      eventName,
      metadata: {
        trafficMedium,
        sessionId: `session-${landingId}`,
        landingId,
        firstLandingPath,
        attribution: {
          sessionId: `session-${landingId}`,
          landingId,
          firstLandingPath,
          landingPath: firstLandingPath,
          contentType: "test",
          source: trafficMedium === "organic_search" ? "google" : "test",
          trafficMedium,
          locale: "zh",
          createdAt: 1,
          lastSeenAt: 1,
          attributionVersion: 2
        }
      }
    });
    const events = [
      attributed("seo_landing_view", "landing-a"),
      attributed("seo_landing_view", "landing-a"),
      attributed("seo_landing_view", "landing-b", "/software/product"),
      attributed("seo_landing_view", "landing-ai", "/ai-news/answer", "ai_answer_engine"),
      attributed("seo_landing_view", "landing-campaign", "/pricing", "campaign"),
      attributed("seo_landing_view", "landing-direct", "/", "direct"),
      attributed("content_to_product_click", "landing-a"),
      attributed("content_to_product_click", "landing-a"),
      attributed("view_tool", "landing-a"),
      attributed("view_tool", "landing-b", "/software/product"),
      attributed("product_purchase_cta_click", "landing-a"),
      attributed("begin_checkout", "landing-a"),
      attributed("create_order", "landing-a"),
       attributed("payment_proof_submitted", "landing-a"),
       attributed("payment_review_approved", "landing-a"),
       attributed("product_purchase_cta_click", "landing-b", "/software/product"),
       attributed("begin_checkout", "landing-b", "/software/product"),
       attributed("create_order", "landing-b", "/software/product"),
       attributed("payment_proof_submitted", "landing-b", "/software/product"),
       attributed("payment_review_approved", "landing-b", "/software/product"),
      attributed("content_to_product_click", "landing-ai", "/ai-news/answer", "ai_answer_engine"),
      attributed("view_tool", "landing-ai", "/ai-news/answer", "ai_answer_engine"),
      attributed("create_order", "landing-campaign", "/pricing", "campaign"),
      ...Array.from({ length: 5 }, () => ({ eventName: "create_order" }))
    ];

    const report = buildSeoInsightReport({
      events,
      articles: [],
      tools: [],
      tutorials: []
    });

    expect(report.conversionFunnels.content.rows.map((step) => step.eventName)).toEqual([...seoConversionFunnelSteps]);
    expect(report.conversionFunnels.content.rows.map((step) => step.count)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(report.conversionFunnels.content.rows[1]).toMatchObject({
      stepConversionRate: 100,
      landingConversionRate: 100
    });
    expect(report.conversionFunnels.direct.rows.map((step) => step.eventName)).toEqual([
      "seo_landing_view",
      "view_tool",
      "product_purchase_cta_click",
      "begin_checkout",
      "create_order",
      "payment_proof_submitted",
      "payment_review_approved"
    ]);
    expect(report.conversionFunnels.direct.rows.map((step) => step.count)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(report.conversionFunnels.direct.rows[1]).toMatchObject({
      stepConversionRate: 100,
      landingConversionRate: 100
    });
    expect(report.conversionFunnels.content.rows.concat(report.conversionFunnels.direct.rows).every((step) => step.stepConversionRate <= 100 && step.landingConversionRate <= 100)).toBe(true);
    expect(report.conversionAttribution).toEqual({
      attributedLandings: 2,
      attributedStageLandings: 15,
      unattributedFunnelEvents: 11
    });
    expect(report.summary).toMatchObject({
      organicLandings: 3,
      aiAnswerLandings: 1,
      campaignLandings: 1,
      directLandings: 1,
      conversionEvents: 22
    });
  });

  it("uses nested campaign attribution instead of a conflicting top-level organic cohort", () => {
    const report = buildSeoInsightReport({
      events: [{
        eventName: "seo_landing_view",
        path: "/ai-news/campaign-guide",
        metadata: {
          source: "google",
          trafficMedium: "organic_search",
          attribution: {
            sessionId: "session-campaign",
            landingId: "landing-campaign",
            firstLandingPath: "/ai-news/campaign-guide",
            landingPath: "/ai-news/campaign-guide",
            contentType: "ai_news_article",
            source: "newsletter",
            trafficMedium: "campaign",
            locale: "zh",
            createdAt: 1,
            lastSeenAt: 1,
            attributionVersion: 2
          }
        }
      }],
      articles: [],
      tools: [],
      tutorials: []
    });

    expect(report.summary).toMatchObject({ organicLandings: 0, campaignLandings: 1 });
    expect(report.trafficSources).toEqual([{ source: "newsletter", medium: "campaign", count: 1 }]);
    expect(report.conversionFunnels.content.attributedLandings).toBe(0);
  });

  it("reports nested-only attribution in its cohort instead of direct", () => {
    const report = buildSeoInsightReport({
      events: [{
        eventName: "seo_landing_view",
        path: "/ai-news/answer-guide",
        metadata: {
          attribution: {
            sessionId: "session-answer",
            landingId: "landing-answer",
            firstLandingPath: "/ai-news/answer-guide",
            landingPath: "/ai-news/answer-guide",
            contentType: "ai_news_article",
            source: "perplexity",
            trafficMedium: "ai_answer_engine",
            locale: "zh",
            createdAt: 1,
            lastSeenAt: 1,
            attributionVersion: 2
          }
        }
      }],
      articles: [],
      tools: [],
      tutorials: []
    });

    expect(report.summary).toMatchObject({ aiAnswerLandings: 1, directLandings: 0 });
    expect(report.trafficSources).toEqual([{ source: "perplexity", medium: "ai_answer_engine", count: 1 }]);
  });

  it("rejects top-level-only organic attribution from organic cohorts and funnels", () => {
    const report = buildSeoInsightReport({
      events: [{
        eventName: "seo_landing_view",
        path: "/ai-news/untrusted-organic",
        metadata: {
          sessionId: "session-top-level",
          landingId: "landing-top-level",
          firstLandingPath: "/ai-news/untrusted-organic",
          source: "google",
          trafficMedium: "organic_search"
        }
      }],
      articles: [],
      tools: [],
      tutorials: []
    });

    expect(report.summary.organicLandings).toBe(0);
    expect(report.trafficSources.some((item) => item.medium === "organic_search")).toBe(false);
    expect(report.conversionFunnels.content.attributedLandings).toBe(0);
    expect(report.conversionFunnels.direct.attributedLandings).toBe(0);
  });

  it("builds mutually exclusive cohorts from landing type and keeps unclicked content landings", () => {
    const attributed = (eventName: string, landingId: string, firstLandingPath: string) => ({
      eventName,
      metadata: {
        trafficMedium: "organic_search",
        sessionId: `session-${landingId}`,
        landingId,
        firstLandingPath,
        attribution: {
          sessionId: `session-${landingId}`,
          landingId,
          firstLandingPath,
          landingPath: firstLandingPath,
          contentType: "test",
          source: "google",
          trafficMedium: "organic_search",
          locale: "zh",
          createdAt: 1,
          lastSeenAt: 1,
          attributionVersion: 2
        }
      }
    });
    const report = buildSeoInsightReport({
      events: [
        attributed("seo_landing_view", "news-listing", "/ai-news"),
        attributed("seo_landing_view", "news-article", "/en/ai-news/guide"),
        attributed("seo_landing_view", "tutorial-listing", "/tutorials"),
        attributed("seo_landing_view", "software-detail", "/software/product"),
        attributed("content_to_product_click", "news-article", "/en/ai-news/guide"),
        attributed("content_to_product_click", "software-detail", "/software/product"),
        {
          eventName: "content_to_product_click",
          metadata: {
            sessionId: "session-news-listing",
            landingId: "news-listing",
            firstLandingPath: "/ai-news"
          }
        },
        attributed("view_tool", "news-article", "/en/ai-news/guide"),
        attributed("view_tool", "software-detail", "/software/product")
      ],
      articles: [],
      tools: [],
      tutorials: []
    });

    expect(report.conversionFunnels.content.attributedLandings).toBe(3);
    expect(report.conversionFunnels.content.rows.slice(0, 3)).toMatchObject([
      { eventName: "seo_landing_view", count: 3 },
      { eventName: "content_to_product_click", count: 1, stepConversionRate: 33.3, landingConversionRate: 33.3 },
      { eventName: "view_tool", count: 1 }
    ]);
    expect(report.conversionFunnels.direct.attributedLandings).toBe(1);
    expect(report.conversionFunnels.direct.rows.slice(0, 2)).toMatchObject([
      { eventName: "seo_landing_view", count: 1 },
      { eventName: "view_tool", count: 1 }
    ]);
  });

  it("attributes product conversion activity back to the original SEO landing page", () => {
    const attribution = {
      sessionId: "session-guide",
      landingId: "landing-guide",
      firstLandingPath: "/ai-news/guide",
    };
    const report = buildSeoInsightReport({
      events: [
        {
          eventName: "seo_landing_view",
          path: "/ai-news/guide",
          metadata: {
            landingPath: "/ai-news/guide",
            contentType: "ai_news_article",
            attribution,
          },
        },
        {
          eventName: "content_to_product_click",
          path: "/software/product",
          metadata: { attribution },
        },
        {
          eventName: "view_tool",
          path: "/software/product",
          metadata: { attribution },
        },
      ],
      articles: [],
      tools: [],
      tutorials: [],
    });

    expect(report.topLandingPages[0]).toMatchObject({
      path: "/ai-news/guide",
      conversionCount: 1,
    });
  });
});
