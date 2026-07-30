import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANCEL_REQUESTED_POLL_LIMIT,
  POLL_INTERVAL_MS,
  SEO_AUDIT_RUN_STATUS_LABELS,
  classifyPollingHttpStatus,
  createSeoAuditRunPoller,
  getPollingRetryDelay,
  getRunPollingDelay,
  isSeoAuditRunStatus,
  parseSeoAuditRun,
  type SeoAuditRunStatus,
} from "./seo-audit-run-polling";

function summary() {
  return {
    score: 82,
    evidenceCoverage: 91,
    pageCount: 10,
    criticalCount: 0,
    highCount: 1,
    mediumCount: 2,
    findings: [
      {
        id: "F001",
        code: "missing_title",
        severity: "high",
        issue: "Some pages are missing titles.",
      },
    ],
    lockedFindingCount: 2,
  };
}

function run(
  status: SeoAuditRunStatus = "queued",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "run-1",
    status,
    kind: "free",
    origin: "https://example.com",
    summary: status === "completed" ? summary() : null,
    canReadFullReport: false,
    ...overrides,
  };
}

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function callbacks() {
  return {
    onRun: vi.fn(),
    onTemporarilyUnavailable: vi.fn(),
    onAccessError: vi.fn(),
    onCancelPollingPaused: vi.fn(),
  };
}

describe("SEO audit run response parsing", () => {
  it("accepts the complete bounded public DTO", () => {
    expect(parseSeoAuditRun(run("completed"))).toEqual(run("completed"));
    expect(parseSeoAuditRun(run("running"))).toEqual(run("running"));
  });

  it.each([
    null,
    { ...run(), id: "bad id" },
    { ...run(), status: "unknown" },
    { ...run(), kind: "unknown" },
    { ...run(), origin: "https://example.com/path" },
    { ...run(), canReadFullReport: "yes" },
    { ...run("completed"), summary: null },
    { ...run("completed"), summary: { ...summary(), score: 101 } },
    {
      ...run("completed"),
      summary: { ...summary(), evidenceCoverage: 91.5 },
    },
    {
      ...run("completed"),
      summary: {
        ...summary(),
        findings: Array.from({ length: 4 }, (_, index) => ({
          ...summary().findings[0],
          id: `F00${index + 1}`,
        })),
      },
    },
    {
      ...run("completed"),
      summary: {
        ...summary(),
        findings: [{ ...summary().findings[0], id: "private-finding" }],
      },
    },
  ])("rejects a malformed successful payload %#", (payload) => {
    expect(() => parseSeoAuditRun(payload)).toThrow(
      "Invalid audit response.",
    );
  });
});

describe("SEO audit run polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recognizes every backend run status and uses accurate labels", () => {
    for (const status of [
      "queued",
      "running",
      "cancel_requested",
      "cancelled",
      "completed",
      "failed",
    ]) {
      expect(isSeoAuditRunStatus(status)).toBe(true);
    }
    expect(isSeoAuditRunStatus("temporarily_unavailable")).toBe(false);
    expect(SEO_AUDIT_RUN_STATUS_LABELS.cancel_requested).toEqual([
      "取消请求已提交",
      "Cancellation requested",
    ]);
    expect(SEO_AUDIT_RUN_STATUS_LABELS.cancelled).toEqual([
      "已取消",
      "Cancelled",
    ]);
  });

  it("polls queued and running states every two seconds, then stops at completion", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(200, run("queued")))
      .mockResolvedValueOnce(response(200, run("running")))
      .mockResolvedValueOnce(response(200, run("completed")));
    const handlers = callbacks();
    const poller = createSeoAuditRunPoller({ request, ...handlers });

    await poller.start();
    expect(handlers.onRun.mock.calls.map(([value]) => value.status)).toEqual([
      "queued",
    ]);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    expect(handlers.onRun.mock.calls.map(([value]) => value.status)).toEqual([
      "queued",
      "running",
      "completed",
    ]);
    expect(request).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("treats malformed 2xx JSON and transient HTTP failures as bounded retries", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(200, { id: "run-1", status: "completed" }))
      .mockResolvedValueOnce(response(503, { ok: false }))
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(response(200, run("completed")));
    const handlers = callbacks();
    const poller = createSeoAuditRunPoller({ request, ...handlers });

    await poller.start();
    expect(handlers.onRun).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(4_000);
    await vi.advanceTimersByTimeAsync(8_000);

    expect(request).toHaveBeenCalledTimes(4);
    expect(handlers.onRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    );
    expect(handlers.onTemporarilyUnavailable).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("surfaces temporary unavailability after three delayed retries", async () => {
    const request = vi.fn().mockRejectedValue(new Error("network unavailable"));
    const handlers = callbacks();
    const poller = createSeoAuditRunPoller({ request, ...handlers });

    await poller.start();
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(4_000);
    await vi.advanceTimersByTimeAsync(8_000);

    expect(request).toHaveBeenCalledTimes(4);
    expect(handlers.onTemporarilyUnavailable).toHaveBeenCalledTimes(1);
    expect(handlers.onRun).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [401, "authentication_required"],
    [403, "access_denied"],
    [404, "access_denied"],
    [400, "request_failed"],
  ] as const)(
    "stops deterministic HTTP %i responses as %s",
    async (status, disposition) => {
      const request = vi.fn().mockResolvedValue(response(status, {}));
      const handlers = callbacks();
      const poller = createSeoAuditRunPoller({ request, ...handlers });

      await poller.start();

      expect(handlers.onAccessError).toHaveBeenCalledWith(disposition);
      expect(handlers.onTemporarilyUnavailable).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("bounds cancellation polling and lets the user retry manually", async () => {
    const request = vi.fn();
    for (let index = 0; index < CANCEL_REQUESTED_POLL_LIMIT; index += 1) {
      request.mockResolvedValueOnce(response(200, run("cancel_requested")));
    }
    request.mockResolvedValueOnce(response(200, run("cancelled")));
    const handlers = callbacks();
    const poller = createSeoAuditRunPoller({ request, ...handlers });

    await poller.start();
    for (let index = 1; index < CANCEL_REQUESTED_POLL_LIMIT; index += 1) {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    }

    expect(request).toHaveBeenCalledTimes(CANCEL_REQUESTED_POLL_LIMIT);
    expect(handlers.onCancelPollingPaused).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    await poller.retry();
    expect(request).toHaveBeenCalledTimes(CANCEL_REQUESTED_POLL_LIMIT + 1);
    expect(handlers.onRun).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("clears scheduled work and aborts an in-flight request when stopped", async () => {
    const request = vi.fn((signal: AbortSignal) => {
      return new Promise<ReturnType<typeof response>>((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      });
    });
    const handlers = callbacks();
    const poller = createSeoAuditRunPoller({ request, ...handlers });

    const pending = poller.start();
    poller.stop();
    await pending;
    await vi.advanceTimersByTimeAsync(60_000);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0].aborted).toBe(true);
    expect(handlers.onRun).not.toHaveBeenCalled();
    expect(handlers.onTemporarilyUnavailable).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps delay and HTTP classifiers explicit", () => {
    expect([1, 2, 3, 4].map(getPollingRetryDelay)).toEqual([
      2_000,
      4_000,
      8_000,
      null,
    ]);
    expect(getRunPollingDelay("queued", 0)).toBe(POLL_INTERVAL_MS);
    expect(getRunPollingDelay("running", 0)).toBe(POLL_INTERVAL_MS);
    expect(
      getRunPollingDelay(
        "cancel_requested",
        CANCEL_REQUESTED_POLL_LIMIT,
      ),
    ).toBeNull();
    expect(getRunPollingDelay("completed", 0)).toBeNull();
    for (const status of [408, 429, 500, 502, 503]) {
      expect(classifyPollingHttpStatus(status)).toBe("retryable");
    }
  });
});
