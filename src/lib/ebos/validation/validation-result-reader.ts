import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosValidationInputFile,
  EbosValidationReadResult,
  EbosValidationResultInput,
  EbosValidationResultReport,
  EbosValidationResultStatus,
  EbosValidationTracker,
  EbosValidationWarning
} from "./validation-types";

export type EbosValidationFileSystem = {
  readFile(filePath: string, encoding?: "utf8"): Promise<string>;
  readdir?(directory: string): Promise<string[]>;
};

export type EbosDatedValidationReadResult = EbosValidationReadResult & {
  filePath: string;
  usedExample: boolean;
};

const nodeFs: EbosValidationFileSystem = {
  readFile: async (filePath) => readFile(filePath, "utf8"),
  readdir
};

const VALID_STATUSES = new Set<EbosValidationResultStatus>([
  "not_started",
  "running",
  "completed",
  "skipped"
]);

export async function readValidationResultInput(
  filePath: string,
  options: { fs?: EbosValidationFileSystem } = {}
): Promise<EbosValidationReadResult> {
  const fs = options.fs ?? nodeFs;

  try {
    const source = await fs.readFile(filePath, "utf8");
    return {
      input: normalizeValidationResultInput(JSON.parse(source)),
      warnings: []
    };
  } catch (error) {
    const code = error instanceof SyntaxError
      ? "validation_input_parse_failed"
      : "validation_input_unavailable";
    return {
      input: normalizeValidationResultInput({}),
      warnings: [{
        code,
        severity: "warning",
        message: `Validation input ${filePath} could not be read; continuing with empty not_started results.`
      }]
    };
  }
}

export async function readValidationResultInputForDate(options: {
  targetDate: string | Date;
  reportsRoot?: string;
  fs?: EbosValidationFileSystem;
}): Promise<EbosDatedValidationReadResult> {
  const fs = options.fs ?? nodeFs;
  const targetDate = toDateKey(options.targetDate);
  const inputDir = join(options.reportsRoot ?? "reports/ebos", "validation", "inputs").replace(/\\/g, "/");
  const realPath = `${inputDir}/${targetDate}-validation-input.json`;
  const examplePath = `${inputDir}/${targetDate}-validation-input.example.json`;
  const real = await tryReadValidationInput(realPath, fs);

  if (real.status === "ok") {
    return {
      filePath: realPath,
      usedExample: false,
      input: real.input,
      warnings: []
    };
  }
  if (real.status === "parse_error") {
    return {
      filePath: realPath,
      usedExample: false,
      input: normalizeValidationResultInput({}),
      warnings: [{
        code: "validation_input_parse_failed",
        severity: "warning",
        message: `Validation input ${realPath} could not be parsed; continuing with empty not_started results.`
      }]
    };
  }

  const example = await tryReadValidationInput(examplePath, fs);
  if (example.status === "ok") {
    return {
      filePath: examplePath,
      usedExample: true,
      input: example.input,
      warnings: [{
        code: "validation_input_example_in_use",
        severity: "warning",
        message: "当前读取的是 example 文件，不代表真实验证结果。"
      }]
    };
  }
  if (example.status === "parse_error") {
    return {
      filePath: examplePath,
      usedExample: true,
      input: normalizeValidationResultInput({}),
      warnings: [{
        code: "validation_input_parse_failed",
        severity: "warning",
        message: `Validation input example ${examplePath} could not be parsed; continuing with empty not_started results.`
      }]
    };
  }

  return {
    filePath: realPath,
    usedExample: false,
    input: normalizeValidationResultInput({}),
    warnings: [{
      code: "validation_input_unavailable",
      severity: "warning",
      message: `No validation input was found for ${targetDate}; expected ${realPath} or ${examplePath}.`
    }]
  };
}

export function normalizeValidationResultInput(input: unknown): EbosValidationInputFile {
  const raw = toRecord(input);
  const rawResults = Array.isArray(input)
    ? input
    : Array.isArray(raw.results)
      ? raw.results
      : Array.isArray(raw.validationResults)
        ? raw.validationResults
        : Array.isArray(raw.resultInputs)
          ? raw.resultInputs
          : isSingleResult(raw)
            ? [raw]
            : [];

  return {
    ...(typeof raw.trackerPath === "string" ? { trackerPath: raw.trackerPath } : {}),
    ...(typeof raw.targetDate === "string" ? { targetDate: raw.targetDate } : {}),
    results: rawResults
      .map(normalizeSingleResult)
      .filter((item): item is EbosValidationResultInput => item !== null),
    warnings: normalizeWarnings(raw.warnings)
  };
}

export function mergeTrackerWithResultInput(
  tracker: EbosValidationTracker,
  input: EbosValidationInputFile
): EbosValidationTracker {
  const normalized = normalizeValidationResultInput(input);
  const byPlanId = new Map(normalized.results.map((result) => [result.planId, result]));

  return {
    ...tracker,
    validationPlans: tracker.validationPlans.map((plan) => ({
      ...plan,
      resultInput: {
        ...plan.resultInput,
        ...(byPlanId.get(plan.id) ?? {})
      }
    })),
    warnings: [
      ...tracker.warnings,
      ...(normalized.warnings ?? [])
    ]
  };
}

export async function readLatestValidationResultReport(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
  fs?: EbosValidationFileSystem;
} = {}): Promise<{ filePath: string; report: EbosValidationResultReport } | null> {
  const fs = options.fs ?? nodeFs;
  const targetDate = options.targetDate ? toDateKey(options.targetDate) : null;
  const directory = join(options.reportsRoot ?? "reports/ebos", "validation", "reports").replace(/\\/g, "/");

  if (targetDate) {
    const exactPath = `${directory}/${targetDate}-validation-result-report.json`;
    const exact = await readValidationResultReportFile(exactPath, fs);
    if (exact) return { filePath: exactPath, report: exact };
  }

  if (!fs.readdir) return null;
  try {
    const fileName = (await fs.readdir(directory))
      .filter((name) => name.endsWith("-validation-result-report.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const report = await readValidationResultReportFile(filePath, fs);
    return report ? { filePath, report } : null;
  } catch {
    return null;
  }
}

async function readValidationResultReportFile(
  filePath: string,
  fs: EbosValidationFileSystem
) {
  try {
    const report = JSON.parse(await fs.readFile(filePath, "utf8")) as EbosValidationResultReport;
    return report.reportType === "validation_result_report" ? report : null;
  } catch {
    return null;
  }
}

async function tryReadValidationInput(
  filePath: string,
  fs: EbosValidationFileSystem
): Promise<
  | { status: "ok"; input: EbosValidationInputFile }
  | { status: "missing" }
  | { status: "parse_error" }
> {
  try {
    const source = await fs.readFile(filePath, "utf8");
    return {
      status: "ok",
      input: normalizeValidationResultInput(JSON.parse(source))
    };
  } catch (error) {
    return error instanceof SyntaxError ? { status: "parse_error" } : { status: "missing" };
  }
}

function normalizeSingleResult(item: unknown): EbosValidationResultInput | null {
  const raw = toRecord(item);
  if (typeof raw.planId !== "string" || raw.planId.trim().length === 0) return null;

  const result: EbosValidationResultInput = {
    planId: raw.planId,
    status: normalizeStatus(raw.status)
  };

  assignNumber(result, "actualMetricValue", raw.actualMetricValue);
  assignString(result, "actualMetricLabel", raw.actualMetricLabel);
  assignNumber(result, "pageViews", raw.pageViews);
  assignNumber(result, "productPageViews", raw.productPageViews);
  assignNumber(result, "productPageCtaClicks", raw.productPageCtaClicks);
  assignNumber(result, "listingViews", raw.listingViews);
  assignNumber(result, "clicks", raw.clicks);
  assignNumber(result, "favorites", raw.favorites);
  assignNumber(result, "messages", raw.messages);
  assignNumber(result, "orders", raw.orders);
  assignNumber(result, "conversionRate", raw.conversionRate);
  assignNumber(result, "ctaClicks", raw.ctaClicks);
  assignNumber(result, "leads", raw.leads);
  assignNumber(result, "presaleOrders", raw.presaleOrders);
  assignNumber(result, "paidOrders", raw.paidOrders);
  assignNumber(result, "revenue", raw.revenue);
  assignNumber(result, "refundCount", raw.refundCount);
  assignString(result, "priceShown", raw.priceShown);
  assignNumber(result, "manualOutreachCount", raw.manualOutreachCount);
  assignNumber(result, "outreachCount", raw.outreachCount);
  assignNumber(result, "positiveReplies", raw.positiveReplies);
  assignNumber(result, "negativeReplies", raw.negativeReplies);
  assignNumber(result, "callsBooked", raw.callsBooked);
  assignNumber(result, "contentViews", raw.contentViews);
  assignNumber(result, "comments", raw.comments);
  assignNumber(result, "saves", raw.saves);
  assignNumber(result, "shares", raw.shares);
  assignNumber(result, "supportQuestions", raw.supportQuestions);
  assignStringArray(result, "feedback", raw.feedback);
  assignStringArray(result, "buyerFeedback", raw.buyerFeedback);
  assignStringArray(result, "deliveryFeedback", raw.deliveryFeedback);
  assignStringArray(result, "userFeedback", raw.userFeedback);
  assignChannelResults(result, raw.channelResults);
  assignString(result, "notes", raw.notes);
  assignString(result, "completedAt", raw.completedAt);

  return result;
}

function normalizeStatus(value: unknown): EbosValidationResultStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as EbosValidationResultStatus)
    ? value as EbosValidationResultStatus
    : "not_started";
}

function normalizeWarnings(value: unknown): EbosValidationWarning[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const raw = toRecord(item);
    if (typeof raw.message !== "string") return [];
    return [{
      code: typeof raw.code === "string" ? raw.code : "validation_input_warning",
      severity: raw.severity === "critical" || raw.severity === "info" ? raw.severity : "warning",
      message: raw.message,
      ...(typeof raw.planId === "string" ? { planId: raw.planId } : {}),
      ...(typeof raw.source === "string" ? { source: raw.source } : {})
    } satisfies EbosValidationWarning];
  });
}

function assignNumber<T extends Record<string, unknown>>(target: T, key: keyof T, value: unknown) {
  const numberValue = toFiniteNumber(value);
  if (numberValue !== undefined) {
    target[key] = numberValue as T[keyof T];
  }
}

function assignString<T extends Record<string, unknown>>(target: T, key: keyof T, value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    target[key] = value as T[keyof T];
  }
}

function assignStringArray<T extends Record<string, unknown>>(target: T, key: keyof T, value: unknown) {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (items.length) target[key] = items as T[keyof T];
    return;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    target[key] = [value] as T[keyof T];
  }
}

function assignChannelResults(target: EbosValidationResultInput, value: unknown) {
  if (!Array.isArray(value)) return;
  const channelResults = value.flatMap((item) => {
    const raw = toRecord(item);
    if (typeof raw.channel !== "string" || raw.channel.trim().length === 0) return [];
    const result: NonNullable<EbosValidationResultInput["channelResults"]>[number] = {
      channel: raw.channel
    };
    assignString(result, "metricLabel", raw.metricLabel);
    assignNumber(result, "metricValue", raw.metricValue);
    assignNumber(result, "ctaClicks", raw.ctaClicks);
    assignNumber(result, "leads", raw.leads);
    assignNumber(result, "presaleOrders", raw.presaleOrders);
    assignNumber(result, "paidOrders", raw.paidOrders);
    assignNumber(result, "revenue", raw.revenue);
    assignString(result, "notes", raw.notes);
    return [result];
  });
  if (channelResults.length) target.channelResults = channelResults;
}

function isSingleResult(raw: Record<string, unknown>) {
  return typeof raw.planId === "string";
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
