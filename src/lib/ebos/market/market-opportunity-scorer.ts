import type {
  EbosMarketOpportunityRecommendedAction,
  EbosMarketOpportunityScore,
  EbosMarketProductType,
  EbosMarketSignal,
  EbosMarketTopic,
  MarketOpportunityScoringOptions
} from "./market-evidence-types";

export function scoreMarketOpportunities(
  signals: EbosMarketSignal[],
  options: MarketOpportunityScoringOptions = {}
): EbosMarketOpportunityScore[] {
  const grouped = groupSignalsByDirection(signals);
  return rankMarketOpportunities([...grouped.entries()].map(([topic, topicSignals]) => {
    const detectedProductTypes = unique(topicSignals.flatMap((signal) => signal.detectedProductTypes));
    const demandScore = Math.min(25, Math.round(average(topicSignals.map((signal) => signal.relevanceScore)) * 0.18 + topicSignals.length * 4 + average(topicSignals.map((signal) => signal.detectedUserProblems.length)) * 2));
    const monetizationPotential = Math.min(20, Math.round(average(topicSignals.map((signal) => signal.monetizationScore)) * 0.2 + detectedProductTypes.length * 2));
    const enheFitScore = calculateEnheFitScore(topic, options);
    const seoPotential = calculateSeoPotential(topic, topicSignals, options);
    const geoPotential = calculateGeoPotential(topic, options);
    const buildDifficulty = calculateBuildDifficulty(topic, detectedProductTypes, options);
    const competitionRisk = calculateCompetitionRisk(topic);
    const priorityScore = calculateMarketOpportunityPriority({
      demandScore,
      monetizationPotential,
      enheFitScore,
      seoPotential,
      geoPotential,
      buildDifficulty,
      competitionRisk
    });
    const recommendedAction = chooseRecommendedAction(priorityScore, options);
    const productDirection = productDirectionForTopic(topic);

    return {
      id: `market-opportunity-${topic}`,
      productDirection,
      description: describeOpportunity(topic, productDirection),
      targetUser: targetUserForTopic(topic),
      userProblem: summarizeUserProblem(topicSignals),
      evidenceSignalIds: topicSignals.map((signal) => signal.id),
      demandScore,
      competitionRisk,
      buildDifficulty,
      monetizationPotential,
      seoPotential,
      geoPotential,
      enheFitScore,
      priorityScore,
      recommendedAction,
      suggestedProductFormats: recommendProductFormats({
        productDirection,
        detectedTopics: [topic],
        detectedProductTypes
      }),
      suggestedPriceRange: suggestedPriceRange(recommendedAction),
      risks: buildRisks(topic, competitionRisk, buildDifficulty),
      nextActions: buildNextActions(productDirection, recommendedAction, options)
    };
  }));
}

export function calculateMarketOpportunityPriority(input: {
  demandScore: number;
  monetizationPotential: number;
  enheFitScore: number;
  seoPotential: number;
  geoPotential: number;
  buildDifficulty: number;
  competitionRisk: number;
}) {
  return clamp(
    input.demandScore
      + input.monetizationPotential
      + input.enheFitScore
      + input.seoPotential
      + input.geoPotential
      - input.buildDifficulty
      - input.competitionRisk,
    0,
    100
  );
}

export function rankMarketOpportunities(opportunities: EbosMarketOpportunityScore[]) {
  return [...opportunities].sort((a, b) =>
    b.priorityScore - a.priorityScore
    || b.demandScore - a.demandScore
    || a.buildDifficulty - b.buildDifficulty
  );
}

export function recommendProductFormats(input: {
  productDirection: string;
  detectedTopics: EbosMarketTopic[];
  detectedProductTypes: EbosMarketProductType[];
}) {
  const formats = new Set<string>();
  for (const type of input.detectedProductTypes) {
    if (type === "software_tool") formats.add("Software tool");
    if (type === "prompt_kit") formats.add("Prompt Kit");
    if (type === "workflow_pack") formats.add("Workflow Pack");
    if (type === "tutorial_pack") formats.add("Tutorial Pack");
    if (type === "template_pack") formats.add("Template Pack");
    if (type === "local_ai_bundle") formats.add("Local AI Bundle");
    if (type === "whop_listing") formats.add("Whop Listing");
    if (type === "seo_geo_content_cluster") formats.add("SEO/GEO Content Cluster");
  }

  if (input.detectedTopics.includes("ai_agent")) formats.add("Workflow Pack");
  if (input.detectedTopics.includes("ai_video")) formats.add("Workflow Pack");
  if (input.detectedTopics.includes("seo_geo")) formats.add("SEO/GEO Content Cluster");
  if (input.detectedTopics.includes("prompt_kit")) formats.add("Prompt Kit");
  if (input.detectedTopics.includes("local_ai")) formats.add("Local AI Bundle");
  if (formats.size === 0) {
    formats.add("Template Pack");
    formats.add("Tutorial Pack");
  }

  return [...formats];
}

function groupSignalsByDirection(signals: EbosMarketSignal[]) {
  const groups = new Map<EbosMarketTopic, EbosMarketSignal[]>();
  for (const signal of signals) {
    const topic = pickPrimaryTopic(signal.detectedTopics);
    if (!topic) continue;
    groups.set(topic, [...(groups.get(topic) ?? []), signal]);
  }
  return groups;
}

function pickPrimaryTopic(topics: EbosMarketTopic[]) {
  const priority: EbosMarketTopic[] = [
    "ai_video",
    "ai_agent",
    "seo_geo",
    "local_ai",
    "ai_voice",
    "comfyui",
    "mcp",
    "browser_agent",
    "workflow",
    "prompt_kit",
    "automation",
    "digital_product",
    "ecommerce"
  ];
  return priority.find((topic) => topics.includes(topic)) ?? topics[0];
}

function calculateEnheFitScore(topic: EbosMarketTopic, options: MarketOpportunityScoringOptions) {
  let score = 12;
  if (["ai_video", "ai_agent", "local_ai", "seo_geo", "workflow", "prompt_kit", "comfyui"].includes(topic)) score += 8;
  if (options.boostTopics?.includes(topic)) score += 5;
  if (options.preferLowCostValidation && ["prompt_kit", "workflow", "seo_geo", "ai_video"].includes(topic)) score += 2;
  return Math.min(20, score);
}

function calculateSeoPotential(topic: EbosMarketTopic, signals: EbosMarketSignal[], options: MarketOpportunityScoringOptions) {
  let score = ["seo_geo", "ai_agent", "ai_video", "local_ai", "workflow"].includes(topic) ? 12 : 8;
  if (signals.some((signal) => signal.detectedUserProblems.includes("content_growth"))) score += 2;
  if (signals.some((signal) => signal.detectedTopics.includes("seo_geo"))) score += 2;
  if (options.seoEvidenceStrong) score += 1;
  return Math.min(15, score);
}

function calculateGeoPotential(topic: EbosMarketTopic, options: MarketOpportunityScoringOptions) {
  let score = ["seo_geo", "ai_agent", "workflow", "local_ai"].includes(topic) ? 9 : 6;
  if (options.geoEvidenceStrong) score += 2;
  return Math.min(10, score);
}

function calculateBuildDifficulty(
  topic: EbosMarketTopic,
  productTypes: EbosMarketProductType[],
  options: MarketOpportunityScoringOptions
) {
  let difficulty = productTypes.includes("software_tool") ? 6 : 3;
  if (["local_ai", "browser_agent", "mcp"].includes(topic)) difficulty += 2;
  if (["prompt_kit", "workflow", "comfyui", "seo_geo"].includes(topic)) difficulty -= 1;
  if (options.preferLowCostValidation) difficulty -= 1;
  return clamp(difficulty, 0, 10);
}

function calculateCompetitionRisk(topic: EbosMarketTopic) {
  if (["ai_video", "seo_geo"].includes(topic)) return 6;
  if (topic === "ai_agent") return 5;
  if (["prompt_kit", "workflow", "comfyui"].includes(topic)) return 4;
  return 5;
}

function chooseRecommendedAction(
  score: number,
  options: MarketOpportunityScoringOptions
): EbosMarketOpportunityRecommendedAction {
  if (options.firstRevenueAchieved === false && score >= 65) return "validate_first";
  if (score >= 80) return "build_now";
  if (score >= 65) return "validate_first";
  if (score >= 50) return "create_content_first";
  if (score >= 35) return "watch";
  return "ignore";
}

function productDirectionForTopic(topic: EbosMarketTopic) {
  const names: Record<EbosMarketTopic, string> = {
    ai_agent: "AI Agent 工作流模板包",
    ai_video: "AI 视频工作流包",
    ai_voice: "AI 语音生成模板包",
    local_ai: "本地部署 AI 工具包",
    seo_geo: "SEO/GEO 自动化内容集群",
    automation: "AI 自动化效率工具",
    browser_agent: "Browser Agent 自动化工具包",
    mcp: "MCP 工具连接模板包",
    comfyui: "ComfyUI 工作流包",
    prompt_kit: "AI Prompt Kit",
    workflow: "AI 工作流模板包",
    ecommerce: "电商 AI 自动化模板包",
    digital_product: "AI 数字产品模板包"
  };
  return names[topic];
}

function describeOpportunity(topic: EbosMarketTopic, productDirection: string) {
  return `${productDirection} 可用低成本页面、内容或模板包先验证需求，再决定是否产品化。`;
}

function targetUserForTopic(topic: EbosMarketTopic) {
  if (topic === "ai_video") return "短视频创作者、设计师和本地 AI 生成工作流用户";
  if (topic === "seo_geo") return "需要搜索增长和 AI 回答引擎可见度的站长/运营";
  if (topic === "local_ai") return "需要本地离线和低成本部署的 AI 工具用户";
  if (topic === "ai_agent") return "希望自动化重复流程的运营、开发者和独立产品团队";
  return "希望用 AI 降低执行成本的数字产品用户";
}

function summarizeUserProblem(signals: EbosMarketSignal[]) {
  const problems = countValues(signals.flatMap((signal) => signal.detectedUserProblems));
  return problems[0]?.[0] ?? "template_gap";
}

function suggestedPriceRange(action: EbosMarketOpportunityRecommendedAction) {
  if (action === "build_now") return "CNY 29-199";
  if (action === "validate_first") return "CNY 9-99 validation offer";
  if (action === "create_content_first") return "free content + waitlist";
  return "not priced";
}

function buildRisks(topic: EbosMarketTopic, competitionRisk: number, buildDifficulty: number) {
  const risks: string[] = [];
  if (competitionRisk >= 6) risks.push("竞争风险较高，必须先用细分场景和交付物做差异化。");
  if (buildDifficulty >= 7) risks.push("构建难度较高，不适合直接大规模开发。");
  if (topic === "ai_video") risks.push("AI 视频方向变化快，需避免押注单一模型或平台。");
  return risks;
}

function buildNextActions(
  productDirection: string,
  action: EbosMarketOpportunityRecommendedAction,
  options: MarketOpportunityScoringOptions
) {
  if (action === "build_now") return [`为 ${productDirection} 编写 PRD 和上架任务。`, "准备产品页、价格和交付清单。"];
  if (action === "validate_first") {
    return [
      `低成本验证 ${productDirection}：发布预售/等候名单/内容测试。`,
      "用产品页点击、咨询、订单或手动购买意向验证需求。"
    ];
  }
  if (action === "create_content_first") return [`先围绕 ${productDirection} 发布内容集群，再观察点击和询盘。`];
  return [`持续观察 ${productDirection}，暂不进入产品开发。`];
}

function countValues<T extends string>(values: T[]) {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1]) as Array<[T, number]>;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
