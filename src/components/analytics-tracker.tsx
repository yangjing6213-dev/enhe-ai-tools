"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { classifyTrafficSource, getSeoContentType, isSeoTrackablePath } from "@/lib/seo-insights";

type AnalyticsPayload = {
  eventName: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const eventName = getPageViewEventName(pathname);
    if (eventName) {
      sendAnalyticsEvent({ eventName, path: pathname });
    }

    const seoMetadata = getSeoLandingMetadata(pathname);
    if (seoMetadata) {
      sendAnalyticsEvent({
        eventName: "seo_landing_view",
        path: pathname ?? window.location.pathname,
        metadata: seoMetadata
      });
    }
  }, [pathname]);

  useEffect(() => {
    function handleAction(event: Event) {
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest<HTMLElement>("[data-analytics-event]");
      if (!element) return;

      sendAnalyticsEvent({
        eventName: element.dataset.analyticsEvent ?? "",
        path: window.location.pathname,
        entityType: element.dataset.analyticsEntityType,
        entityId: element.dataset.analyticsEntityId,
        metadata: collectAnalyticsMetadata(element)
      });
    }

    document.addEventListener("click", handleAction, true);
    document.addEventListener("submit", handleAction, true);
    return () => {
      document.removeEventListener("click", handleAction, true);
      document.removeEventListener("submit", handleAction, true);
    };
  }, []);

  return null;
}

function getPageViewEventName(pathname: string | null) {
  const path = (pathname ?? "/").replace(/\/+$/, "") || "/";
  if (path === "/") return "visit_home";
  if (path === "/pricing") return "view_pricing";
  if (path === "/user") return "view_user_center";
  if (
    path.startsWith("/software/") ||
    path.startsWith("/skill-learning/") ||
    path.startsWith("/account-services/") ||
    path.startsWith("/tools/")
  ) {
    return "view_tool";
  }
  return null;
}

function getSeoLandingMetadata(pathname: string | null) {
  const path = normalizePublicPath(pathname ?? window.location.pathname);
  const contentType = getSeoContentType(path);
  if (!isSeoTrackablePath(path)) return null;

  const traffic = classifyTrafficSource({ pageUrl: window.location.href, referrer: document.referrer });
  return {
    landingPath: path,
    contentType,
    source: traffic.source,
    trafficMedium: traffic.medium,
    searchEngine: traffic.searchEngine,
    searchQuery: traffic.searchQuery,
    referrerHost: traffic.referrerHost,
    utmSource: traffic.utmSource,
    utmMedium: traffic.utmMedium,
    utmCampaign: traffic.utmCampaign,
    locale: path.startsWith("/en") ? "en" : document.documentElement.lang?.startsWith("en") ? "en" : "zh"
  };
}

function normalizePublicPath(pathname: string) {
  const rawPath = String(pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (rawPath === "/en") return "/";
  return rawPath.replace(/^\/en(?=\/)/, "") || "/";
}

function collectAnalyticsMetadata(element: HTMLElement) {
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(element.dataset)) {
    if (key.startsWith("analyticsMeta") && value) {
      metadata[key.replace("analyticsMeta", "").toLowerCase()] = value;
    }
  }
  return Object.keys(metadata).length ? metadata : undefined;
}

function sendAnalyticsEvent(payload: AnalyticsPayload) {
  if (!payload.eventName) return;
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => undefined);
}
