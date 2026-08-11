import { describe, expect, it, vi } from "vitest";
import {
  buildSeoAuditFullReportResponse,
  claimAnonymousSeoAuditRun,
  generateSeoAuditPublicToken,
  loadOwnedSeoAuditRecheckSource,
  loadOwnedSeoAuditReportRun,
  parseCreateSeoAuditRunInput,
  readSeoAuditPrivateArtifact,
  readTrustedClientIp,
} from "@/lib/seo-audit/public-api";
import { hashSeoAuditPublicToken } from "@/lib/seo-audit/public-access";

describe("SEO audit public API helpers", () => {
  it("accepts only a target URL from the browser", () => {
    expect(
      parseCreateSeoAuditRunInput({ targetUrl: "https://example.com/path" }),
    ).toEqual({ targetUrl: "https://example.com/path" });
    expect(() =>
      parseCreateSeoAuditRunInput({
        targetUrl: "https://example.com",
        pageLimit: 300,
      }),
    ).toThrow("INVALID_REQUEST");
    expect(() => parseCreateSeoAuditRunInput(null)).toThrow("INVALID_REQUEST");
  });

  it("generates a strong token and trusts the Nginx-controlled real IP over spoofed forwarding prefixes", () => {
    expect(generateSeoAuditPublicToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(
      readTrustedClientIp(
        new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs", {
          headers: {
            "x-real-ip": "203.0.113.8",
            "x-forwarded-for": "198.51.100.99, 203.0.113.8",
          },
        }),
      ),
    ).toBe("203.0.113.8");
    expect(() =>
      readTrustedClientIp(
        new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs", {
          headers: {
            "x-forwarded-for": "198.51.100.99, 203.0.113.8",
          },
        }),
      ),
    ).toThrow("CLIENT_IP_UNAVAILABLE");
    expect(() =>
      readTrustedClientIp(
        new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs"),
      ),
    ).toThrow("CLIENT_IP_UNAVAILABLE");
  });

  it("builds a report DTO without report internals, target paths, or evidence payloads", () => {
    const response = buildSeoAuditFullReportResponse(
      {
        id: "run-1",
        normalizedOrigin: "https://example.com",
        summaryScore: 82,
        summaryEvidenceCoverage: 94,
        summaryPageCount: 10,
        summaryCriticalCount: 0,
        summaryHighCount: 1,
        summaryMediumCount: 2,
        completedAt: new Date("2026-07-27T01:02:03.000Z"),
      },
      {
        meta: { target_url: "https://example.com/private/path" },
        pages: [{ url: "https://example.com/private/path" }],
        strengths: [
          {
            id: "S001",
            title: "robots.txt is reachable",
            value: "Crawlers can read the public policy.",
            evidence: { url: "https://example.com/private/path" },
          },
        ],
        findings: [
          {
            id: "F001",
            severity: "high",
            issue: "Some pages are missing titles.",
            action: "Add a unique title to each page.",
            verification: "Crawl again and confirm every page has a title.",
            evidence: ["https://example.com/private/path"],
          },
        ],
        agent_prompts: [
          {
            id: "codex",
            name: "Codex",
            website: "https://openai.com/codex/",
            prompt: "Fix the allowlisted findings and verify each result.",
            internal_context: "cos://private-bucket/report.json",
          },
        ],
      },
    );

    expect(response).toEqual({
      id: "run-1",
      origin: "https://example.com",
      completedAt: "2026-07-27T01:02:03.000Z",
      summary: {
        score: 82,
        evidenceCoverage: 94,
        pageCount: 10,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 2,
      },
      strengths: [
        {
          id: "S001",
          title: "robots.txt is reachable",
          value: "Crawlers can read the public policy.",
        },
      ],
      findings: [
        {
          id: "F001",
          severity: "high",
          issue: "Some pages are missing titles.",
          remediation: "Add a unique title to each page.",
          verification: "Crawl again and confirm every page has a title.",
        },
      ],
      agentPrompts: [
        {
          id: "codex",
          name: "Codex",
          website: "https://openai.com/codex/",
          prompt: "Fix the allowlisted findings and verify each result.",
        },
      ],
      recheck: null,
      downloads: {
        json: "/api/seo-audit/runs/run-1/download?format=json",
        markdown: "/api/seo-audit/runs/run-1/download?format=markdown",
      },
    });
    expect(JSON.stringify(response)).not.toContain("private/path");
    expect(JSON.stringify(response)).not.toContain('"evidence":');
    expect(JSON.stringify(response)).not.toContain("reportJsonKey");
    expect(JSON.stringify(response)).not.toContain("private-bucket");
  });

  it("claims an anonymous run once and rejects expired or reused tokens", async () => {
    const token = "public-token-".repeat(3);
    const findUnique = vi.fn().mockResolvedValue({
      id: "run-1",
      userId: null,
      status: "completed",
      kind: "free",
      publicTokenHash: hashSeoAuditPublicToken(token),
      publicTokenExpiresAt: new Date("2026-07-28T00:00:00.000Z"),
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = { seoAuditRun: { findUnique, updateMany } };

    await expect(
      claimAnonymousSeoAuditRun(
        { runId: "run-1", userId: "user-1", publicToken: token },
        { db, now: new Date("2026-07-27T00:00:00.000Z") },
      ),
    ).resolves.toEqual({ runId: "run-1", claimed: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        userId: null,
        status: "completed",
        kind: "free",
        publicTokenHash: hashSeoAuditPublicToken(token),
        publicTokenExpiresAt: { gt: new Date("2026-07-27T00:00:00.000Z") },
      },
      data: {
        userId: "user-1",
        publicTokenHash: null,
        publicTokenExpiresAt: null,
      },
    });

    findUnique.mockResolvedValueOnce({
      id: "run-1",
      userId: "user-1",
      status: "completed",
      kind: "free",
      publicTokenHash: null,
      publicTokenExpiresAt: null,
    });
    await expect(
      claimAnonymousSeoAuditRun(
        { runId: "run-1", userId: "user-1", publicToken: token },
        { db, now: new Date("2026-07-27T00:00:00.000Z") },
      ),
    ).rejects.toThrow("SEO_AUDIT_CLAIM_UNAVAILABLE");

    findUnique.mockResolvedValueOnce({
      id: "run-2",
      userId: null,
      status: "completed",
      kind: "free",
      publicTokenHash: hashSeoAuditPublicToken(token),
      publicTokenExpiresAt: new Date("2026-07-27T00:00:00.000Z"),
    });
    await expect(
      claimAnonymousSeoAuditRun(
        { runId: "run-2", userId: "user-1", publicToken: token },
        { db, now: new Date("2026-07-27T00:00:00.000Z") },
      ),
    ).rejects.toThrow("SEO_AUDIT_CLAIM_UNAVAILABLE");

    findUnique.mockResolvedValueOnce({
      id: "run-3",
      userId: null,
      status: "queued",
      kind: "free",
      publicTokenHash: hashSeoAuditPublicToken(token),
      publicTokenExpiresAt: new Date("2026-07-28T00:00:00.000Z"),
    });
    await expect(
      claimAnonymousSeoAuditRun(
        { runId: "run-3", userId: "user-1", publicToken: token },
        { db, now: new Date("2026-07-27T00:00:00.000Z") },
      ),
    ).rejects.toThrow("SEO_AUDIT_CLAIM_UNAVAILABLE");
  });

  it("loads a recheck source only for an eligible paid owner with remaining credit", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      status: "completed",
      kind: "professional",
      targetUrl: "https://example.com/private/path",
      reportJsonKey: "seo-audit/runs/run-1/hash/report.json",
      reportMarkdownKey: "seo-audit/runs/run-1/hash/report.md",
      credit: {
        id: "credit-1",
        remainingRuns: 1,
        expiresAt: new Date("2026-08-03T00:00:00.000Z"),
        refundedAt: null,
      },
      sourceOrder: { orderStatus: "activated", refundRecords: [] },
    });
    const db = { seoAuditRun: { findFirst } };
    const now = new Date("2026-07-27T00:00:00.000Z");

    await expect(
      loadOwnedSeoAuditRecheckSource("run-1", "user-1", {
        db,
        now,
      }),
    ).resolves.toEqual({
      creditId: "credit-1",
      kind: "professional",
      targetUrl: "https://example.com/private/path",
    });

    findFirst.mockResolvedValueOnce({
      id: "run-1",
      userId: "user-1",
      status: "completed",
      kind: "professional",
      targetUrl: "https://example.com/private/path",
      reportJsonKey: "seo-audit/runs/run-1/hash/report.json",
      reportMarkdownKey: "seo-audit/runs/run-1/hash/report.md",
      credit: {
        id: "credit-1",
        remainingRuns: 1,
        expiresAt: new Date("2026-08-03T00:00:00.000Z"),
        refundedAt: null,
      },
      sourceOrder: {
        orderStatus: "activated",
        refundRecords: [{ status: "rejected" }],
      },
    });
    await expect(
      loadOwnedSeoAuditRecheckSource("run-1", "user-1", { db, now }),
    ).resolves.toEqual({
      creditId: "credit-1",
      kind: "professional",
      targetUrl: "https://example.com/private/path",
    });

    findFirst.mockResolvedValueOnce({
      id: "run-1",
      userId: "user-1",
      status: "completed",
      kind: "professional",
      targetUrl: "https://example.com/private/path",
      reportJsonKey: "seo-audit/runs/run-1/hash/report.json",
      reportMarkdownKey: "seo-audit/runs/run-1/hash/report.md",
      credit: {
        id: "credit-1",
        remainingRuns: 1,
        expiresAt: new Date("2026-08-03T00:00:00.000Z"),
        refundedAt: null,
      },
      sourceOrder: {
        orderStatus: "activated",
        refundRecords: [{ status: "pending" }],
      },
    });
    await expect(
      loadOwnedSeoAuditRecheckSource("run-1", "user-1", { db, now }),
    ).rejects.toThrow("SEO_AUDIT_RECHECK_UNAVAILABLE");
  });

  it("loads reports after rejected refunds but denies pending refunds", async () => {
    const findFirst = vi.fn();
    const db = { seoAuditRun: { findFirst } };
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
      reportJsonKey: `seo-audit/runs/run-1/${"a".repeat(64)}/report.json`,
      reportMarkdownKey: `seo-audit/runs/run-1/${"a".repeat(64)}/report.md`,
      reportSha256: "a".repeat(64),
      completedAt: new Date("2026-07-27T01:02:03.000Z"),
      sourceOrder: { orderStatus: "activated", refundRecords: [] },
    };
    findFirst.mockResolvedValueOnce(paidRun);

    await expect(
      loadOwnedSeoAuditReportRun("run-1", "user-1", { db }),
    ).resolves.toEqual(paidRun);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1", userId: "user-1" },
      }),
    );

    findFirst.mockResolvedValueOnce({
      ...paidRun,
      sourceOrder: {
        orderStatus: "activated",
        refundRecords: [{ status: "rejected" }],
      },
    });
    await expect(
      loadOwnedSeoAuditReportRun("run-1", "user-1", { db }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "run-1",
        sourceOrder: expect.objectContaining({
          refundRecords: [{ status: "rejected" }],
        }),
      }),
    );

    findFirst.mockResolvedValueOnce({
      ...paidRun,
      sourceOrder: {
        orderStatus: "activated",
        refundRecords: [{ status: "pending" }],
      },
    });
    await expect(
      loadOwnedSeoAuditReportRun("run-1", "user-1", { db }),
    ).rejects.toThrow("REPORT_ACCESS_DENIED");
  });

  it("validates private keys and proxies the signed COS body without returning its URL", async () => {
    const hash = "a".repeat(64);
    const resolveUrl = vi
      .fn()
      .mockResolvedValue(new URL("https://signed-cos.example/report.json?secret=1"));
    const fetcher = vi.fn().mockResolvedValue(
      new Response('{"strengths":[],"findings":[]}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      readSeoAuditPrivateArtifact(
        {
          runId: "run-1",
          reportSha256: hash,
          reportJsonKey: `seo-audit/runs/run-1/${hash}/report.json`,
          reportMarkdownKey: `seo-audit/runs/run-1/${hash}/report.md`,
          format: "json",
        },
        {
          env: { TENCENT_COS_BUCKET: "private-bucket" },
          resolveUrl,
          fetcher,
        },
      ),
    ).resolves.toBe('{"strengths":[],"findings":[]}');
    expect(resolveUrl).toHaveBeenCalledWith(
      `cos://private-bucket/seo-audit/runs/run-1/${hash}/report.json`,
      { TENCENT_COS_BUCKET: "private-bucket" },
    );
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ cache: "no-store" }),
    );

    await expect(
      readSeoAuditPrivateArtifact(
        {
          runId: "run-1",
          reportSha256: hash,
          reportJsonKey: `seo-audit/runs/other-run/${hash}/report.json`,
          reportMarkdownKey: `seo-audit/runs/other-run/${hash}/report.md`,
          format: "json",
        },
        {
          env: { TENCENT_COS_BUCKET: "private-bucket" },
          resolveUrl,
          fetcher,
        },
      ),
    ).rejects.toThrow();
  });
});
