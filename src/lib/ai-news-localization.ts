import type { Locale } from "@/lib/i18n";
import { resolveLocalizedToolIdentity } from "@/lib/tool-localization";

type NewsSummaryInput = {
  title: string;
  englishTitle?: string | null;
  summary?: string | null;
  englishSummary?: string | null;
  description?: string | null;
  englishDescription?: string | null;
  categoryName?: string | null;
};

type NewsKeywordInput = {
  keywords?: string | null;
  seoKeywords?: string | null;
  englishKeywords?: string | null;
  englishSeoKeywords?: string | null;
  categoryName?: string | null;
  tagNames?: string[];
};

type RelatedToolIdentityInput = {
  slug: string;
  name: string;
  englishName?: string | null;
  type: "software" | "online" | "skill_learning";
};

const cjkPattern = /[\u3400-\u9fff]/;
const englishWordPattern = /[A-Za-z][A-Za-z0-9'+-]*/g;

const categoryMappings: Array<[RegExp, string]> = [
  [/ai资讯|资讯|news/i, "AI News"],
  [/趋势|解读|trend|insight/i, "Trend Insights"],
  [/工具落地|落地|workflow|实战/i, "Tool Workflows"],
  [/教程|guide|tutorial/i, "AI Tutorials"],
];

const tagMappings: Array<[RegExp, string]> = [
  [/ai资讯|news/i, "AI News"],
  [/自动化|automation/i, "Automation"],
  [/自动发布|auto(?:mated)? publishing/i, "Auto Publishing"],
  [/效率|办公|productivity/i, "Productivity"],
  [/教程|guide|tutorial/i, "AI Tutorials"],
  [/趋势|trend/i, "AI Trends"],
  [/工具|tool/i, "AI Tools"],
  [/智能体|代理|agent/i, "AI Agents"],
  [/工作流自动化|workflow automation/i, "Workflow Automation"],
  [/本地部署ai|local ai|private ai/i, "Local AI"],
  [/账号安全|account security/i, "Account Security"],
  [/账号|service|account/i, "Account Service"],
];

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function hasCjk(value: string) {
  return cjkPattern.test(value);
}

function countEnglishWords(value: string) {
  return value.match(englishWordPattern)?.length ?? 0;
}

function isUsableEnglish(value: string | null | undefined, minimumWords = 2) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  if (hasCjk(normalized)) return false;
  return countEnglishWords(normalized) >= minimumWords;
}

function mapByRules(value: string | null | undefined, rules: Array<[RegExp, string]>) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (!hasCjk(normalized) && isUsableEnglish(normalized, 1)) return normalized;

  for (const [pattern, output] of rules) {
    if (pattern.test(normalized)) return output;
  }

  return "";
}

export function localizeAiNewsDiscoveryLabel(value: string | null | undefined, locale: Locale, fallback: string) {
  const normalized = normalizeText(value);
  if (!normalized) return fallback;
  if (locale === "zh") return normalized;

  return (
    mapByRules(normalized, [...categoryMappings, ...tagMappings]) ||
    (!hasCjk(normalized) ? normalized : fallback)
  );
}

function splitKeywordList(value: string | null | undefined) {
  return normalizeText(value)
    .split(/[,\n，、]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function resolveLocalizedNewsCategoryName(name: string | null | undefined, locale: Locale) {
  const normalized = normalizeText(name);
  if (locale === "zh") return normalized;
  return mapByRules(normalized, categoryMappings) || "AI News";
}

export function resolveLocalizedNewsTagName(name: string | null | undefined, locale: Locale) {
  const normalized = normalizeText(name);
  if (locale === "zh") return normalized;
  return mapByRules(normalized, tagMappings);
}

export function buildLocalizedNewsSummary(article: NewsSummaryInput, locale: Locale) {
  if (locale === "zh") {
    return normalizeText(article.summary) || normalizeText(article.description);
  }

  if (isUsableEnglish(article.englishSummary, 5)) return normalizeText(article.englishSummary);
  if (isUsableEnglish(article.englishDescription, 6)) return normalizeText(article.englishDescription);

  const title = buildLocalizedNewsTitle(
    { title: article.title, englishTitle: article.englishTitle, categoryName: article.categoryName },
    "en",
  );
  return `${title} helps readers understand what changed, why it matters, and how to connect the update to practical AI workflows.`;
}

export function buildLocalizedNewsTitle(
  input: { title: string; englishTitle?: string | null; categoryName?: string | null },
  locale: Locale,
) {
  const title = normalizeText(input.title);
  const englishTitle = normalizeText(input.englishTitle);

  if (locale === "zh") return title;
  if (isUsableEnglish(englishTitle, 2)) return englishTitle;
  if (isUsableEnglish(title, 2)) return title;

  return `${resolveLocalizedNewsCategoryName(input.categoryName, "en")} Update`;
}

export function buildLocalizedNewsKeywordList(input: NewsKeywordInput, locale: Locale) {
  if (locale === "zh") {
    return [...splitKeywordList(input.keywords), ...splitKeywordList(input.seoKeywords)];
  }

  const englishKeywords = [...splitKeywordList(input.englishKeywords), ...splitKeywordList(input.englishSeoKeywords)];
  const translatedKeywords = [
    ...splitKeywordList(input.keywords).map((item) => resolveLocalizedNewsTagName(item, "en") || resolveLocalizedNewsCategoryName(item, "en")),
    resolveLocalizedNewsCategoryName(input.categoryName, "en"),
    ...(input.tagNames ?? []).map((item) => resolveLocalizedNewsTagName(item, "en")),
  ];

  const seen = new Set<string>();
  return [...englishKeywords, ...translatedKeywords]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item.toLowerCase())) return false;
      seen.add(item.toLowerCase());
      return true;
    });
}

export function buildLocalizedTutorialPreviewTitle(
  title: string | null | undefined,
  tool: RelatedToolIdentityInput,
  locale: Locale,
) {
  const normalized = normalizeText(title);
  if (locale === "zh") return normalized;
  if (isUsableEnglish(normalized, 2)) return normalized;

  const localizedTool = resolveLocalizedToolIdentity(tool, "en");
  return `${localizedTool.primaryName} guide`;
}

export function buildLocalizedTutorialPreviewToolName(tool: RelatedToolIdentityInput, locale: Locale) {
  const localizedTool = resolveLocalizedToolIdentity(tool, locale);
  return localizedTool.primaryName;
}
