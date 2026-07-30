import { createHash, timingSafeEqual } from "node:crypto";
import { sanitizeStoredSeoAuditPublicFindings } from "@/lib/seo-audit/artifacts";

export const SEO_AUDIT_PUBLIC_TOKEN_COOKIE = "seo_audit_public_token";

type SeoAuditRunAccessRecord = {
  id: string;
  userId: string | null;
  status: string;
  kind: string;
  normalizedOrigin: string;
  pageLimit: number;
  summaryScore: number | null;
  summaryEvidenceCoverage: number | null;
  summaryPageCount: number | null;
  summaryCriticalCount: number | null;
  summaryHighCount: number | null;
  summaryMediumCount: number | null;
  summaryFindings: unknown;
  failureCode: string | null;
  failureMessage?: string | null;
  reportJsonKey: string | null;
  reportMarkdownKey: string | null;
  reportSha256: string | null;
  createdAt: Date;
  completedAt: Date | null;
  sourceOrder: {
    orderStatus: string;
    refundRecords: ReadonlyArray<{ status: string }>;
  } | null;
};

export function hashSeoAuditPublicToken(token: string) {
  if (!/^[^\s]{24,512}$/.test(token)) {
    throw new Error("INVALID_PUBLIC_TOKEN");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function resolveSeoAuditRunAccess(
  run: {
    userId: string | null;
    publicTokenHash: string | null;
    publicTokenExpiresAt: Date | null;
  },
  input: {
    userId: string | null | undefined;
    token: string | null | undefined;
    now?: Date;
  },
): "anonymous" | "owner" | null {
  if (input.userId && run.userId === input.userId) return "owner";
  if (
    !input.token ||
    !run.publicTokenHash ||
    !run.publicTokenExpiresAt ||
    run.publicTokenExpiresAt <= (input.now ?? new Date())
  ) {
    return null;
  }

  try {
    const expected = Buffer.from(run.publicTokenHash, "hex");
    const actual = Buffer.from(hashSeoAuditPublicToken(input.token), "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual)
      ? "anonymous"
      : null;
  } catch {
    return null;
  }
}

export function canReadSeoAuditFullReport(
  run: {
    userId: string | null;
    status: string;
    reportJsonKey: string | null;
    reportMarkdownKey: string | null;
    sourceOrder: {
      orderStatus: string;
      refundRecords: ReadonlyArray<{ status: string }>;
    } | null;
  },
  userId: string | null | undefined,
) {
  return Boolean(
    userId &&
      run.userId === userId &&
      run.status === "completed" &&
      run.reportJsonKey &&
      run.reportMarkdownKey &&
      run.sourceOrder &&
      (run.sourceOrder.orderStatus === "paid" ||
        run.sourceOrder.orderStatus === "activated") &&
      !hasBlockingSeoAuditRefund(run.sourceOrder.refundRecords),
  );
}

export function hasBlockingSeoAuditRefund(
  refundRecords: ReadonlyArray<{ status: string }>,
) {
  return refundRecords.some((record) => record.status !== "rejected");
}

export function buildSeoAuditRunResponse(
  run: SeoAuditRunAccessRecord,
  options: {
    access: "anonymous" | "owner";
    publicFindingLimit?: number;
    canReadFullReport?: boolean;
  },
) {
  const findings = sanitizeStoredSeoAuditPublicFindings(run.summaryFindings);
  const visibleFindingLimit =
    options.access === "anonymous"
      ? Math.max(0, Math.min(options.publicFindingLimit ?? 3, 3))
      : findings.length;
  const visibleFindings = findings.slice(0, visibleFindingLimit);
  const countedFindings =
    (run.summaryCriticalCount ?? 0) +
    (run.summaryHighCount ?? 0) +
    (run.summaryMediumCount ?? 0);
  const hasSummary =
    run.summaryScore !== null &&
    run.summaryEvidenceCoverage !== null &&
    run.summaryPageCount !== null &&
    run.summaryCriticalCount !== null &&
    run.summaryHighCount !== null &&
    run.summaryMediumCount !== null;

  return {
    id: run.id,
    status: run.status,
    kind: run.kind,
    origin: run.normalizedOrigin,
    pageLimit: run.pageLimit,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    failure:
      run.status === "failed"
        ? {
            code: "AUDIT_FAILED",
            message: "The audit could not be completed.",
          }
        : null,
    summary: hasSummary
      ? {
          score: run.summaryScore as number,
          evidenceCoverage: run.summaryEvidenceCoverage as number,
          pageCount: run.summaryPageCount as number,
          criticalCount: run.summaryCriticalCount as number,
          highCount: run.summaryHighCount as number,
          mediumCount: run.summaryMediumCount as number,
          findings: visibleFindings,
          lockedFindingCount: Math.max(
            0,
            countedFindings - visibleFindings.length,
          ),
        }
      : null,
    canReadFullReport:
      options.access === "owner" && options.canReadFullReport === true,
  };
}

export type SeoAuditRunResponse = ReturnType<typeof buildSeoAuditRunResponse>;
