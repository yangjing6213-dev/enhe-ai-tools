import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loadRun: vi.fn(),
  readArtifact: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/seo-audit/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo-audit/public-api")>()),
  loadOwnedSeoAuditReportRun: mocks.loadRun,
  readSeoAuditPrivateArtifact: mocks.readArtifact,
}));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: mocks.track }));

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

describe("GET /api/seo-audit/runs/[id]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.loadRun.mockResolvedValue(paidRun);
    mocks.readArtifact.mockImplementation(
      async (input: { format: string }) =>
        input.format === "json" ? '{"ok":true}' : "# SEO/GEO Audit\n",
    );
    mocks.track.mockResolvedValue(undefined);
  });

  it("proxies JSON and Markdown as private attachment responses", async () => {
    for (const format of ["json", "markdown"] as const) {
      const response = await GET(
        new Request(
          `https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1/download?format=${format}`,
        ),
        { params: Promise.resolve({ id: "run-1" }) },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-disposition")).toContain(
        format === "json" ? ".json" : ".md",
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await response.text()).not.toContain("signed-cos");
    }
    expect(mocks.track).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "seo_audit_report_downloaded",
        entityId: "run-1",
      }),
    );
  });

  it("rejects invalid formats before loading any report", async () => {
    const response = await GET(
      new Request(
        "https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1/download?format=html",
      ),
      { params: Promise.resolve({ id: "run-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.loadRun).not.toHaveBeenCalled();
    expect(mocks.readArtifact).not.toHaveBeenCalled();
  });
});
