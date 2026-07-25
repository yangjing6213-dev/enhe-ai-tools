import { createHash, timingSafeEqual } from "node:crypto";

type WorkerAuthEnv = Record<string, string | undefined>;

export type WorkerRequestErrorCode =
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INVALID_JSON"
  | "PAYLOAD_TOO_LARGE";

export class WorkerRequestError extends Error {
  readonly code: WorkerRequestErrorCode;

  constructor(code: WorkerRequestErrorCode) {
    super(code);
    this.name = "WorkerRequestError";
    this.code = code;
  }
}

function readConfiguredToken(value: string | undefined) {
  const token = value?.trim();
  if (!token || token.length < 24 || token.length > 512 || /\s/.test(token)) {
    return null;
  }
  return token;
}

function readBearerToken(header: string | null) {
  if (!header) return null;
  const match = /^Bearer ([^\s]{24,512})$/.exec(header);
  return match?.[1] ?? null;
}

function digestToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest();
}

function constantTimeTokenMatch(candidate: string, configured: string) {
  return timingSafeEqual(digestToken(candidate), digestToken(configured));
}

export function verifyWorkerAuthorization(
  authorization: string | null,
  env: WorkerAuthEnv = process.env,
) {
  const current = readConfiguredToken(env.AUDIT_WORKER_TOKEN_CURRENT);
  const candidate = readBearerToken(authorization);
  if (!current || !candidate) return false;

  const previous = readConfiguredToken(env.AUDIT_WORKER_TOKEN_PREVIOUS);
  const currentMatch = constantTimeTokenMatch(candidate, current) ? 1 : 0;
  const previousMatch = constantTimeTokenMatch(
    candidate,
    previous ?? "0".repeat(32),
  )
    ? 1
    : 0;

  return (currentMatch | (previous ? previousMatch : 0)) === 1;
}

export async function readBoundedJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new WorkerRequestError("UNSUPPORTED_MEDIA_TYPE");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new WorkerRequestError("PAYLOAD_TOO_LARGE");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new WorkerRequestError("PAYLOAD_TOO_LARGE");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new WorkerRequestError("INVALID_JSON");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new WorkerRequestError("PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return JSON.parse(text) as unknown;
  } catch {
    throw new WorkerRequestError("INVALID_JSON");
  }
}

const stableWorkerErrorStatuses: Record<string, number> = {
  UNSUPPORTED_MEDIA_TYPE: 415,
  INVALID_JSON: 400,
  PAYLOAD_TOO_LARGE: 413,
  INVALID_REPORT_BUNDLE: 400,
  REPORT_TOO_LARGE: 413,
  ARTIFACT_STORAGE_UNAVAILABLE: 503,
  ARTIFACT_UPLOAD_FAILED: 503,
  JOB_NOT_FOUND: 404,
  JOB_CANCELLED: 409,
  JOB_STATE_CONFLICT: 409,
  LEASE_INVALID: 409,
  LEASE_EXPIRED: 409,
  ENTITLEMENT_UNAVAILABLE: 409,
  ORDER_NOT_ELIGIBLE: 409,
  IP_DAILY_LIMIT: 429,
  ORIGIN_DAILY_LIMIT: 429,
  QUEUE_CAPACITY_REACHED: 429,
  PUBLIC_TOKEN_ACTIVE: 409,
  CONFIGURATION_ERROR: 503,
};

export function workerJsonResponse(
  payload: Record<string, unknown>,
  status = 200,
) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function workerUnauthorizedResponse() {
  return workerJsonResponse({ ok: false, code: "UNAUTHORIZED" }, 401);
}

function readStableErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function handleWorkerRouteError(error: unknown) {
  const code = readStableErrorCode(error);
  if (code && stableWorkerErrorStatuses[code]) {
    return workerJsonResponse(
      { ok: false, code },
      stableWorkerErrorStatuses[code],
    );
  }

  console.error("SEO audit worker route failed.");
  return workerJsonResponse({ ok: false, code: "INTERNAL_ERROR" }, 500);
}
