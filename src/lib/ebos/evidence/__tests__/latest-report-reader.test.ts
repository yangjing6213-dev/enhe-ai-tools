import { describe, expect, test } from "vitest";
import {
  findLatestJsonReport,
  readLatestDataSourceReadiness,
  readLatestHealthSnapshot,
  safeReadJsonFile
} from "../latest-report-reader";
import type { EbosEvidenceFileSystem } from "../evidence-types";

function fakeFs(files: Record<string, string>, mtime: Record<string, number> = {}): EbosEvidenceFileSystem {
  return {
    readdir: async (directory) => Object.keys(files)
      .filter((filePath) => filePath.startsWith(`${directory}/`))
      .map((filePath) => filePath.slice(directory.length + 1)),
    readFile: async (filePath) => files[filePath],
    stat: async (filePath) => ({
      mtimeMs: mtime[filePath] ?? 0
    })
  };
}

describe("latest report reader", () => {
  test("prefers the newest evidence envelope over legacy health JSON", async () => {
    const fs = fakeFs({
      "reports/ebos/evidence/health_snapshot/2026-07-03-health_snapshot.json": JSON.stringify({
        meta: {
          contractVersion: "ebos-evidence-v1",
          evidenceKind: "health_snapshot",
          generatedAt: "2026-07-03T00:00:00.000Z",
          targetDate: "2026-07-03",
          generator: "unit-test"
        },
        quality: {
          confidence: "complete",
          dataCompleteness: "complete",
          warningsCount: 0,
          errorsCount: 0
        },
        payload: {
          snapshot: {
            generatedAt: "2026-07-03T00:00:00.000Z",
            commands: [{ key: "build", checkedAt: "2026-07-03T00:00:00.000Z", status: "passed" }]
          }
        },
        warnings: [],
        actionItems: []
      }),
      "reports/ebos/health/2026-07-02-health-snapshot.json": JSON.stringify({
        snapshot: {
          generatedAt: "2026-07-02T00:00:00.000Z",
          commands: []
        }
      })
    });

    const result = await readLatestHealthSnapshot({ reportsRoot: "reports/ebos", fs });

    expect(result?.filePath).toBe("reports/ebos/evidence/health_snapshot/2026-07-03-health_snapshot.json");
    expect(result?.data?.commands).toHaveLength(1);
    expect(result?.warning).toBeUndefined();
  });

  test("falls back to legacy health JSON when no envelope exists", async () => {
    const fs = fakeFs({
      "reports/ebos/health/2026-07-02-health-snapshot.json": JSON.stringify({
        snapshot: {
          generatedAt: "2026-07-02T12:00:00.000Z",
          commands: []
        }
      })
    });

    const result = await readLatestHealthSnapshot({ reportsRoot: "reports/ebos", fs });

    expect(result?.filePath).toBe("reports/ebos/health/2026-07-02-health-snapshot.json");
    expect(result?.data?.generatedAt).toBeInstanceOf(Date);
  });

  test("normalizes legacy data-source JSON when no envelope exists", async () => {
    const fs = fakeFs({
      "reports/ebos/data-sources/2026-07-02-data-sources.json": JSON.stringify({
        generatedAt: "2026-07-02T12:00:00.000Z",
        checks: [{
          key: "cloudflare",
          label: "Cloudflare",
          status: "missing_config",
          checkedAt: "2026-07-02T12:00:00.000Z",
          missingEnvKeys: ["CLOUDFLARE_API_TOKEN"]
        }],
        summary: {
          available: 0,
          configured: 0,
          missing_config: 1,
          not_configured: 0,
          unavailable: 0,
          unknown: 0
        },
        recommendations: []
      })
    });

    const result = await readLatestDataSourceReadiness({ reportsRoot: "reports/ebos", fs });

    expect(result?.data?.checks[0]?.checkedAt).toBeInstanceOf(Date);
    expect(result?.data?.summary.missing_config).toBe(1);
  });

  test("returns validation warnings without crashing when envelope has issues", async () => {
    const fs = fakeFs({
      "reports/ebos/evidence/health_snapshot/2026-07-03-health_snapshot.json": JSON.stringify({
        meta: {
          contractVersion: "unsupported",
          evidenceKind: "health_snapshot",
          generatedAt: "2026-07-03T00:00:00.000Z",
          targetDate: "2026-07-03",
          generator: "unit-test"
        },
        quality: {
          confidence: "complete",
          dataCompleteness: "complete",
          warningsCount: 0,
          errorsCount: 0
        },
        payload: {
          snapshot: {
            generatedAt: "2026-07-03T00:00:00.000Z",
            commands: []
          }
        },
        warnings: [],
        actionItems: []
      })
    });

    const result = await readLatestHealthSnapshot({ reportsRoot: "reports/ebos", fs });

    expect(result?.data?.commands).toEqual([]);
    expect(result?.warning?.message).toContain("meta.contractVersion");
  });

  test("finds the latest health report by filename date", async () => {
    const fs = fakeFs({
      "reports/ebos/health/2026-07-01-health-snapshot.json": "{}",
      "reports/ebos/health/2026-07-02-health-snapshot.json": "{}"
    });

    const result = await findLatestJsonReport({
      directory: "reports/ebos/health",
      suffix: "-health-snapshot.json",
      fs
    });

    expect(result?.filePath).toBe("reports/ebos/health/2026-07-02-health-snapshot.json");
  });

  test("reads latest health snapshot payload", async () => {
    const fs = fakeFs({
      "reports/ebos/health/2026-07-02-health-snapshot.json": JSON.stringify({
        snapshot: {
          generatedAt: "2026-07-02T12:00:00.000Z",
          commands: []
        },
        score: {
          score: 75
        }
      })
    });

    const result = await readLatestHealthSnapshot({
      reportsRoot: "reports/ebos",
      fs
    });

    expect(result?.data?.generatedAt).toBeInstanceOf(Date);
    expect(result?.data?.commands).toEqual([]);
    expect(result?.warning).toBeUndefined();
  });

  test("reads latest data-source readiness payload", async () => {
    const fs = fakeFs({
      "reports/ebos/data-sources/2026-07-02-data-sources.json": JSON.stringify({
        generatedAt: "2026-07-02T12:00:00.000Z",
        checks: [],
        summary: {
          available: 0,
          configured: 1,
          missing_config: 8,
          not_configured: 0,
          unavailable: 0,
          unknown: 0
        },
        recommendations: []
      })
    });

    const result = await readLatestDataSourceReadiness({
      reportsRoot: "reports/ebos",
      fs
    });

    expect(result?.data?.summary.missing_config).toBe(8);
    expect(result?.warning).toBeUndefined();
  });

  test("returns null when no report file exists", async () => {
    const result = await readLatestHealthSnapshot({
      reportsRoot: "reports/ebos",
      fs: fakeFs({})
    });

    expect(result).toBeNull();
  });

  test("returns a warning object when JSON is corrupted", async () => {
    const result = await safeReadJsonFile({
      filePath: "reports/ebos/health/2026-07-02-health-snapshot.json",
      fs: fakeFs({
        "reports/ebos/health/2026-07-02-health-snapshot.json": "{bad json"
      })
    });

    expect(result.data).toBeNull();
    expect(result.warning).toBeDefined();
    expect(result.warning?.message).toContain("Failed to parse JSON");
  });
});
