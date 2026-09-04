import { checkEnvPresence, type EbosEnvMap } from "./env-detection";
import type {
  EbosIntegrationCheckResult,
  EbosIntegrationKey,
  EbosIntegrationReadinessReport,
  EbosIntegrationStatus
} from "./integration-types";

const INTEGRATION_LABELS: Record<EbosIntegrationKey, string> = {
  internal_database: "Internal Database",
  google_search_console: "Google Search Console",
  google_analytics: "Google Analytics",
  bing_webmaster: "Bing Webmaster",
  cloudflare: "Cloudflare",
  whop: "Whop",
  market_research: "Market Research",
  ai_search_probe: "AI Search Probe",
  manual_input: "Manual Input"
};

export const EBOS_INTEGRATION_ENV_KEYS: Record<EbosIntegrationKey, string[]> = {
  internal_database: ["DATABASE_URL"],
  google_search_console: [
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "GOOGLE_SEARCH_CONSOLE_SITE_URL"
  ],
  google_analytics: [
    "GA_PROPERTY_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
  ],
  bing_webmaster: ["BING_WEBMASTER_API_KEY", "BING_SITE_URL"],
  cloudflare: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"],
  whop: ["WHOP_API_KEY", "WHOP_COMPANY_ID"],
  market_research: [
    "EBOS_MARKET_RSS_SOURCES",
    "EBOS_REDDIT_SOURCES",
    "EBOS_GITHUB_TRENDING_ENABLED"
  ],
  ai_search_probe: [
    "EBOS_AI_SEARCH_PROBE_ENABLED",
    "EBOS_AI_SEARCH_PROVIDERS"
  ],
  manual_input: []
};

const INTEGRATION_ORDER: EbosIntegrationKey[] = [
  "internal_database",
  "google_search_console",
  "google_analytics",
  "bing_webmaster",
  "cloudflare",
  "whop",
  "market_research",
  "ai_search_probe",
  "manual_input"
];

export type CheckEbosIntegrationReadinessOptions = {
  internalDatabaseAvailable?: boolean;
};

export function checkEbosIntegrationReadiness(
  env: EbosEnvMap = process.env,
  options: CheckEbosIntegrationReadinessOptions = {}
): EbosIntegrationReadinessReport {
  const checks = INTEGRATION_ORDER.map((key) => buildIntegrationCheck(key, env, options));
  const recommendations = checks.flatMap((check) => check.actionItems);

  return {
    generatedAt: new Date(),
    checks,
    summary: summarizeIntegrationChecks(checks),
    recommendations
  };
}

export function renderIntegrationReadinessMarkdown(report: EbosIntegrationReadinessReport) {
  return [
    "# ENHE EBOS Data Source Readiness",
    "",
    `Generated At: ${report.generatedAt.toISOString()}`,
    "",
    "## 1. Summary",
    `- Available: ${report.summary.available}`,
    `- Configured: ${report.summary.configured}`,
    `- Missing Config: ${report.summary.missing_config}`,
    `- Not Configured: ${report.summary.not_configured}`,
    `- Unavailable: ${report.summary.unavailable}`,
    `- Unknown: ${report.summary.unknown}`,
    "",
    "## 2. Data Source Status",
    ...report.checks.map((check) => {
      const missing = check.missingEnvKeys.length ? ` Missing: ${check.missingEnvKeys.join(", ")}` : "";
      return `- [${check.status}] ${check.label}.${missing}`;
    }),
    "",
    "## 3. Next Setup Recommendations",
    report.recommendations.length
      ? report.recommendations.map((item) => `- ${item.title} Verification: ${item.verification}`).join("\n")
      : "- No missing configuration detected.",
    ""
  ].join("\n");
}

function buildIntegrationCheck(
  key: EbosIntegrationKey,
  env: EbosEnvMap,
  options: CheckEbosIntegrationReadinessOptions
): EbosIntegrationCheckResult {
  if (key === "manual_input") {
    return createCheck(key, "configured", []);
  }

  const requiredEnvKeys = EBOS_INTEGRATION_ENV_KEYS[key];
  const envPresence = checkEnvPresence(requiredEnvKeys, env);
  const configuredEnvKeys = envPresence.filter((item) => item.configured).map((item) => item.key);
  const missingEnvKeys = envPresence.filter((item) => !item.configured).map((item) => item.key);
  let status: EbosIntegrationStatus = missingEnvKeys.length ? "missing_config" : "configured";

  if (key === "internal_database" && options.internalDatabaseAvailable && status === "configured") {
    status = "available";
  }

  return createCheck(key, status, requiredEnvKeys, configuredEnvKeys, missingEnvKeys, envPresence);
}

function createCheck(
  key: EbosIntegrationKey,
  status: EbosIntegrationStatus,
  requiredEnvKeys: string[],
  configuredEnvKeys: string[] = [],
  missingEnvKeys: string[] = [],
  env = checkEnvPresence(requiredEnvKeys, {})
): EbosIntegrationCheckResult {
  return {
    key,
    label: INTEGRATION_LABELS[key],
    status,
    requiredEnvKeys,
    configuredEnvKeys,
    missingEnvKeys,
    env,
    actionItems: missingEnvKeys.length
      ? [{
          title: `Configure ${INTEGRATION_LABELS[key]} required env keys: ${missingEnvKeys.join(", ")}`,
          verification: `${INTEGRATION_LABELS[key]} status becomes configured or available in EBOS data source readiness.`
        }]
      : [],
    checkedAt: new Date()
  };
}

function summarizeIntegrationChecks(checks: EbosIntegrationCheckResult[]) {
  return {
    available: countStatus(checks, "available"),
    configured: countStatus(checks, "configured"),
    missing_config: countStatus(checks, "missing_config"),
    not_configured: countStatus(checks, "not_configured"),
    unavailable: countStatus(checks, "unavailable"),
    unknown: countStatus(checks, "unknown")
  };
}

function countStatus(checks: EbosIntegrationCheckResult[], status: EbosIntegrationStatus) {
  return checks.filter((check) => check.status === status).length;
}
