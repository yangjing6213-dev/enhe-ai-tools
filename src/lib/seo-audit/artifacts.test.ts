import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import {
  buildPrivateArtifactKeys,
  parseSeoAuditReportBundle,
  storePrivateSeoAuditArtifacts,
} from "@/lib/seo-audit/artifacts";

const fullReport = {
  meta: {
    engine_version: "1.4.4",
    target: "https://private.example/path?secret=value",
  },
  pages: [{ url: "https://private.example" }, { url: "https://private.example/a" }],
  strengths: [{ id: "strength-1" }],
  findings: [
    {
      id: "critical-1",
      status: "verified",
      severity: "critical",
      issue: "Critical metadata issue",
    },
    {
      id: "high-1",
      status: "pending_external_data",
      severity: "high",
      issue: "High priority item awaiting external evidence",
    },
    {
      id: "medium-1",
      status: "verified",
      severity: "medium",
      issue: "Medium structured data issue",
    },
    {
      id: "low-1",
      status: "verified",
      severity: "low",
      issue: "Low priority content issue",
    },
  ],
  summary: {
    pages_crawled: 999,
    finding_counts: { critical: 99 },
  },
  score: {
    overall: 1,
    evidence_coverage: 1,
  },
};

function bundleBase64(
  bundle: unknown = { json: fullReport, markdown: "# Private report\n" },
) {
  return gzipSync(Buffer.from(JSON.stringify(bundle), "utf8")).toString("base64");
}

describe("SEO audit report bundles", () => {
  it("round-trips the fixed gzip JSON bundle and derives summary data server-side", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());

    expect(parsed.fullReport).toEqual(fullReport);
    expect(parsed.markdown).toBe("# Private report\n");
    expect(parsed.engineVersion).toBe("1.4.4");
    expect(parsed.summary).toEqual({
      score: 65,
      evidenceCoverage: 80,
      pageCount: 2,
      criticalCount: 1,
      highCount: 1,
      mediumCount: 1,
      findings: [
        {
          id: "critical-1",
          severity: "critical",
          issue: "Critical metadata issue",
        },
        {
          id: "high-1",
          severity: "high",
          issue: "High priority item awaiting external evidence",
        },
        {
          id: "medium-1",
          severity: "medium",
          issue: "Medium structured data issue",
        },
      ],
    });
    expect(parsed.summary.score).not.toBe(fullReport.score.overall);
    expect(parsed.summary.pageCount).not.toBe(fullReport.summary.pages_crawled);
    expect(parsed.reportSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects malformed base64, non-gzip data, invalid bundle types, and extra top-level fields", async () => {
    await expect(parseSeoAuditReportBundle("not base64!"))
      .rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
    await expect(
      parseSeoAuditReportBundle(Buffer.from("plain text").toString("base64")),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
    await expect(
      parseSeoAuditReportBundle(bundleBase64({ json: [], markdown: "# report" })),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
    await expect(
      parseSeoAuditReportBundle(
        bundleBase64({ json: fullReport, markdown: 42 }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
    await expect(
      parseSeoAuditReportBundle(
        bundleBase64({
          json: fullReport,
          markdown: "# report",
          summary: { score: 100 },
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
  });

  it("enforces base64, compressed, and decompressed byte limits", async () => {
    const encoded = bundleBase64();

    await expect(
      parseSeoAuditReportBundle(encoded, { maxBase64Chars: 16 }),
    ).rejects.toMatchObject({ code: "REPORT_TOO_LARGE" });
    await expect(
      parseSeoAuditReportBundle(encoded, { maxCompressedBytes: 16 }),
    ).rejects.toMatchObject({ code: "REPORT_TOO_LARGE" });

    const zipBomb = bundleBase64({
      json: { payload: "x".repeat(100_000) },
      markdown: "# report",
    });
    await expect(
      parseSeoAuditReportBundle(zipBomb, { maxUncompressedBytes: 1024 }),
    ).rejects.toMatchObject({ code: "REPORT_TOO_LARGE" });
  });
});

describe("private SEO audit artifact storage", () => {
  it("uses deterministic run-id/hash object keys", () => {
    expect(buildPrivateArtifactKeys("run-123", "a".repeat(64))).toEqual({
      jsonKey: `seo-audit/runs/run-123/${"a".repeat(64)}/report.json`,
      markdownKey: `seo-audit/runs/run-123/${"a".repeat(64)}/report.md`,
    });
  });

  it("uploads private JSON and Markdown objects without returning a public URL", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());
    const uploads: Array<Record<string, unknown>> = [];
    const putObject = vi.fn(
      (
        input: Record<string, unknown>,
        callback: (error: unknown, data: { Location?: string }) => void,
      ) => {
        uploads.push(input);
        callback(null, { Location: "public-host.example/leaked" });
      },
    );

    const stored = await storePrivateSeoAuditArtifacts(
      { runId: "run-123", parsed },
      {
        env: {
          TENCENT_COS_SECRET_ID: "secret-id",
          TENCENT_COS_SECRET_KEY: "secret-key",
          TENCENT_COS_BUCKET: "private-bucket-123",
          TENCENT_COS_REGION: "ap-guangzhou",
        },
        createClient: () => ({ putObject }),
      },
    );

    expect(putObject).toHaveBeenCalledTimes(2);
    expect(uploads).toEqual([
      expect.objectContaining({
        ACL: "private",
        Bucket: "private-bucket-123",
        Region: "ap-guangzhou",
        Key: expect.stringMatching(/\/report\.json$/),
        ContentType: "application/json; charset=utf-8",
      }),
      expect.objectContaining({
        ACL: "private",
        Bucket: "private-bucket-123",
        Region: "ap-guangzhou",
        Key: expect.stringMatching(/\/report\.md$/),
        ContentType: "text/markdown; charset=utf-8",
      }),
    ]);
    expect(stored).toEqual({
      reportJsonKey: expect.stringMatching(/\/report\.json$/),
      reportMarkdownKey: expect.stringMatching(/\/report\.md$/),
      reportSha256: parsed.reportSha256,
      engineVersion: "1.4.4",
      summary: parsed.summary,
    });
    expect(JSON.stringify(stored)).not.toContain("public-host.example");
    expect(JSON.stringify(stored)).not.toContain(fullReport.meta.target);
  });

  it("fails closed when private COS configuration is incomplete", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());

    await expect(
      storePrivateSeoAuditArtifacts(
        { runId: "run-123", parsed },
        { env: {}, createClient: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "ARTIFACT_STORAGE_UNAVAILABLE" });
  });
});
