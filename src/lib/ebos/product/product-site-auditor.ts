import {
  extractSoftwareUrlsFromSitemapXml,
  normalizeProductPageUrl,
  resolveKeyProductPageUrls
} from "../health";
import type { EbosEvidenceWarning } from "../evidence";
import { auditProductPage } from "./product-page-auditor";
import type {
  BuildProductAuditUrlListOptions,
  EbosProductFetcher,
  ProductAuditUrlListResult,
  ProductSiteAuditResult,
  RunProductSiteAuditOptions
} from "./product-evidence-types";

const DEFAULT_SITE_URL = "https://www.enhe-tech.com.cn";
const DEFAULT_MAX_URLS = 20;
const DEFAULT_SITEMAP_PRODUCT_LIMIT = 5;
const DEFAULT_FALLBACK_PATHS = [
  "/software",
  "/software/windows-ai",
  "/software/faceswap-studio-ai",
  "/software/local-ai-video-studio-for-creator-workflows",
  "/software/local-ai-voice-generator-for-voiceover-materials"
];

export async function buildProductAuditUrlList(
  options: BuildProductAuditUrlListOptions = {}
): Promise<ProductAuditUrlListResult> {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const maxUrls = options.maxUrls ?? DEFAULT_MAX_URLS;

  if (options.urls?.length) {
    const urls = dedupe(options.urls.map((url) => normalizeProductPageUrl(siteUrl, url).url)).slice(0, maxUrls);
    return withDetailPageWarning({
      urls,
      sitemapStatus: "available",
      urlSource: urls.some(isProductDetailUrl) ? "manual_fallback" : "none",
      warnings: []
    });
  }

  const fetcher = options.fetcher ?? fetch;
  try {
    const response = await fetcher(`${siteUrl}/sitemap.xml`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const sitemapXml = await response.text();
    const sitemapUrls = extractSoftwareUrlsFromSitemapXml(sitemapXml, siteUrl)
      .map((candidate) => candidate.url)
      .sort(compareProductUrls);

    if (sitemapUrls.length > 0) {
      return {
        urls: dedupe(sitemapUrls).slice(0, Math.min(maxUrls, options.sitemapProductLimit ?? DEFAULT_SITEMAP_PRODUCT_LIMIT)),
        sitemapStatus: "available",
        urlSource: "sitemap",
        warnings: []
      };
    }

    return withDetailPageWarning(resolveFallbackUrls({
      ...options,
      siteUrl,
      maxUrls
    }, "fallback", [warning(
      "sitemap_product_urls_missing",
      "sitemap.xml was readable but did not contain confirmable /software/{slug} product detail URLs.",
      "sitemap.xml"
    )]));
  } catch (error) {
    return withDetailPageWarning(resolveFallbackUrls({
      ...options,
      siteUrl,
      maxUrls
    }, "fallback", [warning(
      "sitemap_unavailable",
      `sitemap.xml unavailable; using product URL fallback. ${errorMessage(error)}`,
      "sitemap.xml"
    )]));
  }
}

export async function runProductSiteAudit(
  options: RunProductSiteAuditOptions = {}
): Promise<ProductSiteAuditResult> {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const fetcher = options.fetcher ?? fetch;
  const urlList = await buildProductAuditUrlList({ ...options, siteUrl, fetcher });
  const pageAudits = await Promise.all(urlList.urls.map(async (url) => {
    try {
      const response = await fetcher(url);
      const html = await response.text();
      return auditProductPage({
        url,
        html,
        httpStatus: response.status,
        warning: response.ok ? undefined : `Page returned HTTP ${response.status}.`
      });
    } catch (error) {
      return auditProductPage({
        url,
        html: "",
        warning: `Failed to fetch page: ${errorMessage(error)}`
      });
    }
  }));

  return {
    ...urlList,
    warnings: [
      ...urlList.warnings,
      ...pageAudits.flatMap((page) => page.warnings)
    ],
    pageAudits
  };
}

function resolveFallbackUrls(
  options: BuildProductAuditUrlListOptions & { siteUrl: string },
  sitemapStatus: ProductAuditUrlListResult["sitemapStatus"],
  warnings: EbosEvidenceWarning[]
): ProductAuditUrlListResult {
  const maxUrls = options.maxUrls ?? DEFAULT_MAX_URLS;
  const resolution = resolveKeyProductPageUrls({
    siteUrl: options.siteUrl,
    sitemapXml: null,
    internalProducts: options.internalProducts,
    databaseAvailable: options.databaseAvailable,
    databaseUrl: options.databaseUrl,
    manualFallbackPaths: options.manualFallbackPaths ?? DEFAULT_FALLBACK_PATHS,
    maxUrls
  });

  return {
    urls: resolution.candidates.map((candidate) => candidate.url).slice(0, maxUrls),
    sitemapStatus,
    urlSource: resolution.source,
    warnings: [
      ...warnings,
      ...resolution.warnings.map((item) => warning(item.code, item.message, item.source))
    ]
  };
}

function withDetailPageWarning(result: ProductAuditUrlListResult): ProductAuditUrlListResult {
  const hasDetailPage = result.urls.some(isProductDetailUrl);
  if (hasDetailPage || result.urls.length === 0) return result;

  return {
    ...result,
    warnings: [
      ...result.warnings,
      warning(
        "product_detail_urls_unconfirmed",
        "Unable to confirm specific product detail page conversion readiness; only the /software listing page was available.",
        "product_url_source"
      )
    ]
  };
}

function isProductDetailUrl(url: string) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    return /^\/(?:en\/)?software\/[^/]+$/.test(path);
  } catch {
    return false;
  }
}

function compareProductUrls(a: string, b: string) {
  const aPath = pathOf(a);
  const bPath = pathOf(b);
  const priority = (path: string) => path.startsWith("/software/") ? 0 : path.startsWith("/en/software/") ? 1 : 2;
  return priority(aPath) - priority(bPath) || aPath.localeCompare(bPath);
}

function pathOf(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function dedupe(urls: string[]) {
  return [...new Set(urls)];
}

function warning(code: string, message: string, source?: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

export type { EbosProductFetcher };
