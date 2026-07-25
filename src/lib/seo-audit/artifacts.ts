import { createHash } from "node:crypto";
import { gunzip } from "node:zlib";
import { z } from "zod";

export const SEO_AUDIT_REPORT_LIMITS = {
  maxBase64Chars: 8 * 1024 * 1024,
  maxCompressedBytes: 6 * 1024 * 1024,
  maxUncompressedBytes: 32 * 1024 * 1024,
} as const;

type ReportLimits = Partial<typeof SEO_AUDIT_REPORT_LIMITS>;

const severitySchema = z.enum(["critical", "high", "medium", "low", "info"]);
const findingStatusSchema = z.enum([
  "verified",
  "render_required",
  "external_data_required",
]);
const httpUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
const nonNegativeIntegerSchema = z.number().int().min(0);
const boundedText = (max: number) =>
  z.string().max(max).refine((value) => value.trim().length > 0);

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const redirectSchema = z
  .object({
    status: z.number().int().min(300).max(399),
    from: httpUrlSchema,
    to: httpUrlSchema,
  })
  .strict();

const fetchedPageShape = {
  url: httpUrlSchema,
  final_url: httpUrlSchema.nullable(),
  status: z.number().int().min(100).max(599).nullable(),
  content_type: z.string().max(512).nullable(),
  elapsed_ms: nonNegativeIntegerSchema.nullable(),
  redirects: z.array(redirectSchema).max(20),
  error: z.string().max(20_000).nullable(),
  truncated: z.boolean(),
  in_sitemap: z.boolean(),
};

const nonHtmlPageSchema = z
  .object({ ...fetchedPageShape, is_html: z.literal(false) })
  .strict();
const htmlPageSchema = z
  .object({
    ...fetchedPageShape,
    final_url: httpUrlSchema,
    status: z.literal(200),
    content_type: z.enum(["text/html", "application/xhtml+xml"]),
    error: z.null(),
    is_html: z.literal(true),
    title: z.string().max(20_000),
    title_length: nonNegativeIntegerSchema,
    meta_description: z.string().max(20_000),
    meta_description_length: nonNegativeIntegerSchema,
    canonical: z.union([z.literal(""), httpUrlSchema]),
    html_lang: z.string().max(64),
    robots_directive: z.string().max(2048),
    noindex: z.boolean(),
    h1_count: nonNegativeIntegerSchema,
    h1: z.array(z.string().max(20_000)).max(1000),
    h2_count: nonNegativeIntegerSchema,
    images_missing_alt_attribute: nonNegativeIntegerSchema,
    internal_link_count: nonNegativeIntegerSchema,
    external_link_count: nonNegativeIntegerSchema,
    hreflang: z
      .array(
        z
          .object({ lang: boundedText(64), url: httpUrlSchema })
          .strict(),
      )
      .max(1000),
    json_ld_static_count: nonNegativeIntegerSchema,
    json_ld_static_valid_count: nonNegativeIntegerSchema,
    json_ld_static_errors: z.array(z.string().max(20_000)).max(1000),
    word_count: nonNegativeIntegerSchema,
    author_signal: z.boolean(),
    parse_error: z.string().max(20_000).nullable(),
  })
  .strict();
const robotsBlockedPageSchema = z
  .object({
    url: httpUrlSchema,
    status: z.null(),
    error: boundedText(20_000),
    blocked_by_robots: z.literal(true),
    is_html: z.literal(false),
  })
  .strict();
const pageSchema = z.union([
  robotsBlockedPageSchema,
  htmlPageSchema,
  nonHtmlPageSchema,
]);

const strengthSchema = z
  .object({
    id: z.string().regex(/^S\d{3,}$/),
    code: z.string().regex(/^[a-z0-9_]+$/).max(128),
    category: z.string().regex(/^[a-z0-9_]+$/).max(128),
    status: z.literal("verified"),
    title: boundedText(20_000),
    evidence: jsonValueSchema,
    value: boundedText(20_000),
  })
  .strict();
const findingSchema = z
  .object({
    id: z.string().regex(/^F\d{3,}$/),
    code: z.string().regex(/^[a-z0-9_]+$/).max(128),
    category: z.string().regex(/^[a-z0-9_]+$/).max(128),
    severity: severitySchema,
    status: findingStatusSchema,
    issue: boundedText(20_000),
    evidence: jsonValueSchema,
    action: boundedText(20_000),
    verification: boundedText(20_000),
  })
  .strict();
const fullReportSchema = z
  .object({
    meta: z
      .object({ engine_version: z.literal("1.4.8") })
      .passthrough(),
    pages: z.array(pageSchema).max(5000),
    strengths: z.array(strengthSchema).max(5000),
    findings: z.array(findingSchema).max(10_000),
  })
  .passthrough();

const publicFindingSchema = z
  .object({
    id: z.string().min(1).max(128),
    severity: severitySchema,
    issue: z.string().min(1).max(240),
  })
  .strict();

export const seoAuditCompletionSummarySchema = z
  .object({
    score: z.number().int().min(0).max(100),
    evidenceCoverage: z.number().int().min(0).max(100),
    pageCount: z.number().int().min(0).max(5000),
    criticalCount: z.number().int().min(0).max(10_000),
    highCount: z.number().int().min(0).max(10_000),
    mediumCount: z.number().int().min(0).max(10_000),
    findings: z.array(publicFindingSchema).max(3),
  })
  .strict();

type PublicFinding = z.infer<typeof publicFindingSchema>;

export type SeoAuditDerivedSummary = {
  score: number;
  evidenceCoverage: number;
  pageCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  findings: PublicFinding[];
};

export type SeoAuditCompletionSummary = z.infer<
  typeof seoAuditCompletionSummarySchema
>;

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

function deriveSummary(fullReport: z.infer<typeof fullReportSchema>) {
  const findings = fullReport.findings;
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
    verifiedFindings.filter((finding) => finding.severity === severity).length;
  const publicFindings = verifiedFindings
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
    engineVersion: fullReport.meta.engine_version,
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

export function assertSeoAuditSummaryMatches(
  candidate: unknown,
  derived: SeoAuditDerivedSummary,
) {
  const candidateResult = seoAuditCompletionSummarySchema.safeParse(candidate);
  const derivedResult = seoAuditCompletionSummarySchema.safeParse(derived);
  if (
    !candidateResult.success ||
    !derivedResult.success ||
    JSON.stringify(candidateResult.data) !== JSON.stringify(derivedResult.data)
  ) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  return candidateResult.data;
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

  const reportResult = fullReportSchema.safeParse(bundle.json);
  if (!reportResult.success) {
    throw new SeoAuditArtifactError("INVALID_REPORT_BUNDLE");
  }
  const derived = deriveSummary(reportResult.data);
  return {
    fullReport: reportResult.data,
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
