import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { buildValidationLaunchRunbook, type EbosValidationLaunchReadinessReport, type EbosValidationLaunchRunbook } from "../validation-launch";
import { buildValidationDeploymentChecklist } from "./validation-deployment-checklist";
import { buildExternalPublishPack } from "./validation-external-publish-pack";
import { buildValidationSmokeTestPlan } from "./validation-smoke-test-plan";
import type {
  EbosValidationLaunchExecutionReport,
  EbosValidationLaunchExecutionStep,
  EbosValidationLaunchStatus,
  EbosValidationPostLaunchCheckItem,
  EbosValidationPostLaunchCheckReport,
  EbosValidationSmokeCheckType
} from "./validation-launch-execution-types";

const DEFAULT_SITE_URL = "https://www.enhe-tech.com.cn";
const VALIDATION_PATHS = [
  "/validation/ai-prompt-kit",
  "/en/validation/ai-prompt-kit"
] as const;

export async function buildValidationLaunchExecutionReport(options: {
  targetDate: string | Date;
  readinessReport?: EbosValidationLaunchReadinessReport;
  readinessReportPath?: string;
  runbook?: EbosValidationLaunchRunbook;
  runbookPath?: string;
  siteUrl?: string;
  assetsDir?: string;
  deployedConfirmation?: boolean;
}): Promise<EbosValidationLaunchExecutionReport> {
  const targetDate = toDateKey(options.targetDate);
  const readinessReport = options.readinessReport;
  const runbook = options.runbook ?? buildValidationLaunchRunbook({
    targetDate,
    readinessReport,
    readinessReportPath: options.readinessReportPath
  });
  const deploymentChecklist = buildValidationDeploymentChecklist({
    targetDate,
    readinessReport
  });
  const smokeTestPlan = buildValidationSmokeTestPlan({
    targetDate,
    siteUrl: options.siteUrl ?? DEFAULT_SITE_URL
  });
  const externalPublishPack = await buildExternalPublishPack({
    targetDate,
    assetsDir: options.assetsDir
  });
  const blockers = readinessReport?.blockers ?? [];
  const warnings = [
    "Codex can prepare launch execution, but cannot log in to external platforms.",
    "Do not fabricate external platform data.",
    ...(readinessReport?.warnings ?? []),
    ...deploymentChecklist
      .filter((item) => item.status === "warning")
      .map((item) => `${item.title}: ${item.evidence}`)
  ];
  const launchStatus = getLaunchStatus({
    readinessStatus: readinessReport?.readinessStatus,
    blockers,
    deployedConfirmation: options.deployedConfirmation
  });

  return {
    reportType: "validation_launch_execution",
    targetDate,
    generatedAt: new Date().toISOString(),
    ...(options.readinessReportPath ? { readinessReportPath: options.readinessReportPath } : {}),
    ...(options.runbookPath ? { runbookPath: options.runbookPath } : {}),
    launchStatus,
    deploymentChecklist,
    smokeTestPlan,
    externalPublishPack,
    dataIntakeWorkflow: buildDataIntakeWorkflow(targetDate),
    codexExecutableSteps: buildCodexExecutableSteps(targetDate, runbook),
    userMinimumActions: runbook.userMinimumActions.length ? runbook.userMinimumActions : buildDefaultUserMinimumActions(),
    warnings,
    blockers,
    nextCommands: buildNextCommands(targetDate, launchStatus)
  };
}

export function buildValidationPostLaunchCheckReport(options: {
  targetDate: string | Date;
  siteUrl?: string;
  dryRun: boolean;
  checks?: EbosValidationPostLaunchCheckItem[];
  warnings?: string[];
}): EbosValidationPostLaunchCheckReport {
  const targetDate = toDateKey(options.targetDate);
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const checks = options.checks ?? buildPendingPostLaunchChecks(siteUrl, options.dryRun);
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.url} ${check.checkType} failed${check.actualStatus ? ` with ${check.actualStatus}` : ""}`);
  const warnings = [
    ...(options.warnings ?? []),
    ...checks
      .filter((check) => check.status === "warning" && check.warning)
      .map((check) => check.warning as string)
  ];
  const status = options.dryRun
    ? "dry_run"
    : blockers.length > 0
      ? "failed"
      : warnings.length > 0
        ? "warning"
        : "passed";

  return {
    reportType: "validation_post_launch_check",
    targetDate,
    generatedAt: new Date().toISOString(),
    siteUrl,
    dryRun: options.dryRun,
    checks,
    status,
    warnings,
    blockers,
    nextActions: buildPostLaunchNextActions(status, blockers)
  };
}

export async function readLatestValidationLaunchExecutionReport(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
} = {}): Promise<{ filePath: string; report: EbosValidationLaunchExecutionReport } | null> {
  return readLatestReport({
    targetDate: options.targetDate,
    reportsRoot: options.reportsRoot,
    suffix: "validation-launch-execution",
    reportType: "validation_launch_execution"
  });
}

export async function readLatestValidationPostLaunchCheckReport(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
} = {}): Promise<{ filePath: string; report: EbosValidationPostLaunchCheckReport } | null> {
  return readLatestReport({
    targetDate: options.targetDate,
    reportsRoot: options.reportsRoot,
    suffix: "post-launch-check",
    reportType: "validation_post_launch_check"
  });
}

function getLaunchStatus(options: {
  readinessStatus?: EbosValidationLaunchReadinessReport["readinessStatus"];
  blockers: string[];
  deployedConfirmation?: boolean;
}): EbosValidationLaunchStatus {
  if (options.blockers.length > 0 || options.readinessStatus === "blocked") return "blocked";
  if (options.deployedConfirmation) return "deployed_pending_verification";
  if (options.readinessStatus === "ready" || options.readinessStatus === "ready_with_warnings") return "ready_to_deploy";
  return "prepared";
}

function buildDataIntakeWorkflow(targetDate: string): EbosValidationLaunchExecutionStep[] {
  return [
    step("user-publish-external", "User publishes external platforms", "user", "Copy the prepared pack into Xianyu, Taobao, Whop, Xiaohongshu, or WeChat manually.", undefined, "Only user-confirmed public listings or posts are treated as launched."),
    step("user-copy-real-data", "User copies real data to Codex", "user", "After real views, messages, orders, revenue, refunds, or feedback exist, copy the observed values to Codex.", undefined, "Unknown or unobserved metrics stay empty or zero."),
    step("codex-write-external-input", "Codex writes external-intake-input.json", "codex", "Codex can transform user-provided observed values into the external intake input.", `reports/ebos/validation/intake/inputs/${targetDate}-external-intake-input.json`, "Input contains only user-provided observed data."),
    step("codex-dry-run-import", "dry-run import", "codex", "Preview external intake changes before writing to validation input.", `npx tsx scripts/import-ebos-external-intake.ts --date ${targetDate}`, "Dry-run import report exists and anomalies are reviewed."),
    step("codex-apply-import", "apply import", "codex", "Apply external intake only after dry-run review.", `npx tsx scripts/import-ebos-external-intake.ts --date ${targetDate} --apply`, "Validation input backup and import report are generated."),
    step("codex-check-validation-input", "check validation input", "codex", "Validate the merged validation input before reporting.", `npx tsx scripts/check-ebos-validation-input.ts --date ${targetDate}`, "Validation input check has no fabricated metric warnings."),
    step("codex-generate-validation-report", "generate validation report", "codex", "Regenerate validation result report.", `npx tsx scripts/generate-ebos-validation-report.ts --date ${targetDate}`, "Validation result JSON/Markdown are generated."),
    step("codex-generate-decision-report", "generate decision report", "codex", "Regenerate decision report after validation evidence changes.", `npx tsx scripts/generate-ebos-decision-report.ts --date ${targetDate}`, "Decision report references the latest validation result."),
    step("codex-generate-weekly-monthly", "generate weekly/monthly", "codex", "Regenerate weekly and monthly EBOS reports after validation updates.", `npx tsx scripts/generate-ebos-weekly-report.ts --date ${targetDate} && npx tsx scripts/generate-ebos-monthly-review.ts --date ${targetDate}`, "Weekly and monthly reports reference launch execution or post-launch checks.")
  ];
}

function buildCodexExecutableSteps(
  targetDate: string,
  runbook: EbosValidationLaunchRunbook
): EbosValidationLaunchExecutionStep[] {
  return [
    ...runbook.codexSteps.map((item): EbosValidationLaunchExecutionStep => ({
      id: item.id,
      title: item.title,
      owner: "codex",
      description: item.description,
      ...(item.command ? { command: item.command } : {}),
      verification: item.verification
    })),
    step("codex-generate-launch-execution", "Generate validation launch execution report", "codex", "Write JSON and Markdown execution artifacts.", `npx tsx scripts/generate-ebos-validation-launch-execution.ts --date ${targetDate}`, "Launch execution report JSON/Markdown are generated."),
    step("codex-post-launch-dry-run", "Prepare post-launch dry-run check", "codex", "List production URLs to check without network requests.", `npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${DEFAULT_SITE_URL} --dry-run`, "Post-launch dry-run JSON/Markdown are generated.")
  ];
}

function buildDefaultUserMinimumActions(): string[] {
  return [
    "Confirm whether the validation page is actually deployed before Codex marks it deployed_pending_verification.",
    "Copy the prepared external publish pack into external platforms manually.",
    "Provide only real observed external platform results back to Codex."
  ];
}

function buildNextCommands(targetDate: string, launchStatus: EbosValidationLaunchStatus) {
  if (launchStatus === "blocked") {
    return [
      `npx tsx scripts/check-ebos-validation-launch-readiness.ts --date ${targetDate}`,
      `npx tsx scripts/generate-ebos-validation-launch-runbook.ts --date ${targetDate}`
    ];
  }

  return [
    "npm run lint",
    "npm run typecheck",
    "npm run build",
    `npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${DEFAULT_SITE_URL} --dry-run`,
    `npx tsx scripts/generate-ebos-weekly-report.ts --date ${targetDate}`,
    `npx tsx scripts/generate-ebos-monthly-review.ts --date ${targetDate}`
  ];
}

function buildPendingPostLaunchChecks(siteUrl: string, dryRun: boolean): EbosValidationPostLaunchCheckItem[] {
  return VALIDATION_PATHS.flatMap((path) => {
    const url = `${siteUrl}${path}`;
    return [
      postLaunchItem(url, "http_status", dryRun),
      postLaunchItem(url, "page_content", dryRun),
      postLaunchItem(url, "cta_present", dryRun),
      postLaunchItem(url, "metadata", dryRun),
      postLaunchItem(url, "tracking_plan", dryRun)
    ];
  });
}

function postLaunchItem(
  url: string,
  checkType: EbosValidationSmokeCheckType,
  dryRun: boolean
): EbosValidationPostLaunchCheckItem {
  return {
    id: `${checkType}-${url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-$/, "")}`,
    url,
    expectedStatus: 200,
    checkType,
    dryRun,
    status: "pending",
    notes: dryRun ? "Dry-run only; no network request was made." : "Pending live post-launch check."
  };
}

function buildPostLaunchNextActions(
  status: EbosValidationPostLaunchCheckReport["status"],
  blockers: string[]
) {
  if (status === "failed") {
    return [
      "Fix failed validation post-launch routes before collecting external metrics.",
      ...blockers.slice(0, 5)
    ];
  }

  if (status === "passed") {
    return [
      "Begin collecting real validation data.",
      "Keep unobserved external metrics as zero or empty values."
    ];
  }

  if (status === "warning") {
    return [
      "Review post-launch warnings before treating validation launch as healthy."
    ];
  }

  return [
    "Dry-run only. Run a live check after deployment is confirmed."
  ];
}

function step(
  id: string,
  title: string,
  owner: "codex" | "user",
  description: string,
  command: string | undefined,
  verification: string
): EbosValidationLaunchExecutionStep {
  return {
    id,
    title,
    owner,
    description,
    ...(command ? { command } : {}),
    verification
  };
}

async function readLatestReport<T extends { reportType: string }>(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
  suffix: string;
  reportType: T["reportType"];
}): Promise<{ filePath: string; report: T } | null> {
  const targetDate = options.targetDate ? toDateKey(options.targetDate) : null;
  const directory = join(options.reportsRoot ?? "reports/ebos", "validation", "launch-execution").replace(/\\/g, "/");

  if (targetDate) {
    const exactPath = `${directory}/${targetDate}-${options.suffix}.json`;
    const exact = await readReportFile<T>(exactPath, options.reportType);
    if (exact) return { filePath: exactPath, report: exact };
  }

  try {
    const fileName = (await readdir(directory))
      .filter((name) => name.endsWith(`-${options.suffix}.json`))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const report = await readReportFile<T>(filePath, options.reportType);
    return report ? { filePath, report } : null;
  } catch {
    return null;
  }
}

async function readReportFile<T extends { reportType: string }>(
  filePath: string,
  reportType: T["reportType"]
) {
  try {
    const report = JSON.parse(await readFile(filePath, "utf8")) as T;
    return report.reportType === reportType ? report : null;
  } catch {
    return null;
  }
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
