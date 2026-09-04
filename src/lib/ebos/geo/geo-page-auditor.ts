import type { EbosEvidenceWarning } from "../evidence";
import { classifyPageType } from "../seo";
import type { EbosGeoPageAudit } from "./geo-evidence-types";

export type GeoPageAuditInput = {
  url: string;
  html: string;
  warning?: string;
};

type GeoSignals = Omit<EbosGeoPageAudit, "answerabilityScore" | "citationReadinessScore" | "score" | "confidence" | "findings" | "risks" | "opportunities" | "warnings">;

export function auditGeoPage(input: GeoPageAuditInput): EbosGeoPageAudit {
  const signals = extractGeoSignals(input.html, input.url);
  const answerabilityScore = calculateAnswerabilityScore(signals);
  const citationReadinessScore = calculateCitationReadinessScore(signals);
  const score = calculateGeoPageScore(signals);
  const risks: string[] = [];
  const findings: string[] = [];
  const opportunities: string[] = [];
  const warnings: EbosEvidenceWarning[] = input.warning
    ? [warning("page_fetch_warning", input.warning, input.url)]
    : [];

  if (!signals.hasClearEntity) risks.push("Page is missing clear brand or product entity signals.");
  if (!signals.hasSummarySection) risks.push("Page is missing a clear summary or introduction section.");
  if (!signals.hasFaqSection) {
    risks.push("Page is missing FAQ signals for answer-engine extraction.");
    opportunities.push("Add concise FAQ content that answers buyer and setup questions.");
  }
  if (signals.pageType === "ai_news" && !signals.hasDateSignal) {
    warnings.push(warning("missing_date_signal", "AI news page is missing date signal.", input.url));
  }
  if (signals.pageType === "ai_news" && !signals.hasEvidenceOrSourceLinks) {
    warnings.push(warning("missing_source_signal", "AI news page is missing external source signal.", input.url));
  }
  if (signals.hasClearEntity) findings.push(`Detected entities: ${signals.detectedEntities.join(", ")}.`);
  if (signals.hasFaqSection) findings.push("FAQ section or FAQ structured data is present.");
  if (signals.hasEvidenceOrSourceLinks) findings.push("External source links are present.");

  return {
    ...signals,
    answerabilityScore,
    citationReadinessScore,
    score,
    confidence: warnings.length || risks.length ? "partial" : "complete",
    findings,
    risks,
    opportunities,
    warnings
  };
}

export function extractGeoSignals(html: string, url: string): GeoSignals {
  const text = stripTags(html);
  const structuredDataTypes = extractStructuredDataTypes(html);
  const detectedEntities = detectEntities(text, url);

  return {
    url,
    path: safePath(url),
    pageType: classifyPageType(url),
    title: cleanText(readTagContent(html, "title")),
    h1: cleanText(readTagContent(html, "h1")),
    hasClearEntity: detectedEntities.length > 0,
    detectedEntities,
    hasSummarySection: /\b(summary|overview|introduction)\b|简介|概览|总结/i.test(text),
    hasFaqSection: structuredDataTypes.includes("FAQPage") || /\bfaq\b|常见问题|问答/i.test(text),
    hasHowToSection: structuredDataTypes.includes("HowTo") || /\b(how to|step|tutorial|guide)\b|教程|步骤|如何/i.test(text),
    hasComparisonSection: /\b(compare|comparison|versus|vs\.)\b|对比|比较/i.test(text),
    hasPricingOrPurchaseSection: /\b(price|pricing|buy|purchase|checkout|license)\b|价格|购买|下单|授权/i.test(text),
    hasAuthorOrBrandSignal: /\bENHE\b|author|by\s+[A-Z][a-z]+|品牌|作者/i.test(text),
    hasDateSignal: /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|updated|published|modified|更新|发布/i.test(text) || /article:(published|modified)_time/i.test(html),
    hasEvidenceOrSourceLinks: countExternalLinks(html, url) > 0 || /\b(source|reference|citation|according to)\b|来源|引用|参考/i.test(text),
    hasStructuredData: structuredDataTypes.length > 0
  };
}

export function calculateGeoPageScore(signals: GeoSignals) {
  let score = 0;
  if (signals.hasClearEntity) score += 15;
  if (signals.hasSummarySection) score += 10;
  if (signals.hasFaqSection) score += 15;
  if (signals.hasHowToSection) score += 10;
  if (signals.hasPricingOrPurchaseSection) score += 10;
  if (signals.hasAuthorOrBrandSignal) score += 10;
  if (signals.hasDateSignal) score += 5;
  if (signals.hasEvidenceOrSourceLinks) score += 10;
  if (signals.hasStructuredData) score += 15;
  return Math.max(0, Math.min(100, score));
}

function calculateAnswerabilityScore(signals: GeoSignals) {
  let score = 0;
  if (signals.hasClearEntity) score += 25;
  if (signals.hasSummarySection) score += 25;
  if (signals.hasFaqSection) score += 25;
  if (signals.hasHowToSection || signals.hasPricingOrPurchaseSection) score += 25;
  return score;
}

function calculateCitationReadinessScore(signals: GeoSignals) {
  let score = 0;
  if (signals.hasAuthorOrBrandSignal) score += 25;
  if (signals.hasDateSignal) score += 25;
  if (signals.hasEvidenceOrSourceLinks) score += 25;
  if (signals.hasStructuredData) score += 25;
  return score;
}

function detectEntities(text: string, url: string) {
  const entities = new Set<string>();
  if (/\bENHE\b/i.test(text) || /enhe-tech/i.test(url)) entities.add("ENHE");
  if (/\bChatGPT\b/i.test(text)) entities.add("ChatGPT");
  if (/\bPerplexity\b/i.test(text)) entities.add("Perplexity");
  if (/\bGemini\b/i.test(text)) entities.add("Gemini");
  if (/\bClaude\b/i.test(text)) entities.add("Claude");
  if (/\bWindows AI\b/i.test(text)) entities.add("Windows AI");
  return [...entities];
}

function readTagContent(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1];
}

function extractStructuredDataTypes(html: string) {
  const types = new Set<string>();
  for (const script of html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? []) {
    const body = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      collectJsonLdTypes(JSON.parse(body), types);
    } catch {
      for (const match of body.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(match[1]!);
    }
  }
  return [...types];
}

function collectJsonLdTypes(value: unknown, types: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdTypes(item, types);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (typeof type === "string") types.add(type);
  if (Array.isArray(type)) for (const item of type) if (typeof item === "string") types.add(item);
  for (const item of Object.values(record)) collectJsonLdTypes(item, types);
}

function countExternalLinks(html: string, pageUrl: string) {
  const origin = safeOrigin(pageUrl);
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1] ?? "")
    .filter((href) => /^https?:\/\//i.test(href) && !href.startsWith(origin)).length;
}

function stripTags(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string | undefined) {
  return value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || undefined;
}

function safePath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
  }
}

function safeOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function warning(code: string, message: string, source?: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source
  };
}
