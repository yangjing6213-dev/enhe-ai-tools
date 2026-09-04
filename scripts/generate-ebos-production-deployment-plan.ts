import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildDeploymentCommandPlan,
  buildDeploymentRollbackPlan,
  readDeploymentConfig,
  readLatestProductionDeploymentPreflightReport,
  renderProductionDeploymentPlanMarkdown,
  type EbosProductionDeploymentPlanReport
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
  const preflight = await readLatestProductionDeploymentPreflightReport({ targetDate });
  const config = preflight?.report.configSummary ?? await readDeploymentConfig({ rootDir: process.cwd() });
  const hasDeployConfig = config.dockerfileDetected && config.dockerComposeDetected && config.deployDocsDetected;
  const deploymentPlan = buildDeploymentCommandPlan({
    targetDate,
    siteUrl,
    hasDeployConfig
  });
  const rollbackPlan = buildDeploymentRollbackPlan({ targetDate });
  const report: EbosProductionDeploymentPlanReport = {
    reportType: "production_deployment_plan",
    targetDate,
    generatedAt: new Date().toISOString(),
    siteUrl,
    preflightStatus: preflight?.report.readinessStatus,
    deploymentPlan,
    rollbackPlan,
    userConfirmations: [
      "Confirm production deployment is approved before any SSH or server command.",
      "Confirm server project path and deployment method.",
      "Confirm post-deploy smoke checks can run against the public site.",
      "Confirm no secret values should be printed in reports or terminal output."
    ],
    warnings: [
      ...(preflight?.report.warnings ?? []),
      ...deploymentPlan.warnings,
      ...rollbackPlan.warnings
    ]
  };
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment");
  const jsonPath = resolve(outputDir, `${targetDate}-production-deployment-plan.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-production-deployment-plan.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderProductionDeploymentPlanMarkdown(report)}\n`, "utf8");

  console.log("EBOS production deployment plan generated:");
  console.log(`- preflightStatus: ${report.preflightStatus ?? "unknown"}`);
  console.log(`- local commands count: ${report.deploymentPlan.localCommands.length}`);
  console.log(`- server commands manual_required: ${report.deploymentPlan.serverCommands.some((item) => item.status === "manual_required") ? "yes" : "no"}`);
  console.log(`- docker commands count: ${report.deploymentPlan.dockerCommands.length}`);
  console.log(`- verification commands count: ${report.deploymentPlan.verificationCommands.length}`);
  console.log(`- rollback files count: ${report.rollbackPlan.filesToRevert.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
