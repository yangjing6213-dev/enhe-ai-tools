import { prisma } from "@/lib/db";

export type SeoAuditPaidOfferCode = "professional" | "deep";

type DecimalLike = { toString(): string };

type PricingOfferRecord = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  orderType: string | null;
  regularPrice: DecimalLike;
  launchPrice: DecimalLike | null;
  launchEndsAt: Date | null;
  launchQuantityLimit: number | null;
  pageLimit: number;
  includedRuns: number | null;
  validityDays: number;
  maxScheduledRuns: number | null;
  manualRuns: number | null;
  status: string;
};

type PricingDatabase = {
  seoAuditOffer: {
    findUnique(args: {
      where: { code: string };
      select: Record<keyof PricingOfferRecord, true>;
    }): Promise<PricingOfferRecord | null>;
  };
  order: {
    count(args: {
      where: {
        seoAuditOfferId: string;
        isTestData: false;
        orderStatus: { in: ["paid", "activated"] };
        refundRecords: {
          none: { status: { in: ["pending", "completed"] } };
        };
      };
    }): Promise<number>;
  };
};

export type ResolvedSeoAuditPaidOffer = {
  id: string;
  code: SeoAuditPaidOfferCode;
  name: string;
  nameEn: string | null;
  orderType: "seo_audit_credit";
  price: string;
  regularPrice: string;
  isLaunchPrice: boolean;
  pageLimit: number;
  includedRuns: number;
  validityDays: number;
};

export type ResolvedSeoAuditMonitoringOffer = {
  id: string;
  code: "monitoring";
  name: string;
  nameEn: string | null;
  orderType: "seo_audit_monitoring";
  price: string;
  pageLimit: number;
  validityDays: number;
  maxScheduledRuns: number;
  manualRuns: number;
};

const pricingOfferSelect: Record<keyof PricingOfferRecord, true> = {
  id: true,
  code: true,
  name: true,
  nameEn: true,
  orderType: true,
  regularPrice: true,
  launchPrice: true,
  launchEndsAt: true,
  launchQuantityLimit: true,
  pageLimit: true,
  includedRuns: true,
  validityDays: true,
  maxScheduledRuns: true,
  manualRuns: true,
  status: true,
};

function normalizePrice(value: DecimalLike) {
  const parsed = Number(value.toString());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("SEO_AUDIT_OFFER_CONFIGURATION_INVALID");
  }
  return parsed.toFixed(2);
}

function parsePaidOfferCode(value: unknown): SeoAuditPaidOfferCode {
  if (value === "professional" || value === "deep") return value;
  throw new Error("SEO_AUDIT_OFFER_UNAVAILABLE");
}

export async function countValidProfessionalLaunchSales(
  offerId: string,
  db: PricingDatabase = prisma as unknown as PricingDatabase,
) {
  return db.order.count({
    where: {
      seoAuditOfferId: offerId,
      isTestData: false,
      orderStatus: { in: ["paid", "activated"] },
      refundRecords: {
        none: { status: { in: ["pending", "completed"] } },
      },
    },
  });
}

export async function resolveSeoAuditPaidOffer(
  value: unknown,
  options: { db?: PricingDatabase; now?: Date } = {},
): Promise<ResolvedSeoAuditPaidOffer> {
  const code = parsePaidOfferCode(value);
  const db = options.db ?? (prisma as unknown as PricingDatabase);
  const now = options.now ?? new Date();
  const offer = await db.seoAuditOffer.findUnique({
    where: { code },
    select: pricingOfferSelect,
  });
  if (
    !offer ||
    offer.status !== "active" ||
    offer.code !== code ||
    offer.orderType !== "seo_audit_credit" ||
    !offer.includedRuns ||
    offer.includedRuns < 1 ||
    offer.pageLimit < 1 ||
    offer.validityDays < 1
  ) {
    throw new Error("SEO_AUDIT_OFFER_UNAVAILABLE");
  }

  const regularPrice = normalizePrice(offer.regularPrice);
  let price = regularPrice;
  let isLaunchPrice = false;
  if (
    code === "professional" &&
    offer.launchPrice &&
    offer.launchEndsAt &&
    offer.launchEndsAt > now &&
    offer.launchQuantityLimit &&
    offer.launchQuantityLimit > 0
  ) {
    const launchSales = await countValidProfessionalLaunchSales(offer.id, db);
    if (launchSales < offer.launchQuantityLimit) {
      price = normalizePrice(offer.launchPrice);
      isLaunchPrice = true;
    }
  }

  return {
    id: offer.id,
    code,
    name: offer.name,
    nameEn: offer.nameEn,
    orderType: "seo_audit_credit",
    price,
    regularPrice,
    isLaunchPrice,
    pageLimit: offer.pageLimit,
    includedRuns: offer.includedRuns,
    validityDays: offer.validityDays,
  };
}

export async function listSeoAuditPaidOffers(
  options: { db?: PricingDatabase; now?: Date } = {},
) {
  return Promise.all([
    resolveSeoAuditPaidOffer("professional", options),
    resolveSeoAuditPaidOffer("deep", options),
  ]);
}

export async function resolveSeoAuditMonitoringOffer(
  options: { db?: PricingDatabase; salesEnabled?: boolean } = {},
): Promise<ResolvedSeoAuditMonitoringOffer> {
  const salesEnabled =
    options.salesEnabled ??
    process.env.SEO_AUDIT_MONITORING_SALES_ENABLED === "true";
  if (!salesEnabled) {
    throw new Error("SEO_AUDIT_MONITORING_SALES_DISABLED");
  }
  const db = options.db ?? (prisma as unknown as PricingDatabase);
  const offer = await db.seoAuditOffer.findUnique({
    where: { code: "monitoring" },
    select: pricingOfferSelect,
  });
  if (
    !offer ||
    offer.status !== "active" ||
    offer.code !== "monitoring" ||
    offer.orderType !== "seo_audit_monitoring" ||
    offer.pageLimit < 1 ||
    offer.validityDays < 1 ||
    !Number.isInteger(offer.maxScheduledRuns) ||
    !offer.maxScheduledRuns ||
    offer.maxScheduledRuns < 1 ||
    !Number.isInteger(offer.manualRuns) ||
    offer.manualRuns === null ||
    offer.manualRuns < 0
  ) {
    throw new Error("SEO_AUDIT_OFFER_UNAVAILABLE");
  }

  return {
    id: offer.id,
    code: "monitoring",
    name: offer.name,
    nameEn: offer.nameEn,
    orderType: "seo_audit_monitoring",
    price: normalizePrice(offer.regularPrice),
    pageLimit: offer.pageLimit,
    validityDays: offer.validityDays,
    maxScheduledRuns: offer.maxScheduledRuns,
    manualRuns: offer.manualRuns,
  };
}
