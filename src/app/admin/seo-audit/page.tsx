import type { ReactNode } from "react";
import Link from "next/link";
import { CircleX, Pause, RotateCcw } from "lucide-react";
import { AdminSection, SubmitButton } from "@/app/admin/admin-ui";
import { getSeoAuditAdminDashboard } from "@/lib/seo-audit/admin";
import { auditActionError, auditValue } from "./display";
import {
  cancelSeoAuditRunAction,
  pauseSeoAuditScheduleAction,
  retrySeoAuditRunAction,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ result?: string; error?: string }>;
};

export default async function AdminSeoAuditPage({ searchParams }: PageProps) {
  const [dashboard, params] = await Promise.all([
    getSeoAuditAdminDashboard(),
    searchParams ?? Promise.resolve({}),
  ]);

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <Notice params={params} />
      <p className="mb-4 text-sm text-[#8B95A7]">{t.readAt}{dateTime(dashboard.asOf)} · {t.dataScope}</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label={t.revenue} value={money(dashboard.commercial.effectiveRevenue)} accent />
        <Metric label={t.refunds} value={money(dashboard.commercial.refundAmount)} warn={dashboard.commercial.refundCount > 0} />
        <Metric label={t.refundRate} value={`${dashboard.commercial.refundRate}%`} warn={dashboard.commercial.refundRate > 5} />
        <Metric label={t.renewals} value={`${dashboard.commercial.renewalCount} / ${dashboard.commercial.renewalRate}%`} />
        <Metric label={t.queued} value={dashboard.operations.queuedRuns} warn={dashboard.operations.queuedRuns > 10} />
        <Metric label={t.running} value={dashboard.operations.runningRuns} />
        <Metric label={t.failureRate} value={dashboard.operations.completedRuns + dashboard.operations.failedRuns ? `${dashboard.operations.failureRate}%` : t.noSample} warn={dashboard.operations.failureRate > 2} />
        <Metric label={t.deliveryRate} value={dashboard.operations.paidReportRuns ? `${dashboard.operations.paidReportDeliveryRate}%` : t.noSample} warn={dashboard.operations.paidReportRuns > 0 && dashboard.operations.paidReportDeliveryRate < 95} />
      </div>

      <div className="enhe-admin-card-grid mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title={t.funnel}>
          <div className="enhe-admin-card-grid grid gap-3 md:grid-cols-3">
            {dashboard.funnel.map((step) => (
              <div key={step.stage} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase text-[#8B95A7]">{t.funnelStages[step.stage]}</p>
                <p className="mt-2 text-3xl font-semibold text-[#E8EEF8]">{step.count}</p>
                <p className="mt-1 text-xs text-[#8B95A7]">{step.conversionRate}%</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={t.offerMix}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-[#8B95A7]"><tr><th className="py-2">{t.offer}</th><th>{t.orders}</th><th>{t.amount}</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {dashboard.commercial.offerMix.map((offer) => (
                <tr key={offer.offerId}><td className="py-3 font-semibold text-[#E8EEF8]">{offer.name}</td><td className="text-[#C5D0E2]">{offer.orders}</td><td className="text-[#C5D0E2]">{money(offer.revenue)}</td></tr>
              ))}
              {dashboard.commercial.offerMix.length === 0 ? <EmptyRow colSpan={3} label={t.empty} /> : null}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="enhe-admin-card-grid mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title={t.workers}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase text-[#8B95A7]"><tr><th className="py-2">{t.worker}</th><th>{t.status}</th><th>{t.run}</th><th>{t.lastSeen}</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {dashboard.workerHeartbeats.map((worker) => (
                  <tr key={worker.id}><td className="py-3 font-semibold text-[#E8EEF8]">{worker.workerId}</td><td><Badge label={worker.healthy ? t.healthy : t.stale} tone={worker.healthy ? "good" : "warn"} /></td><td className="text-[#C5D0E2]">{worker.currentRunId ? shortId(worker.currentRunId) : "-"}</td><td className="text-[#8B95A7]">{dateTime(worker.lastSeenAt)}</td></tr>
                ))}
                {dashboard.workerHeartbeats.length === 0 ? <EmptyRow colSpan={4} label={t.noHeartbeats} /> : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={t.expiring}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-[#8B95A7]"><tr><th className="py-2">{t.user}</th><th>{t.domain}</th><th>{t.expires}</th><th>{t.schedule}</th><th className="text-right">{t.action}</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {dashboard.expiringSubscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td className="py-3 text-[#C5D0E2]">{userLabel(subscription.user)}</td>
                    <td className="text-[#C5D0E2]">{hostLabel(subscription.project.normalizedOrigin)}</td>
                    <td className="text-[#C5D0E2]">{dateTime(subscription.expiresAt)}</td>
                    <td className="text-[#C5D0E2]">{subscription.schedule?.enabled ? auditValue(subscription.schedule.cadence) : subscription.schedule ? t.schedulePaused : "—"}</td>
                    <td className="text-right">
                      {subscription.schedule?.enabled ? (
                        <form action={pauseSeoAuditScheduleAction}>
                          <input type="hidden" name="subscriptionId" value={subscription.id} />
                          <input type="hidden" name="returnTo" value="/admin/seo-audit" />
                          <SubmitButton variant="secondary" className="gap-2 px-3 py-2 text-xs" pendingLabel={t.pausing}><Pause className="h-3.5 w-3.5" />{t.pause}</SubmitButton>
                        </form>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
                {dashboard.expiringSubscriptions.length === 0 ? <EmptyRow colSpan={5} label={t.empty} /> : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title={t.recent} className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="text-xs uppercase text-[#8B95A7]"><tr><th className="py-2">{t.run}</th><th>{t.user}</th><th>{t.domain}</th><th>{t.offer}</th><th>{t.status}</th><th>{t.updated}</th><th className="text-right">{t.action}</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {dashboard.recentRuns.map((run) => (
                <tr key={run.id}>
                  <td className="py-3"><Link href={`/admin/seo-audit/${run.id}`} className="font-semibold text-[#E8EEF8] hover:text-[#48F5D3]">{shortId(run.id)}</Link><p className="mt-1 text-xs text-[#8B95A7]">{auditValue(run.kind)}</p></td>
                  <td className="text-[#C5D0E2]">{userLabel(run.user)}</td>
                  <td className="text-[#C5D0E2]">{hostLabel(run.normalizedOrigin)}</td>
                  <td className="text-[#C5D0E2]">{run.offer?.name ?? auditValue(run.subscription?.status)}</td>
                  <td><Badge label={auditValue(run.status)} tone={statusTone(run.status)} /></td>
                  <td className="text-[#8B95A7]">{dateTime(run.updatedAt)}</td>
                  <td><div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/admin/seo-audit/${run.id}`} className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-[#E8EEF8] hover:text-[#48F5D3]">{t.detail}</Link>
                    {run.status === "failed" ? <RunAction action={retrySeoAuditRunAction} runId={run.id} label={t.retry} pendingLabel={t.retrying} icon="retry" /> : null}
                    {run.status === "queued" || run.status === "running" ? <RunAction action={cancelSeoAuditRunAction} runId={run.id} label={t.cancel} pendingLabel={t.cancelling} icon="cancel" danger /> : null}
                  </div></td>
                </tr>
              ))}
              {dashboard.recentRuns.length === 0 ? <EmptyRow colSpan={7} label={t.empty} /> : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminSection>
  );
}

const t = {
  title: "SEO/GEO 巡检运营", intro: "查看本站巡检服务的订单、任务、报告交付和订阅情况。",
  readAt: "本次读取（北京时间）", dataScope: "刷新页面会重新读取数据库。访问漏斗和任务数按近 30 天统计，收入、退款、续订和付费报告交付按全部历史记录统计。任务心跳在最近 2 分钟内上报时显示为近期有响应。",
  revenue: "有效收入", refunds: "退款金额", refundRate: "退款订单占比", renewals: "续订次数 / 续订率",
  queued: "排队中的任务", running: "执行中或正在取消", failureRate: "巡检失败率", deliveryRate: "付费报告交付率",
  funnel: "访问、提交巡检与购买（事件次数）", offerMix: "各套餐订单分布", workers: "执行端心跳", expiring: "未来 7 天到期的订阅", recent: "最近创建的 30 条巡检任务",
  offer: "套餐", orders: "订单数", amount: "金额", status: "状态", run: "任务", worker: "执行端", lastSeen: "上次任务心跳",
  user: "用户", domain: "域名", expires: "到期时间", schedule: "执行计划", action: "操作", updated: "更新时间",
  empty: "暂无记录", noHeartbeats: "暂无任务心跳记录", noSample: "暂无样本", healthy: "近期有响应", stale: "近期无任务心跳",
  pause: "暂停计划", schedulePaused: "已暂停", retry: "重试", cancel: "取消", detail: "查看详情",
  pausing: "正在暂停…", retrying: "正在重试…", cancelling: "正在取消…",
  errorPrefix: "操作未完成：",
  result: { retried: "巡检已重新进入队列。", cancelled: "巡检已取消或已提交取消请求。", paused: "订阅计划已暂停。" },
  funnelStages: { visit: "访问服务页", run: "提交巡检", pay: "完成购买" },
} as const;

function Notice({ params }: { params: { result?: string; error?: string } }) {
  if (params.error) {
    return <p className="mb-5 rounded-lg border border-[#FFB86B]/35 bg-[#FFB86B]/10 px-4 py-3 text-sm text-[#FFB86B]">{t.errorPrefix}{auditActionError(params.error)}</p>;
  }
  if (params.result && Object.hasOwn(t.result, params.result)) {
    return <p className="mb-5 rounded-lg border border-[#48F5D3]/35 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">{t.result[params.result as keyof typeof t.result]}</p>;
  }
  return null;
}

function Metric({ label, value, accent = false, warn = false }: { label: string; value: string | number; accent?: boolean; warn?: boolean }) {
  const color = warn ? "text-[#FFB86B]" : accent ? "text-[#48F5D3]" : "text-[#E8EEF8]";
  return <div className="enhe-admin-card rounded-lg border border-white/10 bg-white/6 p-5"><p className="text-sm text-[#8B95A7]">{label}</p><p className={"mt-3 text-3xl font-semibold " + color}>{value}</p></div>;
}

function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={"enhe-admin-card rounded-lg border border-white/10 bg-white/6 p-5 " + className}><h2 className="text-lg font-semibold text-[#E8EEF8]">{title}</h2><div className="mt-4">{children}</div></section>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} className="py-8 text-center text-[#8B95A7]">{label}</td></tr>;
}

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(value);
}

function dateTime(value: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function userLabel(user: { id?: string | null; email?: string | null; phone?: string | null } | null) {
  return user?.email ?? user?.phone ?? (user?.id ? shortId(user.id) : "-");
}

function hostLabel(origin: string) {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

function statusTone(status: string): "good" | "warn" | "neutral" {
  if (status === "completed") return "good";
  if (status === "failed" || status === "cancelled") return "warn";
  return "neutral";
}

function Badge({ label, tone }: { label: string; tone: "good" | "warn" | "neutral" }) {
  const className = tone === "good"
    ? "border-[#48F5D3]/35 bg-[#48F5D3]/10 text-[#48F5D3]"
    : tone === "warn"
      ? "border-[#FFB86B]/35 bg-[#FFB86B]/10 text-[#FFB86B]"
      : "border-white/15 bg-white/6 text-[#C5D0E2]";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function RunAction({
  action,
  runId,
  label,
  pendingLabel,
  icon,
  danger = false,
}: {
  action: (formData: FormData) => Promise<void>;
  runId: string;
  label: string;
  pendingLabel: string;
  icon: "retry" | "cancel";
  danger?: boolean;
}) {
  const Icon = icon === "retry" ? RotateCcw : CircleX;
  return (
    <form action={action}>
      <input type="hidden" name="runId" value={runId} />
      <input type="hidden" name="returnTo" value="/admin/seo-audit" />
      <SubmitButton
        variant={danger ? "danger" : "secondary"}
        className="gap-2 px-3 py-2 text-xs"
        pendingLabel={pendingLabel}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </SubmitButton>
    </form>
  );
}
