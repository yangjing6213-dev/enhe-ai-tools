import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  renderOptimizedPageRedeployCheckMarkdown,
  runOptimizedPageRedeployCheck
} from "@/lib/ebos/post-launch";

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
  if (!value) return formatDateKey(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value;
}

async function main() {
  const targetDate = parseTargetDate();
  const siteUrl = readArg("--site-url") ?? "https://www.enhe-tech.com.cn";
  const report = await runOptimizedPageRedeployCheck({
    targetDate,
    siteUrl
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "post-launch");
  const jsonPath = resolve(outputDir, `${targetDate}-optimized-page-redeploy-check.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-optimized-page-redeploy-check.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderOptimizedPageRedeployCheckMarkdown(report)}\n`, "utf8");

  console.log("EBOS optimized page redeploy check generated:");
  console.log(`- overallStatus: ${report.overallStatus}`);
  console.log(`- blockers count: ${report.blockers.length}`);
  console.log(`- warnings count: ${report.warnings.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
