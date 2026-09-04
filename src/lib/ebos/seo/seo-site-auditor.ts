import type { EbosEvidenceWarning } from "../evidence";
import { auditSeoPage } from "./seo-page-auditor";
import type {
  EbosSeoFetcher,
  EbosSeoPageAudit
} from "./seo-evidence-types";

const DEFAULT_SITE_URL = "https://www.enhe-tech.com.cn";
const FALLBACK_PATHS = [
  "/",
  "/software",
  "/ai-trends",
  "/ai-news",
  "/account-services",
  "/skill-learning"
];

export type BuildSeoAuditUrlListOptions = {
  siteUrl?: string;
  maxUrls?: number;
  urls?: string[];
  fetcher?: EbosSeoFetcher;
};

export type SeoAuditUrlListResult = {
  urls: string[];
  sitemapStatus: "available" | "fallback" | "unavailable";
  warnings: EbosEvidenceWarning[];
};

export type RunSeoSiteAuditOptions = BuildSeoAuditUrlListOptions;

export type SeoSiteAuditResult = SeoAuditUrlListResult & {
  robotsStatus: "available" | "unavailable";
  pageAudits: EbosSeoPageAudit[];
};

export async function buildSeoAuditUrlList(
  options: BuildSeoAuditUrlListOptions = {}
): Promise<SeoAuditUrlListResult> {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const maxUrls = options.maxUrls ?? 20;
  if (options.urls?.length) {
    return {
      urls: prioritizeSeoUrls(options.urls.map((url) => absolutizeUrl(siteUrl, url))).slice(0, maxUrls),
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
      urls: prioritizeSeoUrls(urls).slice(0, maxUrls),
      sitemapStatus: "available",
      warnings: []
    };
  } catch (error) {
    return {
      urls: FALLBACK_PATHS.map((path) => absolutizeUrl(siteUrl, path)).slice(0, maxUrls),
      sitemapStatus: "fallback",
      warnings: [warning("sitemap_unavailable", `sitemap.xml unavailable; using fallback URL list. ${errorMessage(error)}`, "sitemap.xml")]
    };
  }
}

export async function runSeoSiteAudit(
  options: RunSeoSiteAuditOptions = {}
): Promise<SeoSiteAuditResult> {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const fetcher = options.fetcher ?? fetch;
  const urlList = await buildSeoAuditUrlList({ ...options, siteUrl, fetcher });
  const robotsStatus = await readRobotsStatus(siteUrl, fetcher);
  const pageAudits = await Promise.all(
    urlList.urls.map(async (url) => {
      try {
        const response = await fetcher(url);
        const html = await response.text();
        return auditSeoPage({
          url,
          html,
          httpStatus: response.status,
          warning: response.ok ? undefined : `Page returned HTTP ${response.status}.`
        });
      } catch (error) {
        return auditSeoPage({
          url,
          html: "",
          warning: `Failed to fetch page: ${errorMessage(error)}`
        });
      }
    })
  );

  return {
    ...urlList,
    robotsStatus,
    warnings: [
      ...urlList.warnings,
      ...(robotsStatus === "unavailable" ? [warning("robots_unavailable", "robots.txt unavailable.", "robots.txt")] : [])
    ],
    pageAudits
  };
}

export function parseSitemapUrls(xml: string, siteUrl: string) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((match) => match[1]?.trim())
    .filter((url): url is string => Boolean(url))
    .map((url) => absolutizeUrl(siteUrl, url));
}

export function prioritizeSeoUrls(urls: string[]) {
  const unique = [...new Set(urls)];
  return unique.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
}

async function readRobotsStatus(siteUrl: string, fetcher: EbosSeoFetcher) {
  try {
    const response = await fetcher(`${siteUrl}/robots.txt`);
    return response.ok ? "available" as const : "unavailable" as const;
  } catch {
    return "unavailable" as const;
  }
}

function priority(url: string) {
  const path = safePath(url);
  if (path === "/") return 0;
  if (path === "/software") return 1;
  if (/^\/(?:en\/)?software\/[^/]+/.test(path)) return 2;
  if (path.startsWith("/ai-news") || path.startsWith("/en/ai-news")) return 3;
  if (path.startsWith("/ai-trends") || path.startsWith("/en/ai-trends")) return 4;
  if (path.startsWith("/account-services") || path.startsWith("/en/account-services")) return 5;
  if (path.startsWith("/skill-learning") || path.startsWith("/en/skill-learning")) return 6;
  return 20;
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function absolutizeUrl(siteUrl: string, url: string) {
  try {
    return new URL(url, `${siteUrl}/`).toString().replace(/\/$/, (match, offset, value) => {
      const parsed = new URL(value);
      return parsed.pathname === "/" ? "/" : match;
    });
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
