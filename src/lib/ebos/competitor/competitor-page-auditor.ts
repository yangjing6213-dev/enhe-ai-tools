import type { EbosEvidenceWarning } from "../evidence";
import type {
  AuditCompetitorPageInput,
  EbosCompetitorPageAudit,
  EbosCompetitorPageSignals,
  EbosCompetitorPageType,
  EbosCompetitorProductType
} from "./competitor-evidence-types";

export async function auditCompetitorPage(
  input: AuditCompetitorPageInput
): Promise<EbosCompetitorPageAudit> {
  const warnings: EbosEvidenceWarning[] = [];
  const html = input.html ?? "";
  const signals = extractCompetitorSignals(html, input.url);
  const score = calculateCompetitorPageScore(signals);

  if (!html.trim()) {
    warnings.push({
      code: "competitor_page_empty",
      severity: "warning",
      source: "market_research",
      message: `No competitor page HTML was available for ${input.url}.`
    });
  }

  return {
    competitorId: input.competitorId,
    competitorName: input.competitorName,
    url: input.url,
    httpStatus: input.httpStatus,
    ...signals,
    score,
    confidence: html.trim() ? score >= 70 ? "complete" : "partial" : "unknown",
    findings: buildFindings(signals),
    risks: buildRisks(signals),
    opportunities: buildOpportunities(signals),
    warnings
  };
}

export function extractCompetitorSignals(
  html: string,
  url: string
): EbosCompetitorPageSignals {
  const text = decodeHtml(stripTags(html)).replace(/\s+/g, " ").trim();
  const lowered = text.toLowerCase();
  const title = readTag(html, "title");
  const metaDescription = readMetaDescription(html);
  const h1 = readTag(html, "h1");
  const combined = `${url} ${title ?? ""} ${metaDescription ?? ""} ${h1 ?? ""} ${text}`;
  const combinedLower = combined.toLowerCase();

  return {
    path: readUrlPath(url),
    pageType: classifyCompetitorPageType(url),
    title,
    metaDescription,
    h1,
    hasPricingSignal: /\b(pricing|price|paid|pro|subscription|one-time|lifetime|license|plan)\b/i.test(combined),
    hasProductListingSignal: /\b(product listing|tool directory|directory|marketplace|discover|templates?|prompts?|workflows?|tools?)\b/i.test(combined),
    hasProductDetailSignal: /\b(features?|demo|download|delivery|what you get|included|bundle)\b/i.test(combined),
    hasFaqSignal: /\b(faq|frequently asked|questions?)\b/i.test(combined),
    hasUseCaseSignal: /\b(use case|how to|tutorial|example|workflow|scenario)\b/i.test(combined),
    hasComparisonSignal: /\b(compare|comparison|alternative|versus|vs\.?)\b/i.test(combined),
    hasVideoOrMediaSignal: /\b(video|demo|media|screenshot|gallery|preview|youtube)\b/i.test(combined),
    hasNewsletterOrLeadMagnet: /\b(newsletter|waitlist|subscribe|lead magnet|free guide|email list)\b/i.test(combined),
    hasMarketplaceSignal: /\b(marketplace|directory|discover|listing|featured tools?)\b/i.test(combined),
    hasAffiliateSignal: /\b(affiliate|partner|referral|commission)\b/i.test(combined),
    hasStrongCTA: /\b(buy now|get started|start free|try now|download|subscribe|join|claim|launch)\b/i.test(combined),
    detectedProductTypes: detectProductTypes(combinedLower),
    detectedPositioning: detectPositioning(combinedLower),
    detectedPricingTerms: detectTerms(combinedLower, [
      "pricing",
      "price",
      "paid",
      "pro",
      "subscription",
      "one-time",
      "lifetime",
      "license"
    ]),
    detectedSeoSignals: [
      ...(title ? ["title"] : []),
      ...(metaDescription ? ["meta_description"] : []),
      ...(h1 ? ["h1"] : []),
      ...(/<a\b/i.test(html) ? ["internal_links"] : [])
    ],
    detectedGeoSignals: [
      ...(lowered.includes("summary") ? ["summary"] : []),
      ...(/\b(faq|frequently asked)\b/i.test(combined) ? ["faq"] : []),
      ...(/\b(how to|tutorial|step-by-step)\b/i.test(combined) ? ["how-to"] : []),
      ...(/\b(source|sources|reference|research)\b/i.test(combined) ? ["source"] : []),
      ...(/<time\b|datetime=|\b20\d{2}-\d{2}-\d{2}\b/i.test(html) ? ["date"] : []),
      ...(/\b(author|byline|written by)\b/i.test(combined) ? ["author"] : [])
    ]
  };
}

export function classifyCompetitorPageType(url: string): EbosCompetitorPageType {
  const path = readUrlPath(url).toLowerCase();
  if (path === "/" || path === "") return "homepage";
  if (/pricing|plans|subscribe/.test(path)) return "pricing";
  if (/blog|news|article|guide/.test(path)) return "blog";
  if (/docs|documentation|developer|api/.test(path)) return "docs";
  if (/tools|discover|directory|marketplace|templates|prompts|workflows|spaces|trending/.test(path)) return "product_listing";
  if (/product|software|tool|item|listing/.test(path)) return "product_detail";
  return "other";
}

export function calculateCompetitorPageScore(signals: EbosCompetitorPageSignals) {
  let score = 0;
  if (signals.title) score += 8;
  if (signals.metaDescription) score += 8;
  if (signals.h1) score += 8;
  if (signals.hasPricingSignal) score += 10;
  if (signals.hasProductListingSignal) score += 10;
  if (signals.hasProductDetailSignal) score += 7;
  if (signals.hasFaqSignal) score += 8;
  if (signals.hasUseCaseSignal) score += 7;
  if (signals.hasComparisonSignal) score += 5;
  if (signals.hasVideoOrMediaSignal) score += 5;
  if (signals.hasNewsletterOrLeadMagnet) score += 5;
  if (signals.hasMarketplaceSignal) score += 7;
  if (signals.hasAffiliateSignal) score += 2;
  if (signals.hasStrongCTA) score += 8;
  score += Math.min(8, signals.detectedSeoSignals.length * 2);
  score += Math.min(12, signals.detectedGeoSignals.length * 3);
  score += Math.min(9, signals.detectedProductTypes.length * 3);
  return clamp(score, 0, 100);
}

function detectProductTypes(text: string): EbosCompetitorProductType[] {
  const matches: Array<[EbosCompetitorProductType, RegExp]> = [
    ["AI Agent", /\b(ai agent|agent workflow|browser agent|autonomous agent)\b/i],
    ["AI Video", /\b(ai video|video generation|face swap|faceswap|short video)\b/i],
    ["AI Voice", /\b(ai voice|voice clone|text to speech|tts)\b/i],
    ["Prompt Kit", /\b(prompt kit|prompt pack|prompts?)\b/i],
    ["Workflow Pack", /\b(workflow pack|workflow|automation pack)\b/i],
    ["Template Pack", /\b(template pack|templates?)\b/i],
    ["Local AI Tool", /\b(local ai|offline ai|desktop ai)\b/i],
    ["SEO Tool", /\b(seo tool|search engine optimization)\b/i],
    ["GEO Tool", /\b(geo tool|answer engine|ai search|generative engine)\b/i],
    ["Marketplace Listing", /\b(marketplace|directory|listing|discover)\b/i],
    ["Tutorial Pack", /\b(tutorial pack|tutorial|course|guide)\b/i],
    ["ComfyUI Workflow", /\b(comfyui|comfy ui)\b/i]
  ];
  return matches
    .filter(([, pattern]) => pattern.test(text))
    .map(([type]) => type);
}

function detectPositioning(text: string) {
  return detectTerms(text, [
    "directory",
    "marketplace",
    "workflow",
    "template",
    "prompt",
    "automation",
    "developer",
    "creator",
    "business"
  ]);
}

function detectTerms(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term.toLowerCase()));
}

function buildFindings(signals: EbosCompetitorPageSignals) {
  const findings: string[] = [];
  if (signals.title) findings.push(`Title detected: ${signals.title}`);
  if (signals.hasPricingSignal) findings.push("Pricing or monetization signal detected.");
  if (signals.hasProductListingSignal) findings.push("Product listing or marketplace structure detected.");
  if (signals.detectedProductTypes.length) findings.push(`Product types: ${signals.detectedProductTypes.join(", ")}.`);
  return findings.length ? findings : ["No strong competitor page signals detected."];
}

function buildRisks(signals: EbosCompetitorPageSignals) {
  const risks: string[] = [];
  if (!signals.hasPricingSignal) risks.push("Pricing and monetization signals were not visible.");
  if (!signals.hasStrongCTA) risks.push("Strong conversion CTA was not detected.");
  if (signals.detectedGeoSignals.length < 2) risks.push("GEO answerability signals are thin.");
  return risks;
}

function buildOpportunities(signals: EbosCompetitorPageSignals) {
  const opportunities: string[] = [];
  if (signals.hasPricingSignal) opportunities.push("Compare ENHE product page pricing clarity against this competitor signal.");
  if (signals.hasFaqSignal) opportunities.push("Use FAQ and how-to blocks as an ENHE answerability benchmark.");
  if (signals.detectedProductTypes.length) opportunities.push(`Validate ENHE differentiation around ${signals.detectedProductTypes.slice(0, 3).join(", ")}.`);
  return opportunities.length ? opportunities : ["Use this page as a weak-signal baseline only."];
}

function readTag(html: string, tag: string) {
  return decodeHtml(html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "").trim() || undefined;
}

function readMetaDescription(html: string) {
  const match = html.match(/<meta\b(?=[^>]*name=["']description["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>/i)
    ?? html.match(/<meta\b(?=[^>]*content=["']([^"']*)["'])(?=[^>]*name=["']description["'])[^>]*>/i);
  return decodeHtml(match?.[1] ?? "").trim() || undefined;
}

function stripTags(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function readUrlPath(url: string) {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
