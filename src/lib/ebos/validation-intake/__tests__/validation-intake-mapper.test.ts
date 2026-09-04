import { describe, expect, test } from "vitest";
import {
  mapExternalIntakeToValidationChanges,
  mergeExternalChannelRecordsByPlan,
  preserveExistingValidationMetrics
} from "../validation-intake-mapper";
import type { EbosExternalChannelIntakeInput } from "../validation-intake-types";
import type { EbosValidationInputFile } from "../../validation";

const validationInput: EbosValidationInputFile = {
  targetDate: "2026-07-03",
  results: [
    {
      planId: "plan-1",
      status: "running",
      listingViews: 20,
      userFeedback: ["existing feedback"],
      channelResults: [{ channel: "manual", notes: "existing channel note" }]
    },
    { planId: "plan-2", status: "running" },
    { planId: "plan-3", status: "running" }
  ]
};

describe("external intake mapper", () => {
  test("merges records by target plan", () => {
    const grouped = mergeExternalChannelRecordsByPlan([
      { channel: "xianyu", targetPlanId: "plan-1", views: 1 },
      { channel: "wechat", targetPlanId: "plan-1", messages: 2 }
    ]);

    expect(grouped["plan-1"]).toHaveLength(2);
  });

  test("maps marketplace records without overwriting higher existing metrics", () => {
    const input: EbosExternalChannelIntakeInput = {
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: ["xianyu"],
      planResults: [{
        channel: "xianyu",
        targetPlanId: "plan-1",
        views: 12,
        clicks: 3,
        messages: 2,
        orders: 1,
        paidOrders: 1,
        revenue: 99,
        refundCount: 0,
        userFeedback: ["new feedback"],
        notes: "xianyu note"
      }],
      notes: []
    };

    const result = mapExternalIntakeToValidationChanges(input, validationInput);
    const plan = result.validationInput.results.find((item) => item.planId === "plan-1");

    expect(plan).toEqual(expect.objectContaining({
      listingViews: 20,
      clicks: 3,
      messages: 2,
      paidOrders: 1,
      revenue: 99
    }));
    expect(plan?.userFeedback).toEqual(["existing feedback", "new feedback"]);
    expect(plan?.channelResults?.map((item) => item.notes)).toEqual(expect.arrayContaining([
      "existing channel note",
      "xianyu note"
    ]));
    expect(result.skippedChanges).toContainEqual(expect.objectContaining({
      planId: "plan-1",
      field: "listingViews"
    }));
  });

  test("maps social and outreach records to validation fields", () => {
    const input: EbosExternalChannelIntakeInput = {
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: ["xiaohongshu", "wechat"],
      planResults: [
        {
          channel: "xiaohongshu",
          targetPlanId: "plan-2",
          views: 200,
          clicks: 8,
          saves: 6,
          shares: 2,
          messages: 3,
          leads: 4
        },
        {
          channel: "wechat",
          targetPlanId: "plan-3",
          messages: 5,
          positiveReplies: 2,
          negativeReplies: 1,
          orders: 1,
          revenue: 49
        }
      ],
      notes: []
    };

    const result = mapExternalIntakeToValidationChanges(input, validationInput);
    const plan2 = result.validationInput.results.find((item) => item.planId === "plan-2");
    const plan3 = result.validationInput.results.find((item) => item.planId === "plan-3");

    expect(plan2).toEqual(expect.objectContaining({
      contentViews: 200,
      ctaClicks: 8,
      saves: 6,
      shares: 2,
      leads: 7
    }));
    expect(plan3).toEqual(expect.objectContaining({
      leads: 5,
      positiveReplies: 2,
      negativeReplies: 1,
      paidOrders: 1,
      revenue: 49
    }));
  });

  test("skips records for unknown plan ids", () => {
    const result = mapExternalIntakeToValidationChanges({
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: ["xianyu"],
      planResults: [{ channel: "xianyu", targetPlanId: "missing-plan", views: 10 }],
      notes: []
    }, validationInput);

    expect(result.appliedChanges).toEqual([]);
    expect(result.skippedChanges).toContainEqual(expect.objectContaining({
      planId: "missing-plan",
      reason: expect.stringContaining("not found")
    }));
  });

  test("preserves existing validation metrics through cloning", () => {
    const preserved = preserveExistingValidationMetrics(validationInput);

    expect(preserved).toEqual(validationInput);
    expect(preserved).not.toBe(validationInput);
    expect(preserved.results).not.toBe(validationInput.results);
  });
});
