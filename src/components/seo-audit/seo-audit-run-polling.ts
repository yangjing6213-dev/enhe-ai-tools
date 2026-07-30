export const POLL_INTERVAL_MS = 2_000;
export const CANCEL_REQUESTED_POLL_LIMIT = 30;

const POLLING_RETRY_DELAYS_MS = [2_000, 4_000, 8_000] as const;
const SEO_AUDIT_RUN_STATUSES = [
  "queued",
  "running",
  "cancel_requested",
  "cancelled",
  "completed",
  "failed",
] as const;
const SEO_AUDIT_RUN_KINDS = [
  "free",
  "professional",
  "deep",
  "recheck",
  "scheduled",
] as const;
const SEO_AUDIT_SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;
const runIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const findingIdPattern = /^F\d{3,}$/;
const findingCodePattern = /^[a-z0-9_]+$/;

export type SeoAuditRunStatus = (typeof SEO_AUDIT_RUN_STATUSES)[number];
export type SeoAuditRunKind = (typeof SEO_AUDIT_RUN_KINDS)[number];
export type SeoAuditSeverity = (typeof SEO_AUDIT_SEVERITIES)[number];

export type SeoAuditFinding = {
  id: string;
  code: string;
  severity: SeoAuditSeverity;
  issue: string;
};

export type SeoAuditRunSummary = {
  score: number;
  evidenceCoverage: number;
  pageCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  findings: SeoAuditFinding[];
  lockedFindingCount: number;
};

export type SeoAuditRun = {
  id: string;
  status: SeoAuditRunStatus;
  kind: SeoAuditRunKind;
  origin: string;
  summary: SeoAuditRunSummary | null;
  canReadFullReport: boolean;
};

export const SEO_AUDIT_RUN_STATUS_LABELS: Record<
  SeoAuditRunStatus,
  readonly [string, string]
> = {
  queued: ["排队中", "Queued"],
  running: ["巡检中", "Running"],
  cancel_requested: ["取消请求已提交", "Cancellation requested"],
  cancelled: ["已取消", "Cancelled"],
  completed: ["已完成", "Completed"],
  failed: ["巡检失败", "Audit failed"],
};

export function isSeoAuditRunStatus(value: unknown): value is SeoAuditRunStatus {
  return (
    typeof value === "string" &&
    (SEO_AUDIT_RUN_STATUSES as readonly string[]).includes(value)
  );
}

export function parseSeoAuditRun(value: unknown): SeoAuditRun {
  if (
    !isObject(value) ||
    typeof value.id !== "string" ||
    !runIdPattern.test(value.id) ||
    !isSeoAuditRunStatus(value.status) ||
    !isSeoAuditRunKind(value.kind) ||
    !isNormalizedHttpOrigin(value.origin) ||
    typeof value.canReadFullReport !== "boolean"
  ) {
    return invalidRun();
  }

  const summary =
    value.summary === null || value.summary === undefined
      ? null
      : parseSeoAuditRunSummary(value.summary);
  if (value.status === "completed" && summary === null) return invalidRun();

  return {
    id: value.id,
    status: value.status,
    kind: value.kind,
    origin: value.origin,
    summary,
    canReadFullReport: value.canReadFullReport,
  };
}

function parseSeoAuditRunSummary(value: unknown): SeoAuditRunSummary {
  if (
    !isObject(value) ||
    !isIntegerBetween(value.score, 0, 100) ||
    !isIntegerBetween(value.evidenceCoverage, 0, 100) ||
    !isIntegerBetween(value.pageCount, 0, 5_000) ||
    !isIntegerBetween(value.criticalCount, 0, 10_000) ||
    !isIntegerBetween(value.highCount, 0, 10_000) ||
    !isIntegerBetween(value.mediumCount, 0, 10_000) ||
    !Array.isArray(value.findings) ||
    value.findings.length > 3 ||
    !isIntegerBetween(value.lockedFindingCount, 0, 30_000)
  ) {
    return invalidRun();
  }

  return {
    score: value.score,
    evidenceCoverage: value.evidenceCoverage,
    pageCount: value.pageCount,
    criticalCount: value.criticalCount,
    highCount: value.highCount,
    mediumCount: value.mediumCount,
    findings: value.findings.map(parseSeoAuditFinding),
    lockedFindingCount: value.lockedFindingCount,
  };
}

function parseSeoAuditFinding(value: unknown): SeoAuditFinding {
  if (
    !isObject(value) ||
    typeof value.id !== "string" ||
    value.id.length > 128 ||
    !findingIdPattern.test(value.id) ||
    typeof value.code !== "string" ||
    value.code.length > 128 ||
    !findingCodePattern.test(value.code) ||
    !isSeoAuditSeverity(value.severity) ||
    typeof value.issue !== "string" ||
    value.issue.length < 1 ||
    value.issue.length > 240
  ) {
    return invalidRun();
  }

  return {
    id: value.id,
    code: value.code,
    severity: value.severity,
    issue: value.issue,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSeoAuditRunKind(value: unknown): value is SeoAuditRunKind {
  return (
    typeof value === "string" &&
    (SEO_AUDIT_RUN_KINDS as readonly string[]).includes(value)
  );
}

function isSeoAuditSeverity(value: unknown): value is SeoAuditSeverity {
  return (
    typeof value === "string" &&
    (SEO_AUDIT_SEVERITIES as readonly string[]).includes(value)
  );
}

function isNormalizedHttpOrigin(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 2_048) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.origin === value
    );
  } catch {
    return false;
  }
}

function isIntegerBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function invalidRun(): never {
  throw new Error("Invalid audit response.");
}

export function getRunPollingDelay(
  status: SeoAuditRunStatus,
  cancelRequestedPollCount: number,
) {
  if (status === "queued" || status === "running") return POLL_INTERVAL_MS;
  if (
    status === "cancel_requested" &&
    cancelRequestedPollCount < CANCEL_REQUESTED_POLL_LIMIT
  ) {
    return POLL_INTERVAL_MS;
  }
  return null;
}

export function getPollingRetryDelay(failureCount: number) {
  return POLLING_RETRY_DELAYS_MS[failureCount - 1] ?? null;
}

export type PollingHttpDisposition =
  | "retryable"
  | "authentication_required"
  | "access_denied"
  | "request_failed";

export type PollingAccessErrorKind = Exclude<
  PollingHttpDisposition,
  "retryable"
>;

export function classifyPollingHttpStatus(
  status: number,
): PollingHttpDisposition {
  if (status === 408 || status === 429 || status >= 500) return "retryable";
  if (status === 401) return "authentication_required";
  if (status === 403 || status === 404) return "access_denied";
  return "request_failed";
}

export function getPollingAccessErrorMessage(
  kind: PollingAccessErrorKind,
  locale: "zh" | "en",
) {
  if (kind === "authentication_required") {
    return locale === "en"
      ? "The audit status is unavailable. Sign in and retry."
      : "暂时无法读取巡检状态，请登录后重试。";
  }
  if (kind === "access_denied") {
    return locale === "en"
      ? "The audit status is unavailable. Use the original browser or owner account and retry."
      : "暂时无法读取巡检状态，请使用原浏览器或所有者账号重试。";
  }
  return locale === "en"
    ? "The audit status is unavailable. Retry the request."
    : "暂时无法读取巡检状态，请重试。";
}

type SeoAuditPollingResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type SeoAuditRunPollerOptions = {
  request(signal: AbortSignal): Promise<SeoAuditPollingResponse>;
  onRun(run: SeoAuditRun): void;
  onTemporarilyUnavailable(): void;
  onAccessError(kind: PollingAccessErrorKind): void;
  onCancelPollingPaused(): void;
};

export type SeoAuditRunPoller = {
  start(): Promise<void>;
  retry(): Promise<void>;
  stop(): void;
};

export function createSeoAuditRunPoller(
  options: SeoAuditRunPollerOptions,
): SeoAuditRunPoller {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let transientFailureCount = 0;
  let cancelRequestedPollCount = 0;
  const controller = new AbortController();

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function schedule(delay: number) {
    timer = setTimeout(() => {
      timer = undefined;
      void poll();
    }, delay);
  }

  async function poll(): Promise<void> {
    let run: SeoAuditRun;
    try {
      const response = await options.request(controller.signal);
      if (!response.ok) {
        const disposition = classifyPollingHttpStatus(response.status);
        if (disposition === "retryable") {
          throw new Error("Retryable audit polling response.");
        }
        if (!stopped) options.onAccessError(disposition);
        return;
      }
      run = parseSeoAuditRun(await response.json());
    } catch {
      if (stopped || controller.signal.aborted) return;
      transientFailureCount += 1;
      const retryDelay = getPollingRetryDelay(transientFailureCount);
      if (retryDelay !== null) {
        schedule(retryDelay);
      } else {
        options.onTemporarilyUnavailable();
      }
      return;
    }

    if (stopped) return;
    transientFailureCount = 0;
    cancelRequestedPollCount =
      run.status === "cancel_requested" ? cancelRequestedPollCount + 1 : 0;
    options.onRun(run);

    const delay = getRunPollingDelay(run.status, cancelRequestedPollCount);
    if (delay !== null) {
      schedule(delay);
    } else if (run.status === "cancel_requested") {
      options.onCancelPollingPaused();
    }
  }

  return {
    start: poll,
    retry() {
      if (stopped) return Promise.resolve();
      clearTimer();
      transientFailureCount = 0;
      cancelRequestedPollCount = 0;
      return poll();
    },
    stop() {
      stopped = true;
      clearTimer();
      controller.abort();
    },
  };
}
