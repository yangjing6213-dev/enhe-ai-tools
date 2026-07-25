import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import {
  assertSeoAuditSummaryMatches,
  buildPrivateArtifactKeys,
  parseSeoAuditReportBundle,
  storePrivateSeoAuditArtifacts,
} from "@/lib/seo-audit/artifacts";

const fullReport = {
  meta: {
    engine_version: "1.4.8",
    target: "https://private.example/path?secret=value",
  },
  pages: [
    {
      url: "https://private.example/",
      final_url: "https://private.example/",
      status: 200,
      content_type: "text/html",
      elapsed_ms: 12,
      redirects: [],
      error: null,
      truncated: false,
      in_sitemap: true,
      is_html: true,
      title: "Private example",
      title_length: 15,
      meta_description: "Private example description",
      meta_description_length: 27,
      canonical: "https://private.example/",
      html_lang: "en",
      robots_directive: "",
      noindex: false,
      h1_count: 1,
      h1: ["Private example"],
      h2_count: 2,
      images_missing_alt_attribute: 0,
      internal_link_count: 1,
      external_link_count: 0,
      hreflang: [{ lang: "en", url: "https://private.example/" }],
      json_ld_static_count: 1,
      json_ld_static_valid_count: 1,
      json_ld_static_errors: [],
      word_count: 120,
      author_signal: true,
      parse_error: null,
    },
    {
      url: "https://private.example/a",
      final_url: "https://private.example/a",
      status: 500,
      content_type: "text/html",
      elapsed_ms: 8,
      redirects: [],
      error: null,
      truncated: false,
      in_sitemap: false,
      is_html: false,
    },
  ],
  strengths: [
    {
      id: "S001",
      code: "https_enabled",
      category: "technical_seo",
      status: "verified",
      title: "HTTPS is enabled",
      evidence: { url: "https://private.example/" },
      value: "The site uses HTTPS.",
    },
  ],
  findings: [
    {
      id: "F001",
      code: "critical_metadata",
      category: "on_page",
      status: "verified",
      severity: "critical",
      issue: "Critical metadata issue",
      evidence: { url: "https://private.example/" },
      action: "Repair the metadata.",
      verification: "Crawl the page again.",
    },
    {
      id: "F002",
      code: "answer_engine_visibility",
      category: "geo",
      status: "external_data_required",
      severity: "high",
      issue: "High priority item awaiting external evidence",
      evidence: "External evidence is required.",
      action: "Collect external evidence.",
      verification: "Attach the external evidence snapshot.",
    },
    {
      id: "F003",
      code: "structured_data",
      category: "structured_data",
      status: "verified",
      severity: "medium",
      issue: "Medium structured data issue",
      evidence: { url: "https://private.example/" },
      action: "Repair the structured data.",
      verification: "Validate the structured data again.",
    },
    {
      id: "F004",
      code: "content_detail",
      category: "content",
      status: "verified",
      severity: "low",
      issue: "Low priority content issue",
      evidence: { url: "https://private.example/a" },
      action: "Improve the content detail.",
      verification: "Review the updated content.",
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
    expect(parsed.engineVersion).toBe("1.4.8");
    expect(parsed.summary).toEqual({
      score: 65,
      evidenceCoverage: 80,
      pageCount: 2,
      criticalCount: 1,
      highCount: 0,
      mediumCount: 1,
      findings: [
        {
          id: "F001",
          severity: "critical",
          issue: "Critical metadata issue",
        },
        {
          id: "F003",
          severity: "medium",
          issue: "Medium structured data issue",
        },
        {
          id: "F004",
          severity: "low",
          issue: "Low priority content issue",
        },
      ],
    });
    expect(parsed.summary.score).not.toBe(fullReport.score.overall);
    expect(parsed.summary.pageCount).not.toBe(fullReport.summary.pages_crawled);
    expect(parsed.reportSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects malformed engine 1.4.8 pages, strengths, and finding statuses", async () => {
    const nullPageReport = structuredClone(fullReport);
    nullPageReport.pages = [null] as never;
    const nullStrengthReport = structuredClone(fullReport);
    nullStrengthReport.strengths = [null] as never;
    const unknownStatusReport = structuredClone(fullReport);
    unknownStatusReport.findings[0].status = "crawl_failed";

    for (const report of [
      nullPageReport,
      nullStrengthReport,
      unknownStatusReport,
    ]) {
      await expect(
        parseSeoAuditReportBundle(
          bundleBase64({ json: report, markdown: "# report" }),
        ),
      ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
    }
  });

  it("rejects a worker summary that contradicts the server-derived summary", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());

    expect(() =>
      assertSeoAuditSummaryMatches(
        { ...parsed.summary, score: parsed.summary.score + 1 },
        parsed.summary,
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_REPORT_BUNDLE" }));
    expect(() =>
      assertSeoAuditSummaryMatches(parsed.summary, parsed.summary),
    ).not.toThrow();
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
      engineVersion: "1.4.8",
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
