import Link from "next/link";
import { CreditCard, ExternalLink, RefreshCw, SearchCheck } from "lucide-react";
import {
  purchaseSeoAuditMonitoringAction,
  startSeoAuditCreditRunAction,
  startSeoAuditMonitoringRunAction,
} from "@/app/user/seo-audit/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  SeoAuditMonitorSettings,
  SeoAuditMonitorToggle,
} from "@/components/seo-audit/seo-audit-monitor-settings";
import { Container, SectionTitle } from "@/components/ui";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { resolveSeoAuditMonitoringOffer } from "@/lib/seo-audit/pricing";
import { buildLocalePath } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

export async function SeoAuditUserPageShell({ locale }: { locale: Locale }) {
  const user = await requireUser(locale);
  const now = new Date();
  const [
    csrfToken,
    monitoringOffer,
    credits,
    subscriptions,
    runs,
    monitoringSourceRuns,
  ] = await Promise.all([
    getOrCreateCsrfToken(),
    resolveSeoAuditMonitoringOffer().catch(() => null),
    prisma.seoAuditCredit.findMany({
      where: { userId: user.id },
      include: {
        offer: true,
        order: {
          select: {
            orderStatus: true,
            refundRecords: {
              where: { status: "pending" },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.seoAuditSubscription.findMany({
      where: { userId: user.id },
      include: {
        project: true,
        offer: true,
        schedule: true,
        orders: {
          where: {
            refundedAt: null,
            serviceStartsAt: { lte: now },
            serviceEndsAt: { gt: now },
            order: {
              orderStatus: { in: ["paid", "activated"] },
              refundRecords: { none: { status: "pending" } },
            },
          },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.seoAuditRun.findMany({
      where: { userId: user.id },
      include: { offer: { select: { name: true, nameEn: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.seoAuditRun.findMany({
      where: { userId: user.id, status: "completed" },
      select: {
        id: true,
        normalizedOrigin: true,
        completedAt: true,
      },
      distinct: ["normalizedOrigin"],
      orderBy: { completedAt: "desc" },
      take: 100,
    }),
  ]);
  const en = locale === "en";
  const productPath = buildLocalePath("/online-tools/seo-geo-audit", locale);
  await trackAnalyticsEvent({
    eventName: "seo_audit_monitoring_viewed",
    path: buildLocalePath("/user/seo-audit", locale),
    entityType: "user",
    entityId: user.id,
    userId: user.id,
  }).catch(() => undefined);

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle
          as="h1"
          title={en ? "SEO/GEO audit workspace" : "SEO/GEO 巡检工作台"}
          intro={
            en
              ? "Start paid audits, review progress, and control the single monitoring plan for each site."
              : "发起付费巡检、查看任务进度，并管理每个站点唯一的持续监控计划。"
          }
        />
        <Link
          href={productPath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--marketing-accent)]"
        >
          {en ? "Open product page" : "打开产品页"}
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

      <section className="mt-8 border-y border-white/10 py-7">
        <h2 className="text-xl font-bold">
          {en ? "Available audit credits" : "可用巡检次数"}
        </h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {credits.length ? (
            credits.map((credit) => {
              const active =
                credit.remainingRuns > 0 &&
                credit.expiresAt > now &&
                !credit.refundedAt &&
                (credit.order.orderStatus === "paid" ||
                  credit.order.orderStatus === "activated") &&
                credit.order.refundRecords.length === 0;
              return (
                <article key={credit.id} className="surface-panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        {en
                          ? (credit.offer.nameEn ?? credit.offer.name)
                          : credit.offer.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--marketing-muted)]">
                        {en ? "Remaining" : "剩余"} {credit.remainingRuns}/
                        {credit.totalRuns} · {en ? "Expires" : "到期"}{" "}
                        {credit.expiresAt.toLocaleDateString(
                          en ? "en-US" : "zh-CN",
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${active ? "text-emerald-300" : "text-[var(--marketing-muted)]"}`}
                    >
                      {active
                        ? en
                          ? "Available"
                          : "可使用"
                        : en
                          ? "Unavailable"
                          : "不可用"}
                    </span>
                  </div>
                  {active ? (
                    <form
                      action={startSeoAuditCreditRunAction}
                      className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="creditId" value={credit.id} />
                      <input type="hidden" name="kind" value={credit.runKind} />
                      <input
                        name="targetUrl"
                        type="url"
                        required
                        maxLength={2048}
                        placeholder="https://example.com"
                        className="form-control-dark"
                      />
                      <FormSubmitButton
                        pendingLabel={en ? "Starting..." : "发起中..."}
                        className="inline-flex items-center gap-2"
                      >
                        <SearchCheck aria-hidden="true" className="h-4 w-4" />
                        {en ? "Start audit" : "发起巡检"}
                      </FormSubmitButton>
                    </form>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="text-sm text-[var(--marketing-muted)]">
              {en ? "No paid audit credits yet." : "暂无付费巡检次数。"}
            </p>
          )}
        </div>
      </section>

      <section className="py-8">
        <h2 className="text-xl font-bold">
          {en ? "Continuous monitoring" : "持续监控"}
        </h2>
        {monitoringOffer ? (
          <div className="mt-5 border-y border-white/10 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h3 className="font-bold">
                  {en
                    ? (monitoringOffer.nameEn ?? monitoringOffer.name)
                    : monitoringOffer.name}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--marketing-muted)]">
                  {en
                    ? `One site, ${monitoringOffer.maxScheduledRuns} scheduled audits and ${monitoringOffer.manualRuns} manual audits for ${monitoringOffer.validityDays} days.`
                    : `一个站点，${monitoringOffer.validityDays} 天内含 ${monitoringOffer.maxScheduledRuns} 次计划巡检和 ${monitoringOffer.manualRuns} 次手动巡检。`}
                </p>
                <p className="mt-1 text-xs text-[var(--marketing-muted)]">
                  {en
                    ? "Manual renewal. No automatic charge."
                    : "手动续费，不会自动扣款。"}
                </p>
              </div>
              <p className="text-lg font-bold text-white">
                {formatCurrency(monitoringOffer.price)}
              </p>
            </div>

            {monitoringSourceRuns.length ? (
              <form
                action={purchaseSeoAuditMonitoringAction}
                className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]"
              >
                <input type="hidden" name="sourceType" value="run" />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="csrfToken" value={csrfToken} />
                <label className="grid gap-1 text-sm font-semibold">
                  <span>{en ? "Audited site" : "已巡检站点"}</span>
                  <select
                    name="sourceId"
                    required
                    className="form-control-dark min-w-0"
                  >
                    {monitoringSourceRuns.map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.normalizedOrigin}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  <span>{en ? "Payment" : "支付方式"}</span>
                  <select
                    name="paymentMethod"
                    defaultValue="alipay"
                    className="form-control-dark"
                  >
                    <option value="alipay">{en ? "Alipay" : "支付宝"}</option>
                    <option value="wechat">
                      {en ? "WeChat Pay" : "微信支付"}
                    </option>
                  </select>
                </label>
                <FormSubmitButton
                  pendingLabel={en ? "Creating order..." : "创建订单中..."}
                  className="inline-flex min-h-11 items-center justify-center gap-2 self-end whitespace-normal px-4"
                >
                  <CreditCard aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {en
                    ? `Buy 30 days ${formatCurrency(monitoringOffer.price)}`
                    : `购买 30 天 ${formatCurrency(monitoringOffer.price)}`}
                </FormSubmitButton>
              </form>
            ) : (
              <p className="mt-5 text-sm text-[var(--marketing-muted)]">
                {en
                  ? "Complete an audit before enabling monitoring."
                  : "完成一次巡检后即可开通持续监控。"}{" "}
                <Link
                  href={productPath}
                  className="font-semibold text-[var(--marketing-accent)]"
                >
                  {en ? "Start an audit" : "开始巡检"}
                </Link>
              </p>
            )}
          </div>
        ) : null}
        <div className="mt-5 space-y-5">
          {subscriptions.length ? (
            subscriptions.map((subscription) => {
              const schedule = subscription.schedule;
              const usable =
                subscription.status === "active" &&
                subscription.expiresAt > now &&
                subscription.orders.length > 0;
              return (
                <article key={subscription.id} className="surface-panel p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold">
                        {subscription.project.normalizedOrigin}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--marketing-muted)]">
                        {en ? "Service ends" : "服务到期"}{" "}
                        {subscription.expiresAt.toLocaleDateString(
                          en ? "en-US" : "zh-CN",
                        )}{" "}
                        · {en ? "Manual runs" : "手动巡检"}{" "}
                        {subscription.manualRunsRemaining}
                      </p>
                    </div>
                    {schedule && usable ? (
                      <SeoAuditMonitorToggle
                        locale={locale}
                        subscriptionId={subscription.id}
                        fallbackNotificationEmail={user.email}
                        schedule={schedule}
                      />
                    ) : null}
                  </div>
                  {schedule && usable ? (
                    <>
                      <SeoAuditMonitorSettings
                        locale={locale}
                        subscriptionId={subscription.id}
                        fallbackNotificationEmail={user.email}
                        schedule={schedule}
                      />
                      {subscription.manualRunsRemaining > 0 ? (
                        <form
                          action={startSeoAuditMonitoringRunAction}
                          className="mt-4"
                        >
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="subscriptionId"
                            value={subscription.id}
                          />
                          <FormSubmitButton
                            variant="secondary"
                            pendingLabel={en ? "Starting..." : "发起中..."}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm"
                          >
                            <RefreshCw aria-hidden="true" className="h-4 w-4" />
                            {en ? "Run now" : "立即巡检"}
                          </FormSubmitButton>
                        </form>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--marketing-muted)]">
                      {en
                        ? "This monitoring entitlement is unavailable."
                        : "该监控权益当前不可用。"}
                    </p>
                  )}
                  {monitoringOffer ? (
                    <form
                      action={purchaseSeoAuditMonitoringAction}
                      className="mt-5 flex flex-wrap items-end gap-3 border-t border-white/10 pt-4"
                    >
                      <input
                        type="hidden"
                        name="sourceType"
                        value="subscription"
                      />
                      <input
                        type="hidden"
                        name="sourceId"
                        value={subscription.id}
                      />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="csrfToken" value={csrfToken} />
                      <label className="grid min-w-40 gap-1 text-sm font-semibold">
                        <span>{en ? "Renewal payment" : "续费支付方式"}</span>
                        <select
                          name="paymentMethod"
                          defaultValue="alipay"
                          className="form-control-dark"
                        >
                          <option value="alipay">
                            {en ? "Alipay" : "支付宝"}
                          </option>
                          <option value="wechat">
                            {en ? "WeChat Pay" : "微信支付"}
                          </option>
                        </select>
                      </label>
                      <FormSubmitButton
                        variant="secondary"
                        pendingLabel={
                          en ? "Creating order..." : "创建订单中..."
                        }
                        className="inline-flex min-h-11 items-center gap-2 whitespace-normal px-4 text-sm"
                      >
                        <CreditCard
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0"
                        />
                        {en
                          ? `Renew 30 days ${formatCurrency(monitoringOffer.price)}`
                          : `续费 30 天 ${formatCurrency(monitoringOffer.price)}`}
                      </FormSubmitButton>
                      <p className="w-full text-xs text-[var(--marketing-muted)]">
                        {en
                          ? "Manual renewal. No automatic charge."
                          : "手动续费，不会自动扣款。"}
                      </p>
                    </form>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="text-sm text-[var(--marketing-muted)]">
              {en ? "No monitoring subscription yet." : "暂无持续监控订阅。"}
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-white/10 py-8">
        <h2 className="text-xl font-bold">
          {en ? "Audit history" : "巡检记录"}
        </h2>
        <div className="mt-5 divide-y divide-white/10">
          {runs.length ? (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-semibold">{run.normalizedOrigin}</p>
                  <p className="mt-1 text-sm text-[var(--marketing-muted)]">
                    {run.status} · {run.kind} ·{" "}
                    {run.createdAt.toLocaleString(en ? "en-US" : "zh-CN")}
                  </p>
                </div>
                <Link
                  href={`${productPath}?run=${encodeURIComponent(run.id)}`}
                  className="text-sm font-semibold text-[var(--marketing-accent)]"
                >
                  {en ? "View result" : "查看结果"}
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--marketing-muted)]">
              {en ? "No audits yet." : "暂无巡检记录。"}
            </p>
          )}
        </div>
      </section>
    </Container>
  );
}
