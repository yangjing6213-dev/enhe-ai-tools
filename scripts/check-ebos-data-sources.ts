import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createEvidenceFileName,
  getEvidenceDirectory,
  wrapDataSourceReadinessEvidence
} from "@/lib/ebos/evidence";
import {
  checkEbosIntegrationReadiness,
  renderIntegrationReadinessMarkdown
} from "@/lib/ebos/integrations";
import { formatLocalDate } from "@/lib/ebos/weekly/date-format";

async function main() {
  const report = checkEbosIntegrationReadiness(process.env);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "data-sources");
  const filePrefix = formatLocalDate(report.generatedAt);
  const jsonPath = resolve(outputDir, `${filePrefix}-data-sources.json`);
  const markdownPath = resolve(outputDir, `${filePrefix}-data-sources.md`);
  const evidenceOutputDir = resolve(process.cwd(), getEvidenceDirectory("data_source_readiness"));
  const evidenceJsonPath = resolve(evidenceOutputDir, createEvidenceFileName("data_source_readiness", filePrefix, "json"));
  const evidenceEnvelope = wrapDataSourceReadinessEvidence(report, {
    targetDate: filePrefix,
    generatedAt: report.generatedAt,
    generator: "scripts/check-ebos-data-sources.ts",
    sourceFiles: [jsonPath, markdownPath]
  });

  await mkdir(outputDir, { recursive: true });
  await mkdir(evidenceOutputDir, { recursive: true });
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(markdownPath, renderIntegrationReadinessMarkdown(report), "utf8");
  await writeFile(evidenceJsonPath, JSON.stringify(evidenceEnvelope, null, 2), "utf8");

  const missing = report.checks.filter((check) => check.status === "missing_config");

  console.log("EBOS data source readiness generated:");
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- Evidence JSON: ${evidenceJsonPath}`);
  console.log("- Next: run npx tsx scripts/index-ebos-evidence.ts to refresh the EBOS evidence catalog.");
  console.log(`- Available: ${report.summary.available}`);
  console.log(`- Configured: ${report.summary.configured}`);
  console.log(`- Missing config: ${report.summary.missing_config}`);
  console.log("- Top missing configs:");
  if (missing.length === 0) {
    console.log("  - none");
  } else {
    for (const check of missing.slice(0, 5)) {
      console.log(`  - ${check.label}: ${check.missingEnvKeys.join(", ")}`);
    }
  }
  console.log("- Next setup recommendations:");
  for (const item of report.recommendations.slice(0, 5)) {
    console.log(`  - ${item.title}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
