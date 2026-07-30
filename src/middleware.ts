import { NextResponse, type NextRequest } from "next/server";
import {
  localeDetectionCacheControl,
  localeDetectionVaryHeader,
  localeCookieMaxAge,
  localeCookieName,
  getRequestedLocaleSwitch,
  localeSwitchQueryName,
  shouldRedirectRootToEnglish,
  normalizePathForRequestedLocale,
} from "@/lib/locale-routing";

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
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  const requestedLocale = getRequestedLocaleSwitch(request.nextUrl.searchParams);
  const isEnglishPath = pathname === "/en" || pathname.startsWith("/en/");
  const isChinesePublicPath =
    pathname === "/" ||
    [
      "/software",
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
    pathname.startsWith("/account-services/") ||
    pathname.startsWith("/skill-learning/") ||
    pathname.startsWith("/ai-news/") ||
    pathname.startsWith("/ai-trends/") ||
    pathname.startsWith("/ai-topics/") ||
    pathname.startsWith("/tools/") ||
    pathname.startsWith("/legal/");

  if (requestedLocale) {
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

  if (
    shouldRedirectRootToEnglish({
      pathname,
      cookieLocale,
      headers: request.headers,
    })
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/en";
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set("Content-Language", "en-US");
    response.headers.set("Cache-Control", localeDetectionCacheControl);
    response.headers.set("Vary", localeDetectionVaryHeader);
    response.cookies.set(localeCookieName, "en", {
      path: "/",
      maxAge: localeCookieMaxAge,
      sameSite: "lax"
    });
    return response;
  }

  const resolvedLocale = isEnglishPath ? "en" : isChinesePublicPath ? "zh" : cookieLocale === "en" ? "en" : "zh";
  const htmlLocale = isEnglishPath ? "en" : isChinesePublicPath ? "zh" : resolvedLocale;

  requestHeaders.set("x-enhe-locale", resolvedLocale);
  requestHeaders.set("x-enhe-html-locale", htmlLocale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
  response.headers.set("Content-Language", htmlLocale === "en" ? "en-US" : "zh-CN");

  if (isEnglishPath && cookieLocale !== "en") {
    response.cookies.set(localeCookieName, "en", {
      path: "/",
      maxAge: localeCookieMaxAge,
      sameSite: "lax"
    });
  } else if (isChinesePublicPath && cookieLocale === "en") {
    response.cookies.set(localeCookieName, "zh", {
      path: "/",
      maxAge: localeCookieMaxAge,
      sameSite: "lax"
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)"
  ]
};
