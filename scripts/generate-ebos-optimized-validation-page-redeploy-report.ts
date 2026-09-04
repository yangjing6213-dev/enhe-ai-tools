import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EbosDeploymentExecutionStatus } from "@/lib/ebos/deployment-execution";
import type { EbosExternalPublishingStatusSummary } from "@/lib/ebos/external-publishing";
import {
  renderOptimizedValidationPageRedeployMarkdown,
  type EbosOptimizedPageRedeployCheckReport,
  type EbosOptimizedValidationPageRedeployReport,
  type EbosPostLaunchLiveCheckReport
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

function hasFlag(name: string) {
  return process.argv.includes(name);
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
  const report = await buildReport(targetDate);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "post-launch");
  const jsonPath = resolve(outputDir, `${targetDate}-optimized-validation-page-redeploy.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-optimized-validation-page-redeploy.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderOptimizedValidationPageRedeployMarkdown(report)}\n`, "utf8");

  console.log("EBOS optimized validation page redeploy report generated:");
  console.log(`- gitCommitHash: ${report.gitCommitHash ?? "none"}`);
  console.log(`- gitPushResult: ${report.gitPushResult}`);
  console.log(`- gitPullResult: ${report.gitPullResult}`);
  console.log(`- dockerBuildResult: ${report.dockerBuildResult}`);
  console.log(`- dockerUpResult: ${report.dockerUpResult}`);
  console.log(`- nginxReloadResult: ${report.nginxReloadResult}`);
  console.log(`- deploymentStatus: ${report.deploymentStatus}`);
  console.log(`- postLaunchCheckStatus: ${report.postLaunchCheckStatus}`);
  console.log(`- optimizedContentCheckStatus: ${report.optimizedContentCheckStatus}`);
  console.log(`- externalPublishingStatus: ${report.externalPublishingStatus}`);
  console.log(`- hasRealSignals: ${report.hasRealSignals}`);
  console.log(`- canBackfill: ${report.canBackfill}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

async function buildReport(targetDate: string): Promise<EbosOptimizedValidationPageRedeployReport> {
  const gitCommitHash = readArg("--git-commit") ?? null;
  const serverPath = readArg("--server-path") ?? "/opt/enhe-ai-tools";
  const postLaunchDir = resolve(process.cwd(), "reports", "ebos", "deployment", "post-launch");
  const optimizedCheckPath = resolve(postLaunchDir, `${targetDate}-optimized-page-redeploy-check.json`);
  const postLaunchLiveCheckPath = resolve(postLaunchDir, `${targetDate}-post-launch-live-check.json`);
  const statusPath = resolve(process.cwd(), "reports", "ebos", "deployment", "execution", "status", `${targetDate}-deployment-execution-status.json`);
  const externalStatusPath = resolve(process.cwd(), "reports", "ebos", "external-publishing", "status", `${targetDate}-external-publishing-status-summary.json`);
  const optimizedCheck = await readJson<EbosOptimizedPageRedeployCheckReport>(optimizedCheckPath);
  const postLaunchCheck = await readJson<EbosPostLaunchLiveCheckReport>(postLaunchLiveCheckPath);
  const deploymentStatus = await readJson<EbosDeploymentExecutionStatus>(statusPath);
  const externalStatus = await readJsonIfExists<EbosExternalPublishingStatusSummary>(externalStatusPath);

  const gitPushResult = parseResultArg("--git-push-result");
  const gitPullResult = parseResultArg("--git-pull-result");
  const dockerBuildResult = parseResultArg("--docker-build-result");
  const dockerUpResult = parseResultArg("--docker-up-result");
  const nginxReloadResult = parseNginxResultArg();

  const warnings = [
    ...optimizedCheck.warnings,
    ...postLaunchCheck.warnings,
    ...(optimizedCheck.overallStatus === "passed" ? [] : ["Optimized production content check is not passed."]),
    ...(postLaunchCheck.overallStatus === "passed" ? [] : ["Post-launch live check is not passed."]),
    ...(externalStatus?.hasRealSignals ? ["External publishing has real signals; confirm this came from user-provided observed data."] : [])
  ];

  return {
    reportType: "optimized_validation_page_redeploy",
    targetDate,
    generatedAt: new Date().toISOString(),
    gitCommitHash,
    gitPushResult,
    serverPath,
    gitPullResult,
    dockerBuildResult,
    dockerUpResult,
    nginxReloadResult,
    checkedRoutes: optimizedCheck.checkedRoutes,
    optimizedContentCheckStatus: optimizedCheck.overallStatus,
    deploymentStatus: deploymentStatus.deploymentStatus,
    postLaunchCheckStatus: postLaunchCheck.overallStatus,
    externalPublishingStatus: externalStatus?.status ?? "unknown",
    hasRealSignals: externalStatus?.hasRealSignals ?? false,
    canBackfill: externalStatus?.canBackfill ?? false,
    warnings,
    nextActions: optimizedCheck.overallStatus === "passed"
      ? ["Start real external channel publishing and record observed data only."]
      : ["Redeploy or investigate why optimized validation copy is missing from production."],
    optimizedRedeployCheckPath: relativeReportPath(optimizedCheckPath),
    postLaunchLiveCheckPath: relativeReportPath(postLaunchLiveCheckPath)
  };
}

function parseResultArg(name: string) {
  const value = readArg(name);
  if (value === "success" || value === "failed" || value === "not_run") return value;
  if (value) throw new Error(`Invalid ${name} ${value}.`);
  return hasFlag("--dry-run") ? "not_run" : "success";
}

function parseNginxResultArg() {
  const value = readArg("--nginx-reload-result");
  if (value === "success" || value === "failed" || value === "not_required" || value === "not_run") return value;
  if (value) throw new Error(`Invalid --nginx-reload-result ${value}.`);
  return hasFlag("--dry-run") ? "not_run" : "success";
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    return await readJson<T>(filePath);
  } catch {
    return null;
  }
}

function relativeReportPath(filePath: string) {
  return filePath.replace(`${process.cwd()}\\`, "").replaceAll("\\", "/");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
