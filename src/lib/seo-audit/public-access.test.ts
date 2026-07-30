import { describe, expect, it } from "vitest";
import {
  buildSeoAuditRunResponse,
  canReadSeoAuditFullReport,
  hashSeoAuditPublicToken,
  resolveSeoAuditRunAccess,
} from "@/lib/seo-audit/public-access";

const completedRun = {
  id: "run-1",
  userId: "user-1",
  status: "completed",
  kind: "professional",
  targetUrl: "https://example.com/private/path",
  normalizedOrigin: "https://example.com",
  pageLimit: 100,
  summaryScore: 74,
  summaryEvidenceCoverage: 91,
  summaryPageCount: 42,
  summaryCriticalCount: 0,
  summaryHighCount: 1,
  summaryMediumCount: 3,
  summaryFindings: [
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
  ],
  failureCode: null,
  failureMessage: null,
  reportJsonKey: "seo-audit/runs/run-1/hash/report.json",
  reportMarkdownKey: "seo-audit/runs/run-1/hash/report.md",
  reportSha256: "a".repeat(64),
  createdAt: new Date("2026-07-26T00:00:00.000Z"),
  completedAt: new Date("2026-07-26T00:03:00.000Z"),
  sourceOrder: {
    orderStatus: "activated",
    refundRecords: [],
  },
} as const;

describe("SEO audit public access", () => {
  it("hashes public tokens without storing the raw token", () => {
    expect(hashSeoAuditPublicToken("a".repeat(32))).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSeoAuditPublicToken("a".repeat(32))).not.toBe("a".repeat(32));
  });

  it("returns only the allowlisted summary to an anonymous token holder", () => {
    const response = buildSeoAuditRunResponse(completedRun, {
      access: "anonymous",
      publicFindingLimit: 3,
    });

    expect(response).toEqual({
      id: "run-1",
      status: "completed",
      kind: "professional",
      origin: "https://example.com",
      pageLimit: 100,
      createdAt: "2026-07-26T00:00:00.000Z",
      completedAt: "2026-07-26T00:03:00.000Z",
      failure: null,
      summary: {
        score: 74,
        evidenceCoverage: 91,
        pageCount: 42,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 3,
        findings: [
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
        ],
        lockedFindingCount: 1,
      },
      canReadFullReport: false,
    });
    expect(JSON.stringify(response)).not.toContain("reportJsonKey");
    expect(JSON.stringify(response)).not.toContain("private/path");
  });

  it("allows rejected refund requests but blocks pending or completed refunds", () => {
    expect(canReadSeoAuditFullReport(completedRun, "user-1")).toBe(true);
    expect(canReadSeoAuditFullReport(completedRun, "user-2")).toBe(false);
    expect(
      canReadSeoAuditFullReport(
        {
          ...completedRun,
          sourceOrder: {
            orderStatus: "activated",
            refundRecords: [{ status: "pending" }],
          },
        },
        "user-1",
      ),
    ).toBe(false);
    expect(
      canReadSeoAuditFullReport(
        {
          ...completedRun,
          sourceOrder: {
            orderStatus: "activated",
            refundRecords: [{ status: "completed" }],
          },
        },
        "user-1",
      ),
    ).toBe(false);
    expect(
      canReadSeoAuditFullReport(
        {
          ...completedRun,
          sourceOrder: {
            orderStatus: "activated",
            refundRecords: [{ status: "rejected" }],
          },
        },
        "user-1",
      ),
    ).toBe(true);
    expect(
      canReadSeoAuditFullReport(
        {
          ...completedRun,
          sourceOrder: { orderStatus: "refunded", refundRecords: [] },
        },
        "user-1",
      ),
    ).toBe(false);
  });

  it("authorizes either the owner or an unexpired anonymous token", () => {
    const publicToken = "public-token-".repeat(3);
    const run = {
      ...completedRun,
      publicTokenHash: hashSeoAuditPublicToken(publicToken),
      publicTokenExpiresAt: new Date("2026-07-27T00:00:00.000Z"),
    };

    expect(
      resolveSeoAuditRunAccess(run, {
        userId: "user-1",
        token: null,
        now: new Date("2026-07-26T12:00:00.000Z"),
      }),
    ).toBe("owner");
    expect(
      resolveSeoAuditRunAccess(run, {
        userId: null,
        token: publicToken,
        now: new Date("2026-07-26T12:00:00.000Z"),
      }),
    ).toBe("anonymous");
    expect(
      resolveSeoAuditRunAccess(run, {
        userId: null,
        token: publicToken,
        now: new Date("2026-07-27T00:00:00.000Z"),
      }),
    ).toBeNull();
    expect(
      resolveSeoAuditRunAccess(run, {
        userId: "user-2",
        token: "wrong-token-".repeat(3),
        now: new Date("2026-07-26T12:00:00.000Z"),
      }),
    ).toBeNull();
  });

  it("never exposes worker failure details or grants report access from owner status alone", () => {
    const response = buildSeoAuditRunResponse(
      {
        ...completedRun,
        status: "failed",
        failureCode: "WORKER_FETCH_FAILED",
        failureMessage: "GET https://example.com/private/path returned a lease error",
      },
      { access: "owner", canReadFullReport: false },
    );

    expect(response.failure).toEqual({
      code: "AUDIT_FAILED",
      message: "The audit could not be completed.",
    });
    expect(response.canReadFullReport).toBe(false);
    expect(JSON.stringify(response)).not.toContain("private/path");
    expect(JSON.stringify(response)).not.toContain("lease");
  });
});
