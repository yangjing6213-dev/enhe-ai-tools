import type { EbosDecisionReport, EbosValidationPlan } from "../decision";
import { readLatestDecisionReport } from "../decision";
import { getWeeklyWindow } from "../date-window";
import type {
  EbosValidationInputFile,
  EbosValidationPlanTracker,
  EbosValidationResultInput,
  EbosValidationTracker,
  EbosValidationWarning
} from "./validation-types";

export type EbosValidationTemplateFileSystem = {
  readFile(filePath: string, encoding?: "utf8"): Promise<string>;
  readdir?(directory: string): Promise<string[]>;
};

export async function buildValidationTrackerFromDecisionReport(options: {
  targetDate?: string | Date;
  generatedAt?: string | Date;
  decisionReport?: EbosDecisionReport;
  decisionReportPath?: string;
  reportsRoot?: string;
  fs?: EbosValidationTemplateFileSystem;
} = {}): Promise<EbosValidationTracker> {
  const targetDate = toDateKey(options.targetDate ?? new Date());
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const decision = await resolveDecisionReport(options, targetDate);
  const period = decision?.report
    ? { start: decision.report.periodStart, end: decision.report.periodEnd }
    : dateWindowStrings(targetDate);
  const warnings: EbosValidationWarning[] = [];

  if (!decision) {
    warnings.push({
      code: "decision_report_missing",
      severity: "warning",
      message: `No EBOS decision report JSON was found for ${targetDate}; generated an empty validation tracker.`
    });
  }

  const report = decision?.report;
  const validationPlans = (report?.validationPlans ?? []).map(toValidationPlanTracker);

  return {
    trackerType: "validation_tracker",
    targetDate: report?.targetDate ?? targetDate,
    periodStart: period.start,
    periodEnd: period.end,
    generatedAt,
    decisionReportPath: decision?.filePath ?? "",
    topPriorityDirection: readTopPriorityDirection(report),
    ...(readTopExistingProduct(report) ? { topExistingProduct: readTopExistingProduct(report) } : {}),
    validationPlans,
    instructions: buildInstructions(),
    manualInputSchema: buildManualInputSchema(validationPlans),
    warnings
  };
}

export function createEmptyValidationResultInput(plan: Pick<EbosValidationPlan, "id">): EbosValidationResultInput {
  return {
    planId: plan.id,
    status: "not_started"
  };
}

export function createValidationInputExample(
  tracker: EbosValidationTracker,
  trackerPath?: string
): EbosValidationInputFile {
  return {
    ...(trackerPath ? { trackerPath } : {}),
    targetDate: tracker.targetDate,
    results: tracker.validationPlans.map((plan) => plan.resultInput)
  };
}

export function renderValidationTrackerMarkdown(tracker: EbosValidationTracker) {
  return [
    "# ENHE Validation Tracker",
    "",
    `Target date: ${tracker.targetDate}`,
    `Period: ${tracker.periodStart} to ${tracker.periodEnd}`,
    `Decision report: ${tracker.decisionReportPath || "missing"}`,
    `Top priority direction: ${tracker.topPriorityDirection}`,
    `Top existing product: ${tracker.topExistingProduct ?? "none"}`,
    "",
    "## How to Fill",
    list(tracker.instructions),
    "",
    "## Validation Plans",
    list(tracker.validationPlans.map((plan) => [
      `${plan.title}`,
      `method=${plan.validationMethod}`,
      `threshold=${plan.minimumSuccessThreshold}`,
      `inputStatus=${plan.resultInput.status}`
    ].join("; "))),
    "",
    "## Warnings",
    list(tracker.warnings.map((warning) => `${warning.code}: ${warning.message}`))
  ].join("\n");
}

function toValidationPlanTracker(plan: EbosValidationPlan): EbosValidationPlanTracker {
  return {
    id: plan.id,
    title: plan.title,
    targetDirection: plan.targetDirection,
    ...(plan.targetProduct ? { targetProduct: plan.targetProduct } : {}),
    objective: plan.objective,
    hypothesis: plan.hypothesis,
    validationMethod: plan.validationMethod,
    successMetric: plan.successMetric,
    minimumSuccessThreshold: plan.minimumSuccessThreshold,
    durationDays: plan.durationDays,
    requiredAssets: [...plan.requiredAssets],
    codexTasks: [...plan.codexTasks],
    humanTasks: [...plan.humanTasks],
    risks: [...(plan.risks ?? [])],
    resultInput: createEmptyValidationResultInput(plan)
  };
}

async function resolveDecisionReport(
  options: {
    targetDate?: string | Date;
    decisionReport?: EbosDecisionReport;
    decisionReportPath?: string;
    reportsRoot?: string;
    fs?: EbosValidationTemplateFileSystem;
  },
  targetDate: string
) {
  if (options.decisionReport) {
    return {
      filePath: options.decisionReportPath ?? "",
      report: options.decisionReport
    };
  }

  if (options.decisionReportPath) {
    const report = await readDecisionReportFromPath(options.decisionReportPath, options.fs);
    return report ? { filePath: options.decisionReportPath, report } : null;
  }

  return readLatestDecisionReport({
    targetDate,
    reportsRoot: options.reportsRoot,
    fs: options.fs
  });
}

async function readDecisionReportFromPath(
  filePath: string,
  fs?: EbosValidationTemplateFileSystem
) {
  try {
    const source = fs
      ? await fs.readFile(filePath, "utf8")
      : await import("node:fs/promises").then(({ readFile }) => readFile(filePath, "utf8"));
    const report = JSON.parse(source) as EbosDecisionReport;
    return report.reportType === "decision" ? report : null;
  } catch {
    return null;
  }
}

function readTopPriorityDirection(report?: EbosDecisionReport) {
  return report?.priorityProductDirections[0]?.name
    ?? report?.doNext[0]?.title.replace(/^Validate\s+/i, "")
    ?? "No decision report available";
}

function readTopExistingProduct(report?: EbosDecisionReport) {
  return report?.priorityExistingProducts[0]?.productName;
}

function buildInstructions() {
  return [
    "Edit the manual validation input JSON under reports/ebos/validation/inputs.",
    "For each result, keep planId unchanged and set status to not_started, running, completed, or skipped.",
    "Record only observed metrics: ctaClicks, leads, presaleOrders, paidOrders, revenue, refunds, replies, feedback, and notes.",
    "Leave unknown fields empty; EBOS must not fabricate clicks, leads, orders, or revenue.",
    "Run scripts/generate-ebos-validation-report.ts after manual results are recorded."
  ];
}

function buildManualInputSchema(plans: EbosValidationPlanTracker[]) {
  return {
    allowedStatuses: ["not_started", "running", "completed", "skipped"],
    numericFields: [
      "actualMetricValue",
      "ctaClicks",
      "leads",
      "presaleOrders",
      "paidOrders",
      "revenue",
      "refundCount",
      "manualOutreachCount",
      "positiveReplies",
      "negativeReplies"
    ],
    optionalTextFields: ["actualMetricLabel", "notes", "completedAt"],
    optionalArrayFields: ["userFeedback", "channelResults"],
    results: plans.map((plan) => plan.resultInput)
  };
}

function dateWindowStrings(targetDate: string) {
  const period = getWeeklyWindow(new Date(`${targetDate}T12:00:00`));
  return {
    start: toDateKey(period.start),
    end: toDateKey(period.end)
  };
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
