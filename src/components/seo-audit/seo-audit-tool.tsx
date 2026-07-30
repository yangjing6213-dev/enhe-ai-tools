"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileSearch,
  FileText,
  LoaderCircle,
  Copy,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { purchaseSeoAuditAction } from "@/app/online-tools/seo-geo-audit/actions";
import { trackClientAnalyticsEvent } from "@/components/analytics-tracker";
import type { Locale } from "@/lib/i18n";
import {
  SEO_AUDIT_RUN_STATUS_LABELS,
  createSeoAuditRunPoller,
  getPollingAccessErrorMessage,
  type SeoAuditRun,
  type SeoAuditRunPoller,
  type SeoAuditRunSummary,
  type SeoAuditRunStatus,
  type SeoAuditSeverity,
} from "./seo-audit-run-polling";

type RunStatus = SeoAuditRunStatus;
type UiStatus =
  | "idle"
  | "loading"
  | "temporarily_unavailable"
  | "access_error"
  | "request_error"
  | RunStatus;
type Severity = SeoAuditSeverity;

type Offer = {
  code: "professional" | "deep";
  name: string;
  nameEn: string | null;
  price: string;
  regularPrice: string;
  isLaunchPrice: boolean;
  pageLimit: number;
  includedRuns: number;
  validityDays: number;
};

type Summary = SeoAuditRunSummary;
type AuditRun = SeoAuditRun;

type FullReport = {
  id: string;
  strengths: Array<{ id: string; title: string; value: string }>;
  findings: Array<{
    id: string;
    severity: Severity;
    issue: string;
    remediation: string;
    verification: string;
  }>;
  agentPrompts: Array<{
    id: string;
    name: string;
    website: string;
    prompt: string;
  }>;
};

type Recovery = { runId: string; token: string };

type Props = {
  locale: Locale;
  initialRunId?: string;
  isAuthenticated: boolean;
  csrfToken: string;
  offers: Offer[];
};

const storageKey = "enhe.seoAudit.recovery.v1";
const runIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const tokenPattern = /^[^\s]{24,512}$/;

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--marketing-accent)] px-5 text-sm font-black text-[#071014] hover:bg-[#8feaff] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 px-4 text-sm font-bold hover:border-[var(--marketing-accent)] disabled:cursor-not-allowed disabled:opacity-50";
const severityClass: Record<Severity, string> = {
  critical: "border-red-400/40 bg-red-400/10 text-red-200",
  high: "border-orange-400/40 bg-orange-400/10 text-orange-200",
  medium: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  low: "border-cyan-300/35 bg-cyan-300/10 text-cyan-100",
  info: "border-white/20 bg-white/5 text-[var(--marketing-muted)]",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function loadRecovery(): Recovery | null {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as unknown;
    if (!isObject(saved) || typeof saved.runId !== "string") return null;
    const token = typeof saved.token === "string" ? saved.token : "";
    if (!runIdPattern.test(saved.runId) || (token && !tokenPattern.test(token))) {
      return null;
    }
    return { runId: saved.runId, token };
  } catch {
    return null;
  }
}

function saveRecovery(runId: string, token: string) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ runId, token }));
  } catch {
    // The active tab still works when storage is unavailable.
  }
}

function updateRunQuery(runId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("run", runId);
  window.history.replaceState(window.history.state, "", url);
}

function errorMessage(payload: unknown, locale: Locale) {
  const code = isObject(payload) && typeof payload.code === "string" ? payload.code : "";
  const messages: Record<string, [string, string]> = {
    INVALID_TARGET: ["请输入可公开访问的网址。", "Enter a publicly accessible URL."],
    INVALID_REQUEST: ["请求无效，请检查网址。", "The request is invalid. Check the URL."],
    PUBLIC_TOKEN_ACTIVE: ["已有进行中的免费巡检。", "A free audit is already active."],
    IP_DAILY_LIMIT: ["今日免费次数已用完。", "The daily free limit has been reached."],
    ORIGIN_DAILY_LIMIT: ["该站点今日已巡检。", "This site has reached its daily limit."],
    QUEUE_CAPACITY_REACHED: ["队列已满，请稍后重试。", "The queue is full. Try again later."],
    RUN_NOT_FOUND_OR_ACCESS_DENIED: [
      "无法恢复，请使用原浏览器或所有者账号。",
      "Use the original browser or owner account to restore this run.",
    ],
    AUTHENTICATION_REQUIRED: ["请先登录所有者账号。", "Sign in with the owner account."],
    SEO_AUDIT_RECHECK_UNAVAILABLE: ["当前不可复检。", "No recheck is available."],
    ENTITLEMENT_UNAVAILABLE: ["巡检额度不可用。", "The audit credit is unavailable."],
  };
  return (
    messages[code]?.[locale === "en" ? 1 : 0] ??
    (locale === "en" ? "The request could not be completed." : "请求未能完成。")
  );
}

async function apiJson(url: string, locale: Locale, init?: RequestInit) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Preserve the generic error below for non-JSON responses.
  }
  if (!response.ok) throw new Error(errorMessage(payload, locale));
  return payload;
}

function parseReport(value: unknown): FullReport {
  if (
    !isObject(value) ||
    typeof value.id !== "string" ||
    !Array.isArray(value.strengths) ||
    !Array.isArray(value.findings) ||
    !Array.isArray(value.agentPrompts)
  ) {
    throw new Error("Invalid report response.");
  }
  return value as unknown as FullReport;
}

export function SeoAuditTool({
  locale,
  initialRunId,
  isAuthenticated,
  csrfToken,
  offers,
}: Props) {
  const en = locale === "en";
  const [targetUrl, setTargetUrl] = useState("");
  const [recovery, setRecovery] = useState<Recovery>({
    runId: initialRunId ?? "",
    token: "",
  });
  const [status, setStatus] = useState<UiStatus>(initialRunId ? "loading" : "idle");
  const [run, setRun] = useState<AuditRun | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [report, setReport] = useState<FullReport | null>(null);
  const [ownerError, setOwnerError] = useState("");
  const [busy, setBusy] = useState<"report" | "recheck" | null>(null);
  const [cancelPollingPaused, setCancelPollingPaused] = useState(false);
  const pollerRef = useRef<SeoAuditRunPoller | null>(null);
  const trackedViews = useRef(new Set<string>());

  useEffect(() => {
    const saved = loadRecovery();
    if (initialRunId) {
      setRecovery({
        runId: initialRunId,
        token: saved?.runId === initialRunId ? saved.token : "",
      });
    } else if (saved) {
      setRecovery(saved);
      setStatus("loading");
    }
    setReady(true);
  }, [initialRunId]);

  useEffect(() => {
    if (!ready || !recovery.runId) return;
    setCancelPollingPaused(false);
    const poller = createSeoAuditRunPoller({
      request: (signal) =>
        fetch(
          "/api/seo-audit/runs/" + encodeURIComponent(recovery.runId),
          {
            cache: "no-store",
            credentials: "same-origin",
            headers: recovery.token
              ? { "x-seo-audit-token": recovery.token }
              : undefined,
            signal,
          },
        ),
      onRun(nextRun) {
        setRun(nextRun);
        setStatus(nextRun.status);
        setCancelPollingPaused(false);
        setError(
          nextRun.status === "failed"
            ? en
              ? "The audit could not be completed."
              : "巡检未能完成。"
            : "",
        );
      },
      onTemporarilyUnavailable() {
        setStatus("temporarily_unavailable");
        setError("");
      },
      onAccessError(kind) {
        setStatus("access_error");
        setError(getPollingAccessErrorMessage(kind, locale));
      },
      onCancelPollingPaused() {
        setCancelPollingPaused(true);
      },
    });
    pollerRef.current = poller;
    void poller.start();
    return () => {
      if (pollerRef.current === poller) pollerRef.current = null;
      poller.stop();
    };
  }, [en, locale, ready, recovery]);

  useEffect(() => {
    if (status !== "completed" || !run?.summary) return;
    const summaryKey = `summary:${run.id}`;
    if (!trackedViews.current.has(summaryKey)) {
      trackedViews.current.add(summaryKey);
      trackClientAnalyticsEvent({
        eventName: "seo_audit_summary_viewed",
        path: window.location.pathname,
        entityType: "seo_audit_run",
        entityId: run.id,
      });
    }
    if (run.kind !== "free") return;
    const paywallKey = `paywall:${run.id}`;
    if (trackedViews.current.has(paywallKey)) return;
    trackedViews.current.add(paywallKey);
    trackClientAnalyticsEvent({
      eventName: "seo_audit_paywall_viewed",
      path: window.location.pathname,
      entityType: "seo_audit_run",
      entityId: run.id,
      metadata: { offerCount: offers.length },
    });
  }, [offers.length, run, status]);

  async function startAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = targetUrl.trim();
    if (!input) return;
    setStatus("loading");
    setRun(null);
    setReport(null);
    setError("");
    setCancelPollingPaused(false);

    try {
      const payload = await apiJson("/api/seo-audit/runs", locale, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUrl: input }),
      });
      if (
        !isObject(payload) ||
        typeof payload.runId !== "string" ||
        typeof payload.token !== "string" ||
        !runIdPattern.test(payload.runId) ||
        !tokenPattern.test(payload.token)
      ) {
        throw new Error(en ? "Invalid audit response." : "巡检响应无效。" );
      }
      const nextRecovery = { runId: payload.runId, token: payload.token };
      saveRecovery(nextRecovery.runId, nextRecovery.token);
      updateRunQuery(nextRecovery.runId);
      setRecovery(nextRecovery);
      setStatus(payload.status === "completed" ? "completed" : "queued");
    } catch (submitError) {
      setStatus("request_error");
      setError(submitError instanceof Error ? submitError.message : errorMessage(null, locale));
    }
  }

  async function loadReport() {
    if (status !== "completed" || !run?.canReadFullReport) return;
    setBusy("report");
    setOwnerError("");
    try {
      const payload = await apiJson(
        "/api/seo-audit/runs/" + encodeURIComponent(run.id) + "/report",
        locale,
      );
      setReport(parseReport(payload));
    } catch (loadError) {
      setOwnerError(loadError instanceof Error ? loadError.message : errorMessage(null, locale));
    } finally {
      setBusy(null);
    }
  }

  async function recheck() {
    if (status !== "completed" || !run?.canReadFullReport) return;
    setBusy("recheck");
    setOwnerError("");
    try {
      const payload = await apiJson(
        "/api/seo-audit/runs/" + encodeURIComponent(run.id) + "/recheck",
        locale,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ csrfToken }),
        },
      );
      if (!isObject(payload) || typeof payload.runId !== "string") {
        throw new Error(en ? "Invalid recheck response." : "复检响应无效。" );
      }
      const nextRecovery = { runId: payload.runId, token: "" };
      saveRecovery(nextRecovery.runId, nextRecovery.token);
      updateRunQuery(nextRecovery.runId);
      setRecovery(nextRecovery);
      setRun(null);
      setReport(null);
      setStatus("queued");
      setCancelPollingPaused(false);
    } catch (recheckError) {
      setOwnerError(recheckError instanceof Error ? recheckError.message : errorMessage(null, locale));
    } finally {
      setBusy(null);
    }
  }

  function retryPolling() {
    setError("");
    setCancelPollingPaused(false);
    setStatus(run?.status ?? "loading");
    void pollerRef.current?.retry();
  }

  const canRetryPolling =
    status === "temporarily_unavailable" ||
    status === "access_error" ||
    (status === "cancel_requested" && cancelPollingPaused);

  return (
    <main className="min-h-screen bg-[#080d12] text-[var(--marketing-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <section aria-labelledby="audit-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
            <strong className="inline-flex items-center gap-2 text-sm text-[var(--marketing-accent)]">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" /> ENHE AI
            </strong>
            <span className="text-sm text-[var(--marketing-muted)]">
              {en ? "Audit 10 pages free" : "免费巡检 10 页"}
            </span>
          </div>
          <div className="max-w-3xl pt-7">
            <h1 id="audit-title" className="text-3xl font-black leading-tight sm:text-4xl">
              {en ? "Independent-site SEO/GEO Audit" : "独立站 SEO/GEO 智能巡检"}
            </h1>
            <p className="mt-3 text-[var(--marketing-muted)] sm:text-lg">
              {en ? "独立站 SEO/GEO 智能巡检" : "Independent-site SEO/GEO Audit"}
            </p>
          </div>

          <form onSubmit={startAudit} className="mt-7 border-y border-white/10 py-6">
            <label htmlFor="audit-url" className="text-sm font-bold">
              {en ? "Public website URL" : "公开网站 URL"}
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-h-12 items-center gap-3 rounded-md border border-white/15 bg-black/25 px-4 focus-within:border-[var(--marketing-accent)]">
                <Search aria-hidden="true" className="h-5 w-5 text-[var(--marketing-muted)]" />
                <input
                  id="audit-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  required
                  maxLength={2048}
                  value={targetUrl}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  placeholder="https://example.com"
                  className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-white/35"
                />
              </div>
              <button
                type="submit"
                disabled={[
                  "loading",
                  "queued",
                  "running",
                  "cancel_requested",
                ].includes(status)}
                className={primaryButton}
              >
                {status === "loading" ? (
                  <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
                ) : (
                  <FileSearch aria-hidden="true" className="h-5 w-5" />
                )}
                {en ? "Audit 10 pages free" : "免费巡检 10 页"}
              </button>
            </div>
            {status !== "idle" ? (
              <StatusLine
                status={status}
                runId={status === "request_error" ? "" : recovery.runId}
                locale={locale}
                onRetry={canRetryPolling ? retryPolling : undefined}
              />
            ) : null}
            {error ? <p className="mt-3 break-words text-sm text-red-200" role="alert">{error}</p> : null}
          </form>
        </section>

        <SampleReport locale={locale} />

        <SeoAuditRunPanels
          locale={locale}
          status={status}
          run={run}
          recoveryToken={recovery.token}
          csrfToken={csrfToken}
          offers={offers}
          isAuthenticated={isAuthenticated}
          report={report}
          busy={busy}
          ownerError={ownerError}
          onLoad={loadReport}
          onRecheck={recheck}
        />
      </div>
    </main>
  );
}

export function SeoAuditRunPanels({
  locale,
  status,
  run,
  recoveryToken,
  csrfToken,
  offers,
  isAuthenticated,
  report,
  busy,
  ownerError,
  onLoad,
  onRecheck,
}: {
  locale: Locale;
  status: UiStatus;
  run: AuditRun | null;
  recoveryToken: string;
  csrfToken: string;
  offers: Offer[];
  isAuthenticated: boolean;
  report: FullReport | null;
  busy: "report" | "recheck" | null;
  ownerError: string;
  onLoad(): void;
  onRecheck(): void;
}) {
  return (
    <>
      {status === "completed" && run?.summary ? (
        <>
          <PublicSummary locale={locale} origin={run.origin} summary={run.summary} />
          {run.kind === "free" ? (
            <Plans
              locale={locale}
              runId={run.id}
              token={recoveryToken}
              csrfToken={csrfToken}
              offers={offers}
              isAuthenticated={isAuthenticated}
            />
          ) : null}
        </>
      ) : null}

      {status === "completed" && run?.canReadFullReport && isAuthenticated ? (
        <OwnerReport
          locale={locale}
          runId={run.id}
          report={report}
          busy={busy}
          error={ownerError}
          onLoad={onLoad}
          onRecheck={onRecheck}
        />
      ) : null}
    </>
  );
}

function StatusLine({
  status,
  runId,
  locale,
  onRetry,
}: {
  status: Exclude<UiStatus, "idle">;
  runId: string;
  locale: Locale;
  onRetry?: () => void;
}) {
  const labels: Record<
    Exclude<UiStatus, "idle">,
    readonly [string, string]
  > = {
    loading: ["正在加载状态", "Loading status"],
    ...SEO_AUDIT_RUN_STATUS_LABELS,
    temporarily_unavailable: [
      "状态暂时不可用，可重试",
      "Status temporarily unavailable. Retry.",
    ],
    access_error: ["无法读取巡检状态", "Audit status unavailable"],
    request_error: ["请求未完成", "Request failed"],
  };
  const Icon =
    status === "completed"
      ? CheckCircle2
      : ["failed", "cancelled", "access_error", "request_error"].includes(status)
        ? XCircle
        : status === "queued"
          ? Clock3
          : status === "temporarily_unavailable"
            ? RefreshCw
            : LoaderCircle;
  const text = labels[status];
  return (
    <div
      className="mt-4 grid min-h-[5.5rem] min-w-0 gap-2 text-sm sm:min-h-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-2">
        <Icon
          aria-hidden="true"
          className={
            "mt-0.5 h-4 w-4 shrink-0 " +
            (["loading", "running", "cancel_requested"].includes(status)
              ? "animate-spin"
              : "")
          }
        />
        <div className="min-w-0 break-words leading-5">
          <strong>
            {locale === "en"
              ? text[1] + " / " + text[0]
              : text[0] + " / " + text[1]}
          </strong>
          {runId ? (
            <span className="block max-w-full break-all text-[var(--marketing-muted)] sm:ml-2 sm:inline">
              #{runId}
            </span>
          ) : null}
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={secondaryButton + " w-full shrink-0 sm:w-auto"}
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {locale === "en" ? "Retry status" : "重试状态"}
        </button>
      ) : null}
    </div>
  );
}

function SampleReport({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <details id="sample-report" className="border-b border-white/10 py-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[var(--marketing-muted)] hover:text-white">
        <FileText aria-hidden="true" className="h-4 w-4" />
        {en ? "Sample report / 示例报告" : "示例报告 / Sample report"}
      </summary>
      <dl className="mt-5 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-3">
        <div><dt className="text-sm text-[var(--marketing-muted)]">{en ? "Score" : "得分"}</dt><dd className="text-2xl text-emerald-300">78</dd></div>
        <div><dt className="text-sm text-[var(--marketing-muted)]">{en ? "Pages" : "页面"}</dt><dd className="text-2xl">10</dd></div>
        <div><dt className="text-sm text-[var(--marketing-muted)]">{en ? "Finding" : "问题"}</dt><dd className="text-amber-200">{en ? "Missing meta description" : "缺少 Meta Description"}</dd></div>
      </dl>
    </details>
  );
}

function PublicSummary({
  locale,
  origin,
  summary,
}: {
  locale: Locale;
  origin: string;
  summary: Summary;
}) {
  const en = locale === "en";
  const total = summary.criticalCount + summary.highCount + summary.mediumCount;
  const metrics = [
    [en ? "Audit score" : "巡检得分", summary.score],
    [en ? "Evidence coverage" : "证据覆盖率", summary.evidenceCoverage + "%"],
    [en ? "Priority findings" : "优先问题", total],
  ];
  return (
    <section className="border-b border-white/10 py-9" aria-labelledby="summary-title">
      <p className="text-sm font-bold text-emerald-300">
        {en ? "Free audit completed" : "免费巡检已完成"}
      </p>
      <h2 id="summary-title" className="mt-2 break-all text-2xl font-black">{origin}</h2>
      <p className="mt-2 text-sm text-[var(--marketing-muted)]">
        {en ? summary.pageCount + " pages checked" : "已检查 " + summary.pageCount + " 页"}
      </p>
      <dl className="mt-6 grid border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
        {metrics.map(([label, value]) => (
          <div key={label} className="py-4 sm:px-5 sm:first:pl-0">
            <dt className="text-sm text-[var(--marketing-muted)]">{label}</dt>
            <dd className="mt-1 text-3xl font-black">{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-7 text-lg font-black">{en ? "Public findings" : "公开问题"}</h3>
      <ol className="mt-3 divide-y divide-white/10 border-y border-white/10">
        {summary.findings.map((finding) => (
          <li key={finding.id} className="grid gap-3 py-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <span className={"w-fit rounded-sm border px-2 py-1 text-xs font-black uppercase " + severityClass[finding.severity]}>
              {finding.severity}
            </span>
            <div className="min-w-0">
              <code className="text-xs text-[var(--marketing-accent)]">{finding.code}</code>
              <p className="mt-1 break-words text-sm leading-6 text-[var(--marketing-soft-text)]">{finding.issue}</p>
            </div>
          </li>
        ))}
      </ol>
      {summary.lockedFindingCount ? (
        <p className="mt-4 text-sm text-[var(--marketing-muted)]">
          {en
            ? summary.lockedFindingCount + " additional findings are in the owner report."
            : "所有者报告另含 " + summary.lockedFindingCount + " 个问题。"}
        </p>
      ) : null}
    </section>
  );
}

function Plans({
  locale,
  runId,
  token,
  csrfToken,
  offers,
  isAuthenticated,
}: {
  locale: Locale;
  runId: string;
  token: string;
  csrfToken: string;
  offers: Offer[];
  isAuthenticated: boolean;
}) {
  const en = locale === "en";
  const canBuy = isAuthenticated || tokenPattern.test(token);
  return (
    <section className="border-b border-white/10 py-9" aria-labelledby="plans-title">
      <h2 id="plans-title" className="text-2xl font-black">
        {en ? "Unlock the owner report" : "解锁所有者报告"}
      </h2>
      <p className="mt-2 text-sm text-[var(--marketing-muted)]">
        {isAuthenticated
          ? en ? "Signed in. Server-verified pricing applies." : "已登录，价格由服务端校验。"
          : en ? "Choose a plan, then sign in." : "选择方案后登录购买。"}
      </p>
      {offers.length ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {offers.map((offer) => (
            <form key={offer.code} action={purchaseSeoAuditAction} className="rounded-lg border border-white/12 bg-white/[0.035] p-5">
              <input type="hidden" name="offerCode" value={offer.code} />
              <input type="hidden" name="sourceRunId" value={runId} />
              <input type="hidden" name="publicToken" value={token} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black">{en ? offer.nameEn ?? offer.name : offer.name}</h3>
                  <p className="mt-1 text-sm text-[var(--marketing-muted)]">
                    {offer.pageLimit} {en ? "pages" : "页"} · {offer.includedRuns} {en ? "run(s)" : "次"} · {offer.validityDays} {en ? "days" : "天"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <strong className="text-2xl text-[var(--marketing-accent)]">¥{offer.price}</strong>
                  {offer.isLaunchPrice ? <del className="block text-xs text-[var(--marketing-muted)]">¥{offer.regularPrice}</del> : null}
                </div>
              </div>
              <label className="mt-5 block text-sm font-bold">
                {en ? "Payment" : "支付方式"}
                <select name="paymentMethod" defaultValue="alipay" className="form-select-dark mt-2 rounded-md">
                  <option value="alipay">{en ? "Alipay" : "支付宝"}</option>
                  <option value="wechat">{en ? "WeChat Pay" : "微信支付"}</option>
                </select>
              </label>
              <PurchaseButton locale={locale} offerCode={offer.code} signedIn={isAuthenticated} disabled={!canBuy} />
            </form>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-amber-100">
          {en ? "Paid plans are temporarily unavailable." : "付费方案暂不可用。"}
        </p>
      )}
      {!canBuy ? (
        <p className="mt-4 text-sm text-amber-100" role="alert">
          {en ? "Checkout requires the original browser token." : "购买需要原浏览器 token。"}
        </p>
      ) : null}
    </section>
  );
}

function PurchaseButton({
  locale,
  offerCode,
  signedIn,
  disabled,
}: {
  locale: Locale;
  offerCode: Offer["code"];
  signedIn: boolean;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  const en = locale === "en";
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={primaryButton + " mt-5 w-full"}
    >
      {pending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}
      {pending
        ? en ? "Starting checkout..." : "正在创建订单..."
        : signedIn ? en ? "Continue to payment" : "继续支付"
        : en ? "Sign in to buy" : "登录后购买"}
    </button>
  );
}

function OwnerReport({
  locale,
  runId,
  report,
  busy,
  error,
  onLoad,
  onRecheck,
}: {
  locale: Locale;
  runId: string;
  report: FullReport | null;
  busy: "report" | "recheck" | null;
  error: string;
  onLoad(): void;
  onRecheck(): void;
}) {
  const en = locale === "en";
  const base = "/api/seo-audit/runs/" + encodeURIComponent(runId);
  return (
    <section className="border-b border-white/10 py-9" aria-labelledby="owner-title">
      <p className="text-sm font-bold text-emerald-300">
        {en ? "Owner access verified" : "已验证报告所有者"}
      </p>
      <h2 id="owner-title" className="mt-2 text-2xl font-black">
        {en ? "Private remediation report" : "私有整改报告"}
      </h2>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onLoad} disabled={busy === "report"} className={secondaryButton}>
          {busy === "report" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FileText aria-hidden="true" className="h-4 w-4" />}
          {en ? "Open report" : "查看报告"}
        </button>
        {(["json", "markdown"] as const).map((format) => (
          <a
            key={format}
            href={base + "/download?format=" + format}
            className={secondaryButton}
          >
            <Download aria-hidden="true" className="h-4 w-4" /> {format === "json" ? "JSON" : "Markdown"}
          </a>
        ))}
        <button
          type="button"
          onClick={onRecheck}
          disabled={busy === "recheck"}
          className={secondaryButton}
        >
          <RefreshCw aria-hidden="true" className={"h-4 w-4 " + (busy === "recheck" ? "animate-spin" : "")} />
          {en ? "Recheck" : "重新巡检"}
        </button>
      </div>
      {error ? <p className="mt-4 text-sm text-red-200" role="alert">{error}</p> : null}
      {report ? <ReportView locale={locale} report={report} /> : null}
    </section>
  );
}

function ReportView({ locale, report }: { locale: Locale; report: FullReport }) {
  const en = locale === "en";
  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      {report.strengths.length ? (
        <section aria-labelledby="strengths-title">
          <h3 id="strengths-title" className="text-lg font-black">{en ? "Verified strengths" : "已验证优势"}</h3>
          <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
            {report.strengths.map((item) => <li key={item.id} className="py-4"><strong>{item.title}</strong><p className="mt-1 text-sm text-[var(--marketing-muted)]">{item.value}</p></li>)}
          </ul>
        </section>
      ) : null}
      <section className="mt-7" aria-labelledby="findings-title">
        <h3 id="findings-title" className="text-lg font-black">{en ? "Remediation findings" : "整改问题"}</h3>
        <ol className="mt-3 divide-y divide-white/10 border-y border-white/10">
          {report.findings.map((item) => (
            <li key={item.id} className="py-5">
              <span className={"rounded-sm border px-2 py-1 text-xs font-black uppercase " + severityClass[item.severity]}>{item.severity}</span>
              <h4 className="mt-3 font-black">{item.issue}</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]"><strong className="text-white">{en ? "Action: " : "整改："}</strong>{item.remediation}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]"><strong className="text-white">{en ? "Verify: " : "验证："}</strong>{item.verification}</p>
            </li>
          ))}
        </ol>
      </section>
      {report.agentPrompts.length ? (
        <section className="mt-7" aria-labelledby="prompts-title">
          <h3 id="prompts-title" className="text-lg font-black">{en ? "Agent prompts" : "智能体提示词"}</h3>
          <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
            {report.agentPrompts.map((item) => (
              <details key={item.id} className="py-4">
                <summary className="cursor-pointer font-bold">{item.name}</summary>
                <a href={item.website} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-[var(--marketing-accent)]">{item.website}</a>
                <PromptCopyButton
                  locale={locale}
                  promptId={item.id}
                  prompt={item.prompt}
                  runId={report.id}
                />
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md border border-white/10 bg-black/30 p-4 text-xs leading-6">{item.prompt}</pre>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PromptCopyButton({
  locale,
  promptId,
  prompt,
  runId,
}: {
  locale: Locale;
  promptId: string;
  prompt: string;
  runId: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      trackClientAnalyticsEvent({
        eventName: "seo_audit_prompt_copied",
        path: window.location.pathname,
        entityType: "seo_audit_run",
        entityId: runId,
        metadata: { promptId },
      });
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyPrompt}
      className={secondaryButton + " mt-3"}
      aria-label={locale === "en" ? "Copy agent prompt" : "复制智能体提示词"}
    >
      {copied ? (
        <Check aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Copy aria-hidden="true" className="h-4 w-4" />
      )}
      {copied
        ? locale === "en"
          ? "Copied"
          : "已复制"
        : locale === "en"
          ? "Copy prompt"
          : "复制提示词"}
    </button>
  );
}
