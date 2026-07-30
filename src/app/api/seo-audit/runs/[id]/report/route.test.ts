import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loadRecheck: vi.fn(),
  loadRun: vi.fn(),
  readArtifact: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/seo-audit/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo-audit/public-api")>()),
  loadOwnedSeoAuditReportRun: mocks.loadRun,
  loadOwnedSeoAuditRecheckSource: mocks.loadRecheck,
  readSeoAuditPrivateArtifact: mocks.readArtifact,
}));

import { GET } from "./route";

const hash = "a".repeat(64);
const paidRun = {
  id: "run-1",
  userId: "user-1",
  status: "completed",
  normalizedOrigin: "https://example.com",
  summaryScore: 82,
  summaryEvidenceCoverage: 94,
  summaryPageCount: 10,
  summaryCriticalCount: 0,
  summaryHighCount: 1,
  summaryMediumCount: 2,
  reportJsonKey: `seo-audit/runs/run-1/${hash}/report.json`,
  reportMarkdownKey: `seo-audit/runs/run-1/${hash}/report.md`,
  reportSha256: hash,
  completedAt: new Date("2026-07-27T01:02:03.000Z"),
  sourceOrder: { orderStatus: "activated", refundRecords: [] },
};

describe("GET /api/seo-audit/runs/[id]/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.loadRun.mockResolvedValue(paidRun);
    mocks.loadRecheck.mockResolvedValue({
      creditId: "credit-1",
      kind: "professional",
      targetUrl: "https://example.com/private/path",
    });
    mocks.readArtifact.mockResolvedValue(
      JSON.stringify({
        meta: { target: "https://example.com/private/path" },
        pages: [{ url: "https://example.com/private/path" }],
        strengths: [
          { id: "S001", title: "Good robots policy", value: "Readable" },
        ],
        findings: [
          {
            id: "F001",
            severity: "high",
            issue: "Missing title",
            action: "Add a title",
            verification: "Crawl again",
          },
        ],
        agent_prompts: [
          {
            id: "codex",
            name: "Codex",
            website: "https://openai.com/codex/",
            prompt: "Apply and verify the listed fixes.",
          },
        ],
      }),
    );
  });

  it("returns the allowlisted full report DTO to the eligible owner", async () => {
    const response = await GET(
      new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1/report"),
      { params: Promise.resolve({ id: "run-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.strengths).toHaveLength(1);
    expect(payload.findings[0]).toEqual(
      expect.objectContaining({
        remediation: "Add a title",
        verification: "Crawl again",
      }),
    );
    expect(payload.agentPrompts[0]).toEqual(
      expect.objectContaining({ id: "codex", prompt: expect.any(String) }),
    );
    expect(payload.recheck).toEqual({
      endpoint: "/api/seo-audit/runs/run-1/recheck",
    });
    expect(JSON.stringify(payload)).not.toContain("private/path");
    expect(JSON.stringify(payload)).not.toContain("reportJsonKey");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("requires login and maps owner/report authorization failures", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const anonymous = await GET(
      new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1/report"),
      { params: Promise.resolve({ id: "run-1" }) },
    );
    expect(anonymous.status).toBe(401);
    expect(mocks.loadRun).not.toHaveBeenCalled();

    mocks.loadRun.mockRejectedValueOnce(new Error("REPORT_NOT_FOUND"));
    const missing = await GET(
      new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1/report"),
      { params: Promise.resolve({ id: "run-1" }) },
    );
    expect(missing.status).toBe(404);

    mocks.loadRun.mockRejectedValueOnce(new Error("REPORT_ACCESS_DENIED"));
    const refunded = await GET(
      new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1/report"),
      { params: Promise.resolve({ id: "run-1" }) },
    );
    expect(refunded.status).toBe(403);
    expect(mocks.readArtifact).not.toHaveBeenCalled();
  });
});
