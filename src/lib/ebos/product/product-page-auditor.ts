import type {
  EbosEvidenceActionItem,
  EbosEvidenceWarning
} from "../evidence";
import type { EbosProductPageAudit } from "./product-evidence-types";

export type ProductPageAuditInput = {
  url: string;
  html: string;
  httpStatus?: number;
  warning?: string;
};

type ProductPageSignals = Omit<
  EbosProductPageAudit,
  | "conversionReadinessScore"
  | "offerClarityScore"
  | "deliveryReadinessScore"
  | "score"
  | "confidence"
  | "findings"
  | "risks"
  | "opportunities"
  | "actionItems"
  | "warnings"
>;

export function auditProductPage(input: ProductPageAuditInput): EbosProductPageAudit {
  const signals = extractProductPageSignals(input.html, input.url, input.httpStatus);
  const score = calculateProductPageScore(signals);
  const warnings = [
    ...(input.warning ? [warning("page_fetch_warning", input.warning, input.url)] : []),
    ...(!input.html.trim() ? [warning("empty_product_page_html", "Product page HTML was empty or unavailable.", input.url)] : [])
  ];
  const risks = buildPageRisks(signals);
  const actionItems = buildPageActionItems(signals);
  const findings = buildPageFindings(signals);
  const opportunities = buildPageOpportunities(signals);

  return {
    ...signals,
    conversionReadinessScore: calculateConversionReadinessScore(signals),
    offerClarityScore: calculateOfferClarityScore(signals),
    deliveryReadinessScore: calculateDeliveryReadinessScore(signals),
    score,
    confidence: score >= 80 && warnings.length === 0 && risks.length === 0 ? "complete" : "partial",
    findings,
    risks,
    opportunities,
    actionItems,
    warnings
  };
}

export function extractProductPageSignals(
  html: string,
  url: string,
  httpStatus?: number
): ProductPageSignals {
  const path = safePath(url);
  const title = cleanText(readTagContent(html, "title"));
  const h1 = cleanText(readTagContent(html, "h1"));
  const text = stripTags(html);
  const anchors = extractAnchors(html, url);
  const primaryCtaTexts = anchors
    .filter((anchor) => isPrimaryCtaText(anchor.text) && !/\bafter purchase\b/i.test(anchor.text))
    .map((anchor) => anchor.text);
  const buyAnchors = anchors.filter((anchor) => isBuyHref(anchor.href) || isBuyText(anchor.text));

  return {
    url,
    path,
    slug: extractSlug(path),
    productName: h1 ?? title,
    httpStatus,
    hasClearHero: Boolean(h1 || title || /\bhero\b/i.test(html)),
    hasProductSummary: hasAny(text, [
      /\bproduct summary\b/i,
      /\boverview\b/i,
      /\bsummary\b/i,
      /产品简介|产品介绍|概述|简介/
    ]),
    hasFeatureList: hasAny(text, [/\bfeatures?\b/i, /\bcapabilities\b/i, /功能|特性|特点/]) || countTag(html, "li") >= 2,
    hasUseCases: hasAny(text, [/\buse cases?\b/i, /\bworkflow\b/i, /\bscenario/i, /使用场景|应用场景|工作流/]),
    hasTargetAudience: hasAny(text, [/\btarget audience\b/i, /\bwho it is for\b/i, /\bbuilt for\b/i, /\bfor creators?\b/i, /适合|面向|为.*打造/]),
    hasPricingOrPurchaseInfo: hasAny(text, [/\bpricing\b/i, /\bprice\b/i, /\bbuy\b/i, /\bpurchase\b/i, /\bpaid\b/i, /\blicense\b/i, /价格|购买|付费|订阅|授权/]),
    hasPrimaryCTA: primaryCtaTexts.length > 0,
    hasSecondaryCTA: anchors.some((anchor) => /\bwatch demo\b|\blearn more\b|\bview details\b|\btry\b|演示|了解更多|查看/i.test(anchor.text)),
    hasBuyLink: buyAnchors.some((anchor) => Boolean(anchor.href)),
    hasDownloadOrDeliveryInfo: hasAny(text, [
      /\bdownload after purchase\b/i,
      /\bdownload link\b/i,
      /\blicense key\b/i,
      /\bdelivery\b/i,
      /\bdelivered\b/i,
      /购买后下载|下载链接|交付|授权码|安装包/
    ]),
    hasFaqSection: hasFaqSection(html, text),
    faqCount: countFaqItems(html, text),
    hasMedia: /<(img|video|picture|source)\b/i.test(html) || /\bscreenshot\b|\bdemo video\b|截图|视频演示/i.test(text),
    hasVideo: /<(video|source)\b/i.test(html) || /\bvideo\b|\bdemo\b|视频/i.test(text),
    hasProductImage: /<img\b/i.test(html) || /\bscreenshot\b|\bproduct image\b|截图|封面图/i.test(text),
    hasTrustSignal: hasAny(text, [/\btestimonial\b/i, /\breviews?\b/i, /\btrusted\b/i, /\bsecure\b/i, /\bsupport\b/i, /\brefund\b/i, /评价|信任|安全|支持|退款/]),
    hasRefundOrSupportInfo: hasAny(text, [/\bsupport\b/i, /\brefund\b/i, /\bservice policy\b/i, /\bafter-sales\b/i, /售后|支持|退款|服务/]),
    hasComplianceNotice: hasAny(text, [/\bcompliance\b/i, /\bprivacy\b/i, /\bterms\b/i, /\bpolicy\b/i, /\blicense\b/i, /合规|隐私|条款|政策|授权/]),
    internalLinksCount: anchors.filter((anchor) => anchor.internal).length,
    wordCountEstimate: estimateWordCount(text)
  };
}

export function calculateProductPageScore(signals: ProductPageSignals) {
  let score = 0;
  if (signals.hasClearHero) score += 10;
  if (signals.hasProductSummary) score += 10;
  if (signals.hasFeatureList) score += 10;
  if (signals.hasUseCases) score += 8;
  if (signals.hasTargetAudience) score += 8;
  if (signals.hasPricingOrPurchaseInfo) score += 12;
  if (signals.hasPrimaryCTA) score += 12;
  if (signals.hasBuyLink || signals.hasDownloadOrDeliveryInfo) score += 10;
  if (signals.hasFaqSection) score += 10;
  if (signals.hasMedia) score += 10;
  if (signals.hasRefundOrSupportInfo || signals.hasComplianceNotice || signals.hasTrustSignal) score += 10;
  return Math.max(0, Math.min(100, score));
}

function calculateConversionReadinessScore(signals: ProductPageSignals) {
  let score = 0;
  if (signals.hasPrimaryCTA) score += 35;
  if (signals.hasBuyLink) score += 25;
  if (signals.hasSecondaryCTA) score += 10;
  if (signals.hasPricingOrPurchaseInfo) score += 20;
  if (signals.internalLinksCount > 0) score += 10;
  return Math.min(100, score);
}

function calculateOfferClarityScore(signals: ProductPageSignals) {
  let score = 0;
  if (signals.hasProductSummary) score += 20;
  if (signals.hasFeatureList) score += 20;
  if (signals.hasUseCases) score += 20;
  if (signals.hasTargetAudience) score += 20;
  if (signals.hasPricingOrPurchaseInfo) score += 20;
  return score;
}

function calculateDeliveryReadinessScore(signals: ProductPageSignals) {
  let score = 0;
  if (signals.hasDownloadOrDeliveryInfo) score += 35;
  if (signals.hasFaqSection) score += 20;
  if (signals.hasRefundOrSupportInfo) score += 20;
  if (signals.hasComplianceNotice) score += 10;
  if (signals.hasMedia) score += 15;
  return Math.min(100, score);
}

function buildPageFindings(signals: ProductPageSignals) {
  const findings: string[] = [];
  if (signals.hasClearHero) findings.push("Product page has a clear hero or title.");
  if (signals.hasProductSummary) findings.push("Product summary is present.");
  if (signals.hasPrimaryCTA) findings.push("Primary CTA is present.");
  if (signals.hasFaqSection) findings.push(`FAQ section is present with ${signals.faqCount} detected items.`);
  if (signals.hasMedia) findings.push("Product media assets are present.");
  return findings;
}

function buildPageRisks(signals: ProductPageSignals) {
  const risks: string[] = [];
  if (!signals.hasProductSummary) risks.push("Product page is missing a product summary.");
  if (!signals.hasPrimaryCTA) risks.push("Product page is missing a primary CTA.");
  if (!signals.hasPricingOrPurchaseInfo && !signals.hasBuyLink) risks.push("Product page is missing purchase or pricing path evidence.");
  if (!signals.hasFaqSection) risks.push("Product page is missing FAQ coverage.");
  if (!signals.hasDownloadOrDeliveryInfo) risks.push("Product page is missing download or delivery information.");
  if (!signals.hasRefundOrSupportInfo) risks.push("Product page is missing support or refund information.");
  return risks;
}

function buildPageOpportunities(signals: ProductPageSignals) {
  const opportunities: string[] = [];
  if (!signals.hasMedia) opportunities.push("Add product screenshots or demo video to improve buyer confidence.");
  if (!signals.hasUseCases) opportunities.push("Add use cases to connect product capabilities with buyer intent.");
  if (!signals.hasTargetAudience) opportunities.push("Clarify the target audience for the product.");
  if (!signals.hasSecondaryCTA) opportunities.push("Add a secondary CTA such as demo, docs, or related product path.");
  return opportunities;
}

function buildPageActionItems(signals: ProductPageSignals) {
  const items: EbosEvidenceActionItem[] = [];
  if (!signals.hasProductSummary) {
    items.push(action("product-summary", "Add product summary to product pages", "Write a concise summary that explains the product, target user, and outcome.", "high"));
  }
  if (!signals.hasPrimaryCTA) {
    items.push(action("product-primary-cta", "Add primary CTA to product pages", "Add a visible buy, download, or get-started CTA above the fold.", "high"));
  }
  if (!signals.hasPricingOrPurchaseInfo && !signals.hasBuyLink) {
    items.push(action("product-purchase-path", "Add purchase path and pricing information", "Make price, purchase rules, or paid download path explicit on the page.", "high"));
  }
  if (!signals.hasFaqSection) {
    items.push(action("product-faq", "Add FAQ section to product pages", "Add buyer questions about setup, payment, delivery, refunds, and support.", "medium"));
  }
  if (!signals.hasDownloadOrDeliveryInfo) {
    items.push(action("product-delivery", "Add delivery information to product pages", "Explain download, license, activation, or delivery steps after purchase.", "medium"));
  }
  if (!signals.hasRefundOrSupportInfo) {
    items.push(action("product-support", "Add support and refund copy to product pages", "Explain service scope, support channel, refund notes, and buyer protection.", "medium"));
  }
  return items;
}

function action(
  id: string,
  title: string,
  description: string,
  priority: EbosEvidenceActionItem["priority"]
): EbosEvidenceActionItem {
  return {
    id,
    title,
    description,
    priority,
    owner: "codex",
    relatedSection: "product",
    status: "open"
  };
}

function warning(code: string, message: string, source?: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source
  };
}

function readTagContent(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1];
}

function countTag(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}\\b`, "gi"))?.length ?? 0;
}

function hasFaqSection(html: string, text: string) {
  return /\bfaq\b/i.test(text) || /常见问题|问答/i.test(text) || /"@type"\s*:\s*"FAQPage"/i.test(html);
}

function countFaqItems(html: string, text: string) {
  if (!hasFaqSection(html, text)) return 0;
  const faqBlock = html.match(/<(section|div|article)\b[^>]*>[\s\S]*?\bFAQ\b[\s\S]*?<\/\1>/i)?.[0] ?? html;
  const headingCount = (faqBlock.match(/<h[3-6]\b/gi) ?? []).length;
  const questionCount = (faqBlock.match(/\?/g) ?? []).length;
  return Math.max(headingCount, Math.min(questionCount, 10), 1);
}

function extractAnchors(html: string, pageUrl: string) {
  const origin = safeOrigin(pageUrl);
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => {
    const attrs = match[1] ?? "";
    const href = readAttribute(attrs, "href") ?? "";
    const text = cleanText(match[2]) ?? "";
    return {
      href,
      text,
      internal: Boolean(href && (href.startsWith("/") || (origin && href.startsWith(origin))))
    };
  });
}

function readAttribute(tag: string, attr: string) {
  return cleanText(tag.match(new RegExp(`\\b${attr}=["']([^"']*)["']`, "i"))?.[1]);
}

function isPrimaryCtaText(text: string) {
  return /\bbuy\b|\bpurchase\b|\bget started\b|\bstart\b|\btry\b|立即购买|购买|获取|开通/i.test(text);
}

function isBuyText(text: string) {
  return /\bbuy\b|\bpurchase\b|\bcheckout\b|购买|下单|支付/i.test(text);
}

function isBuyHref(href: string) {
  return /checkout|order|buy|purchase|payment|cart|download|购买|支付/i.test(href);
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string | undefined) {
  return value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || undefined;
}

function estimateWordCount(text: string) {
  const words = text.match(/[A-Za-z0-9]+|[\u4e00-\u9fff]/g);
  return words?.length ?? 0;
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
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

function extractSlug(path: string) {
  const pathname = path.replace(/\/+$/, "");
  if (!/^\/(?:en\/)?software\/[^/]+$/.test(pathname)) return undefined;
  return pathname.split("/").filter(Boolean).at(-1);
}
