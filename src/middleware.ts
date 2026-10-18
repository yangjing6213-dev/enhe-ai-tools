import { NextResponse, type NextRequest } from "next/server";
import {
  localeDetectionCacheControl,
  localeDetectionVaryHeader,
  localeCookieMaxAge,
  localeCookieName,
  getRequestLocalePreference,
  getRequestedLocaleSwitch,
  localeSwitchQueryName,
  normalizePathForRequestedLocale,
} from "@/lib/locale-routing";
import { isLocalizedPublicPath } from "@/lib/seo";
import { buildContentSecurityPolicy } from "@/lib/content-security-policy";

export function middleware(request: NextRequest) {
  if (request.nextUrl.hostname.toLowerCase() === "enhe-tech.com.cn") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = "www.enhe-tech.com.cn";
    redirectUrl.port = "";
    return NextResponse.redirect(redirectUrl, 301);
  }

  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  const isRedesignPreviewPath = pathname.startsWith("/redesign-preview/");
  const isEnglishPath = pathname === "/en" || pathname.startsWith("/en/");
  const isAdminPath =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/en/admin" ||
    pathname.startsWith("/en/admin/");
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  const requestedLocale = getRequestedLocaleSwitch(request.nextUrl.searchParams);

  // Stop unauthenticated admin requests before the route tree starts rendering
  // database-backed pages. This keeps DB-free local previews free of leaked
  // Prisma errors while requireAdmin remains the server authorization boundary.
  const authCookieName = process.env.AUTH_COOKIE_NAME ?? "enhe_session";
  if (isAdminPath && !request.cookies.get(authCookieName)?.value) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isEnglishPath ? "/en/login" : "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
    const redirectStatus = request.method === "GET" || request.method === "HEAD" ? 307 : 303;
    return NextResponse.redirect(redirectUrl, redirectStatus);
  }

  const isChinesePublicPath =
    pathname === "/" ||
    [
      "/software",
      "/ai-skills",
      "/account-services",
      "/online-tools",
      "/skill-learning",
      "/pricing",
      "/tutorials",
      "/ai-news",
      "/ai-trends",
      "/ai-topics",
      "/build-your-own-x",
    ].includes(pathname) ||
    pathname.startsWith("/software/") ||
    pathname.startsWith("/ai-skills/") ||
    pathname.startsWith("/account-services/") ||
    pathname.startsWith("/skill-learning/") ||
    pathname.startsWith("/ai-news/") ||
    pathname.startsWith("/ai-trends/") ||
    pathname.startsWith("/ai-topics/") ||
    pathname.startsWith("/tools/") ||
    pathname.startsWith("/legal/");

  if (requestedLocale && !isRedesignPreviewPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = normalizePathForRequestedLocale(
      redirectUrl.pathname,
      requestedLocale,
    );
    redirectUrl.searchParams.delete(localeSwitchQueryName);

    const response = NextResponse.redirect(redirectUrl, 308);
    response.headers.set(
      "Content-Language",
      requestedLocale === "en" ? "en-US" : "zh-CN",
    );
    response.headers.set("Cache-Control", localeDetectionCacheControl);
    response.headers.set("Vary", localeDetectionVaryHeader);
    response.cookies.set(localeCookieName, requestedLocale, {
      path: "/",
      maxAge: localeCookieMaxAge,
      sameSite: "lax"
    });
    return response;
  }

  const isExplicitEnglishPath = isEnglishPath;
  // Geo and browser-language detection applies to this request only. The language
  // switch persists a manual choice; the legacy locale query is an explicit choice too.
  const localePreference = isLocalizedPublicPath(pathname) &&
    !isExplicitEnglishPath
    ? getRequestLocalePreference(cookieLocale, request.headers)
    : isRedesignPreviewPath
      ? requestedLocale
      : null;
  if (localePreference) {
    const localizedPath = normalizePathForRequestedLocale(pathname, localePreference);
    if (localizedPath !== pathname) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = localizedPath;
      const response = NextResponse.redirect(redirectUrl);
      response.headers.set(
        "Content-Language",
        localePreference === "en" ? "en-US" : "zh-CN",
      );
      response.headers.set("Cache-Control", localeDetectionCacheControl);
      response.headers.set("Vary", localeDetectionVaryHeader);
      return response;
    }
  }

  const resolvedLocale = isEnglishPath
    ? "en"
    : isChinesePublicPath
      ? "zh"
      : localePreference ?? (cookieLocale === "en" ? "en" : "zh");
  const htmlLocale = isEnglishPath ? "en" : isChinesePublicPath ? "zh" : resolvedLocale;

  requestHeaders.set("x-enhe-locale", resolvedLocale);
  requestHeaders.set("x-enhe-html-locale", htmlLocale);
  requestHeaders.set("x-enhe-pathname", pathname);

  // Never accept a client-supplied nonce. Next reads the request CSP when
  // adding the nonce to its streamed bootstrap scripts.
  requestHeaders.delete("x-nonce");
  requestHeaders.delete("Content-Security-Policy");
  const isDocumentPath = request.headers.get("rsc") !== "1" &&
    !pathname.startsWith("/fonts/") &&
    !/\.(?:xml|txt|md|json|webmanifest|png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(pathname);
  const nonce = isDocumentPath
    ? btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
    : null;
  const contentSecurityPolicy = nonce
    ? buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development")
    : null;
  if (nonce && contentSecurityPolicy) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
  if (contentSecurityPolicy) {
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    // A nonce belongs to this HTML response, never to a shared cached copy.
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  if (isRedesignPreviewPath && requestedLocale) {
    response.cookies.set(localeCookieName, requestedLocale, {
      path: "/",
      maxAge: localeCookieMaxAge,
      sameSite: "lax"
    });
  }
  const isLanguageNeutralMachinePath =
    pathname === "/robots.txt" || pathname === "/sitemap.xml";
  const contentLanguage =
    pathname === "/pricing.md" || pathname.startsWith("/okf/")
      ? "en-US"
      : pathname === "/llms.txt"
        ? "zh-CN, en-US"
        : htmlLocale === "en"
          ? "en-US"
          : "zh-CN";

  if (!isLanguageNeutralMachinePath) {
    response.headers.set("Content-Language", contentLanguage);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)"
  ]
};
