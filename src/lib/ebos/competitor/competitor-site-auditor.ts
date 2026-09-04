import type { EbosEvidenceWarning } from "../evidence";
import { auditCompetitorPage } from "./competitor-page-auditor";
import type {
  CompetitorSiteAuditOptions,
  CompetitorSiteAuditResult,
  EbosCompetitorAudit,
  EbosCompetitorPageAudit,
  EbosCompetitorSeed
} from "./competitor-evidence-types";

const DEFAULT_MAX_COMPETITORS = 5;
const MAX_PUBLIC_PAGES_PER_COMPETITOR = 3;
const DEFAULT_MAX_TOTAL_URLS = 20;
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

export function buildCompetitorAuditUrlList(
  seed: EbosCompetitorSeed,
  options: { maxPagesPerCompetitor?: number } = {}
) {
  const maxPages = Math.min(
    MAX_PUBLIC_PAGES_PER_COMPETITOR,
    Math.max(1, options.maxPagesPerCompetitor ?? MAX_PUBLIC_PAGES_PER_COMPETITOR)
  );
  const root = normalizeRootUrl(seed.url);
  const recommended = seed.recommendedAuditPaths?.length
    ? seed.recommendedAuditPaths.map((path) => joinUrl(root, path))
    : [];
  const candidates = recommended.length ? recommended : [
    root,
    joinUrl(root, "pricing"),
    categoryFallbackUrl(root, seed)
  ];

  return unique(candidates).slice(0, maxPages);
}

export async function runCompetitorSiteAudit(
  options: CompetitorSiteAuditOptions
): Promise<CompetitorSiteAuditResult> {
  const warnings: EbosEvidenceWarning[] = [];
  const pageAudits: EbosCompetitorPageAudit[] = [];
  let pagesAttempted = 0;
  let pagesFailed = 0;
  const maxCompetitors = Math.max(1, options.maxCompetitors ?? DEFAULT_MAX_COMPETITORS);
  const maxTotalUrls = Math.max(0, options.maxTotalUrls ?? DEFAULT_MAX_TOTAL_URLS);
  const requestTimeoutMs = Math.max(1, options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);

  if (!options.includeNetworkSources) {
    return {
      competitorAudits: options.seeds.map((seed) => emptyAudit(seed, [{
        code: "competitor_network_disabled",
        severity: "warning",
        source: "market_research",
        message: "Public competitor URL reads are disabled; only seed metadata was used."
      }])),
      pageAudits: [],
      warnings: [{
        code: "competitor_network_disabled",
        severity: "warning",
        source: "market_research",
        message: "Public competitor URL reads are disabled; only seed metadata was used."
      }],
      pagesAttempted: 0,
      pagesSucceeded: 0,
      pagesFailed: 0,
      competitorsAuditedCount: 0
    };
  }

  const fetcher = options.fetcher ?? globalThis.fetch;
  if (!fetcher) {
    const warning = {
      code: "competitor_fetch_unavailable",
      severity: "warning" as const,
      source: "market_research",
      message: "Fetch is unavailable; competitor pages could not be read."
    };
    return {
      competitorAudits: options.seeds.map((seed) => emptyAudit(seed, [warning])),
      pageAudits: [],
      warnings: [warning],
      pagesAttempted: 0,
      pagesSucceeded: 0,
      pagesFailed: 0,
      competitorsAuditedCount: 0
    };
  }

  const auditSeeds = options.seeds.slice(0, maxCompetitors);
  for (const seed of auditSeeds) {
    for (const url of buildCompetitorAuditUrlList(seed, options)) {
      if (pagesAttempted >= maxTotalUrls) break;
      pagesAttempted += 1;
      try {
        const response = await fetchWithTimeout(fetcher, url, requestTimeoutMs);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        pageAudits.push(await auditCompetitorPage({
          competitorId: seed.id,
          competitorName: seed.name,
          url,
          html,
          httpStatus: response.status
        }));
      } catch (error) {
        pagesFailed += 1;
        warnings.push({
          code: "competitor_page_unavailable",
          severity: "warning",
          source: "market_research",
          message: `Public competitor page ${url} could not be read; continuing without it. ${errorMessage(error)}`
        });
      }
    }
  }

  const competitorAudits = auditSeeds.map((seed) => buildCompetitorAudit(
    seed,
    pageAudits.filter((page) => page.competitorId === seed.id),
    warnings.filter((warning) => warning.message.includes(seed.url) || warning.message.includes(seed.name))
  ));

  return {
    competitorAudits,
    pageAudits,
    warnings,
    pagesAttempted,
    pagesSucceeded: pageAudits.length,
    pagesFailed,
    competitorsAuditedCount: competitorAudits.filter((audit) => audit.pagesAudited > 0).length
  };
}

async function fetchWithTimeout(
  fetcher: NonNullable<CompetitorSiteAuditOptions["fetcher"]>,
  url: string,
  timeoutMs: number
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetcher(url),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildCompetitorAudit(
  seed: EbosCompetitorSeed,
  pages: EbosCompetitorPageAudit[],
  warnings: EbosEvidenceWarning[]
): EbosCompetitorAudit {
  if (pages.length === 0) return emptyAudit(seed, warnings);

  const productTypes = unique(pages.flatMap((page) => page.detectedProductTypes));
  const pricingSignals = unique(pages.flatMap((page) => page.detectedPricingTerms));
  const seoStrengths = unique(pages.flatMap((page) => page.detectedSeoSignals));
  const geoStrengths = unique(pages.flatMap((page) => page.detectedGeoSignals));
  const funnelSignals = unique(pages.flatMap((page) => [
    ...(page.hasStrongCTA ? ["CTA"] : []),
    ...(page.hasNewsletterOrLeadMagnet ? ["newsletter_or_waitlist"] : []),
    ...(page.hasAffiliateSignal ? ["affiliate"] : [])
  ]));

  return {
    competitorId: seed.id,
    name: seed.name,
    url: seed.url,
    category: seed.category,
    pagesAudited: pages.length,
    averageScore: average(pages.map((page) => page.score)),
    positioningSummary: unique(pages.flatMap((page) => page.detectedPositioning)).join(", ") || seed.notes || "Seed-level observation only.",
    productTypes,
    pricingSignals,
    seoStrengths,
    geoStrengths,
    funnelSignals,
    observedAdvantages: buildAdvantages(pages),
    observedWeaknesses: buildWeaknesses(pages),
    enheDifferentiationAngles: buildDifferentiationAngles(seed, productTypes, geoStrengths),
    warnings: [...warnings, ...pages.flatMap((page) => page.warnings)]
  };
}

function emptyAudit(
  seed: EbosCompetitorSeed,
  warnings: EbosEvidenceWarning[]
): EbosCompetitorAudit {
  return {
    competitorId: seed.id,
    name: seed.name,
    url: seed.url,
    category: seed.category,
    pagesAudited: 0,
    averageScore: 0,
    positioningSummary: seed.notes ?? "Seed-level observation only; no public page audit was run.",
    productTypes: [],
    pricingSignals: [],
    seoStrengths: [],
    geoStrengths: [],
    funnelSignals: [],
    observedAdvantages: [],
    observedWeaknesses: ["No audited public page data is available for this competitor seed."],
    enheDifferentiationAngles: [differentiationAngleForCategory(seed.category)],
    warnings
  };
}

function categoryFallbackUrl(root: string, seed: EbosCompetitorSeed) {
  if (seed.category === "ai_tool_directory") return joinUrl(root, "tools");
  if (seed.category === "digital_product_marketplace") return joinUrl(root, "discover");
  if (seed.category === "technical_workflow_reference") return joinUrl(root, "trending");
  return joinUrl(root, "products");
}

function normalizeRootUrl(value: string) {
  try {
    const url = new URL(value);
    url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.endsWith("/") ? value : `${value}/`;
  }
}

function joinUrl(root: string, path: string) {
  try {
    return new URL(path, root.endsWith("/") ? root : `${root}/`).toString();
  } catch {
    return `${root.replace(/\/$/, "")}/${path}`;
  }
}

function buildAdvantages(pages: EbosCompetitorPageAudit[]) {
  return unique(pages.flatMap((page) => [
    ...(page.hasProductListingSignal ? ["Clear product/listing structure"] : []),
    ...(page.hasPricingSignal ? ["Visible pricing or monetization signal"] : []),
    ...(page.hasFaqSignal ? ["FAQ supports answerability"] : []),
    ...(page.hasStrongCTA ? ["Strong conversion CTA"] : [])
  ]));
}

function buildWeaknesses(pages: EbosCompetitorPageAudit[]) {
  return unique(pages.flatMap((page) => page.risks));
}

function buildDifferentiationAngles(
  seed: EbosCompetitorSeed,
  productTypes: string[],
  geoStrengths: string[]
) {
  const angles = [differentiationAngleForCategory(seed.category)];
  if (productTypes.includes("AI Agent")) angles.push("Package agent workflows as concrete ENHE validation offers.");
  if (productTypes.includes("AI Video")) angles.push("Differentiate AI video workflows with productized delivery and bilingual SEO/GEO pages.");
  if (geoStrengths.length >= 3) angles.push("Match competitor answerability with stronger source, FAQ, how-to, and update-date blocks.");
  return unique(angles);
}

function differentiationAngleForCategory(category: EbosCompetitorSeed["category"]) {
  if (category === "ai_tool_directory") return "Use focused product bundles instead of broad directory positioning.";
  if (category === "digital_product_marketplace") return "Use clearer delivery, support, and validation proof than generic marketplace listings.";
  if (category === "technical_workflow_reference") return "Convert open workflow interest into packaged, documented ENHE workflow products.";
  return "Use narrow ENHE positioning and validation pages before large builds.";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
