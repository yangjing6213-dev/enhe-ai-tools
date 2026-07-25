import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import {
  assertSeoAuditReportMatchesRun,
  assertSeoAuditSummaryMatches,
  buildPrivateArtifactKeys,
  parseSeoAuditReportBundle,
  removePrivateSeoAuditArtifacts,
  SEO_AUDIT_COS_REQUEST_TIMEOUT_MS,
  storePrivateSeoAuditArtifacts,
} from "@/lib/seo-audit/artifacts";

const engineFixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/engine-1.4.8-report.json", import.meta.url),
    "utf8",
  ),
) as Record<string, unknown>;

const fullReport = {
  meta: {
    engine_version: "1.4.8",
    target: "https://private.example/path?secret=value",
    max_pages: 2,
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
      code: "missing_canonical",
      category: "on_page",
      status: "verified",
      severity: "critical",
      issue: "https://private.example/report?token=must-not-leak",
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
      code: "invalid_static_json_ld",
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
      code: "images_missing_alt",
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
    pages_crawled: 2,
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
    });
    expect(parsed.publicFindings).toEqual([
        {
          id: "F001",
          code: "missing_canonical",
          severity: "critical",
          issue: "Some pages are missing canonical tags.",
        },
        {
          id: "F003",
          code: "invalid_static_json_ld",
          severity: "medium",
          issue: "Some static JSON-LD blocks could not be parsed.",
        },
        {
          id: "F004",
          code: "images_missing_alt",
          severity: "low",
          issue: "Some images are missing alt attributes.",
        },
      ]);
    expect(JSON.stringify(parsed.publicFindings)).not.toContain(
      "private.example",
    );
    expect(JSON.stringify(parsed.publicFindings)).not.toContain(
      "must-not-leak",
    );
    expect(parsed.summary.score).not.toBe(fullReport.score.overall);
    expect(parsed.reportSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("accepts a captured engine 1.4.8 report fixture", async () => {
    const parsed = await parseSeoAuditReportBundle(
      bundleBase64({ json: engineFixture, markdown: "# Engine fixture\n" }),
    );

    expect(parsed.engineVersion).toBe("1.4.8");
    expect(parsed.targetUrl).toBe("https://fixture.example/");
    expect(parsed.pageLimit).toBe(5);
    expect(parsed.summary.pageCount).toBe(2);
    expect(parsed.publicFindings).toEqual([
      {
        id: "F001",
        code: "sitemap_duplicate_urls",
        severity: "medium",
        issue: "The sitemap contains duplicate URLs.",
      },
      {
        id: "F003",
        code: "optional_machine_assets",
        severity: "info",
        issue: "Some optional machine-readable resources are unavailable.",
      },
    ]);
  });

  it("binds the report target, page limit, actual page count, and engine version to the run", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());

    expect(() =>
      assertSeoAuditReportMatchesRun(parsed, {
        targetUrl: "https://private.example/path?secret=value",
        pageLimit: 2,
        engineVersion: "1.4.8",
      }),
    ).not.toThrow();

    for (const run of [
      {
        targetUrl: "https://other-customer.example/",
        pageLimit: 2,
        engineVersion: "1.4.8",
      },
      {
        targetUrl: "https://private.example/path?secret=value",
        pageLimit: 10,
        engineVersion: "1.4.8",
      },
      {
        targetUrl: "https://private.example/path?secret=value",
        pageLimit: 2,
        engineVersion: "1.4.7",
      },
    ]) {
      expect(() => assertSeoAuditReportMatchesRun(parsed, run)).toThrowError(
        expect.objectContaining({ code: "INVALID_REPORT_BUNDLE" }),
      );
    }

    const wrongDeclaredCount = structuredClone(fullReport);
    wrongDeclaredCount.summary.pages_crawled = 1;
    await expect(
      parseSeoAuditReportBundle(
        bundleBase64({ json: wrongDeclaredCount, markdown: "# report" }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });

    const overLimit = structuredClone(fullReport);
    overLimit.meta.max_pages = 1;
    await expect(
      parseSeoAuditReportBundle(
        bundleBase64({ json: overLimit, markdown: "# report" }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
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
    expect(() =>
      assertSeoAuditSummaryMatches(
        { ...parsed.summary, findings: parsed.publicFindings },
        parsed.summary,
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_REPORT_BUNDLE" }));
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

  it("isolates each upload reservation under its own private object prefix", () => {
    expect(
      buildPrivateArtifactKeys("run-123", "a".repeat(64), "b".repeat(64)),
    ).toEqual({
      jsonKey: `seo-audit/runs/run-123/${"a".repeat(64)}/uploads/${"b".repeat(64)}/report.json`,
      markdownKey: `seo-audit/runs/run-123/${"a".repeat(64)}/uploads/${"b".repeat(64)}/report.md`,
    });
  });

  it("uploads private JSON and Markdown objects without returning a public URL", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());
    const reserved = buildPrivateArtifactKeys(
      "run-123",
      parsed.reportSha256,
      "d".repeat(64),
    );
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
    const deleteObject = vi.fn(
      (
        _input: Record<string, unknown>,
        callback: (error: unknown, data: { Location?: string }) => void,
      ) => callback(null, {}),
    );
    const createClient = vi.fn(() => ({ putObject, deleteObject }));

    const stored = await storePrivateSeoAuditArtifacts(
      {
        runId: "run-123",
        parsed,
        reportJsonKey: reserved.jsonKey,
        reportMarkdownKey: reserved.markdownKey,
      },
      {
        env: {
          TENCENT_COS_SECRET_ID: "secret-id",
          TENCENT_COS_SECRET_KEY: "secret-key",
          TENCENT_COS_BUCKET: "private-bucket-123",
          TENCENT_COS_REGION: "ap-guangzhou",
        },
        createClient,
      },
    );

    expect(putObject).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenCalledWith({
      requestTimeoutMs: SEO_AUDIT_COS_REQUEST_TIMEOUT_MS,
    });
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
    });
    expect(JSON.stringify(stored)).not.toContain("public-host.example");
    expect(JSON.stringify(stored)).not.toContain(fullReport.meta.target);
  });

  it("fails closed when private COS configuration is incomplete", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());
    const reserved = buildPrivateArtifactKeys(
      "run-123",
      parsed.reportSha256,
      "d".repeat(64),
    );

    await expect(
      storePrivateSeoAuditArtifacts(
        {
          runId: "run-123",
          parsed,
          reportJsonKey: reserved.jsonKey,
          reportMarkdownKey: reserved.markdownKey,
        },
        { env: {}, createClient: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "ARTIFACT_STORAGE_UNAVAILABLE" });
  });

  it("cancels a timed-out COS upload through its task id", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());
    const reserved = buildPrivateArtifactKeys(
      "run-123",
      parsed.reportSha256,
      "d".repeat(64),
    );
    const cancelTask = vi.fn();
    const createClient = vi.fn(() => ({
      putObject: vi.fn((input: Record<string, unknown>) => {
        const onTaskReady = input.onTaskReady as
          | ((taskId: string) => void)
          | undefined;
        onTaskReady?.("upload-task-1");
      }),
      deleteObject: vi.fn(),
      cancelTask,
    }));

    await expect(
      storePrivateSeoAuditArtifacts(
        {
          runId: "run-123",
          parsed,
          reportJsonKey: reserved.jsonKey,
          reportMarkdownKey: reserved.markdownKey,
        },
        {
          env: {
            TENCENT_COS_SECRET_ID: "secret-id",
            TENCENT_COS_SECRET_KEY: "secret-key",
            TENCENT_COS_BUCKET: "private-bucket-123",
            TENCENT_COS_REGION: "ap-guangzhou",
          },
          requestTimeoutMs: 5,
          createClient,
        },
      ),
    ).rejects.toMatchObject({ code: "ARTIFACT_UPLOAD_FAILED" });
    expect(createClient).toHaveBeenCalledWith({ requestTimeoutMs: 5 });
    expect(cancelTask).toHaveBeenCalledWith("upload-task-1");
  });

  it("keeps the timeout failure when cancelTask synchronously invokes the COS callback", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());
    const reserved = buildPrivateArtifactKeys(
      "run-123",
      parsed.reportSha256,
      "e".repeat(64),
    );
    const cancelTask = vi.fn();
    const createClient = vi.fn(() => ({
      putObject: vi.fn(
        (
          input: Record<string, unknown>,
          callback: (error: unknown, data: { Location?: string }) => void,
        ) => {
          cancelTask.mockImplementation(() => callback(null, {}));
          const onTaskReady = input.onTaskReady as
            | ((taskId: string) => void)
            | undefined;
          onTaskReady?.("upload-task-2");
        },
      ),
      deleteObject: vi.fn(),
      cancelTask,
    }));

    await expect(
      storePrivateSeoAuditArtifacts(
        {
          runId: "run-123",
          parsed,
          reportJsonKey: reserved.jsonKey,
          reportMarkdownKey: reserved.markdownKey,
        },
        {
          env: {
            TENCENT_COS_SECRET_ID: "secret-id",
            TENCENT_COS_SECRET_KEY: "secret-key",
            TENCENT_COS_BUCKET: "private-bucket-123",
            TENCENT_COS_REGION: "ap-guangzhou",
          },
          requestTimeoutMs: 5,
          createClient,
        },
      ),
    ).rejects.toMatchObject({ code: "ARTIFACT_UPLOAD_FAILED" });
    expect(cancelTask).toHaveBeenCalledWith("upload-task-2");
  });

  it("keeps timed-out void COS deletions failed after late success callbacks", async () => {
    vi.useFakeTimers();
    try {
      const keys = buildPrivateArtifactKeys(
        "run-123",
        "a".repeat(64),
        "f".repeat(64),
      );
      const callbacks: Array<(error: unknown) => void> = [];
      const deleteObject = vi.fn(
        (
          _input: Record<string, unknown>,
          callback: (error: unknown) => void,
        ) => {
          callbacks.push(callback);
        },
      );
      const removal = removePrivateSeoAuditArtifacts(
        {
          reportJsonKey: keys.jsonKey,
          reportMarkdownKey: keys.markdownKey,
        },
        {
          env: {
            TENCENT_COS_SECRET_ID: "secret-id",
            TENCENT_COS_SECRET_KEY: "secret-key",
            TENCENT_COS_BUCKET: "private-bucket-123",
            TENCENT_COS_REGION: "ap-guangzhou",
          },
          requestTimeoutMs: 5,
          createClient: () => ({ putObject: vi.fn(), deleteObject }),
        },
      );
      const rejection = expect(removal).rejects.toMatchObject({
        code: "ARTIFACT_UPLOAD_FAILED",
      });

      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(5);
      callbacks.forEach((callback) => callback(null));
      await rejection;
      expect(deleteObject).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes the request timeout to the default COS SDK client", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());
    const reserved = buildPrivateArtifactKeys(
      "run-123",
      parsed.reportSha256,
      "f".repeat(64),
    );
    const constructorOptions = vi.fn();

    class MockCosClient {
      cancelTask = vi.fn();

      constructor(options: Record<string, unknown>) {
        constructorOptions(options);
      }

      putObject(
        _input: Record<string, unknown>,
        callback: (error: unknown, data: { Location?: string }) => void,
      ) {
        callback(null, {});
      }

      deleteObject(
        _input: Record<string, unknown>,
        callback: (error: unknown) => void,
      ) {
        callback(null);
      }
    }

    vi.doMock("cos-nodejs-sdk-v5", () => ({ default: MockCosClient }));
    try {
      await expect(
        storePrivateSeoAuditArtifacts(
          {
            runId: "run-123",
            parsed,
            reportJsonKey: reserved.jsonKey,
            reportMarkdownKey: reserved.markdownKey,
          },
          {
            env: {
              TENCENT_COS_SECRET_ID: "secret-id",
              TENCENT_COS_SECRET_KEY: "secret-key",
              TENCENT_COS_BUCKET: "private-bucket-123",
              TENCENT_COS_REGION: "ap-guangzhou",
            },
            requestTimeoutMs: 17,
          },
        ),
      ).resolves.toEqual({
        reportJsonKey: reserved.jsonKey,
        reportMarkdownKey: reserved.markdownKey,
      });
      expect(constructorOptions).toHaveBeenCalledWith({
        SecretId: "secret-id",
        SecretKey: "secret-key",
        Timeout: 17,
      });
    } finally {
      vi.doUnmock("cos-nodejs-sdk-v5");
      vi.resetModules();
    }
  });

  it("uploads to caller-reserved keys only when both keys match the run and report", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());
    const reserved = buildPrivateArtifactKeys(
      "run-123",
      parsed.reportSha256,
      "c".repeat(64),
    );
    const putObject = vi.fn(
      (
        _input: Record<string, unknown>,
        callback: (error: unknown, data: { Location?: string }) => void,
      ) => callback(null, {}),
    );
    const createClient = vi.fn(() => ({
      putObject,
      deleteObject: vi.fn(),
    }));
    const options = {
      env: {
        TENCENT_COS_SECRET_ID: "secret-id",
        TENCENT_COS_SECRET_KEY: "secret-key",
        TENCENT_COS_BUCKET: "private-bucket-123",
        TENCENT_COS_REGION: "ap-guangzhou",
      },
      createClient,
    };

    await expect(
      storePrivateSeoAuditArtifacts(
        {
          runId: "run-123",
          parsed,
          reportJsonKey: reserved.jsonKey,
          reportMarkdownKey: reserved.markdownKey,
        },
        options,
      ),
    ).resolves.toEqual({
      reportJsonKey: reserved.jsonKey,
      reportMarkdownKey: reserved.markdownKey,
    });
    expect(putObject.mock.calls.map(([input]) => input.Key)).toEqual([
      reserved.jsonKey,
      reserved.markdownKey,
    ]);

    await expect(
      storePrivateSeoAuditArtifacts(
        {
          runId: "run-123",
          parsed,
          reportJsonKey: reserved.jsonKey,
          reportMarkdownKey: reserved.markdownKey.replace("run-123", "other-run"),
        },
        options,
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
  });

  it("rolls back an already uploaded object when the second COS upload fails", async () => {
    const parsed = await parseSeoAuditReportBundle(bundleBase64());
    const reserved = buildPrivateArtifactKeys(
      "run-123",
      parsed.reportSha256,
      "d".repeat(64),
    );
    const putObject = vi
      .fn()
      .mockImplementationOnce(
        (
          _input: Record<string, unknown>,
          callback: (error: unknown) => void,
        ) => callback(null),
      )
      .mockImplementationOnce(
        (
          _input: Record<string, unknown>,
          callback: (error: unknown) => void,
        ) => callback(new Error("upload failed")),
      );
    const deleteObject = vi.fn(
      (
        _input: Record<string, unknown>,
        callback: (error: unknown) => void,
      ) => callback(null),
    );

    await expect(
      storePrivateSeoAuditArtifacts(
        {
          runId: "run-123",
          parsed,
          reportJsonKey: reserved.jsonKey,
          reportMarkdownKey: reserved.markdownKey,
        },
        {
          env: {
            TENCENT_COS_SECRET_ID: "secret-id",
            TENCENT_COS_SECRET_KEY: "secret-key",
            TENCENT_COS_BUCKET: "private-bucket-123",
            TENCENT_COS_REGION: "ap-guangzhou",
          },
          createClient: () => ({ putObject, deleteObject }),
        },
      ),
    ).rejects.toMatchObject({ code: "ARTIFACT_UPLOAD_FAILED" });
    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).toHaveBeenCalledWith(
      expect.objectContaining({ Key: expect.stringMatching(/\/report\.json$/) }),
      expect.any(Function),
    );
  });
});
