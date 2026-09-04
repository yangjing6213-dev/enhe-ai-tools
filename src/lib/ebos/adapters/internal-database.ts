import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createDataSourceState } from "../data-source";
import type { EbosWarning } from "../types";
import {
  createEmptyWeeklySnapshot,
  type EbosInternalDatabaseSnapshot,
  type EbosWeeklyDataAdapter,
  type EbosWeeklySnapshot
} from "./adapter-types";

type EbosPrismaClient = Pick<
  PrismaClient,
  | "tool"
  | "order"
  | "orderRefundRecord"
  | "newsArticle"
  | "aiTrendBriefing"
  | "analyticsEvent"
  | "geoQuery"
  | "geoProvider"
  | "geoVisibilityResult"
  | "geoRecommendation"
  | "user"
  | "comment"
> & {
  baiduPushQueueItem?: unknown;
};

type BaiduPushQueueItemDelegate = {
  count: (args: { where: { status: "pending" } }) => Promise<number>;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString()) || 0;
  }
  return 0;
}

function createAdapterWarning(area: string, error: unknown): EbosWarning {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown adapter error";
  return {
    code: "missing_data",
    source: "internal_database",
    severity: "warning",
    message: `当前项目读取 ${area} 数据失败，EBOS 将保留该部分为空并继续生成周报：${message}`
  };
}

async function safeRead<T>(
  area: string,
  warnings: EbosWarning[],
  read: () => Promise<T>
) {
  try {
    return await read();
  } catch (error) {
    warnings.push(createAdapterWarning(area, error));
    return null;
  }
}

export function createInternalDatabaseAdapter(db: EbosPrismaClient = prisma): EbosWeeklyDataAdapter {
  return {
    key: "internal_database",
    async readWeeklySnapshot({ period, previousPeriod }) {
      const warnings: EbosWarning[] = [];
      const snapshot = createEmptyWeeklySnapshot();
      let successfulReads = 0;

      const products = await safeRead("product", warnings, async () => {
        const [
          totalProducts,
          publishedProducts,
          newProductsThisWeek,
          totalDownloads,
          totalUsage
        ] = await Promise.all([
          db.tool.count(),
          db.tool.count({ where: { status: "published" } }),
          db.tool.count({
            where: { createdAt: { gte: period.start, lte: period.end } }
          }),
          db.tool.aggregate({ _sum: { downloadCount: true } }),
          db.tool.aggregate({ _sum: { usageCount: true } })
        ]);

        return {
          totalProducts,
          publishedProducts,
          newProductsThisWeek,
          totalDownloads: totalDownloads._sum.downloadCount ?? 0,
          totalUsage: totalUsage._sum.usageCount ?? 0
        };
      });
      if (products) {
        snapshot.products = products;
        successfulReads += 1;
      }

      const orders = await safeRead("order/revenue", warnings, async () => {
        const paidStatuses = ["paid", "activated"] as const;
        const [
          totalOrders,
          weeklyOrders,
          paidOrders,
          weeklyRevenue,
          previousWeeklyRevenue,
          refunds
        ] = await Promise.all([
          db.order.count(),
          db.order.count({
            where: { createdAt: { gte: period.start, lte: period.end } }
          }),
          db.order.count({ where: { orderStatus: { in: [...paidStatuses] } } }),
          db.order.aggregate({
            where: {
              orderStatus: { in: [...paidStatuses] },
              paidAt: { gte: period.start, lte: period.end }
            },
            _sum: { amount: true }
          }),
          db.order.aggregate({
            where: {
              orderStatus: { in: [...paidStatuses] },
              paidAt: { gte: previousPeriod.start, lte: previousPeriod.end }
            },
            _sum: { amount: true }
          }),
          db.orderRefundRecord.count()
        ]);

        return {
          totalOrders,
          weeklyOrders,
          paidOrders,
          weeklyRevenue: toNumber(weeklyRevenue._sum.amount),
          previousWeeklyRevenue: toNumber(previousWeeklyRevenue._sum.amount),
          refunds
        };
      });
      if (orders) {
        snapshot.orders = orders;
        successfulReads += 1;
      }

      const content = await safeRead("content", warnings, async () => {
        const [
          aiNewsArticles,
          newAiNewsThisWeek,
          aiTrendBriefings,
          newAiTrendBriefingsThisWeek
        ] = await Promise.all([
          db.newsArticle.count(),
          db.newsArticle.count({
            where: { createdAt: { gte: period.start, lte: period.end } }
          }),
          db.aiTrendBriefing.count(),
          db.aiTrendBriefing.count({
            where: { createdAt: { gte: period.start, lte: period.end } }
          })
        ]);

        return {
          aiNewsArticles,
          newAiNewsThisWeek,
          aiTrendBriefings,
          newAiTrendBriefingsThisWeek
        };
      });
      if (content) {
        snapshot.content = content;
        successfulReads += 1;
      }

      const seo = await safeRead("seo/analytics", warnings, async () => {
        const seoEvents = await db.analyticsEvent.findMany({
          where: {
            createdAt: { gte: period.start, lte: period.end },
            eventName: { in: ["seo_landing_view", "search_ai_news", "create_order", "payment_proof_submitted", "payment_review_approved", "click_open_vip"] }
          },
          select: { eventName: true, metadata: true }
        });
        const landingEvents = seoEvents.filter((event) => event.eventName === "seo_landing_view");

        return {
          seoLandingViews: landingEvents.length,
          organicLandings: landingEvents.filter((event) => getMetadataString(event.metadata, "trafficMedium") === "organic_search").length,
          aiAnswerLandings: landingEvents.filter((event) => getMetadataString(event.metadata, "trafficMedium") === "ai_answer_engine").length,
          searchEvents: seoEvents.filter((event) => event.eventName === "search_ai_news").length,
          conversionEvents: seoEvents.filter((event) => ["create_order", "payment_proof_submitted", "payment_review_approved", "click_open_vip"].includes(event.eventName)).length
        };
      });
      if (seo) {
        snapshot.seo = seo;
        successfulReads += 1;
      }

      const geo = await safeRead("geo", warnings, async () => {
        const [
          queries,
          providers,
          reviewedResults,
          brandMentions,
          domainCitations,
          openRecommendations
        ] = await Promise.all([
          db.geoQuery.count(),
          db.geoProvider.count(),
          db.geoVisibilityResult.count({
            where: { checkedAt: { gte: period.start, lte: period.end } }
          }),
          db.geoVisibilityResult.count({
            where: {
              checkedAt: { gte: period.start, lte: period.end },
              isBrandMentioned: true
            }
          }),
          db.geoVisibilityResult.count({
            where: {
              checkedAt: { gte: period.start, lte: period.end },
              isDomainCited: true
            }
          }),
          db.geoRecommendation.count({ where: { status: "open" } })
        ]);

        return {
          queries,
          providers,
          reviewedResults,
          brandMentionRate: percent(brandMentions, reviewedResults),
          domainCitationRate: percent(domainCitations, reviewedResults),
          openRecommendations
        };
      });
      if (geo) {
        snapshot.geo = geo;
        successfulReads += 1;
      }

      const websiteHealth = await safeRead("website health", warnings, async () => {
        const [
          users,
          weeklyUsers,
          analyticsEvents,
          pendingBaiduPushItems,
          comments
        ] = await Promise.all([
          db.user.count(),
          db.user.count({
            where: { createdAt: { gte: period.start, lte: period.end } }
          }),
          db.analyticsEvent.count({
            where: { createdAt: { gte: period.start, lte: period.end } }
          }),
          isBaiduPushQueueItemDelegate(db.baiduPushQueueItem)
            ? db.baiduPushQueueItem.count({ where: { status: "pending" } })
            : 0,
          db.comment.count()
        ]);

        return {
          users,
          weeklyUsers,
          analyticsEvents,
          pendingBaiduPushItems,
          comments
        };
      });
      if (websiteHealth) {
        snapshot.websiteHealth = websiteHealth;
        successfulReads += 1;
      }

      const status =
        successfulReads === 0
          ? "unavailable"
          : warnings.length
            ? "partial"
            : "available";

      return {
        dataSource: createDataSourceState("internal_database", status, { warnings }),
        snapshot: snapshot satisfies EbosInternalDatabaseSnapshot as EbosWeeklySnapshot,
        warnings
      };
    }
  };
}

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function isBaiduPushQueueItemDelegate(value: unknown): value is BaiduPushQueueItemDelegate {
  return value !== null
    && typeof value === "object"
    && "count" in value
    && typeof (value as { count?: unknown }).count === "function";
}
