import type { EbosValidationMethod } from "../decision";
import type {
  EbosValidationExecutionDecisionRule,
  EbosValidationExecutionThresholds
} from "./validation-execution-types";

export function getDefaultSuccessThresholds(method: EbosValidationMethod): EbosValidationExecutionThresholds {
  switch (method) {
    case "landing_page":
      return thresholds(
        ["CTA clicks >= 10"],
        ["leads >= 3"],
        ["leads keep growing for two review cycles"],
        ["pageViews = 0 or no CTA clicks/leads after the test window"]
      );
    case "presale":
      return thresholds(
        ["qualified inquiries >= 1"],
        ["presaleOrders >= 1"],
        ["revenue > 0", "refundCount = 0"],
        ["no presale order, no lead, and no buyer feedback"]
      );
    case "content_test":
      return thresholds(
        ["contentViews >= 100 and CTA clicks >= 5"],
        ["leads >= 2"],
        ["repeat content CTA leads in the next cycle"],
        ["contentViews remain low and no CTA clicks/leads are recorded"]
      );
    case "marketplace_listing":
      return thresholds(
        ["messages >= 3"],
        ["orders >= 1"],
        ["orders >= 1 and revenue > 0"],
        ["listingViews exist but no messages/orders after the test window"]
      );
    case "manual_outreach":
      return thresholds(
        ["positiveReplies >= 3"],
        ["orders >= 1"],
        ["orders >= 1 or callsBooked keep converting"],
        ["manual outreach produces no replies or only negative replies"]
      );
    case "pricing_test":
      return thresholds(
        ["paidOrders >= 1 and refundCount > 0 requires refund reason analysis"],
        ["paidOrders >= 1 and refundCount = 0"],
        ["paidOrders >= 1 and refundCount = 0 can continue or scale"],
        ["priceShown but no CTA clicks, paid orders, or feedback"]
      );
  }
}

export function getValidationDecisionRule(method: EbosValidationMethod): EbosValidationExecutionDecisionRule {
  const thresholds = getDefaultSuccessThresholds(method);
  return {
    partialSuccess: thresholds.partialSuccess.join("; "),
    success: thresholds.success.join("; "),
    scaleOrContinue: thresholds.scaleOrContinue.join("; "),
    failure: thresholds.failure.join("; ")
  };
}

export function describeValidationOutcomeRule(method: EbosValidationMethod) {
  const rule = getValidationDecisionRule(method);
  return [
    `partial_success: ${rule.partialSuccess}`,
    `success: ${rule.success}`,
    `continue_or_scale: ${rule.scaleOrContinue}`,
    `failed: ${rule.failure}`
  ].join(" | ");
}

function thresholds(
  partialSuccess: string[],
  success: string[],
  scaleOrContinue: string[],
  failure: string[]
): EbosValidationExecutionThresholds {
  return {
    partialSuccess,
    success,
    scaleOrContinue,
    failure
  };
}
