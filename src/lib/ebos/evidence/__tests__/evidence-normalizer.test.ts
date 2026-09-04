import { describe, expect, test } from "vitest";
import {
  normalizeEvidenceActionItems,
  normalizeEvidenceWarnings,
  wrapDataSourceReadinessEvidence,
  wrapHealthSnapshotEvidence,
  wrapMarketEvidence,
  wrapRevenueEvidence,
  wrapWeeklyReportEvidence
} from "../evidence-normalizer";

describe("evidence normalizer", () => {
  test("wraps a health snapshot JSON object into an envelope", () => {
    const envelope = wrapHealthSnapshotEvidence({
      snapshot: {
        generatedAt: "2026-07-03T00:00:00.000Z",
        commands: [
          { key: "lint", status: "passed" },
          { key: "unit_tests", status: "skipped" }
        ]
      },
      score: {
        score: 91,
        grade: "excellent",
        confidence: "partial",
        risks: [{ severity: "info", message: "No failed health checks recorded." }]
      }
    }, {
      targetDate: "2026-07-03",
      generator: "unit-test",
      sourceFiles: ["reports/ebos/health/2026-07-03-health-snapshot.json"]
    });

    expect(envelope.meta.evidenceKind).toBe("health_snapshot");
    expect(envelope.quality.score).toBe(91);
    expect(envelope.quality.confidence).toBe("partial");
    expect(envelope.quality.warningsCount).toBe(2);
    expect(envelope.quality.errorsCount).toBe(0);
    expect(envelope.quality.missingSources).toContain("unit_tests");
  });

  test("wraps data-source readiness into an envelope and records missing sources", () => {
    const envelope = wrapDataSourceReadinessEvidence({
      generatedAt: "2026-07-03T00:00:00.000Z",
      checks: [
        {
          key: "google_analytics",
          label: "Google Analytics",
          status: "missing_config",
          checkedAt: "2026-07-03T00:00:00.000Z",
          missingEnvKeys: ["GA_PROPERTY_ID"]
        }
      ],
      summary: {
        available: 0,
        configured: 0,
        missing_config: 1,
        not_configured: 0,
        unavailable: 0,
        unknown: 0
      },
      recommendations: []
    }, {
      targetDate: "2026-07-03",
      generator: "unit-test"
    });

    expect(envelope.meta.evidenceKind).toBe("data_source_readiness");
    expect(envelope.quality.missingSources).toEqual(["google_analytics"]);
    expect(envelope.quality.warningsCount).toBe(1);
  });

  test("wraps a weekly report object into an envelope", () => {
    const report = {
      generatedAt: "2026-07-03T00:00:00.000Z",
      overallScore: 57,
      confidence: "partial",
      period: {
        start: "2026-06-29T00:00:00.000Z",
        end: "2026-07-05T23:59:59.999Z"
      },
      warnings: [{ code: "missing_data", severity: "warning", message: "Missing GSC", source: "google_search_console" }],
      actionItems: [{ title: "Add GSC", priority: "medium", status: "open", verification: "GSC available" }]
    };
    const envelope = wrapWeeklyReportEvidence(report, {
      targetDate: "2026-07-03",
      generator: "unit-test"
    });

    expect(envelope.meta.evidenceKind).toBe("weekly_report");
    expect(envelope.meta.periodStart).toBe("2026-06-29");
    expect(envelope.meta.periodEnd).toBe("2026-07-05");
    expect(envelope.quality.score).toBe(57);
    expect(envelope.warnings).toHaveLength(1);
    expect(envelope.actionItems[0]).toMatchObject({
      title: "Add GSC",
      owner: "codex"
    });
  });

  test("normalizes warnings and action items", () => {
    expect(normalizeEvidenceWarnings([
      { code: "missing_data", severity: "critical", message: "Missing", source: "whop" }
    ])).toEqual([
      { code: "missing_data", severity: "critical", message: "Missing", source: "whop" }
    ]);

    expect(normalizeEvidenceActionItems([
      { title: "Fix", priority: "high", status: "planned", verification: "Done" }
    ])[0]).toMatchObject({
      id: "action-1",
      title: "Fix",
      priority: "high",
      owner: "codex",
      status: "open"
    });
  });

  test("wraps revenue evidence into an envelope", () => {
    const envelope = wrapRevenueEvidence({
      overallScore: 42,
      confidence: "partial",
      warnings: [{ code: "no_revenue", severity: "warning", message: "尚未完成第一批真实收入验证。", source: "internal_database" }],
      actionItems: [{ title: "验证首批收入", priority: "high", status: "open" }]
    }, {
      targetDate: "2026-07-03",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      generator: "unit-test"
    });

    expect(envelope.meta.evidenceKind).toBe("revenue_evidence");
    expect(envelope.meta.periodStart).toBe("2026-06-29");
    expect(envelope.meta.periodEnd).toBe("2026-07-05");
    expect(envelope.quality.score).toBe(42);
    expect(envelope.warnings).toHaveLength(1);
    expect(envelope.actionItems[0]?.title).toBe("验证首批收入");
  });

  test("wraps market evidence into an envelope", () => {
    const envelope = wrapMarketEvidence({
      overallScore: 76,
      confidence: "partial",
      warnings: [{ code: "manual_market_seed", severity: "warning", message: "manual input 为观察种子", source: "manual_input" }],
      actionItems: [{ title: "验证市场机会：AI 视频工作流包", priority: "high", status: "open" }]
    }, {
      targetDate: "2026-07-03",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      generator: "unit-test"
    });

    expect(envelope.meta.evidenceKind).toBe("market_evidence");
    expect(envelope.meta.periodStart).toBe("2026-06-29");
    expect(envelope.meta.periodEnd).toBe("2026-07-05");
    expect(envelope.quality.score).toBe(76);
    expect(envelope.warnings).toHaveLength(1);
    expect(envelope.actionItems[0]?.title).toContain("AI 视频");
  });
});
