import React, { type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/online-tools/seo-geo-audit/actions", () => ({
  purchaseSeoAuditAction: vi.fn(),
}));
vi.mock("@/components/analytics-tracker", () => ({
  trackClientAnalyticsEvent: vi.fn(),
}));

import * as pollingModule from "./seo-audit-run-polling";
import * as toolModule from "./seo-audit-tool";

type PollResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type PollerOptions = {
  request(signal: AbortSignal): Promise<PollResponse>;
  onRun(run: AuditRun): void;
  onTemporarilyUnavailable(): void;
  onAccessError(kind: string): void;
  onCancelPollingPaused(): void;
};

type AuditRun = {
  id: string;
  status: string;
  kind: string;
  origin: string;
  summary: Summary | null;
  canReadFullReport: boolean;
};

type Summary = {
  score: number;
  evidenceCoverage: number;
  pageCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  findings: Array<{
    id: string;
    code: string;
    severity: string;
    issue: string;
  }>;
  lockedFindingCount: number;
};

type Poller = {
  start(): Promise<void>;
  retry(): Promise<void>;
  stop(): void;
};

type PollerFactory = (options: PollerOptions) => Poller;
type RunParser = (value: unknown) => AuditRun;
type AccessMessage = (kind: string, locale: "zh" | "en") => string;

const validSummary: Summary = {
  score: 82,
  evidenceCoverage: 95,
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

function response(payload: unknown, status = 200): PollResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function validRun(overrides: Partial<AuditRun> = {}): AuditRun {
  return {
    id: "run-1",
    status: "completed",
    kind: "professional",
    origin: "https://example.com",
    summary: validSummary,
    canReadFullReport: true,
    ...overrides,
  };
}

function getRunParser() {
  return (pollingModule as unknown as { parseSeoAuditRun?: RunParser })
    .parseSeoAuditRun;
}

function getPollerFactory() {
  return (
    pollingModule as unknown as {
      createSeoAuditRunPoller?: PollerFactory;
    }
  ).createSeoAuditRunPoller;
}

function getAccessMessage() {
  return (
    pollingModule as unknown as {
      getPollingAccessErrorMessage?: AccessMessage;
    }
  ).getPollingAccessErrorMessage;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SEO audit run response parsing", () => {
  it("validates every field read by the component and bounds completed summaries", () => {
    const parseRun = getRunParser();
    expect(parseRun).toBeTypeOf("function");
    if (!parseRun) return;

    expect(
      parseRun({
        id: "run-queued",
        status: "queued",
        kind: "free",
        origin: "https://example.com",
        canReadFullReport: false,
      }),
    ).toMatchObject({ status: "queued", summary: null });
    expect(parseRun(validRun())).toEqual(validRun());

    const invalidRuns = [
      { id: "run-1", status: "running" },
      { ...validRun(), kind: "unknown" },
      { ...validRun(), origin: "not-a-public-origin" },
      { ...validRun(), canReadFullReport: "yes" },
      { ...validRun(), summary: null },
      { ...validRun(), summary: { ...validSummary, score: 101 } },
      {
        ...validRun(),
        summary: {
          ...validSummary,
          findings: Array.from({ length: 4 }, (_, index) => ({
            id: `F00${index + 1}`,
            code: "missing_title",
            severity: "high",
            issue: "Some pages are missing titles.",
          })),
        },
      },
      {
        ...validRun(),
        summary: {
          ...validSummary,
          findings: [
            { ...validSummary.findings[0], severity: "urgent" },
          ],
        },
      },
    ];

    for (const run of invalidRuns) {
      expect(() => parseRun(run)).toThrow("Invalid audit response.");
    }
  });
});

describe("SEO audit run polling state machine", () => {
  it("backs off across network, JSON, and structural failures before becoming temporarily unavailable", async () => {
    vi.useFakeTimers();
    const createPoller = getPollerFactory();
    expect(createPoller).toBeTypeOf("function");
    if (!createPoller) return;

    const request = vi
      .fn<PollerOptions["request"]>()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      })
      .mockResolvedValueOnce(response({ id: "run-1", status: "running" }))
      .mockResolvedValueOnce(
        response(validRun({ summary: { ...validSummary, pageCount: 5_001 } })),
      );
    const onRun = vi.fn();
    const onTemporarilyUnavailable = vi.fn();
    const poller = createPoller({
      request,
      onRun,
      onTemporarilyUnavailable,
      onAccessError: vi.fn(),
      onCancelPollingPaused: vi.fn(),
    });

    await poller.start();
    expect(request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(request).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(8_000);

    expect(request).toHaveBeenCalledTimes(4);
    expect(onRun).not.toHaveBeenCalled();
    expect(onTemporarilyUnavailable).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    poller.stop();
  });

  it("stops on access errors and gives 403 and 404 the same generic copy", async () => {
    vi.useFakeTimers();
    const createPoller = getPollerFactory();
    const accessMessage = getAccessMessage();
    expect(createPoller).toBeTypeOf("function");
    expect(accessMessage).toBeTypeOf("function");
    if (!createPoller || !accessMessage) return;

    const messages = new Map<number, string>();
    for (const status of [401, 403, 404]) {
      const request = vi.fn(async () => response(null, status));
      const poller = createPoller({
        request,
        onRun: vi.fn(),
        onTemporarilyUnavailable: vi.fn(),
        onAccessError: (kind) => {
          messages.set(status, accessMessage(kind, "zh"));
        },
        onCancelPollingPaused: vi.fn(),
      });

      await poller.start();
      expect(request).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
      poller.stop();
    }

    expect(messages.get(401)).toContain("登录");
    expect(messages.get(403)).toBe(messages.get(404));
    expect(messages.get(403)).not.toContain("不存在");
  });

  it("starts a fresh request when the user retries an unavailable status", async () => {
    vi.useFakeTimers();
    const createPoller = getPollerFactory();
    expect(createPoller).toBeTypeOf("function");
    if (!createPoller) return;

    const request = vi.fn<PollerOptions["request"]>();
    request.mockRejectedValue(new TypeError("offline"));
    const onRun = vi.fn();
    const onTemporarilyUnavailable = vi.fn();
    const poller = createPoller({
      request,
      onRun,
      onTemporarilyUnavailable,
      onAccessError: vi.fn(),
      onCancelPollingPaused: vi.fn(),
    });

    await poller.start();
    await vi.advanceTimersByTimeAsync(2_000 + 4_000 + 8_000);
    expect(request).toHaveBeenCalledTimes(4);
    expect(onTemporarilyUnavailable).toHaveBeenCalledOnce();

    request.mockReset();
    request.mockResolvedValue(
      response(
        validRun({
          status: "cancelled",
          summary: null,
          canReadFullReport: false,
        }),
      ),
    );
    await poller.retry();

    expect(request).toHaveBeenCalledOnce();
    expect(onRun).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
    expect(vi.getTimerCount()).toBe(0);
    poller.stop();
  });

  it("bounds cancel-requested polling and then exposes manual retry", async () => {
    vi.useFakeTimers();
    const createPoller = getPollerFactory();
    expect(createPoller).toBeTypeOf("function");
    if (!createPoller) return;

    const request = vi.fn(async () =>
      response(
        validRun({
          status: "cancel_requested",
          summary: null,
          canReadFullReport: false,
        }),
      ),
    );
    const onCancelPollingPaused = vi.fn();
    const poller = createPoller({
      request,
      onRun: vi.fn(),
      onTemporarilyUnavailable: vi.fn(),
      onAccessError: vi.fn(),
      onCancelPollingPaused,
    });

    await poller.start();
    await vi.advanceTimersByTimeAsync(
      pollingModule.POLL_INTERVAL_MS *
        (pollingModule.CANCEL_REQUESTED_POLL_LIMIT - 1),
    );

    expect(request).toHaveBeenCalledTimes(
      pollingModule.CANCEL_REQUESTED_POLL_LIMIT,
    );
    expect(onCancelPollingPaused).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    poller.stop();
  });
});

describe("SEO audit result panels", () => {
  it("does not render paid plans, reports, downloads, or recheck actions for cancelled runs", () => {
    vi.stubGlobal("React", React);
    const Panels = (
      toolModule as unknown as {
        SeoAuditRunPanels?: ComponentType<Record<string, unknown>>;
      }
    ).SeoAuditRunPanels;
    expect(Panels).toBeTypeOf("function");
    if (!Panels) return;

    const commonProps = {
      locale: "en",
      recoveryToken: "public-token",
      csrfToken: "csrf-token",
      offers: [],
      isAuthenticated: true,
      report: null,
      busy: null,
      ownerError: "",
      onLoad: vi.fn(),
      onRecheck: vi.fn(),
    };
    const completedHtml = renderToStaticMarkup(
      React.createElement(Panels, {
        ...commonProps,
        status: "completed",
        run: validRun({ kind: "free" }),
      }),
    );
    const cancelledHtml = renderToStaticMarkup(
      React.createElement(Panels, {
        ...commonProps,
        status: "cancelled",
        run: validRun({
          status: "cancelled",
          kind: "free",
          summary: null,
          canReadFullReport: true,
        }),
      }),
    );

    expect(completedHtml).toContain("Unlock the owner report");
    expect(completedHtml).toContain("Open report");
    expect(completedHtml).toContain("/download?format=json");
    expect(completedHtml).toContain("Recheck");
    expect(cancelledHtml).not.toContain("Unlock the owner report");
    expect(cancelledHtml).not.toContain("Open report");
    expect(cancelledHtml).not.toContain("/download?");
    expect(cancelledHtml).not.toContain("Recheck");
  });
});

describe("SEO audit sample report", () => {
  it("shows localized customer-facing finding copy instead of an internal code", () => {
    vi.stubGlobal("React", React);
    const commonProps = {
      isAuthenticated: false,
      csrfToken: "csrf-token",
      offers: [],
    };
    const zhHtml = renderToStaticMarkup(
      React.createElement(toolModule.SeoAuditTool, {
        ...commonProps,
        locale: "zh",
      }),
    );
    const enHtml = renderToStaticMarkup(
      React.createElement(toolModule.SeoAuditTool, {
        ...commonProps,
        locale: "en",
      }),
    );

    expect(zhHtml).toContain("缺少 Meta Description");
    expect(enHtml).toContain("Missing meta description");
    expect(zhHtml).not.toContain("missing_meta_description");
    expect(enHtml).not.toContain("missing_meta_description");
  });
});
