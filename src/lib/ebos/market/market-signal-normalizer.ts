import type {
  EbosMarketProductType,
  EbosMarketSignal,
  EbosMarketSignalSourceType,
  EbosMarketTopic,
  EbosMarketUserProblem
} from "./market-evidence-types";

type MarketSignalInput = {
  id?: string;
  source: string;
  sourceType: EbosMarketSignalSourceType;
  title: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  tags?: string[];
  rawText?: string;
};

const TOPIC_RULES: Array<{ topic: EbosMarketTopic; patterns: RegExp[] }> = [
  { topic: "ai_agent", patterns: [/agent/i, /智能体/] },
  { topic: "ai_video", patterns: [/video/i, /视频/] },
  { topic: "ai_voice", patterns: [/voice/i, /audio/i, /语音/, /音频/] },
  { topic: "local_ai", patterns: [/local ai/i, /offline ai/i, /本地部署/, /本地离线/, /离线/] },
  { topic: "seo_geo", patterns: [/\bseo\b/i, /\bgeo\b/i, /search engine/i, /answer engine/i, /搜索/, /回答引擎/] },
  { topic: "automation", patterns: [/automation/i, /自动化/] },
  { topic: "browser_agent", patterns: [/browser agent/i, /浏览器智能体/] },
  { topic: "mcp", patterns: [/\bmcp\b/i] },
  { topic: "comfyui", patterns: [/comfyui/i] },
  { topic: "prompt_kit", patterns: [/prompt kit/i, /prompt/i, /提示词/] },
  { topic: "workflow", patterns: [/workflow/i, /工作流/] },
  { topic: "ecommerce", patterns: [/ecommerce/i, /e-commerce/i, /电商/] },
  { topic: "digital_product", patterns: [/digital product/i, /数字产品/] }
];

const PRODUCT_TYPE_RULES: Array<{ productType: EbosMarketProductType; patterns: RegExp[] }> = [
  { productType: "software_tool", patterns: [/software/i, /\btool\b/i, /工具/] },
  { productType: "prompt_kit", patterns: [/prompt kit/i, /prompt/i, /提示词/] },
  { productType: "workflow_pack", patterns: [/workflow/i, /工作流/] },
  { productType: "tutorial_pack", patterns: [/tutorial/i, /教程/] },
  { productType: "template_pack", patterns: [/template/i, /模板/] },
  { productType: "local_ai_bundle", patterns: [/local ai/i, /offline/i, /本地/, /离线/] },
  { productType: "whop_listing", patterns: [/whop/i, /listing/i, /上架/] },
  { productType: "seo_geo_content_cluster", patterns: [/\bseo\b/i, /\bgeo\b/i, /content cluster/i, /内容集群/] }
];

const USER_PROBLEM_RULES: Array<{ problem: EbosMarketUserProblem; patterns: RegExp[] }> = [
  { problem: "save_time", patterns: [/save time/i, /节省时间/, /省时间/, /效率/] },
  { problem: "reduce_cost", patterns: [/reduce cost/i, /降低成本/, /省钱/] },
  { problem: "deployment_gap", patterns: [/deploy/i, /不会部署/, /部署困难/] },
  { problem: "template_gap", patterns: [/template/i, /缺少模板/, /模板/] },
  { problem: "prompt_gap", patterns: [/prompt/i, /不会写提示词/, /提示词/] },
  { problem: "local_offline_need", patterns: [/offline/i, /local/i, /本地离线/, /离线/] },
  { problem: "batch_processing", patterns: [/batch/i, /批量处理/, /批量/] },
  { problem: "monetization_need", patterns: [/monetize/i, /commercialize/i, /商业化/, /变现/] },
  { problem: "cross_platform_publishing", patterns: [/cross-platform/i, /multi-platform/i, /跨平台发布/] },
  { problem: "content_growth", patterns: [/content growth/i, /内容增长/, /增长/] }
];

export function normalizeMarketSignal(input: MarketSignalInput): EbosMarketSignal {
  const rawText = normalizeWhitespace([input.title, input.description, input.rawText, ...(input.tags ?? [])].filter(Boolean).join(" "));
  const detectedTopics = detectMarketTopics(rawText);
  const detectedProductTypes = detectProductTypes(rawText);
  const detectedUserProblems = detectUserProblems(rawText);
  const baseSignal = {
    id: input.id ?? createSignalId(input.source, input.title),
    source: input.source,
    sourceType: input.sourceType,
    title: input.title,
    description: input.description,
    url: input.url,
    publishedAt: input.publishedAt,
    tags: input.tags ?? [],
    detectedTopics,
    detectedProductTypes,
    detectedUserProblems,
    relevanceScore: 0,
    freshnessScore: calculateFreshnessScore(input.publishedAt),
    monetizationScore: calculateMonetizationScore(rawText, detectedProductTypes, detectedUserProblems),
    confidence: input.sourceType === "manual" ? "partial" as const : "partial" as const,
    rawText: rawText.slice(0, 500)
  };

  return {
    ...baseSignal,
    relevanceScore: calculateSignalRelevance(baseSignal)
  };
}

export function detectMarketTopics(text: string): EbosMarketTopic[] {
  return TOPIC_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text.toLowerCase())))
    .map((rule) => rule.topic);
}

export function detectProductTypes(text: string): EbosMarketProductType[] {
  return PRODUCT_TYPE_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text.toLowerCase())))
    .map((rule) => rule.productType);
}

export function detectUserProblems(text: string): EbosMarketUserProblem[] {
  return USER_PROBLEM_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text.toLowerCase())))
    .map((rule) => rule.problem);
}

export function calculateSignalRelevance(signal: Pick<EbosMarketSignal, "detectedTopics" | "detectedProductTypes" | "detectedUserProblems" | "title" | "description">) {
  const text = `${signal.title} ${signal.description ?? ""}`;
  let score = 15;
  score += Math.min(35, signal.detectedTopics.length * 8);
  score += Math.min(25, signal.detectedProductTypes.length * 7);
  score += Math.min(25, signal.detectedUserProblems.length * 6);
  if (/\bai\b|人工智能|智能体|agent/i.test(text)) score += 10;
  return clamp(score, 0, 100);
}

function calculateFreshnessScore(publishedAt: string | undefined) {
  if (!publishedAt) return 60;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 50;
  const ageDays = Math.max(0, (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (ageDays <= 7) return 100;
  if (ageDays <= 30) return 80;
  if (ageDays <= 90) return 60;
  return 40;
}

function calculateMonetizationScore(
  text: string,
  productTypes: EbosMarketProductType[],
  problems: EbosMarketUserProblem[]
) {
  let score = 25;
  if (productTypes.length > 0) score += Math.min(30, productTypes.length * 8);
  if (problems.includes("monetization_need")) score += 20;
  if (/paid|price|sell|revenue|商业化|变现|付费/.test(text)) score += 15;
  if (problems.includes("save_time") || problems.includes("reduce_cost")) score += 10;
  return clamp(score, 0, 100);
}

function createSignalId(source: string, title: string) {
  return `market-${hash(`${source}:${title}`)}`;
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result.toString(36);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
