import { getScoreGrade, normalizeScore } from "../score";
import type {
  EbosCommandHealthResult,
  EbosWebsiteHealthCheckKey,
  EbosWebsiteHealthScore,
  EbosWebsiteHealthSnapshot
} from "./health-types";

const SCORE_WEIGHTS: Partial<Record<EbosWebsiteHealthCheckKey, number>> = {
  lint: 15,
  typecheck: 20,
  build: 25,
  ebos_tests: 15,
  unit_tests: 10,
  playwright_smoke: 10,
  lighthouse: 5,
  sitemap: 3,
  robots: 3,
  homepage: 5,
  key_product_pages: 5
};

const SCORE_KEYS = Object.keys(SCORE_WEIGHTS) as EbosWebsiteHealthCheckKey[];
const CORE_SCORE_KEYS: EbosWebsiteHealthCheckKey[] = [
  "lint",
  "typecheck",
  "build",
  "ebos_tests",
  "unit_tests",
  "playwright_smoke",
  "lighthouse"
];

export function calculateWebsiteHealthScore(snapshot: EbosWebsiteHealthSnapshot): EbosWebsiteHealthScore {
  const commandsByKey = groupCommandsByKey(snapshot.commands);
  const scoreBeforeCaps = SCORE_KEYS.reduce((total, key) => {
    return total + getScoreContribution(commandsByKey, key);
  }, 0);

  const cappedScore = applyFailureCaps(scoreBeforeCaps, commandsByKey);
  const score = normalizeScore(cappedScore) ?? 0;
  const failed = snapshot.commands.filter((command) => command.status === "failed");
  const skipped = snapshot.commands.filter((command) => command.status === "skipped");
  const unknown = snapshot.commands.filter((command) => command.status === "unknown");
  const missing = CORE_SCORE_KEYS.filter((key) => !commandsByKey.has(key));

  const risks = [
    ...failed.map((command) => buildFailedRisk(command)),
    ...buildProductPageSourceWarnings(commandsByKey.get("key_product_pages") ?? [])
  ];

  if (missing.length > 0) {
    risks.push({
      message: `Missing health checks: ${missing.join(", ")}`,
      severity: "warning"
    });
  }

  const recommendations = [
    ...failed.map((command) => buildFailedRecommendation(command)),
    ...skipped.map((command) => ({
      message: `skipped check ${command.key}; wire it into the health snapshot when the command is ready.`,
      priority: "medium" as const
    })),
    ...unknown.map((command) => ({
      message: `Unknown check ${command.key}; capture an exit code or explicit skip reason.`,
      priority: "medium" as const
    })),
    ...missing.map((key) => ({
      message: `Add ${key} to the health snapshot to improve confidence.`,
      priority: "low" as const
    }))
  ];

  return {
    score,
    grade: getScoreGrade(score),
    confidence: calculateHealthConfidence(snapshot.commands, failed.length, skipped.length, unknown.length, missing.length),
    findings: [
      {
        message: `EBOS website health snapshot: ${snapshot.commands.length - failed.length} of ${snapshot.commands.length} recorded checks are not failed.`
      }
    ],
    risks: risks.length ? risks : [{ message: "No failed health checks recorded.", severity: "info" }],
    recommendations: recommendations.length ? recommendations : [{ message: "Keep recording lint, typecheck, build, EBOS tests, smoke checks, and Lighthouse.", priority: "low" }]
  };
}

function getScoreContribution(
  commandsByKey: Map<EbosWebsiteHealthCheckKey, EbosCommandHealthResult[]>,
  key: EbosWebsiteHealthCheckKey
) {
  const weight = SCORE_WEIGHTS[key] ?? 0;
  if (key === "key_product_pages") {
    return getKeyProductPageScore(commandsByKey.get(key) ?? [], weight);
  }
  return isCheckPassed(commandsByKey, key) ? weight : 0;
}

function getKeyProductPageScore(
  commands: EbosCommandHealthResult[],
  weight: number
) {
  if (!commands.length) return 0;

  const detailPageChecks = commands.filter((command) => command.isProductDetailPage !== false);
  if (detailPageChecks.length > 0) {
    return detailPageChecks.every((command) => command.status === "passed") ? weight : 0;
  }

  const listingFallbackPassed = commands.some((command) =>
    command.status === "passed" &&
    command.source === "manual_fallback" &&
    command.isProductDetailPage === false
  );

  return listingFallbackPassed ? Math.max(1, Math.round(weight * 0.4)) : 0;
}

function applyFailureCaps(
  score: number,
  commandsByKey: Map<EbosWebsiteHealthCheckKey, EbosCommandHealthResult[]>
) {
  let capped = score;
  if (hasFailedCheck(commandsByKey, "build")) capped = Math.min(capped, 60);
  if (hasFailedCheck(commandsByKey, "typecheck")) capped = Math.min(capped, 70);
  if (hasFailedCheck(commandsByKey, "lint")) capped = Math.min(capped, 80);
  if (hasFailedCheck(commandsByKey, "homepage")) capped = Math.min(capped, 70);
  return capped;
}

function groupCommandsByKey(commands: EbosCommandHealthResult[]) {
  const grouped = new Map<EbosWebsiteHealthCheckKey, EbosCommandHealthResult[]>();
  for (const command of commands) {
    grouped.set(command.key, [...(grouped.get(command.key) ?? []), command]);
  }
  return grouped;
}

function isCheckPassed(
  commandsByKey: Map<EbosWebsiteHealthCheckKey, EbosCommandHealthResult[]>,
  key: EbosWebsiteHealthCheckKey
) {
  const commands = commandsByKey.get(key);
  if (!commands?.length) return false;
  if (key === "key_product_pages") {
    return commands.every((command) => command.status === "passed");
  }
  return commands.some((command) => command.status === "passed");
}

function hasFailedCheck(
  commandsByKey: Map<EbosWebsiteHealthCheckKey, EbosCommandHealthResult[]>,
  key: EbosWebsiteHealthCheckKey
) {
  return commandsByKey.get(key)?.some((command) => command.status === "failed") ?? false;
}

function buildFailedRisk(command: EbosCommandHealthResult) {
  if (command.key === "build") {
    return {
      message: `${command.key} failed: ${command.summary}`,
      severity: "critical" as const
    };
  }

  if (command.key === "sitemap" || command.key === "robots") {
    return {
      message: `SEO risk: ${command.key} failed: ${command.summary}`,
      severity: "warning" as const
    };
  }

  if (command.key === "key_product_pages") {
    if (command.source === "internal_database" && command.environmentMismatchRisk) {
      return {
        message: `Data source risk: URL source may not match checked environment: ${command.summary}`,
        severity: "warning" as const
      };
    }

    if (command.source === "sitemap") {
      return {
        message: `Revenue path risk: sitemap-sourced key_product_pages failed: ${command.summary}`,
        severity: "critical" as const
      };
    }

    if (command.isProductDetailPage === false) {
      return {
        message: `Product URL fallback risk: software listing fallback failed: ${command.summary}`,
        severity: "warning" as const
      };
    }

    return {
      message: `Revenue path risk: key_product_pages failed: ${command.summary}`,
      severity: "critical" as const
    };
  }

  if (command.key === "homepage") {
    return {
      message: `Homepage accessibility risk: homepage failed: ${command.summary}`,
      severity: "critical" as const
    };
  }

  return {
    message: `${command.key} failed: ${command.summary}`,
    severity: "warning" as const
  };
}

function buildProductPageSourceWarnings(commands: EbosCommandHealthResult[]) {
  if (!commands.length) return [];
  const hasProductDetailCheck = commands.some((command) => command.isProductDetailPage !== false);
  const listingFallbackPassed = commands.some((command) =>
    command.status === "passed" &&
    command.source === "manual_fallback" &&
    command.isProductDetailPage === false
  );

  if (!hasProductDetailCheck && listingFallbackPassed) {
    return [{
      message: "Product detail page accessibility was not confirmed; only the software listing fallback passed.",
      severity: "warning" as const
    }];
  }

  return [];
}

function buildFailedRecommendation(command: EbosCommandHealthResult) {
  if (command.key === "key_product_pages" && command.source === "internal_database" && command.environmentMismatchRisk) {
    return {
      message: "Align EBOS checked site URL and database source before treating product page 404 as a live revenue path failure.",
      priority: "medium" as const
    };
  }

  return {
    message: `Fix failed check ${command.key} before treating EBOS health as reliable.`,
    priority: command.key === "build" || command.key === "typecheck" || command.key === "homepage" || command.key === "key_product_pages" ? "high" as const : "medium" as const
  };
}

function calculateHealthConfidence(
  commands: EbosCommandHealthResult[],
  failed: number,
  skipped: number,
  unknown: number,
  missing: number
) {
  if (commands.length === 0) return "unknown";
  if (failed === commands.length) return "unavailable";
  if (failed || skipped || unknown || missing) return "partial";
  return "complete";
}
