import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), "scripts", "scan-ai-news-opportunities.ts");
const officialSource = "https://github.blog/changelog/2026-07-23-next-mcp";

function buildCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: "daily-news",
    contentKind: "news",
    eventKey: "daily-ai-announcement",
    eventName: "Daily AI announcement",
    eventDate: "2026-07-26",
    eventSourceUrl: officialSource,
    topic: "AI announcement",
    userImpact: "The announced change could alter a documented user workflow.",
    userTask: "verify the affected workflow before adopting the change",
    sourceUrls: [officialSource],
    sourceEvidence: [
      {
        url: officialSource,
        authority: "first-party",
        supports: "The announcement describes the documented product change."
      }
    ],
    queryEvidence: [
      {
        source: "google-search-console",
        query: "daily ai announcement",
        observedAt: "2026-07-26T08:00:00+08:00",
        impressions: 10,
        clicks: 1,
        targetPath: "/ai-news"
      }
    ],
    demandScore: 100,
    bilingual: true,
    ...overrides
  };
}

async function runScan(input: unknown) {
  const directory = await mkdtemp(join(tmpdir(), "ai-news-opportunity-scan-"));
  const inputPath = join(directory, "input.json");
  await writeFile(inputPath, JSON.stringify(input), "utf8");

  const result = await execFileAsync(process.execPath, ["--import", "tsx", scriptPath, "--input", inputPath], {
    cwd: process.cwd(),
    timeout: 10000
  });

  return JSON.parse(result.stdout) as {
    scope: {
      operation: string;
      mode: string;
      externalConnections: string[];
      writes: string[];
    };
    evidenceBoundary: {
      validation: string;
      verifiesLiveBackendConnection: boolean;
    };
    acceptedCount: number;
    rejectedCount: number;
    statusCounts: Record<"evidence_missing" | "rejected" | "accepted", number>;
    accepted: Array<{ id: string }>;
    decisions: Array<{ status: string; reason: string }>;
  };
}

async function runScanFailure(input: unknown) {
  try {
    await runScan(input);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "stderr" in error &&
      typeof error.stderr === "string"
    ) {
      return error.stderr;
    }
    throw error;
  }
  throw new Error("Expected scan to fail.");
}

describe("scan-ai-news-opportunities script", () => {
  it("returns a valid zero-article plan when candidates lack query evidence", async () => {
    const result = await runScan({
      candidates: [buildCandidate({ queryEvidence: [] })]
    });

    expect(result).toMatchObject({
      scope: {
        operation: "content-admission-scan",
        mode: "offline-read-only",
        externalConnections: [],
        writes: []
      },
      evidenceBoundary: {
        validation: "structure-and-allowlist-only",
        verifiesLiveBackendConnection: false
      },
      acceptedCount: 0,
      rejectedCount: 1,
      statusCounts: { evidence_missing: 1, rejected: 0, accepted: 0 },
      accepted: [],
      decisions: [
        { status: "evidence_missing", reason: "missing-query-evidence" }
      ]
    });
  });

  it("accepts valid structured query evidence without claiming a live backend connection", async () => {
    const result = await runScan({ candidates: [buildCandidate()] });

    expect(result.accepted.map((item) => item.id)).toEqual(["daily-news"]);
    expect(result.evidenceBoundary).toEqual({
      validation: "structure-and-allowlist-only",
      verifiesLiveBackendConnection: false
    });
    expect(result.scope.externalConnections).toEqual([]);
  });

  it("rejects the former boolean query evidence contract at the schema boundary", async () => {
    const { queryEvidence: _queryEvidence, ...candidate } = buildCandidate();
    const stderr = await runScanFailure({
      candidates: [{ ...candidate, hasQueryEvidence: true }]
    });

    expect(stderr).toContain("queryEvidence");
    expect(stderr).toContain("hasQueryEvidence");
  });

  it("rejects malformed structured query evidence at the schema boundary", async () => {
    const stderr = await runScanFailure({
      candidates: [
        buildCandidate({
          queryEvidence: [
            {
              source: "google-search-console",
              query: "daily ai announcement",
              observedAt: "2026-07-26T08:00:00",
              impressions: 0
            }
          ]
        })
      ]
    });

    expect(stderr).toContain("observedAt");
    expect(stderr).toContain("impressions");
  });

  it("rejects a fabricated authority value at the schema boundary", async () => {
    const stderr = await runScanFailure({
      candidates: [
        buildCandidate({
          sourceEvidence: [
            {
              url: officialSource,
              authority: "verified-official",
              supports: "The page claims to document the product change."
            }
          ]
        })
      ]
    });

    expect(stderr).toContain("sourceEvidence");
    expect(stderr).toContain("authority");
  });

  it("returns evidence_missing for arbitrary HTTPS source claims outside the allowlist", async () => {
    const arbitrarySource = "https://example.com/announcement";
    const result = await runScan({
      candidates: [
        buildCandidate({
          eventSourceUrl: arbitrarySource,
          sourceUrls: [arbitrarySource],
          sourceEvidence: [
            {
              url: arbitrarySource,
              authority: "first-party",
              supports: "The arbitrary page claims to document a product change."
            }
          ]
        })
      ]
    });

    expect(result.accepted).toEqual([]);
    expect(result.decisions).toMatchObject([
      { status: "evidence_missing", reason: "missing-source-evidence" }
    ]);
  });
});
