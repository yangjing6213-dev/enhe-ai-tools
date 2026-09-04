import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createEvidenceFileName,
  getEvidenceDirectory,
  wrapRevenueEvidence
} from "@/lib/ebos/evidence";
import {
  buildRevenueEvidence,
  renderRevenueEvidenceMarkdown
} from "@/lib/ebos/revenue";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
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

function readSiteUrl() {
  return readArg("--site-url") ?? process.env.EBOS_SITE_URL ?? "https://www.enhe-tech.com.cn";
}

async function main() {
  const targetDate = parseTargetDate();
  const siteUrl = readSiteUrl();
  const evidence = await buildRevenueEvidence({ targetDate });
  const markdown = renderRevenueEvidenceMarkdown(evidence);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "revenue");
  const markdownPath = resolve(outputDir, `${evidence.targetDate}-revenue-evidence.md`);
  const evidenceOutputDir = resolve(process.cwd(), getEvidenceDirectory("revenue_evidence"));
  const evidenceJsonPath = resolve(
    evidenceOutputDir,
    createEvidenceFileName("revenue_evidence", evidence.targetDate, "json")
  );
  const envelope = wrapRevenueEvidence(evidence, {
    targetDate: evidence.targetDate,
    generatedAt: evidence.generatedAt,
    periodStart: evidence.periodStart,
    periodEnd: evidence.periodEnd,
    siteUrl,
    generator: "scripts/generate-ebos-revenue-evidence.ts",
    sourceFiles: [markdownPath],
    schemaNotes: evidence.databaseSummary.warnings
  });

  await mkdir(outputDir, { recursive: true });
  await mkdir(evidenceOutputDir, { recursive: true });
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(evidenceJsonPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

  console.log("EBOS revenue evidence generated:");
  console.log(`- periodStart: ${evidence.periodStart}`);
  console.log(`- periodEnd: ${evidence.periodEnd}`);
  console.log(`- grossRevenue: ${evidence.revenueSummary.grossRevenue}`);
  console.log(`- netRevenue: ${evidence.revenueSummary.netRevenue}`);
  console.log(`- refundedAmount: ${evidence.revenueSummary.refundedAmount}`);
  console.log(`- paidOrders: ${evidence.orderSummary.paidOrders}`);
  console.log(`- totalOrders: ${evidence.orderSummary.totalOrders}`);
  console.log(`- refundRate: ${evidence.refundSummary.refundRate}`);
  console.log(`- firstRevenueAchieved: ${evidence.revenueSummary.firstRevenueAchieved}`);
  console.log(`- overallScore: ${evidence.overallScore}`);
  console.log(`- confidence: ${evidence.confidence}`);
  console.log("- product attribution summary:");
  for (const metric of evidence.productRevenueSummary.productMetrics.slice(0, 5)) {
    console.log(`  - ${metric.productName ?? metric.productSlug ?? metric.productId ?? "unknown"}: net=${metric.netRevenue}, paidOrders=${metric.paidOrdersCount}, readiness=${metric.revenueReadinessScore}`);
  }
  console.log("- recommended revenue validation products:");
  for (const metric of evidence.productRevenueSummary.recommendedValidationProducts.slice(0, 2)) {
    console.log(`  - ${metric.productName ?? metric.productSlug ?? metric.productId ?? "unknown"}: readiness=${metric.revenueReadinessScore}`);
  }
  console.log("- top risks:");
  for (const risk of evidence.risks.slice(0, 5)) console.log(`  - ${risk}`);
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
