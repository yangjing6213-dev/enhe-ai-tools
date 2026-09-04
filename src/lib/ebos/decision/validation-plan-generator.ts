import type {
  EbosDecisionPriorities,
  EbosPriorityExistingProduct,
  EbosPriorityProductDirection,
  EbosValidationMethod,
  EbosValidationPlan
} from "./decision-types";

type PlanCandidate =
  | { type: "direction"; score: number; item: EbosPriorityProductDirection }
  | { type: "product"; score: number; item: EbosPriorityExistingProduct };

export function generateValidationPlans(
  priorities: EbosDecisionPriorities,
  _evidence?: unknown
): EbosValidationPlan[] {
  const candidates: PlanCandidate[] = [
    ...priorities.priorityProductDirections.map((item) => ({ type: "direction" as const, score: item.totalPriorityScore, item })),
    ...priorities.priorityExistingProducts.map((item) => ({ type: "product" as const, score: item.totalPriorityScore, item }))
  ];

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((candidate, index) => candidate.type === "direction"
      ? planForDirection(candidate.item, index)
      : planForProduct(candidate.item, index));
}

export function generateCodexTasksForValidationPlan(plan: EbosValidationPlan) {
  return plan.codexTasks;
}

export function generateHumanTasksForValidationPlan(plan: EbosValidationPlan) {
  return plan.humanTasks;
}

function planForDirection(direction: EbosPriorityProductDirection, index: number): EbosValidationPlan {
  const method = methodForDirection(direction.name);
  return {
    id: `validation-direction-${index + 1}-${slugify(direction.name)}`,
    title: `Validate ${direction.name}`,
    targetDirection: direction.name,
    objective: `Validate whether ${direction.name} can produce near-term purchase intent before heavy development.`,
    hypothesis: `If ENHE presents a clear ${direction.name} offer, users will click CTA, leave leads, or place at least one presale order.`,
    validationMethod: method,
    successMetric: successMetricForMethod(method),
    minimumSuccessThreshold: thresholdForMethod(method),
    durationDays: 7,
    requiredAssets: assetsForMethod(method, direction.name),
    codexTasks: [
      `Draft one focused ${direction.name} validation page with pricing, FAQ, and CTA.`,
      `Add tracking notes for CTA clicks, leads, and manual purchase intent.`,
      `Create one comparison or use-case content brief supporting ${direction.name}.`
    ],
    humanTasks: [
      `Review the ${direction.name} offer and decide the validation price.`,
      "Respond manually to leads or presale inquiries within 24 hours."
    ],
    risks: direction.risks.length ? direction.risks : ["Validation signals do not prove scaled demand."]
  };
}

function planForProduct(product: EbosPriorityExistingProduct, index: number): EbosValidationPlan {
  const method: EbosValidationMethod = "pricing_test";
  return {
    id: `validation-product-${index + 1}-${slugify(product.slug ?? product.productName)}`,
    title: `Validate existing product: ${product.productName}`,
    targetDirection: "Existing product revenue validation",
    targetProduct: product.productName,
    objective: `Validate whether ${product.productName} can produce first-revenue intent before starting new product work.`,
    hypothesis: `If pricing, CTA, and delivery details are clear, ${product.productName} can produce measurable purchase intent.`,
    validationMethod: method,
    successMetric: "Product page CTA clicks, leads, or presale orders.",
    minimumSuccessThreshold: "CTA clicks >= 10 or leads >= 3 or presale orders >= 1 within 7 days.",
    durationDays: 7,
    requiredAssets: [
      "Product page pricing block",
      "Delivery/support copy",
      "CTA tracking checklist"
    ],
    codexTasks: [
      `Audit ${product.productName} product page pricing, CTA, FAQ, and delivery copy.`,
      `Draft a pricing test checklist for ${product.productName}.`
    ],
    humanTasks: [
      `Confirm the ${product.productName} validation offer and price.`,
      "Handle manual payment, lead follow-up, or customer questions."
    ],
    risks: product.conversionRisks.length ? product.conversionRisks : ["Existing product readiness does not prove paid demand."]
  };
}

function methodForDirection(name: string): EbosValidationMethod {
  const text = name.toLowerCase();
  if (text.includes("prompt")) return "landing_page";
  if (text.includes("seo") || text.includes("geo") || text.includes("content")) return "content_test";
  if (text.includes("video") || text.includes("faceswap")) return "marketplace_listing";
  if (text.includes("agent") || text.includes("workflow")) return "landing_page";
  return "landing_page";
}

function successMetricForMethod(method: EbosValidationMethod) {
  if (method === "content_test") return "Indexed content page, impressions, CTA clicks, or leads.";
  if (method === "marketplace_listing") return "Marketplace listing clicks, leads, or presale orders.";
  if (method === "presale") return "Presale orders or confirmed manual purchase intent.";
  return "Landing page CTA clicks, leads, or presale orders.";
}

function thresholdForMethod(method: EbosValidationMethod) {
  if (method === "content_test") return "Indexed or impressions recorded, plus CTA clicks >= 10 or leads >= 3.";
  if (method === "marketplace_listing") return "Marketplace listing clicks >= 10 or leads >= 3 or presale orders >= 1.";
  if (method === "presale") return "Presale orders >= 1 or qualified leads >= 3.";
  return "CTA clicks >= 10 or leads >= 3 or presale orders >= 1.";
}

function assetsForMethod(method: EbosValidationMethod, name: string) {
  if (method === "content_test") return [`${name} content brief`, "FAQ/summary block", "CTA destination"];
  if (method === "marketplace_listing") return [`${name} listing copy`, "Product screenshots or demo asset", "Pricing and delivery terms"];
  return [`${name} landing page`, "Pricing block", "FAQ block", "CTA tracking checklist"];
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "plan";
}
