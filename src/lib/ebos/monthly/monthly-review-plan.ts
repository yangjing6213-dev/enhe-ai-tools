import type { EbosOKR } from "../types";
import type {
  EbosEvidenceActionItem,
  EbosEvidenceCatalogEntry
} from "../evidence";
import type { EbosDecisionReport } from "../decision";
import type { EbosValidationResultReport } from "../validation";
import type { EbosValidationLaunchReadinessReport } from "../validation-launch";
import type {
  EbosValidationLaunchExecutionReport,
  EbosValidationPostLaunchCheckReport
} from "../validation-launch-execution";
import type { EbosProductionDeploymentPreflightReport } from "../deployment";
import type {
  EbosDeploymentApprovalGate,
  EbosDeploymentExecutionStatus
} from "../deployment-execution";
import type { EbosDeploymentOperatorChecklistReport } from "../deployment-operator";
import type { EbosExternalPublishingStatusSummary } from "../external-publishing";
import type { EbosSyntheticScenarioStatusSummary } from "../synthetic-scenarios";
import type { EbosOptimizedValidationPageRedeployStatusSummary } from "../post-launch";
import type { EbosMigrationReleaseStatusSummary } from "../migration-release";
import type {
  EbosMonthlyDecision,
  EbosMonthlyReviewPlan
} from "./monthly-review-types";

export type GenerateMonthlyReviewPlanOptions = {
  evidenceEntries: EbosEvidenceCatalogEntry[];
  missingKinds: string[];
  openActionItemsCount: number;
  sampleIsThin: boolean;
  decisionReport?: EbosDecisionReport;
  validationResultReport?: EbosValidationResultReport | null;
  launchReadinessReport?: EbosValidationLaunchReadinessReport;
  launchExecutionReport?: EbosValidationLaunchExecutionReport;
  postLaunchCheckReport?: EbosValidationPostLaunchCheckReport;
  productionDeploymentPreflightReport?: EbosProductionDeploymentPreflightReport;
  productionDeploymentApprovalGate?: EbosDeploymentApprovalGate;
  deploymentExecutionStatus?: EbosDeploymentExecutionStatus;
  deploymentOperatorChecklist?: EbosDeploymentOperatorChecklistReport;
  externalPublishingStatus?: EbosExternalPublishingStatusSummary;
  syntheticFailureScenarioStatus?: EbosSyntheticScenarioStatusSummary;
  optimizedValidationPageRedeployStatus?: EbosOptimizedValidationPageRedeployStatusSummary;
  migrationReleaseStatus?: EbosMigrationReleaseStatusSummary;
};

export function generateMonthlyReviewPlan(
  options: GenerateMonthlyReviewPlanOptions
): EbosMonthlyReviewPlan {
  const nextMonthOKRs: EbosOKR[] = [];
  const codexTasks: EbosMonthlyDecision[] = [];
  const actionItems: EbosEvidenceActionItem[] = [];
  const stopDoing: EbosMonthlyDecision[] = [];
  const keepDoing: EbosMonthlyDecision[] = [];
  const startDoing: EbosMonthlyDecision[] = [];
  const missing = new Set(options.missingKinds);
  const healthScore = options.evidenceEntries.find((entry) => entry.evidenceKind === "health_snapshot")?.score ?? null;

  addValidationLaunchReadinessTasks(options.launchReadinessReport, nextMonthOKRs, codexTasks);
  addValidationResultTasks(options.validationResultReport, nextMonthOKRs, codexTasks, stopDoing, keepDoing, startDoing);
  addDecisionReportTasks(options.decisionReport, nextMonthOKRs, codexTasks);
  addValidationLaunchExecutionTasks(options.launchExecutionReport, options.postLaunchCheckReport, nextMonthOKRs, codexTasks);
  addProductionDeploymentPreflightTasks(options.productionDeploymentPreflightReport, nextMonthOKRs, codexTasks);
  addProductionDeploymentApprovalGateTasks(options.productionDeploymentApprovalGate, options.deploymentExecutionStatus, nextMonthOKRs, codexTasks);
  addDeploymentOperatorChecklistTasks(options.deploymentOperatorChecklist, nextMonthOKRs, codexTasks);
  addOptimizedRedeployTasks(options.optimizedValidationPageRedeployStatus, options.deploymentExecutionStatus, nextMonthOKRs, codexTasks);
  addExternalPublishingTasks(options.externalPublishingStatus, options.deploymentExecutionStatus, nextMonthOKRs, codexTasks);
  addSyntheticFailureScenarioTasks(options.syntheticFailureScenarioStatus, options.externalPublishingStatus, options.deploymentExecutionStatus, nextMonthOKRs, codexTasks);
  addMigrationReleaseModeTasks(options.migrationReleaseStatus, nextMonthOKRs, codexTasks);

  if (options.sampleIsThin) {
    nextMonthOKRs.push(okr("补齐经营证据链", [
      "生成至少 1 份 monthly_review evidence",
      "保持 weekly_report、health_snapshot、data_source_readiness 每周更新",
      "让 monthly review evidence used 数量达到 5 个以上"
    ]));
    startDoing.push(decision("补齐经营证据链", "当前 monthly review 样本不足，必须先提高 evidence 覆盖率。", [], "critical", "codex"));
  }

  if (missing.has("revenue_evidence")) {
    nextMonthOKRs.push(okr("建立收入数据证据", [
      "定义 revenue_evidence JSON 输入",
      "记录订单、支付、退款和收入来源",
      "让月度复盘能区分真实收入和假设收入"
    ]));
    codexTasks.push(decision("设计 revenue_evidence 生成脚本", "当前缺少收入证据，不能伪造收入结论。", [], "high", "codex"));
  }

  if (missing.has("market_evidence")) {
    nextMonthOKRs.push(okr("建立市场机会证据", [
      "生成 market_evidence JSON 输入",
      "沉淀 AI 数字产品方向、用户问题和产品机会评分",
      "让月度复盘能基于市场证据选择产品方向"
    ]));
    codexTasks.push(decision("设计 market_evidence 生成脚本", "当前缺少市场机会证据，产品方向只能依赖主观判断。", [], "high", "codex"));
  }

  if (missing.has("competitor_evidence")) {
    nextMonthOKRs.push(okr("建立 Competitor Evidence 竞品证据", [
      "生成 competitor_evidence JSON envelope",
      "沉淀默认竞品种子、页面结构信号和差异化机会",
      "让月度复盘可以引用竞品差异化验证任务"
    ]));
    codexTasks.push(decision(
      "Design competitor_evidence generation script",
      "Current catalog is missing competitor_evidence, so competitor differentiation and validation tasks are still not evidence-backed.",
      [],
      "high",
      "codex"
    ));
  }

  if (missing.has("product_evidence")) {
    nextMonthOKRs.push(okr("建立产品转化证据", [
      "沉淀产品页访问、下载、购买和视频演示证据",
      "至少覆盖 3 个高意图产品页面",
      "将产品证据纳入下次 catalog"
    ]));
    codexTasks.push(decision("设计 product_evidence 采集入口", "当前缺少产品转化证据。", [], "high", "codex"));
  }

  if (missing.has("seo_evidence") || missing.has("geo_evidence")) {
    nextMonthOKRs.push(okr("接入 SEO/GEO 数据源", [
      "接入 Google Search Console 或等价 SEO evidence",
      "建立 AI Search Probe / GEO evidence",
      "在 catalog 中形成 seo_evidence 和 geo_evidence"
    ]));
    codexTasks.push(decision("接入 SEO/GEO 数据源", "SEO/GEO evidence 缺失，月度判断只能依赖站内和周报。", [], "high", "codex"));
  }

  addRevenueEvidenceTasks(options.evidenceEntries, nextMonthOKRs, codexTasks);
  addMarketEvidenceTasks(options.evidenceEntries, codexTasks);
  addCompetitorEvidenceTasks(options.evidenceEntries, codexTasks);
  addSeoGeoProductEvidenceTasks(options.evidenceEntries, codexTasks);

  if (options.openActionItemsCount >= 10) {
    nextMonthOKRs.push(okr("减少执行积压", [
      "关闭或拆解 50% 高优先级 open action items",
      "为每个高优先级任务定义验收标准",
      "把无法本月完成的任务降级或移出计划"
    ]));
    actionItems.push(actionItem("reduce-execution-backlog", "减少执行积压", "把 open action items 分为本月必须完成、延后、废弃三类。", "high"));
  }

  if (typeof healthScore === "number" && healthScore >= 85) {
    keepDoing.push(decision("保持构建、类型检查、EBOS 测试健康", "health_snapshot 分数较高，应维持当前工程质量门槛。", [], "medium", "codex"));
  }

  stopDoing.push(decision("停止用感觉替代证据", "当前仍缺 revenue/product/SEO/GEO 等关键证据，不能用主观判断替代证据链。", [], "high", "human"));
  startDoing.push(decision("把每次复盘写回 evidence catalog", "Monthly Review 后续必须成为可索引 evidence。", [], "high", "codex"));

  return {
    nextMonthOKRs: dedupeOkrs(nextMonthOKRs),
    codexTasks,
    actionItems,
    stopDoing,
    keepDoing,
    startDoing
  };
}

function addMigrationReleaseModeTasks(
  status: EbosMigrationReleaseStatusSummary | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  if (!status || status.status === "not_generated") return;

  nextMonthOKRs.unshift(okr("Keep migration guard active for non-schema work", [
    "Migration release runbook exists",
    "RUN_PRISMA_MIGRATE stays unset or 0 for page, copy, report, and external publishing work",
    "No migration is recommended while safeToRunMigration=false"
  ]));
  codexTasks.unshift(decision(
    "Keep migration skipped unless a dedicated migration release is approved",
    `${status.summary} migrationGuardVariable=${status.migrationGuardVariable}; defaultMigrationBehavior=${status.defaultMigrationBehavior}; safeToRunMigration=${status.safeToRunMigration}. Do not execute migration for page/copy/report-only releases.`,
    [status.runbookPath ?? "", status.riskAuditPath ?? ""].filter(Boolean),
    status.safeToRunMigration ? "high" : "medium",
    "codex"
  ));
}

function addOptimizedRedeployTasks(
  status: EbosOptimizedValidationPageRedeployStatusSummary | undefined,
  deploymentExecutionStatus: EbosDeploymentExecutionStatus | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  if (deploymentExecutionStatus?.deploymentStatus !== "verified") return;
  if (!status || status.status === "not_generated") return;

  if (status.redeployed) {
    nextMonthOKRs.unshift(okr("Optimized validation page redeployed; start real external publishing", [
      "optimized validation page redeployed",
      "deploymentStatus remains verified",
      "Keep hasRealSignals=false until real external channel data exists"
    ]));
    codexTasks.unshift(decision(
      "Optimized validation page redeployed",
      `${status.summary} deploymentStatus=${status.deploymentStatus ?? "unknown"}; optimizedContentCheckStatus=${status.optimizedContentCheckStatus ?? "unknown"}; postLaunchCheckStatus=${status.postLaunchCheckStatus ?? "unknown"}. Next step is real external publishing, not more simulation.`,
      [status.reportPath ?? "", status.checkPath ?? ""].filter(Boolean),
      "high",
      "codex"
    ));
    return;
  }

  codexTasks.unshift(decision(
    "Finish optimized validation page redeploy",
    `${status.summary} gitPushResult=${status.gitPushResult ?? "unknown"}; gitPullResult=${status.gitPullResult ?? "unknown"}; dockerBuildResult=${status.dockerBuildResult ?? "unknown"}; dockerUpResult=${status.dockerUpResult ?? "unknown"}; nginxReloadResult=${status.nginxReloadResult ?? "unknown"}; optimizedContentCheckStatus=${status.optimizedContentCheckStatus ?? "unknown"}.`,
    [status.reportPath ?? "", status.checkPath ?? ""].filter(Boolean),
    "high",
    "codex"
  ));
}

function addSyntheticFailureScenarioTasks(
  syntheticStatus: EbosSyntheticScenarioStatusSummary | undefined,
  externalStatus: EbosExternalPublishingStatusSummary | undefined,
  deploymentExecutionStatus: EbosDeploymentExecutionStatus | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  if (deploymentExecutionStatus?.deploymentStatus !== "verified") return;
  if (!syntheticStatus || syntheticStatus.status !== "generated" || !syntheticStatus.synthetic) return;
  if (externalStatus?.hasRealSignals || externalStatus?.canBackfill) return;

  if (syntheticStatus.optimizationImplementationCompleted) {
    nextMonthOKRs.unshift(okr("Move from synthetic optimization to real external publishing validation", [
      "Confirm synthetic optimization implementation completed",
      "Publish or contact at least one real external channel",
      "Keep hasRealSignals=false until real external channel data exists"
    ]));
    codexTasks.unshift(decision(
      "Start real publishing validation after synthetic optimization",
      `${syntheticStatus.summary} implementedFixes=${syntheticStatus.implementedFixesCount ?? 0}; nextRealValidationActions=${syntheticStatus.nextRealValidationActionsCount ?? 0}; externalPublishingStatus=${externalStatus?.status ?? "unknown"}; hasRealSignals=false; canBackfill=false.`,
      [syntheticStatus.optimizationImplementationPath ?? "", syntheticStatus.optimizationPlanPath ?? ""].filter(Boolean),
      "high",
      "codex"
    ));
    return;
  }

  nextMonthOKRs.unshift(okr("Use simulated failure scenario without contaminating real data", [
    "Review synthetic failure analysis as simulated planning input only",
    "Apply top page/copy/offer fixes before real external publishing",
    "Keep hasRealSignals=false until real external channel data exists"
  ]));
  codexTasks.unshift(decision(
    "Review simulated failure scenario before real publishing",
    `${syntheticStatus.summary} simulatedRevenue=${syntheticStatus.simulatedRevenue}; simulatedPaidOrders=${syntheticStatus.simulatedPaidOrders}; likelyFailureReasons=${syntheticStatus.likelyFailureReasonsCount}; priorityFixes=${syntheticStatus.priorityFixesCount}.`,
    [syntheticStatus.scenarioPath ?? "", syntheticStatus.optimizationPlanPath ?? ""].filter(Boolean),
    "high",
    "codex"
  ));
}

function addExternalPublishingTasks(
  status: EbosExternalPublishingStatusSummary | undefined,
  deploymentExecutionStatus: EbosDeploymentExecutionStatus | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  if (deploymentExecutionStatus?.deploymentStatus !== "verified") return;
  if (!status) return;

  if (status.status === "not_generated") {
    codexTasks.unshift(decision(
      "Generate external channel publishing pack",
      "deploymentStatus=verified but external publishing pack is not generated yet. Generate channel assets and result input without inventing external data.",
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (status.status === "waiting_real_data" || status.status === "pack_generated" || status.status === "result_input_waiting") {
    nextMonthOKRs.unshift(okr("等待真实外部渠道数据", [
      "Publish AI Prompt Kit on at least one real external channel",
      "Keep all unobserved metrics at 0",
      "Backfill only after hasRealSignals=true"
    ]));
    codexTasks.unshift(decision(
      "等待真实外部渠道数据",
      `${status.summary} publishCoverage=${status.publishCoverage}; dataCoverage=${status.dataCoverage}.`,
      [status.resultInputPath ?? status.packPath ?? ""].filter(Boolean),
      "high",
      "codex"
    ));
    return;
  }

  if (status.status === "ready_to_backfill" || status.status === "backfill_dry_run") {
    codexTasks.unshift(decision(
      "Run or review external channel data backfill",
      `${status.summary} canBackfill=${String(status.canBackfill)}.`,
      [status.resultInputPath ?? status.backfillReportPath ?? ""].filter(Boolean),
      "high",
      "codex"
    ));
    return;
  }

  if (status.status === "backfilled") {
    codexTasks.unshift(decision(
      "Refresh EBOS reports after external publishing backfill",
      status.summary,
      [status.backfillReportPath ?? ""].filter(Boolean),
      "high",
      "codex"
    ));
    return;
  }

  if (status.status === "blocked") {
    codexTasks.unshift(decision(
      "Fix external publish result blockers",
      status.blockers.join("; ") || status.summary,
      [status.resultInputPath ?? ""].filter(Boolean),
      "high",
      "codex"
    ));
  }
}

function addDeploymentOperatorChecklistTasks(
  checklist: EbosDeploymentOperatorChecklistReport | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  if (!checklist) return;
  const manualRequiredCount = checklist.commandAudit.manualRequiredCommands.length;

  if (!checklist.commandAudit.safeToProceed) {
    nextMonthOKRs.unshift(okr("Fix deployment command audit blockers before production execution", [
      "Remove dangerous deployment commands",
      "Remove Prisma migration commands",
      "Remove secret exposure commands"
    ]));
    codexTasks.unshift(decision(
      "Fix deployment command audit blockers",
      `operator checklist safeToProceed=false; dangerous=${checklist.commandAudit.dangerousCommandsDetected.length}; migrations=${checklist.commandAudit.migrationCommandsDetected.length}; secretRisks=${checklist.commandAudit.secretExposureRisks.length}.`,
      [],
      "critical",
      "codex"
    ));
    return;
  }

  nextMonthOKRs.unshift(okr("Confirm real deployment execution with operator checklist", [
    "User confirms whether to enter real production deployment execution",
    "Keep server/Docker/Nginx commands manual until executable environment is confirmed",
    "Update deployment status only from observed command results"
  ]));
  codexTasks.unshift(decision(
    "Confirm real deployment execution with operator checklist",
    `operator checklist safeToProceed=true; manualRequiredCommands=${manualRequiredCount}. Do not execute server/Docker/Nginx commands until the user explicitly starts real deployment execution.`,
    [],
    "high",
    "codex"
  ));
}

function addProductionDeploymentApprovalGateTasks(
  approvalGate: EbosDeploymentApprovalGate | undefined,
  executionStatus: EbosDeploymentExecutionStatus | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  if (!approvalGate && !executionStatus) return;

  const deploymentStatus = executionStatus?.deploymentStatus ?? approvalGate?.deploymentStatus ?? "not_started";
  const approvedByUser = executionStatus?.approvedByUser ?? approvalGate?.approvalStatus === "approved";
  const approvalStatus = executionStatus ? undefined : approvalGate?.approvalStatus;

  if (deploymentStatus === "verified") {
    nextMonthOKRs.unshift(okr("开始真实外部渠道发布和数据回填", [
      "Publish validation asset on real external channels",
      "Record observed CTA, inquiry, order, revenue, refund, and feedback metrics only",
      "Regenerate validation, decision, weekly, and monthly reports"
    ]));
    codexTasks.unshift(decision(
      "开始真实外部渠道发布和数据回填",
      "deploymentStatus=verified; begin real external channel publishing and validation data intake with observed metrics only.",
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (deploymentStatus === "deployed_pending_verification") {
    if (executionStatus?.postLaunchCheckStatus === "failed") {
      codexTasks.unshift(decision(
        "Fix failed EBOS post-launch live check routes",
        "Deployment is pending verification and the recorded post-launch check failed; fix failed public routes before marking verified.",
        [],
        "critical",
        "codex"
      ));
      return;
    }

    codexTasks.unshift(decision(
      "Run EBOS post-launch live check",
      "Deployment is pending verification; run run-ebos-post-launch-live-check and verify-ebos-production-deployment before recording verified status.",
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (deploymentStatus === "executing") {
    codexTasks.unshift(decision(
      "Wait for manual server deployment result",
      `deploymentStatus=executing; localCommandsRun=${executionStatus?.localCommandsRun.length ?? 0}. Server/Docker/Nginx commands still require user-provided execution result before post-launch check.`,
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (deploymentStatus === "approved_not_executed" && approvedByUser) {
    nextMonthOKRs.unshift(okr("Execute approved deployment and run post-launch verification", [
      "已批准部署验证页",
      "尚未执行真实部署",
      "执行部署 runbook 中的部署命令，部署后运行 post-launch check"
    ]));
    codexTasks.unshift(decision(
      "Execute approved deployment and run post-launch verification",
      `deploymentStatus=approved_not_executed; approvedByUser=true; approvedAt=${executionStatus?.approvedAt ?? "recorded"}. 已批准部署验证页，但尚未执行真实部署。下一步：执行部署 runbook 中的部署命令，部署后运行 post-launch check.`,
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (approvalStatus === "awaiting_user_approval" || deploymentStatus === "awaiting_approval" || !approvedByUser) {
    nextMonthOKRs.unshift(okr("等待用户确认部署验证页", [
      "User replies 确认部署验证页",
      "Keep production execution status awaiting_approval",
      "Do not execute server, Docker, Nginx, or SSH commands before approval"
    ]));
    codexTasks.unshift(decision(
      "等待用户确认部署验证页",
      "approvalStatus=awaiting_user_approval; deploymentStatus=awaiting_approval. Codex may only run local checks and generate reports until the user replies 确认部署验证页.",
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (deploymentStatus === "approved_not_executed") {
    codexTasks.unshift(decision(
      "进入部署执行阶段（尚未部署）",
      "User approval is recorded and the work can enter deployment execution stage, but production is 尚未部署. Execute only the reviewed deployment plan and write each executed command into deployment execution status.",
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (deploymentStatus === "failed") {
    codexTasks.unshift(decision(
      "修复部署失败并准备回滚",
      "deploymentStatus=failed; use scoped rollback notes and do not retry without a new approval review.",
      [],
      "critical",
      "codex"
    ));
    return;
  }

  if (deploymentStatus === "rolled_back") {
    codexTasks.unshift(decision(
      "复盘回滚结果",
      "deploymentStatus=rolled_back; review rollback notes and generate a new approval gate before retry.",
      [],
      "medium",
      "codex"
    ));
  }
}

function addProductionDeploymentPreflightTasks(
  preflightReport: EbosProductionDeploymentPreflightReport | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  if (!preflightReport) return;

  if (preflightReport.readinessStatus === "blocked") {
    nextMonthOKRs.unshift(okr("Fix production deployment blockers", [
      "Resolve all production deployment preflight blockers",
      "Regenerate deployment preflight report",
      "Do not execute production deployment until blockers are clear"
    ]));
    codexTasks.unshift(decision(
      "Fix production deployment blockers",
      `readinessStatus=blocked; readinessScore=${preflightReport.readinessScore}; blockers: ${preflightReport.blockers.join("; ") || "not specified"}`,
      [],
      "critical",
      "codex"
    ));
    return;
  }

  if (preflightReport.readinessStatus === "ready_to_deploy") {
    nextMonthOKRs.unshift(okr("Execute production deployment after explicit confirmation", [
      "Confirm production deployment approval",
      "Execute only the reviewed deployment plan",
      "Run post-deploy smoke tests and regenerate EBOS reports"
    ]));
    codexTasks.unshift(decision(
      "Execute production deployment",
      `readinessStatus=ready_to_deploy; readinessScore=${preflightReport.readinessScore}. Execute real deployment only after explicit user confirmation.`,
      [],
      "high",
      "codex"
    ));
    return;
  }

  codexTasks.unshift(decision(
    "Fix production deployment preflight warnings",
    `readinessStatus=${preflightReport.readinessStatus}; warnings: ${preflightReport.warnings.slice(0, 5).join("; ") || "not specified"}`,
    [],
    "high",
    "codex"
  ));
}

function addValidationLaunchExecutionTasks(
  launchExecutionReport: EbosValidationLaunchExecutionReport | undefined,
  postLaunchCheckReport: EbosValidationPostLaunchCheckReport | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  const postLaunch = postLaunchCheckReport;
  if (postLaunch && (postLaunch.status === "failed" || postLaunch.blockers.length > 0)) {
    nextMonthOKRs.unshift(okr("Fix validation post-launch failures", [
      "Resolve failed validation public routes",
      "Regenerate post-launch check report",
      "Only collect external metrics after public validation routes pass"
    ]));
    codexTasks.unshift(decision(
      "Fix failed validation post-launch routes",
      `post-launch status=${postLaunch.status}; blockers: ${postLaunch.blockers.join("; ") || "not specified"}`,
      [],
      "critical",
      "codex"
    ));
    return;
  }

  if (postLaunch?.status === "passed") {
    codexTasks.unshift(decision(
      "Collect real validation data",
      "post-launch check passed; start collecting only real external channel, CTA, inquiry, order, revenue, refund, and feedback data.",
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (!launchExecutionReport) return;

  if (launchExecutionReport.launchStatus === "blocked") {
    codexTasks.unshift(decision(
      "Fix validation launch execution blockers",
      `launchStatus=blocked; blockers: ${launchExecutionReport.blockers.join("; ") || "not specified"}`,
      [],
      "critical",
      "codex"
    ));
    return;
  }

  if (launchExecutionReport.launchStatus === "ready_to_deploy") {
    nextMonthOKRs.unshift(okr("Execute validation deployment for AI Prompt Kit", [
      "Complete launch execution checklist",
      "Prepare post-launch route checks",
      "Keep external data empty until real observed signals exist"
    ]));
    codexTasks.unshift(decision(
      "Execute validation deployment",
      "launchStatus=ready_to_deploy; run deployment checklist and post-launch dry-run without claiming deployment until confirmed.",
      [],
      "high",
      "codex"
    ));
    return;
  }

  if (launchExecutionReport.launchStatus === "deployed_pending_verification") {
    codexTasks.unshift(decision(
      "Run validation post-launch smoke check",
      "launchStatus=deployed_pending_verification; validate public routes before collecting external metrics.",
      [],
      "high",
      "codex"
    ));
  }
}

function addValidationLaunchReadinessTasks(
  launchReadinessReport: EbosValidationLaunchReadinessReport | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  if (!launchReadinessReport) return;

  if (launchReadinessReport.readinessStatus === "blocked") {
    nextMonthOKRs.push(okr("Fix validation launch blockers before scaling validation", [
      "Resolve all validation launch readiness blockers",
      "Regenerate readiness report and launch runbook",
      "Do not publish external validation until blockers are cleared"
    ]));
    codexTasks.push(decision(
      "Fix validation launch blockers",
      `readinessStatus=blocked; readinessScore=${launchReadinessReport.readinessScore}; blockers: ${launchReadinessReport.blockers.join("; ") || "not specified"}`,
      [],
      "critical",
      "codex"
    ));
    return;
  }

  if (launchReadinessReport.readinessStatus === "ready" || launchReadinessReport.readinessStatus === "ready_with_warnings") {
    nextMonthOKRs.push(okr("Run real validation launch for AI Prompt Kit", [
      "Publish or confirm the validation page",
      "Record real CTA, inquiry, order, refund, and feedback signals only after they happen",
      "Regenerate validation, decision, weekly, and monthly reports after intake"
    ]));
    codexTasks.push(decision(
      "Start real validation launch",
      `readinessStatus=${launchReadinessReport.readinessStatus}; readinessScore=${launchReadinessReport.readinessScore}. Use the launch runbook and keep unobserved external data empty.`,
      [],
      "high",
      "codex"
    ));
    return;
  }

  codexTasks.push(decision(
    "Fix validation launch readiness warnings",
    `readinessStatus=${launchReadinessReport.readinessStatus}; warnings: ${launchReadinessReport.warnings.slice(0, 5).join("; ") || "not specified"}`,
    [],
    "high",
    "codex"
  ));
}

function addValidationResultTasks(
  validationResultReport: EbosValidationResultReport | null | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[],
  stopDoing: EbosMonthlyDecision[],
  keepDoing: EbosMonthlyDecision[],
  startDoing: EbosMonthlyDecision[]
) {
  if (validationResultReport === undefined) return;

  if (validationResultReport) {
    addExternalIntakeStatusTasks(validationResultReport, codexTasks);
  }

  if (validationResultReport === null || validationResultNeedsRecording(validationResultReport)) {
    nextMonthOKRs.push(okr("记录 validation result 作为下月决策反馈", [
      "填写 validation input JSON",
      "生成 validation result report",
      "把验证结果用于下次 decision report"
    ]));
    codexTasks.push(decision(
      "Record validation results",
      "No completed validation input or usable result signal exists yet; fill the manual input and regenerate the result report before the next monthly review.",
      [],
      "high",
      "codex"
    ));
    return;
  }

  if ((validationResultReport.captureSummary?.manualSlotsCount ?? 0) > 0) {
    codexTasks.push(decision(
      "补充 validation 外部渠道数据",
      `Validation capture found ${validationResultReport.captureSummary?.manualSlotsCount ?? 0} manual slots. External marketplace, social, and user-feedback metrics still require real user-provided data and cannot be filled by Codex.`,
      validationResultReport.captureReportPath ? [validationResultReport.captureReportPath] : [validationResultReport.trackerPath],
      "high",
      "codex"
    ));
  }

  for (const direction of validationResultReport.continueDirections) {
    keepDoing.push(decision(
      `Continue validated direction: ${direction}`,
      "Validation result report recorded a success/continue recommendation.",
      [validationResultReport.trackerPath],
      "high",
      "human"
    ));
  }

  for (const direction of validationResultReport.scaleDirections) {
    keepDoing.push(decision(
      `Scale validated direction: ${direction}`,
      "Validation result report recorded a scale recommendation.",
      [validationResultReport.trackerPath],
      "high",
      "human"
    ));
  }

  for (const direction of validationResultReport.adjustDirections) {
    startDoing.push(decision(
      `Adjust validation direction: ${direction}`,
      "Validation result report recorded partial success; adjust offer, CTA, price, or channel before repeating.",
      [validationResultReport.trackerPath],
      "medium",
      "human"
    ));
  }

  for (const direction of validationResultReport.stopDirections) {
    stopDoing.push(decision(
      `Stop failed validation direction: ${direction}`,
      "Validation result report recorded failure/stop; lower priority until new evidence appears.",
      [validationResultReport.trackerPath],
      "high",
      "human"
    ));
  }
}

function addExternalIntakeStatusTasks(
  validationResultReport: EbosValidationResultReport,
  codexTasks: EbosMonthlyDecision[]
) {
  const external = validationResultReport.externalIntakeSummary;
  if (!external) return;

  if (external.status === "template_generated_unfilled") {
    codexTasks.push(decision(
      "Fill external intake with real channel data",
      `${external.summary}. Use ${external.inputPath ?? "the external intake input"} and keep unknown metrics as 0.`,
      external.inputPath ? [external.inputPath] : [],
      "high",
      "codex"
    ));
    return;
  }

  if (external.status === "input_filled_not_imported" || external.status === "dry_run_available") {
    codexTasks.push(decision(
      "Import external intake after dry-run review",
      `${external.summary}. Review skipped changes before applying to validation input.`,
      external.inputPath ? [external.inputPath] : [],
      "high",
      "codex"
    ));
    return;
  }

  if (external.status === "imported") {
    codexTasks.push(decision(
      "External intake imported",
      `External intake imported ${external.importedChannelsCount} channels and ${external.importedPlansCount} plans with ${external.appliedChangesCount} applied changes.`,
      external.importReportPath ? [external.importReportPath] : [],
      "medium",
      "codex"
    ));
  }
}

function validationResultNeedsRecording(report: EbosValidationResultReport) {
  const hasRecommendation = report.continueDirections.length > 0
    || report.adjustDirections.length > 0
    || report.stopDirections.length > 0
    || report.scaleDirections.length > 0;
  if (hasRecommendation) return false;
  return report.analyses.length === 0
    || report.analyses.every((analysis) => analysis.successStatus === "not_started" || analysis.successStatus === "inconclusive");
}

function addDecisionReportTasks(
  decisionReport: EbosDecisionReport | undefined,
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  const top = decisionReport?.doNext[0];
  if (!top) return;

  nextMonthOKRs.push(okr(`Validate decision report priority: ${top.title}`, [
    "Complete the primary validation asset",
    "Record CTA clicks, leads, presale, or manual purchase intent",
    "Write validation result back into next evidence cycle"
  ]));
  codexTasks.push(decision(
    "Apply decision report top recommendation",
    top.reason,
    top.evidenceRefs,
    "high",
    "codex"
  ));
}

function addMarketEvidenceTasks(
  evidenceEntries: EbosEvidenceCatalogEntry[],
  codexTasks: EbosMonthlyDecision[]
) {
  const market = evidenceEntries.find((entry) => entry.evidenceKind === "market_evidence");
  if (!market) return;

  const topDirections = Array.isArray(market.payloadSummary?.topProductDirections)
    ? market.payloadSummary.topProductDirections
    : [];
  const firstDirection = topDirections
    .map((item) => item && typeof item === "object" && "productDirection" in item ? String(item.productDirection) : "")
    .find(Boolean);

  codexTasks.push(decision(
    "Review Market evidence product opportunities",
    firstDirection
      ? `market_evidence recommends ${firstDirection}; convert the top product direction into a scoped validation or PRD task.`
      : "market_evidence exists; review recommended product directions and convert the highest priority opportunity into next-month tasks.",
    [market.id],
    "high",
    "codex"
  ));

  const revenue = evidenceEntries.find((entry) => entry.evidenceKind === "revenue_evidence");
  const firstRevenueAchieved = revenue?.payloadSummary?.firstRevenueAchieved === true;
  if (!firstRevenueAchieved && firstDirection) {
    codexTasks.push(decision(
      "低成本验证市场机会",
      `Revenue evidence has not proved first real revenue; validate ${firstDirection} with a low-cost offer, waitlist, content test, or presale before building deeply.`,
      [market.id, ...(revenue ? [revenue.id] : [])],
      "high",
      "codex"
    ));
  }
}

function addCompetitorEvidenceTasks(
  evidenceEntries: EbosEvidenceCatalogEntry[],
  codexTasks: EbosMonthlyDecision[]
) {
  const competitor = evidenceEntries.find((entry) => entry.evidenceKind === "competitor_evidence");
  if (!competitor) return;

  const opportunities = Array.isArray(competitor.payloadSummary?.topDifferentiationOpportunities)
    ? competitor.payloadSummary.topDifferentiationOpportunities
    : [];
  const firstOpportunity = opportunities
    .map((item) => item && typeof item === "object" && "title" in item ? String(item.title) : "")
    .find(Boolean);
  const revenue = evidenceEntries.find((entry) => entry.evidenceKind === "revenue_evidence");
  const firstRevenueAchieved = revenue?.payloadSummary?.firstRevenueAchieved === true;
  const competitorsAuditedCount = readPayloadNumber(competitor.payloadSummary?.competitorsAuditedCount) ?? 0;

  if (competitor.confidence === "partial" && competitorsAuditedCount === 0) {
    codexTasks.push(decision(
      "Run public competitor URL audit",
      "competitor_evidence is still partial and has competitorsAuditedCount=0; re-run with explicit public page audit caps before treating differentiation tasks as page-signal-backed.",
      [competitor.id],
      "high",
      "codex"
    ));
  }

  codexTasks.push(decision(
    "Review Competitor evidence differentiation opportunities",
    firstOpportunity
      ? `Competitor evidence recommends ${firstOpportunity}; convert it into a concrete differentiation task.`
      : "competitor_evidence exists; review top differentiation opportunities and convert one into a scoped task.",
    [competitor.id],
    "high",
    "codex"
  ));

  if (!firstRevenueAchieved && firstOpportunity) {
    codexTasks.push(decision(
      "Competitor evidence low-cost validation priority",
      `First revenue is not proven; turn ${firstOpportunity} into a low-cost validation offer, waitlist, comparison page, or presale before large builds.`,
      [competitor.id, ...(revenue ? [revenue.id] : [])],
      "high",
      "codex"
    ));
  }

  const market = evidenceEntries.find((entry) => entry.evidenceKind === "market_evidence");
  const marketDirections = Array.isArray(market?.payloadSummary?.topProductDirections)
    ? market.payloadSummary.topProductDirections
    : [];
  const alignedDirection = marketDirections
    .map((item) => item && typeof item === "object" && "productDirection" in item ? String(item.productDirection) : "")
    .find((direction) => firstOpportunity ? hasSharedSignal(direction, firstOpportunity) : false);

  if (market && alignedDirection && firstOpportunity) {
    codexTasks.push(decision(
      "Prioritize aligned market and competitor validation",
      `market_evidence and competitor_evidence both point toward ${alignedDirection}; lift ${firstOpportunity} into next-month validation priority.`,
      [market.id, competitor.id],
      "high",
      "codex"
    ));
  }
}

function hasSharedSignal(left: string, right: string) {
  const leftTokens = new Set(tokenizeSignal(left));
  return tokenizeSignal(right).some((token) => leftTokens.has(token));
}

function tokenizeSignal(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function readPayloadNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function okr(objective: string, keyResults: string[]): EbosOKR {
  return {
    objective,
    keyResults: keyResults.map((title) => ({
      title,
      status: "not_started"
    }))
  };
}

function addSeoGeoProductEvidenceTasks(
  evidenceEntries: EbosEvidenceCatalogEntry[],
  codexTasks: EbosMonthlyDecision[]
) {
  const seo = evidenceEntries.find((entry) => entry.evidenceKind === "seo_evidence");
  const geo = evidenceEntries.find((entry) => entry.evidenceKind === "geo_evidence");
  const product = evidenceEntries.find((entry) => entry.evidenceKind === "product_evidence");

  if (seo && ((seo.score ?? 100) < 75 || seo.actionItemsCount > 0)) {
    codexTasks.push(decision(
      "Review SEO evidence action items",
      `seo_evidence score is ${seo.score ?? "unknown"} with ${seo.actionItemsCount} open action items; convert the highest-impact SEO readiness issues into next-month tasks.`,
      [seo.id],
      "high",
      "codex"
    ));
  }

  if (geo && ((geo.score ?? 100) < 75 || geo.actionItemsCount > 0)) {
    codexTasks.push(decision(
      "Review GEO evidence action items",
      `geo_evidence score is ${geo.score ?? "unknown"} with ${geo.actionItemsCount} open action items; convert answerability and citation readiness issues into next-month tasks.`,
      [geo.id],
      "high",
      "codex"
    ));
  }

  if (product && ((product.score ?? 100) < 75 || product.actionItemsCount > 0)) {
    codexTasks.push(decision(
      "Review Product evidence action items",
      `product_evidence score is ${product.score ?? "unknown"} with ${product.actionItemsCount} open action items; convert product conversion readiness issues into next-month tasks.`,
      [product.id],
      "high",
      "codex"
    ));
  }
}

function addRevenueEvidenceTasks(
  evidenceEntries: EbosEvidenceCatalogEntry[],
  nextMonthOKRs: EbosOKR[],
  codexTasks: EbosMonthlyDecision[]
) {
  const revenue = evidenceEntries.find((entry) => entry.evidenceKind === "revenue_evidence");
  if (!revenue) return;

  const summary = revenue.payloadSummary ?? {};
  const firstRevenueAchieved = summary.firstRevenueAchieved === true;
  const paidOrders = typeof summary.paidOrders === "number" ? summary.paidOrders : 0;

  if (!firstRevenueAchieved || paidOrders === 0) {
    nextMonthOKRs.push(okr("获得第一批真实收入", [
      "完成至少 1 个产品的付费验证",
      "形成订单、支付、退款和产品归因证据",
      "把首批收入验证结果写回 revenue_evidence"
    ]));
    codexTasks.push(decision(
      "Review Revenue evidence action items",
      `revenue_evidence shows firstRevenueAchieved=${String(firstRevenueAchieved)} and paidOrders=${paidOrders}; convert first-revenue validation into next-month execution tasks.`,
      [revenue.id],
      "high",
      "codex"
    ));
    return;
  }

  codexTasks.push(decision(
    "Scale validated revenue products",
    `revenue_evidence has ${paidOrders} paid orders; shift monthly work toward scaling validated products and improving conversion.`,
    [revenue.id],
    "high",
    "codex"
  ));
}

function decision(
  title: string,
  reason: string,
  evidenceRefs: string[],
  priority: EbosMonthlyDecision["priority"],
  owner: EbosMonthlyDecision["owner"]
): EbosMonthlyDecision {
  return {
    title,
    reason,
    evidenceRefs,
    priority,
    owner
  };
}

function actionItem(
  id: string,
  title: string,
  description: string,
  priority: EbosEvidenceActionItem["priority"]
): EbosEvidenceActionItem {
  return {
    id,
    title,
    description,
    priority,
    owner: "codex",
    evidenceRefs: [],
    status: "open"
  };
}

function dedupeOkrs(okrs: EbosOKR[]) {
  const seen = new Set<string>();
  return okrs.filter((item) => {
    if (seen.has(item.objective)) return false;
    seen.add(item.objective);
    return true;
  });
}
