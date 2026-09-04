import Link from "next/link";
import { analyticsFunnelSteps, buildAnalyticsFunnel } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { getAdminDictionary } from "@/lib/admin-i18n";
import {
  buildDailyTrendBuckets,
  calculateGrowthPercent,
  calculateRatePercent,
  formatDashboardAmount,
  rankPopularTools
} from "@/lib/admin-dashboard";
import { getCurrentLocale } from "@/lib/i18n";

export default async function AdminDashboardPage() {
  const locale = await getCurrentLocale();
  const t = getAdminDictionary(locale).dashboard;
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const last7Days = new Date(now);
  last7Days.setDate(last7Days.getDate() - 7);
  const previous7Days = new Date(now);
  previous7Days.setDate(previous7Days.getDate() - 14);
  const trendStart = new Date(now);
  trendStart.setDate(trendStart.getDate() - 6);
  trendStart.setHours(0, 0, 0, 0);

  const [
    users,
    recentUsers,
    previousUsers,
    tools,
    publishedTools,
    softwareTools,
    onlineTools,
    orders,
    activatedOrders,
    successfulOrders,
    completedRefunds,
    paidAmount,
    todayPaidAmount,
    pendingProofs,
    pendingRefunds,
    popularTools,
    recentRevenueOrders,
    analyticsEventCounts
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.user.count({ where: { createdAt: { gte: previous7Days, lt: last7Days } } }),
    prisma.tool.count(),
    prisma.tool.count({ where: { status: "published" } }),
    prisma.tool.count({ where: { type: "software" } }),
    prisma.tool.count({ where: { type: "online" } }),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: "activated" } }),
    prisma.order.count({ where: { orderStatus: { in: ["paid", "activated", "refunded"] } } }),
    prisma.orderRefundRecord.count({ where: { status: "completed" } }),
    prisma.order.aggregate({ where: { orderStatus: { in: ["paid", "activated"] } }, _sum: { amount: true } }),
    prisma.order.aggregate({ where: { orderStatus: { in: ["paid", "activated"] }, createdAt: { gte: todayStart } }, _sum: { amount: true } }),
    prisma.paymentProof.count({ where: { reviewStatus: "pending" } }),
    prisma.orderRefundRecord.count({ where: { status: "pending" } }),
    prisma.tool.findMany({
      where: { status: "published" },
      select: { id: true, name: true, type: true, downloadCount: true, usageCount: true },
      orderBy: [{ downloadCount: "desc" }, { usageCount: "desc" }],
      take: 8
    }),
    prisma.order.findMany({
      where: { orderStatus: { in: ["paid", "activated"] }, createdAt: { gte: trendStart } },
      select: { createdAt: true, amount: true }
    }),
    prisma.analyticsEvent.groupBy({
      by: ["eventName"],
      where: { createdAt: { gte: last7Days }, eventName: { in: [...analyticsFunnelSteps] } },
      _count: { _all: true }
    })
  ]);

  const growthPercent = calculateGrowthPercent(recentUsers, previousUsers);
  const conversionRate = calculateRatePercent(activatedOrders, orders);
  const refundRate = calculateRatePercent(completedRefunds, successfulOrders);
  const rankedTools = rankPopularTools(popularTools).slice(0, 5);
  const revenueTrend = buildDailyTrendBuckets(
    trendStart,
    7,
    recentRevenueOrders.map((order) => ({ date: order.createdAt, amount: Number(order.amount), count: 1 }))
  );
  const maxTrendAmount = Math.max(1, ...revenueTrend.map((bucket) => bucket.amount));
  const analyticsFunnel = buildAnalyticsFunnel(
    analyticsEventCounts.map((row) => ({ eventName: row.eventName, count: row._count._all }))
  );
  const maxFunnelCount = Math.max(1, ...analyticsFunnel.map((row) => row.count));

  return (
    <div>
      <h1 className="text-3xl font-black text-[var(--marketing-text)]">{t.title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8B95A7]">
        {t.intro}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label={t.stats.paidRevenue} value={formatDashboardAmount(paidAmount._sum.amount?.toString())} accent />
        <Stat label={t.stats.todayRevenue} value={formatDashboardAmount(todayPaidAmount._sum.amount?.toString())} />
        <Stat label={t.stats.paymentReviews} value={pendingProofs} href="/admin/payments" warn={pendingProofs > 0} />
        <Stat label={t.stats.refundReviews} value={pendingRefunds} href="/admin/refunds?status=pending" warn={pendingRefunds > 0} />
        <Stat label={t.stats.users} value={users} />
        <Stat label={t.stats.newUsers7d} value={`${recentUsers} (${growthPercent >= 0 ? "+" : ""}${growthPercent}%)`} />
        <Stat label={t.stats.orderConversion} value={`${conversionRate}%`} />
        <Stat label={t.stats.refundRate} value={`${refundRate}%`} warn={refundRate > 10} />
        <Stat label={t.stats.tools} value={tools} />
        <Stat label={t.stats.publishedTools} value={`${publishedTools} / ${tools}`} />
      </div>

      <section className="surface-panel mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t.funnelTitle}</h2>
          <span className="text-xs text-[#8B95A7]">{t.funnelNote}</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-7">
          {analyticsFunnel.map((row) => (
            <div key={row.eventName} className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <p className="text-sm font-semibold text-[#E8EEF8]">{t.funnelLabels[row.eventName]}</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--marketing-accent)]">{row.count}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[var(--marketing-accent)]" style={{ width: `${Math.max(4, (row.count / maxFunnelCount) * 100)}%` }} />
              </div>
              <p className="mt-3 text-xs text-[#8B95A7]">{t.funnelConversion.replace("{rate}", String(row.conversionRate))}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="surface-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{t.trendTitle}</h2>
            <span className="text-xs text-[#8B95A7]">{t.trendNote}</span>
          </div>
          <div className="mt-5 grid h-56 grid-cols-7 items-end gap-3">
            {revenueTrend.map((bucket) => (
              <div key={bucket.date} className="flex h-full flex-col justify-end gap-2">
                <div className="text-center text-[11px] text-[#8B95A7]">{formatDashboardAmount(bucket.amount)}</div>
                <div
                  className="rounded-t-xl bg-gradient-to-t from-[var(--marketing-accent)] to-[#ff8a6a]"
                  style={{ height: `${Math.max(8, (bucket.amount / maxTrendAmount) * 150)}px` }}
                />
                <div className="text-center text-[11px] text-[#8B95A7]">{bucket.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-panel p-6">
          <h2 className="text-xl font-semibold">{t.remindersTitle}</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <QuickItem label={t.stats.paymentReviews} value={pendingProofs} href="/admin/payments" />
            <QuickItem label={t.stats.refundReviews} value={pendingRefunds} href="/admin/refunds?status=pending" />
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-[#8B95A7]">
            {t.toolMix.replace("{software}", String(softwareTools)).replace("{online}", String(onlineTools))}
          </div>
        </section>
      </div>

      <section className="surface-panel mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{t.popularTools}</h2>
          <span className="text-xs text-[#8B95A7]">{t.popularToolsNote}</span>
        </div>
        <div className="mt-5 space-y-3">
          {rankedTools.length ? (
            rankedTools.map((tool, index) => (
              <Link
                key={tool.id}
                href={tool.type === "software" ? `/admin/software/${tool.id}` : `/admin/online-tools/${tool.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-[var(--marketing-accent)]/40 hover:bg-[var(--marketing-accent)]/8"
              >
                <span className="text-sm font-semibold text-[#E8EEF8]">
                  {index + 1}. {tool.name}
                </span>
                <span className="text-xs text-[#8B95A7]">
                  {t.popularToolStats
                    .replace("{downloads}", String(tool.downloadCount))
                    .replace("{usage}", String(tool.usageCount))
                    .replace("{score}", String(tool.score))}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-[#8B95A7]">{t.noPublishedTools}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  accent = false,
  warn = false
}: {
  label: string;
  value: number | string;
  href?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const content = (
    <>
      <p className="text-sm text-[#8B95A7]">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${warn ? "text-[#FFB86B]" : accent ? "text-[var(--marketing-accent)]" : "text-[#E8EEF8]"}`}>{value}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="surface-panel block p-6 transition hover:border-[var(--marketing-accent)]/40 hover:bg-[var(--marketing-accent)]/8">
        {content}
      </Link>
    );
  }

  return <div className="surface-panel p-6">{content}</div>;
}

function QuickItem({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-[var(--marketing-accent)]/40">
      <span className="text-[#8B95A7]">{label}</span>
      <span className="font-semibold text-[#E8EEF8]">{value}</span>
    </Link>
  );
}
