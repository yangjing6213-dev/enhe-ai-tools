import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  normalizeExternalIntakeInput,
  type EbosExternalChannelIntakeInput,
  type EbosExternalChannelRecord
} from "../validation-intake";
import {
  normalizeExternalPublishResultInput,
  validateExternalPublishResultInput
} from "./external-publish-result-validator";
import type {
  EbosExternalDataBackfillReport,
  EbosExternalPublishChannelResult,
  EbosExternalPublishResultInput
} from "./external-publishing-types";
import { toValidationIntakeChannel } from "./external-publishing-types";
import { renderExternalDataBackfillReportMarkdown } from "./external-publishing-markdown";

const DEFAULT_TARGET_PLAN_ID = "validation-direction-3-ai-prompt-kit";
const NUMERIC_FIELDS = [
  "views",
  "clicks",
  "favorites",
  "saves",
  "shares",
  "messages",
  "leads",
  "positiveReplies",
  "negativeReplies",
  "orders",
  "paidOrders",
  "revenue",
  "refundCount",
  "refundedAmount"
] as const;

export function mapPublishResultsToExternalIntake(input: unknown, options: {
  targetPlanId?: string;
} = {}): EbosExternalChannelIntakeInput {
  const normalized = normalizeExternalPublishResultInput(input);
  const targetPlanId = options.targetPlanId ?? DEFAULT_TARGET_PLAN_ID;
  const planResults = normalized.channelResults.map((result) => mapChannelResult(result, targetPlanId));

  return normalizeExternalIntakeInput({
    inputType: "external_channel_intake_input",
    targetDate: normalized.targetDate,
    channels: [...new Set(planResults.map((record) => record.channel))],
    planResults,
    notes: [
      "Mapped from external publish result input. Metrics must be real observed data only."
    ],
    warnings: []
  });
}

export function buildExternalDataBackfillPlan(options: {
  input: unknown;
  existingExternalIntake?: unknown;
  targetPlanId?: string;
}) {
  const normalized = normalizeExternalPublishResultInput(options.input);
  const validation = validateExternalPublishResultInput(normalized);
  const mappedInput = mapPublishResultsToExternalIntake(normalized, {
    targetPlanId: options.targetPlanId
  });
  const existing = options.existingExternalIntake
    ? normalizeExternalIntakeInput(options.existingExternalIntake)
    : normalizeExternalIntakeInput({
        targetDate: normalized.targetDate,
        channels: mappedInput.channels,
        planResults: []
      });
  const mergedInput = mergeExternalIntakeInputs(existing, mappedInput);

  return {
    validation,
    mappedInput,
    mergedInput,
    mappedRecordsCount: mappedInput.planResults.length,
    mergedRecordsCount: mergedInput.planResults.length
  };
}

export async function writeMappedExternalIntake(options: {
  targetDate: string | Date;
  inputPath: string;
  externalIntakeInputPath: string;
  reportsRoot?: string;
  apply?: boolean;
  targetPlanId?: string;
  now?: string | Date;
}): Promise<EbosExternalDataBackfillReport> {
  const targetDate = toDateKey(options.targetDate);
  const input = normalizeExternalPublishResultInput(JSON.parse(await readFile(options.inputPath, "utf8")));
  const existing = await readExistingExternalIntake(options.externalIntakeInputPath, targetDate);
  const plan = buildExternalDataBackfillPlan({
    input,
    existingExternalIntake: existing,
    targetPlanId: options.targetPlanId
  });
  const dryRun = options.apply !== true;
  const canWrite = options.apply === true && plan.validation.canBackfill;
  let backupPath: string | undefined;

  if (canWrite) {
    backupPath = await backupExternalIntakeBeforePublishBackfill(options.externalIntakeInputPath, {
      targetDate,
      reportsRoot: options.reportsRoot,
      now: options.now
    });
    await mkdir(dirname(options.externalIntakeInputPath), { recursive: true });
    await writeFile(options.externalIntakeInputPath, `${JSON.stringify(plan.mergedInput, null, 2)}\n`, "utf8");
  }

  const report: EbosExternalDataBackfillReport = {
    reportType: "external_channel_data_backfill_report",
    targetDate,
    generatedAt: toIso(options.now ?? new Date()),
    dryRun,
    applied: canWrite,
    inputPath: options.inputPath,
    externalIntakeInputPath: options.externalIntakeInputPath,
    ...(backupPath ? { backupPath } : {}),
    validation: plan.validation,
    mappedInput: plan.mappedInput,
    mergedInput: plan.mergedInput,
    mappedRecordsCount: plan.mappedRecordsCount,
    mergedRecordsCount: plan.mergedRecordsCount,
    warnings: plan.validation.warnings,
    blockers: plan.validation.blockers,
    summary: buildBackfillSummary(dryRun, canWrite, plan.validation)
  };

  await writeExternalDataBackfillReport(report, { reportsRoot: options.reportsRoot });
  return report;
}

export async function backupExternalIntakeBeforePublishBackfill(filePath: string, options: {
  targetDate: string;
  reportsRoot?: string;
  now?: string | Date;
}) {
  const backupDir = join(options.reportsRoot ?? "reports/ebos", "external-publishing", "backups");
  const timestamp = toIso(options.now ?? new Date()).replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `${options.targetDate}-external-intake-input.before-publish-backfill.${timestamp}.json`);

  await mkdir(backupDir, { recursive: true });
  await copyFile(filePath, backupPath);
  return backupPath;
}

export async function writeExternalDataBackfillReport(report: EbosExternalDataBackfillReport, options: {
  reportsRoot?: string;
} = {}) {
  const outputDir = join(options.reportsRoot ?? "reports/ebos", "external-publishing", "reports");
  const jsonPath = join(outputDir, `${report.targetDate}-external-data-backfill-report.json`);
  const markdownPath = join(outputDir, `${report.targetDate}-external-data-backfill-report.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderExternalDataBackfillReportMarkdown(report)}\n`, "utf8");
  return { jsonPath, markdownPath };
}

function mapChannelResult(result: EbosExternalPublishChannelResult, targetPlanId: string): EbosExternalChannelRecord {
  const base: EbosExternalChannelRecord = {
    channel: toValidationIntakeChannel(result.channel),
    targetPlanId,
    url: result.publishedUrl ?? "",
    views: 0,
    clicks: 0,
    favorites: result.favorites,
    saves: 0,
    shares: 0,
    messages: 0,
    leads: 0,
    positiveReplies: 0,
    negativeReplies: 0,
    orders: result.orders,
    paidOrders: result.paidOrders || result.orders,
    revenue: result.revenue,
    refundCount: result.refundCount,
    refundedAmount: result.refundedAmount,
    userFeedback: result.userFeedback,
    notes: result.notes
  };

  if (result.channel === "xiaohongshu") {
    return {
      ...base,
      views: result.views,
      saves: result.saves,
      shares: result.shares,
      leads: result.messages + result.leads,
      messages: 0
    };
  }

  if (result.channel === "wechat" || result.channel === "manual_outreach") {
    return {
      ...base,
      messages: Math.max(result.messages, result.leads),
      positiveReplies: result.positiveReplies,
      negativeReplies: result.negativeReplies
    };
  }

  return {
    ...base,
    views: result.views,
    clicks: result.clicks,
    messages: result.messages
  };
}

function mergeExternalIntakeInputs(
  existing: EbosExternalChannelIntakeInput,
  incoming: EbosExternalChannelIntakeInput
): EbosExternalChannelIntakeInput {
  const byKey = new Map<string, EbosExternalChannelRecord>();

  for (const record of existing.planResults) {
    byKey.set(recordKey(record), { ...record });
  }

  for (const record of incoming.planResults) {
    const current = byKey.get(recordKey(record));
    if (!current) {
      byKey.set(recordKey(record), { ...record });
      continue;
    }
    byKey.set(recordKey(record), mergeRecord(current, record));
  }

  const planResults = [...byKey.values()];
  return normalizeExternalIntakeInput({
    inputType: "external_channel_intake_input",
    targetDate: existing.targetDate || incoming.targetDate,
    channels: [...new Set([...existing.channels, ...incoming.channels])],
    planResults,
    notes: [...existing.notes, ...incoming.notes],
    warnings: existing.warnings ?? []
  });
}

function mergeRecord(existing: EbosExternalChannelRecord, incoming: EbosExternalChannelRecord): EbosExternalChannelRecord {
  const merged: EbosExternalChannelRecord = {
    ...existing,
    url: existing.url?.trim() ? existing.url : incoming.url,
    notes: [existing.notes, incoming.notes].filter(Boolean).join("\n"),
    userFeedback: [...new Set([...(existing.userFeedback ?? []), ...(incoming.userFeedback ?? [])])]
  };

  for (const field of NUMERIC_FIELDS) {
    merged[field] = Math.max(existing[field] ?? 0, incoming[field] ?? 0);
  }

  return merged;
}

async function readExistingExternalIntake(filePath: string, targetDate: string) {
  try {
    return normalizeExternalIntakeInput(JSON.parse(await readFile(filePath, "utf8")));
  } catch {
    return normalizeExternalIntakeInput({
      inputType: "external_channel_intake_input",
      targetDate,
      channels: [],
      planResults: [],
      notes: [],
      warnings: []
    });
  }
}

function buildBackfillSummary(
  dryRun: boolean,
  applied: boolean,
  validation: ReturnType<typeof validateExternalPublishResultInput>
) {
  if (!validation.canBackfill) {
    return "Waiting for real external channel data; no external intake write was performed.";
  }
  if (dryRun) {
    return "Dry-run completed. Real external signals are present, but --apply was not used.";
  }
  if (applied) {
    return "External publish results were mapped and written to the external intake input.";
  }
  return "No external intake write was performed.";
}

function recordKey(record: EbosExternalChannelRecord) {
  return `${record.targetPlanId}:${record.channel}`;
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
