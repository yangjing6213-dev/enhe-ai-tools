import { Prisma, type ApiUsageBillingStatus, type ApiUsageLog } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type UsageLogRange = "24h" | "7d" | "30d";

export type UsageLogSearchParams = Record<string, string | string[] | undefined>;

export type UsageLogListItem = {
  id: string;
  requestId: string;
  createdAt: Date;
  method: string;
  path: string;
  model: string | null;
  publicModelName: string | null;
  keyPrefix: string;
  statusCode: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: string;
  chargedUsd: string;
  latencyMs: number | null;
  isStream: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

export type UsageLogKeyOption = {
  id: string;
  name: string;
  keyPrefix: string;
};

export type UsageLogFilters = {
  requestId: string;
  path: string;
  model: string;
  statusCode: string;
  apiKeyId: string;
  range: UsageLogRange;
  page: number;
  pageSize: number;
};

export type UsageLogListResult = {
  items: UsageLogListItem[];
  filters: UsageLogFilters;
  keyOptions: UsageLogKeyOption[];
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type ApiKeyTodayUsage = {
  requestCount: number;
  usageUsd: number;
};

type DecimalLike = string | number | Prisma.Decimal;

export type CreateUsageLogInput = {
  requestId: string;
  userId: string;
  developerProfileId: string;
  apiKeyId?: string | null;
  keyPrefix: string;
  method: string;
  path: string;
  model?: string | null;
  publicModelName?: string | null;
  upstreamProvider?: string | null;
  upstreamModel?: string | null;
  statusCode: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd?: DecimalLike;
  chargedUsd?: DecimalLike;
  latencyMs?: number | null;
  isStream?: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  clientIpHash?: string | null;
  userAgentHash?: string | null;
  billingStatus?: ApiUsageBillingStatus;
  streamFinishReason?: string | null;
  upstreamRequestIdHash?: string | null;
  routeId?: string | null;
  walletTransactionId?: string | null;
  createdAt?: Date;
};

export type CreateUsageLogResult =
  | { ok: true; created: boolean; log: UsageLogListItem }
  | { ok: false; code: "validation_error" | "create_failed"; message: string };

const defaultRange: UsageLogRange = "24h";
const defaultPageSize = 20;
const maxPageSize = 50;
const allowedRanges: UsageLogRange[] = ["24h", "7d", "30d"];
const fullApiKeyPattern = /^enhe_sk_live_[A-Za-z0-9_-]{24,}$/;
const sensitiveApiKeyPattern = /enhe_sk_live_[A-Za-z0-9_-]{24,}/g;
const bearerPattern = /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi;
const genericSecretPattern = /\b(?:sk|api[_-]?key|token|secret)[=:]\s*["']?[^"'\s,;]{12,}/gi;

export async function listUsageLogsForCurrentUser(searchParams: UsageLogSearchParams = {}): Promise<UsageLogListResult> {
  const user = await requireUser();
  const filters = parseUsageLogFilters(searchParams);
  const rangeStart = getRangeStart(filters.range);

  const keyOptions = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, keyPrefix: true }
  });
  const allowedKeyIds = new Set(keyOptions.map((key) => key.id));

  const where: Prisma.ApiUsageLogWhereInput = {
    userId: user.id,
    createdAt: { gte: rangeStart }
  };

  if (filters.requestId) where.requestId = filters.requestId;
  if (filters.path) where.path = { contains: filters.path, mode: "insensitive" };
  if (filters.model) {
    where.OR = [
      { model: { contains: filters.model, mode: "insensitive" } },
      { publicModelName: { contains: filters.model, mode: "insensitive" } }
    ];
  }
  if (filters.statusCode) where.statusCode = Number(filters.statusCode);
  if (filters.apiKeyId) {
    where.apiKeyId = allowedKeyIds.has(filters.apiKeyId) ? filters.apiKeyId : "__not_current_user_key__";
  }

  const totalCount = await prisma.apiUsageLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const page = Math.min(filters.page, totalPages);

  const items = await prisma.apiUsageLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * filters.pageSize,
    take: filters.pageSize
  });

  return {
    items: items.map(mapUsageLogListItem),
    filters: { ...filters, page },
    keyOptions,
    totalCount,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages
  };
}

export async function getTodayApiKeyUsageForUser(userId: string, apiKeyIds: string[]): Promise<Map<string, ApiKeyTodayUsage>> {
  if (apiKeyIds.length === 0) return new Map();

  const rows = await prisma.apiUsageLog.groupBy({
    by: ["apiKeyId"],
    where: {
      userId,
      apiKeyId: { in: apiKeyIds },
      createdAt: { gte: getUtc8DayStart() }
    },
    _count: { _all: true },
    _sum: { chargedUsd: true }
  });

  const usageByKey = new Map<string, ApiKeyTodayUsage>();
  for (const row of rows) {
    if (!row.apiKeyId) continue;
    usageByKey.set(row.apiKeyId, {
      requestCount: row._count._all,
      usageUsd: decimalToNumber(row._sum.chargedUsd)
    });
  }
  return usageByKey;
}

export async function createUsageLog(input: CreateUsageLogInput): Promise<CreateUsageLogResult> {
  const validation = validateCreateUsageLogInput(input);
  if (!validation.ok) return validation;

  try {
    const created = await prisma.apiUsageLog.create({
      data: validation.data
    });

    return { ok: true, created: true, log: mapUsageLogListItem(created) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.apiUsageLog.findUnique({
        where: { requestId: validation.data.requestId }
      });
      if (existing) return { ok: true, created: false, log: mapUsageLogListItem(existing) };
    }

    return { ok: false, code: "create_failed", message: "Usage log create failed." };
  }
}

function parseUsageLogFilters(searchParams: UsageLogSearchParams): UsageLogFilters {
  const range = normalizeRange(getParam(searchParams, "range"));
  const page = normalizePositiveInt(getParam(searchParams, "page"), 1, 1, 100000);
  const pageSize = normalizePositiveInt(getParam(searchParams, "page_size"), defaultPageSize, 1, maxPageSize);
  const statusCode = normalizeStatusCode(getParam(searchParams, "status_code"));

  return {
    requestId: normalizeTextFilter(getParam(searchParams, "request_id"), 128),
    path: normalizeTextFilter(getParam(searchParams, "path"), 160),
    model: normalizeTextFilter(getParam(searchParams, "model"), 128),
    statusCode,
    apiKeyId: normalizeTextFilter(getParam(searchParams, "api_key_id"), 128),
    range,
    page,
    pageSize
  };
}

function validateCreateUsageLogInput(input: CreateUsageLogInput):
  | { ok: true; data: Prisma.ApiUsageLogUncheckedCreateInput }
  | { ok: false; code: "validation_error"; message: string } {
  const requestId = normalizeTextFilter(input.requestId, 128);
  const userId = normalizeTextFilter(input.userId, 128);
  const developerProfileId = normalizeTextFilter(input.developerProfileId, 128);
  const method = normalizeTextFilter(input.method, 16).toUpperCase();
  const path = normalizeTextFilter(input.path, 200);
  const statusCode = Number(input.statusCode);

  if (!requestId || !userId || !developerProfileId || !method || !path) {
    return { ok: false, code: "validation_error", message: "Required usage log metadata is missing." };
  }
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
    return { ok: false, code: "validation_error", message: "Usage log status code is invalid." };
  }

  let costUsd: Prisma.Decimal;
  let chargedUsd: Prisma.Decimal;
  try {
    costUsd = toDecimal(input.costUsd);
    chargedUsd = toDecimal(input.chargedUsd);
  } catch {
    return { ok: false, code: "validation_error", message: "Usage log amount is invalid." };
  }

  return {
    ok: true,
    data: {
      requestId,
      userId,
      developerProfileId,
      apiKeyId: normalizeNullableText(input.apiKeyId, 128),
      keyPrefix: normalizeKeyPrefix(input.keyPrefix),
      method,
      path,
      model: normalizeNullableText(input.model, 128),
      publicModelName: normalizeNullableText(input.publicModelName, 128),
      upstreamProvider: normalizeNullableText(input.upstreamProvider, 80),
      upstreamModel: normalizeNullableText(input.upstreamModel, 128),
      statusCode,
      inputTokens: normalizeNonNegativeInt(input.inputTokens),
      outputTokens: normalizeNonNegativeInt(input.outputTokens),
      cacheReadTokens: normalizeNonNegativeInt(input.cacheReadTokens),
      cacheWriteTokens: normalizeNonNegativeInt(input.cacheWriteTokens),
      costUsd,
      chargedUsd,
      latencyMs: normalizeNullableNonNegativeInt(input.latencyMs),
      isStream: Boolean(input.isStream),
      errorCode: normalizeNullableText(input.errorCode, 80),
      errorMessage: sanitizeErrorMessage(input.errorMessage),
      clientIpHash: normalizeNullableText(input.clientIpHash, 128),
      userAgentHash: normalizeNullableText(input.userAgentHash, 128),
      billingStatus: input.billingStatus ?? "not_billable",
      streamFinishReason: normalizeNullableText(input.streamFinishReason, 80),
      upstreamRequestIdHash: normalizeNullableText(input.upstreamRequestIdHash, 128),
      routeId: normalizeNullableText(input.routeId, 128),
      walletTransactionId: normalizeNullableText(input.walletTransactionId, 128),
      createdAt: input.createdAt
    }
  };
}

function mapUsageLogListItem(log: ApiUsageLog): UsageLogListItem {
  return {
    id: log.id,
    requestId: log.requestId,
    createdAt: log.createdAt,
    method: log.method,
    path: log.path,
    model: log.model,
    publicModelName: log.publicModelName,
    keyPrefix: log.keyPrefix,
    statusCode: log.statusCode,
    inputTokens: log.inputTokens,
    outputTokens: log.outputTokens,
    cacheReadTokens: log.cacheReadTokens,
    cacheWriteTokens: log.cacheWriteTokens,
    costUsd: decimalToString(log.costUsd),
    chargedUsd: decimalToString(log.chargedUsd),
    latencyMs: log.latencyMs,
    isStream: log.isStream,
    errorCode: log.errorCode,
    errorMessage: sanitizeErrorMessage(log.errorMessage)
  };
}

function getParam(searchParams: UsageLogSearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRange(value: string | undefined): UsageLogRange {
  return allowedRanges.includes(value as UsageLogRange) ? (value as UsageLogRange) : defaultRange;
}

function normalizePositiveInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function normalizeStatusCode(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 599) return "";
  return String(parsed);
}

function normalizeTextFilter(value: string | undefined | null, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeNullableText(value: string | undefined | null, maxLength: number) {
  const normalized = normalizeTextFilter(value, maxLength);
  return normalized || null;
}

function normalizeKeyPrefix(value: string) {
  const normalized = normalizeTextFilter(value, 96);
  if (fullApiKeyPattern.test(normalized)) {
    return `${normalized.slice(0, "enhe_sk_live_".length + 4)}...${normalized.slice(-4)}`;
  }
  return redactSensitiveText(normalized).slice(0, 96) || "unknown";
}

function normalizeNonNegativeInt(value: number | undefined) {
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || value < 0) return 0;
  return value;
}

function normalizeNullableNonNegativeInt(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

function sanitizeErrorMessage(value: string | null | undefined) {
  const normalized = normalizeTextFilter(value, 500);
  return normalized ? redactSensitiveText(normalized) : null;
}

function redactSensitiveText(value: string) {
  return value
    .replace(sensitiveApiKeyPattern, "[REDACTED_API_KEY]")
    .replace(bearerPattern, "Bearer [REDACTED]")
    .replace(genericSecretPattern, "[REDACTED_SECRET]");
}

function toDecimal(value: DecimalLike | undefined) {
  if (value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(8);
}

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value ? value.toNumber() : 0;
}

function getRangeStart(range: UsageLogRange, now = new Date()) {
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function getUtc8DayStart(now = new Date()) {
  const offsetMs = 8 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() + offsetMs);
  const shiftedDayStart = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(shiftedDayStart - offsetMs);
}
