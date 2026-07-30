"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getPageViewEventName,
  isClientWritableAnalyticsEventName,
  normalizeAnalyticsPublicPath,
} from "@/lib/analytics-client";
import { classifyTrafficSource, getSeoContentType, isSeoTrackablePath } from "@/lib/seo-insights";

export type ClientAnalyticsPayload = {
  eventName: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  context?: AnalyticsContext;
};

type AnalyticsContext = {
  clientId: string;
  sessionId: string;
  source?: string;
  medium?: string;
  campaign?: string;
  offerId?: string;
};

const analyticsClientIdKey = "enhe_analytics_client_id";
const analyticsSessionIdKey = "enhe_analytics_session_id";
const analyticsAttributionKey = "enhe_analytics_attribution";

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

    if (isSeoAuditLandingPath(pathname)) {
      sendAnalyticsEvent({
        eventName: "seo_audit_landing_view",
        path: pathname ?? window.location.pathname,
        entityType: "seo_audit_product"
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

function getSeoLandingMetadata(pathname: string | null) {
  const path = normalizeAnalyticsPublicPath(pathname ?? window.location.pathname);
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

export function isSeoAuditLandingPath(pathname: string | null) {
  const path = normalizeAnalyticsPublicPath(pathname ?? "/");
  return path === "/seo-geo-audit"
    || path === "/tools/seo-geo-audit"
    || path === "/online-tools/seo-geo-audit";
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

export function trackClientAnalyticsEvent(payload: ClientAnalyticsPayload) {
  sendAnalyticsEvent(payload);
}

function sendAnalyticsEvent(payload: ClientAnalyticsPayload) {
  if (!isClientWritableAnalyticsEventName(payload.eventName)) return;
  const context = getAnalyticsContext(payload);
  const body = JSON.stringify({ ...payload, context });
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

function getAnalyticsContext(payload: ClientAnalyticsPayload): AnalyticsContext {
  const attribution = getSessionAttribution();
  const offerId = readMetadataString(payload.metadata, "offerId")
    ?? readMetadataString(payload.metadata, "offerid")
    ?? (payload.entityType === "seo_audit_offer" ? payload.entityId : undefined);
  return {
    clientId: getOrCreateStorageId("local", analyticsClientIdKey),
    sessionId: getOrCreateStorageId("session", analyticsSessionIdKey),
    ...attribution,
    ...(offerId ? { offerId } : {})
  };
}

function getSessionAttribution(): Pick<AnalyticsContext, "source" | "medium" | "campaign"> {
  try {
    const stored = window.sessionStorage.getItem(analyticsAttributionKey);
    if (stored) return JSON.parse(stored) as Pick<AnalyticsContext, "source" | "medium" | "campaign">;

    const traffic = classifyTrafficSource({ pageUrl: window.location.href, referrer: document.referrer });
    const attribution = {
      source: traffic.utmSource ?? traffic.source,
      medium: traffic.utmMedium ?? traffic.medium,
      ...(traffic.utmCampaign ? { campaign: traffic.utmCampaign } : {})
    };
    window.sessionStorage.setItem(analyticsAttributionKey, JSON.stringify(attribution));
    return attribution;
  } catch {
    return {};
  }
}

function getOrCreateStorageId(storage: "local" | "session", key: string) {
  const fallback = createAnalyticsId();
  try {
    const target = storage === "local" ? window.localStorage : window.sessionStorage;
    const existing = target.getItem(key);
    if (existing) return existing;
    target.setItem(key, fallback);
  } catch {
    return fallback;
  }
  return fallback;
}

function createAnalyticsId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readMetadataString(
  metadata: ClientAnalyticsPayload["metadata"],
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
