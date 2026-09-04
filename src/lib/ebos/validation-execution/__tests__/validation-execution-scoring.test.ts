import { describe, expect, test } from "vitest";
import {
  describeValidationOutcomeRule,
  getDefaultSuccessThresholds,
  getValidationDecisionRule
} from "../validation-execution-scoring";

describe("validation execution scoring", () => {
  test("returns landing page thresholds", () => {
    const thresholds = getDefaultSuccessThresholds("landing_page");

    expect(thresholds.partialSuccess).toContain("CTA clicks >= 10");
    expect(thresholds.success).toContain("leads >= 3");
  });

  test("returns presale thresholds", () => {
    const thresholds = getDefaultSuccessThresholds("presale");

    expect(thresholds.success).toContain("presaleOrders >= 1");
    expect(thresholds.scaleOrContinue).toContain("revenue > 0");
  });

  test("returns marketplace thresholds", () => {
    const thresholds = getDefaultSuccessThresholds("marketplace_listing");

    expect(thresholds.partialSuccess).toContain("messages >= 3");
    expect(thresholds.success).toContain("orders >= 1");
  });

  test("describes pricing refund rule", () => {
    const rule = getValidationDecisionRule("pricing_test");
    const description = describeValidationOutcomeRule("pricing_test");

    expect(rule.success).toContain("refundCount = 0");
    expect(rule.partialSuccess).toContain("refundCount > 0");
    expect(description).toContain("refund");
  });
});
