import { describe, expect, it } from "vitest";
import {
  buildSeoInsightReport,
  classifyTrafficSource,
  getSeoContentType
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

    expect(report.summary.organicLandings).toBe(1);
    expect(report.topLandingPages[0]?.path).toBe("/ai-news/local-ai-deployment-guide");
    expect(report.recommendations.some((item) => item.targetType === "article")).toBe(true);
    expect(report.recommendations.some((item) => item.targetType === "service" || item.targetType === "software")).toBe(true);
  });
});
