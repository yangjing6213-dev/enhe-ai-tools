import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { EbosEvidenceCatalog } from "../../evidence";
import { validateEvidenceEnvelope, wrapMarketEvidence } from "../../evidence";
import { buildMarketEvidence } from "../market-evidence-builder";

const tempDirs: string[] = [];

async function createTempCatalog() {
  const dir = await mkdtemp(join(tmpdir(), "ebos-market-"));
  tempDirs.push(dir);
  const productPath = join(dir, "product.json");
  const revenuePath = join(dir, "revenue.json");
  await writeFile(productPath, JSON.stringify({
    payload: {
      productAudits: [
        { slug: "faceswap-studio-ai", productName: "FaceSwap Studio｜本地人像合成研究工具", score: 92 },
        { slug: "local-ai-video-studio-for-creator-workflows", productName: "AI Video Studio｜本地视频生成工作台", score: 91 }
      ]
    }
  }), "utf8");
  await writeFile(revenuePath, JSON.stringify({
    payload: {
      revenueSummary: {
        firstRevenueAchieved: false
      }
    }
  }), "utf8");

  const catalog: EbosEvidenceCatalog = {
    catalogVersion: "ebos-evidence-catalog-v1",
    generatedAt: "2026-07-03T00:00:00.000Z",
    rootDir: dir,
    totalEntries: 2,
    entries: [],
    summary: {
      byKind: {},
      byConfidence: {},
      byValidationStatus: {},
      latestByKind: {
        product_evidence: {
          id: "product",
          filePath: productPath,
          fileName: "product.json",
          evidenceKind: "product_evidence",
          contractVersion: "ebos-evidence-v1",
          targetDate: "2026-07-03",
          generatedAt: "2026-07-03T00:00:00.000Z",
          generator: "unit-test",
          score: 91,
          confidence: "complete",
          warningsCount: 0,
          errorsCount: 0,
          actionItemsCount: 0,
          validationStatus: "valid"
        },
        revenue_evidence: {
          id: "revenue",
          filePath: revenuePath,
          fileName: "revenue.json",
          evidenceKind: "revenue_evidence",
          contractVersion: "ebos-evidence-v1",
          targetDate: "2026-07-03",
          generatedAt: "2026-07-03T00:00:00.000Z",
          generator: "unit-test",
          score: 50,
          confidence: "partial",
          warningsCount: 1,
          errorsCount: 0,
          actionItemsCount: 1,
          validationStatus: "valid_with_warnings",
          payloadSummary: {
            firstRevenueAchieved: false
          }
        }
      },
      missingKinds: [],
      averageScore: 70,
      criticalWarningsCount: 0,
      openActionItemsCount: 0,
      dateRange: {
        start: "2026-07-03",
        end: "2026-07-03"
      }
    }
  };
  const catalogPath = join(dir, "latest-evidence-catalog.json");
  await writeFile(catalogPath, JSON.stringify(catalog), "utf8");
  return catalogPath;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("market evidence builder", () => {
  test("does not crash with empty market input", async () => {
    const evidence = await buildMarketEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      manualInput: {
        observationTopics: [],
        signals: []
      }
    });

    expect(evidence.signals).toEqual([]);
    expect(evidence.confidence).toBe("unknown");
    expect(evidence.warnings).toContainEqual(expect.objectContaining({
      code: "missing_market_signals"
    }));
  });

  test("manual-only market evidence has partial confidence and seed warning", async () => {
    const evidence = await buildMarketEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z"
    });

    expect(evidence.signals.length).toBeGreaterThan(5);
    expect(evidence.confidence).toBe("partial");
    expect(evidence.warnings.some((warning) => warning.code === "manual_market_seed")).toBe(true);
  });

  test("uses product and revenue evidence to prioritize low-cost validation directions", async () => {
    const catalogPath = await createTempCatalog();
    const evidence = await buildMarketEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      catalogPath,
      manualInput: {
        observationTopics: ["AI 视频生成"],
        signals: [{
          title: "AI Video workflow templates for creators",
          description: "Creators need workflow packs and prompt kits to save time and commercialize video generation."
        }]
      }
    });

    expect(evidence.recommendedProductDirections[0]?.productDirection).toContain("AI 视频");
    expect(evidence.recommendedProductDirections[0]?.recommendedAction).toBe("validate_first");
    expect(evidence.actionItems[0]?.title).toContain("验证市场机会");
  });

  test("does not crash when public RSS fetch fails", async () => {
    const evidence = await buildMarketEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      includeNetworkSources: true,
      env: {
        EBOS_MARKET_RSS_URLS: "https://example.com/rss.xml|Example RSS"
      },
      fetcher: vi.fn(async () => {
        throw new Error("network down");
      })
    });

    expect(evidence.warnings).toContainEqual(expect.objectContaining({
      code: "rss_source_unavailable",
      message: expect.stringContaining("network down")
    }));
  });

  test("wraps market evidence in a valid envelope", async () => {
    const evidence = await buildMarketEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z"
    });
    const envelope = wrapMarketEvidence(evidence, {
      targetDate: evidence.targetDate,
      generatedAt: evidence.generatedAt,
      periodStart: evidence.periodStart,
      periodEnd: evidence.periodEnd,
      generator: "unit-test"
    });

    expect(envelope.meta.evidenceKind).toBe("market_evidence");
    expect(envelope.quality.score).toBe(evidence.overallScore);
    expect(validateEvidenceEnvelope(envelope)).toEqual({ valid: true, issues: [] });
  });
});
