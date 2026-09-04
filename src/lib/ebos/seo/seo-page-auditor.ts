import type { EbosEvidenceWarning } from "../evidence";
import type {
  EbosSeoPageAudit,
  EbosSeoPageType
} from "./seo-evidence-types";

export type SeoPageAuditInput = {
  url: string;
  html: string;
  httpStatus?: number;
  warning?: string;
};

type SeoSignals = Omit<EbosSeoPageAudit, "score" | "confidence" | "findings" | "risks" | "opportunities" | "warnings">;

export function auditSeoPage(input: SeoPageAuditInput): EbosSeoPageAudit {
  const signals = extractPageSeoSignals(input.html, input.url, input.httpStatus);
  const score = calculateSeoPageScore(signals);
  const warnings: EbosEvidenceWarning[] = input.warning
    ? [warning("page_fetch_warning", input.warning, input.url)]
    : [];
  const risks: string[] = [];
  const findings: string[] = [];
  const opportunities: string[] = [];

  if (!signals.title) risks.push("Page is missing title.");
  if (!signals.metaDescription) risks.push("Page is missing meta description.");
  if (!signals.h1) risks.push("Page is missing h1.");
  if (!signals.canonical) risks.push("Page is missing canonical.");
  if (!signals.hasStructuredData) risks.push("Page is missing structured data.");
  if (signals.pageType === "software_detail" && (!signals.hasProductSignals || !signals.hasFaqSignals)) {
    risks.push("Software detail page is missing Product or FAQ signals.");
    opportunities.push("Add Product and FAQ structured signals to improve product SEO.");
  }
  if (signals.imagesWithoutAltCount > 0) {
    opportunities.push("Add alt text to important images.");
  }
  if (signals.title) findings.push("Title is present.");
  if (signals.metaDescription) findings.push("Meta description is present.");
  if (signals.hasStructuredData) findings.push(`Structured data found: ${signals.structuredDataTypes.join(", ") || "unknown"}.`);

  return {
    ...signals,
    score,
    confidence: warnings.length || risks.length ? "partial" : "complete",
    findings,
    risks,
    opportunities,
    warnings
  };
}

export function extractPageSeoSignals(
  html: string,
  url: string,
  httpStatus?: number
): SeoSignals {
  const path = safePath(url);
  const structuredDataTypes = extractStructuredDataTypes(html);
  const title = cleanText(readTagContent(html, "title"));
  const metaDescription = readMeta(html, "name", "description");
  const h1 = cleanText(readTagContent(html, "h1"));
  const canonical = readLink(html, "canonical");
  const robotsMeta = readMeta(html, "name", "robots");
  const links = extractLinks(html, url);

  return {
    url,
    path,
    pageType: classifyPageType(url),
    httpStatus,
    title,
    metaDescription,
    h1,
    h2Count: countTag(html, "h2"),
    canonical,
    robotsMeta,
    hasStructuredData: structuredDataTypes.length > 0,
    structuredDataTypes,
    hasOpenGraph: /<meta\b[^>]+property=["']og:/i.test(html),
    hasTwitterCard: /<meta\b[^>]+(?:name|property)=["']twitter:/i.test(html),
    hasFaqSignals: hasFaqSignals(html, structuredDataTypes),
    hasProductSignals: hasProductSignals(html, structuredDataTypes),
    hasBreadcrumbSignals: structuredDataTypes.includes("BreadcrumbList") || /breadcrumb/i.test(html),
    internalLinksCount: links.internal,
    externalLinksCount: links.external,
    imagesWithoutAltCount: countImagesWithoutAlt(html),
    wordCountEstimate: estimateWordCount(html)
  };
}

export function classifyPageType(url: string): EbosSeoPageType {
  const path = safePath(url).replace(/\/$/, "");
  if (path === "") return "homepage";
  if (path === "/software") return "software_listing";
  if (path.startsWith("/software/") || path.startsWith("/en/software/")) return "software_detail";
  if (path.startsWith("/ai-news") || path.startsWith("/en/ai-news")) return "ai_news";
  if (path.startsWith("/ai-trends") || path.startsWith("/en/ai-trends")) return "ai_trends";
  if (path.startsWith("/account-services") || path.startsWith("/en/account-services")) return "account_services";
  if (path.startsWith("/skill-learning") || path.startsWith("/en/skill-learning")) return "skill_learning";
  return "other";
}

export function calculateSeoPageScore(signals: SeoSignals) {
  let score = 0;
  if (signals.title) score += 15;
  if (signals.metaDescription) score += 15;
  if (signals.h1) score += 10;
  if (signals.canonical) score += 10;
  if (signals.hasStructuredData) score += 15;
  if (signals.hasOpenGraph) score += 5;
  if (signals.hasTwitterCard) score += 5;
  if (signals.internalLinksCount > 0) score += 10;
  if (signals.pageType === "software_detail" && signals.hasProductSignals && signals.hasFaqSignals) {
    score += 15;
  }
  return Math.max(0, Math.min(100, score));
}

function readTagContent(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1];
}

function readMeta(html: string, attr: "name" | "property", value: string) {
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attr}=["']${escapeRegex(value)}["'])[^>]*>`, "i"))?.[0];
  return tag ? readAttribute(tag, "content") : undefined;
}

function readLink(html: string, rel: string) {
  const tag = html.match(new RegExp(`<link\\b(?=[^>]*\\brel=["']${escapeRegex(rel)}["'])[^>]*>`, "i"))?.[0];
  return tag ? readAttribute(tag, "href") : undefined;
}

function readAttribute(tag: string, attr: string) {
  return cleanText(tag.match(new RegExp(`\\b${attr}=["']([^"']*)["']`, "i"))?.[1]);
}

function countTag(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}\\b`, "gi"))?.length ?? 0;
}

function extractStructuredDataTypes(html: string) {
  const types = new Set<string>();
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      collectJsonLdTypes(JSON.parse(body), types);
    } catch {
      for (const match of body.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) {
        types.add(match[1]!);
      }
    }
  }
  return [...types].sort();
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
  if (Array.isArray(type)) {
    for (const item of type) if (typeof item === "string") types.add(item);
  }
  for (const item of Object.values(record)) collectJsonLdTypes(item, types);
}

function hasFaqSignals(html: string, types: string[]) {
  return types.includes("FAQPage") || /\bfaq\b|常见问题|问答/i.test(stripTags(html));
}

function hasProductSignals(html: string, types: string[]) {
  return types.some((type) => ["Product", "SoftwareApplication", "Offer"].includes(type))
    || /\b(product|software|pricing|buy|purchase)\b|产品|价格|购买/i.test(stripTags(html));
}

function extractLinks(html: string, pageUrl: string) {
  let internal = 0;
  let external = 0;
  const origin = safeOrigin(pageUrl);
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1] ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (href.startsWith("/") || (origin && href.startsWith(origin))) internal += 1;
    else if (/^https?:\/\//i.test(href)) external += 1;
  }
  return { internal, external };
}

function countImagesWithoutAlt(html: string) {
  return (html.match(/<img\b[^>]*>/gi) ?? []).filter((tag) => !/\balt=["'][^"']*["']/i.test(tag)).length;
}

function estimateWordCount(html: string) {
  const text = stripTags(html);
  const words = text.match(/[A-Za-z0-9]+|[\u4e00-\u9fff]/g);
  return words?.length ?? 0;
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
