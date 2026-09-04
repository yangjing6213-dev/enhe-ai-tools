export type TrafficMedium = "direct" | "internal" | "organic_search" | "ai_answer_engine" | "referral" | "campaign";

export type SeoContentType =
  | "home"
  | "ai_news_listing"
  | "ai_news_article"
  | "software_listing"
  | "software_detail"
  | "account_service_listing"
  | "account_service_detail"
  | "skill_learning_listing"
  | "skill_learning_detail"
  | "tutorial_listing"
  | "pricing"
  | "legal"
  | "other";

export type SeoTrafficInfo = {
  source: string;
  medium: TrafficMedium;
  searchEngine?: string;
  searchQuery?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export type SeoInsightEvent = {
  eventName: string;
  path?: string | null;
  metadata?: unknown;
  createdAt?: Date | string | null;
};

export type SeoInsightContentItem = {
  title: string;
  keywords?: string | null;
  seoKeywords?: string | null;
  summary?: string | null;
  type?: string | null;
  categoryName?: string | null;
};

export type SeoInsightRecommendation = {
  targetType: "article" | "software" | "service" | "course" | "technical_seo";
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  action: string;
  keyword?: string;
};

export type SeoInsightReport = {
  summary: {
    totalSeoViews: number;
    organicLandings: number;
    aiAnswerLandings: number;
    internalViews: number;
    searchEvents: number;
    conversionEvents: number;
  };
  trafficSources: Array<{ source: string; medium: string; count: number }>;
  topLandingPages: Array<{ path: string; count: number; contentType: SeoContentType; conversionCount: number }>;
  searchQueries: Array<{ query: string; count: number; covered: boolean }>;
  contentTypeMix: Array<{ contentType: SeoContentType; count: number }>;
  recommendations: SeoInsightRecommendation[];
};

const siteHosts = new Set(["www.enhe-tech.com.cn", "enhe-tech.com.cn"]);

const searchEngines = [
  { source: "google", hosts: ["google."], queryKeys: ["q"] },
  { source: "bing", hosts: ["bing.com"], queryKeys: ["q"] },
  { source: "baidu", hosts: ["baidu.com"], queryKeys: ["wd", "word"] },
  { source: "sogou", hosts: ["sogou.com"], queryKeys: ["query", "keyword"] },
  { source: "360", hosts: ["so.com"], queryKeys: ["q"] },
  { source: "duckduckgo", hosts: ["duckduckgo.com"], queryKeys: ["q"] },
  { source: "yahoo", hosts: ["search.yahoo.com"], queryKeys: ["p"] },
  { source: "yandex", hosts: ["yandex."], queryKeys: ["text"] },
  { source: "naver", hosts: ["search.naver.com"], queryKeys: ["query"] }
] as const;

const aiAnswerEngines = [
  { source: "perplexity", hosts: ["perplexity.ai"], queryKeys: ["q"] },
  { source: "chatgpt", hosts: ["chatgpt.com"], queryKeys: ["q"] },
  { source: "copilot", hosts: ["copilot.microsoft.com"], queryKeys: ["q"] },
  { source: "gemini", hosts: ["gemini.google.com"], queryKeys: ["q"] }
] as const;

const socialHosts = ["weibo.com", "xiaohongshu.com", "zhihu.com", "bilibili.com", "douyin.com", "x.com", "twitter.com", "linkedin.com", "reddit.com"];

export function classifyTrafficSource({
  pageUrl,
  referrer
}: {
  pageUrl: string;
  referrer?: string | null;
}): SeoTrafficInfo {
  const page = safeUrl(pageUrl);
  const utmSource = page?.searchParams.get("utm_source")?.trim() || undefined;
  const utmMedium = page?.searchParams.get("utm_medium")?.trim() || undefined;
  const utmCampaign = page?.searchParams.get("utm_campaign")?.trim() || undefined;

  if (utmSource || utmMedium) {
    const referrerInfo = classifyReferrer(referrer);
    return {
      source: utmSource ?? referrerInfo.source,
      medium: "campaign",
      searchEngine: referrerInfo.searchEngine,
      searchQuery: referrerInfo.searchQuery,
      referrerHost: referrerInfo.referrerHost,
      utmSource,
      utmMedium,
      utmCampaign
    };
  }

  const referrerInfo = classifyReferrer(referrer);
  return {
    ...referrerInfo,
    utmCampaign
  };
}

export function getSeoContentType(pathname: string | null | undefined): SeoContentType {
  const path = normalizePublicPath(pathname);
  if (path === "/") return "home";
  if (path === "/ai-news") return "ai_news_listing";
  if (path.startsWith("/ai-news/")) return "ai_news_article";
  if (path === "/software") return "software_listing";
  if (path.startsWith("/software/") || path.startsWith("/tools/")) return "software_detail";
  if (path === "/account-services" || path === "/online-tools") return "account_service_listing";
  if (path.startsWith("/account-services/") || path.startsWith("/online-tools/")) return "account_service_detail";
  if (path === "/skill-learning") return "skill_learning_listing";
  if (path.startsWith("/skill-learning/")) return "skill_learning_detail";
  if (path === "/tutorials") return "tutorial_listing";
  if (path === "/pricing") return "pricing";
  if (path.startsWith("/legal/")) return "legal";
  return "other";
}

export function isSeoTrackablePath(pathname: string | null | undefined) {
  const path = normalizePublicPath(pathname);
  if (path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/orders") || path.startsWith("/user")) return false;
  if (path === "/login" || path === "/register") return false;
  return getSeoContentType(path) !== "other";
}

export function buildSeoInsightReport(input: {
  events: SeoInsightEvent[];
  articles: SeoInsightContentItem[];
  tools: SeoInsightContentItem[];
  tutorials: SeoInsightContentItem[];
}): SeoInsightReport {
  const seoEvents = input.events.filter((event) => event.eventName === "seo_landing_view");
  const searchEvents = input.events.filter((event) => event.eventName === "search_ai_news");
  const conversionEvents = input.events.filter((event) =>
    ["create_order", "payment_proof_submitted", "payment_review_approved", "click_open_vip"].includes(event.eventName)
  );

  const trafficSources = new Map<string, { source: string; medium: string; count: number }>();
  const landingPages = new Map<string, { path: string; count: number; contentType: SeoContentType; conversionCount: number }>();
  const contentTypes = new Map<SeoContentType, { contentType: SeoContentType; count: number }>();
  const queryCounts = new Map<string, number>();

  for (const event of seoEvents) {
    const metadata = getMetadataRecord(event.metadata);
    const source = stringValue(metadata.source) || "direct";
    const medium = stringValue(metadata.trafficMedium) || "direct";
    const sourceKey = `${source}:${medium}`;
    const landingPath = stringValue(metadata.landingPath) || event.path || "/";
    const contentType = normalizeSeoContentType(stringValue(metadata.contentType)) ?? getSeoContentType(landingPath);
    const searchQuery = normalizeQuery(stringValue(metadata.searchQuery));

    if (searchQuery) queryCounts.set(searchQuery, (queryCounts.get(searchQuery) ?? 0) + 1);
    trafficSources.set(sourceKey, {
      source,
      medium,
      count: (trafficSources.get(sourceKey)?.count ?? 0) + 1
    });
    landingPages.set(landingPath, {
      path: landingPath,
      count: (landingPages.get(landingPath)?.count ?? 0) + 1,
      contentType,
      conversionCount: landingPages.get(landingPath)?.conversionCount ?? 0
    });
    contentTypes.set(contentType, {
      contentType,
      count: (contentTypes.get(contentType)?.count ?? 0) + 1
    });
  }

  for (const event of conversionEvents) {
    const path = event.path || "/";
    const landing = landingPages.get(path);
    if (landing) landingPages.set(path, { ...landing, conversionCount: landing.conversionCount + 1 });
  }

  for (const event of searchEvents) {
    const metadata = getMetadataRecord(event.metadata);
    const query = normalizeQuery(stringValue(metadata.query));
    if (query) queryCounts.set(query, (queryCounts.get(query) ?? 0) + 1);
  }

  const contentCorpus = [...input.articles, ...input.tools, ...input.tutorials];
  const searchQueries = Array.from(queryCounts.entries())
    .map(([query, count]) => ({
      query,
      count,
      covered: isKeywordCovered(query, contentCorpus)
    }))
    .sort((left, right) => right.count - left.count || left.query.localeCompare(right.query));

  const topLandingPages = Array.from(landingPages.values()).sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));
  const recommendations = buildRecommendations({
    searchQueries,
    topLandingPages,
    contentTypeMix: Array.from(contentTypes.values()),
    events: input.events
  });

  return {
    summary: {
      totalSeoViews: seoEvents.length,
      organicLandings: seoEvents.filter((event) => stringValue(getMetadataRecord(event.metadata).trafficMedium) === "organic_search").length,
      aiAnswerLandings: seoEvents.filter((event) => stringValue(getMetadataRecord(event.metadata).trafficMedium) === "ai_answer_engine").length,
      internalViews: seoEvents.filter((event) => stringValue(getMetadataRecord(event.metadata).trafficMedium) === "internal").length,
      searchEvents: searchEvents.length,
      conversionEvents: conversionEvents.length
    },
    trafficSources: Array.from(trafficSources.values()).sort((left, right) => right.count - left.count),
    topLandingPages,
    searchQueries,
    contentTypeMix: Array.from(contentTypes.values()).sort((left, right) => right.count - left.count),
    recommendations
  };
}

function classifyReferrer(referrer?: string | null): SeoTrafficInfo {
  const url = safeUrl(referrer || "");
  if (!url) return { source: "direct", medium: "direct" };

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (siteHosts.has(host)) return { source: "internal", medium: "internal", referrerHost: host };

  const aiEngine = aiAnswerEngines.find((engine) => engine.hosts.some((knownHost) => host.includes(knownHost)));
  if (aiEngine) {
    return {
      source: aiEngine.source,
      medium: "ai_answer_engine",
      searchEngine: aiEngine.source,
      searchQuery: getQueryFromUrl(url, aiEngine.queryKeys),
      referrerHost: host
    };
  }

  const searchEngine = searchEngines.find((engine) => engine.hosts.some((knownHost) => host.includes(knownHost)));
  if (searchEngine) {
    return {
      source: searchEngine.source,
      medium: "organic_search",
      searchEngine: searchEngine.source,
      searchQuery: getQueryFromUrl(url, searchEngine.queryKeys),
      referrerHost: host
    };
  }

  const socialSource = socialHosts.find((knownHost) => host.includes(knownHost));
  return {
    source: socialSource ? socialSource.replace(".com", "") : host,
    medium: "referral",
    referrerHost: host
  };
}

function buildRecommendations({
  searchQueries,
  topLandingPages,
  contentTypeMix
}: {
  searchQueries: Array<{ query: string; count: number; covered: boolean }>;
  topLandingPages: Array<{ path: string; count: number; contentType: SeoContentType; conversionCount: number }>;
  contentTypeMix: Array<{ contentType: SeoContentType; count: number }>;
  events: SeoInsightEvent[];
}): SeoInsightRecommendation[] {
  const recommendations: SeoInsightRecommendation[] = [];
  const uncovered = searchQueries.filter((query) => !query.covered).slice(0, 4);
  const highIntent = searchQueries[0];

  for (const query of uncovered) {
    recommendations.push({
      targetType: "article",
      priority: query.count >= 3 ? "high" : "medium",
      keyword: query.query,
      title: `发布「${query.query}」趋势解读文章`,
      reason: `站内已有 ${query.count} 次相关搜索或搜索入口信号，但现有内容覆盖不足。`,
      action: "写一篇 AI 前沿资讯文章，结构包含是什么、为什么重要、适合谁、如何用站内工具或教程落地。"
    });

    const targetType = classifyOpportunityTarget(query.query);
    recommendations.push({
      targetType,
      priority: query.count >= 3 ? "high" : "medium",
      keyword: query.query,
      title: buildOpportunityTitle(targetType, query.query),
      reason: "该关键词带有明确使用场景，适合从资讯延伸到软件、服务或课程。",
      action: buildOpportunityAction(targetType)
    });
  }

  const topLanding = topLandingPages[0];
  if (topLanding && topLanding.count >= 2 && topLanding.conversionCount === 0) {
    recommendations.push({
      targetType: "technical_seo",
      priority: "medium",
      title: `强化落地页转化路径：${topLanding.path}`,
      reason: `该页面已有 ${topLanding.count} 次 SEO 访问记录，但暂未形成转化事件。`,
      action: "在正文中加入相关软件、账号服务、教程和下一步咨询入口，并检查首屏 CTA 是否明确。"
    });
  }

  const articleViews = contentTypeMix.find((row) => row.contentType === "ai_news_article")?.count ?? 0;
  const softwareViews = contentTypeMix.find((row) => row.contentType === "software_detail")?.count ?? 0;
  if (articleViews > 0 && softwareViews === 0) {
    recommendations.push({
      targetType: "software",
      priority: "low",
      title: "把高流量资讯补上相关软件入口",
      reason: "当前 SEO 访问集中在资讯内容，软件详情页承接不足。",
      action: "为访问较高的资讯文章绑定相关软件或本地部署应用，并在文章底部加入工具卡片。"
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      targetType: "article",
      priority: "low",
      title: "先积累 7 天 SEO 落地页数据",
      reason: "当前站内 SEO 样本还少，建议先让埋点跑满一个周期。",
      action: highIntent
        ? `围绕「${highIntent.query}」先做一篇轻量资讯或教程。`
        : "优先发布 AI智能体、本地部署AI、开源模型、AI工具教程四类内容，建立基础数据。"
    });
  }

  return recommendations.slice(0, 8);
}

function classifyOpportunityTarget(query: string): SeoInsightRecommendation["targetType"] {
  const value = query.toLowerCase();
  if (/账号|account|subscription|订阅|chatgpt|gemini|claude|tiktok/.test(value)) return "service";
  if (/教程|tutorial|prompt|学习|course|how to|入门/.test(value)) return "course";
  if (/部署|local|private|agent|workflow|automation|本地|私有化|工具|tool|studio/.test(value)) return "software";
  return "article";
}

function buildOpportunityTitle(targetType: SeoInsightRecommendation["targetType"], query: string) {
  if (targetType === "service") return `规划「${query}」账号服务咨询页`;
  if (targetType === "course") return `制作「${query}」技能教程或课程`;
  if (targetType === "software") return `评估「${query}」软件应用或本地部署方案`;
  return `扩展「${query}」专题内容`;
}

function buildOpportunityAction(targetType: SeoInsightRecommendation["targetType"]) {
  if (targetType === "service") return "新增或优化 AI账号服务咨询内容，强调合规使用、订阅支持和平台政策边界。";
  if (targetType === "course") return "把搜索问题拆成步骤型教程，增加示例、FAQ、相关工具链接和课程入口。";
  if (targetType === "software") return "评估是否新增软件应用、部署包或工作流模板，并配套一篇落地教程。";
  return "扩展专题合集页，并用内部链接连接资讯、工具、教程和服务。";
}

function isKeywordCovered(query: string, content: SeoInsightContentItem[]) {
  const normalized = normalizeQuery(query);
  if (!normalized) return true;
  return content.some((item) => {
    const haystack = [item.title, item.keywords, item.seoKeywords, item.summary, item.categoryName].join(" ").toLowerCase();
    return haystack.includes(normalized.toLowerCase());
  });
}

function normalizePublicPath(pathname: string | null | undefined) {
  const rawPath = String(pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (rawPath === "/en") return "/";
  return rawPath.replace(/^\/en(?=\/)/, "") || "/";
}

function normalizeSeoContentType(value: string | null): SeoContentType | null {
  const types: SeoContentType[] = [
    "home",
    "ai_news_listing",
    "ai_news_article",
    "software_listing",
    "software_detail",
    "account_service_listing",
    "account_service_detail",
    "skill_learning_listing",
    "skill_learning_detail",
    "tutorial_listing",
    "pricing",
    "legal",
    "other"
  ];
  return value && (types as string[]).includes(value) ? (value as SeoContentType) : null;
}

function getQueryFromUrl(url: URL, keys: readonly string[]) {
  for (const key of keys) {
    const value = normalizeQuery(url.searchParams.get(key));
    if (value) return value;
  }
  return undefined;
}

function normalizeQuery(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(value: string) {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

function getMetadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}
