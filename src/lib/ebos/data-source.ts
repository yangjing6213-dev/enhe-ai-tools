import type {
  EbosDataSourceKey,
  EbosDataSourceState,
  EbosDataSourceStatus,
  EbosWarning
} from "./types";

export const EBOS_DATA_SOURCE_KEYS = [
  "google_search_console",
  "google_analytics",
  "bing_webmaster",
  "cloudflare",
  "internal_database",
  "whop",
  "manual_input",
  "market_research",
  "ai_search_probe"
] as const satisfies readonly EbosDataSourceKey[];

export const EBOS_DATA_SOURCE_STATUSES = [
  "not_configured",
  "unavailable",
  "partial",
  "available"
] as const satisfies readonly EbosDataSourceStatus[];

export const EBOS_DATA_SOURCE_LABELS: Record<EbosDataSourceKey, string> = {
  google_search_console: "Google Search Console",
  google_analytics: "Google Analytics",
  bing_webmaster: "Bing Webmaster Tools",
  cloudflare: "Cloudflare",
  internal_database: "Internal Database",
  whop: "Whop",
  manual_input: "Manual Input",
  market_research: "Market Research",
  ai_search_probe: "AI Search Probe"
};

export function createDataSourceState(
  key: EbosDataSourceKey,
  status: EbosDataSourceStatus = "not_configured",
  options: {
    lastCheckedAt?: Date;
    warnings?: EbosWarning[];
    metadata?: Record<string, unknown>;
  } = {}
): EbosDataSourceState {
  return {
    key,
    status,
    label: EBOS_DATA_SOURCE_LABELS[key],
    lastCheckedAt: options.lastCheckedAt,
    warnings: options.warnings ?? [],
    metadata: options.metadata
  };
}

export function isConfiguredDataSource(source: EbosDataSourceState) {
  return source.status !== "not_configured";
}

export function isUsableDataSource(source: EbosDataSourceState) {
  return source.status === "available" || source.status === "partial";
}

export function getDataSourceCompletenessScore(status: EbosDataSourceStatus) {
  if (status === "available") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

