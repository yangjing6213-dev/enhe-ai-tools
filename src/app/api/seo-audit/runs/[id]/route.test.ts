import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashSeoAuditPublicToken } from "@/lib/seo-audit/public-access";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    seoAuditRun: { findUnique: mocks.findUnique },
  },
}));

import { GET } from "./route";

const token = "public-token-".repeat(3);
const findings = [
  {
    id: "F001",
    code: "missing_title",
    severity: "high",
    issue: "Some pages are missing titles.",
  },
  {
    id: "F002",
    code: "missing_meta_description",
    severity: "medium",
    issue: "Some pages are missing meta descriptions.",
  },
  {
    id: "F003",
    code: "invalid_static_json_ld",
    severity: "medium",
    issue: "Some static JSON-LD blocks could not be parsed.",
  },
];

function run(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    userId: null,
    status: "completed",
    kind: "free",
    normalizedOrigin: "https://example.com",
    pageLimit: 10,
    publicTokenHash: hashSeoAuditPublicToken(token),
    publicTokenExpiresAt: new Date("2026-07-28T00:00:00.000Z"),
    summaryScore: 74,
    summaryEvidenceCoverage: 91,
    summaryPageCount: 10,
    summaryCriticalCount: 0,
    summaryHighCount: 1,
    summaryMediumCount: 3,
    summaryFindings: findings,
    failureCode: null,
    reportJsonKey: "seo-audit/runs/run-1/hash/report.json",
    reportMarkdownKey: "seo-audit/runs/run-1/hash/report.md",
    reportSha256: "a".repeat(64),
    createdAt: new Date("2026-07-27T00:00:00.000Z"),
    completedAt: new Date("2026-07-27T00:03:00.000Z"),
    sourceOrder: null,
    ...overrides,
  };
}

function request(providedToken?: string) {
  return new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1", {
    headers: providedToken ? { "x-seo-audit-token": providedToken } : {},
  });
}

describe("GET /api/seo-audit/runs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T12:00:00.000Z"));
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue(run());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns only the public DTO to an unexpired anonymous token holder", async () => {
    const response = await GET(request(token), {
      params: Promise.resolve({ id: "run-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary.findings).toHaveLength(3);
    expect(payload.canReadFullReport).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const serialized = JSON.stringify(payload);
    for (const forbidden of [
      "publicTokenHash",
      "reportJsonKey",
      "reportMarkdownKey",
      "reportSha256",
      "lease",
      "private/path",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("lets a logged-in owner read status and derives report eligibility server-side", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.findUnique.mockResolvedValue(
      run({
        userId: "user-1",
        kind: "professional",
        sourceOrder: {
          orderStatus: "activated",
          refundRecords: [],
        },
      }),
    );

    const response = await GET(request(), {
      params: Promise.resolve({ id: "run-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.canReadFullReport).toBe(true);
  });

  it("denies expired, invalid, or non-owner access without revealing the run", async () => {
    mocks.findUnique.mockResolvedValueOnce(
      run({ publicTokenExpiresAt: new Date("2026-07-27T12:00:00.000Z") }),
    );
    const expired = await GET(request(token), {
      params: Promise.resolve({ id: "run-1" }),
    });
    const invalid = await GET(request("wrong-token-".repeat(3)), {
      params: Promise.resolve({ id: "run-1" }),
    });
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "user-2" });
    const wrongOwner = await GET(request(), {
      params: Promise.resolve({ id: "run-1" }),
    });

    for (const response of [expired, invalid, wrongOwner]) {
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        ok: false,
        code: "RUN_NOT_FOUND_OR_ACCESS_DENIED",
      });
    }
  });
});
