import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import type { EbosEvidenceEnvelope } from "../evidence-contract";
import {
  buildEvidenceCatalog,
  scanEvidenceFiles,
  writeEvidenceCatalog
} from "../evidence-indexer";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createTempEvidenceRoot() {
  const root = await mkdtemp(join(tmpdir(), "ebos-evidence-"));
  tempRoots.push(root);
  return root;
}

function envelope(kind: "health_snapshot" | "weekly_report", targetDate: string): EbosEvidenceEnvelope<{ ok: true }> {
  return {
    meta: {
      contractVersion: "ebos-evidence-v1",
      evidenceKind: kind,
      generatedAt: `${targetDate}T00:00:00.000Z`,
      targetDate,
      generator: "unit-test"
    },
    quality: {
      score: kind === "health_snapshot" ? 91 : 67,
      confidence: "complete",
      dataCompleteness: "complete",
      warningsCount: 0,
      errorsCount: 0
    },
    payload: { ok: true },
    warnings: [],
    actionItems: []
  };
}

async function writeEvidence(root: string, kind: "health_snapshot" | "weekly_report", fileName: string) {
  const directory = join(root, kind);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, fileName), JSON.stringify(envelope(kind, fileName.slice(0, 10))), "utf8");
}

describe("evidence indexer", () => {
  test("scans multiple kind directories and skips catalog", async () => {
    const root = await createTempEvidenceRoot();
    await writeEvidence(root, "health_snapshot", "2026-07-03-health_snapshot.json");
    await writeEvidence(root, "weekly_report", "2026-06-29-weekly_report.json");
    await mkdir(join(root, "catalog"), { recursive: true });
    await writeFile(join(root, "catalog", "latest-evidence-catalog.json"), "{}", "utf8");

    const files = await scanEvidenceFiles({ rootDir: root });

    expect(files.map((file) => file.evidenceKind).sort()).toEqual(["health_snapshot", "weekly_report"]);
    expect(files.some((file) => file.filePath.includes("catalog"))).toBe(false);
  });

  test("only scans json files", async () => {
    const root = await createTempEvidenceRoot();
    await writeEvidence(root, "health_snapshot", "2026-07-03-health_snapshot.json");
    await writeFile(join(root, "health_snapshot", "notes.md"), "# no", "utf8");

    const files = await scanEvidenceFiles({ rootDir: root });

    expect(files).toHaveLength(1);
    expect(files[0]?.fileName).toBe("2026-07-03-health_snapshot.json");
  });

  test("corrupted json does not fail the whole catalog build", async () => {
    const root = await createTempEvidenceRoot();
    await writeEvidence(root, "health_snapshot", "2026-07-03-health_snapshot.json");
    await mkdir(join(root, "weekly_report"), { recursive: true });
    await writeFile(join(root, "weekly_report", "2026-06-29-weekly_report.json"), "{bad json", "utf8");

    const catalog = await buildEvidenceCatalog({
      rootDir: root,
      generatedAt: "2026-07-03T00:00:00.000Z"
    });

    expect(catalog.totalEntries).toBe(2);
    expect(catalog.entries.some((entry) => entry.validationStatus === "invalid")).toBe(true);
    expect(catalog.summary.byKind.health_snapshot).toBe(1);
  });

  test("writes latest-evidence-catalog.json", async () => {
    const root = await createTempEvidenceRoot();
    const catalog = await buildEvidenceCatalog({
      rootDir: root,
      generatedAt: "2026-07-03T00:00:00.000Z"
    });

    const result = await writeEvidenceCatalog(catalog, {
      outputDir: join(root, "catalog"),
      dateKey: "2026-07-03"
    });

    expect(result.latestPath.endsWith("latest-evidence-catalog.json")).toBe(true);
    const latest = JSON.parse(await readFile(result.latestPath, "utf8")) as { catalogVersion: string };
    expect(latest.catalogVersion).toBe("ebos-evidence-catalog-v1");
  });
});
