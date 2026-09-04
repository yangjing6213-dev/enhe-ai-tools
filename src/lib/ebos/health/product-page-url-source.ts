import type { EbosConfidenceLevel } from "../types";

export type ProductPageUrlSource =
  | "sitemap"
  | "internal_database"
  | "manual_fallback"
  | "mixed"
  | "none";

export type ProductPageUrlCandidate = {
  url: string;
  path: string;
  source: Exclude<ProductPageUrlSource, "mixed" | "none">;
  label: string;
  slug?: string;
  confidence: EbosConfidenceLevel;
  reason: string;
  expectedPublic?: boolean;
  environmentMismatchRisk?: boolean;
  isProductDetailPage?: boolean;
};

export type ProductPageUrlSourceWarning = {
  code: "missing_product_page_urls";
  source: ProductPageUrlSource;
  severity: "warning";
  message: string;
};

export type ProductPageUrlResolution = {
  source: ProductPageUrlSource;
  candidates: ProductPageUrlCandidate[];
  warnings: ProductPageUrlSourceWarning[];
};

export type ProductPageUrlProductInput = {
  slug: string;
  label?: string | null;
  name?: string | null;
  path?: string | null;
  url?: string | null;
};

export type ResolveKeyProductPageUrlsOptions = {
  siteUrl: string;
  sitemapXml?: string | null;
  internalProducts?: ProductPageUrlProductInput[];
  databaseAvailable?: boolean;
  databaseUrl?: string | null;
  manualFallbackPaths?: string[];
  maxUrls?: number;
};

export type NormalizedProductPageUrl = {
  url: string;
  path: string;
};

const DEFAULT_MAX_URLS = 5;
const DEFAULT_MANUAL_FALLBACK_PATHS = ["/software"];

export function extractSoftwareUrlsFromSitemapXml(
  xml: string,
  siteUrl: string
): ProductPageUrlCandidate[] {
  const candidates: ProductPageUrlCandidate[] = [];
  const locPattern = /<loc[^>]*>([\s\S]*?)<\/loc>/gi;
  let match: RegExpExecArray | null;

  while ((match = locPattern.exec(xml))) {
    const rawLoc = decodeXmlEntity(match[1]?.trim() ?? "");
    if (!rawLoc) continue;

    const normalized = normalizeProductPageUrl(siteUrl, rawLoc);
    if (!isSoftwareDetailPath(normalized.path)) continue;

    const slug = extractSoftwareSlug(normalized.path);
    candidates.push({
      ...normalized,
      source: "sitemap",
      label: slug ? `Product detail: ${slug}` : "Product detail page",
      slug,
      confidence: "complete",
      reason: "Discovered in the checked site's sitemap.xml.",
      expectedPublic: true,
      environmentMismatchRisk: false,
      isProductDetailPage: true
    });
  }

  return dedupeCandidates(candidates, Number.POSITIVE_INFINITY);
}

export function normalizeProductPageUrl(
  siteUrl: string,
  pathOrUrl: string
): NormalizedProductPageUrl {
  const base = new URL(siteUrl);
  const parsed = new URL(pathOrUrl.trim() || "/", base);
  const pathname = normalizePathname(parsed.pathname);
  const path = `${pathname}${parsed.search}${parsed.hash}`;

  return {
    url: `${base.origin}${path}`,
    path
  };
}

export function resolveKeyProductPageUrls(
  options: ResolveKeyProductPageUrlsOptions
): ProductPageUrlResolution {
  const maxUrls = options.maxUrls ?? DEFAULT_MAX_URLS;
  const sitemapCandidates = options.sitemapXml
    ? extractSoftwareUrlsFromSitemapXml(options.sitemapXml, options.siteUrl)
    : [];

  if (sitemapCandidates.length > 0) {
    return {
      source: "sitemap",
      candidates: dedupeCandidates(sitemapCandidates, maxUrls),
      warnings: []
    };
  }

  const databaseAvailable = options.databaseAvailable ?? true;
  const databaseCandidates = databaseAvailable
    ? buildDatabaseCandidates(options)
    : [];

  if (databaseCandidates.length > 0) {
    return {
      source: "internal_database",
      candidates: dedupeCandidates(databaseCandidates, maxUrls),
      warnings: []
    };
  }

  const manualCandidates = buildManualFallbackCandidates(options);
  if (manualCandidates.length > 0) {
    return {
      source: "manual_fallback",
      candidates: dedupeCandidates(manualCandidates, maxUrls),
      warnings: []
    };
  }

  return {
    source: "none",
    candidates: [],
    warnings: [{
      code: "missing_product_page_urls",
      source: "none",
      severity: "warning",
      message: "No key product page URL candidates could be resolved from sitemap, internal database, or manual fallback."
    }]
  };
}

function buildDatabaseCandidates(
  options: ResolveKeyProductPageUrlsOptions
): ProductPageUrlCandidate[] {
  const products = options.internalProducts ?? [];
  const mismatchRisk = hasEnvironmentMismatchRisk(options.siteUrl, options.databaseUrl);

  return products
    .map((product): ProductPageUrlCandidate | null => {
      const pathOrUrl = product.url ?? product.path ?? `/software/${product.slug}`;
      const normalized = normalizeProductPageUrl(options.siteUrl, pathOrUrl);
      if (!isSoftwareDetailPath(normalized.path)) return null;

      return {
        ...normalized,
        source: "internal_database" as const,
        label: product.label ?? product.name ?? product.slug,
        slug: product.slug,
        confidence: mismatchRisk ? "partial" as const : "complete" as const,
        reason: mismatchRisk
          ? "URL source may not match checked environment. Internal database slugs are being checked against the configured site URL."
          : "Derived from internal database published product slug.",
        expectedPublic: true,
        environmentMismatchRisk: mismatchRisk,
        isProductDetailPage: true
      };
    })
    .filter((candidate): candidate is ProductPageUrlCandidate => candidate !== null);
}

function buildManualFallbackCandidates(
  options: ResolveKeyProductPageUrlsOptions
): ProductPageUrlCandidate[] {
  const paths = options.manualFallbackPaths ?? DEFAULT_MANUAL_FALLBACK_PATHS;

  return paths
    .map((pathOrUrl): ProductPageUrlCandidate | null => {
      const normalized = normalizeProductPageUrl(options.siteUrl, pathOrUrl);
      const isListingPage = isSoftwareListingPath(normalized.path);
      const isDetailPage = isSoftwareDetailPath(normalized.path);
      if (!isListingPage && !isDetailPage) return null;

      return {
        ...normalized,
        source: "manual_fallback" as const,
        label: isListingPage ? "software listing page" : "manual fallback product page",
        slug: isDetailPage ? extractSoftwareSlug(normalized.path) : undefined,
        confidence: "partial" as const,
        reason: isListingPage
          ? "Manual fallback only confirms the software listing page, not a specific product detail page."
          : "Manual fallback product URL because sitemap and database did not provide product detail URLs.",
        expectedPublic: true,
        environmentMismatchRisk: false,
        isProductDetailPage: isDetailPage
      };
    })
    .filter((candidate): candidate is ProductPageUrlCandidate => candidate !== null);
}

function isSoftwareListingPath(path: string) {
  const pathname = stripQueryAndHash(path);
  return pathname === "/software" || pathname === "/en/software";
}

function isSoftwareDetailPath(path: string) {
  const pathname = stripQueryAndHash(path);
  return /^\/(?:en\/)?software\/[^/]+$/.test(pathname);
}

function extractSoftwareSlug(path: string) {
  const pathname = stripQueryAndHash(path);
  const parts = pathname.split("/").filter(Boolean);
  return parts.at(-1);
}

function stripQueryAndHash(path: string) {
  return path.split(/[?#]/, 1)[0] ?? path;
}

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function dedupeCandidates(
  candidates: ProductPageUrlCandidate[],
  maxUrls: number
) {
  const seen = new Set<string>();
  const deduped: ProductPageUrlCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
    if (deduped.length >= maxUrls) break;
  }

  return deduped;
}

function decodeXmlEntity(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function hasEnvironmentMismatchRisk(siteUrl: string, databaseUrl?: string | null) {
  const siteHost = new URL(siteUrl).hostname.toLowerCase();
  const checkingProductionLikeSite =
    siteHost !== "localhost" &&
    siteHost !== "127.0.0.1" &&
    !siteHost.endsWith(".local");

  if (!checkingProductionLikeSite) return false;
  if (!databaseUrl) return true;

  const normalizedDatabaseUrl = databaseUrl.toLowerCase();
  return [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "file:",
    "dev.db"
  ].some((token) => normalizedDatabaseUrl.includes(token));
}
