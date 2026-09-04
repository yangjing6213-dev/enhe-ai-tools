import { describe, expect, test } from "vitest";
import { buildSyntheticFailureScenario } from "../synthetic-failure-scenario-builder";

describe("buildSyntheticFailureScenario", () => {
  test("marks the worst-case data as synthetic and blocks real backfill usage", () => {
    const scenario = buildSyntheticFailureScenario({
      targetDate: "2026-07-03",
      now: "2026-07-06T00:00:00.000Z"
    });

    expect(scenario.scenarioType).toBe("synthetic_failure_scenario");
    expect(scenario.synthetic).toBe(true);
    expect(scenario.warnings).toContain("Do not backfill as real data.");
    expect(scenario.warnings).toContain("Do not use for revenue evidence.");
    expect(scenario.simulatedFunnelSummary.simulatedRevenue).toBe(0);
    expect(scenario.simulatedFunnelSummary.simulatedPaidOrders).toBe(0);
    expect(JSON.stringify(scenario)).not.toContain("\"published\":");
  });

  test("builds expected manual outreach, wechat, and xiaohongshu failure data", () => {
    const scenario = buildSyntheticFailureScenario({ targetDate: "2026-07-03" });
    const byChannel = new Map(scenario.simulatedChannelResults.map((result) => [result.channel, result]));

    expect(byChannel.get("manual_outreach")).toMatchObject({
      simulatedPublished: true,
      simulatedMessages: 10,
      simulatedPositiveReplies: 0,
      simulatedNegativeReplies: 2,
      simulatedLeads: 0,
      simulatedOrders: 0,
      simulatedRevenue: 0
    });
    expect(byChannel.get("wechat")).toMatchObject({
      simulatedPublished: true,
      simulatedViews: 20,
      simulatedClicks: 1,
      simulatedMessages: 0,
      simulatedLeads: 0,
      simulatedOrders: 0,
      simulatedRevenue: 0
    });
    expect(byChannel.get("xiaohongshu")).toMatchObject({
      simulatedPublished: true,
      simulatedViews: 80,
      simulatedSaves: 0,
      simulatedShares: 0,
      simulatedMessages: 0,
      simulatedLeads: 0,
      simulatedOrders: 0,
      simulatedRevenue: 0
    });
  });
});

