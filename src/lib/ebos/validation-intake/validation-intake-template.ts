import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EbosValidationCaptureReport } from "../validation-capture";
import type { EbosValidationInputFile } from "../validation";
import type {
  EbosExternalChannel,
  EbosExternalChannelIntakeInput,
  EbosExternalChannelIntakeTemplate,
  EbosExternalChannelRecord,
  EbosExternalIntakePlanField
} from "./validation-intake-types";

export const DEFAULT_EXTERNAL_INTAKE_CHANNELS: EbosExternalChannel[] = [
  "xianyu",
  "taobao",
  "whop",
  "xiaohongshu",
  "wechat",
  "manual_outreach"
];

const NUMERIC_DEFAULTS = {
  views: 0,
  clicks: 0,
  favorites: 0,
  saves: 0,
  shares: 0,
  messages: 0,
  leads: 0,
  positiveReplies: 0,
  negativeReplies: 0,
  orders: 0,
  paidOrders: 0,
  revenue: 0,
  refundCount: 0,
  refundedAmount: 0
} satisfies Partial<EbosExternalChannelRecord>;

export function buildExternalIntakeTemplate(options: {
  targetDate: string;
  generatedAt?: string | Date;
  captureReport: EbosValidationCaptureReport;
  validationInput: EbosValidationInputFile;
  sourceCaptureReportPath?: string;
  sourceValidationInputPath?: string;
  channels?: EbosExternalChannel[];
}): EbosExternalChannelIntakeTemplate {
  const channels = options.channels ?? DEFAULT_EXTERNAL_INTAKE_CHANNELS;
  const byPlan = new Map<string, EbosExternalIntakePlanField>();

  for (const result of options.validationInput.results) {
    byPlan.set(result.planId, {
      planId: result.planId,
      targetProductOrDirection: result.actualMetricLabel,
      notes: result.notes,
      manualFields: [],
      manualSlots: []
    });
  }

  for (const slot of options.captureReport.manualDataSlots) {
    const current = byPlan.get(slot.planId) ?? {
      planId: slot.planId,
      manualFields: [],
      manualSlots: []
    };
    current.manualFields = unique([...current.manualFields, slot.field]);
    current.manualSlots = [
      ...current.manualSlots,
      {
        field: slot.field,
        label: slot.label,
        description: slot.description,
        sourceHint: slot.sourceHint,
        requiredForDecision: slot.requiredForDecision
      }
    ];
    byPlan.set(slot.planId, current);
  }

  return {
    templateType: "external_channel_intake_template",
    targetDate: options.targetDate,
    generatedAt: toIso(options.generatedAt ?? new Date()),
    ...(options.sourceCaptureReportPath ? { sourceCaptureReportPath: options.sourceCaptureReportPath } : {}),
    ...(options.sourceValidationInputPath ? { sourceValidationInputPath: options.sourceValidationInputPath } : {}),
    channels,
    planFields: [...byPlan.values()],
    instructions: [
      "Only fill real observed data from external channels.",
      "Do not invent views, clicks, messages, orders, revenue, refunds, or feedback.",
      "If a metric is unavailable or did not happen, keep it as 0.",
      "Codex may validate and merge this local file, but must not log in to external platforms or call external APIs."
    ],
    warnings: options.captureReport.manualDataSlots.length
      ? []
      : ["No manual external data slots were found in the capture report."]
  };
}

export function createEditableExternalIntakeInput(
  template: EbosExternalChannelIntakeTemplate
): EbosExternalChannelIntakeInput {
  return {
    inputType: "external_channel_intake_input",
    targetDate: template.targetDate,
    channels: template.channels,
    planResults: template.planFields.flatMap((plan) => template.channels.map((channel) => ({
      channel,
      targetPlanId: plan.planId,
      ...(plan.targetProductOrDirection ? { targetProductOrDirection: plan.targetProductOrDirection } : {}),
      url: "",
      ...NUMERIC_DEFAULTS,
      userFeedback: [],
      notes: ""
    }))),
    notes: [
      "Only replace zeros with real external channel data observed by the user."
    ],
    warnings: []
  };
}

export function renderExternalIntakeTemplateMarkdown(template: EbosExternalChannelIntakeTemplate) {
  const input = createEditableExternalIntakeInput(template);
  const rows = input.planResults.map((record) => [
    record.channel,
    record.targetPlanId,
    record.targetProductOrDirection ?? "",
    record.url ?? "",
    record.views ?? 0,
    record.clicks ?? 0,
    record.favorites ?? 0,
    record.saves ?? 0,
    record.shares ?? 0,
    record.messages ?? 0,
    record.leads ?? 0,
    record.positiveReplies ?? 0,
    record.negativeReplies ?? 0,
    record.orders ?? 0,
    record.paidOrders ?? 0,
    record.revenue ?? 0,
    record.refundCount ?? 0,
    record.refundedAmount ?? 0,
    "",
    ""
  ]);

  return [
    "# EBOS External Channel Intake",
    "",
    `Target date: ${template.targetDate}`,
    `Generated at: ${template.generatedAt}`,
    template.sourceCaptureReportPath ? `Capture report: ${template.sourceCaptureReportPath}` : "",
    template.sourceValidationInputPath ? `Validation input: ${template.sourceValidationInputPath}` : "",
    "",
    "## Instructions",
    ...template.instructions.map((item) => `- ${item}`),
    "",
    "## Plans",
    ...template.planFields.map((plan) => `- ${plan.planId}: ${plan.notes ?? "no notes"}`),
    "",
    "## Editable Markdown Table",
    "",
    "| channel | targetPlanId | targetProductOrDirection | url | views | clicks | favorites | saves | shares | messages | leads | positiveReplies | negativeReplies | orders | paidOrders | revenue | refundCount | refundedAmount | userFeedback | notes |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...rows.map((row) => `| ${row.map((value) => String(value).replace(/\|/g, "/")).join(" | ")} |`),
    "",
    "## JSON Input Template",
    "",
    "```json",
    JSON.stringify(input, null, 2),
    "```"
  ].filter((line) => line !== "").join("\n");
}

export async function writeExternalIntakeTemplateFiles(options: {
  template: EbosExternalChannelIntakeTemplate;
  outputRoot?: string;
  force?: boolean;
}) {
  const root = options.outputRoot ?? "reports/ebos";
  const intakeRoot = join(root, "validation", "intake");
  const templateDir = join(intakeRoot, "templates");
  const inputDir = join(intakeRoot, "inputs");
  const jsonPath = join(templateDir, `${options.template.targetDate}-external-intake-template.json`);
  const markdownPath = join(templateDir, `${options.template.targetDate}-external-intake-template.md`);
  const inputPath = join(inputDir, `${options.template.targetDate}-external-intake-input.json`);
  const skipped: string[] = [];

  await mkdir(templateDir, { recursive: true });
  await mkdir(inputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(options.template, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderExternalIntakeTemplateMarkdown(options.template)}\n`, "utf8");

  if (!options.force && await pathExists(inputPath)) {
    skipped.push(inputPath);
  } else {
    await writeFile(inputPath, `${JSON.stringify(createEditableExternalIntakeInput(options.template), null, 2)}\n`, "utf8");
  }

  return {
    templateJsonPath: jsonPath,
    templateMarkdownPath: markdownPath,
    inputPath,
    skipped
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
