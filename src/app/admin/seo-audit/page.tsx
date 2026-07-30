import type { ReactNode } from "react";
import Link from "next/link";
import { CircleX, Pause, RotateCcw } from "lucide-react";
import { AdminSection, SubmitButton } from "@/app/admin/admin-ui";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getSeoAuditAdminDashboard } from "@/lib/seo-audit/admin";
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
  const [locale, dashboard, params] = await Promise.all([
    getCurrentLocale(),
    getSeoAuditAdminDashboard(),
    searchParams ?? Promise.resolve({}),
  ]);
  const t = labels[locale];

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <Notice params={params} locale={locale} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label={t.revenue} value={money(dashboard.commercial.effectiveRevenue, locale)} accent />
        <Metric label={t.refunds} value={money(dashboard.commercial.refundAmount, locale)} warn={dashboard.commercial.refundCount > 0} />
        <Metric label={t.refundRate} value={`${dashboard.commercial.refundRate}%`} warn={dashboard.commercial.refundRate > 5} />
        <Metric label={t.renewals} value={`${dashboard.commercial.renewalCount} / ${dashboard.commercial.renewalRate}%`} />
        <Metric label={t.queued} value={dashboard.operations.queuedRuns} warn={dashboard.operations.queuedRuns > 10} />
        <Metric label={t.running} value={dashboard.operations.runningRuns} />
        <Metric label={t.failureRate} value={`${dashboard.operations.failureRate}%`} warn={dashboard.operations.failureRate > 2} />
        <Metric label={t.deliveryRate} value={`${dashboard.operations.paidReportDeliveryRate}%`} warn={dashboard.operations.paidReportDeliveryRate < 95} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title={t.funnel}>
          <div className="grid gap-3 md:grid-cols-3">
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
                <tr key={offer.offerId}><td className="py-3 font-semibold text-[#E8EEF8]">{offer.name}</td><td className="text-[#C5D0E2]">{offer.orders}</td><td className="text-[#C5D0E2]">{money(offer.revenue, locale)}</td></tr>
              ))}
              {dashboard.commercial.offerMix.length === 0 ? <EmptyRow colSpan={3} label={t.empty} /> : null}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title={t.workers}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase text-[#8B95A7]"><tr><th className="py-2">Worker</th><th>{t.status}</th><th>{t.run}</th><th>{t.lastSeen}</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {dashboard.workerHeartbeats.map((worker) => (
                  <tr key={worker.id}><td className="py-3 font-semibold text-[#E8EEF8]">{worker.workerId}</td><td><Badge label={worker.healthy ? t.healthy : t.stale} tone={worker.healthy ? "good" : "warn"} /></td><td className="text-[#C5D0E2]">{worker.currentRunId ? shortId(worker.currentRunId) : "-"}</td><td className="text-[#8B95A7]">{dateTime(worker.lastSeenAt, locale)}</td></tr>
                ))}
                {dashboard.workerHeartbeats.length === 0 ? <EmptyRow colSpan={4} label={t.empty} /> : null}
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
                    <td className="text-[#C5D0E2]">{dateTime(subscription.expiresAt, locale)}</td>
                    <td className="text-[#C5D0E2]">{subscription.schedule?.enabled ? subscription.schedule.cadence : "-"}</td>
                    <td className="text-right">
                      {subscription.schedule ? (
                        <form action={pauseSeoAuditScheduleAction}>
                          <input type="hidden" name="subscriptionId" value={subscription.id} />
                          <input type="hidden" name="returnTo" value="/admin/seo-audit" />
                          <SubmitButton variant="secondary" className="gap-2 px-3 py-2 text-xs" pendingLabel="..."><Pause className="h-3.5 w-3.5" />{t.pause}</SubmitButton>
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
                  <td className="py-3"><Link href={`/admin/seo-audit/${run.id}`} className="font-semibold text-[#E8EEF8] hover:text-[#48F5D3]">{shortId(run.id)}</Link><p className="mt-1 text-xs text-[#8B95A7]">{run.kind}</p></td>
                  <td className="text-[#C5D0E2]">{userLabel(run.user)}</td>
                  <td className="text-[#C5D0E2]">{hostLabel(run.normalizedOrigin)}</td>
                  <td className="text-[#C5D0E2]">{run.offer?.name ?? run.subscription?.status ?? "-"}</td>
                  <td><Badge label={run.status} tone={statusTone(run.status)} /></td>
                  <td className="text-[#8B95A7]">{dateTime(run.updatedAt, locale)}</td>
                  <td><div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/admin/seo-audit/${run.id}`} className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-[#E8EEF8] hover:text-[#48F5D3]">{t.detail}</Link>
                    {run.status === "failed" ? <RunAction action={retrySeoAuditRunAction} runId={run.id} label={t.retry} icon="retry" /> : null}
                    {run.status === "queued" || run.status === "running" ? <RunAction action={cancelSeoAuditRunAction} runId={run.id} label={t.cancel} icon="cancel" danger /> : null}
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

const uiLabels = {
  title: "SEO/GEO Audit Operations",
  intro: "Audit funnel, revenue, queue, workers, delivery, and subscriptions.",
  revenue: "Effective revenue", refunds: "Refund amount", refundRate: "Refund rate", renewals: "Renewals",
  queued: "Queued", running: "Running/cancelling", failureRate: "Failure rate", deliveryRate: "Paid report delivery",
  funnel: "visit -> run -> pay funnel", offerMix: "Offer mix", workers: "Worker heartbeat", expiring: "Expiring subscriptions", recent: "Recent runs",
  offer: "Offer", orders: "Orders", amount: "Amount", status: "Status", run: "Run", lastSeen: "Last seen",
  user: "User", domain: "Domain", expires: "Expires", schedule: "Schedule", action: "Action", updated: "Updated",
  empty: "No data.", healthy: "Healthy", stale: "Stale", pause: "Pause schedule", retry: "Retry", cancel: "Cancel", detail: "Details",
  errorPrefix: "Action was not completed: ",
  result: { retried: "Run requeued.", cancelled: "Run cancelled or cancellation requested.", paused: "Subscription schedule paused." },
  funnelStages: { visit: "Visit", run: "Run", pay: "Pay" },
} as const;

const labels = { zh: uiLabels, en: uiLabels } as const;

function Notice({ params, locale }: { params: { result?: string; error?: string }; locale: Locale }) {
  const t = labels[locale];
  if (params.error) {
    return <p className="mb-5 rounded-lg border border-[#FFB86B]/35 bg-[#FFB86B]/10 px-4 py-3 text-sm text-[#FFB86B]">{t.errorPrefix}{params.error}</p>;
  }
  if (params.result && params.result in t.result) {
    return <p className="mb-5 rounded-lg border border-[#48F5D3]/35 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">{t.result[params.result as keyof typeof t.result]}</p>;
  }
  return null;
}

function Metric({ label, value, accent = false, warn = false }: { label: string; value: string | number; accent?: boolean; warn?: boolean }) {
  const color = warn ? "text-[#FFB86B]" : accent ? "text-[#48F5D3]" : "text-[#E8EEF8]";
  return <div className="rounded-lg border border-white/10 bg-white/6 p-5"><p className="text-sm text-[#8B95A7]">{label}</p><p className={"mt-3 text-3xl font-semibold " + color}>{value}</p></div>;
}

function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={"rounded-lg border border-white/10 bg-white/6 p-5 " + className}><h2 className="text-lg font-semibold text-[#E8EEF8]">{title}</h2><div className="mt-4">{children}</div></section>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} className="py-8 text-center text-[#8B95A7]">{label}</td></tr>;
}

function money(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "CNY",
  }).format(value);
}

function dateTime(value: Date | string | null, locale: Locale) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
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
  icon,
  danger = false,
}: {
  action: (formData: FormData) => Promise<void>;
  runId: string;
  label: string;
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
        pendingLabel="..."
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </SubmitButton>
    </form>
  );
}
