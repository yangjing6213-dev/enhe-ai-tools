import { describe, expect, test } from "vitest";
import {
  summarizeExternalIntakeCompleteness,
  validateExternalChannelRecord,
  validateExternalIntakeInput
} from "../validation-intake-validator";

describe("external intake validator", () => {
  test("warns on negative numeric fields", () => {
    const result = validateExternalChannelRecord({
      channel: "xianyu",
      targetPlanId: "plan-1",
      views: -1
    });

    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "external_intake_negative_number",
      field: "views"
    }));
  });

  test("warns on inconsistent channel metrics", () => {
    const result = validateExternalChannelRecord({
      channel: "xianyu",
      targetPlanId: "plan-1",
      views: 1,
      clicks: 2,
      messages: 3,
      orders: 1,
      paidOrders: 2,
      revenue: 99,
      refundCount: 3,
      refundedAmount: 199
    });

    expect(result.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      "external_intake_clicks_exceed_views",
      "external_intake_messages_exceed_views",
      "external_intake_paid_orders_exceed_orders",
      "external_intake_refunds_exceed_paid_orders",
      "external_intake_refunded_amount_exceeds_revenue"
    ]));
  });

  test("warns when revenue is recorded without paid orders", () => {
    const result = validateExternalChannelRecord({
      channel: "whop",
      targetPlanId: "plan-1",
      revenue: 99,
      paidOrders: 0
    });

    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "external_intake_revenue_without_paid_orders"
    }));
  });

  test("summarizes empty input without treating it as fatal", () => {
    const validation = validateExternalIntakeInput({
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: [],
      planResults: [],
      notes: []
    });
    const completeness = summarizeExternalIntakeCompleteness(validation.input);

    expect(validation.isValid).toBe(true);
    expect(completeness.completenessPercent).toBe(0);
    expect(completeness.level).toBe("empty");
  });

  test("calculates completeness from records that contain real signals", () => {
    const completeness = summarizeExternalIntakeCompleteness({
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: ["xianyu", "wechat"],
      planResults: [
        { channel: "xianyu", targetPlanId: "plan-1", views: 10 },
        { channel: "wechat", targetPlanId: "plan-2", views: 0, userFeedback: [] }
      ],
      notes: []
    });

    expect(completeness.totalRecords).toBe(2);
    expect(completeness.recordsWithAnySignal).toBe(1);
    expect(completeness.completenessPercent).toBe(50);
    expect(completeness.level).toBe("low");
  });
});
