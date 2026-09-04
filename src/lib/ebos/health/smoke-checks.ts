import type {
  EbosCommandHealthStatus,
  EbosSmokeCheckResult,
  EbosWebsiteHealthCheckKey
} from "./health-types";
import {
  resolveKeyProductPageUrls,
  type ProductPageUrlCandidate
} from "./product-page-url-source";

type FetchLike = (url: string, init?: RequestInit) => Promise<{
  status: number;
  text?: () => Promise<string>;
}>;

export type CreateSmokeCheckResultInput = {
  key: EbosWebsiteHealthCheckKey;
  label: string;
  url?: string | null;
  status: EbosCommandHealthStatus;
  httpStatus?: number | null;
  durationMs?: number | null;
  summary?: string;
  recommendation?: string;
  source?: EbosSmokeCheckResult["source"];
  sourceConfidence?: EbosSmokeCheckResult["sourceConfidence"];
  reason?: string;
  expectedPublic?: boolean;
  environmentMismatchRisk?: boolean;
  isProductDetailPage?: boolean;
};

export type CheckUrlHealthOptions = {
  key: EbosWebsiteHealthCheckKey;
  label: string;
  method?: "GET" | "HEAD";
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  source?: CreateSmokeCheckResultInput["source"];
  sourceConfidence?: CreateSmokeCheckResultInput["sourceConfidence"];
  reason?: string;
  expectedPublic?: boolean;
  environmentMismatchRisk?: boolean;
  isProductDetailPage?: boolean;
};

export type RunEbosSmokeChecksOptions = {
  siteUrl?: string | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  productSlugs?: string[];
  readProductSlugs?: () => Promise<string[]>;
  manualFallbackPaths?: string[];
};

const DEFAULT_SITE_URL = "https://www.enhe-tech.com.cn";

export function createSmokeCheckResult(input: CreateSmokeCheckResultInput): EbosSmokeCheckResult {
  const url = input.url?.trim() ?? "";
  const httpStatus = input.httpStatus ?? null;
  const durationMs = input.durationMs ?? null;
  const summary = input.summary ?? buildSmokeSummary(input.status, input.label, url, httpStatus);

  return {
    key: input.key,
    label: input.label,
    command: url ? `HEAD ${url}` : "HEAD skipped",
    status: input.status,
    exitCode: input.status === "passed" ? 0 : input.status === "failed" ? 1 : null,
    url,
    httpStatus,
    stdoutSummary: "",
    stderrSummary: input.status === "failed" ? summary : "",
    durationMs,
    checkedAt: new Date(),
    summary,
    recommendation: input.recommendation ?? buildSmokeRecommendation(input.key, input.status, url),
    source: input.source,
    sourceConfidence: input.sourceConfidence,
    reason: input.reason,
    expectedPublic: input.expectedPublic,
    environmentMismatchRisk: input.environmentMismatchRisk,
    isProductDetailPage: input.isProductDetailPage
  };
}

export async function checkUrlHealth(
  url: string | null | undefined,
  options: CheckUrlHealthOptions
): Promise<EbosSmokeCheckResult> {
  const normalizedUrl = url?.trim() ?? "";
  const method = options.method ?? "HEAD";

  if (!normalizedUrl) {
    return createSmokeCheckResult({
      key: options.key,
      label: options.label,
      url: "",
      status: "skipped",
      summary: `${options.label} skipped because no URL was available.`,
      recommendation: `Configure a URL for ${options.label} before relying on this smoke check.`,
      source: options.source,
      sourceConfidence: options.sourceConfidence,
      reason: options.reason,
      expectedPublic: options.expectedPublic,
      environmentMismatchRisk: options.environmentMismatchRisk,
      isProductDetailPage: options.isProductDetailPage
    });
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 8000;
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(normalizedUrl, {
      method,
      redirect: "manual",
      signal: controller.signal
    });
    const durationMs = Date.now() - startedAt;
    const passed = response.status >= 200 && response.status < 400;

    return createSmokeCheckResult({
      key: options.key,
      label: options.label,
      url: normalizedUrl,
      status: passed ? "passed" : "failed",
      httpStatus: response.status,
      durationMs,
      summary: `${options.label} ${passed ? "passed" : "failed"} with HTTP ${response.status}.`,
      recommendation: !passed && options.environmentMismatchRisk
        ? "URL source may not match checked environment."
        : undefined,
      source: options.source,
      sourceConfidence: options.sourceConfidence,
      reason: options.reason,
      expectedPublic: options.expectedPublic,
      environmentMismatchRisk: options.environmentMismatchRisk,
      isProductDetailPage: options.isProductDetailPage
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const timedOut = error instanceof Error && error.name === "AbortError";

    return createSmokeCheckResult({
      key: options.key,
      label: options.label,
      url: normalizedUrl,
      status: "failed",
      httpStatus: null,
      durationMs,
      summary: timedOut
        ? `${options.label} timed out after ${timeoutMs}ms.`
        : `${options.label} failed: ${error instanceof Error ? error.message : "unknown network error"}.`,
      recommendation: options.environmentMismatchRisk
        ? "URL source may not match checked environment."
        : "Smoke check failed or skipped, please verify site accessibility.",
      source: options.source,
      sourceConfidence: options.sourceConfidence,
      reason: options.reason,
      expectedPublic: options.expectedPublic,
      environmentMismatchRisk: options.environmentMismatchRisk,
      isProductDetailPage: options.isProductDetailPage
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function runEbosSmokeChecks(options: RunEbosSmokeChecksOptions = {}) {
  const site = resolveSiteUrl(options);
  const baseUrl = site.url ? trimTrailingSlash(site.url) : "";
  const sitemapXml = await readSitemapXml(baseUrl, options);
  const productSource = await resolveProductCandidates(baseUrl, sitemapXml, options);

  return Promise.all([
    checkUrlHealth(buildUrl(baseUrl, "/sitemap.xml"), {
      key: "sitemap",
      label: "Sitemap",
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
      source: site.source
    }),
    checkUrlHealth(buildUrl(baseUrl, "/robots.txt"), {
      key: "robots",
      label: "Robots",
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
      source: site.source
    }),
    checkUrlHealth(baseUrl, {
      key: "homepage",
      label: "Homepage",
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
      source: site.source
    }),
    ...productSource.map((candidate) => checkUrlHealth(candidate.url, {
      key: "key_product_pages",
      label: `Key Product Page ${candidate.label}`,
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
      source: candidate.source,
      sourceConfidence: candidate.confidence,
      reason: candidate.reason,
      expectedPublic: candidate.expectedPublic,
      environmentMismatchRisk: candidate.environmentMismatchRisk,
      isProductDetailPage: candidate.isProductDetailPage
    }))
  ]);
}

function resolveSiteUrl(options: RunEbosSmokeChecksOptions) {
  if (options.siteUrl) return { url: options.siteUrl, source: "input" as const };

  const env = options.env ?? process.env;
  if (env.NEXT_PUBLIC_SITE_URL) return { url: env.NEXT_PUBLIC_SITE_URL, source: "env" as const };
  if (env.EBOS_SITE_URL) return { url: env.EBOS_SITE_URL, source: "env" as const };

  return { url: DEFAULT_SITE_URL, source: "default" as const };
}

async function resolveProductCandidates(
  baseUrl: string,
  sitemapXml: string | null,
  options: RunEbosSmokeChecksOptions
): Promise<ProductPageUrlCandidate[]> {
  const products = await readInternalProductCandidates(options);
  const env = options.env ?? process.env;
  const resolution = resolveKeyProductPageUrls({
    siteUrl: baseUrl || DEFAULT_SITE_URL,
    sitemapXml,
    internalProducts: products.products,
    databaseAvailable: products.databaseAvailable,
    databaseUrl: env.DATABASE_URL,
    manualFallbackPaths: options.manualFallbackPaths
  });

  return resolution.candidates;
}

async function readInternalProductCandidates(options: RunEbosSmokeChecksOptions) {
  if (options.productSlugs?.length) {
    return {
      databaseAvailable: true,
      products: options.productSlugs.map((slug) => ({ slug }))
    };
  }

  if (options.readProductSlugs) {
    try {
      const slugs = await options.readProductSlugs();
      return {
        databaseAvailable: true,
        products: slugs.map((slug) => ({ slug }))
      };
    } catch {
      return {
        databaseAvailable: false,
        products: []
      };
    }
  }

  return {
    databaseAvailable: false,
    products: []
  };
}

async function readSitemapXml(baseUrl: string, options: RunEbosSmokeChecksOptions) {
  if (!baseUrl) return null;

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 8000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(buildUrl(baseUrl, "/sitemap.xml"), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal
    });
    if (response.status < 200 || response.status >= 400 || !response.text) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string) {
  if (!baseUrl) return "";
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildSmokeSummary(
  status: EbosCommandHealthStatus,
  label: string,
  url: string,
  httpStatus: number | null
) {
  if (status === "passed") return `${label} passed${httpStatus ? ` with HTTP ${httpStatus}` : ""}.`;
  if (status === "failed") return `${label} failed${httpStatus ? ` with HTTP ${httpStatus}` : ""}.`;
  if (status === "skipped") return `${label} skipped${url ? ` for ${url}` : ""}.`;
  return `${label} status unknown.`;
}

function buildSmokeRecommendation(
  key: EbosWebsiteHealthCheckKey,
  status: EbosCommandHealthStatus,
  url: string
) {
  if (status === "passed") return "No action required.";
  if (status === "skipped") return `Configure ${key} URL before relying on this smoke check.`;
  if (key === "homepage" || key === "key_product_pages") {
    return `Fix ${key} accessibility for ${url || "the target page"}.`;
  }
  if (key === "sitemap" || key === "robots") {
    return `Fix ${key} accessibility to reduce SEO crawl risk.`;
  }
  return "Smoke check failed or skipped, please verify site accessibility.";
}
