import type { EbosDeploymentStatus } from "../deployment-execution";
import { checkValidationPageContent } from "./post-launch-content-checker";
import type {
  EbosPostLaunchFetch,
  EbosPostLaunchLiveCheckOptions,
  EbosPostLaunchLiveCheckReport,
  EbosPostLaunchOverallStatus,
  EbosPostLaunchRouteResult,
  EbosPostLaunchStatusTransition
} from "./post-launch-types";

export const defaultPostLaunchRoutes = [
  "/validation/ai-prompt-kit",
  "/en/validation/ai-prompt-kit"
] as const;

export async function runPostLaunchLiveCheck(
  options: EbosPostLaunchLiveCheckOptions
): Promise<EbosPostLaunchLiveCheckReport> {
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const routes = options.routes ?? [...defaultPostLaunchRoutes];
  const routeResults = await Promise.all(
    routes.map((route) => checkPostLaunchRoute(`${siteUrl}${route}`, route, options.fetcher))
  );
  const overallStatus = calculatePostLaunchOverallStatus(routeResults);
  const blockers = routeResults.flatMap((result) => result.blockers);
  const warnings = routeResults.flatMap((result) => result.warnings);
  const canTransitionToVerified =
    options.currentDeploymentStatus === "deployed_pending_verification"
    && overallStatus === "passed"
    && blockers.length === 0;
  const statusTransition = buildPreviewTransition(
    options.currentDeploymentStatus,
    canTransitionToVerified,
    overallStatus,
    blockers,
    warnings
  );

  return {
    reportType: "post_launch_live_check",
    targetDate: options.targetDate,
    generatedAt: options.now ?? new Date().toISOString(),
    siteUrl,
    currentDeploymentStatus: options.currentDeploymentStatus,
    checkedRoutes: routes,
    routeResults,
    overallStatus,
    canTransitionToVerified,
    statusTransition,
    blockers,
    warnings,
    nextActions: buildNextActions(canTransitionToVerified, overallStatus, blockers)
  };
}

export async function checkPostLaunchRoute(
  url: string,
  route: string,
  fetcher: EbosPostLaunchFetch = defaultFetch
): Promise<EbosPostLaunchRouteResult> {
  try {
    const response = await fetcher(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "EBOS post-launch live check"
      }
    });
    const html = await response.text();
    const content = checkValidationPageContent(html, route);
    const httpBlocker = isPassingHttpStatus(response.status)
      ? []
      : [`${route}: HTTP status ${response.status} is not a 2xx success.`];
    const blockers = [...httpBlocker, ...content.blockers];
    const warnings = [...content.warnings];

    return {
      route,
      url,
      httpStatus: response.status,
      ok: blockers.length === 0,
      ...(response.url ? { finalUrl: response.url } : {}),
      ...content,
      blockers,
      warnings
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network error";
    return {
      route,
      url,
      httpStatus: 0,
      ok: false,
      contentChecks: [],
      metadataChecks: [],
      ctaChecks: [],
      faqChecks: [],
      complianceChecks: [],
      warnings: [],
      blockers: [`${route}: network request failed: ${message}`]
    };
  }
}

export function calculatePostLaunchOverallStatus(
  routeResults: EbosPostLaunchRouteResult[]
): EbosPostLaunchOverallStatus {
  if (routeResults.length === 0) return "failed";
  const failed = routeResults.some((result) => !result.ok || result.blockers.length > 0);
  if (failed) return "failed";
  const warnings = routeResults.some((result) => result.warnings.length > 0);
  return warnings ? "partial" : "passed";
}

function buildPreviewTransition(
  currentStatus: EbosDeploymentStatus,
  canTransitionToVerified: boolean,
  overallStatus: EbosPostLaunchOverallStatus,
  blockers: string[],
  warnings: string[]
): EbosPostLaunchStatusTransition {
  if (canTransitionToVerified) {
    return {
      previousStatus: currentStatus,
      nextStatus: "verified",
      updated: false,
      reason: "Live check passed; verify script may update status to verified.",
      warnings
    };
  }

  return {
    previousStatus: currentStatus,
    nextStatus: currentStatus,
    updated: false,
    reason: currentStatus !== "deployed_pending_verification"
      ? `Current deploymentStatus must be deployed_pending_verification before verified, got ${currentStatus}.`
      : `Live check overallStatus=${overallStatus}; blockers=${blockers.length}.`,
    warnings
  };
}

function buildNextActions(
  canTransitionToVerified: boolean,
  overallStatus: EbosPostLaunchOverallStatus,
  blockers: string[]
) {
  if (canTransitionToVerified) {
    return ["Run verify-ebos-production-deployment to back up status and mark deployment verified."];
  }
  if (overallStatus === "failed") {
    return blockers.length > 0
      ? ["Fix failed post-launch route checks before marking deployment verified."]
      : ["Re-run live check after investigating failed route checks."];
  }
  return ["Review warnings before deciding whether to retry live check."];
}

function isPassingHttpStatus(status: number) {
  return status >= 200 && status < 300;
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
