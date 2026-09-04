import type {
  EbosDecisionRecommendation,
  EbosEvidenceDecisionInput,
  EbosExistingProductRecommendation,
  EbosPriorityExistingProduct,
  EbosPriorityProductDirection
} from "./decision-types";

export function prioritizeProductDirections(input: EbosEvidenceDecisionInput): EbosPriorityProductDirection[] {
  const marketDirections = arrayFrom(readPath(input.marketEvidence, ["recommendedProductDirections"])).map(asRecord).filter(isRecord);
  const competitorOpportunities = arrayFrom(readPath(input.competitorEvidence, ["differentiationOpportunities"])).map(asRecord).filter(isRecord);

  return marketDirections
    .map((direction, index) => calculateDirectionPriorityScore(direction, input, competitorOpportunities, index))
    .sort((a, b) => b.totalPriorityScore - a.totalPriorityScore);
}

export function prioritizeExistingProducts(input: EbosEvidenceDecisionInput): EbosPriorityExistingProduct[] {
  const audits = arrayFrom(readPath(input.productEvidence, ["productAudits"])).map(asRecord).filter(isRecord);
  const validationProducts = arrayFrom(readPath(input.revenueEvidence, ["productRevenueSummary", "recommendedValidationProducts"]))
    .map(asRecord)
    .filter(isRecord);

  return audits
    .map((product) => calculateExistingProductPriority(product, input, validationProducts))
    .sort((a, b) => b.totalPriorityScore - a.totalPriorityScore);
}

export function calculateDirectionPriorityScore(
  direction: Record<string, unknown>,
  evidence: EbosEvidenceDecisionInput,
  competitorOpportunities: Record<string, unknown>[] = [],
  index = 0
): EbosPriorityProductDirection {
  const name = readString(direction.productDirection) ?? readString(direction.name) ?? `Direction ${index + 1}`;
  const description = readString(direction.description) ?? `${name} validation direction.`;
  const marketPriority = readNumber(direction.priorityScore) ?? 50;
  const competitorMatch = findCompetitorMatch(name, competitorOpportunities);
  const marketScore = clamp(Math.round(marketPriority * 0.2), 0, 20);
  const competitorScore = competitorMatch ? clamp(Math.round((readNumber(competitorMatch.priorityScore) ?? 70) * 0.21), 0, 15) : 0;
  const productFitScore = calculateProductFitScore(name, evidence);
  const firstRevenueAchieved = readPath(evidence.revenueEvidence, ["revenueSummary", "firstRevenueAchieved"]) === true;
  const lowCost = isFastValidationDirection(name);
  const revenueUrgencyScore = firstRevenueAchieved ? 5 : lowCost ? 15 : 3;
  const seoPotentialScore = calculateSeoGeoScore(name, evidence.seoEvidence, "seo");
  const geoPotentialScore = calculateSeoGeoScore(name, evidence.geoEvidence, "geo");
  const validationSpeedScore = lowCost ? 10 : isHeavyBuildDirection(name) ? 2 : 6;
  const buildDifficultyScore = isHeavyBuildDirection(name) ? 10 : lowCost ? 1 : 4;
  const totalPriorityScore = clamp(
    marketScore
      + competitorScore
      + productFitScore
      + revenueUrgencyScore
      + seoPotentialScore
      + geoPotentialScore
      + validationSpeedScore
      - buildDifficultyScore,
    0,
    100
  );
  const recommendation = recommendationForScore(totalPriorityScore, name, firstRevenueAchieved);
  const risks = [
    ...arrayFrom(direction.risks).map(String),
    ...(!firstRevenueAchieved && isHeavyBuildDirection(name) ? ["first revenue is not achieved; avoid heavy development before validation."] : []),
    ...(competitorScore > 0 ? ["Competitor signals do not prove traffic, sales, or revenue."] : [])
  ];

  return {
    id: readString(direction.id) ?? slugify(name),
    name,
    description,
    sourceSignals: [
      "market_evidence",
      ...(competitorScore > 0 ? ["competitor_evidence"] : []),
      ...(productFitScore > 0 ? ["product_evidence"] : []),
      "revenue_evidence"
    ],
    marketScore,
    competitorScore,
    productFitScore,
    revenueUrgencyScore,
    seoPotentialScore,
    geoPotentialScore,
    buildDifficultyScore,
    validationSpeedScore,
    totalPriorityScore,
    recommendation,
    reason: buildDirectionReason(name, recommendation, firstRevenueAchieved, competitorScore),
    risks,
    suggestedFormats: arrayFrom(direction.suggestedProductFormats).map(String),
    suggestedPriceRange: readString(direction.suggestedPriceRange) ?? "CNY 9-99 validation offer",
    nextActions: arrayFrom(direction.nextActions).map(String)
  };
}

export function calculateExistingProductPriority(
  product: Record<string, unknown>,
  evidence: EbosEvidenceDecisionInput,
  validationProducts: Record<string, unknown>[] = []
): EbosPriorityExistingProduct {
  const productName = readString(product.productName) ?? "Unknown product";
  const slug = readString(product.slug);
  const score = readNumber(product.score) ?? 0;
  const conversionReadiness = readNumber(product.conversionReadinessScore) ?? score;
  const deliveryReadiness = readNumber(product.deliveryReadinessScore) ?? score;
  const revenueMatch = validationProducts.find((item) =>
    sameText(readString(item.productSlug), slug) || sameText(readString(item.productName), productName)
  );
  const revenueReadiness = readNumber(revenueMatch?.revenueReadinessScore) ?? 50;
  const firstRevenueAchieved = readPath(evidence.revenueEvidence, ["revenueSummary", "firstRevenueAchieved"]) === true;
  const conversionRisks = arrayFrom(product.risks).map(String);
  const readinessScore = clamp(Math.round((score + conversionReadiness + deliveryReadiness) / 3), 0, 100);
  const totalPriorityScore = clamp(
    Math.round(readinessScore * 0.35)
      + Math.round(revenueReadiness * 0.25)
      + (firstRevenueAchieved ? 5 : 15)
      + (readinessScore >= 80 ? 10 : 4)
      + (conversionRisks.length ? -10 : 10),
    0,
    100
  );
  const recommendation = existingProductRecommendation(conversionReadiness, deliveryReadiness, totalPriorityScore, conversionRisks);

  return {
    productName,
    slug,
    readinessScore,
    revenueStatus: firstRevenueAchieved ? "revenue_achieved" : "first_revenue_not_achieved",
    seoGeoReadiness: readinessScore >= 80 ? "strong" : "partial",
    conversionRisks,
    totalPriorityScore,
    recommendation,
    reason: recommendation === "validate_this_week"
      ? "Product readiness is high while revenue is still unproven; validate demand before building new products."
      : "Fix conversion or delivery readiness before running a revenue validation.",
    nextActions: recommendation === "validate_this_week"
      ? [`Run a pricing or marketplace validation for ${productName}.`]
      : [`Fix product page conversion and delivery blockers for ${productName}.`]
  };
}

function findCompetitorMatch(name: string, opportunities: Record<string, unknown>[]) {
  return opportunities.find((item) => {
    const related = arrayFrom(item.relatedMarketDirections).map(String);
    const title = readString(item.title) ?? "";
    return related.some((value) => hasSharedSignal(value, name)) || hasSharedSignal(title, name);
  });
}

function calculateProductFitScore(name: string, evidence: EbosEvidenceDecisionInput) {
  const normalized = name.toLowerCase();
  const productText = JSON.stringify(readPath(evidence.productEvidence, ["productAudits"]) ?? "").toLowerCase();
  if (normalized.includes("video") || normalized.includes("faceswap")) return productText.includes("video") || productText.includes("faceswap") ? 20 : 12;
  if (normalized.includes("prompt")) return 18;
  if (normalized.includes("seo") || normalized.includes("geo")) return 18;
  if (normalized.includes("agent") || normalized.includes("workflow")) return 16;
  return 8;
}

function calculateSeoGeoScore(name: string, evidence: unknown, kind: "seo" | "geo") {
  const score = readNumber(readPath(evidence, ["overallScore"])) ?? 0;
  const text = name.toLowerCase();
  const relevant = kind === "seo"
    ? text.includes("seo") || text.includes("content") || text.includes("prompt") || text.includes("landing")
    : text.includes("geo") || text.includes("prompt") || text.includes("faq") || text.includes("tutorial");
  if (!relevant) return score >= 80 ? 3 : 0;
  if (score >= 75) return 8;
  if (score >= 60) return 5;
  return 2;
}

function recommendationForScore(
  score: number,
  name: string,
  firstRevenueAchieved: boolean
): EbosDecisionRecommendation {
  if (!firstRevenueAchieved && isHeavyBuildDirection(name)) return score >= 60 ? "create_content_test" : "watch";
  if (score >= 80) return "validate_this_week";
  if (score >= 70) return "prepare_landing_page";
  if (score >= 60) return "create_content_test";
  if (score >= 50) return "watch";
  return "ignore";
}

function existingProductRecommendation(
  conversionReadiness: number,
  deliveryReadiness: number,
  score: number,
  risks: string[]
): EbosExistingProductRecommendation {
  const riskText = risks.join(" ").toLowerCase();
  if (conversionReadiness < 60 || riskText.includes("price") || riskText.includes("purchase")) return "fix_product_page_first";
  if (deliveryReadiness < 60 || riskText.includes("delivery") || riskText.includes("download")) return "fix_delivery_first";
  return score >= 70 ? "validate_this_week" : "watch";
}

function buildDirectionReason(name: string, recommendation: EbosDecisionRecommendation, firstRevenueAchieved: boolean, competitorScore: number) {
  const competitor = competitorScore > 0 ? " Market and competitor evidence point in the same direction." : "";
  const revenue = firstRevenueAchieved ? " Revenue exists, but validation should still stay scoped." : " First revenue is not achieved, so low-cost validation is preferred.";
  return `${name} is ranked as ${recommendation}.${competitor}${revenue}`;
}

function isFastValidationDirection(name: string) {
  const text = name.toLowerCase();
  return ["prompt", "workflow", "template", "content", "seo", "geo", "agent", "kit"].some((term) => text.includes(term));
}

function isHeavyBuildDirection(name: string) {
  const text = name.toLowerCase();
  return ["desktop", "local", "software", "app", "platform"].some((term) => text.includes(term));
}

function hasSharedSignal(left: string, right: string) {
  const rightText = right.toLowerCase();
  return tokenize(left).some((token) => rightText.includes(token));
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function sameText(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function readPath(root: unknown, path: string[]) {
  let cursor = root;
  for (const key of path) {
    const record = asRecord(cursor);
    if (!record) return undefined;
    cursor = record[key];
  }
  return cursor;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isRecord(value: Record<string, unknown> | null): value is Record<string, unknown> {
  return value !== null;
}

function arrayFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "direction";
}
