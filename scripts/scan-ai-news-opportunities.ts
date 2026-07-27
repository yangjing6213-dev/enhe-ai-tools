import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  scanAiNewsOpportunities,
  type AiNewsOpportunityCandidate,
  type AiNewsOpportunityRecord
} from "../src/lib/ai-news-discovery";

type ScanInput = {
  existing?: AiNewsOpportunityRecord[];
  candidates: AiNewsOpportunityCandidate[];
};

const httpsUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2_000)
  .refine((value) => /^https:\/\//i.test(value), "URL must use https");

const sourceEvidenceSchema = z
  .object({
    url: httpsUrlSchema,
    authority: z.enum(["first-party", "government", "standards-body", "primary-research"]),
    supports: z.string().trim().min(1).max(2_000)
  })
  .strict();

const queryEvidenceSchema = z
  .object({
    source: z.enum(["google-search-console", "bing-webmaster", "baidu-resource-platform"]),
    query: z.string().trim().min(1).max(500),
    observedAt: z.string().trim().datetime({ offset: true }),
    impressions: z.number().int().positive(),
    clicks: z.number().int().nonnegative().optional(),
    targetPath: z
      .string()
      .trim()
      .min(1)
      .max(2_000)
      .regex(/^\/(?!\/)/, "targetPath must be a site-relative absolute path")
      .optional()
  })
  .strict();

const opportunityRecordSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    contentKind: z.enum(["news", "evergreen"]),
    eventKey: z.string().trim().min(1).max(500),
    eventName: z.string().trim().min(1).max(500),
    eventDate: z.string().trim().min(1).max(80),
    eventSourceUrl: httpsUrlSchema,
    topic: z.string().trim().min(1).max(500),
    userTask: z.string().trim().min(1).max(2_000),
    sourceUrls: z.array(httpsUrlSchema).max(20)
  })
  .strict();

const opportunityCandidateSchema = opportunityRecordSchema
  .extend({
    userImpact: z.string().trim().min(1).max(2_000),
    sourceEvidence: z.array(sourceEvidenceSchema).max(20),
    queryEvidence: z.array(queryEvidenceSchema).max(20),
    demandScore: z.number().finite(),
    bilingual: z.boolean()
  })
  .strict();

const scanInputSchema = z
  .object({
    existing: z.array(opportunityRecordSchema).max(20_000).optional(),
    candidates: z.array(opportunityCandidateSchema).max(20_000)
  })
  .strict();

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}.`);
  return value;
}

function parseInput(value: unknown): ScanInput {
  return scanInputSchema.parse(value);
}

async function main() {
  const inputArg = readArg("--input");
  if (!inputArg) throw new Error("Usage: node --import tsx scripts/scan-ai-news-opportunities.ts --input <file.json>");

  const input = parseInput(JSON.parse(await readFile(resolve(process.cwd(), inputArg), "utf8")));
  const result = scanAiNewsOpportunities(input);
  const statusCounts = {
    evidence_missing: result.decisions.filter((decision) => decision.status === "evidence_missing").length,
    rejected: result.decisions.filter((decision) => decision.status === "rejected").length,
    accepted: result.decisions.filter((decision) => decision.status === "accepted").length
  };
  process.stdout.write(`${JSON.stringify({
    scope: {
      operation: "content-admission-scan",
      mode: "offline-read-only",
      externalConnections: [],
      writes: []
    },
    evidenceBoundary: {
      validation: "structure-and-allowlist-only",
      verifiesLiveBackendConnection: false
    },
    acceptedCount: result.accepted.length,
    rejectedCount: result.decisions.length - result.accepted.length,
    statusCounts,
    ...result
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
