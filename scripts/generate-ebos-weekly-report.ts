import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createEvidenceFileName,
  getEvidenceDirectory,
  readEvidenceCatalog,
  readLatestDataSourceReadiness,
  readLatestHealthSnapshot,
  wrapWeeklyReportEvidence
} from "@/lib/ebos/evidence";
import { calculateWebsiteHealthScore } from "@/lib/ebos/health";
import type { EbosWarning } from "@/lib/ebos";
import { readLatestDecisionReport } from "@/lib/ebos/decision";
import { readLatestValidationResultReport } from "@/lib/ebos/validation";
import { readLatestValidationLaunchReadinessReport } from "@/lib/ebos/validation-launch";
import {
  readLatestValidationLaunchExecutionReport,
  readLatestValidationPostLaunchCheckReport
} from "@/lib/ebos/validation-launch-execution";
import { readLatestProductionDeploymentPreflightReport } from "@/lib/ebos/deployment";
import {
  readLatestDeploymentApprovalGate,
  readLatestDeploymentExecutionStatus
} from "@/lib/ebos/deployment-execution";
import { readLatestDeploymentOperatorChecklist } from "@/lib/ebos/deployment-operator";
import { readExternalPublishingStatusForDate } from "@/lib/ebos/external-publishing";
import { readSyntheticFailureScenarioStatusForDate } from "@/lib/ebos/synthetic-scenarios";
import { readOptimizedValidationPageRedeployStatusForDate } from "@/lib/ebos/post-launch";
import { readMigrationReleaseStatusForDate } from "@/lib/ebos/migration-release";
import { buildWeeklyEbosReport, formatLocalDate } from "@/lib/ebos/weekly";

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

async function main() {
  const targetDate = parseTargetDate();
  const healthEvidence = await readLatestHealthSnapshot();
  const dataSourceEvidence = await readLatestDataSourceReadiness();
  const catalog = await readEvidenceCatalog();
  const decision = await readLatestDecisionReport({ targetDate });
  const validationResult = await readLatestValidationResultReport({ targetDate });
  const launchReadiness = await readLatestValidationLaunchReadinessReport({ targetDate });
  const launchExecution = await readLatestValidationLaunchExecutionReport({ targetDate });
  const postLaunchCheck = await readLatestValidationPostLaunchCheckReport({ targetDate });
  const productionDeploymentPreflight = await readLatestProductionDeploymentPreflightReport({ targetDate });
  const productionDeploymentApprovalGate = await readLatestDeploymentApprovalGate({ targetDate });
  const deploymentExecutionStatus = await readLatestDeploymentExecutionStatus({ targetDate });
  const deploymentOperatorChecklist = await readLatestDeploymentOperatorChecklist({ targetDate });
  const externalPublishingStatus = await readExternalPublishingStatusForDate({ targetDate });
  const syntheticFailureScenarioStatus = await readSyntheticFailureScenarioStatusForDate({ targetDate });
  const optimizedValidationPageRedeployStatus = await readOptimizedValidationPageRedeployStatusForDate({ targetDate: formatLocalDate(targetDate) });
  const migrationReleaseStatus = await readMigrationReleaseStatusForDate({ targetDate });
  const evidenceWarnings = buildEvidenceWarnings(healthEvidence, dataSourceEvidence);
  const result = await buildWeeklyEbosReport({
    targetDate,
    includeHtml: true,
    websiteHealthSnapshot: healthEvidence?.data ?? undefined,
    integrationReadinessReport: dataSourceEvidence?.data ?? undefined,
    evidenceCatalogEntries: catalog?.entries,
    evidenceWarnings,
    decisionReport: decision?.report,
    validationResultReport: validationResult?.report ?? null,
    validationLaunchReadinessReport: launchReadiness?.report,
    validationLaunchExecutionReport: launchExecution?.report,
    validationPostLaunchCheckReport: postLaunchCheck?.report,
    productionDeploymentPreflightReport: productionDeploymentPreflight?.report,
    productionDeploymentApprovalGate: productionDeploymentApprovalGate?.report,
    deploymentExecutionStatus: deploymentExecutionStatus?.status,
    deploymentOperatorChecklist: deploymentOperatorChecklist?.report,
    externalPublishingStatus,
    syntheticFailureScenarioStatus,
    optimizedValidationPageRedeployStatus,
    migrationReleaseStatus
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "weekly");
  const filePrefix = formatLocalDate(result.report.period.start);
  const markdownPath = resolve(outputDir, `${filePrefix}-weekly-report.md`);
  const htmlPath = resolve(outputDir, `${filePrefix}-weekly-report.html`);
  const evidenceOutputDir = resolve(process.cwd(), getEvidenceDirectory("weekly_report"));
  const evidenceJsonPath = resolve(evidenceOutputDir, createEvidenceFileName("weekly_report", filePrefix, "json"));
  const evidenceEnvelope = wrapWeeklyReportEvidence({
    report: result.report,
    nextWeekPlan: result.nextWeekPlan,
    dataSourceStatus: result.dataSourceStatus,
    deploymentExecutionStatus: result.deploymentExecutionStatus,
    externalPublishingStatus: result.externalPublishingStatus,
    syntheticFailureScenarioStatus: result.syntheticFailureScenarioStatus,
    optimizedValidationPageRedeployStatus: result.optimizedValidationPageRedeployStatus,
    migrationReleaseStatus: result.migrationReleaseStatus
  }, {
    targetDate: filePrefix,
    generatedAt: result.report.generatedAt,
    periodStart: result.report.period.start,
    periodEnd: result.report.period.end,
    generator: "scripts/generate-ebos-weekly-report.ts",
    sourceFiles: [markdownPath, htmlPath]
  });

  await mkdir(outputDir, { recursive: true });
  await mkdir(evidenceOutputDir, { recursive: true });
  await writeFile(markdownPath, result.markdown, "utf8");
  await writeFile(htmlPath, result.html, "utf8");
  await writeFile(evidenceJsonPath, JSON.stringify(evidenceEnvelope, null, 2), "utf8");

  console.log(`EBOS weekly report generated:`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- HTML: ${htmlPath}`);
  console.log(`- Evidence JSON: ${evidenceJsonPath}`);
  console.log("- Next: run npx tsx scripts/index-ebos-evidence.ts to refresh the EBOS evidence catalog.");
  console.log(`- Score: ${result.report.overallScore ?? "unknown"}`);
  console.log(`- Confidence: ${result.report.confidence}`);
  console.log(`- Health evidence used: ${healthEvidence?.data ? "yes" : "no"}`);
  if (healthEvidence?.data) {
    console.log(`- Health score: ${calculateWebsiteHealthScore(healthEvidence.data).score}`);
  }
  console.log(`- Data-source evidence used: ${dataSourceEvidence?.data ? "yes" : "no"}`);
  if (dataSourceEvidence?.data) {
    console.log(`- Missing integrations: ${dataSourceEvidence.data.summary.missing_config}`);
  }
  console.log(`- Decision report used: ${decision?.report ? "yes" : "no"}`);
  console.log(`- Validation result report used: ${validationResult?.report ? "yes" : "no"}`);
  console.log(`- Validation launch readiness used: ${launchReadiness?.report ? "yes" : "no"}`);
  if (launchReadiness?.report) {
    console.log(`- Validation launch readinessStatus: ${launchReadiness.report.readinessStatus}`);
  }
  console.log(`- Validation launch execution used: ${launchExecution?.report ? "yes" : "no"}`);
  if (launchExecution?.report) {
    console.log(`- Validation launchStatus: ${launchExecution.report.launchStatus}`);
  }
  console.log(`- Validation post-launch check used: ${postLaunchCheck?.report ? "yes" : "no"}`);
  if (postLaunchCheck?.report) {
    console.log(`- Validation post-launch status: ${postLaunchCheck.report.status}`);
  }
  console.log(`- Production deployment preflight used: ${productionDeploymentPreflight?.report ? "yes" : "no"}`);
  if (productionDeploymentPreflight?.report) {
    console.log(`- Production deployment readinessStatus: ${productionDeploymentPreflight.report.readinessStatus}`);
  }
  console.log(`- Production deployment approval gate used: ${productionDeploymentApprovalGate?.report ? "yes" : "no"}`);
  if (productionDeploymentApprovalGate?.report) {
    console.log(`- Production deployment approvalStatus: ${productionDeploymentApprovalGate.report.approvalStatus}`);
    console.log(`- Production deployment gate deploymentStatus: ${productionDeploymentApprovalGate.report.deploymentStatus}`);
  }
  console.log(`- Deployment execution status used: ${deploymentExecutionStatus?.status ? "yes" : "no"}`);
  if (deploymentExecutionStatus?.status) {
    console.log(`- Deployment execution approvedByUser: ${deploymentExecutionStatus.status.approvedByUser}`);
    console.log(`- Deployment execution deploymentStatus: ${deploymentExecutionStatus.status.deploymentStatus}`);
  }
  console.log(`- Deployment operator checklist used: ${deploymentOperatorChecklist?.report ? "yes" : "no"}`);
  if (deploymentOperatorChecklist?.report) {
    console.log(`- Deployment operator safeToProceed: ${deploymentOperatorChecklist.report.commandAudit.safeToProceed}`);
    console.log(`- Deployment operator manualRequiredCommands: ${deploymentOperatorChecklist.report.commandAudit.manualRequiredCommands.length}`);
  }
  console.log(`- External publishing status used: yes`);
  console.log(`- External publishing status: ${externalPublishingStatus.status}`);
  console.log(`- External publishing hasRealSignals: ${externalPublishingStatus.hasRealSignals}`);
  console.log(`- External publishing canBackfill: ${externalPublishingStatus.canBackfill}`);
  console.log(`- Synthetic failure scenario used: ${syntheticFailureScenarioStatus.status === "generated" ? "yes" : "no"}`);
  if (syntheticFailureScenarioStatus.status === "generated") {
    console.log(`- Synthetic failure scenario simulated: ${syntheticFailureScenarioStatus.simulated}`);
    console.log(`- Synthetic simulatedRevenue: ${syntheticFailureScenarioStatus.simulatedRevenue}`);
    console.log(`- Synthetic simulatedPaidOrders: ${syntheticFailureScenarioStatus.simulatedPaidOrders}`);
    console.log(`- Synthetic optimization implementation completed: ${syntheticFailureScenarioStatus.optimizationImplementationCompleted === true}`);
  }
  console.log(`- Optimized validation page redeploy status used: yes`);
  console.log(`- Optimized validation page redeployed: ${optimizedValidationPageRedeployStatus.redeployed}`);
  console.log(`- Optimized validation page redeploy status: ${optimizedValidationPageRedeployStatus.status}`);
  console.log(`- Migration release status used: yes`);
  console.log(`- Migration release status: ${migrationReleaseStatus.status}`);
  console.log(`- Migration release safeToRunMigration: ${migrationReleaseStatus.safeToRunMigration}`);
  console.log(`- Top action items:`);
  for (const item of result.nextWeekPlan.actionItems.slice(0, 5)) {
    console.log(`  - [${item.priority}] ${item.title}`);
  }
}

function buildEvidenceWarnings(
  healthEvidence: Awaited<ReturnType<typeof readLatestHealthSnapshot>>,
  dataSourceEvidence: Awaited<ReturnType<typeof readLatestDataSourceReadiness>>
): EbosWarning[] {
  const warnings: EbosWarning[] = [];

  if (!healthEvidence) {
    warnings.push({
      code: "partial_data",
      severity: "warning",
      section: "website_health",
      message: "Health evidence missing; weekly report generated with internal data only."
    });
  } else if (healthEvidence.warning) {
    warnings.push(healthEvidence.warning);
  }

  if (!dataSourceEvidence) {
    warnings.push({
      code: "partial_data",
      severity: "warning",
      message: "Data-source readiness evidence missing; weekly report generated with default data-source warnings."
    });
  } else if (dataSourceEvidence.warning) {
    warnings.push(dataSourceEvidence.warning);
  }

  return warnings;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
