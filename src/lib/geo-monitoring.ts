export type GeoPlatformRegion = "global" | "china";
export type GeoProviderMode = "api" | "manual_browser" | "search_console" | "bing_webmaster";
export type GeoQueryIntent = "recommendation" | "deployment" | "compliance" | "tutorial" | "comparison" | "trend";
export type GeoRecommendationType = "faq" | "comparison_table" | "source_citation" | "answer_block" | "okf_concept";

export type GeoMonitoringQuery = {
  id: string;
  query: string;
  locale: "zh" | "en";
  intent: GeoQueryIntent;
  topic: "ai-agent" | "local-ai" | "open-source-models" | "ai-tools" | "ai-tutorials" | "ai-account-service" | "ai-regulation";
  targetPath: string;
  tags: string[];
};

export type GeoMonitoringProvider = {
  id: string;
  name: string;
  region: GeoPlatformRegion;
  mode: GeoProviderMode;
  description: string;
  officialUrl: string;
};

export type GeoVisibilityResultInput = {
  query: string;
  providerId: string;
  isBrandMentioned: boolean;
  isDomainCited: boolean;
  citedUrls: string[];
  competitors: string[];
};

export type GeoMonitoringRecommendation = {
  type: GeoRecommendationType;
  priority: "high" | "medium" | "low";
  query: string;
  title: string;
  reason: string;
  action: string;
  targetPath: string;
};

export type GeoMonitoringReport = {
  summary: {
    totalQueries: number;
    totalProviders: number;
    globalProviders: number;
    chinaProviders: number;
    reviewedResults: number;
    brandMentionRate: number;
    domainCitationRate: number;
    openGaps: number;
  };
  queries: GeoMonitoringQuery[];
  providers: GeoMonitoringProvider[];
  recommendations: GeoMonitoringRecommendation[];
};

export const GEO_MONITORING_QUERIES: GeoMonitoringQuery[] = [
  {
    id: "zh-ai-agent-tools",
    query: "AI智能体工具推荐",
    locale: "zh",
    intent: "recommendation",
    topic: "ai-agent",
    targetPath: "/software",
    tags: ["AI智能体", "AI Agent", "工具推荐"]
  },
  {
    id: "zh-local-ai-apps",
    query: "本地部署AI应用",
    locale: "zh",
    intent: "deployment",
    topic: "local-ai",
    targetPath: "/software",
    tags: ["本地部署AI", "私有化部署", "Local AI"]
  },
  {
    id: "zh-account-compliance",
    query: "AI账号服务合规使用",
    locale: "zh",
    intent: "compliance",
    topic: "ai-account-service",
    targetPath: "/account-services",
    tags: ["AI账号服务", "合规使用", "订阅支持"]
  },
  {
    id: "zh-private-ai-deployment",
    query: "私有化AI部署方案",
    locale: "zh",
    intent: "deployment",
    topic: "local-ai",
    targetPath: "/ai-news/topics/local-ai",
    tags: ["Private AI", "本地大模型", "企业部署"]
  },
  {
    id: "zh-open-source-llm",
    query: "开源大模型怎么选",
    locale: "zh",
    intent: "comparison",
    topic: "open-source-models",
    targetPath: "/ai-news/topics/open-source-models",
    tags: ["开源大模型", "Open-source LLM", "模型对比"]
  },
  {
    id: "zh-ai-tools-productivity",
    query: "AI效率工具有哪些",
    locale: "zh",
    intent: "recommendation",
    topic: "ai-tools",
    targetPath: "/software",
    tags: ["AI效率工具", "自动化", "工作流"]
  },
  {
    id: "zh-prompt-course",
    query: "AI提示词教程",
    locale: "zh",
    intent: "tutorial",
    topic: "ai-tutorials",
    targetPath: "/skill-learning",
    tags: ["Prompt Engineering", "AI教程", "技能学习"]
  },
  {
    id: "zh-agentic-workflow",
    query: "Agentic AI 工作流怎么落地",
    locale: "zh",
    intent: "tutorial",
    topic: "ai-agent",
    targetPath: "/skill-learning",
    tags: ["Agentic AI", "工作流自动化", "落地教程"]
  },
  {
    id: "zh-edge-ai",
    query: "端侧AI应用场景",
    locale: "zh",
    intent: "trend",
    topic: "local-ai",
    targetPath: "/ai-news",
    tags: ["端侧AI", "Edge AI", "On-device AI"]
  },
  {
    id: "zh-ai-coding-tools",
    query: "AI编程工具推荐",
    locale: "zh",
    intent: "recommendation",
    topic: "ai-tools",
    targetPath: "/software",
    tags: ["AI编程工具", "Coding Agent", "开发效率"]
  },
  {
    id: "zh-ai-video-tools",
    query: "AI视频工具推荐",
    locale: "zh",
    intent: "recommendation",
    topic: "ai-tools",
    targetPath: "/software",
    tags: ["AI视频", "多模态AI", "创作工具"]
  },
  {
    id: "zh-ai-search-trends",
    query: "AI搜索趋势",
    locale: "zh",
    intent: "trend",
    topic: "ai-tools",
    targetPath: "/ai-trends",
    tags: ["AI搜索", "生成式搜索", "趋势洞察"]
  },
  {
    id: "zh-ai-regulation",
    query: "AI监管政策对工具使用有什么影响",
    locale: "zh",
    intent: "compliance",
    topic: "ai-regulation",
    targetPath: "/ai-news/topics/ai-regulation",
    tags: ["AI监管", "EU AI Act", "中国AI政策"]
  },
  {
    id: "zh-ai-infrastructure-cost",
    query: "AI推理成本和GPU趋势",
    locale: "zh",
    intent: "trend",
    topic: "open-source-models",
    targetPath: "/ai-news",
    tags: ["AI基础设施", "GPU", "推理成本"]
  },
  {
    id: "zh-ai-account-security",
    query: "AI工具账号安全使用建议",
    locale: "zh",
    intent: "compliance",
    topic: "ai-account-service",
    targetPath: "/account-services",
    tags: ["账号安全", "订阅政策", "合规边界"]
  },
  {
    id: "en-agent-tools",
    query: "AI Agent tools for workflow automation",
    locale: "en",
    intent: "recommendation",
    topic: "ai-agent",
    targetPath: "/en/software",
    tags: ["AI Agent", "workflow automation", "AI tools"]
  },
  {
    id: "en-local-ai",
    query: "best local AI deployment tools",
    locale: "en",
    intent: "deployment",
    topic: "local-ai",
    targetPath: "/en/software",
    tags: ["Local AI", "Private AI Deployment", "on-device AI"]
  },
  {
    id: "en-open-source-llm",
    query: "open source LLM comparison for business",
    locale: "en",
    intent: "comparison",
    topic: "open-source-models",
    targetPath: "/en/ai-news/topics/open-source-models",
    tags: ["open-source LLM", "open-weight model", "business AI"]
  },
  {
    id: "en-ai-account-service",
    query: "AI account service compliance guidance",
    locale: "en",
    intent: "compliance",
    topic: "ai-account-service",
    targetPath: "/en/account-services",
    tags: ["AI account service", "subscription policy", "account security"]
  },
  {
    id: "en-prompt-engineering-course",
    query: "prompt engineering course for beginners",
    locale: "en",
    intent: "tutorial",
    topic: "ai-tutorials",
    targetPath: "/en/skill-learning",
    tags: ["prompt engineering", "AI tutorial", "AI course"]
  },
  {
    id: "en-ai-productivity-tools",
    query: "best AI productivity tools for creators",
    locale: "en",
    intent: "recommendation",
    topic: "ai-tools",
    targetPath: "/en/software",
    tags: ["AI productivity tools", "creators", "automation"]
  },
  {
    id: "en-ai-search",
    query: "generative AI search optimization",
    locale: "en",
    intent: "trend",
    topic: "ai-tools",
    targetPath: "/en/ai-news",
    tags: ["AI Search", "Generative Search", "GEO"]
  }
];

export const GEO_MONITORING_PROVIDERS: GeoMonitoringProvider[] = [
  {
    id: "google-ai-overview",
    name: "Google AI Overview",
    region: "global",
    mode: "manual_browser",
    description: "Use manual browser review plus Google Search Console signals for AI Overview visibility.",
    officialUrl: "https://www.google.com/search"
  },
  {
    id: "chatgpt-search",
    name: "ChatGPT / OpenAI Web Search",
    region: "global",
    mode: "manual_browser",
    description: "Record whether ChatGPT cites ENHE AI pages in web-search answers.",
    officialUrl: "https://chatgpt.com"
  },
  {
    id: "perplexity",
    name: "Perplexity",
    region: "global",
    mode: "manual_browser",
    description: "Review cited sources and competing pages for answer-engine visibility.",
    officialUrl: "https://www.perplexity.ai"
  },
  {
    id: "bing-copilot",
    name: "Bing / Copilot",
    region: "global",
    mode: "bing_webmaster",
    description: "Combine Bing Webmaster data with Copilot answer checks.",
    officialUrl: "https://www.bing.com"
  },
  {
    id: "claude-search",
    name: "Claude / Brave Search",
    region: "global",
    mode: "manual_browser",
    description: "Review whether Claude web-enabled answers mention ENHE AI or competitors.",
    officialUrl: "https://claude.ai"
  },
  {
    id: "google-search-console",
    name: "Google Search Console",
    region: "global",
    mode: "search_console",
    description: "Official Google performance data for indexed pages, queries, CTR, and coverage.",
    officialUrl: "https://search.google.com/search-console"
  },
  {
    id: "baidu-search",
    name: "百度搜索",
    region: "china",
    mode: "manual_browser",
    description: "记录百度搜索与百度 AI 搜索形态下的品牌露出、收录和竞品引用。",
    officialUrl: "https://www.baidu.com"
  },
  {
    id: "doubao",
    name: "豆包",
    region: "china",
    mode: "manual_browser",
    description: "记录豆包回答中是否提及 ENHE AI、引用官网页面或引用竞品内容。",
    officialUrl: "https://www.doubao.com"
  },
  {
    id: "kimi",
    name: "Kimi",
    region: "china",
    mode: "manual_browser",
    description: "记录 Kimi 联网问答中的来源引用、品牌可见度和内容缺口。",
    officialUrl: "https://kimi.moonshot.cn"
  },
  {
    id: "tongyi",
    name: "通义千问",
    region: "china",
    mode: "manual_browser",
    description: "记录通义千问对 AI 工具、教程、账号服务问题的回答来源。",
    officialUrl: "https://tongyi.aliyun.com"
  },
  {
    id: "tencent-yuanbao",
    name: "腾讯元宝",
    region: "china",
    mode: "manual_browser",
    description: "记录腾讯元宝对中文 AI 工具和服务问题的品牌露出情况。",
    officialUrl: "https://yuanbao.tencent.com"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    region: "china",
    mode: "manual_browser",
    description: "记录 DeepSeek 联网或知识回答中是否覆盖 ENHE AI 相关内容。",
    officialUrl: "https://chat.deepseek.com"
  }
];

export function buildGeoMonitoringReport(input: { queryResults?: GeoVisibilityResultInput[] } = {}): GeoMonitoringReport {
  const queryResults = input.queryResults ?? [];
  const reviewedResults = queryResults.length;
  const brandMentions = queryResults.filter((result) => result.isBrandMentioned).length;
  const domainCitations = queryResults.filter((result) => result.isDomainCited || result.citedUrls.some((url) => url.includes("enhe-tech.com.cn"))).length;
  const gaps = queryResults.filter((result) => !result.isBrandMentioned || !result.isDomainCited);

  return {
    summary: {
      totalQueries: GEO_MONITORING_QUERIES.length,
      totalProviders: GEO_MONITORING_PROVIDERS.length,
      globalProviders: GEO_MONITORING_PROVIDERS.filter((provider) => provider.region === "global").length,
      chinaProviders: GEO_MONITORING_PROVIDERS.filter((provider) => provider.region === "china").length,
      reviewedResults,
      brandMentionRate: percent(brandMentions, reviewedResults),
      domainCitationRate: percent(domainCitations, reviewedResults),
      openGaps: gaps.length
    },
    queries: GEO_MONITORING_QUERIES,
    providers: GEO_MONITORING_PROVIDERS,
    recommendations: buildGeoRecommendations(gaps)
  };
}

function buildGeoRecommendations(gaps: GeoVisibilityResultInput[]): GeoMonitoringRecommendation[] {
  const recommendations = new Map<string, GeoMonitoringRecommendation>();
  const targetGaps = gaps.length ? gaps : GEO_MONITORING_QUERIES.slice(0, 2).map((query) => toDefaultGap(query.query));

  for (const gap of targetGaps) {
    const query = findQuery(gap.query);
    const targetPath = query?.targetPath ?? "/ai-news";
    const competitorReason = gap.competitors.length ? `当前结果中出现 ${gap.competitors.slice(0, 3).join("、")}，但 ENHE AI 露出不足。` : "当前结果没有稳定引用 ENHE AI 官网页面。";

    addRecommendation(recommendations, {
      type: "answer_block",
      priority: "high",
      query: gap.query,
      targetPath,
      title: `补充“${gap.query}”可摘录答案段`,
      reason: competitorReason,
      action: "在目标页面首屏或核心 H2 下增加 40-80 字直接答案，明确适合谁、解决什么问题、下一步进入哪个工具/教程/服务。"
    });

    addRecommendation(recommendations, {
      type: "faq",
      priority: query?.intent === "compliance" || query?.intent === "tutorial" ? "high" : "medium",
      query: gap.query,
      targetPath,
      title: `为“${gap.query}”补 FAQ`,
      reason: "AI 回答引擎更容易抽取自包含问答，中文平台也常直接复述 FAQ 型内容。",
      action: "新增 3-5 个自然语言问题，覆盖风险边界、适用场景、操作步骤和站内下一步链接。"
    });

    if (query?.intent === "comparison" || query?.intent === "recommendation" || query?.intent === "deployment") {
      addRecommendation(recommendations, {
        type: "comparison_table",
        priority: "medium",
        query: gap.query,
        targetPath,
        title: `增加“${gap.query}”对比表`,
        reason: "推荐、选型和部署类查询通常被 AI 系统拆成多维比较，表格比长段落更容易被引用。",
        action: "用表格列出适用人群、部署方式、成本、隐私、学习门槛和站内对应内容。"
      });
    }

    addRecommendation(recommendations, {
      type: "source_citation",
      priority: "medium",
      query: gap.query,
      targetPath,
      title: `为“${gap.query}”补权威来源引用`,
      reason: "GEO 研究与实际问答结果都更偏好带来源、日期和可验证链接的内容。",
      action: "补充官方公告、模型发布说明、政策原文、研究报告或平台文档链接，并在正文中说明引用时间。"
    });

    addRecommendation(recommendations, {
      type: "okf_concept",
      priority: "low",
      query: gap.query,
      targetPath: okfTargetForTopic(query?.topic),
      title: `把“${gap.query}”纳入 OKF 概念页`,
      reason: "OKF 概念页让 AI 代理能在不依赖页面渲染的情况下理解 ENHE AI 的内容版图。",
      action: "在对应 OKF markdown 中增加定义、适用页面、相关工具、教程和资讯入口。"
    });
  }

  return Array.from(recommendations.values()).slice(0, 10);
}

function addRecommendation(map: Map<string, GeoMonitoringRecommendation>, item: GeoMonitoringRecommendation) {
  const key = `${item.type}:${item.query}`;
  if (!map.has(key)) map.set(key, item);
}

function findQuery(query: string) {
  return GEO_MONITORING_QUERIES.find((item) => item.query.toLowerCase() === query.toLowerCase());
}

function toDefaultGap(query: string): GeoVisibilityResultInput {
  return {
    query,
    providerId: "manual",
    isBrandMentioned: false,
    isDomainCited: false,
    citedUrls: [],
    competitors: []
  };
}

function okfTargetForTopic(topic?: GeoMonitoringQuery["topic"]) {
  if (topic === "ai-account-service") return "/okf/account-services/index.md";
  if (topic === "ai-tutorials") return "/okf/skill-learning/index.md";
  if (topic === "ai-tools" || topic === "ai-agent" || topic === "local-ai") return "/okf/software/index.md";
  return "/okf/ai-news/index.md";
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}
