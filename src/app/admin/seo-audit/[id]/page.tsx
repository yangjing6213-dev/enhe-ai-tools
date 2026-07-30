import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Coins,
  FileSearch,
  Gauge,
  Globe2,
  PackageCheck,
  RotateCcw,
  ServerCog,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AdminSection, SubmitButton } from "@/app/admin/admin-ui";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getSeoAuditAdminRunDetail } from "@/lib/seo-audit/admin";
import {
  cancelSeoAuditRunAction,
  retrySeoAuditRunAction,
} from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ result?: string; error?: string }>;
};

export default async function AdminSeoAuditRunDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const [locale, run, query] = await Promise.all([
    getCurrentLocale(),
    getSeoAuditAdminRunDetail(id),
    searchParams ?? Promise.resolve({}),
  ]);
  if (!run) notFound();

  const t = copy[locale];
  const returnTo = `/admin/seo-audit/${run.id}`;
  const schedule = run.subscription?.schedule;

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <Notice params={query} locale={locale} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/seo-audit"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-[#E8EEF8] transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.back}
        </Link>
        {run.status === "failed" ? (
          <RunAction
            action={retrySeoAuditRunAction}
            runId={run.id}
            returnTo={returnTo}
            label={t.retry}
            pendingLabel={t.retrying}
            icon={RotateCcw}
          />
        ) : null}
        {run.status === "queued" || run.status === "running" ? (
          <RunAction
            action={cancelSeoAuditRunAction}
            runId={run.id}
            returnTo={returnTo}
            label={t.cancel}
            pendingLabel={t.cancelling}
            icon={Ban}
            danger
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          icon={Gauge}
          label={t.score}
          value={numberOrDash(run.summaryScore)}
          tone="accent"
        />
        <Metric
          icon={FileSearch}
          label={t.pages}
          value={numberOrDash(run.summaryPageCount)}
        />
        <Metric
          icon={ChartNoAxesColumnIncreasing}
          label={t.coverage}
          value={percentOrDash(run.summaryEvidenceCoverage)}
        />
        <Metric
          icon={AlertTriangle}
          label={t.critical}
          value={numberOrDash(run.summaryCriticalCount)}
          tone={run.summaryCriticalCount ? "danger" : "neutral"}
        />
        <Metric
          icon={AlertTriangle}
          label={t.high}
          value={numberOrDash(run.summaryHighCount)}
          tone={run.summaryHighCount ? "warn" : "neutral"}
        />
        <Metric
          icon={AlertTriangle}
          label={t.medium}
          value={numberOrDash(run.summaryMediumCount)}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel icon={Globe2} title={t.overview}>
          <InfoGrid
            items={[
              { label: t.runId, value: shortId(run.id) },
              {
                label: t.status,
                value: (
                  <StatusBadge
                    status={run.status}
                    label={runStatusLabels[locale][run.status] ?? run.status}
                  />
                ),
              },
              {
                label: t.kind,
                value: runKindLabels[locale][run.kind] ?? run.kind,
              },
              { label: t.domain, value: maskedDomain(run.normalizedOrigin) },
              { label: t.user, value: maskedUser(run.user) },
              { label: t.project, value: shortId(run.project?.id) },
              { label: t.pageLimit, value: run.pageLimit },
              {
                label: t.attempts,
                value: `${run.attemptCount} / ${run.maxAttempts}`,
              },
              { label: t.createdAt, value: dateTime(run.createdAt, locale) },
              { label: t.updatedAt, value: dateTime(run.updatedAt, locale) },
            ]}
          />
        </Panel>

        <Panel icon={ServerCog} title={t.worker}>
          <InfoGrid
            items={[
              { label: t.engine, value: run.engineVersion ?? "-" },
              {
                label: t.timeout,
                value: `${run.totalTimeoutSeconds} ${t.seconds}`,
              },
              { label: t.availableAt, value: dateTime(run.availableAt, locale) },
              { label: t.startedAt, value: dateTime(run.startedAt, locale) },
              { label: t.completedAt, value: dateTime(run.completedAt, locale) },
              { label: t.failedAt, value: dateTime(run.failedAt, locale) },
              {
                label: t.cancelRequestedAt,
                value: dateTime(run.cancelRequestedAt, locale),
              },
            ]}
          />
        </Panel>
      </div>

      {run.failure ? (
        <Panel icon={AlertTriangle} title={t.failure} className="mt-6">
          <InfoGrid
            columns="md:grid-cols-3"
            items={[
              { label: t.failureCategory, value: run.failure.category },
              { label: t.failureCode, value: run.failure.code },
              {
                label: t.failureMessage,
                value: run.failure.message,
                wide: true,
              },
            ]}
          />
        </Panel>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel icon={Coins} title={t.funding}>
          <InfoGrid
            items={[
              { label: t.offer, value: run.offer?.name ?? "-" },
              { label: t.offerCode, value: run.offer?.code ?? "-" },
              { label: t.orderNumber, value: run.sourceOrder?.orderNo ?? "-" },
              { label: t.orderType, value: run.sourceOrder?.orderType ?? "-" },
              { label: t.orderStatus, value: run.sourceOrder?.orderStatus ?? "-" },
              {
                label: t.orderAmount,
                value: run.sourceOrder
                  ? money(run.sourceOrder.amount, locale)
                  : "-",
              },
              {
                label: t.testData,
                value: run.sourceOrder
                  ? run.sourceOrder.isTestData
                    ? t.yes
                    : t.no
                  : "-",
              },
              { label: t.credit, value: shortId(run.credit?.id) },
              { label: t.creditTotal, value: run.credit?.totalRuns ?? "-" },
              {
                label: t.creditRemaining,
                value: run.credit?.remainingRuns ?? "-",
              },
              {
                label: t.creditExpiresAt,
                value: dateTime(run.credit?.expiresAt, locale),
              },
              {
                label: t.creditRefundedAt,
                value: dateTime(run.credit?.refundedAt, locale),
              },
            ]}
          />
        </Panel>

        <Panel icon={CalendarClock} title={t.subscription}>
          <InfoGrid
            items={[
              { label: t.subscriptionId, value: shortId(run.subscription?.id) },
              { label: t.subscriptionStatus, value: run.subscription?.status ?? "-" },
              {
                label: t.subscriptionOffer,
                value: run.subscription?.offer.name ?? "-",
              },
              {
                label: t.subscriptionStartsAt,
                value: dateTime(run.subscription?.startsAt, locale),
              },
              {
                label: t.subscriptionExpiresAt,
                value: dateTime(run.subscription?.expiresAt, locale),
              },
              {
                label: t.scheduledUsage,
                value: run.subscription
                  ? `${run.subscription.scheduledRunsUsed} / ${run.subscription.maxScheduledRuns}`
                  : "-",
              },
              {
                label: t.manualRemaining,
                value: run.subscription?.manualRunsRemaining ?? "-",
              },
              { label: t.scheduleId, value: shortId(schedule?.id) },
              { label: t.cadence, value: schedule?.cadence ?? "-" },
              {
                label: t.scheduleEnabled,
                value: schedule ? (schedule.enabled ? t.yes : t.no) : "-",
              },
              { label: t.nextRunAt, value: dateTime(schedule?.nextRunAt, locale) },
              { label: t.lastRunAt, value: dateTime(schedule?.lastRunAt, locale) },
            ]}
          />
        </Panel>
      </div>

      <Panel icon={PackageCheck} title={t.findings} className="mt-6">
        {run.publicFindings.length > 0 ? (
          <ul className="divide-y divide-white/10">
            {run.publicFindings.map((finding) => (
              <li
                key={finding.id}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[150px_1fr]"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <FindingBadge severity={finding.severity} />
                  <span className="break-all text-xs font-semibold text-[#8B95A7]">
                    {finding.code}
                  </span>
                </div>
                <p className="break-words text-sm leading-6 text-[#C5D0E2]">
                  {finding.summary}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#8B95A7]">{t.noFindings}</p>
        )}
      </Panel>
    </AdminSection>
  );
}

const copy = {
  zh: {
    title: "SEO/GEO 巡检详情",
    intro: "查看脱敏后的运行状态、运营关联和公开发现摘要。",
    back: "返回巡检总览",
    retry: "重试巡检",
    retrying: "正在重试...",
    cancel: "取消巡检",
    cancelling: "正在取消...",
    actionFailed: "操作未完成：",
    retried: "巡检已重新进入队列。",
    cancelled: "巡检已取消或已请求取消。",
    score: "总分",
    pages: "已巡检页面",
    coverage: "证据覆盖率",
    critical: "严重问题",
    high: "高风险问题",
    medium: "中风险问题",
    overview: "运行概览",
    runId: "运行 ID",
    status: "状态",
    kind: "类型",
    domain: "脱敏域名",
    user: "脱敏用户",
    project: "项目引用",
    pageLimit: "页面上限",
    attempts: "尝试次数 / 上限",
    createdAt: "创建时间",
    updatedAt: "更新时间",
    worker: "Worker / 执行信息",
    engine: "引擎版本",
    timeout: "总超时",
    seconds: "秒",
    availableAt: "可执行时间",
    startedAt: "开始时间",
    completedAt: "完成时间",
    failedAt: "失败时间",
    cancelRequestedAt: "取消请求时间",
    failure: "分类失败信息",
    failureCategory: "分类",
    failureCode: "错误码",
    failureMessage: "脱敏消息",
    funding: "套餐、订单与次数包",
    offer: "套餐",
    offerCode: "套餐代码",
    orderNumber: "订单号",
    orderType: "订单类型",
    orderStatus: "订单状态",
    orderAmount: "订单金额",
    testData: "测试数据",
    credit: "次数包引用",
    creditTotal: "总次数",
    creditRemaining: "剩余次数",
    creditExpiresAt: "次数包到期时间",
    creditRefundedAt: "次数包退款时间",
    subscription: "订阅与计划",
    subscriptionId: "订阅引用",
    subscriptionStatus: "订阅状态",
    subscriptionOffer: "订阅套餐",
    subscriptionStartsAt: "订阅开始时间",
    subscriptionExpiresAt: "订阅到期时间",
    scheduledUsage: "计划次数已用 / 上限",
    manualRemaining: "手动次数剩余",
    scheduleId: "计划引用",
    cadence: "执行周期",
    scheduleEnabled: "计划已启用",
    nextRunAt: "下次执行",
    lastRunAt: "上次执行",
    findings: "公开发现摘要",
    noFindings: "暂无可公开展示的发现摘要。",
    yes: "是",
    no: "否",
  },
  en: {
    title: "SEO/GEO audit run detail",
    intro: "Review redacted run status, operational links, and public finding summaries.",
    back: "Back to audit overview",
    retry: "Retry run",
    retrying: "Retrying...",
    cancel: "Cancel run",
    cancelling: "Cancelling...",
    actionFailed: "Action was not completed: ",
    retried: "The run was requeued.",
    cancelled: "The run was cancelled or cancellation was requested.",
    score: "Score",
    pages: "Pages audited",
    coverage: "Evidence coverage",
    critical: "Critical findings",
    high: "High findings",
    medium: "Medium findings",
    overview: "Run overview",
    runId: "Run ID",
    status: "Status",
    kind: "Kind",
    domain: "Redacted domain",
    user: "Redacted user",
    project: "Project reference",
    pageLimit: "Page limit",
    attempts: "Attempts / limit",
    createdAt: "Created at",
    updatedAt: "Updated at",
    worker: "Worker / execution",
    engine: "Engine version",
    timeout: "Total timeout",
    seconds: "seconds",
    availableAt: "Available at",
    startedAt: "Started at",
    completedAt: "Completed at",
    failedAt: "Failed at",
    cancelRequestedAt: "Cancellation requested at",
    failure: "Classified failure",
    failureCategory: "Category",
    failureCode: "Code",
    failureMessage: "Redacted message",
    funding: "Offer, order, and credit",
    offer: "Offer",
    offerCode: "Offer code",
    orderNumber: "Order number",
    orderType: "Order type",
    orderStatus: "Order status",
    orderAmount: "Order amount",
    testData: "Test data",
    credit: "Credit reference",
    creditTotal: "Total runs",
    creditRemaining: "Remaining runs",
    creditExpiresAt: "Credit expires at",
    creditRefundedAt: "Credit refunded at",
    subscription: "Subscription and schedule",
    subscriptionId: "Subscription reference",
    subscriptionStatus: "Subscription status",
    subscriptionOffer: "Subscription offer",
    subscriptionStartsAt: "Subscription starts at",
    subscriptionExpiresAt: "Subscription expires at",
    scheduledUsage: "Scheduled runs used / limit",
    manualRemaining: "Manual runs remaining",
    scheduleId: "Schedule reference",
    cadence: "Cadence",
    scheduleEnabled: "Schedule enabled",
    nextRunAt: "Next run at",
    lastRunAt: "Last run at",
    findings: "Public finding summaries",
    noFindings: "No public finding summaries are available.",
    yes: "Yes",
    no: "No",
  },
} as const;

const runStatusLabels: Record<Locale, Record<string, string>> = {
  zh: {
    queued: "排队中",
    running: "执行中",
    completed: "已完成",
    failed: "失败",
    cancel_requested: "正在取消",
    cancelled: "已取消",
  },
  en: {
    queued: "Queued",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    cancel_requested: "Cancelling",
    cancelled: "Cancelled",
  },
};

const runKindLabels: Record<Locale, Record<string, string>> = {
  zh: {
    free: "免费巡检",
    professional: "专业巡检",
    deep: "深度巡检",
    recheck: "复检",
    scheduled: "计划巡检",
  },
  en: {
    free: "Free",
    professional: "Professional",
    deep: "Deep",
    recheck: "Recheck",
    scheduled: "Scheduled",
  },
};

function Notice({
  params,
  locale,
}: {
  params: { result?: string; error?: string };
  locale: Locale;
}) {
  const t = copy[locale];
  if (params.error) {
    return (
      <p className="mb-5 rounded-lg border border-[#FFB86B]/35 bg-[#FFB86B]/10 px-4 py-3 text-sm text-[#FFD6A5]">
        {t.actionFailed}
        <span className="font-mono">{params.error}</span>
      </p>
    );
  }
  const message =
    params.result === "retried"
      ? t.retried
      : params.result === "cancelled"
        ? t.cancelled
        : null;
  return message ? (
    <p className="mb-5 rounded-lg border border-[#48F5D3]/35 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
      {message}
    </p>
  ) : null;
}

function RunAction({
  action,
  runId,
  returnTo,
  label,
  pendingLabel,
  icon: Icon,
  danger = false,
}: {
  action: (formData: FormData) => Promise<void>;
  runId: string;
  returnTo: string;
  label: string;
  pendingLabel: string;
  icon: LucideIcon;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="runId" value={runId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <SubmitButton
        variant={danger ? "danger" : "secondary"}
        pendingLabel={pendingLabel}
        className="gap-2 px-4 py-2 text-sm"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </SubmitButton>
    </form>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "accent" | "danger" | "warn" | "neutral";
}) {
  const color =
    tone === "accent"
      ? "text-[#48F5D3]"
      : tone === "danger"
        ? "text-red-300"
        : tone === "warn"
          ? "text-[#FFB86B]"
          : "text-[#E8EEF8]";
  return (
    <section className="rounded-lg border border-white/10 bg-white/6 p-4">
      <div className="flex items-center gap-2 text-[#8B95A7]">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase">{label}</p>
      </div>
      <p className={`mt-3 text-2xl font-semibold ${color}`}>{value}</p>
    </section>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-white/10 bg-white/6 p-5 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#48F5D3]" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-[#E8EEF8]">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type InfoItem = {
  label: string;
  value: ReactNode;
  wide?: boolean;
};

function InfoGrid({
  items,
  columns = "md:grid-cols-2",
}: {
  items: InfoItem[];
  columns?: string;
}) {
  return (
    <dl className={`grid gap-x-6 ${columns}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`min-w-0 border-t border-white/10 py-3 first:border-t-0 md:[&:nth-child(2)]:border-t-0 ${item.wide ? "md:col-span-full" : ""}`}
        >
          <dt className="text-xs font-semibold uppercase text-[#8B95A7]">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm font-semibold leading-6 text-[#E8EEF8]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const className =
    status === "completed"
      ? "border-[#48F5D3]/35 bg-[#48F5D3]/10 text-[#48F5D3]"
      : status === "failed" || status === "cancelled"
        ? "border-[#FFB86B]/35 bg-[#FFB86B]/10 text-[#FFD6A5]"
        : "border-white/15 bg-white/6 text-[#C5D0E2]";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function FindingBadge({ severity }: { severity: string }) {
  const normalized = severity.toLowerCase();
  const className =
    normalized === "critical"
      ? "border-red-400/35 bg-red-400/10 text-red-200"
      : normalized === "high"
        ? "border-[#FFB86B]/35 bg-[#FFB86B]/10 text-[#FFD6A5]"
        : "border-white/15 bg-white/6 text-[#C5D0E2]";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${className}`}
    >
      {severity}
    </span>
  );
}

function numberOrDash(value: number | null) {
  return value ?? "-";
}

function percentOrDash(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

function dateTime(value: Date | string | null | undefined, locale: Locale) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function money(
  value: number | string | { toString(): string },
  locale: Locale,
) {
  const amount = Number(typeof value === "number" ? value : value.toString());
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  return value.length > 12
    ? `${value.slice(0, 8)}...${value.slice(-4)}`
    : value;
}

function maskedDomain(origin: string) {
  try {
    return new URL(origin).hostname
      .split(".")
      .map((segment, index, segments) =>
        index === segments.length - 1 ? segment : maskSegment(segment),
      )
      .join(".");
  } catch {
    return maskSegment(origin);
  }
}

function maskedUser(
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    nickname: string | null;
  } | null,
) {
  if (!user) return "-";
  if (user.email) {
    const [local, domain] = user.email.split("@");
    return domain
      ? `${maskSegment(local)}@${maskedDomain(`https://${domain}`)}`
      : maskSegment(user.email);
  }
  if (user.phone) {
    const digits = user.phone.replace(/\s+/g, "");
    return digits.length > 7
      ? `${digits.slice(0, 3)}****${digits.slice(-4)}`
      : maskSegment(digits);
  }
  if (user.nickname) return maskSegment(user.nickname);
  return shortId(user.id);
}

function maskSegment(value: string) {
  const characters = Array.from(value);
  if (characters.length === 0) return "-";
  if (characters.length === 1) return `${characters[0]}***`;
  if (characters.length === 2) return `${characters[0]}***`;
  return `${characters[0]}***${characters.at(-1)}`;
}
