export const analyticsClientStringLimits = {
  path: 300,
  entityType: 80,
  entityId: 120,
  sessionId: 120,
  landingId: 120,
  firstLandingPath: 300,
  landingPath: 300,
  contentType: 80,
  source: 80,
  trafficMedium: 80,
  searchEngine: 80,
  searchQuery: 200,
  referrer: 500,
  referrerHost: 253,
  utmSource: 100,
  utmMedium: 100,
  utmCampaign: 160,
  query: 200,
  category: 120,
  tag: 120,
  sort: 80,
  target: 120,
  placement: 120,
  surface: 120,
  promptId: 128
} as const;

export const analyticsTrafficMediumValues = [
  "direct",
  "internal",
  "organic_search",
  "ai_answer_engine",
  "referral",
  "campaign"
] as const;

export const analyticsAttributionMaxSerializedLength = 4096;

export const analyticsClientMetadataKeys = [
  "sessionId",
  "landingId",
  "firstLandingPath",
  "landingPath",
  "contentType",
  "source",
  "trafficMedium",
  "searchEngine",
  "searchQuery",
  "referrer",
  "referrerHost",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "locale",
  "query",
  "category",
  "tag",
  "sort",
  "target",
  "placement",
  "surface",
  "offerCount",
  "promptId",
  "attribution"
] as const;

export const analyticsAttributionMetadataKeys = [
  "sessionId",
  "landingId",
  "firstLandingPath",
  "landingPath",
  "contentType",
  "source",
  "trafficMedium",
  "searchEngine",
  "searchQuery",
  "referrer",
  "referrerHost",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "locale",
  "createdAt",
  "lastSeenAt",
  "attributionVersion"
] as const;

export type AnalyticsAttributionPayload = {
  sessionId: string;
  landingId: string;
  firstLandingPath: string;
  landingPath: string;
  contentType: string;
  source: string;
  trafficMedium: (typeof analyticsTrafficMediumValues)[number];
  searchEngine?: string;
  searchQuery?: string;
  referrer?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  locale: "zh" | "en";
  createdAt: number;
  lastSeenAt: number;
  attributionVersion: 2;
};

type AnalyticsClientPayload = {
  eventName: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

const analyticsPathKeys = new Set(["firstLandingPath", "landingPath"]);
const analyticsStringKeys = new Set(
  Object.keys(analyticsClientStringLimits).filter((key) => ![
    "path",
    "entityType",
    "entityId",
    "referrer",
    "referrerHost",
    "firstLandingPath",
    "landingPath"
  ].includes(key))
);
const analyticsTrafficMediumSet = new Set<string>(analyticsTrafficMediumValues);
const analyticsAttributionMetadataKeySet = new Set<string>(analyticsAttributionMetadataKeys);

export function sanitizeAnalyticsClientPayload(payload: AnalyticsClientPayload): AnalyticsClientPayload {
  return {
    eventName: payload.eventName,
    path: normalizeAnalyticsPath(payload.path),
    entityType: toBoundedAnalyticsString(payload.entityType, analyticsClientStringLimits.entityType),
    entityId: toBoundedAnalyticsString(payload.entityId, analyticsClientStringLimits.entityId),
    metadata: sanitizeAnalyticsMetadata(payload.metadata)
  };
}

export function normalizeAnalyticsPath(value: unknown, max: number = analyticsClientStringLimits.path) {
  if (typeof value !== "string") return undefined;
  const path = value.trim().split(/[?#]/, 1)[0].replace(/[\u0000-\u001f\u007f]/g, "");
  if (!path) return undefined;
  return toBoundedAnalyticsString(path.startsWith("/") ? path : `/${path}`, max);
}

export function toSafeAnalyticsReferrerOrigin(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return toBoundedAnalyticsString(url.origin, analyticsClientStringLimits.referrer);
  } catch {
    return undefined;
  }
}

export function toSafeAnalyticsHostname(value: unknown) {
  if (typeof value !== "string") return undefined;
  const hostname = value.trim().toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.length > analyticsClientStringLimits.referrerHost || /[\s\/?#@]/.test(hostname)) return undefined;
  if (hostname.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return undefined;
  try {
    const parsed = new URL(`https://${hostname}`);
    return parsed.hostname.toLowerCase() === hostname ? hostname : undefined;
  } catch {
    return undefined;
  }
}

export function sanitizeAnalyticsAttribution(value: unknown): AnalyticsAttributionPayload | undefined {
  if (!isRecord(value)) return undefined;
  const sessionId = toBoundedAnalyticsString(value.sessionId, analyticsClientStringLimits.sessionId);
  const landingId = toBoundedAnalyticsString(value.landingId, analyticsClientStringLimits.landingId);
  const firstLandingPath = normalizeAnalyticsPath(value.firstLandingPath, analyticsClientStringLimits.firstLandingPath);
  const landingPath = normalizeAnalyticsPath(value.landingPath, analyticsClientStringLimits.landingPath);
  const contentType = toBoundedAnalyticsString(value.contentType, analyticsClientStringLimits.contentType);
  const source = toBoundedAnalyticsString(value.source, analyticsClientStringLimits.source);
  const trafficMedium = toBoundedAnalyticsString(value.trafficMedium, analyticsClientStringLimits.trafficMedium);
  const locale = value.locale === "zh" || value.locale === "en" ? value.locale : undefined;
  const createdAt = toAnalyticsTimestamp(value.createdAt);
  const lastSeenAt = toAnalyticsTimestamp(value.lastSeenAt);

  if (
    !sessionId || !landingId || !firstLandingPath || !landingPath || !contentType || !source ||
    !trafficMedium || !analyticsTrafficMediumSet.has(trafficMedium) || !locale || createdAt === undefined ||
    lastSeenAt === undefined || createdAt > lastSeenAt || value.attributionVersion !== 2
  ) {
    return undefined;
  }

  return compactRecord({
    sessionId,
    landingId,
    firstLandingPath,
    landingPath,
    contentType,
    source,
    trafficMedium: trafficMedium as AnalyticsAttributionPayload["trafficMedium"],
    searchEngine: toBoundedAnalyticsString(value.searchEngine, analyticsClientStringLimits.searchEngine),
    searchQuery: toBoundedAnalyticsString(value.searchQuery, analyticsClientStringLimits.searchQuery),
    referrer: toSafeAnalyticsReferrerOrigin(value.referrer),
    referrerHost: toSafeAnalyticsHostname(value.referrerHost),
    utmSource: toBoundedAnalyticsString(value.utmSource, analyticsClientStringLimits.utmSource),
    utmMedium: toBoundedAnalyticsString(value.utmMedium, analyticsClientStringLimits.utmMedium),
    utmCampaign: toBoundedAnalyticsString(value.utmCampaign, analyticsClientStringLimits.utmCampaign),
    locale,
    createdAt,
    lastSeenAt,
    attributionVersion: 2
  }) as AnalyticsAttributionPayload;
}

export function parseAnalyticsAttribution(value: unknown): AnalyticsAttributionPayload | null {
  if (!isRecord(value) || Object.keys(value).some((key) => !analyticsAttributionMetadataKeySet.has(key))) return null;
  const sanitized = sanitizeAnalyticsAttribution(value);
  if (!sanitized) return null;
  for (const key of Object.keys(value)) {
    if (JSON.stringify(value[key]) !== JSON.stringify(sanitized[key as keyof AnalyticsAttributionPayload])) return null;
  }
  return sanitized;
}

export function serializeAnalyticsAttributionCookie(value: unknown) {
  const attribution = sanitizeAnalyticsAttribution(value);
  if (!attribution) return null;
  const serialized = encodeURIComponent(JSON.stringify({
    sessionId: attribution.sessionId,
    landingId: attribution.landingId,
    firstLandingPath: attribution.firstLandingPath,
    landingPath: attribution.landingPath,
    contentType: attribution.contentType,
    source: attribution.source,
    trafficMedium: attribution.trafficMedium,
    locale: attribution.locale,
    createdAt: attribution.createdAt,
    lastSeenAt: attribution.lastSeenAt,
    attributionVersion: attribution.attributionVersion
  }));
  return serialized.length <= analyticsAttributionMaxSerializedLength ? serialized : null;
}

export function parseAnalyticsAttributionCookieValue(value: unknown) {
  if (typeof value !== "string" || !value || value.length > analyticsAttributionMaxSerializedLength) return null;
  try {
    return parseAnalyticsAttribution(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

function sanitizeAnalyticsMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const key of analyticsClientMetadataKeys) {
    const value = metadata[key];
    if (key === "referrer") {
      setIfDefined(sanitized, key, toSafeAnalyticsReferrerOrigin(value));
    } else if (key === "referrerHost") {
      setIfDefined(sanitized, key, toSafeAnalyticsHostname(value));
    } else if (key === "locale") {
      setIfDefined(sanitized, key, value === "zh" || value === "en" ? value : undefined);
    } else if (key === "trafficMedium") {
      const medium = toBoundedAnalyticsString(value, analyticsClientStringLimits.trafficMedium);
      setIfDefined(sanitized, key, medium && analyticsTrafficMediumSet.has(medium) ? medium : undefined);
    } else if (key === "attribution") {
      setIfDefined(sanitized, key, sanitizeAnalyticsAttribution(value));
    } else if (key === "offerCount") {
      setIfDefined(
        sanitized,
        key,
        typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
          ? value
          : undefined
      );
    } else if (analyticsPathKeys.has(key)) {
      setIfDefined(sanitized, key, normalizeAnalyticsPath(value, analyticsClientStringLimits[key as "firstLandingPath" | "landingPath"]));
    } else if (analyticsStringKeys.has(key)) {
      setIfDefined(sanitized, key, toBoundedAnalyticsString(value, analyticsClientStringLimits[key as keyof typeof analyticsClientStringLimits]));
    }
  }

  return Object.keys(sanitized).length ? sanitized : undefined;
}

function toBoundedAnalyticsString(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return normalized || undefined;
}

function toAnalyticsTimestamp(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function setIfDefined(record: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined) record[key] = value;
}

function compactRecord(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
