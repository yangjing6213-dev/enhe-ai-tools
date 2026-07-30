import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  assertPrivateSeoAuditArtifactKeys,
  SEO_AUDIT_COS_REQUEST_TIMEOUT_MS,
} from "@/lib/seo-audit/artifacts";
import {
  canReadSeoAuditFullReport,
  hasBlockingSeoAuditRefund,
  hashSeoAuditPublicToken,
} from "@/lib/seo-audit/public-access";
import { getSecureCosMediaUrl } from "@/lib/storage";

const createRunSchema = z
  .object({
    targetUrl: z.string().trim().min(1).max(2048),
  })
  .strict();

const reportText = z.string().trim().min(1).max(20_000);
const strengthSchema = z
  .object({
    id: z.string().max(64),
    title: reportText,
    value: reportText,
  })
  .passthrough();
const findingSchema = z
  .object({
    id: z.string().max(64),
    severity: z.enum(["critical", "high", "medium", "low", "info"]),
    issue: reportText,
    action: reportText,
    verification: reportText,
  })
  .passthrough();
const agentPromptSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(128),
    website: z.string().url().max(2048),
    prompt: z.string().trim().min(1).max(100_000),
  })
  .passthrough();

export function parseCreateSeoAuditRunInput(input: unknown) {
  const parsed = createRunSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_REQUEST");
  return parsed.data;
}

export function generateSeoAuditPublicToken() {
  return randomBytes(32).toString("base64url");
}

export function readTrustedClientIp(request: Request) {
  // Production Nginx overwrites X-Real-IP with $remote_addr. X-Forwarded-For
  // uses proxy_add_x_forwarded_for and can contain a client-forged prefix.
  const raw = request.headers.get("x-real-ip")?.trim() ?? "";
  if (!raw || isIP(raw) === 0) throw new Error("CLIENT_IP_UNAVAILABLE");
  return raw;
}

export function buildSeoAuditFullReportResponse(
  run: {
    id: string;
    normalizedOrigin: string;
    summaryScore: number | null;
    summaryEvidenceCoverage: number | null;
    summaryPageCount: number | null;
    summaryCriticalCount: number | null;
    summaryHighCount: number | null;
    summaryMediumCount: number | null;
    completedAt: Date | null;
  },
  report: unknown,
  options: { canRecheck?: boolean } = {},
) {
  if (
    !run.completedAt ||
    run.summaryScore === null ||
    run.summaryEvidenceCoverage === null ||
    run.summaryPageCount === null ||
    run.summaryCriticalCount === null ||
    run.summaryHighCount === null ||
    run.summaryMediumCount === null ||
    !report ||
    typeof report !== "object"
  ) {
    throw new Error("REPORT_UNAVAILABLE");
  }
  const candidate = report as {
    strengths?: unknown;
    findings?: unknown;
    agent_prompts?: unknown;
  };
  const strengths = z.array(strengthSchema).max(500).safeParse(candidate.strengths);
  const findings = z.array(findingSchema).max(2_000).safeParse(candidate.findings);
  const agentPrompts = z
    .array(agentPromptSchema)
    .max(8)
    .safeParse(candidate.agent_prompts);
  if (!strengths.success || !findings.success || !agentPrompts.success) {
    throw new Error("REPORT_INVALID");
  }

  return {
    id: run.id,
    origin: run.normalizedOrigin,
    completedAt: run.completedAt.toISOString(),
    summary: {
      score: run.summaryScore,
      evidenceCoverage: run.summaryEvidenceCoverage,
      pageCount: run.summaryPageCount,
      criticalCount: run.summaryCriticalCount,
      highCount: run.summaryHighCount,
      mediumCount: run.summaryMediumCount,
    },
    strengths: strengths.data.map(({ id, title, value }) => ({
      id,
      title,
      value,
    })),
    findings: findings.data.map(
      ({ id, severity, issue, action, verification }) => ({
        id,
        severity,
        issue,
        remediation: action,
        verification,
      }),
    ),
    agentPrompts: agentPrompts.data.map(({ id, name, website, prompt }) => ({
      id,
      name,
      website,
      prompt,
    })),
    recheck:
      options.canRecheck === true
        ? {
            endpoint: `/api/seo-audit/runs/${encodeURIComponent(run.id)}/recheck`,
          }
        : null,
    downloads: {
      json: `/api/seo-audit/runs/${encodeURIComponent(run.id)}/download?format=json`,
      markdown: `/api/seo-audit/runs/${encodeURIComponent(run.id)}/download?format=markdown`,
    },
  };
}

type AnonymousClaimRunRecord = {
  id: string;
  userId: string | null;
  status: string;
  kind: string;
  publicTokenHash: string | null;
  publicTokenExpiresAt: Date | null;
};

type AnonymousClaimDatabase = {
  seoAuditRun: {
    findUnique(args: {
      where: { id: string };
      select: Record<keyof AnonymousClaimRunRecord, true>;
    }): Promise<AnonymousClaimRunRecord | null>;
    updateMany(args: {
      where: {
        id: string;
        userId: null;
        status: "completed";
        kind: "free";
        publicTokenHash: string;
        publicTokenExpiresAt: { gt: Date };
      };
      data: {
        userId: string;
        publicTokenHash: null;
        publicTokenExpiresAt: null;
      };
    }): Promise<{ count: number }>;
  };
};

const anonymousClaimSelect: Record<keyof AnonymousClaimRunRecord, true> = {
  id: true,
  userId: true,
  status: true,
  kind: true,
  publicTokenHash: true,
  publicTokenExpiresAt: true,
};

export async function claimAnonymousSeoAuditRun(
  input: { runId: string; userId: string; publicToken: string },
  options: { db?: AnonymousClaimDatabase; now?: Date } = {},
) {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.runId) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.userId)
  ) {
    throw new Error("SEO_AUDIT_CLAIM_UNAVAILABLE");
  }
  let publicTokenHash: string;
  try {
    publicTokenHash = hashSeoAuditPublicToken(input.publicToken);
  } catch {
    throw new Error("SEO_AUDIT_CLAIM_UNAVAILABLE");
  }
  const db = options.db ?? (prisma as unknown as AnonymousClaimDatabase);
  const now = options.now ?? new Date();
  const run = await db.seoAuditRun.findUnique({
    where: { id: input.runId },
    select: anonymousClaimSelect,
  });
  if (
    !run ||
    run.userId !== null ||
    run.status !== "completed" ||
    run.kind !== "free" ||
    run.publicTokenHash !== publicTokenHash ||
    !run.publicTokenExpiresAt ||
    run.publicTokenExpiresAt <= now
  ) {
    throw new Error("SEO_AUDIT_CLAIM_UNAVAILABLE");
  }

  const claimed = await db.seoAuditRun.updateMany({
    where: {
      id: input.runId,
      userId: null,
      status: "completed",
      kind: "free",
      publicTokenHash,
      publicTokenExpiresAt: { gt: now },
    },
    data: {
      userId: input.userId,
      publicTokenHash: null,
      publicTokenExpiresAt: null,
    },
  });
  if (claimed.count !== 1) {
    throw new Error("SEO_AUDIT_CLAIM_UNAVAILABLE");
  }
  return { runId: input.runId, claimed: true as const };
}

type RecheckSourceRecord = {
  id: string;
  userId: string | null;
  status: string;
  kind: string;
  targetUrl: string;
  reportJsonKey: string | null;
  reportMarkdownKey: string | null;
  credit: {
    id: string;
    runKind?: string;
    remainingRuns: number;
    expiresAt: Date;
    refundedAt: Date | null;
  } | null;
  sourceOrder: {
    orderStatus: string;
    refundRecords: ReadonlyArray<{ status: string }>;
  } | null;
};

type RecheckDatabase = {
  seoAuditRun: {
    findFirst(args: {
      where: { id: string; userId: string };
      select: Record<string, unknown>;
    }): Promise<RecheckSourceRecord | null>;
  };
};

export async function loadOwnedSeoAuditRecheckSource(
  runId: string,
  userId: string,
  options: { db?: RecheckDatabase; now?: Date } = {},
) {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(runId) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(userId)
  ) {
    throw new Error("SEO_AUDIT_RECHECK_UNAVAILABLE");
  }
  const db = options.db ?? (prisma as unknown as RecheckDatabase);
  const now = options.now ?? new Date();
  const run = await db.seoAuditRun.findFirst({
    where: { id: runId, userId },
    select: {
      id: true,
      userId: true,
      status: true,
      kind: true,
      targetUrl: true,
      reportJsonKey: true,
      reportMarkdownKey: true,
      credit: {
        select: {
          id: true,
          runKind: true,
          remainingRuns: true,
          expiresAt: true,
          refundedAt: true,
        },
      },
      sourceOrder: {
        select: {
          orderStatus: true,
          refundRecords: { select: { status: true } },
        },
      },
    },
  });
  const creditKind = run?.credit?.runKind ?? run?.kind;
  if (
    !run ||
    run.status !== "completed" ||
    (creditKind !== "professional" && creditKind !== "deep") ||
    !run.reportJsonKey ||
    !run.reportMarkdownKey ||
    !run.credit ||
    run.credit.remainingRuns < 1 ||
    run.credit.expiresAt <= now ||
    run.credit.refundedAt !== null ||
    !run.sourceOrder ||
    (run.sourceOrder.orderStatus !== "paid" &&
      run.sourceOrder.orderStatus !== "activated") ||
    hasBlockingSeoAuditRefund(run.sourceOrder.refundRecords)
  ) {
    throw new Error("SEO_AUDIT_RECHECK_UNAVAILABLE");
  }
  return {
    creditId: run.credit.id,
    kind: creditKind,
    targetUrl: run.targetUrl,
  } as {
    creditId: string;
    kind: "professional" | "deep";
    targetUrl: string;
  };
}

export type SeoAuditFullReportResponse = ReturnType<
  typeof buildSeoAuditFullReportResponse
>;

export type SeoAuditOwnedReportRun = {
  id: string;
  userId: string | null;
  status: string;
  normalizedOrigin: string;
  summaryScore: number | null;
  summaryEvidenceCoverage: number | null;
  summaryPageCount: number | null;
  summaryCriticalCount: number | null;
  summaryHighCount: number | null;
  summaryMediumCount: number | null;
  reportJsonKey: string | null;
  reportMarkdownKey: string | null;
  reportSha256: string | null;
  completedAt: Date | null;
  sourceOrder: {
    orderStatus: string;
    refundRecords: Array<{ status: string }>;
  } | null;
};

type ReportDatabase = {
  seoAuditRun: {
    findFirst(args: {
      where: { id: string; userId: string };
      select: Record<string, unknown>;
    }): Promise<SeoAuditOwnedReportRun | null>;
  };
};

const ownedReportRunSelect = {
  id: true,
  userId: true,
  status: true,
  normalizedOrigin: true,
  summaryScore: true,
  summaryEvidenceCoverage: true,
  summaryPageCount: true,
  summaryCriticalCount: true,
  summaryHighCount: true,
  summaryMediumCount: true,
  reportJsonKey: true,
  reportMarkdownKey: true,
  reportSha256: true,
  completedAt: true,
  sourceOrder: {
    select: {
      orderStatus: true,
      refundRecords: { select: { status: true } },
    },
  },
};

export async function loadOwnedSeoAuditReportRun(
  runId: string,
  userId: string,
  options: { db?: ReportDatabase } = {},
) {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(runId) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(userId)
  ) {
    throw new Error("REPORT_NOT_FOUND");
  }
  const db = options.db ?? (prisma as unknown as ReportDatabase);
  const run = await db.seoAuditRun.findFirst({
    where: { id: runId, userId },
    select: ownedReportRunSelect,
  });
  if (!run) throw new Error("REPORT_NOT_FOUND");
  if (!canReadSeoAuditFullReport(run, userId) || !run.reportSha256) {
    throw new Error("REPORT_ACCESS_DENIED");
  }
  return run;
}

type PrivateArtifactReaderOptions = {
  env?: Record<string, string | undefined>;
  fetcher?: (
    input: URL,
    init: RequestInit,
  ) => Promise<Response>;
  resolveUrl?: (
    source: string,
    env: Record<string, string | undefined>,
  ) => Promise<URL | null>;
};

export async function readSeoAuditPrivateArtifact(
  input: {
    runId: string;
    reportSha256: string;
    reportJsonKey: string;
    reportMarkdownKey: string;
    format: "json" | "markdown";
  },
  options: PrivateArtifactReaderOptions = {},
) {
  assertPrivateSeoAuditArtifactKeys(
    {
      reportJsonKey: input.reportJsonKey,
      reportMarkdownKey: input.reportMarkdownKey,
    },
    { runId: input.runId, reportSha256: input.reportSha256 },
  );
  const env = options.env ?? process.env;
  const bucket = env.TENCENT_COS_BUCKET?.trim();
  if (!bucket) throw new Error("REPORT_STORAGE_UNAVAILABLE");
  const key =
    input.format === "json" ? input.reportJsonKey : input.reportMarkdownKey;
  const source = `cos://${bucket}/${key}`;
  const resolveUrl = options.resolveUrl ?? getSecureCosMediaUrl;
  const signedUrl = await resolveUrl(source, env);
  if (!signedUrl) throw new Error("REPORT_STORAGE_UNAVAILABLE");

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(signedUrl, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(SEO_AUDIT_COS_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("REPORT_STORAGE_UNAVAILABLE");
  const maxBytes = 32 * 1024 * 1024;
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("REPORT_TOO_LARGE");
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > maxBytes) throw new Error("REPORT_TOO_LARGE");
  return body.toString("utf8");
}
