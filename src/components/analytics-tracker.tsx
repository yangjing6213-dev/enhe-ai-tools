"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  analyticsAttributionMaxSerializedLength,
  normalizeAnalyticsPath,
  parseAnalyticsAttribution,
  parseAnalyticsAttributionCookieValue,
  sanitizeAnalyticsAttribution,
  sanitizeAnalyticsClientPayload,
  serializeAnalyticsAttributionCookie,
  toSafeAnalyticsReferrerOrigin,
  type AnalyticsAttributionPayload
} from "@/lib/analytics-client-payload";
import { classifyTrafficSource, getSeoContentType, isSeoTrackablePath } from "@/lib/seo-insights";

type AnalyticsPayload = {
  eventName: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export type AnalyticsSessionStorage = Pick<Storage, "getItem" | "setItem">;

export type AnalyticsAttribution = AnalyticsAttributionPayload;

export const ANALYTICS_SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const attributionStorageKey = "enhe.analytics.attribution.v2";
const attributionCookieName = "enhe_analytics_attribution";
const fallbackSessionValues = new Map<string, string>();
const fallbackSessionStorage: AnalyticsSessionStorage = {
  getItem: (key) => fallbackSessionValues.get(key) ?? null,
  setItem: (key, value) => fallbackSessionValues.set(key, value)
};

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const storage = getBrowserSessionStorage();
    const session = getOrCreateSessionAttribution({
      pathname: pathname ?? window.location.pathname,
      pageUrl: window.location.href,
      referrer: document.referrer,
      language: document.documentElement.lang,
      storage,
      existingAttribution: readAttributionCookie(document.cookie)
    });
    persistAttributionCookie(session.attribution);

    const eventName = getPageViewEventName(pathname);
    if (eventName) {
      sendAnalyticsEvent({ eventName, path: pathname }, session.attribution);
    }

    if (session.shouldTrackSeoLanding) {
      sendAnalyticsEvent({
        eventName: "seo_landing_view",
        path: pathname ?? window.location.pathname,
        metadata: getSeoLandingMetadata(session.attribution)
      }, session.attribution);
    }
  }, [pathname]);

  useEffect(() => {
    function handleAction(event: Event) {
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest<HTMLElement>("[data-analytics-event]");
      if (!element || !shouldTrackAnalyticsAction(event.type, element.tagName)) return;

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

export function shouldTrackAnalyticsAction(eventType: string, tagName: string) {
  if (eventType === "submit") return tagName === "FORM";
  return eventType === "click" && tagName !== "FORM";
}

function getPageViewEventName(pathname: string | null) {
  const path = normalizePublicPath(pathname ?? "/");
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

function getSeoLandingMetadata(attribution: AnalyticsAttribution) {
  return {
    landingPath: attribution.landingPath,
    contentType: attribution.contentType,
    source: attribution.source,
    trafficMedium: attribution.trafficMedium,
    searchEngine: attribution.searchEngine,
    searchQuery: attribution.searchQuery,
    referrer: attribution.referrer,
    referrerHost: attribution.referrerHost,
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
    locale: attribution.locale
  };
}

export function getOrCreateSessionAttribution({
  pathname,
  pageUrl,
  referrer,
  language,
  storage,
  createId = createAnonymousId,
  existingAttribution,
  now = Date.now
}: {
  pathname: string;
  pageUrl: string;
  referrer?: string | null;
  language?: string | null;
  storage: AnalyticsSessionStorage;
  createId?: () => string;
  existingAttribution?: AnalyticsAttribution | null;
  now?: () => number;
}) {
  const timestamp = now();
  const stored = readSessionAttribution(storage);
  if (stored && !isAttributionExpired(stored, timestamp)) {
    const refreshed = { ...stored, lastSeenAt: timestamp };
    storeSessionAttribution(storage, refreshed);
    return { attribution: refreshed, shouldTrackSeoLanding: false };
  }

  if (existingAttribution && !isAttributionExpired(existingAttribution, timestamp)) {
    const refreshed = { ...existingAttribution, lastSeenAt: timestamp };
    storeSessionAttribution(storage, refreshed);
    return { attribution: refreshed, shouldTrackSeoLanding: false };
  }

  const firstLandingPath = normalizeRawPath(pathname);
  const landingPath = normalizePublicPath(firstLandingPath);
  const traffic = classifyTrafficSource({ pageUrl, referrer });
  const attribution = sanitizeAnalyticsAttribution({
    sessionId: createId(),
    landingId: createId(),
    firstLandingPath,
    landingPath,
    contentType: getSeoContentType(landingPath),
    source: traffic.source,
    trafficMedium: traffic.medium,
    searchEngine: traffic.searchEngine,
    searchQuery: traffic.searchQuery,
    referrer: toSafeAnalyticsReferrerOrigin(referrer),
    referrerHost: traffic.referrerHost,
    utmSource: traffic.utmSource,
    utmMedium: traffic.utmMedium,
    utmCampaign: traffic.utmCampaign,
    locale: firstLandingPath === "/en" || firstLandingPath.startsWith("/en/") || language?.startsWith("en") ? "en" : "zh",
    createdAt: timestamp,
    lastSeenAt: timestamp,
    attributionVersion: 2
  });
  if (!attribution) throw new Error("Invalid generated analytics attribution");
  storeSessionAttribution(storage, attribution);
  return { attribution, shouldTrackSeoLanding: isSeoTrackablePath(landingPath) };
}

export function mergeAttributionMetadata(metadata: Record<string, unknown> | undefined, attribution: AnalyticsAttribution) {
  return {
    ...metadata,
    sessionId: attribution.sessionId,
    landingId: attribution.landingId,
    firstLandingPath: attribution.firstLandingPath,
    attribution
  };
}

function normalizePublicPath(pathname: string) {
  const rawPath = normalizeRawPath(pathname);
  if (rawPath === "/en") return "/";
  return rawPath.replace(/^\/en(?=\/)/, "") || "/";
}

function normalizeRawPath(pathname: string) {
  return normalizeAnalyticsPath(String(pathname || "/").replace(/\/+$/, "")) || "/";
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

function sendAnalyticsEvent(payload: AnalyticsPayload, attributionOverride?: AnalyticsAttribution) {
  if (!payload.eventName) return;
  const timestamp = Date.now();
  const storage = getBrowserSessionStorage();
  const attribution = attributionOverride
    ? isAttributionExpired(attributionOverride, timestamp)
      ? null
      : refreshSessionAttribution(storage, attributionOverride, timestamp)
    : getAndRefreshActiveSessionAttribution({
        storage,
        cookie: document.cookie,
        now: () => timestamp
      });
  if (attribution) persistAttributionCookie(attribution);
  const body = JSON.stringify(sanitizeAnalyticsClientPayload({
    ...payload,
    metadata: attribution ? mergeAttributionMetadata(payload.metadata, attribution) : payload.metadata
  }));
  void sendAnalyticsRequest(body);
}

export async function sendAnalyticsRequest(body: string) {
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    try {
      if (navigator.sendBeacon("/api/analytics", blob)) return;
    } catch {
      // Fall through to fetch when the browser cannot queue the beacon.
    }
  }

  await fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => undefined);
}

function getBrowserSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return fallbackSessionStorage;
  }
}

function readSessionAttribution(storage: AnalyticsSessionStorage) {
  try {
    const value = storage.getItem(attributionStorageKey);
    return value && value.length <= analyticsAttributionMaxSerializedLength ? parseAttribution(value) : null;
  } catch {
    return null;
  }
}

function storeSessionAttribution(storage: AnalyticsSessionStorage, attribution: AnalyticsAttribution) {
  try {
    storage.setItem(attributionStorageKey, JSON.stringify(attribution));
  } catch {
    fallbackSessionStorage.setItem(attributionStorageKey, JSON.stringify(attribution));
  }
}

function readAttributionCookie(cookie: string) {
  const prefix = `${attributionCookieName}=`;
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
  return parseAnalyticsAttributionCookieValue(value);
}

export function getActiveSessionAttribution({
  storage,
  cookie,
  now = Date.now
}: {
  storage: AnalyticsSessionStorage;
  cookie: string;
  now?: () => number;
}) {
  const timestamp = now();
  const stored = readSessionAttribution(storage);
  if (stored && !isAttributionExpired(stored, timestamp)) return stored;

  const cookieAttribution = readAttributionCookie(cookie);
  return cookieAttribution && !isAttributionExpired(cookieAttribution, timestamp)
    ? cookieAttribution
    : null;
}

export function getAndRefreshActiveSessionAttribution({
  storage,
  cookie,
  now = Date.now
}: {
  storage: AnalyticsSessionStorage;
  cookie: string;
  now?: () => number;
}) {
  const timestamp = now();
  const attribution = getActiveSessionAttribution({
    storage,
    cookie,
    now: () => timestamp
  });
  return attribution
    ? refreshSessionAttribution(storage, attribution, timestamp)
    : null;
}

function refreshSessionAttribution(
  storage: AnalyticsSessionStorage,
  attribution: AnalyticsAttribution,
  timestamp: number
) {
  const refreshed = { ...attribution, lastSeenAt: timestamp };
  storeSessionAttribution(storage, refreshed);
  return refreshed;
}

function persistAttributionCookie(attribution: AnalyticsAttribution) {
  const serialized = serializeAnalyticsAttributionCookie(attribution);
  if (!serialized) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = Math.floor(ANALYTICS_SESSION_IDLE_TIMEOUT_MS / 1000);
  document.cookie = `${attributionCookieName}=${serialized}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function parseAttribution(value: string): AnalyticsAttribution | null {
  try {
    return parseAnalyticsAttribution(JSON.parse(value));
  } catch {
    return null;
  }
}

function isAttributionExpired(attribution: AnalyticsAttribution, timestamp: number) {
  return attribution.lastSeenAt > timestamp || timestamp - attribution.lastSeenAt > ANALYTICS_SESSION_IDLE_TIMEOUT_MS;
}

function createAnonymousId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
