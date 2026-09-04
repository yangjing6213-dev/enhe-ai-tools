import type { Prisma } from "@prisma/client";
import { buildCanonicalAiNewsPath, buildCanonicalToolPath } from "@/lib/public-slugs";
import { fallbackSiteBaseUrl, getSiteBaseUrl } from "@/lib/seo";

const baiduPushEndpointBase = "http://data.zz.baidu.com/urls";
const privatePathPattern =
  /^\/(?:admin|api|login|register|user|user-center|dashboard|checkout|orders|payment|online-tools)(?:\/|$)/;

type BaiduPushResponse = {
  success?: number;
  remain?: number;
  not_same_site?: string[];
  not_valid?: string[];
  error?: number;
  message?: string;
  [key: string]: unknown;
};

export type BaiduPushResult =
  | {
      ok: true;
      submitted: number;
      status: number;
      response: BaiduPushResponse;
      urls: string[];
    }
  | {
      ok: false;
      submitted: 0;
      reason: "missing-token" | "no-urls" | "request-failed";
      status?: number;
      response?: BaiduPushResponse | string;
      error?: unknown;
      urls: string[];
    };

type CoreSitemapUrlOptions = {
  includeEnglish?: boolean;
  limit?: number;
};

type SitemapExtractionOptions = {
  includeEnglish?: boolean;
};

function getBaiduPushToken() {
  return process.env.BAIDU_PUSH_TOKEN?.trim() ?? "";
}

function getBaiduSiteUrl() {
  const configuredUrl =
    process.env.BAIDU_PUSH_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    getSiteBaseUrl();
  const siteUrl = new URL(configuredUrl);
  if (siteUrl.protocol !== "https:" || /^(?:localhost|127\.0\.0\.1)$/i.test(siteUrl.hostname)) {
    return fallbackSiteBaseUrl;
  }

  siteUrl.pathname = "";
  siteUrl.search = "";
  siteUrl.hash = "";
  return siteUrl.toString().replace(/\/$/, "");
}

export function buildBaiduPushEndpoint() {
  const site = getBaiduSiteUrl();
  const token = encodeURIComponent(getBaiduPushToken());
  return `${baiduPushEndpointBase}?site=${site}&token=${token}`;
}

function normalizeBaiduPushUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/") && !/^https?:\/\//i.test(trimmed)) return null;

  let url: URL;
  try {
    url = trimmed.startsWith("/") ? new URL(trimmed, getBaiduSiteUrl()) : new URL(trimmed);
  } catch {
    return null;
  }

  const siteUrl = new URL(getBaiduSiteUrl());
  if (url.protocol !== "https:" || url.host !== siteUrl.host) return null;
  if (privatePathPattern.test(url.pathname)) return null;

  url.hash = "";
  return url.toString();
}

export function buildBaiduPushUrls(urls: Array<string | null | undefined>) {
  return Array.from(
    new Set(urls.flatMap((url) => (typeof url === "string" ? [normalizeBaiduPushUrl(url)] : [])).filter(Boolean) as string[])
  );
}

export function extractBaiduUrlsFromSitemapXml(xml: string, options: SitemapExtractionOptions = {}) {
  const locPattern = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = locPattern.exec(xml))) {
    const decodedUrl = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    try {
      const pathname = new URL(decodedUrl).pathname;
      if (!options.includeEnglish && (pathname === "/en" || pathname.startsWith("/en/"))) continue;
    } catch {
      continue;
    }

    urls.push(decodedUrl);
  }

  return buildBaiduPushUrls(urls);
}

async function parseBaiduResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as BaiduPushResponse;
  } catch {
    return text;
  }
}

export async function submitBaiduUrls(urls: Array<string | null | undefined>): Promise<BaiduPushResult> {
  const urlList = buildBaiduPushUrls(urls);
  if (!getBaiduPushToken()) return { ok: false, submitted: 0, reason: "missing-token", urls: urlList };
  if (!urlList.length) return { ok: false, submitted: 0, reason: "no-urls", urls: [] };

  try {
    const response = await fetch(buildBaiduPushEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: urlList.join("\n")
    });
    const payload = await parseBaiduResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        submitted: 0,
        reason: "request-failed",
        status: response.status,
        response: payload,
        urls: urlList
      };
    }

    return {
      ok: true,
      submitted: urlList.length,
      status: response.status,
      response: typeof payload === "string" ? { message: payload } : payload,
      urls: urlList
    };
  } catch (error) {
    return { ok: false, submitted: 0, reason: "request-failed", error, urls: urlList };
  }
}

export async function recordBaiduPushResult(result: BaiduPushResult, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test") return;

  try {
    const { prisma } = await import("@/lib/db");
    const metadata = JSON.parse(
      JSON.stringify({
        ...context,
        result
      })
    ) as Prisma.InputJsonValue;

    await prisma.adminAuditLog.create({
      data: {
        adminId: null,
        action: "baidu.push",
        targetType: "seo_push",
        targetId: null,
        summary: result.ok
          ? `Baidu ordinary URL push submitted ${result.submitted} URL(s).`
          : `Baidu ordinary URL push skipped or failed: ${result.reason}.`,
        metadata
      }
    });
  } catch (error) {
    console.warn("[baidu-push] failed to write audit log", error);
  }
}

export async function notifyBaiduSearch(urls: Array<string | null | undefined>, context?: Record<string, unknown>) {
  try {
    const result = await submitBaiduUrls(urls);
    await recordBaiduPushResult(result, { source: "auto", ...context });

    if (!result.ok) {
      console.warn("[baidu-push] submission skipped or failed", result);
    }
  } catch (error) {
    const result: BaiduPushResult = {
      ok: false,
      submitted: 0,
      reason: "request-failed",
      error,
      urls: buildBaiduPushUrls(urls)
    };
    await recordBaiduPushResult(result, { source: "auto", ...context });
    console.warn("[baidu-push] submission skipped or failed", result);
  }
}

function pushMaybeEnglishPath(urls: string[], path: string, includeEnglish?: boolean) {
  urls.push(path);
  if (includeEnglish && path !== "/" && !path.startsWith("/en/")) {
    urls.push(`/en${path}`);
  }
}

export async function getCoreBaiduSitemapUrls(options: CoreSitemapUrlOptions = {}) {
  const { prisma } = await import("@/lib/db");
  const urls: string[] = [];
  const staticPaths = ["/", "/ai-news", "/software", "/account-services", "/skill-learning", "/tutorials", "/ai-trends"];

  for (const path of staticPaths) {
    pushMaybeEnglishPath(urls, path, options.includeEnglish);
  }

  const tools = await prisma.tool.findMany({
    where: { status: "published" },
    select: { slug: true, name: true, englishName: true, type: true },
    orderBy: [{ updatedAt: "desc" }]
  });
  const newsArticles = await prisma.newsArticle.findMany({
    where: { status: "published" },
    select: { slug: true, title: true, englishTitle: true },
    orderBy: [{ updatedAt: "desc" }]
  });

  for (const article of newsArticles) {
    urls.push(buildCanonicalAiNewsPath(article, "zh"));
  }
  for (const tool of tools) {
    urls.push(buildCanonicalToolPath(tool, "zh"));
  }

  return buildBaiduPushUrls(typeof options.limit === "number" && options.limit > 0 ? urls.slice(0, options.limit) : urls);
}
