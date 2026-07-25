import type {
  ResolvedSeoAuditOffer,
  SeoAuditOfferCode,
  SeoAuditOfferContext,
  SeoAuditOfferRequest,
} from "@/lib/seo-audit/types";

export const SEO_AUDIT_LAUNCH_START_AT = new Date("2026-07-24T16:00:00.000Z");
export const SEO_AUDIT_LAUNCH_END_AT = new Date("2026-08-23T16:00:00.000Z");
export const SEO_AUDIT_LAUNCH_QUANTITY = 100;

const offerDefinitions: Record<
  SeoAuditOfferCode,
  Omit<ResolvedSeoAuditOffer, "price">
> = {
  free: {
    code: "free",
    orderType: null,
    regularPrice: 0,
    pageLimit: 10,
    includedRuns: 1,
    validityDays: 1,
    publicFindingLimit: 3,
  },
  professional: {
    code: "professional",
    orderType: "seo_audit_credit",
    regularPrice: 19.9,
    pageLimit: 100,
    includedRuns: 2,
    validityDays: 7,
  },
  deep: {
    code: "deep",
    orderType: "seo_audit_credit",
    regularPrice: 39.9,
    pageLimit: 300,
    includedRuns: 3,
    validityDays: 30,
  },
  monitoring: {
    code: "monitoring",
    orderType: "seo_audit_monitoring",
    regularPrice: 109.9,
    pageLimit: 100,
    validityDays: 30,
    maxScheduledRuns: 5,
    manualRuns: 2,
  },
};

function parseOfferCode(value: unknown): SeoAuditOfferCode {
  if (
    value === "free" ||
    value === "professional" ||
    value === "deep" ||
    value === "monitoring"
  ) {
    return value;
  }

  throw new Error("Unsupported SEO audit offer");
}

function resolveProfessionalPrice(context: SeoAuditOfferContext) {
  const launchQuantityAvailable =
    Math.max(0, Math.trunc(context.professionalLaunchSales)) <
    SEO_AUDIT_LAUNCH_QUANTITY;
  const launchPeriodActive =
    context.now.getTime() >= SEO_AUDIT_LAUNCH_START_AT.getTime() &&
    context.now.getTime() < SEO_AUDIT_LAUNCH_END_AT.getTime();

  return launchQuantityAvailable && launchPeriodActive ? 9.9 : 19.9;
}

export function resolveSeoAuditOffer(
  request: SeoAuditOfferRequest,
  context: SeoAuditOfferContext,
): ResolvedSeoAuditOffer {
  const code = parseOfferCode(request.code);
  const definition = offerDefinitions[code];

  return {
    ...definition,
    price:
      code === "professional"
        ? resolveProfessionalPrice(context)
        : definition.regularPrice,
  };
}
