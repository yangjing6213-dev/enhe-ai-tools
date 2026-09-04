import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createEvidenceFileName,
  getEvidenceDirectory,
  wrapMarketEvidence
} from "@/lib/ebos/evidence";
import {
  buildMarketEvidence,
  renderMarketEvidenceMarkdown
} from "@/lib/ebos/market";

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
  const evidence = await buildMarketEvidence({
    targetDate,
    includeNetworkSources: hasFlag("--include-network-sources")
  });
  const markdown = renderMarketEvidenceMarkdown(evidence);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "market");
  const markdownPath = resolve(outputDir, `${evidence.targetDate}-market-evidence.md`);
  const evidenceOutputDir = resolve(process.cwd(), getEvidenceDirectory("market_evidence"));
  const evidenceJsonPath = resolve(
    evidenceOutputDir,
    createEvidenceFileName("market_evidence", evidence.targetDate, "json")
  );
  const envelope = wrapMarketEvidence(evidence, {
    targetDate: evidence.targetDate,
    generatedAt: evidence.generatedAt,
    periodStart: evidence.periodStart,
    periodEnd: evidence.periodEnd,
    generator: "scripts/generate-ebos-market-evidence.ts",
    sourceFiles: [markdownPath],
    schemaNotes: evidence.warnings.map((warning) => warning.message)
  });

  await mkdir(outputDir, { recursive: true });
  await mkdir(evidenceOutputDir, { recursive: true });
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(evidenceJsonPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

  console.log("EBOS market evidence generated:");
  console.log(`- periodStart: ${evidence.periodStart}`);
  console.log(`- periodEnd: ${evidence.periodEnd}`);
  console.log(`- signals count: ${evidence.signals.length}`);
  console.log(`- recommendedProductDirections count: ${evidence.recommendedProductDirections.length}`);
  console.log(`- overallScore: ${evidence.overallScore}`);
  console.log(`- confidence: ${evidence.confidence}`);
  console.log("- top recommended product directions:");
  for (const item of evidence.recommendedProductDirections.slice(0, 5)) {
    console.log(`  - ${item.productDirection}: priority=${item.priorityScore}, action=${item.recommendedAction}`);
  }
  console.log("- top opportunities:");
  for (const opportunity of evidence.opportunities.slice(0, 5)) console.log(`  - ${opportunity}`);
  console.log("- top actionItems:");
  for (const item of evidence.actionItems.slice(0, 5)) console.log(`  - [${item.priority}] ${item.title}`);
  console.log(`- Evidence JSON: ${evidenceJsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log("- Next: run npx tsx scripts/index-ebos-evidence.ts to refresh the EBOS evidence catalog.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
