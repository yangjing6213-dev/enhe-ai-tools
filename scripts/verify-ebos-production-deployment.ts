import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { EbosDeploymentExecutionStatus } from "@/lib/ebos/deployment-execution";
import {
  renderPostLaunchLiveCheckMarkdown,
  runPostLaunchLiveCheck,
  transitionDeploymentStatusToVerified,
  type EbosPostLaunchLiveCheckReport,
  type EbosPostLaunchStatusTransition
} from "@/lib/ebos/post-launch";

type VerifiedTransitionReport = {
  reportType: "post_launch_verified_transition";
  targetDate: string;
  generatedAt: string;
  liveCheckReportPath: string;
  liveCheckMarkdownPath: string;
  overallStatus: EbosPostLaunchLiveCheckReport["overallStatus"];
  canTransitionToVerified: boolean;
  statusTransition: EbosPostLaunchStatusTransition;
  checkedRoutes: string[];
  routeHttpStatuses: Array<{ route: string; status: number; ok: boolean }>;
  blockers: string[];
  warnings: string[];
};

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
  const statusPath = getStatusPath(targetDate);
  const status = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;
  const verificationCommand = `npx tsx scripts/run-ebos-post-launch-live-check.ts --date ${targetDate} --site-url ${siteUrl}`;
  const report = await runPostLaunchLiveCheck({
    targetDate,
    siteUrl,
    currentDeploymentStatus: status.deploymentStatus
  });
  const transition = report.canTransitionToVerified
    ? await transitionDeploymentStatusToVerified({
        statusPath,
        report,
        verificationCommand
      })
    : report.statusTransition;
  const finalReport: EbosPostLaunchLiveCheckReport = {
    ...report,
    statusTransition: transition,
    nextActions: transition.updated
      ? ["Deployment is verified; begin real external channel publishing and data backfill with observed metrics only."]
      : report.nextActions
  };
  const livePaths = await writePostLaunchReport(targetDate, finalReport);
  const transitionPaths = await writeVerifiedTransitionReport(targetDate, finalReport, livePaths);

  console.log("EBOS production deployment verification completed:");
  console.log(`- overallStatus: ${finalReport.overallStatus}`);
  console.log(`- canTransitionToVerified: ${finalReport.canTransitionToVerified}`);
  console.log(`- previousStatus: ${transition.previousStatus}`);
  console.log(`- nextStatus: ${transition.nextStatus}`);
  console.log(`- updated: ${transition.updated}`);
  console.log(`- backupPath: ${transition.backupPath ?? "none"}`);
  console.log(`- blockers count: ${finalReport.blockers.length}`);
  console.log(`- warnings count: ${finalReport.warnings.length + transition.warnings.length}`);
  console.log(`- live check JSON: ${livePaths.jsonPath}`);
  console.log(`- live check Markdown: ${livePaths.markdownPath}`);
  console.log(`- transition JSON: ${transitionPaths.jsonPath}`);
  console.log(`- transition Markdown: ${transitionPaths.markdownPath}`);
}

async function writePostLaunchReport(
  targetDate: string,
  report: EbosPostLaunchLiveCheckReport
) {
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "post-launch");
  const jsonPath = resolve(outputDir, `${targetDate}-post-launch-live-check.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-post-launch-live-check.md`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderPostLaunchLiveCheckMarkdown(report)}\n`, "utf8");
  return { jsonPath, markdownPath };
}

async function writeVerifiedTransitionReport(
  targetDate: string,
  report: EbosPostLaunchLiveCheckReport,
  livePaths: { jsonPath: string; markdownPath: string }
) {
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "post-launch");
  const jsonPath = resolve(outputDir, `${targetDate}-verified-transition.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-verified-transition.md`);
  const transitionReport: VerifiedTransitionReport = {
    reportType: "post_launch_verified_transition",
    targetDate,
    generatedAt: new Date().toISOString(),
    liveCheckReportPath: livePaths.jsonPath,
    liveCheckMarkdownPath: livePaths.markdownPath,
    overallStatus: report.overallStatus,
    canTransitionToVerified: report.canTransitionToVerified,
    statusTransition: report.statusTransition,
    checkedRoutes: report.checkedRoutes,
    routeHttpStatuses: report.routeResults.map((result) => ({
      route: result.route,
      status: result.httpStatus,
      ok: result.ok
    })),
    blockers: report.blockers,
    warnings: [...report.warnings, ...report.statusTransition.warnings]
  };
  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(transitionReport, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderVerifiedTransitionMarkdown(transitionReport)}\n`, "utf8");
  return { jsonPath, markdownPath };
}

function renderVerifiedTransitionMarkdown(report: VerifiedTransitionReport) {
  return [
    "# EBOS Verified Transition Report",
    "",
    `- targetDate: ${report.targetDate}`,
    `- overallStatus: ${report.overallStatus}`,
    `- canTransitionToVerified: ${report.canTransitionToVerified}`,
    `- previousStatus: ${report.statusTransition.previousStatus}`,
    `- nextStatus: ${report.statusTransition.nextStatus}`,
    `- updated: ${report.statusTransition.updated}`,
    `- backupPath: ${report.statusTransition.backupPath ?? "none"}`,
    `- reason: ${report.statusTransition.reason}`,
    "",
    "## Routes",
    ...report.routeHttpStatuses.map((item) => `- ${item.route}: HTTP ${item.status}, ok=${item.ok}`),
    "",
    "## Blockers",
    list(report.blockers),
    "",
    "## Warnings",
    list(report.warnings)
  ].join("\n");
}

function getStatusPath(targetDate: string) {
  return resolve(
    process.cwd(),
    "reports",
    "ebos",
    "deployment",
    "execution",
    "status",
    `${targetDate}-deployment-execution-status.json`
  );
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
