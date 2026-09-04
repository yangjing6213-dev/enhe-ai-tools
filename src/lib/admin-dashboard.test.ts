import { describe, expect, it } from "vitest";
import {
  buildDailyTrendBuckets,
  calculateGrowthPercent,
  calculateRatePercent,
  formatDashboardAmount,
  rankPopularTools
} from "@/lib/admin-dashboard";

describe("admin dashboard helpers", () => {
  it("calculates user growth with safe zero handling", () => {
    expect(calculateGrowthPercent(15, 10)).toBe(50);
    expect(calculateGrowthPercent(3, 0)).toBe(100);
    expect(calculateGrowthPercent(0, 0)).toBe(0);
    expect(calculateGrowthPercent(5, 10)).toBe(-50);
  });

  it("formats dashboard amount without losing cents", () => {
    expect(formatDashboardAmount("1288.5")).toBe("CNY 1288.50");
    expect(formatDashboardAmount(null)).toBe("CNY 0.00");
  });

  it("ranks popular tools by combined download and usage counts", () => {
    const ranked = rankPopularTools([
      { name: "A", downloadCount: 10, usageCount: 1 },
      { name: "B", downloadCount: 3, usageCount: 20 },
      { name: "C", downloadCount: 3, usageCount: 4 }
    ]);

    expect(ranked.map((tool) => tool.name)).toEqual(["B", "A", "C"]);
    expect(ranked[0].score).toBe(23);
  });

  it("calculates rates with zero-safe percentage output", () => {
    expect(calculateRatePercent(3, 12)).toBe(25);
    expect(calculateRatePercent(0, 12)).toBe(0);
    expect(calculateRatePercent(5, 0)).toBe(0);
  });

  it("builds daily trend buckets with missing days filled", () => {
    const buckets = buildDailyTrendBuckets(
      new Date("2026-05-20T00:00:00.000Z"),
      3,
      [
        { date: new Date("2026-05-20T09:00:00.000Z"), amount: 10, count: 1 },
        { date: new Date("2026-05-22T11:00:00.000Z"), amount: 7.5, count: 2 }
      ]
    );

    expect(buckets).toEqual([
      { date: "2026-05-20", amount: 10, count: 1 },
      { date: "2026-05-21", amount: 0, count: 0 },
      { date: "2026-05-22", amount: 7.5, count: 2 }
    ]);
  });
});
