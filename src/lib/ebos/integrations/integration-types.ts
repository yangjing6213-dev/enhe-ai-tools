export type EbosIntegrationKey =
  | "internal_database"
  | "google_search_console"
  | "google_analytics"
  | "bing_webmaster"
  | "cloudflare"
  | "whop"
  | "market_research"
  | "ai_search_probe"
  | "manual_input";

export type EbosIntegrationStatus =
  | "available"
  | "configured"
  | "missing_config"
  | "not_configured"
  | "unavailable"
  | "unknown";

export type EbosEnvPresence = {
  key: string;
  maskedKey: string;
  configured: boolean;
};

export type EbosIntegrationActionItem = {
  title: string;
  verification: string;
};

export type EbosIntegrationCheckResult = {
  key: EbosIntegrationKey;
  label: string;
  status: EbosIntegrationStatus;
  requiredEnvKeys: string[];
  configuredEnvKeys: string[];
  missingEnvKeys: string[];
  env: EbosEnvPresence[];
  actionItems: EbosIntegrationActionItem[];
  checkedAt: Date;
};

export type EbosIntegrationReadinessReport = {
  generatedAt: Date;
  checks: EbosIntegrationCheckResult[];
  summary: {
    available: number;
    configured: number;
    missing_config: number;
    not_configured: number;
    unavailable: number;
    unknown: number;
  };
  recommendations: EbosIntegrationActionItem[];
};
