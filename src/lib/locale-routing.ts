import type { Locale } from "@/lib/dictionaries";

export const localeCookieName = "enhe_locale";
export const localeCookieMaxAge = 60 * 60 * 24 * 365;
export const localeSwitchQueryName = "locale";
export const localeDetectionVaryHeader =
  "Accept-Language, Cookie, CF-IPCountry, X-Vercel-IP-Country, X-Country-Code, X-Geo-Country, X-Forwarded-Country, X-Client-Country, X-Client-Geo-Country, X-Tencent-Country, EO-Client-Geo-Country-Code, CloudFront-Viewer-Country, X-Appengine-Country";
export const localeDetectionCacheControl = "private, no-cache, no-store, max-age=0";

const chineseRegionCountryCodes = new Set(["CN", "HK", "MO", "TW"]);
const unknownCountryCodes = new Set(["XX", "ZZ", "T1", "A1", "A2", "O1"]);

const geoCountryHeaderNames = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-geo-country",
  "x-forwarded-country",
  "x-client-country",
  "x-client-geo-country",
  "x-tencent-country",
  "eo-client-geo-country-code",
  "cloudfront-viewer-country",
  "x-appengine-country",
];

const crawlerUserAgentPattern =
  /bot|spider|crawl|slurp|bingpreview|google-inspectiontool|gptbot|chatgpt-user|oai-searchbot|perplexitybot|claudebot|anthropic-ai|google-extended|bytespider|applebot|yisouspider|baiduspider|sogou|360spider|petalbot|duckduckbot|semrushbot|ahrefsbot|mj12bot/i;

function normalizeCountryCode(value: string | null) {
  const country = value
    ?.split(",")[0]
    ?.trim()
    .toUpperCase();

  if (!country || country.length !== 2 || unknownCountryCodes.has(country)) {
    return null;
  }

  return country;
}

export function getRequestCountryCode(headers: Headers) {
  for (const headerName of geoCountryHeaderNames) {
    const country = normalizeCountryCode(headers.get(headerName));
    if (country) return country;
  }

  return null;
}

export function isChineseRegionCountry(countryCode: string | null) {
  return countryCode ? chineseRegionCountryCodes.has(countryCode) : false;
}

export function isSearchOrAiCrawler(userAgent: string | null) {
  return crawlerUserAgentPattern.test(userAgent ?? "");
}

export function getRequestedLocaleSwitch(searchParams: URLSearchParams) {
  const locale = searchParams.get(localeSwitchQueryName);
  return locale === "zh" || locale === "en" ? locale : null;
}

export function normalizePathForRequestedLocale(
  pathname: string,
  locale: Locale,
) {
  if (pathname.startsWith("/redesign-preview/")) return pathname;
  const isAdminOrOrderPath = /^\/(?:admin|orders)(?:\/|$)/.test(pathname);

  if (locale === "zh") {
    if (pathname === "/en") return "/";
    if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
    return pathname;
  }

  if (isAdminOrOrderPath || pathname === "/en" || pathname.startsWith("/en/")) {
    return pathname;
  }
  return pathname === "/" ? "/en" : `/en${pathname}`;
}

function parseAcceptLanguage(headerValue: string | null) {
  return (headerValue ?? "")
    .split(",")
    .map((item, index) => {
      const [tag = "", ...params] = item.trim().split(";");
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="))
        ?.slice(2);

      return {
        tag: tag.toLowerCase(),
        q: q ? Number(q) : 1,
        index,
      };
    })
    .filter((item) => item.tag)
    .sort((a, b) => b.q - a.q || a.index - b.index);
}

export function inferLocaleFromRequest(headers: Headers): Locale {
  const countryCode = getRequestCountryCode(headers);
  if (countryCode) return isChineseRegionCountry(countryCode) ? "zh" : "en";

  const acceptedLanguages = parseAcceptLanguage(headers.get("accept-language"));
  for (const { tag } of acceptedLanguages) {
    if (tag === "zh" || tag.startsWith("zh-")) return "zh";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }

  const primaryLanguage = acceptedLanguages[0]?.tag;
  if (primaryLanguage && !primaryLanguage.startsWith("zh")) return "en";

  return "zh";
}

export function getRequestLocalePreference(
  cookieLocale: string | undefined,
  headers: Headers,
): Locale | null {
  if (cookieLocale === "zh" || cookieLocale === "en") return cookieLocale;
  if (isSearchOrAiCrawler(headers.get("user-agent"))) return null;
  return inferLocaleFromRequest(headers);
}
