import { describe, expect, test } from "vitest";
import {
  collectValidationInputWarnings,
  summarizeValidationInputCompleteness,
  validateSinglePlanResult,
  validateValidationInput
} from "../validation-input-validator";

describe("validation input validator", () => {
  test("accepts empty input but reports empty completeness", () => {
    const validation = validateValidationInput({});
    const completeness = summarizeValidationInputCompleteness({});

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(completeness.level).toBe("empty");
    expect(completeness.completenessPercent).toBe(0);
  });

  test("requires planId and a supported status", () => {
    const missingPlanId = validateSinglePlanResult({ status: "completed" });
    const invalidStatus = validateSinglePlanResult({ planId: "plan-1", status: "done" });

    expect(missingPlanId.isValid).toBe(false);
    expect(missingPlanId.errors.map((error) => error.code)).toContain("validation_plan_id_missing");
    expect(invalidStatus.isValid).toBe(false);
    expect(invalidStatus.errors.map((error) => error.code)).toContain("validation_status_invalid");
  });

  test("rejects negative numeric fields", () => {
    const validation = validateSinglePlanResult({
      planId: "plan-1",
      status: "completed",
      ctaClicks: -1
    });

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContainEqual(expect.objectContaining({
      code: "validation_negative_numeric_field",
      source: "ctaClicks"
    }));
  });

  test("collects data consistency warnings", () => {
    const warnings = collectValidationInputWarnings({
      results: [{
        planId: "plan-1",
        status: "completed",
        pageViews: 5,
        ctaClicks: 10,
        leads: 11,
        paidOrders: 0,
        revenue: 99,
        refundCount: 2,
        listingViews: 1,
        messages: 3
      }]
    });

    expect(warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      "validation_revenue_without_paid_orders",
      "validation_refunds_exceed_paid_orders",
      "validation_leads_exceed_cta_clicks",
      "validation_cta_clicks_exceed_page_views",
      "validation_messages_exceed_listing_views"
    ]));
  });

  test("warns when paid orders and revenue disagree", () => {
    const warnings = collectValidationInputWarnings({
      results: [{
        planId: "plan-1",
        status: "completed",
        paidOrders: 1,
        revenue: 0
      }]
    });

    expect(warnings).toContainEqual(expect.objectContaining({
      code: "validation_paid_orders_without_revenue"
    }));
  });

  test("records conversion rate scale for valid values", () => {
    const fractional = collectValidationInputWarnings({
      results: [{ planId: "plan-1", status: "completed", conversionRate: 0.25 }]
    });
    const percent = collectValidationInputWarnings({
      results: [{ planId: "plan-1", status: "completed", conversionRate: 25 }]
    });

    expect(fractional).toContainEqual(expect.objectContaining({
      code: "validation_conversion_rate_fraction_scale",
      severity: "info"
    }));
    expect(percent).toContainEqual(expect.objectContaining({
      code: "validation_conversion_rate_percent_scale",
      severity: "info"
    }));
  });

  test("calculates completeness and suggested fields to fill", () => {
    const completeness = summarizeValidationInputCompleteness({
      results: [{
        planId: "plan-1",
        status: "completed",
        pageViews: 100,
        ctaClicks: 12,
        leads: 2,
        revenue: 0,
        notes: ""
      }]
    });

    expect(completeness.level).toBe("medium");
    expect(completeness.completenessPercent).toBeGreaterThan(0);
    expect(completeness.suggestedFieldsToFill["plan-1"]).toContain("revenue");
    expect(completeness.suggestedFieldsToFill["plan-1"]).toContain("notes");
  });
});
