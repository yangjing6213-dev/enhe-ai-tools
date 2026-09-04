import type {
  EbosCompetitorAudit,
  EbosCompetitorOpportunity,
  EbosCompetitorOpportunityType,
  EbosCompetitorRecommendedAction,
  ScoreCompetitorOpportunitiesOptions
} from "./competitor-evidence-types";

export function scoreCompetitorOpportunities(
  options: ScoreCompetitorOpportunitiesOptions
): EbosCompetitorOpportunity[] {
  return rankCompetitorOpportunities([
    ...identifyProductGaps(options.competitorAudits, options.marketEvidence, options.productEvidence),
    ...identifyContentGaps(options.competitorAudits, options.seoEvidence, options.geoEvidence),
    ...identifyPricingGaps(options.competitorAudits, options.revenueEvidence)
  ].map((opportunity) => scoreOpportunity(opportunity, options)));
}

export function identifyProductGaps(
  competitorAudits: EbosCompetitorAudit[],
  marketEvidence?: unknown,
  productEvidence?: unknown
): EbosCompetitorOpportunity[] {
  const marketDirections = readMarketDirections(marketEvidence);
  const productTypes = unique(competitorAudits.flatMap((audit) => audit.productTypes));
  const hasProductReadiness = readNumberPath(productEvidence, ["overallScore"]) >= 70;
  const directions = marketDirections.length
    ? marketDirections
    : productTypes.length
      ? productTypes.map((type) => `${type} differentiated offer`)
      : ["AI Agent workflow validation offer"];

  return directions.slice(0, 4).map((direction, index) => baseOpportunity({
    id: `competitor-product-gap-${index + 1}`,
    title: `Validate ${direction} differentiation`,
    description: hasProductReadiness
      ? `Use existing ENHE product readiness to validate a differentiated ${direction} offer against observed competitor positioning.`
      : `Validate ${direction} with a low-cost page, content test, waitlist, or presale before deep product build.`,
    relatedCompetitors: competitorAudits.map((audit) => audit.name).slice(0, 5),
    relatedMarketDirections: marketDirections.filter((item) => directionMatches(item, direction)),
    opportunityType: "product_gap",
    enheFitScore: directionFitScore(direction),
    difficultyScore: directionDifficulty(direction),
    riskScore: directionRisk(direction),
    suggestedCodexTasks: [
      `Draft a one-page validation brief for ${direction}.`,
      `Create a differentiated landing page outline for ${direction}.`
    ],
    risks: ["Competitor signals do not prove demand, traffic, or revenue."]
  }));
}

export function identifyContentGaps(
  competitorAudits: EbosCompetitorAudit[],
  seoEvidence?: unknown,
  geoEvidence?: unknown
): EbosCompetitorOpportunity[] {
  const geoStrengthCount = competitorAudits.reduce((total, audit) => total + audit.geoStrengths.length, 0);
  const seoScore = readNumberPath(seoEvidence, ["overallScore"]);
  const geoScore = readNumberPath(geoEvidence, ["overallScore"]);
  const contentScoreBoost = geoStrengthCount >= 3 || seoScore >= 70 || geoScore >= 70 ? 2 : 0;

  return [baseOpportunity({
    id: "competitor-content-gap-answerability",
    title: "Create competitor-informed SEO/GEO comparison content",
    description: "Use observed FAQ, how-to, source/date, and author patterns to build ENHE pages that answer AI search questions more clearly.",
    relatedCompetitors: competitorAudits.map((audit) => audit.name).slice(0, 5),
    relatedMarketDirections: [],
    opportunityType: "content_gap",
    enheFitScore: 19 + contentScoreBoost,
    difficultyScore: 3,
    riskScore: 4,
    suggestedCodexTasks: [
      "Create a comparison content brief for the top competitor category.",
      "Add FAQ, how-to, source/date, and author blocks to the validation page."
    ],
    risks: ["Content structure improves discoverability but does not prove purchase intent by itself."]
  })];
}

export function identifyPricingGaps(
  competitorAudits: EbosCompetitorAudit[],
  revenueEvidence?: unknown
): EbosCompetitorOpportunity[] {
  const pricingCompetitors = competitorAudits
    .filter((audit) => audit.pricingSignals.length > 0)
    .map((audit) => audit.name);
  const firstRevenueAchieved = readBooleanPath(revenueEvidence, ["revenueSummary", "firstRevenueAchieved"]) === true
    || readBooleanPath(revenueEvidence, ["firstRevenueAchieved"]) === true;

  return [baseOpportunity({
    id: "competitor-pricing-gap-validation-offer",
    title: "Test a low-friction ENHE validation offer",
    description: firstRevenueAchieved
      ? "Compare competitor pricing signals against ENHE paid products and improve offer clarity."
      : "Because first revenue is not yet proven, use competitor pricing signals to test a low-cost validation offer instead of a large build.",
    relatedCompetitors: pricingCompetitors,
    relatedMarketDirections: [],
    opportunityType: "pricing_gap",
    enheFitScore: 20,
    difficultyScore: firstRevenueAchieved ? 4 : 2,
    riskScore: firstRevenueAchieved ? 5 : 4,
    suggestedCodexTasks: [
      "Draft a validation price ladder and checkout path checklist.",
      "Define success criteria for first paid intent: click, inquiry, presale, or paid order."
    ],
    risks: ["Competitor pricing visibility does not reveal sales volume or revenue."]
  })];
}

export function rankCompetitorOpportunities(
  opportunities: EbosCompetitorOpportunity[]
) {
  return [...opportunities].sort((a, b) =>
    b.priorityScore - a.priorityScore
    || b.enheFitScore - a.enheFitScore
    || a.difficultyScore - b.difficultyScore
    || a.riskScore - b.riskScore
  );
}

function scoreOpportunity(
  opportunity: EbosCompetitorOpportunity,
  options: ScoreCompetitorOpportunitiesOptions
): EbosCompetitorOpportunity {
  const marketAlignmentScore = opportunity.relatedMarketDirections.length ? 20 : readMarketDirections(options.marketEvidence).length ? 12 : 8;
  const productGapScore = opportunity.opportunityType === "product_gap" ? 15 : 8;
  const contentGapScore = ["content_gap", "seo_gap", "geo_gap"].includes(opportunity.opportunityType) ? 15 : 8;
  const monetizationPotential = opportunity.opportunityType === "pricing_gap" ? 15 : 12;
  const priorityScore = clamp(
    opportunity.enheFitScore
      + marketAlignmentScore
      + productGapScore
      + contentGapScore
      + monetizationPotential
      - opportunity.difficultyScore
      - opportunity.riskScore,
    0,
    100
  );
  const firstRevenueAchieved = readBooleanPath(options.revenueEvidence, ["revenueSummary", "firstRevenueAchieved"]) === true
    || readBooleanPath(options.revenueEvidence, ["firstRevenueAchieved"]) === true;

  return {
    ...opportunity,
    priorityScore,
    recommendedAction: chooseRecommendedAction(priorityScore, opportunity.opportunityType, firstRevenueAchieved)
  };
}

function baseOpportunity(input: {
  id: string;
  title: string;
  description: string;
  relatedCompetitors: string[];
  relatedMarketDirections: string[];
  opportunityType: EbosCompetitorOpportunityType;
  enheFitScore: number;
  difficultyScore: number;
  riskScore: number;
  suggestedCodexTasks: string[];
  risks: string[];
}): EbosCompetitorOpportunity {
  return {
    ...input,
    relatedCompetitors: unique(input.relatedCompetitors),
    relatedMarketDirections: unique(input.relatedMarketDirections),
    priorityScore: 0,
    recommendedAction: "watch"
  };
}

function chooseRecommendedAction(
  score: number,
  type: EbosCompetitorOpportunityType,
  firstRevenueAchieved: boolean
): EbosCompetitorRecommendedAction {
  if (!firstRevenueAchieved && score >= 65) return "validate_first";
  if (score >= 80) return "build_now";
  if (score >= 65) return "validate_first";
  if (score >= 50) return type === "product_gap" ? "improve_existing_product" : "create_content_first";
  if (score >= 35) return "watch";
  return "ignore";
}

function readMarketDirections(marketEvidence: unknown) {
  const record = asRecord(marketEvidence);
  const directions = arrayFrom(record?.recommendedProductDirections)
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => readString(item.productDirection))
    .filter((item): item is string => Boolean(item));
  return unique(directions);
}

function directionMatches(a: string, b: string) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  return left.includes(right) || right.includes(left) || sharedKeywordCount(left, right) >= 2;
}

function sharedKeywordCount(a: string, b: string) {
  const left = new Set(a.split(/\s+/).filter((item) => item.length >= 2));
  return b.split(/\s+/).filter((item) => left.has(item)).length;
}

function directionFitScore(direction: string) {
  const text = normalizeText(direction);
  let score = 15;
  if (/agent|workflow|prompt|video|seo|geo|comfyui/.test(text)) score += 7;
  if (/模板|工作流|prompt|kit|pack|bundle/.test(direction.toLowerCase())) score += 2;
  return Math.min(25, score);
}

function directionDifficulty(direction: string) {
  const text = normalizeText(direction);
  let difficulty = 5;
  if (/agent|local|software|browser|mcp/.test(text)) difficulty += 2;
  if (/prompt|template|workflow|content|seo|geo|comfyui/.test(text)) difficulty -= 2;
  return clamp(difficulty, 0, 10);
}

function directionRisk(direction: string) {
  const text = normalizeText(direction);
  if (/video|seo|geo/.test(text)) return 6;
  if (/agent/.test(text)) return 5;
  return 4;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function readBooleanPath(root: unknown, path: string[]) {
  let cursor = root;
  for (const key of path) {
    const record = asRecord(cursor);
    if (!record) return undefined;
    cursor = record[key];
  }
  return typeof cursor === "boolean" ? cursor : undefined;
}

function readNumberPath(root: unknown, path: string[]) {
  let cursor = root;
  for (const key of path) {
    const record = asRecord(cursor);
    if (!record) return 0;
    cursor = record[key];
  }
  return typeof cursor === "number" && Number.isFinite(cursor) ? cursor : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function arrayFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
