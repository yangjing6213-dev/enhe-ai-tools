import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createEvidenceFileName,
  getEvidenceDirectory,
  wrapSeoEvidence
} from "@/lib/ebos/evidence";
import {
  buildSeoEvidence,
  renderSeoEvidenceMarkdown
} from "@/lib/ebos/seo";

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
  const evidence = await buildSeoEvidence({
    targetDate,
    siteUrl: readSiteUrl()
  });
  const markdown = renderSeoEvidenceMarkdown(evidence);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "seo");
  const markdownPath = resolve(outputDir, `${evidence.targetDate}-seo-evidence.md`);
  const evidenceOutputDir = resolve(process.cwd(), getEvidenceDirectory("seo_evidence"));
  const evidenceJsonPath = resolve(
    evidenceOutputDir,
    createEvidenceFileName("seo_evidence", evidence.targetDate, "json")
  );
  const envelope = wrapSeoEvidence(evidence, {
    targetDate: evidence.targetDate,
    generatedAt: evidence.generatedAt,
    siteUrl: evidence.siteUrl,
    generator: "scripts/generate-ebos-seo-evidence.ts",
    sourceFiles: [markdownPath]
  });

  await mkdir(outputDir, { recursive: true });
  await mkdir(evidenceOutputDir, { recursive: true });
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(evidenceJsonPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

  console.log("EBOS SEO evidence generated:");
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- Evidence JSON: ${evidenceJsonPath}`);
  console.log(`- pagesAudited: ${evidence.pagesAudited}`);
  console.log(`- overallScore: ${evidence.overallScore}`);
  console.log(`- confidence: ${evidence.confidence}`);
  console.log("- top risks:");
  for (const risk of evidence.risks.slice(0, 5)) console.log(`  - ${risk}`);
  console.log("- top actionItems:");
  for (const item of evidence.actionItems.slice(0, 5)) console.log(`  - [${item.priority}] ${item.title}`);
  console.log("- Next: run npx tsx scripts/index-ebos-evidence.ts to refresh the EBOS evidence catalog.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
