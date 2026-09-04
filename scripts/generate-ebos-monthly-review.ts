import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildMonthlyEbosReview,
  renderMonthlyReviewHtml,
  renderMonthlyReviewMarkdown
} from "@/lib/ebos/monthly";
import {
  getEvidenceDirectory,
  wrapMonthlyReviewEvidence
} from "@/lib/ebos/evidence";
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
  const optimizedValidationPageRedeployStatus = await readOptimizedValidationPageRedeployStatusForDate({ targetDate: formatDateKey(targetDate) });
  const migrationReleaseStatus = await readMigrationReleaseStatusForDate({ targetDate });
  const review = await buildMonthlyEbosReview({
    targetDate,
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
  const markdown = renderMonthlyReviewMarkdown(review);
  const html = renderMonthlyReviewHtml(review);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "monthly");
  const monthlyPrefix = review.targetMonth;
  const markdownPath = resolve(outputDir, `${monthlyPrefix}-monthly-review.md`);
  const htmlPath = resolve(outputDir, `${monthlyPrefix}-monthly-review.html`);
  const evidenceOutputDir = resolve(process.cwd(), getEvidenceDirectory("monthly_review"));
  const evidenceJsonPath = resolve(evidenceOutputDir, `${monthlyPrefix}-monthly_review.json`);
  const evidenceEnvelope = wrapMonthlyReviewEvidence(review, {
    targetDate: review.periodStart,
    generatedAt: review.generatedAt,
    periodStart: review.periodStart,
    periodEnd: review.periodEnd,
    generator: "scripts/generate-ebos-monthly-review.ts",
    sourceFiles: [markdownPath, htmlPath]
  });

  await mkdir(outputDir, { recursive: true });
  await mkdir(evidenceOutputDir, { recursive: true });
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(htmlPath, html, "utf8");
  await writeFile(evidenceJsonPath, `${JSON.stringify(evidenceEnvelope, null, 2)}\n`, "utf8");

  console.log("EBOS monthly review generated:");
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- HTML: ${htmlPath}`);
  console.log(`- Evidence JSON: ${evidenceJsonPath}`);
  console.log(`- Evidence used: ${review.evidenceUsed.length}`);
  console.log(`- Overall score: ${review.overallScore ?? "unknown"}`);
  console.log(`- Confidence: ${review.confidence}`);
  console.log(`- Major risks: ${review.majorRisks.length}`);
  console.log(`- Next month OKRs: ${review.nextMonthOKRs.length}`);
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
  console.log("- Next: run npx tsx scripts/index-ebos-evidence.ts to refresh the EBOS evidence catalog.");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
