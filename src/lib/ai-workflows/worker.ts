import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const AI_WORKFLOW_BATCH_LEASE_MS = 5 * 60 * 1000;
export const AI_WORKFLOW_MAX_BATCH_ATTEMPTS = 5;
export const AI_WORKFLOW_RETRYABLE_BATCH_FAILURE_CODES = [
  "GITHUB_RATE_LIMIT",
  "NETWORK_UNAVAILABLE",
  "SANDBOX_UNAVAILABLE",
  "ARCHIVE_UPLOAD_FAILED",
] as const;

const retryableBatchFailureCodes = new Set<string>(AI_WORKFLOW_RETRYABLE_BATCH_FAILURE_CODES);

export function getAiWorkflowBatchCompletionState(
  readyCandidateCount: number,
  failureCode: string | undefined,
  attemptCount: number,
): "completed" | "paused" | "partial" | "failed" {
  if (readyCandidateCount >= 3) return "completed";
  if (
    failureCode &&
    retryableBatchFailureCodes.has(failureCode) &&
    Number.isSafeInteger(attemptCount) &&
    attemptCount > 0 &&
    attemptCount < AI_WORKFLOW_MAX_BATCH_ATTEMPTS
  ) return "paused";
  return readyCandidateCount > 0 ? "partial" : "failed";
}

type OrderedTopic = { id: string; name: string };

export function getAiWorkflowShanghaiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return value("year") + "-" + value("month") + "-" + value("day");
}

export function isAiWorkflowScheduleDue(scheduleTime: string, now = new Date()) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleTime)) return false;
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return localTime >= scheduleTime;
}

export function selectNextAiWorkflowTopic<T extends OrderedTopic>(
  topics: readonly T[],
  previousBatchCount: number,
) {
  if (!topics.length || !Number.isSafeInteger(previousBatchCount) || previousBatchCount < 0) {
    return null;
  }
  return topics[previousBatchCount % topics.length] ?? null;
}

export function createAiWorkflowLeaseToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAiWorkflowLeaseToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyAiWorkflowLeaseToken(token: string, storedDigest: string | null | undefined) {
  if (!token || !storedDigest || !/^[a-f0-9]{64}$/i.test(storedDigest)) return false;
  const actual = Buffer.from(hashAiWorkflowLeaseToken(token), "hex");
  const expected = Buffer.from(storedDigest, "hex");
  return timingSafeEqual(actual, expected);
}
