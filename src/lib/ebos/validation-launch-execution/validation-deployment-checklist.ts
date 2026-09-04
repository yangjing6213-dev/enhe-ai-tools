import type { EbosValidationLaunchReadinessReport } from "../validation-launch";
import type { EbosValidationDeploymentChecklistItem } from "./validation-launch-execution-types";

const VALIDATION_ROUTES = [
  "/validation/ai-prompt-kit",
  "/en/validation/ai-prompt-kit"
] as const;

const TRACKING_EVENTS = [
  "validation_ai_prompt_kit_cta_click",
  "validation_faceswap_cta_click",
  "validation_ai_video_cta_click"
] as const;

export function buildValidationDeploymentChecklist(options: {
  targetDate: string | Date;
  readinessReport?: EbosValidationLaunchReadinessReport;
}): EbosValidationDeploymentChecklistItem[] {
  return [
    ...buildBuildAndQualityChecks(),
    ...buildRouteChecks(options.readinessReport),
    ...buildSeoTrackingChecks(options.readinessReport),
    ...buildValidationDataChecks(options),
    buildDeploymentConfirmationCheck(),
    ...buildRollbackChecklist()
  ];
}

export function buildBuildAndQualityChecks(): EbosValidationDeploymentChecklistItem[] {
  return [
    item("build-lint", "Run lint before launch", "build", "manual_required", "npm run lint must exit 0 before launch execution.", "npm run lint"),
    item("build-typecheck", "Run typecheck before launch", "build", "manual_required", "npm run typecheck must exit 0 before launch execution.", "npm run typecheck"),
    item("build-production", "Run production build before launch", "build", "manual_required", "npm run build must exit 0 before launch execution.", "npm run build")
  ];
}

export function buildRouteChecks(
  readinessReport?: EbosValidationLaunchReadinessReport
): EbosValidationDeploymentChecklistItem[] {
  return VALIDATION_ROUTES.map((route) => {
    const page = readinessReport?.validationPages.find((item) => item.path === route);
    const passed = page ? page.exists && page.hasHero && page.hasSummary && page.hasCTA && page.hasFAQ && page.hasComplianceNotice && page.hasSeoMetadata : false;

    return item(
      `route-${route.replaceAll("/", "-").replace(/^-/, "")}`,
      `Validate route ${route}`,
      "route",
      page ? statusFromBoolean(passed) : "manual_required",
      `${route} must exist and include Hero, summary, CTA, FAQ, compliance notice, and metadata.`,
      undefined,
      page?.warnings.join("; ") || "Confirm route renders before public launch."
    );
  });
}

export function buildSeoTrackingChecks(
  readinessReport?: EbosValidationLaunchReadinessReport
): EbosValidationDeploymentChecklistItem[] {
  const seoChecks: EbosValidationDeploymentChecklistItem[] = [
    item("seo-metadata", "Confirm metadata", "seo", readinessReport ? statusFromBoolean(readinessReport.seoGeoChecks.some((check) => check.key === "metadata" && check.passed)) : "manual_required", "metadata must be present on validation pages."),
    item("seo-title", "Confirm title", "seo", "manual_required", "title must match the AI Prompt Kit validation offer."),
    item("seo-description", "Confirm description", "seo", "manual_required", "description must explain the validation offer without fabricated outcomes."),
    item("geo-faq", "Confirm FAQ", "seo", readinessReport ? statusFromBoolean(readinessReport.validationPages.every((page) => page.hasFAQ)) : "manual_required", "FAQ must be present for SEO/GEO answerability."),
    item("geo-summary", "Confirm summary", "seo", readinessReport ? statusFromBoolean(readinessReport.validationPages.every((page) => page.hasSummary)) : "manual_required", "summary must be present for AI answer engines.")
  ];

  const trackingChecks = TRACKING_EVENTS.map((eventName) => {
    const check = readinessReport?.trackingChecks.find((item) => item.eventName === eventName);
    return item(
      `tracking-${eventName}`,
      `Confirm tracking event ${eventName}`,
      "tracking",
      check ? statusFromBoolean(check.found) : "manual_required",
      `${eventName} must be present in the tracking plan and analytics whitelist.`,
      undefined,
      check?.warnings.join("; ") || "Do not record fabricated clicks."
    );
  });

  return [...seoChecks, ...trackingChecks];
}

export function buildValidationDataChecks(options: {
  targetDate: string | Date;
  readinessReport?: EbosValidationLaunchReadinessReport;
}): EbosValidationDeploymentChecklistItem[] {
  const targetDate = toDateKey(options.targetDate);
  const readinessStatus = options.readinessReport?.readinessStatus ?? "not_available";
  const externalInput = options.readinessReport?.externalIntakeChecks.find((check) => check.key === "external_intake_input");
  const externalStatus = externalInput?.readyForUse ? "pass" : externalInput?.exists ? "warning" : "manual_required";

  return [
    item(
      "validation-input-json",
      "Confirm validation-input.json exists",
      "validation_input",
      "manual_required",
      `reports/ebos/validation/inputs/${targetDate}-validation-input.json must exist before launch data capture.`
    ),
    item(
      "external-intake-input-json",
      "Confirm external-intake-input.json exists",
      "external_intake",
      externalStatus,
      `reports/ebos/validation/intake/inputs/${targetDate}-external-intake-input.json should exist; keep real channel data empty until observed.`
    ),
    item(
      "capture-report-json",
      "Confirm capture report exists",
      "validation_input",
      "manual_required",
      `reports/ebos/validation/capture/${targetDate}-validation-capture-report.json should be available for manual slots.`
    ),
    item(
      "launch-readiness-status",
      "Confirm launch readiness status",
      "deployment",
      readinessStatus === "ready" || readinessStatus === "ready_with_warnings" ? "pass" : "warning",
      `Launch readiness status is ${readinessStatus}; ready_with_warnings is acceptable only when warnings are understood.`
    )
  ];
}

export function buildRollbackChecklist(): EbosValidationDeploymentChecklistItem[] {
  return [
    item("rollback-validation-route", "Rollback validation route if launch fails", "rollback", "manual_required", "If route deployment fails, rollback the validation route change only; do not clean the whole worktree."),
    item("rollback-tracking-event-whitelist", "Rollback tracking event whitelist only if needed", "rollback", "manual_required", "If tracking breaks build/runtime, rollback the tracking event whitelist entry with a scoped change."),
    item("rollback-keep-ebos-reports", "Keep reports during rollback", "rollback", "manual_required", "Keep reports/ebos artifacts for audit; do not delete evidence while rolling back site code.")
  ];
}

function buildDeploymentConfirmationCheck(): EbosValidationDeploymentChecklistItem {
  return item(
    "deployment-confirmation",
    "Confirm deployment is user-approved before claiming deployed status",
    "deployment",
    "manual_required",
    "Do not set deployed_pending_verification until deployment is explicitly confirmed.",
    undefined,
    "Codex can prepare checks and reports; user must confirm actual deployment."
  );
}

function item(
  id: string,
  title: string,
  category: EbosValidationDeploymentChecklistItem["category"],
  status: EbosValidationDeploymentChecklistItem["status"],
  evidence: string,
  command?: string,
  nextAction?: string
): EbosValidationDeploymentChecklistItem {
  return {
    id,
    title,
    category,
    status,
    evidence,
    ...(command ? { command } : {}),
    ...(nextAction ? { nextAction } : {})
  };
}

function statusFromBoolean(value: boolean): EbosValidationDeploymentChecklistItem["status"] {
  return value ? "pass" : "fail";
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
