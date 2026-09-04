import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosExternalPublishChannelResult,
  EbosExternalPublishingChannel,
  EbosExternalPublishingStatusSummary,
  EbosExternalPublishResultInput,
  EbosExternalPublishValidationResult
} from "./external-publishing-types";

const VALID_CHANNELS = new Set<EbosExternalPublishingChannel>([
  "xianyu",
  "taobao",
  "whop",
  "xiaohongshu",
  "wechat",
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

export function validateExternalPublishResultInput(input: unknown): EbosExternalPublishValidationResult {
  const normalized = normalizeExternalPublishResultInput(input);
  const warnings: string[] = [...normalized.warnings];
  const blockers: string[] = [];

  for (const result of normalized.channelResults) {
    const prefix = `${result.channel}:`;

    if (result.published && !result.publishedUrl?.trim()) {
      warnings.push(`${prefix} published=true but publishedUrl is empty.`);
    }
    if (result.revenue > 0 && result.paidOrders === 0) {
      warnings.push(`${prefix} revenue is greater than 0 but paidOrders is 0.`);
    }
    if (result.paidOrders > result.orders && result.orders > 0) {
      blockers.push(`${prefix} paidOrders is greater than orders.`);
    }
    if (result.refundCount > result.paidOrders) {
      blockers.push(`${prefix} refundCount is greater than paidOrders.`);
    }
    if (result.refundedAmount > result.revenue) {
      blockers.push(`${prefix} refundedAmount is greater than revenue.`);
    }
    if (result.clicks > result.views && result.views > 0) {
      warnings.push(`${prefix} clicks is greater than views.`);
    }
    if (result.messages > result.views && result.views > 0) {
      warnings.push(`${prefix} messages is greater than views.`);
    }
    if (result.failures.length > 0 && result.published) {
      warnings.push(`${prefix} failures are present, so this channel is not counted as successful publishing.`);
    }
  }

  const total = normalized.channelResults.length;
  const publishedSuccess = normalized.channelResults.filter((result) => result.published && result.failures.length === 0).length;
  const dataSignals = normalized.channelResults.filter(hasRealChannelSignal).length;
  const hasRealSignals = dataSignals > 0;

  return {
    valid: blockers.length === 0,
    publishCoverage: percent(publishedSuccess, total),
    dataCoverage: percent(dataSignals, total),
    hasRealSignals,
    canBackfill: blockers.length === 0 && hasRealSignals,
    warnings,
    blockers
  };
}

export function summarizeExternalPublishResults(input: unknown) {
  const normalized = normalizeExternalPublishResultInput(input);
  const validation = validateExternalPublishResultInput(normalized);
  const publishedChannels = normalized.channelResults
    .filter((result) => result.published && result.failures.length === 0)
    .map((result) => result.channel);
  const channelsWithData = normalized.channelResults
    .filter(hasRealChannelSignal)
    .map((result) => result.channel);

  return {
    ...validation,
    totalChannels: normalized.channelResults.length,
    publishedChannels,
    channelsWithData
  };
}

export function normalizeExternalPublishResultInput(input: unknown): EbosExternalPublishResultInput {
  const raw = toRecord(input);
  const rawResults = Array.isArray(raw.channelResults)
    ? raw.channelResults
    : Array.isArray(raw.results)
      ? raw.results
      : [];
  const channelResults = rawResults.map(normalizeExternalPublishChannelResult);

  return {
    inputType: "external_publish_result_input",
    targetDate: readString(raw.targetDate)?.slice(0, 10) ?? "",
    filledAt: readString(raw.filledAt) ?? null,
    channelResults,
    notes: normalizeStringArray(raw.notes),
    warnings: normalizeStringArray(raw.warnings)
  };
}

export function normalizeExternalPublishChannelResult(input: unknown): EbosExternalPublishChannelResult {
  const raw = toRecord(input);
  const result: EbosExternalPublishChannelResult = {
    channel: normalizeChannel(raw.channel),
    published: raw.published === true,
    publishedAt: readString(raw.publishedAt) ?? null,
    publishedUrl: readString(raw.publishedUrl) ?? null,
    listingTitle: readString(raw.listingTitle) ?? null,
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
    refundedAmount: 0,
    userFeedback: normalizeStringArray(raw.userFeedback),
    notes: readString(raw.notes) ?? "",
    evidence: normalizeStringArray(raw.evidence),
    failures: normalizeStringArray(raw.failures)
  };

  for (const field of NUMERIC_FIELDS) {
    result[field] = readNumber(raw[field]) ?? 0;
  }

  return result;
}

export async function readExternalPublishingStatusForDate(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}): Promise<EbosExternalPublishingStatusSummary> {
  const targetDate = toDateKey(options.targetDate);
  const root = options.reportsRoot ?? "reports/ebos";
  const publishRoot = join(root, "external-publishing");
  const packPath = join(publishRoot, "packs", `${targetDate}-external-publishing-pack.json`);
  const resultInputPath = join(publishRoot, "inputs", `${targetDate}-external-publish-result-input.json`);
  const backfillReportPath = join(publishRoot, "reports", `${targetDate}-external-data-backfill-report.json`);

  const pack = toRecord(await readJson(packPath));
  const input = await readJson(resultInputPath);
  const backfill = await readJson(backfillReportPath);
  const channelsCount = Array.isArray(pack?.channels) ? pack.channels.length : 0;
  const publishAssetsCount = Array.isArray(pack?.publishAssets) ? pack.publishAssets.length : 0;

  if (backfill) {
    const validation = validateExternalPublishResultInput(input);
    const applied = toRecord(backfill).applied === true;
    return {
      status: applied
        ? "backfilled"
        : validation.hasRealSignals
          ? "backfill_dry_run"
          : "waiting_real_data",
      ...(await pathExists(packPath) ? { packPath } : {}),
      ...(await pathExists(resultInputPath) ? { resultInputPath } : {}),
      backfillReportPath,
      channelsCount,
      publishAssetsCount,
      publishCoverage: validation.publishCoverage,
      dataCoverage: validation.dataCoverage,
      hasRealSignals: validation.hasRealSignals,
      canBackfill: validation.canBackfill,
      warnings: validation.warnings,
      blockers: validation.blockers,
      summary: applied
        ? "External publishing data has been applied to the external intake input."
        : validation.hasRealSignals
          ? "External publishing backfill dry-run exists; apply only after reviewing real signals."
          : "External publish result input exists, but no real external data has been recorded yet."
    };
  }

  if (input) {
    const validation = validateExternalPublishResultInput(input);
    return {
      status: validation.blockers.length > 0
        ? "blocked"
        : validation.hasRealSignals
          ? "ready_to_backfill"
          : "waiting_real_data",
      ...(await pathExists(packPath) ? { packPath } : {}),
      resultInputPath,
      channelsCount,
      publishAssetsCount,
      publishCoverage: validation.publishCoverage,
      dataCoverage: validation.dataCoverage,
      hasRealSignals: validation.hasRealSignals,
      canBackfill: validation.canBackfill,
      warnings: validation.warnings,
      blockers: validation.blockers,
      summary: validation.hasRealSignals
        ? "External publish result input contains real observed signals and is ready for dry-run backfill."
        : "External publish result input exists, but no real external data has been recorded yet."
    };
  }

  if (pack) {
    return {
      status: "pack_generated",
      packPath,
      channelsCount,
      publishAssetsCount,
      publishCoverage: 0,
      dataCoverage: 0,
      hasRealSignals: false,
      canBackfill: false,
      warnings: [],
      blockers: [],
      summary: "External publishing pack exists; result input has not been generated or filled."
    };
  }

  return {
    status: "not_generated",
    channelsCount: 0,
    publishAssetsCount: 0,
    publishCoverage: 0,
    dataCoverage: 0,
    hasRealSignals: false,
    canBackfill: false,
    warnings: [],
    blockers: [],
    summary: "External publishing pack has not been generated."
  };
}

export function hasRealChannelSignal(result: EbosExternalPublishChannelResult) {
  return NUMERIC_FIELDS.some((field) => result[field] > 0)
    || result.userFeedback.some((item) => item.trim().length > 0);
}

function normalizeChannel(value: unknown): EbosExternalPublishingChannel {
  return typeof value === "string" && VALID_CHANNELS.has(value as EbosExternalPublishingChannel)
    ? value as EbosExternalPublishingChannel
    : "other";
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
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
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return undefined;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

async function readJson(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
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

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
