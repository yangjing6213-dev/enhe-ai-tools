import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createEvidenceFileName,
  getEvidenceDirectory,
  wrapCompetitorEvidence
} from "@/lib/ebos/evidence";
import {
  buildCompetitorEvidence,
  renderCompetitorEvidenceMarkdown
} from "@/lib/ebos/competitor";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function readNumberArg(name: string, fallback: number) {
  const value = readArg(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${name} ${value}. Expected a non-negative number.`);
  }
  return parsed;
}

function parseTargetDate() {
  const value = readArg("--date");
  if (!value) return new Date();
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return date;
}

async function main() {
  const targetDate = parseTargetDate();
  const includeNetworkSources = hasFlag("--include-network") || hasFlag("--include-network-sources");
  const maxCompetitors = readNumberArg("--max-competitors", 5);
  const maxPagesPerCompetitor = readNumberArg("--max-pages-per-competitor", 3);
  const maxTotalUrls = readNumberArg("--max-total-urls", 20);
  const requestTimeoutMs = readNumberArg("--timeout-ms", 8000);
  const evidence = await buildCompetitorEvidence({
    targetDate,
    includeNetworkSources,
    maxCompetitors,
    maxPagesPerCompetitor,
    maxTotalUrls,
    requestTimeoutMs
  });
  const markdown = renderCompetitorEvidenceMarkdown(evidence);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "competitor");
  const markdownPath = resolve(outputDir, `${evidence.targetDate}-competitor-evidence.md`);
  const evidenceOutputDir = resolve(process.cwd(), getEvidenceDirectory("competitor_evidence"));
  const evidenceJsonPath = resolve(
    evidenceOutputDir,
    createEvidenceFileName("competitor_evidence", evidence.targetDate, "json")
  );
  const envelope = wrapCompetitorEvidence(evidence, {
    targetDate: evidence.targetDate,
    generatedAt: evidence.generatedAt,
    periodStart: evidence.periodStart,
    periodEnd: evidence.periodEnd,
    generator: "scripts/generate-ebos-competitor-evidence.ts",
    sourceFiles: [markdownPath],
    schemaNotes: evidence.warnings.map((warning) => warning.message)
  });

  await mkdir(outputDir, { recursive: true });
  await mkdir(evidenceOutputDir, { recursive: true });
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(evidenceJsonPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

  console.log("EBOS competitor evidence generated:");
  console.log(`- periodStart: ${evidence.periodStart}`);
  console.log(`- periodEnd: ${evidence.periodEnd}`);
  console.log(`- includeNetworkSources: ${includeNetworkSources ? "yes" : "no"}`);
  console.log(`- competitors count: ${evidence.competitorSummary.competitorsCount}`);
  console.log(`- competitors audited count: ${evidence.competitorSummary.competitorsAuditedCount}`);
  console.log(`- pages attempted: ${evidence.dataSourceSummary.pagesAttempted}`);
  console.log(`- pages succeeded: ${evidence.dataSourceSummary.pagesSucceeded}`);
  console.log(`- pages failed: ${evidence.dataSourceSummary.pagesFailed}`);
  console.log(`- opportunities count: ${evidence.differentiationOpportunities.length}`);
  console.log(`- overallScore: ${evidence.overallScore}`);
  console.log(`- confidence: ${evidence.confidence}`);
  console.log("- top differentiation opportunities:");
  for (const item of evidence.differentiationOpportunities.slice(0, 5)) {
    console.log(`  - ${item.title}: priority=${item.priorityScore}, action=${item.recommendedAction}`);
  }
  console.log("- top actionItems:");
  for (const item of evidence.actionItems.slice(0, 5)) {
    console.log(`  - [${item.priority}] ${item.title}`);
  }
  console.log(`- Evidence JSON: ${evidenceJsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  if (includeNetworkSources) {
    console.log("- Boundary: this run only observed low-frequency public page structure; it does not represent competitor traffic, sales, or revenue.");
  }
  console.log("- Next: run npx tsx scripts/index-ebos-evidence.ts to refresh the EBOS evidence catalog.");
  if (!includeNetworkSources) {
    console.log("- Note: public competitor URL reads were disabled. Re-run with --include-network to audit public pages.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
