import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import type { SendMailOptions, Transporter } from "nodemailer";
import { prisma } from "@/lib/db";
import {
  buildSeoAuditDiff,
  type SeoAuditDiff,
  type SeoAuditDiffSnapshot,
} from "@/lib/seo-audit/diff";
import {
  deliverSeoAuditEmailOutbox,
  persistSeoAuditNotificationEmail,
  type SeoAuditOutboxMessage,
} from "@/lib/seo-audit/email-outbox";

const dayMs = 24 * 60 * 60 * 1000;
const severeScoreRegression = -10;

type EnvLike = Record<string, string | undefined>;
type NotificationDb = typeof prisma;
type Mailer = Pick<Transporter, "sendMail">;

export type SeoAuditNotificationEmailConfig = {
  enabled: boolean;
  host?: string;
  port?: number;
  secure: boolean;
  user?: string;
  password?: string;
  from?: string;
  skipReason?: string;
};

type MonitoringEventType =
  | "completion_summary"
  | "severe_regression"
  | "final_failure"
  | "expires_7d"
  | "expires_1d"
  | "expired";

type MonitoringEmailInput = {
  eventType: MonitoringEventType;
  targetOrigin: string;
  linkUrl: string;
  appUrl?: string;
  score?: number;
  scoreDelta?: number;
  evidenceCoverageDelta?: number;
  newFindingIds?: string[];
  resolvedFindingIds?: string[];
  newSevereFindingIds?: string[];
  failureCode?: string;
  expiresAt?: Date;
};

type MonitoringEmail = {
  subject: string;
  text: string;
  html: string;
};

type DeliveryOptions = {
  db?: NotificationDb;
  mailer?: Mailer;
  config?: SeoAuditNotificationEmailConfig;
  now?: Date;
  deferEmailDelivery?: boolean;
};

type MonitoringEvent = {
  notificationId: string;
  userId: string;
  recipientEmail: string | null;
  type: string;
  title: string;
  content: string;
  linkUrl: string;
  email: MonitoringEmail;
};

type DeliverySummary = {
  attempted: number;
  sent: number;
  skipped: number;
};

type Finding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
};

const runNotificationSelect = {
  id: true,
  status: true,
  kind: true,
  targetUrl: true,
  userId: true,
  projectId: true,
  subscriptionId: true,
  engineVersion: true,
  summaryScore: true,
  summaryEvidenceCoverage: true,
  summaryFindings: true,
  completedAt: true,
  failedAt: true,
  failureCode: true,
  failureMessage: true,
  user: {
    select: {
      id: true,
      email: true,
    },
  },
  project: { select: { id: true, normalizedOrigin: true } },
  subscription: {
    select: {
      id: true,
      expiresAt: true,
      schedule: { select: { notificationEmail: true } },
    },
  },
} as const;

export function getSeoAuditNotificationEmailConfig(
  env: EnvLike = process.env,
): SeoAuditNotificationEmailConfig {
  const host = env.SMTP_HOST?.trim();
  const port = parsePort(env.SMTP_PORT);
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD;
  const from = env.SMTP_FROM?.trim() || user;
  const secure = parseBoolean(env.SMTP_SECURE, port === 465);

  if (env.SEO_AUDIT_EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return {
      enabled: false,
      host,
      port,
      secure,
      user,
      password,
      from,
      skipReason: "disabled by SEO_AUDIT_EMAIL_NOTIFICATIONS_ENABLED=false",
    };
  }

  if (!host || !port || !from) {
    return {
      enabled: false,
      host,
      port,
      secure,
      user,
      password,
      from,
      skipReason: "missing SMTP config",
    };
  }

  return { enabled: true, host, port, secure, user, password, from };
}

export function buildSeoAuditMonitoringEmail(
  input: MonitoringEmailInput,
): MonitoringEmail {
  const title = eventTitle(input.eventType);
  const subject = "[ENHE AI] " + title + ": " + input.targetOrigin;
  const lines: Array<[string, string]> = [
    ["Site", input.targetOrigin],
    ["Event", title],
  ];

  if (input.score !== undefined) lines.push(["Current score", String(input.score)]);
  if (input.scoreDelta !== undefined) {
    lines.push(["Score change", formatSigned(input.scoreDelta)]);
  }
  if (input.evidenceCoverageDelta !== undefined) {
    lines.push([
      "Evidence coverage change",
      formatSigned(input.evidenceCoverageDelta),
    ]);
  }
  if (input.newFindingIds?.length) {
    lines.push(["New findings", input.newFindingIds.join(", ")]);
  }
  if (input.resolvedFindingIds?.length) {
    lines.push(["Resolved findings", input.resolvedFindingIds.join(", ")]);
  }
  if (input.newSevereFindingIds?.length) {
    lines.push(["New critical/high findings", input.newSevereFindingIds.join(", ")]);
  }
  if (input.failureCode) lines.push(["Failure code", input.failureCode]);
  if (input.expiresAt) lines.push(["Service expires", input.expiresAt.toISOString()]);

  const link = absoluteLink(input.linkUrl, input.appUrl);
  const text = [
    title,
    "",
    ...lines.map(([label, value]) => label + ": " + value),
    "",
    "Open monitoring: " + link,
  ].join("\n");
  const html =
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">' +
    "<h2>" +
    escapeHtml(title) +
    "</h2><table>" +
    lines
      .map(
        ([label, value]) =>
          '<tr><th style="text-align:left;padding:4px 12px 4px 0">' +
          escapeHtml(label) +
          "</th><td>" +
          escapeHtml(value) +
          "</td></tr>",
      )
      .join("") +
    '</table><p><a href="' +
    escapeAttribute(link) +
    '">Open monitoring</a></p></div>';

  return { subject, text, html };
}

export async function sendSeoAuditMonitoringEvent(
  event: MonitoringEvent,
  options: DeliveryOptions = {},
) {
  const db = options.db ?? prisma;
  const persisted = await persistSeoAuditNotificationEmail(
    {
      notification: {
        id: event.notificationId,
        userId: event.userId,
        type: event.type,
        title: event.title,
        content: event.content,
        linkUrl: event.linkUrl,
      },
      recipientEmail: event.recipientEmail,
      email: event.email,
    },
    { db, now: options.now },
  );
  if (!event.recipientEmail || options.deferEmailDelivery) {
    return { created: persisted.created, emailed: false };
  }

  const delivery = await deliverPendingSeoAuditEmails({
    ...options,
    db,
    limit: 1,
    notificationId: event.notificationId,
  });
  return { created: persisted.created, emailed: delivery.sent === 1 };
}

export async function deliverPendingSeoAuditEmails(
  options: DeliveryOptions & { limit?: number; notificationId?: string } = {},
) {
  const db = options.db ?? prisma;
  const config = options.config ?? getSeoAuditNotificationEmailConfig();
  if (!config.enabled || !config.from) {
    return { claimed: 0, sent: 0, retried: 0, discarded: 0 };
  }

  const mailer = options.mailer ?? createMailer(config);
  return deliverSeoAuditEmailOutbox({
    db,
    now: options.now,
    limit: options.limit,
    notificationId: options.notificationId,
    send: (message) =>
      mailer.sendMail(
        buildMailOptions(config.from as string, message.to, message, message.id),
      ),
  });
}

export async function notifySeoAuditRunCompletion(
  runId: string,
  options: DeliveryOptions = {},
): Promise<DeliverySummary> {
  const db = options.db ?? prisma;
  const now = options.now ? new Date(options.now) : new Date();
  const run = await db.seoAuditRun.findUnique({
    where: { id: runId },
    select: runNotificationSelect,
  });
  if (
    !run ||
    run.status !== "completed" ||
    run.kind !== "scheduled" ||
    !run.user ||
    !run.project ||
    !run.subscription ||
    !run.projectId ||
    !run.engineVersion ||
    run.summaryScore === null ||
    run.summaryEvidenceCoverage === null
  ) {
    return emptySummary();
  }

  const comparableRun = {
    id: run.id,
    projectId: run.projectId,
    engineVersion: run.engineVersion,
    completedAt: run.completedAt,
    summaryScore: run.summaryScore,
    summaryEvidenceCoverage: run.summaryEvidenceCoverage,
  };
  const previous = await findComparablePreviousRun(db, comparableRun);
  const currentFindings = parseFindings(run.summaryFindings);
  const diff = previous
    ? buildComparableDiff(previous, comparableRun, currentFindings)
    : null;
  const hasChanges = diff === null || diffHasChanges(diff);
  if (!hasChanges) {
    await markCompletionNotificationPrepared(db, run.id, now);
    return emptySummary();
  }

  const recipientEmail = serviceNotificationEmail(
    run.subscription.schedule,
    run.user,
  );
  const linkUrl = monitoringLink(run.subscription.id);
  const events: MonitoringEvent[] = [
    {
      notificationId: "seo-audit:completion-summary:" + run.id,
      userId: run.user.id,
      recipientEmail,
      type: "seo_audit_monitoring_summary",
      title: "SEO/GEO monitoring completed",
      content: completionContent(run.summaryScore, diff),
      linkUrl,
      email: buildSeoAuditMonitoringEmail({
        eventType: "completion_summary",
        targetOrigin: run.project.normalizedOrigin,
        score: run.summaryScore,
        scoreDelta: diff?.scoreDelta,
        evidenceCoverageDelta: diff?.evidenceCoverageDelta,
        newFindingIds: diff?.newFindingIds,
        resolvedFindingIds: diff?.resolvedFindingIds,
        linkUrl,
      }),
    },
  ];

  if (diff) {
    const severeIds = new Set(
      currentFindings
        .filter(
          (finding) =>
            finding.severity === "critical" || finding.severity === "high",
        )
        .map((finding) => finding.id),
    );
    const newSevereFindingIds = diff.newFindingIds.filter((id) =>
      severeIds.has(id),
    );
    if (
      diff.scoreDelta <= severeScoreRegression ||
      newSevereFindingIds.length > 0
    ) {
      events.push({
        notificationId: "seo-audit:severe-regression:" + run.id,
        userId: run.user.id,
        recipientEmail,
        type: "seo_audit_monitoring_alert",
        title: "SEO/GEO monitoring alert",
        content: severeContent(diff.scoreDelta, newSevereFindingIds),
        linkUrl,
        email: buildSeoAuditMonitoringEmail({
          eventType: "severe_regression",
          targetOrigin: run.project.normalizedOrigin,
          score: run.summaryScore,
          scoreDelta: diff.scoreDelta,
          newSevereFindingIds,
          linkUrl,
        }),
      });
    }
  }

  const summary = await deliverEvents(events, { ...options, db, now });
  await markCompletionNotificationPrepared(db, run.id, now);
  return summary;
}

export async function notifySeoAuditPendingCompletions(
  options: DeliveryOptions & { limit?: number } = {},
): Promise<DeliverySummary> {
  const db = options.db ?? prisma;
  const runs = await db.seoAuditRun.findMany({
    where: {
      status: "completed",
      kind: "scheduled",
      userId: { not: null },
      completedAt: { not: null },
      completionNotificationPreparedAt: null,
    },
    orderBy: { completedAt: "asc" },
    take: boundedLimit(options.limit, 25),
    select: { id: true },
  });

  return mergeSummaries(
    await Promise.all(
      runs.map((run) => notifySeoAuditRunCompletion(run.id, { ...options, db })),
    ),
  );
}

export async function notifySeoAuditRunFailure(
  runId: string,
  options: DeliveryOptions = {},
): Promise<DeliverySummary> {
  const db = options.db ?? prisma;
  const run = await db.seoAuditRun.findUnique({
    where: { id: runId },
    select: runNotificationSelect,
  });
  if (
    !run ||
    run.status !== "failed" ||
    !run.user ||
    !run.project ||
    !run.failureCode
  ) {
    return emptySummary();
  }

  const linkUrl = run.subscriptionId
    ? monitoringLink(run.subscriptionId)
    : "/user/seo-audit";
  return deliverEvents(
    [
      {
        notificationId: "seo-audit:final-failure:" + run.id,
        userId: run.user.id,
        recipientEmail: serviceNotificationEmail(
          run.subscription?.schedule ?? null,
          run.user,
        ),
        type: "seo_audit_monitoring_failure",
        title: "SEO/GEO monitoring failed",
        content: "The audit failed after its final attempt (" + run.failureCode + ").",
        linkUrl,
        email: buildSeoAuditMonitoringEmail({
          eventType: "final_failure",
          targetOrigin: run.project.normalizedOrigin,
          failureCode: run.failureCode,
          linkUrl,
        }),
      },
    ],
    options,
  );
}

export async function notifySeoAuditPendingFinalFailures(
  options: DeliveryOptions & { limit?: number } = {},
): Promise<DeliverySummary> {
  const db = options.db ?? prisma;
  const limit = boundedLimit(options.limit, 25);
  const runs = await db.seoAuditRun.findMany({
    where: {
      status: "failed",
      userId: { not: null },
      failedAt: { not: null },
      failureCode: { not: null },
    },
    orderBy: { failedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  return mergeSummaries(
    await Promise.all(
      runs.map((run) => notifySeoAuditRunFailure(run.id, { ...options, db })),
    ),
  );
}

export async function notifySeoAuditSubscriptionExpirations(
  options: DeliveryOptions & { limit?: number } = {},
): Promise<DeliverySummary> {
  const db = options.db ?? prisma;
  const now = options.now ? new Date(options.now) : new Date();
  const subscriptions = await db.seoAuditSubscription.findMany({
    where: {
      status: { in: ["active", "paused", "expired"] },
      expiresAt: { lte: new Date(now.getTime() + 7 * dayMs) },
    },
    orderBy: { expiresAt: "asc" },
    take: boundedLimit(options.limit, 100),
    select: {
      id: true,
      userId: true,
      status: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      project: { select: { id: true, normalizedOrigin: true } },
      schedule: { select: { notificationEmail: true } },
    },
  });

  const events = subscriptions.map((subscription) => {
    const eventType = expirationEvent(subscription.expiresAt, now);
    const linkUrl = monitoringLink(subscription.id);
    const expiresAtKey = subscription.expiresAt.getTime();
    const prefix =
      eventType === "expires_7d"
        ? "expires-7d"
        : eventType === "expires_1d"
          ? "expires-1d"
          : "expired";
    const title = eventTitle(eventType);
    return {
      notificationId:
        "seo-audit:" + prefix + ":" + subscription.id + ":" + expiresAtKey,
      userId: subscription.user.id,
      recipientEmail: serviceNotificationEmail(
        subscription.schedule,
        subscription.user,
      ),
      type: "seo_audit_monitoring_" + eventType,
      title,
      content: expirationContent(eventType, subscription.expiresAt),
      linkUrl,
      email: buildSeoAuditMonitoringEmail({
        eventType,
        targetOrigin: subscription.project.normalizedOrigin,
        expiresAt: subscription.expiresAt,
        linkUrl,
      }),
    } satisfies MonitoringEvent;
  });

  return deliverEvents(events, { ...options, db, now });
}

async function findComparablePreviousRun(
  db: NotificationDb,
  run: {
    id: string;
    projectId: string;
    engineVersion: string;
    completedAt: Date | null;
  },
) {
  const major = engineMajor(run.engineVersion);
  if (major === null || !run.completedAt) return null;
  return db.seoAuditRun.findFirst({
    where: {
      id: { not: run.id },
      projectId: run.projectId,
      status: "completed",
      completedAt: { lt: run.completedAt },
      engineVersion: { startsWith: String(major) + "." },
      summaryScore: { not: null },
      summaryEvidenceCoverage: { not: null },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      projectId: true,
      engineVersion: true,
      summaryScore: true,
      summaryEvidenceCoverage: true,
      summaryFindings: true,
    },
  });
}

async function markCompletionNotificationPrepared(
  db: NotificationDb,
  runId: string,
  now: Date,
) {
  await db.seoAuditRun.updateMany({
    where: {
      id: runId,
      status: "completed",
      completionNotificationPreparedAt: null,
    },
    data: { completionNotificationPreparedAt: now },
  });
}

function buildComparableDiff(
  previous: {
    projectId: string | null;
    engineVersion: string | null;
    summaryScore: number | null;
    summaryEvidenceCoverage: number | null;
    summaryFindings: unknown;
  },
  current: {
    projectId: string;
    engineVersion: string;
    summaryScore: number;
    summaryEvidenceCoverage: number;
  },
  currentFindings: Finding[],
) {
  if (
    !previous.projectId ||
    !previous.engineVersion ||
    previous.summaryScore === null ||
    previous.summaryEvidenceCoverage === null
  ) {
    return null;
  }
  const previousSnapshot: SeoAuditDiffSnapshot = {
    projectId: previous.projectId,
    engineVersion: previous.engineVersion,
    score: previous.summaryScore,
    evidenceCoverage: previous.summaryEvidenceCoverage,
    findingIds: parseFindings(previous.summaryFindings).map(
      (finding) => finding.id,
    ),
  };
  const currentSnapshot: SeoAuditDiffSnapshot = {
    projectId: current.projectId,
    engineVersion: current.engineVersion,
    score: current.summaryScore,
    evidenceCoverage: current.summaryEvidenceCoverage,
    findingIds: currentFindings.map((finding) => finding.id),
  };
  try {
    return buildSeoAuditDiff(previousSnapshot, currentSnapshot);
  } catch {
    return null;
  }
}

async function deliverEvents(
  events: MonitoringEvent[],
  options: DeliveryOptions,
): Promise<DeliverySummary> {
  const summary = emptySummary();
  for (const event of events) {
    summary.attempted += 1;
    const result = await sendSeoAuditMonitoringEvent(event, options);
    if (result.emailed) {
      summary.sent += 1;
    } else if (!result.created) {
      summary.skipped += 1;
    }
  }
  return summary;
}

function parseFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  const findings: Finding[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const id = "id" in item && typeof item.id === "string" ? item.id.trim() : "";
    const severity =
      "severity" in item && typeof item.severity === "string"
        ? item.severity.toLowerCase()
        : "";
    if (
      id &&
      ["critical", "high", "medium", "low", "info"].includes(severity)
    ) {
      findings.push({ id, severity: severity as Finding["severity"] });
    }
  }
  return findings;
}

function serviceNotificationEmail(
  schedule: { notificationEmail: string | null } | null,
  user: { email: string | null },
) {
  return schedule?.notificationEmail?.trim() || user.email?.trim() || null;
}

function buildMailOptions(
  from: string,
  to: string,
  email: MonitoringEmail | SeoAuditOutboxMessage,
  outboxId?: string,
): SendMailOptions {
  return {
    from,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    encoding: "utf-8",
    ...(outboxId ? { messageId: stableOutboxMessageId(outboxId) } : {}),
  };
}

function stableOutboxMessageId(outboxId: string) {
  const digest = createHash("sha256").update(outboxId, "utf8").digest("hex");
  return "<seo-audit-" + digest + "@enhe-tech.com.cn>";
}

function createMailer(config: SeoAuditNotificationEmailConfig): Mailer {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.password
        ? { user: config.user, pass: config.password }
        : undefined,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });
}

function completionContent(score: number, diff: SeoAuditDiff | null) {
  if (!diff) return "The scheduled audit completed with a score of " + score + ".";
  return (
    "The scheduled audit completed with a score of " +
    score +
    " (" +
    formatSigned(diff.scoreDelta) +
    ")."
  );
}

function severeContent(scoreDelta: number, findingIds: string[]) {
  const details = findingIds.length
    ? " New critical/high findings: " + findingIds.join(", ") + "."
    : "";
  return "The monitoring score changed by " + formatSigned(scoreDelta) + "." + details;
}

function expirationContent(eventType: MonitoringEventType, expiresAt: Date) {
  if (eventType === "expired") {
    return "The monitoring service expired at " + expiresAt.toISOString() + ".";
  }
  const days = eventType === "expires_7d" ? 7 : 1;
  return (
    "The monitoring service expires within " +
    days +
    " day" +
    (days === 1 ? "" : "s") +
    " (" +
    expiresAt.toISOString() +
    ")."
  );
}

function expirationEvent(
  expiresAt: Date,
  now: Date,
): "expires_7d" | "expires_1d" | "expired" {
  const remaining = expiresAt.getTime() - now.getTime();
  if (remaining <= 0) return "expired";
  if (remaining <= dayMs) return "expires_1d";
  return "expires_7d";
}

function eventTitle(eventType: MonitoringEventType) {
  if (eventType === "completion_summary") return "SEO/GEO monitoring summary";
  if (eventType === "severe_regression") return "SEO/GEO monitoring alert";
  if (eventType === "final_failure") return "SEO/GEO monitoring failed";
  if (eventType === "expires_7d") return "SEO/GEO monitoring expires in 7 days";
  if (eventType === "expires_1d") return "SEO/GEO monitoring expires in 1 day";
  return "SEO/GEO monitoring expired";
}

function monitoringLink(subscriptionId: string) {
  return "/user/seo-audit?subscriptionId=" + encodeURIComponent(subscriptionId);
}

function absoluteLink(linkUrl: string, appUrl?: string) {
  if (/^https?:\/\//i.test(linkUrl)) return linkUrl;
  const base = (
    appUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://www.enhe-tech.com.cn"
  ).replace(/\/+$/, "");
  return base + (linkUrl.startsWith("/") ? "" : "/") + linkUrl;
}

function diffHasChanges(diff: SeoAuditDiff) {
  return (
    diff.scoreDelta !== 0 ||
    diff.evidenceCoverageDelta !== 0 ||
    diff.newFindingIds.length > 0 ||
    diff.resolvedFindingIds.length > 0
  );
}

function engineMajor(version: string) {
  const match = /^(\d+)(?:\.|$)/.exec(version);
  return match ? Number(match[1]) : null;
}

function emptySummary(): DeliverySummary {
  return { attempted: 0, sent: 0, skipped: 0 };
}

function mergeSummaries(summaries: DeliverySummary[]) {
  return summaries.reduce(
    (total, current) => ({
      attempted: total.attempted + current.attempted,
      sent: total.sent + current.sent,
      skipped: total.skipped + current.skipped,
    }),
    emptySummary(),
  );
}

function boundedLimit(value: number | undefined, fallback: number) {
  return Number.isSafeInteger(value)
    ? Math.min(Math.max(Number(value), 1), 100)
    : fallback;
}

function parsePort(value?: string) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : undefined;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function formatSigned(value: number) {
  return value > 0 ? "+" + value : String(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/\x60/g, "&#96;");
}
