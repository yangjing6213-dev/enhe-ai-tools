import type { EbosEvidenceWarning } from "../evidence";
import type {
  AuditProductDatabaseOptions,
  EbosProductDatabaseAuditResult,
  EbosProductDatabaseClient,
  EbosProductDatabaseSummary
} from "./product-evidence-types";

const EXPECTED_FIELDS = [
  "status",
  "shortDescription",
  "content",
  "coverImage",
  "screenshots",
  "videoUrl",
  "isDownloadPaid",
  "downloadPrice",
  "downloadFileId",
  "onlineUrl",
  "priceSpecs",
  "faqs",
  "tagLinks"
];

export async function auditProductDatabase(
  options: AuditProductDatabaseOptions = {}
): Promise<EbosProductDatabaseAuditResult> {
  try {
    const client = options.prismaClient ?? await loadDefaultPrismaClient();
    const rows = await client.tool.findMany({
      select: {
        status: true,
        shortDescription: true,
        content: true,
        coverImage: true,
        screenshots: true,
        videoUrl: true,
        isDownloadPaid: true,
        downloadPrice: true,
        downloadFileId: true,
        onlineUrl: true,
        priceSpecs: { select: { id: true } },
        faqs: { select: { id: true, status: true } },
        tagLinks: { select: { id: true } }
      }
    });

    const warnings = buildMissingFieldWarnings(rows);
    return {
      databaseSummary: summarizeRows(rows),
      warnings
    };
  } catch (error) {
    return {
      databaseSummary: emptyDatabaseSummary(),
      warnings: [warning(
        "database_unavailable",
        `Product database query unavailable; continuing with site-only product evidence. ${errorMessage(error)}`,
        "internal_database"
      )]
    };
  }
}

async function loadDefaultPrismaClient(): Promise<EbosProductDatabaseClient> {
  const mod = await import("@/lib/db");
  return mod.prisma as unknown as EbosProductDatabaseClient;
}

function summarizeRows(rows: unknown[]): EbosProductDatabaseSummary {
  const records = rows.map(asRecord).filter((row): row is Record<string, unknown> => row !== null);

  return {
    totalProducts: records.length,
    publishedProducts: records.filter((row) => row.status === "published").length,
    draftProducts: records.filter((row) => row.status === "draft").length,
    productsWithPrice: records.filter(hasPrice).length,
    productsWithDownload: records.filter(hasDownload).length,
    productsWithFaq: records.filter((row) => arrayLength(row.faqs) > 0).length,
    productsWithCover: records.filter((row) => Boolean(row.coverImage) || arrayLength(row.screenshots) > 0).length,
    productsWithTags: records.filter((row) => arrayLength(row.tagLinks) > 0).length,
    productsWithSeoFields: records.filter((row) => hasText(row.shortDescription) && hasText(row.content)).length,
    productsWithGeoFields: records.filter((row) => hasText(row.shortDescription) && (arrayLength(row.faqs) > 0 || hasText(row.content))).length
  };
}

function buildMissingFieldWarnings(rows: unknown[]) {
  const missing = new Set<string>();
  for (const row of rows) {
    const record = asRecord(row);
    if (!record) continue;
    for (const field of EXPECTED_FIELDS) {
      if (!(field in record)) missing.add(field);
    }
  }

  return [...missing].sort().map((field) => warning(
    "database_field_unavailable",
    `Product database field "${field}" was unavailable in at least one row; completeness metrics may be partial.`,
    "internal_database"
  ));
}

function emptyDatabaseSummary(): EbosProductDatabaseSummary {
  return {
    totalProducts: 0,
    publishedProducts: 0,
    draftProducts: 0,
    productsWithPrice: 0,
    productsWithDownload: 0,
    productsWithFaq: 0,
    productsWithCover: 0,
    productsWithTags: 0,
    productsWithSeoFields: 0,
    productsWithGeoFields: 0
  };
}

function hasPrice(row: Record<string, unknown>) {
  return row.isDownloadPaid === true
    || decimalToNumber(row.downloadPrice) > 0
    || arrayLength(row.priceSpecs) > 0;
}

function hasDownload(row: Record<string, unknown>) {
  return hasText(row.downloadFileId) || hasText(row.onlineUrl);
}

function decimalToNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return Number(value.toString()) || 0;
  }
  return 0;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function warning(code: string, message: string, source?: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
