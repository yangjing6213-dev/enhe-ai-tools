import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosExternalChannel,
  EbosExternalChannelIntakeInput,
  EbosExternalChannelRecord,
  EbosExternalIntakeImportResult,
  EbosExternalIntakeReadResult,
  EbosExternalIntakeStatusSummary,
  EbosExternalIntakeWarning
} from "./validation-intake-types";

const VALID_CHANNELS = new Set<EbosExternalChannel>([
  "xianyu",
  "taobao",
  "whop",
  "xiaohongshu",
  "douyin",
  "wechat",
  "email",
  "manual_outreach",
  "other"
]);

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

const MARKDOWN_HEADER_ALIASES: Record<string, keyof EbosExternalChannelRecord> = {
  channel: "channel",
  targetplanid: "targetPlanId",
  planid: "targetPlanId",
  targetproductordirection: "targetProductOrDirection",
  url: "url",
  views: "views",
  clicks: "clicks",
  favorites: "favorites",
  saves: "saves",
  shares: "shares",
  messages: "messages",
  leads: "leads",
  positivereplies: "positiveReplies",
  negativereplies: "negativeReplies",
  orders: "orders",
  paidorders: "paidOrders",
  revenue: "revenue",
  refundcount: "refundCount",
  refundedamount: "refundedAmount",
  userfeedback: "userFeedback",
  notes: "notes"
};

export async function readExternalIntakeInput(filePath: string): Promise<EbosExternalIntakeReadResult> {
  try {
    const source = await readFile(filePath, "utf8");
    const trimmed = source.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return {
        input: normalizeExternalIntakeInput(JSON.parse(source)),
        warnings: []
      };
    }

    const records = parseMarkdownIntakeTable(source);
    return {
      input: normalizeExternalIntakeInput({
        targetDate: inferDateFromPath(filePath),
        channels: uniqueChannels(records),
        planResults: records
      }),
      warnings: []
    };
  } catch (error) {
    return {
      input: normalizeExternalIntakeInput({ targetDate: inferDateFromPath(filePath), planResults: [] }),
      warnings: [{
        code: error instanceof SyntaxError ? "external_intake_parse_failed" : "external_intake_unavailable",
        severity: "warning",
        message: `External intake input ${filePath} could not be read or parsed.`
      }]
    };
  }
}

export function normalizeExternalIntakeInput(input: unknown): EbosExternalChannelIntakeInput {
  const raw = toRecord(input);
  const rawResults = Array.isArray(raw.planResults)
    ? raw.planResults
    : Array.isArray(raw.records)
      ? raw.records
      : Array.isArray(raw.results)
        ? raw.results
        : [];
  const planResults = rawResults
    .map(normalizeExternalChannelRecord)
    .filter((record): record is EbosExternalChannelRecord => record !== null);
  const rawChannels = Array.isArray(raw.channels) ? raw.channels : uniqueChannels(planResults);
  const channels = rawChannels
    .map((channel) => normalizeChannel(channel))
    .filter((channel, index, array) => array.indexOf(channel) === index);

  return {
    inputType: "external_channel_intake_input",
    targetDate: typeof raw.targetDate === "string" ? raw.targetDate.slice(0, 10) : "",
    ...(typeof raw.filledAt === "string" && raw.filledAt.trim().length > 0 ? { filledAt: raw.filledAt } : {}),
    channels,
    planResults,
    notes: normalizeStringArray(raw.notes),
    warnings: normalizeWarnings(raw.warnings)
  };
}

export function normalizeExternalChannelRecord(input: unknown): EbosExternalChannelRecord | null {
  const raw = toRecord(input);
  const targetPlanId = readString(raw.targetPlanId) ?? readString(raw.planId);
  if (!targetPlanId) return null;

  const record: EbosExternalChannelRecord = {
    channel: normalizeChannel(raw.channel),
    targetPlanId,
    ...(readString(raw.targetProductOrDirection) ? { targetProductOrDirection: readString(raw.targetProductOrDirection) } : {}),
    ...(readString(raw.url) ? { url: readString(raw.url) } : {}),
    userFeedback: normalizeStringArray(raw.userFeedback),
    ...(readString(raw.notes) ? { notes: readString(raw.notes) } : {})
  };

  for (const field of NUMERIC_FIELDS) {
    record[field] = readNumber(raw[field]) ?? 0;
  }

  return record;
}

export function parseMarkdownIntakeTable(markdown: string): EbosExternalChannelRecord[] {
  const tableLines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));
  if (tableLines.length < 2) return [];

  const headers = splitMarkdownRow(tableLines[0] ?? [])
    .map((header) => MARKDOWN_HEADER_ALIASES[normalizeHeader(header)] ?? null);
  const records: EbosExternalChannelRecord[] = [];

  for (const line of tableLines.slice(1)) {
    const cells = splitMarkdownRow(line);
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) continue;
    const raw: Record<string, unknown> = {};

    for (const [index, key] of headers.entries()) {
      if (!key) continue;
      const value = cells[index]?.trim() ?? "";
      if (NUMERIC_FIELDS.includes(key as typeof NUMERIC_FIELDS[number])) {
        raw[key] = value;
      } else if (key === "userFeedback") {
        raw[key] = normalizeStringArray(value);
      } else {
        raw[key] = value;
      }
    }

    const normalized = normalizeExternalChannelRecord(raw);
    if (normalized) records.push(normalized);
  }

  return records;
}

export async function readExternalIntakeStatusForDate(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}): Promise<EbosExternalIntakeStatusSummary> {
  const targetDate = toDateKey(options.targetDate);
  const root = options.reportsRoot ?? "reports/ebos";
  const intakeRoot = join(root, "validation", "intake");
  const templatePath = join(intakeRoot, "templates", `${targetDate}-external-intake-template.json`);
  const inputPath = join(intakeRoot, "inputs", `${targetDate}-external-intake-input.json`);
  const importReportPath = join(intakeRoot, "imports", `${targetDate}-external-intake-import-report.json`);

  const importReport = await readImportReport(importReportPath);
  if (importReport) {
    const hasImportedSignal = importReport.importedChannelsCount > 0 || importReport.appliedChanges.length > 0;
    return {
      status: hasImportedSignal
        ? importReport.dryRun ? "dry_run_available" : "imported"
        : "template_generated_unfilled",
      inputPath: importReport.inputPath,
      importReportPath,
      importedChannelsCount: importReport.importedChannelsCount,
      importedPlansCount: importReport.importedPlansCount,
      appliedChangesCount: importReport.appliedChanges.length,
      skippedChangesCount: importReport.skippedChanges.length,
      warnings: [
        ...importReport.validationWarnings.map((warning) => warning.message),
        ...importReport.dataQualityWarnings.map((warning) => warning.message)
      ],
      summary: hasImportedSignal
        ? importReport.summary
        : "已生成填报模板，但尚未填写真实外部渠道数据"
    };
  }

  if (await pathExists(inputPath)) {
    const readResult = await readExternalIntakeInput(inputPath);
    const hasSignal = readResult.input.planResults.some(hasExternalIntakeRecordSignal);
    const plans = unique(readResult.input.planResults.map((record) => record.targetPlanId));
    const channels = unique(readResult.input.planResults.map((record) => record.channel));
    return {
      status: hasSignal ? "input_filled_not_imported" : "template_generated_unfilled",
      inputPath,
      ...(await pathExists(templatePath) ? { templatePath } : {}),
      importedChannelsCount: 0,
      importedPlansCount: 0,
      appliedChangesCount: 0,
      skippedChangesCount: 0,
      warnings: readResult.warnings.map((warning) => warning.message),
      summary: hasSignal
        ? `External intake input contains user-filled data for ${channels.length} channels and ${plans.length} plans, but has not been imported.`
        : "已生成填报模板，但尚未填写真实外部渠道数据"
    };
  }

  if (await pathExists(templatePath)) {
    return {
      status: "template_generated_unfilled",
      templatePath,
      importedChannelsCount: 0,
      importedPlansCount: 0,
      appliedChangesCount: 0,
      skippedChangesCount: 0,
      warnings: [],
      summary: "已生成填报模板，但尚未填写真实外部渠道数据"
    };
  }

  return {
    status: "not_generated",
    importedChannelsCount: 0,
    importedPlansCount: 0,
    appliedChangesCount: 0,
    skippedChangesCount: 0,
    warnings: [],
    summary: "External intake template has not been generated."
  };
}

export function hasExternalIntakeRecordSignal(record: EbosExternalChannelRecord) {
  return NUMERIC_FIELDS.some((field) => (record[field] ?? 0) > 0)
    || Boolean(record.url?.trim())
    || Boolean(record.notes?.trim())
    || Boolean(record.userFeedback?.some((item) => item.trim().length > 0));
}

function splitMarkdownRow(line: string | string[]) {
  if (Array.isArray(line)) return line;
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeChannel(value: unknown): EbosExternalChannel {
  return typeof value === "string" && VALID_CHANNELS.has(value as EbosExternalChannel)
    ? value as EbosExternalChannel
    : "other";
}

function uniqueChannels(records: EbosExternalChannelRecord[]) {
  return unique(records.map((record) => record.channel));
}

function normalizeWarnings(value: unknown): EbosExternalIntakeWarning[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const raw = toRecord(item);
    const message = readString(raw.message);
    if (!message) return [];
    return [{
      code: readString(raw.code) ?? "external_intake_warning",
      severity: raw.severity === "critical" || raw.severity === "info" ? raw.severity : "warning",
      message,
      ...(readString(raw.planId) ? { planId: readString(raw.planId) } : {}),
      ...(readString(raw.source) ? { source: readString(raw.source) } : {}),
      ...(readString(raw.field) ? { field: readString(raw.field) } : {})
    }];
  });
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.split(/[;\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function inferDateFromPath(filePath: string) {
  return filePath.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

async function readImportReport(filePath: string) {
  try {
    const report = JSON.parse(await readFile(filePath, "utf8")) as EbosExternalIntakeImportResult;
    return typeof report.targetDate === "string" ? report : null;
  } catch {
    return null;
  }
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function unique<T>(values: T[]) {
  return [...new Set(values.filter(Boolean))];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
