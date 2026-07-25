import { createHash } from "node:crypto";
import { gunzip } from "node:zlib";

export const SEO_AUDIT_REPORT_LIMITS = {
  maxBase64Chars: 8 * 1024 * 1024,
  maxCompressedBytes: 6 * 1024 * 1024,
  maxUncompressedBytes: 32 * 1024 * 1024,
} as const;

type ReportLimits = Partial<typeof SEO_AUDIT_REPORT_LIMITS>;

type PublicFinding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  issue: string;
};

export type SeoAuditDerivedSummary = {
  score: number;
  evidenceCoverage: number;
  pageCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  findings: PublicFinding[];
};

export type ParsedSeoAuditReport = {
  fullReport: Record<string, unknown>;
  markdown: string;
  reportSha256: string;
  engineVersion: string;
  summary: SeoAuditDerivedSummary;
};

export type StoredSeoAuditArtifacts = {
  reportJsonKey: string;
  reportMarkdownKey: string;
  reportSha256: string;
  engineVersion: string;
  summary: SeoAuditDerivedSummary;
};

export type SeoAuditArtifactErrorCode =
  | "INVALID_REPORT_BUNDLE"
  | "REPORT_TOO_LARGE"
  | "ARTIFACT_STORAGE_UNAVAILABLE"
  | "ARTIFACT_UPLOAD_FAILED";

export class SeoAuditArtifactError extends Error {
  readonly code: SeoAuditArtifactErrorCode;

  constructor(code: SeoAuditArtifactErrorCode) {
    super(code);
    this.name = "SeoAuditArtifactError";
    this.code = code;
  }
}

type CosPutObjectInput = {
  ACL: "private";
  Bucket: string;
  Region: string;
  Key: string;
  Body: Buffer;
  ContentLength: number;
  ContentType: string;
};

type CosClient = {
  putObject: (
    input: CosPutObjectInput,
    callback: (error: unknown, data: { Location?: string }) => void,
  ) => void;
};

type ArtifactStorageOptions = {
  env?: Record<string, string | undefined>;
  createClient?: () => CosClient | Promise<CosClient>;
};

const severityOrder = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
} as const;

const severityPenalty = {
  critical: 25,
  high: 15,
  medium: 7,
  low: 3,
  info: 0,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPositiveLimit(value: number | undefined, fallback: number) {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : fallback;
}

function decodeBase64(value: string, maxBase64Chars: number) {
  if (
    value.length > maxBase64Chars ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  ) {
    throw new SeoAuditArtifactError(
      value.length > maxBase64Chars
        ? "REPORT_TOO_LARGE"
        : "INVALID_REPORT_BUNDLE",
    );
  }

  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  return decoded;
}

function gunzipBounded(input: Buffer, maxOutputLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    gunzip(input, { maxOutputLength }, (error, output) => {
      if (error) reject(error);
      else resolve(output);
    });
  });
}

function readSeverity(value: unknown): keyof typeof severityOrder {
  if (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "info"
  ) {
    return value;
  }
  throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
}

function readFullReportFinding(value: unknown) {
  if (!isRecord(value)) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const issue = typeof value.issue === "string" ? value.issue.trim() : "";
  const status = typeof value.status === "string" ? value.status : "";
  if (!id || id.length > 128 || !issue || issue.length > 20_000 || !status) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }

  return {
    id,
    issue,
    status,
    severity: readSeverity(value.severity),
  };
}

function deriveSummary(fullReport: Record<string, unknown>) {
  if (
    !Array.isArray(fullReport.pages) ||
    !Array.isArray(fullReport.findings) ||
    !Array.isArray(fullReport.strengths) ||
    !isRecord(fullReport.meta)
  ) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  const engineVersion =
    typeof fullReport.meta.engine_version === "string"
      ? fullReport.meta.engine_version.trim()
      : "";
  if (!engineVersion || engineVersion.length > 64) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }

  const findings = fullReport.findings.map(readFullReportFinding);
  const verifiedFindings = findings.filter(
    (finding) => finding.status === "verified",
  );
  const score = Math.max(
    0,
    100 -
      verifiedFindings.reduce(
        (total, finding) => total + severityPenalty[finding.severity],
        0,
      ),
  );
  const evidenceItems = fullReport.strengths.length + verifiedFindings.length;
  const evidenceTotal = fullReport.strengths.length + findings.length;
  const evidenceCoverage = evidenceTotal
    ? Math.round((evidenceItems * 100) / evidenceTotal)
    : 0;
  const countSeverity = (severity: PublicFinding["severity"]) =>
    findings.filter((finding) => finding.severity === severity).length;
  const publicFindings = findings
    .map((finding, index) => ({ ...finding, index }))
    .sort(
      (left, right) =>
        severityOrder[left.severity] - severityOrder[right.severity] ||
        left.index - right.index,
    )
    .slice(0, 3)
    .map(({ id, issue, severity }) => ({
      id,
      severity,
      issue: issue.replace(/\s+/g, " ").slice(0, 240),
    }));

  return {
    engineVersion,
    summary: {
      score,
      evidenceCoverage,
      pageCount: fullReport.pages.length,
      criticalCount: countSeverity("critical"),
      highCount: countSeverity("high"),
      mediumCount: countSeverity("medium"),
      findings: publicFindings,
    } satisfies SeoAuditDerivedSummary,
  };
}

export async function parseSeoAuditReportBundle(
  reportGzipBase64: string,
  limits: ReportLimits = {},
): Promise<ParsedSeoAuditReport> {
  if (typeof reportGzipBase64 !== "string") {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  const maxBase64Chars = readPositiveLimit(
    limits.maxBase64Chars,
    SEO_AUDIT_REPORT_LIMITS.maxBase64Chars,
  );
  const maxCompressedBytes = readPositiveLimit(
    limits.maxCompressedBytes,
    SEO_AUDIT_REPORT_LIMITS.maxCompressedBytes,
  );
  const maxUncompressedBytes = readPositiveLimit(
    limits.maxUncompressedBytes,
    SEO_AUDIT_REPORT_LIMITS.maxUncompressedBytes,
  );
  const compressed = decodeBase64(reportGzipBase64, maxBase64Chars);
  if (compressed.length > maxCompressedBytes) {
    throw new SeoAuditArtifactError("REPORT_TOO_LARGE");
  }
  if (compressed[0] !== 0x1f || compressed[1] !== 0x8b) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }

  let decompressed: Buffer;
  try {
    decompressed = await gunzipBounded(compressed, maxUncompressedBytes);
  } catch (error) {
    const code = isRecord(error) && typeof error.code === "string" ? error.code : "";
    throw new SeoAuditArtifactError(
      code === "ERR_BUFFER_TOO_LARGE"
        ? "REPORT_TOO_LARGE"
        : "INVALID_REPORT_BUNDLE",
    );
  }
  if (decompressed.length > maxUncompressedBytes) {
    throw new SeoAuditArtifactError("REPORT_TOO_LARGE");
  }

  let bundle: unknown;
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(decompressed);
    bundle = JSON.parse(json) as unknown;
  } catch {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  if (!isRecord(bundle)) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  const bundleKeys = Object.keys(bundle).sort();
  if (
    bundleKeys.length !== 2 ||
    bundleKeys[0] !== "json" ||
    bundleKeys[1] !== "markdown" ||
    !isRecord(bundle.json) ||
    typeof bundle.markdown !== "string"
  ) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }

  const derived = deriveSummary(bundle.json);
  return {
    fullReport: bundle.json,
    markdown: bundle.markdown,
    reportSha256: createHash("sha256").update(decompressed).digest("hex"),
    engineVersion: derived.engineVersion,
    summary: derived.summary,
  };
}

export function buildPrivateArtifactKeys(runId: string, reportSha256: string) {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(runId) ||
    !/^[a-f0-9]{64}$/.test(reportSha256)
  ) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  const prefix = `seo-audit/runs/${runId}/${reportSha256}`;
  return {
    jsonKey: `${prefix}/report.json`,
    markdownKey: `${prefix}/report.md`,
  };
}

async function createDefaultCosClient(
  secretId: string,
  secretKey: string,
): Promise<CosClient> {
  const COSModule = await import("cos-nodejs-sdk-v5");
  const COS = COSModule.default ?? COSModule;
  return new COS({ SecretId: secretId, SecretKey: secretKey });
}

function putPrivateObject(client: CosClient, input: CosPutObjectInput) {
  return new Promise<void>((resolve, reject) => {
    client.putObject(input, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function storePrivateSeoAuditArtifacts(
  input: { runId: string; parsed: ParsedSeoAuditReport },
  options: ArtifactStorageOptions = {},
): Promise<StoredSeoAuditArtifacts> {
  const env = options.env ?? process.env;
  const secretId = env.TENCENT_COS_SECRET_ID?.trim();
  const secretKey = env.TENCENT_COS_SECRET_KEY?.trim();
  const bucket = env.TENCENT_COS_BUCKET?.trim();
  const region = env.TENCENT_COS_REGION?.trim();
  if (!secretId || !secretKey || !bucket || !region) {
    throw new SeoAuditArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");
  }

  const keys = buildPrivateArtifactKeys(
    input.runId,
    input.parsed.reportSha256,
  );
  const jsonBody = Buffer.from(
    JSON.stringify(input.parsed.fullReport),
    "utf8",
  );
  const markdownBody = Buffer.from(input.parsed.markdown, "utf8");

  try {
    const client = options.createClient
      ? await options.createClient()
      : await createDefaultCosClient(secretId, secretKey);
    await putPrivateObject(client, {
      ACL: "private",
      Bucket: bucket,
      Region: region,
      Key: keys.jsonKey,
      Body: jsonBody,
      ContentLength: jsonBody.length,
      ContentType: "application/json; charset=utf-8",
    });
    await putPrivateObject(client, {
      ACL: "private",
      Bucket: bucket,
      Region: region,
      Key: keys.markdownKey,
      Body: markdownBody,
      ContentLength: markdownBody.length,
      ContentType: "text/markdown; charset=utf-8",
    });
  } catch {
    throw new SeoAuditArtifactError("ARTIFACT_UPLOAD_FAILED");
  }

  return {
    reportJsonKey: keys.jsonKey,
    reportMarkdownKey: keys.markdownKey,
    reportSha256: input.parsed.reportSha256,
    engineVersion: input.parsed.engineVersion,
    summary: input.parsed.summary,
  };
}
