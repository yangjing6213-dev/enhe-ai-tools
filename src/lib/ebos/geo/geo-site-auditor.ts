import type { EbosEvidenceWarning } from "../evidence";
import type { EbosGeoFetcher, EbosGeoPageAudit } from "./geo-evidence-types";
import { auditGeoPage } from "./geo-page-auditor";
import { parseSitemapUrls } from "../seo";

const DEFAULT_SITE_URL = "https://www.enhe-tech.com.cn";
const FALLBACK_PATHS = [
  "/software",
  "/ai-news",
  "/ai-trends",
  "/skill-learning",
  "/account-services",
  "/"
];

export type BuildGeoAuditUrlListOptions = {
  siteUrl?: string;
  maxUrls?: number;
  urls?: string[];
  fetcher?: EbosGeoFetcher;
};

export type GeoAuditUrlListResult = {
  urls: string[];
  sitemapStatus: "available" | "fallback";
  warnings: EbosEvidenceWarning[];
};

export type RunGeoSiteAuditOptions = BuildGeoAuditUrlListOptions;

export type GeoSiteAuditResult = GeoAuditUrlListResult & {
  pageAudits: EbosGeoPageAudit[];
};

export async function buildGeoAuditUrlList(
  options: BuildGeoAuditUrlListOptions = {}
): Promise<GeoAuditUrlListResult> {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const maxUrls = options.maxUrls ?? 20;
  if (options.urls?.length) {
    return {
      urls: prioritizeGeoUrls(options.urls.map((url) => absolutizeUrl(siteUrl, url))).slice(0, maxUrls),
      sitemapStatus: "available",
      warnings: []
    };
  }

  const fetcher = options.fetcher ?? fetch;
  try {
    const response = await fetcher(`${siteUrl}/sitemap.xml`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const urls = parseSitemapUrls(await response.text(), siteUrl);
    if (urls.length === 0) throw new Error("sitemap contains no URLs");
    return {
      urls: prioritizeGeoUrls(urls).slice(0, maxUrls),
      sitemapStatus: "available",
      warnings: []
    };
  } catch (error) {
    return {
      urls: FALLBACK_PATHS.map((path) => absolutizeUrl(siteUrl, path)).slice(0, maxUrls),
      sitemapStatus: "fallback",
      warnings: [warning("sitemap_unavailable", `sitemap.xml unavailable; using GEO fallback URL list. ${errorMessage(error)}`, "sitemap.xml")]
    };
  }
}

export async function runGeoSiteAudit(
  options: RunGeoSiteAuditOptions = {}
): Promise<GeoSiteAuditResult> {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const fetcher = options.fetcher ?? fetch;
  const urlList = await buildGeoAuditUrlList({ ...options, siteUrl, fetcher });
  const pageAudits = await Promise.all(
    urlList.urls.map(async (url) => {
      try {
        const response = await fetcher(url);
        return auditGeoPage({
          url,
          html: await response.text(),
          warning: response.ok ? undefined : `Page returned HTTP ${response.status}.`
        });
      } catch (error) {
        return auditGeoPage({
          url,
          html: "",
          warning: `Failed to fetch page: ${errorMessage(error)}`
        });
      }
    })
  );

  return {
    ...urlList,
    pageAudits,
    warnings: [
      ...urlList.warnings,
      ...pageAudits.flatMap((page) => page.warnings)
    ]
  };
}

export function prioritizeGeoUrls(urls: string[]) {
  return [...new Set(urls)].sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
}

function priority(url: string) {
  const path = safePath(url);
  if (/^\/(?:en\/)?software\/[^/]+/.test(path)) return 0;
  if (path.startsWith("/ai-news") || path.startsWith("/en/ai-news")) return 1;
  if (path.startsWith("/ai-trends") || path.startsWith("/en/ai-trends")) return 2;
  if (path.startsWith("/skill-learning") || path.startsWith("/en/skill-learning")) return 3;
  if (path.startsWith("/account-services") || path.startsWith("/en/account-services")) return 4;
  if (path === "/software") return 5;
  if (path === "/") return 6;
  return 20;
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function absolutizeUrl(siteUrl: string, url: string) {
  try {
    return new URL(url, `${siteUrl}/`).toString();
  } catch {
    return siteUrl;
  }
}

function safePath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
