import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildProductionDeploymentPreflightReport,
  renderProductionDeploymentPreflightMarkdown
} from "@/lib/ebos/deployment";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function parseTargetDateKey() {
  const value = readArg("--date");
  if (!value) return toDateKey(new Date());
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value.slice(0, 10);
}

async function main() {
  const targetDate = parseTargetDateKey();
  const siteUrl = readArg("--site-url") ?? "https://www.enhe-tech.com.cn";
  const report = await buildProductionDeploymentPreflightReport({
    targetDate,
    siteUrl,
    rootDir: process.cwd()
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment");
  const jsonPath = resolve(outputDir, `${targetDate}-production-deployment-preflight.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-production-deployment-preflight.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderProductionDeploymentPreflightMarkdown(report)}\n`, "utf8");

  console.log("EBOS production deployment preflight generated:");
  console.log(`- readinessScore: ${report.readinessScore}`);
  console.log(`- readinessStatus: ${report.readinessStatus}`);
  console.log(`- blockers count: ${report.blockers.length}`);
  console.log(`- warnings count: ${report.warnings.length}`);
  console.log(`- validation routes status: ${summarizeStatus(report.routeChecks.map((item) => item.status))}`);
  console.log(`- docker config status: Dockerfile=${report.configSummary.dockerfileDetected}, Compose=${report.configSummary.dockerComposeDetected}`);
  console.log(`- nginx config status: Nginx=${report.configSummary.nginxConfigDetected}, DeployDocs=${report.configSummary.deployDocsDetected}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

function summarizeStatus(statuses: string[]) {
  return statuses.every((status) => status === "pass") ? "pass" : statuses.join(",");
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
