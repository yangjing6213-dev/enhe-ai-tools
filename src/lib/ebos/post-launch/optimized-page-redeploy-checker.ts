import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { EbosPostLaunchFetch } from "./post-launch-types";
import type {
  EbosOptimizedPageRedeployCheckReport,
  EbosOptimizedPageRedeployRouteResult,
  EbosOptimizedValidationPageRedeployReport,
  EbosOptimizedValidationPageRedeployStatusSummary
} from "./optimized-page-redeploy-types";

export const optimizedRedeployRoutes = [
  "/validation/ai-prompt-kit",
  "/en/validation/ai-prompt-kit"
] as const;

type OptimizedRedeployRoute = (typeof optimizedRedeployRoutes)[number];

const optimizedContentExpectations = {
  "/validation/ai-prompt-kit": [
    "先免费领取 5 个高频 Prompt 模板",
    "100+ Prompt 模板",
    "入门模板包",
    "19 元",
    "完整模板包",
    "49 元",
    "商业场景包",
    "99 元",
    "适合谁 / 不适合谁",
    "不保证收益",
    "不承诺平台流量",
    "订单"
  ],
  "/en/validation/ai-prompt-kit": [
    "Free sample prompts",
    "100+ prompt templates",
    "Pricing validation",
    "No income",
    "Human review",
    "Templates are productivity aids"
  ]
} as const satisfies Record<string, readonly string[]>;

export async function runOptimizedPageRedeployCheck(options: {
  targetDate: string;
  siteUrl: string;
  now?: string;
  fetcher?: EbosPostLaunchFetch;
}): Promise<EbosOptimizedPageRedeployCheckReport> {
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const routeResults = await Promise.all(
    optimizedRedeployRoutes.map((route) => checkOptimizedRedeployRoute(
      `${siteUrl}${route}`,
      route,
      options.fetcher
    ))
  );
  const blockers = routeResults.flatMap((result) => result.blockers);
  const warnings = routeResults.flatMap((result) => result.warnings);
  const failed = routeResults.some((result) => !result.ok || result.blockers.length > 0);
  const overallStatus = failed ? "failed" : warnings.length ? "partial" : "passed";

  return {
    reportType: "optimized_page_redeploy_check",
    targetDate: options.targetDate,
    generatedAt: options.now ?? new Date().toISOString(),
    siteUrl,
    checkedRoutes: [...optimizedRedeployRoutes],
    routeResults,
    overallStatus,
    blockers,
    warnings,
    summary: overallStatus === "passed"
      ? "Optimized AI Prompt Kit validation copy is visible on production routes."
      : "Optimized AI Prompt Kit validation copy is not fully visible on production routes."
  };
}

export async function checkOptimizedRedeployRoute(
  url: string,
  route: OptimizedRedeployRoute,
  fetcher: EbosPostLaunchFetch = defaultFetch
): Promise<EbosOptimizedPageRedeployRouteResult> {
  try {
    const response = await fetcher(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "EBOS optimized page redeploy check"
      }
    });
    const html = await response.text();
    const checks = buildContentChecks(route, html);
    const blockers = [
      ...(response.status >= 200 && response.status < 300
        ? []
        : [`${route}: HTTP status ${response.status} is not a 2xx success.`]),
      ...checks
        .filter((check) => check.status === "fail")
        .map((check) => `${route}: missing optimized copy signal: ${check.expected}`)
    ];

    return {
      route,
      url,
      httpStatus: response.status,
      ok: blockers.length === 0,
      ...(response.url ? { finalUrl: response.url } : {}),
      contentChecks: checks,
      blockers,
      warnings: []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network error";
    return {
      route,
      url,
      httpStatus: 0,
      ok: false,
      contentChecks: [],
      blockers: [`${route}: network request failed: ${message}`],
      warnings: []
    };
  }
}

export function renderOptimizedPageRedeployCheckMarkdown(report: EbosOptimizedPageRedeployCheckReport) {
  return [
    "# ENHE Optimized Validation Page Redeploy Check",
    "",
    `- targetDate: ${report.targetDate}`,
    `- generatedAt: ${report.generatedAt}`,
    `- siteUrl: ${report.siteUrl}`,
    `- overallStatus: ${report.overallStatus}`,
    `- summary: ${report.summary}`,
    "",
    "## Routes",
    ...report.routeResults.flatMap((result) => [
      `### ${result.route}`,
      `- url: ${result.url}`,
      `- httpStatus: ${result.httpStatus}`,
      `- ok: ${result.ok}`,
      `- finalUrl: ${result.finalUrl ?? result.url}`,
      "",
      "Checks:",
      ...result.contentChecks.map((check) => [
        `- [${check.status}] ${check.title}`,
        `  - expected: ${check.expected}`,
        `  - actual: ${check.actual}`,
        `  - evidence: ${check.evidence || "none"}`
      ].join("\n"))
    ]),
    "",
    "## Blockers",
    list(report.blockers),
    "",
    "## Warnings",
    list(report.warnings)
  ].join("\n");
}

export function renderOptimizedValidationPageRedeployMarkdown(report: EbosOptimizedValidationPageRedeployReport) {
  return [
    "# ENHE Optimized Validation Page Redeploy Report",
    "",
    `- targetDate: ${report.targetDate}`,
    `- generatedAt: ${report.generatedAt}`,
    `- gitCommitHash: ${report.gitCommitHash ?? "none"}`,
    `- gitPushResult: ${report.gitPushResult}`,
    `- serverPath: ${report.serverPath}`,
    `- gitPullResult: ${report.gitPullResult}`,
    `- dockerBuildResult: ${report.dockerBuildResult}`,
    `- dockerUpResult: ${report.dockerUpResult}`,
    `- nginxReloadResult: ${report.nginxReloadResult}`,
    `- deploymentStatus: ${report.deploymentStatus}`,
    `- postLaunchCheckStatus: ${report.postLaunchCheckStatus}`,
    `- optimizedContentCheckStatus: ${report.optimizedContentCheckStatus}`,
    `- externalPublishingStatus: ${report.externalPublishingStatus}`,
    `- hasRealSignals: ${report.hasRealSignals}`,
    `- canBackfill: ${report.canBackfill}`,
    "",
    "## Checked Routes",
    list(report.checkedRoutes),
    "",
    "## Report Paths",
    report.optimizedRedeployCheckPath ? `- optimizedRedeployCheckPath: ${report.optimizedRedeployCheckPath}` : "- optimizedRedeployCheckPath: none",
    report.postLaunchLiveCheckPath ? `- postLaunchLiveCheckPath: ${report.postLaunchLiveCheckPath}` : "- postLaunchLiveCheckPath: none",
    "",
    "## Warnings",
    list(report.warnings),
    "",
    "## Next Actions",
    list(report.nextActions)
  ].join("\n");
}

export async function readOptimizedValidationPageRedeployStatusForDate(options: {
  targetDate: string;
  reportsRoot?: string;
}): Promise<EbosOptimizedValidationPageRedeployStatusSummary> {
  const root = options.reportsRoot ?? join("reports", "ebos");
  const postLaunchDir = join(root, "deployment", "post-launch");
  const reportPath = join(postLaunchDir, `${options.targetDate}-optimized-validation-page-redeploy.json`);
  const checkPath = join(postLaunchDir, `${options.targetDate}-optimized-page-redeploy-check.json`);
  const report = await readJsonIfExists<EbosOptimizedValidationPageRedeployReport>(reportPath);

  if (!report) {
    return {
      status: "not_generated",
      targetDate: options.targetDate,
      redeployed: false,
      warnings: [],
      summary: "No optimized validation page redeploy report exists for this date."
    };
  }

  const redeployed = report.gitPushResult === "success"
    && report.gitPullResult === "success"
    && report.dockerBuildResult === "success"
    && report.dockerUpResult === "success"
    && (report.nginxReloadResult === "success" || report.nginxReloadResult === "not_required")
    && report.optimizedContentCheckStatus === "passed";

  return {
    status: "generated",
    targetDate: options.targetDate,
    redeployed,
    reportPath,
    ...(await exists(checkPath) ? { checkPath } : {}),
    gitCommitHash: report.gitCommitHash,
    gitPushResult: report.gitPushResult,
    gitPullResult: report.gitPullResult,
    dockerBuildResult: report.dockerBuildResult,
    dockerUpResult: report.dockerUpResult,
    nginxReloadResult: report.nginxReloadResult,
    optimizedContentCheckStatus: report.optimizedContentCheckStatus,
    postLaunchCheckStatus: report.postLaunchCheckStatus,
    deploymentStatus: report.deploymentStatus,
    externalPublishingStatus: report.externalPublishingStatus,
    hasRealSignals: report.hasRealSignals,
    canBackfill: report.canBackfill,
    warnings: report.warnings,
    summary: redeployed
      ? "Optimized validation page redeploy is complete and production contains Step 20S optimized copy."
      : "Optimized validation page redeploy report exists but success criteria are not fully met."
  };
}

function buildContentChecks(route: OptimizedRedeployRoute, html: string) {
  const expectations = optimizedContentExpectations[route];
  return expectations.map((expected) => {
    const found = html.includes(expected);
    return {
      id: signalId(route, expected),
      title: expected,
      status: found ? "pass" as const : "fail" as const,
      expected,
      actual: found ? "Found in production HTML." : "Missing from production HTML.",
      evidence: found ? expected : ""
    };
  });
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function signalId(route: string, expected: string) {
  return `${route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-${expected
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")}`;
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

async function defaultFetch(url: string, init: Parameters<EbosPostLaunchFetch>[1]) {
  if (!globalThis.fetch) {
    throw new Error("global fetch is not available.");
  }
  return globalThis.fetch(url, init);
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
