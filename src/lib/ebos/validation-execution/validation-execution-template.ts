import { readFile } from "node:fs/promises";
import type { EbosValidationMethod } from "../decision";
import { buildValidationTrackerFromDecisionReport, type EbosValidationPlanTracker, type EbosValidationTracker } from "../validation";
import type {
  EbosValidationChannelTracking,
  EbosValidationExecutionInput,
  EbosValidationExecutionPlan,
  EbosValidationExecutionResultInputTemplate,
  EbosValidationMetricField
} from "./validation-execution-types";

export type EbosValidationExecutionFileSystem = {
  readFile(filePath: string, encoding?: "utf8"): Promise<string>;
  readdir?(directory: string): Promise<string[]>;
};

const nodeFs: EbosValidationExecutionFileSystem = {
  readFile: async (filePath) => readFile(filePath, "utf8")
};

export async function buildValidationExecutionInput(options: {
  targetDate?: string | Date;
  generatedAt?: string | Date;
  tracker?: EbosValidationTracker;
  decisionReportPath?: string;
  validationTrackerPath?: string;
  validationResultInputPath?: string;
  reportsRoot?: string;
  fs?: EbosValidationExecutionFileSystem;
} = {}): Promise<EbosValidationExecutionInput> {
  const targetDate = toDateKey(options.targetDate ?? new Date());
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const reportsRoot = options.reportsRoot ?? "reports/ebos";
  const decisionReportPath = options.decisionReportPath ?? `${reportsRoot}/decision/${targetDate}-decision-report.json`;
  const validationTrackerPath = options.validationTrackerPath ?? `${reportsRoot}/validation/templates/${targetDate}-validation-tracker.json`;
  const validationResultInputPath = options.validationResultInputPath ?? `${reportsRoot}/validation/inputs/${targetDate}-validation-input.json`;
  const exampleInputPath = `${reportsRoot}/validation/inputs/${targetDate}-validation-input.example.json`;
  const warnings = [];
  const fs = options.fs ?? nodeFs;

  const decisionReportExists = await canRead(decisionReportPath, fs);
  if (!decisionReportExists) {
    warnings.push({
      code: "decision_report_missing",
      severity: "warning" as const,
      message: `Decision report ${decisionReportPath} could not be read.`
    });
  }

  const exampleExists = await canRead(exampleInputPath, fs);
  if (!exampleExists) {
    warnings.push({
      code: "validation_input_example_missing",
      severity: "warning" as const,
      message: `Validation input example ${exampleInputPath} could not be read.`
    });
  }

  const tracker = options.tracker ?? await readTracker(validationTrackerPath, fs);
  if (!tracker) {
    warnings.push({
      code: "validation_tracker_missing",
      severity: "warning" as const,
      message: `Validation tracker ${validationTrackerPath} could not be read.`
    });
  }

  const fallbackTracker = tracker ?? await buildValidationTrackerFromDecisionReport({
    targetDate,
    decisionReportPath,
    fs
  });
  const executionPlans = fallbackTracker.validationPlans.map(buildExecutionPlanFromTrackerPlan);

  return {
    inputType: "validation_execution_input",
    targetDate,
    generatedAt,
    decisionReportPath,
    validationTrackerPath,
    validationResultInputPath,
    executionPlans,
    channelTracking: buildChannelTracking(executionPlans),
    resultRecordingRules: buildResultRecordingRules(),
    weeklyReviewQuestions: buildWeeklyReviewQuestions(),
    warnings: [...warnings, ...fallbackTracker.warnings]
  };
}

export function buildExecutionPlanFromTrackerPlan(plan: EbosValidationPlanTracker): EbosValidationExecutionPlan {
  const trackingFields = uniqueFields([
    ...getMethodTrackingFields(plan.validationMethod),
    ...getTargetSpecificTrackingFields(plan)
  ]);
  const executionPlan: Omit<EbosValidationExecutionPlan, "resultInputTemplate"> = {
    planId: plan.id,
    title: plan.title,
    targetDirection: plan.targetDirection,
    ...(plan.targetProduct ? { targetProduct: plan.targetProduct } : {}),
    validationMethod: plan.validationMethod,
    objective: plan.objective,
    hypothesis: plan.hypothesis,
    successMetric: plan.successMetric,
    minimumSuccessThreshold: plan.minimumSuccessThreshold,
    durationDays: plan.durationDays,
    executionStatus: "not_started",
    marketplaceListingUrls: [],
    contentTestUrls: [],
    outreachTargets: [],
    trackingFields,
    codexTasks: plan.codexTasks,
    humanTasks: plan.humanTasks,
    acceptanceCriteria: buildAcceptanceCriteria(plan, trackingFields)
  };

  return {
    ...executionPlan,
    resultInputTemplate: createResultInputTemplateForExecutionPlan(executionPlan)
  };
}

export function createResultInputTemplateForExecutionPlan(
  plan: Omit<EbosValidationExecutionPlan, "resultInputTemplate"> | EbosValidationExecutionPlan
): EbosValidationExecutionResultInputTemplate {
  const template: EbosValidationExecutionResultInputTemplate = {
    planId: plan.planId,
    status: "not_started"
  };

  for (const field of plan.trackingFields) {
    if (field.type === "number") template[field.key] = 0;
    if (field.type === "string") template[field.key] = "";
    if (field.type === "boolean") template[field.key] = false;
    if (field.type === "string_array") template[field.key] = [];
  }

  template.userFeedback = [];
  template.channelResults = [];
  template.notes = "";
  return template;
}

function getMethodTrackingFields(method: EbosValidationMethod): EbosValidationMetricField[] {
  switch (method) {
    case "landing_page":
      return [
        numberField("pageViews", "Page views", "Observed landing page views."),
        numberField("ctaClicks", "CTA clicks", "Observed CTA clicks."),
        numberField("leads", "Leads", "Observed leads or signups."),
        numberField("conversionRate", "Conversion rate", "Manual conversion rate, if calculated."),
        stringField("notes", "Notes", "Manual notes from the landing page test.")
      ];
    case "presale":
      return [
        numberField("presaleOrders", "Presale orders", "Observed presale orders."),
        numberField("paidOrders", "Paid orders", "Observed paid orders."),
        numberField("revenue", "Revenue", "Observed revenue."),
        numberField("refundCount", "Refund count", "Observed refunds."),
        stringArrayField("buyerFeedback", "Buyer feedback", "Observed buyer feedback.")
      ];
    case "content_test":
      return [
        numberField("contentViews", "Content views", "Observed content views."),
        numberField("ctaClicks", "CTA clicks", "Observed CTA clicks from content."),
        numberField("leads", "Leads", "Observed leads from content."),
        numberField("comments", "Comments", "Observed comments."),
        numberField("saves", "Saves", "Observed saves."),
        numberField("shares", "Shares", "Observed shares.")
      ];
    case "marketplace_listing":
      return [
        numberField("listingViews", "Listing views", "Observed marketplace listing views."),
        numberField("clicks", "Clicks", "Observed marketplace clicks."),
        numberField("favorites", "Favorites", "Observed favorites."),
        numberField("messages", "Messages", "Observed buyer messages."),
        numberField("orders", "Orders", "Observed orders."),
        numberField("revenue", "Revenue", "Observed revenue.")
      ];
    case "manual_outreach":
      return [
        numberField("outreachCount", "Outreach count", "Manual outreach count."),
        numberField("positiveReplies", "Positive replies", "Observed positive replies."),
        numberField("negativeReplies", "Negative replies", "Observed negative replies."),
        numberField("callsBooked", "Calls booked", "Observed calls booked."),
        numberField("orders", "Orders", "Observed orders.")
      ];
    case "pricing_test":
      return [
        stringField("priceShown", "Price shown", "Price shown during the test."),
        numberField("ctaClicks", "CTA clicks", "Observed CTA clicks."),
        numberField("paidOrders", "Paid orders", "Observed paid orders."),
        numberField("refundCount", "Refund count", "Observed refunds."),
        stringArrayField("feedback", "Feedback", "Observed pricing feedback.")
      ];
  }
}

function getTargetSpecificTrackingFields(plan: EbosValidationPlanTracker): EbosValidationMetricField[] {
  const text = `${plan.title} ${plan.targetDirection} ${plan.targetProduct ?? ""}`.toLowerCase();
  if (text.includes("ai prompt kit")) {
    return [
      numberField("listingViews", "Listing views", "Observed marketplace listing views."),
      numberField("messages", "Messages", "Observed buyer messages."),
      numberField("presaleOrders", "Presale orders", "Observed presale orders."),
      numberField("paidOrders", "Paid orders", "Observed paid orders."),
      numberField("revenue", "Revenue", "Observed revenue.")
    ];
  }

  if (text.includes("faceswap") || text.includes("video studio") || text.includes("existing product")) {
    return [
      numberField("productPageViews", "Product page views", "Observed product page views."),
      numberField("productPageCtaClicks", "Product page CTA clicks", "Observed product page CTA clicks."),
      numberField("listingViews", "Listing views", "Observed marketplace listing views."),
      numberField("messages", "Messages", "Observed marketplace messages."),
      stringArrayField("deliveryFeedback", "Delivery/support feedback", "Observed delivery or support feedback."),
      numberField("supportQuestions", "Support questions", "Observed support questions.")
    ];
  }

  return [];
}

function buildChannelTracking(plans: EbosValidationExecutionPlan[]): EbosValidationChannelTracking[] {
  const items: EbosValidationChannelTracking[] = [];
  for (const plan of plans) {
    items.push({
      channel: "website",
      plannedAction: `${plan.title}: publish or update ENHE page CTA.`,
      metricFields: plan.trackingFields.filter((field) => ["pageViews", "productPageViews", "ctaClicks", "productPageCtaClicks", "leads"].includes(field.key)),
      notes: "Record observed website metrics only."
    });

    if (plan.trackingFields.some((field) => ["listingViews", "messages", "orders"].includes(field.key))) {
      items.push({
        channel: "whop",
        plannedAction: `${plan.title}: prepare marketplace listing copy.`,
        metricFields: plan.trackingFields.filter((field) => ["listingViews", "clicks", "favorites", "messages", "orders", "revenue"].includes(field.key)),
        notes: "Use observed marketplace metrics only."
      });
    }

    if (plan.trackingFields.some((field) => ["outreachCount", "positiveReplies", "negativeReplies"].includes(field.key))) {
      items.push({
        channel: "manual_outreach",
        plannedAction: `${plan.title}: record manual outreach replies.`,
        metricFields: plan.trackingFields.filter((field) => ["outreachCount", "positiveReplies", "negativeReplies", "callsBooked", "orders"].includes(field.key)),
        notes: "Record actual replies and orders only."
      });
    }
  }
  return items;
}

function buildAcceptanceCriteria(plan: EbosValidationPlanTracker, trackingFields: EbosValidationMetricField[]) {
  return [
    `${plan.title} has a clear offer, CTA, and tracking note.`,
    "All observed results are written to validation-input.json without fabricated metrics.",
    "Every required channel has a URL, skipped reason, or manual note.",
    ...(trackingFields.some((field) => field.key === "deliveryFeedback")
      ? ["Product delivery/support feedback is recorded when users ask about delivery or support."]
      : [])
  ];
}

function buildResultRecordingRules() {
  return [
    "Do not fabricate CTA clicks, leads, orders, revenue, refunds, or feedback.",
    "Leave unknown string fields empty and unknown numeric fields as 0.",
    "Keep planId unchanged so the result reader can merge results back to the tracker.",
    "Use notes for uncertainty, skipped channels, or manual context."
  ];
}

function buildWeeklyReviewQuestions() {
  return [
    "Which validation plan produced the strongest observed signal?",
    "Which channel produced clicks, leads, messages, or orders?",
    "Did any paid order refund or produce delivery/support risk?",
    "Should EBOS continue, adjust, stop, or scale the direction next week?"
  ];
}

async function readTracker(filePath: string, fs: EbosValidationExecutionFileSystem) {
  try {
    const tracker = JSON.parse(await fs.readFile(filePath, "utf8")) as EbosValidationTracker;
    return tracker.trackerType === "validation_tracker" ? tracker : null;
  } catch {
    return null;
  }
}

async function canRead(filePath: string, fs: EbosValidationExecutionFileSystem) {
  try {
    await fs.readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

function uniqueFields(fields: EbosValidationMetricField[]) {
  const seen = new Set<string>();
  return fields.filter((field) => {
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return true;
  });
}

function numberField(key: string, label: string, description: string): EbosValidationMetricField {
  return { key, label, type: "number", required: true, description, example: 0 };
}

function stringField(key: string, label: string, description: string): EbosValidationMetricField {
  return { key, label, type: "string", required: false, description, example: "" };
}

function stringArrayField(key: string, label: string, description: string): EbosValidationMetricField {
  return { key, label, type: "string_array", required: false, description, example: [] };
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
