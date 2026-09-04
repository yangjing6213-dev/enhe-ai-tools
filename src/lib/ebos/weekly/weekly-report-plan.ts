import type { EbosActionItem, EbosOKR, EbosReport } from "../types";
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
import type { EbosWeeklyPlan } from "./weekly-report-types";

function actionItem(input: Omit<EbosActionItem, "status">): EbosActionItem {
  return {
    status: "open",
    ...input
  };
}

function sectionScore(report: EbosReport, key: string) {
  return report.sections.find((section) => section.key === key)?.score ?? null;
}

function sectionConfidence(report: EbosReport, key: string) {
  return report.sections.find((section) => section.key === key)?.confidence ?? "unknown";
}

function hasWarningSource(report: EbosReport, source: string) {
  return report.warnings.some((warning) => warning.source === source);
}

function hasWebsiteHealthRisk(report: EbosReport, terms: string[]) {
  const websiteHealth = report.sections.find((section) => section.key === "website_health");
  if (!websiteHealth) return false;
  const text = [
    ...websiteHealth.risks,
    ...websiteHealth.warnings.map((warning) => warning.message),
    ...websiteHealth.actionItems.map((item) => item.title)
  ].join("\n").toLowerCase();

  return terms.some((term) => text.includes(term.toLowerCase()));
}

function addWebsiteHealthRiskActions(report: EbosReport, actionItems: EbosActionItem[]) {
  if (hasWebsiteHealthRisk(report, ["homepage failed", "homepage accessibility"])) {
    actionItems.push(
      actionItem({
        title: "修复 homepage 页面可访问性",
        description: "优先处理首页 smoke check 失败，确保首页 GET/HEAD 返回 2xx 或 3xx。",
        priority: "high",
        sectionKey: "website_health",
        effort: "medium",
        confidence: "partial",
        verification: "下一次 health snapshot 中 homepage smoke check 通过。"
      })
    );
  }

  if (hasWebsiteHealthRisk(report, ["sitemap-sourced key_product_pages", "sitemap sourced key_product_pages"])) {
    actionItems.push(
      actionItem({
        title: "Fix product detail page 404 from sitemap",
        description: "Repair the product detail page 404, verify publishing status, and check sitemap generation against the product route.",
        priority: "high",
        sectionKey: "website_health",
        effort: "medium",
        confidence: "complete",
        verification: "Next health snapshot shows sitemap-sourced product detail page checks passing, or records the intentional removal from sitemap."
      })
    );
  }

  if (hasWebsiteHealthRisk(report, ["URL source may not match checked environment", "checked environment"])) {
    actionItems.push(
      actionItem({
        title: "Align EBOS checked environment and data source",
        description: "Point EBOS_SITE_URL and DATABASE_URL at the same environment before treating database-sourced product URL 404s as live site failures.",
        priority: "medium",
        sectionKey: "website_health",
        effort: "low",
        confidence: "partial",
        verification: "Next health snapshot records product page URL source as sitemap or a database source matching the checked site environment."
      })
    );
  }

  if (hasWebsiteHealthRisk(report, ["key_product_pages failed", "revenue path risk"])) {
    actionItems.push(
      actionItem({
        title: "修复 key_product_pages 收入路径可访问性",
        description: "优先处理产品页 smoke check 失败，避免产品详情页访问异常阻断收入验证。",
        priority: "high",
        sectionKey: "website_health",
        effort: "medium",
        confidence: "partial",
        verification: "下一次 health snapshot 中 key_product_pages smoke checks 全部通过或有明确例外说明。"
      })
    );
  }
}

function addEvidenceDrivenSectionActions(
  report: EbosReport,
  sectionKey: "seo" | "geo" | "product" | "revenue" | "market" | "competitor",
  actionItems: EbosActionItem[]
) {
  const section = report.sections.find((item) => item.key === sectionKey);
  if (!section || section.actionItems.length === 0) return;
  const evidenceKind = `${sectionKey}_evidence`;
  const hasEvidenceEntry = section.findings.some((finding) => finding.includes(evidenceKind));
  if (!hasEvidenceEntry) return;

  for (const item of section.actionItems.slice(0, 2)) {
    if (actionItems.some((existing) => existing.title === item.title)) continue;
    actionItems.push(actionItem({
      title: item.title,
      description: item.description ?? `Follow up ${sectionKey} evidence action item from the latest EBOS report.`,
      priority: item.priority,
      sectionKey,
      targetAdminPath: item.targetAdminPath,
      expectedImpact: item.expectedImpact,
      effort: item.effort ?? "medium",
      confidence: item.confidence ?? section.confidence,
      verification: item.verification ?? `Next ${sectionKey}_evidence report shows the action item resolved or downgraded.`
    }));
  }
}

export function generateNextWeekPlan(
  report: EbosReport,
  decisionReport?: EbosDecisionReport,
  validationResultReport?: EbosValidationResultReport | null,
  validationLaunchReadinessReport?: EbosValidationLaunchReadinessReport,
  validationLaunchExecutionReport?: EbosValidationLaunchExecutionReport,
  validationPostLaunchCheckReport?: EbosValidationPostLaunchCheckReport,
  productionDeploymentPreflightReport?: EbosProductionDeploymentPreflightReport,
  productionDeploymentApprovalGate?: EbosDeploymentApprovalGate,
  deploymentExecutionStatus?: EbosDeploymentExecutionStatus,
  deploymentOperatorChecklist?: EbosDeploymentOperatorChecklistReport,
  externalPublishingStatus?: EbosExternalPublishingStatusSummary,
  syntheticFailureScenarioStatus?: EbosSyntheticScenarioStatusSummary,
  optimizedValidationPageRedeployStatus?: EbosOptimizedValidationPageRedeployStatusSummary,
  migrationReleaseStatus?: EbosMigrationReleaseStatusSummary
): EbosWeeklyPlan {
  const actionItems: EbosActionItem[] = [];
  const revenueScore = sectionScore(report, "revenue");
  const trafficScore = sectionScore(report, "traffic");
  const productScore = sectionScore(report, "product");
  const seoConfidence = sectionConfidence(report, "seo");
  const geoConfidence = sectionConfidence(report, "geo");
  const revenueIsCritical = revenueScore === null || revenueScore < 50;

  const okrs: EbosOKR[] = [
    revenueIsCritical
      ? {
          objective: "获得第一批真实收入，并验证从内容/产品页到订单的最短转化路径",
          keyResults: [
            { title: "完成至少 1 个真实付费订单或明确失败原因", target: 1, unit: "order", status: "not_started" },
            { title: "完成 3 个高意图产品页的购买入口和 FAQ 检查", target: 3, unit: "pages", status: "not_started" },
            { title: "建立收入、订单、支付审核的周报读数口径", target: 1, unit: "dashboard", status: "not_started" }
          ]
        }
      : {
          objective: "扩大已验证收入路径，提升产品页和内容页的转化效率",
          keyResults: [
            { title: "本周收入较上周保持增长或解释波动原因", target: 1, unit: "review", status: "not_started" },
            { title: "完成 Top 产品页转化入口复盘", target: 3, unit: "pages", status: "not_started" }
          ]
        }
  ];

  addValidationResultPriority(validationResultReport, okrs, actionItems);
  addValidationLaunchReadinessPriority(validationLaunchReadinessReport, okrs, actionItems);
  addDecisionReportPriority(decisionReport, okrs, actionItems);
  addValidationLaunchExecutionPriority(validationLaunchExecutionReport, validationPostLaunchCheckReport, okrs, actionItems);
  addProductionDeploymentPreflightPriority(productionDeploymentPreflightReport, okrs, actionItems);
  addProductionDeploymentApprovalGatePriority(productionDeploymentApprovalGate, deploymentExecutionStatus, okrs, actionItems);
  addDeploymentOperatorChecklistPriority(deploymentOperatorChecklist, okrs, actionItems);
  addOptimizedRedeployPriority(optimizedValidationPageRedeployStatus, deploymentExecutionStatus, okrs, actionItems);
  addExternalPublishingPriority(externalPublishingStatus, deploymentExecutionStatus, okrs, actionItems);
  addSyntheticFailureScenarioPriority(syntheticFailureScenarioStatus, externalPublishingStatus, deploymentExecutionStatus, okrs, actionItems);
  addMigrationReleaseModePriority(migrationReleaseStatus, okrs, actionItems);

  if (revenueIsCritical) {
    actionItems.push(
      actionItem({
        title: "验证第一批真实收入路径",
        description: "从首页、产品详情页、价格页到订单/支付页完整走查一次，记录用户为何没有支付。",
        priority: "high",
        sectionKey: "revenue",
        targetAdminPath: "/admin/orders",
        expectedImpact: "确认收入阻塞点，优先形成第一笔或第一批真实收入。",
        effort: "medium",
        confidence: "partial",
        verification: "后台出现真实订单、支付记录，或形成明确的支付失败原因清单。"
      })
    );
  }

  if (trafficScore === null || trafficScore < 50) {
    actionItems.push(
      actionItem({
        title: "补强 SEO/GEO 内容增长任务",
        description: "围绕 AI 工具、AI 账号服务、本地部署 AI、AI 教程各补一个高意图内容入口。",
        priority: "high",
        sectionKey: "traffic",
        targetAdminPath: "/admin/ai-news",
        expectedImpact: "增加可被搜索和 AI 回答引擎引用的入口。",
        effort: "medium",
        confidence: "partial",
        verification: "至少发布或更新 3 个带内部链接和 CTA 的内容页。"
      })
    );
  }

  if (productScore === null || productScore < 60) {
    actionItems.push(
      actionItem({
        title: "优化产品页、商品上架、FAQ 与购买入口",
        description: "优先检查已发布产品是否具备清晰卖点、截图/视频、FAQ、价格规格和购买/下载入口。",
        priority: "high",
        sectionKey: "product",
        targetAdminPath: "/admin/software",
        expectedImpact: "提升从访问到订单或下载的承接效率。",
        effort: "medium",
        confidence: "partial",
        verification: "完成 3 个产品页检查并记录改动项，至少一个页面具备完整购买入口。"
      })
    );
  }

  if (seoConfidence !== "complete") {
    actionItems.push(
      actionItem({
        title: "接入或补齐 Google Search Console 数据",
        description: "将 GSC 查询、页面、点击、曝光、CTR、平均排名纳入 EBOS 数据源。",
        priority: "medium",
        sectionKey: "seo",
        expectedImpact: "让 SEO 诊断从站内行为扩展到搜索曝光层。",
        effort: "medium",
        confidence: "unknown",
        verification: "下一版 EBOS 周报可以展示 GSC 查询/页面数据，缺失时有明确 warning。"
      })
    );
  }

  if (geoConfidence !== "complete") {
    actionItems.push(
      actionItem({
        title: "接入 AI Search Probe / GEO 可见度巡检",
        description: "建立 ChatGPT、Perplexity、Google AI Overview、豆包、Kimi 等回答引擎的抽样记录。",
        priority: "medium",
        sectionKey: "geo",
        targetAdminPath: "/admin/geo-monitoring",
        expectedImpact: "判断 ENHE 是否被回答引擎提及、引用以及被哪些竞品替代。",
        effort: "medium",
        confidence: "unknown",
        verification: "下一版 EBOS 周报可展示至少 10 条 AI 搜索探针结果。"
      })
    );
  }

  addEvidenceDrivenSectionActions(report, "seo", actionItems);
  addEvidenceDrivenSectionActions(report, "geo", actionItems);
  addEvidenceDrivenSectionActions(report, "product", actionItems);
  addEvidenceDrivenSectionActions(report, "revenue", actionItems);
  addEvidenceDrivenSectionActions(report, "market", actionItems);
  addEvidenceDrivenSectionActions(report, "competitor", actionItems);
  addCompetitorPublicAuditAction(report, actionItems);

  addWebsiteHealthRiskActions(report, actionItems);

  if (hasWarningSource(report, "google_analytics")) {
    actionItems.push(
      actionItem({
        title: "接入 Google Analytics 数据源",
        description: "补齐 GA_PROPERTY_ID 和 Google service account 配置，让 EBOS 能读取流量来源、会话和转化事件。",
        priority: "medium",
        sectionKey: "traffic",
        effort: "medium",
        confidence: "unknown",
        verification: "下一次 data-source readiness 中 Google Analytics 变为 configured 或 available。"
      })
    );
  }

  if (hasWarningSource(report, "cloudflare")) {
    actionItems.push(
      actionItem({
        title: "接入 Cloudflare 流量与站点健康数据",
        description: "补齐 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ZONE_ID，用于后续读取边缘流量、缓存和访问错误。",
        priority: "medium",
        sectionKey: "traffic",
        effort: "medium",
        confidence: "unknown",
        verification: "下一次 data-source readiness 中 Cloudflare 变为 configured 或 available。"
      })
    );
  }

  if (hasWarningSource(report, "whop")) {
    actionItems.push(
      actionItem({
        title: "接入 Whop 收入数据源",
        description: "补齐 WHOP_API_KEY 和 WHOP_COMPANY_ID，用于后续收入分析和订阅数据核对。",
        priority: "medium",
        sectionKey: "revenue",
        effort: "medium",
        confidence: "unknown",
        verification: "下一次 data-source readiness 中 Whop 变为 configured 或 available。"
      })
    );
  }

  actionItems.push(
    actionItem({
      title: "沉淀 Step 3 自动巡检数据源清单",
      description: "列出 Lighthouse、Playwright、GSC、Bing、Cloudflare、Whop/手动收入的接入顺序。",
      priority: "medium",
      sectionKey: "next_plan",
      expectedImpact: "减少后续周报对手工判断的依赖。",
      effort: "low",
      confidence: "complete",
      verification: "形成下一阶段数据接入 issue 或执行清单。"
    })
  );

  return {
    okrs,
    actionItems: actionItems.slice(0, 8)
  };
}

function addMigrationReleaseModePriority(
  status: EbosMigrationReleaseStatusSummary | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (!status || status.status === "not_generated") return;

  okrs.unshift({
    objective: "Keep migration guard active for non-schema releases",
    keyResults: [
      { title: "migration release runbook exists", target: 1, unit: "runbook", status: "done" },
      { title: "RUN_PRISMA_MIGRATE remains unset or 0 for page/copy/report work", target: 1, unit: "guardrail", status: "not_started" },
      { title: "safeToRunMigration remains false until backup, review, and dedicated approval exist", target: 1, unit: "guardrail", status: status.safeToRunMigration ? "not_started" : "done" }
    ]
  });

  actionItems.unshift(actionItem({
    title: "Keep migration skipped by RUN_PRISMA_MIGRATE guard",
    description: `${status.summary} migrationGuardVariable=${status.migrationGuardVariable}; defaultMigrationBehavior=${status.defaultMigrationBehavior}; safeToRunMigration=${status.safeToRunMigration}. Migration is not needed for page, copy, report, external publishing, synthetic report, Docker-only, or Nginx-only releases. Do not set RUN_PRISMA_MIGRATE=1 unless the dedicated migration runbook blockers are cleared.`,
    priority: status.safeToRunMigration ? "high" : "medium",
    sectionKey: "next_plan",
    effort: "low",
    confidence: "complete",
    verification: "Weekly report references the migration release runbook and does not recommend executing migration while safeToRunMigration=false."
  }));
}

function addOptimizedRedeployPriority(
  status: EbosOptimizedValidationPageRedeployStatusSummary | undefined,
  deploymentExecutionStatus: EbosDeploymentExecutionStatus | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (deploymentExecutionStatus?.deploymentStatus !== "verified") return;
  if (!status || status.status === "not_generated") return;

  if (status.redeployed) {
    okrs.unshift({
      objective: "Optimized validation page redeployed; move to real external publishing",
      keyResults: [
        { title: "optimized validation page redeployed", target: 1, unit: "status", status: "done" },
        { title: "deploymentStatus remains verified", target: 1, unit: "status", status: "done" },
        { title: "externalPublishingStatus remains waiting_real_data until real signals exist", target: 1, unit: "guardrail", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Optimized validation page redeployed",
      description: `${status.summary} deploymentStatus=${status.deploymentStatus ?? "unknown"}; optimizedContentCheckStatus=${status.optimizedContentCheckStatus ?? "unknown"}; postLaunchCheckStatus=${status.postLaunchCheckStatus ?? "unknown"}. Next step is real external publishing, not more simulation.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Weekly report references optimized validation page redeployed while external publishing remains waiting_real_data until observed metrics exist."
    }));
    return;
  }

  actionItems.unshift(actionItem({
    title: "Finish optimized validation page redeploy",
    description: `${status.summary} gitPushResult=${status.gitPushResult ?? "unknown"}; gitPullResult=${status.gitPullResult ?? "unknown"}; dockerBuildResult=${status.dockerBuildResult ?? "unknown"}; dockerUpResult=${status.dockerUpResult ?? "unknown"}; nginxReloadResult=${status.nginxReloadResult ?? "unknown"}; optimizedContentCheckStatus=${status.optimizedContentCheckStatus ?? "unknown"}.`,
    priority: "high",
    sectionKey: "next_plan",
    effort: "low",
    confidence: "partial",
    verification: "Optimized redeploy report shows redeployed=true and production content check passed."
  }));
}

function addSyntheticFailureScenarioPriority(
  syntheticStatus: EbosSyntheticScenarioStatusSummary | undefined,
  externalStatus: EbosExternalPublishingStatusSummary | undefined,
  deploymentExecutionStatus: EbosDeploymentExecutionStatus | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (deploymentExecutionStatus?.deploymentStatus !== "verified") return;
  if (!syntheticStatus || syntheticStatus.status !== "generated" || !syntheticStatus.synthetic) return;
  if (externalStatus?.hasRealSignals || externalStatus?.canBackfill) return;

  if (syntheticStatus.optimizationImplementationCompleted) {
    okrs.unshift({
      objective: "Move from synthetic optimization to real external publishing validation",
      keyResults: [
        { title: "Confirm synthetic optimization implementation completed", target: 1, unit: "report", status: "not_started" },
        { title: "Publish or contact at least one real external channel", target: 1, unit: "channel", status: "not_started" },
        { title: "Keep hasRealSignals=false until real channel data exists", target: 1, unit: "guardrail", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Start real publishing validation after synthetic optimization",
      description: `${syntheticStatus.summary} implementedFixes=${syntheticStatus.implementedFixesCount ?? 0}; nextRealValidationActions=${syntheticStatus.nextRealValidationActionsCount ?? 0}; externalPublishingStatus=${externalStatus?.status ?? "unknown"}; hasRealSignals=false; canBackfill=false.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Weekly report references synthetic optimization implementation completed while external publishing remains waiting_real_data."
    }));
    return;
  }

  okrs.unshift({
    objective: "Use simulated failure scenario before real external publishing",
    keyResults: [
      { title: "Review synthetic failure analysis as simulated planning input only", target: 1, unit: "review", status: "not_started" },
      { title: "Apply top page/copy/offer fixes before the next real channel sprint", target: 3, unit: "fix", status: "not_started" },
      { title: "Keep hasRealSignals=false until real channel data exists", target: 1, unit: "guardrail", status: "not_started" }
    ]
  });
  actionItems.unshift(actionItem({
    title: "Review simulated failure scenario before real publishing",
    description: `${syntheticStatus.summary} simulatedRevenue=${syntheticStatus.simulatedRevenue}; simulatedPaidOrders=${syntheticStatus.simulatedPaidOrders}; priorityFixes=${syntheticStatus.priorityFixesCount}. This is simulated and must not be backfilled as real data.`,
    priority: "high",
    sectionKey: "next_plan",
    effort: "low",
    confidence: "complete",
    verification: "Weekly report references synthetic=true while external publishing remains hasRealSignals=false and canBackfill=false."
  }));
}

function addExternalPublishingPriority(
  status: EbosExternalPublishingStatusSummary | undefined,
  deploymentExecutionStatus: EbosDeploymentExecutionStatus | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (deploymentExecutionStatus?.deploymentStatus !== "verified") return;
  if (!status) return;

  if (status.status === "not_generated") {
    actionItems.unshift(actionItem({
      title: "Generate external channel publishing pack",
      description: "deploymentStatus=verified but external publishing pack is not generated yet. Generate copy-ready channel assets and result input without inventing data.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "reports/ebos/external-publishing/packs and inputs contain the generated publishing pack and result template."
    }));
    return;
  }

  if (status.status === "waiting_real_data" || status.status === "pack_generated" || status.status === "result_input_waiting") {
    okrs.unshift({
      objective: "等待真实外部渠道数据",
      keyResults: [
        { title: "Publish AI Prompt Kit on at least one real external channel", target: 1, unit: "channel", status: "not_started" },
        { title: "Keep unobserved external metrics at 0", target: 1, unit: "input", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "等待真实外部渠道数据",
      description: `${status.summary} publishCoverage=${status.publishCoverage}; dataCoverage=${status.dataCoverage}. Do not apply backfill until hasRealSignals=true.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "check-ebos-external-publish-results reports hasRealSignals=true before backfill apply."
    }));
    return;
  }

  if (status.status === "ready_to_backfill") {
    actionItems.unshift(actionItem({
      title: "执行外部数据 dry-run 回填",
      description: `${status.summary} canBackfill=${String(status.canBackfill)}. Run dry-run first and apply only after reviewing warnings and blockers.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "backfill-ebos-external-channel-data dry-run report exists; --apply is used only after review."
    }));
    return;
  }

  if (status.status === "backfill_dry_run") {
    actionItems.unshift(actionItem({
      title: "Review external publishing backfill dry-run",
      description: status.summary,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Backfill report is reviewed and apply is run only if data is real and blockers=0."
    }));
    return;
  }

  if (status.status === "backfilled") {
    actionItems.unshift(actionItem({
      title: "Refresh validation, revenue, and decision reports after external data backfill",
      description: status.summary,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "validation/revenue/decision/weekly/monthly reports are regenerated after external channel data backfill."
    }));
    return;
  }

  if (status.status === "blocked") {
    actionItems.unshift(actionItem({
      title: "Fix external publish result blockers",
      description: status.blockers.join("; ") || status.summary,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "check-ebos-external-publish-results reports blockers=0."
    }));
  }
}

function addDeploymentOperatorChecklistPriority(
  checklist: EbosDeploymentOperatorChecklistReport | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (!checklist) return;
  const manualRequiredCount = checklist.commandAudit.manualRequiredCommands.length;

  if (!checklist.commandAudit.safeToProceed) {
    okrs.unshift({
      objective: "Fix deployment command audit blockers before production execution",
      keyResults: [
        { title: "dangerousCommandsDetected is 0", target: 0, unit: "commands", status: "not_started" },
        { title: "migrationCommandsDetected is 0", target: 0, unit: "commands", status: "not_started" },
        { title: "secretExposureRisks is 0", target: 0, unit: "commands", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Fix deployment command audit blockers",
      description: `operator checklist safeToProceed=false; dangerous=${checklist.commandAudit.dangerousCommandsDetected.length}; migrations=${checklist.commandAudit.migrationCommandsDetected.length}; secretRisks=${checklist.commandAudit.secretExposureRisks.length}.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Regenerate deployment operator checklist and confirm safeToProceed=true before production execution."
    }));
    return;
  }

  actionItems.unshift(actionItem({
    title: "Confirm real deployment execution with operator checklist",
    description: `operator checklist safeToProceed=true; manualRequiredCommands=${manualRequiredCount}. Server/Docker/Nginx commands still require user-server execution or explicit executable environment confirmation.`,
    priority: "high",
    sectionKey: "next_plan",
    effort: "low",
    confidence: "complete",
    verification: "User explicitly confirms entering real production deployment execution, then execution status is updated only from observed command results."
  }));
}

function addProductionDeploymentApprovalGatePriority(
  approvalGate: EbosDeploymentApprovalGate | undefined,
  executionStatus: EbosDeploymentExecutionStatus | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (!approvalGate && !executionStatus) return;

  const deploymentStatus = executionStatus?.deploymentStatus ?? approvalGate?.deploymentStatus ?? "not_started";
  const approvedByUser = executionStatus?.approvedByUser ?? approvalGate?.approvalStatus === "approved";
  const approvalStatus = executionStatus ? undefined : approvalGate?.approvalStatus;

  if (deploymentStatus === "verified") {
    okrs.unshift({
      objective: "开始真实外部渠道发布和数据回填",
      keyResults: [
        { title: "Publish validation asset only on real external channels", target: 1, unit: "launch", status: "not_started" },
        { title: "Fill external intake with observed metrics only", target: 1, unit: "intake", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "开始真实外部渠道发布和数据回填",
      description: "Deployment is verified; begin real external channel publishing and validation data intake with observed metrics only.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "medium",
      confidence: "complete",
      verification: "External intake is filled with real observed channel data and validation reports are regenerated."
    }));
    return;
  }

  if (deploymentStatus === "deployed_pending_verification") {
    if (executionStatus?.postLaunchCheckStatus === "failed") {
      actionItems.unshift(actionItem({
        title: "Fix failed EBOS post-launch live check routes",
        description: "Deployment is pending verification and the recorded post-launch check failed; fix failed public routes before marking verified.",
        priority: "high",
        sectionKey: "next_plan",
        effort: "low",
        confidence: "complete",
        verification: "run-ebos-post-launch-live-check reports passed and verify-ebos-production-deployment moves deploymentStatus to verified."
      }));
      return;
    }

    actionItems.unshift(actionItem({
      title: "Run EBOS post-launch live check",
      description: "Deployment is pending verification; run run-ebos-post-launch-live-check and verify-ebos-production-deployment before claiming verified status or collecting external metrics.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "deployment execution status postLaunchCheckStatus becomes passed and deploymentStatus becomes verified."
    }));
    return;
  }

  if (deploymentStatus === "executing") {
    actionItems.unshift(actionItem({
      title: "Wait for manual server deployment result",
      description: `deploymentStatus=executing; localCommandsRun=${executionStatus?.localCommandsRun.length ?? 0}. Server/Docker/Nginx commands still require user-provided execution result before post-launch check.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "User fills server deployment result JSON; only complete server/docker/nginx result can move status to deployed_pending_verification."
    }));
    return;
  }

  if (deploymentStatus === "approved_not_executed" && approvedByUser) {
    okrs.unshift({
      objective: "Execute approved deployment and run post-launch verification",
      keyResults: [
        { title: "已批准部署验证页", target: 1, unit: "approval", status: "not_started" },
        { title: "尚未执行真实部署", target: 1, unit: "status", status: "not_started" },
        { title: "执行部署 runbook 中的部署命令，部署后运行 post-launch check", target: 1, unit: "verification", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Execute approved validation deployment",
      description: `deploymentStatus=approved_not_executed; approvedByUser=true; approvedAt=${executionStatus?.approvedAt ?? "recorded"}. 已批准部署验证页，但尚未执行真实部署。下一步：执行部署 runbook 中的部署命令，部署后运行 post-launch check.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "medium",
      confidence: "complete",
      verification: "deployment execution status records server/docker commands and moves to deployed_pending_verification; do not claim deployed while status is approved_not_executed."
    }));
    return;
  }

  if (approvalStatus === "awaiting_user_approval" || deploymentStatus === "awaiting_approval" || !approvedByUser) {
    okrs.unshift({
      objective: "等待用户确认部署验证页",
      keyResults: [
        { title: "User replies 确认部署验证页", target: 1, unit: "confirmation", status: "not_started" },
        { title: "Keep deploymentStatus awaiting_approval until confirmation", target: 1, unit: "status", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "等待用户确认部署验证页",
      description: "Production deployment approval gate is awaiting_user_approval; do not run server, Docker, Nginx, or SSH commands before the user replies 确认部署验证页.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "deployment approval gate approvalStatus becomes approved and execution status records approvedByUser=true."
    }));
    return;
  }

  if (deploymentStatus === "approved_not_executed") {
    actionItems.unshift(actionItem({
      title: "进入部署执行阶段（尚未部署）",
      description: "User approval is recorded and the work can enter deployment execution stage, but production is 尚未部署. Execute only the reviewed deployment plan and record each command in execution status.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "medium",
      confidence: "complete",
      verification: "deployment execution status records server/docker commands and moves to deployed_pending_verification."
    }));
    return;
  }

  if (deploymentStatus === "failed") {
    actionItems.unshift(actionItem({
      title: "修复部署失败并准备回滚",
      description: "Deployment execution status is failed; inspect execution notes and use scoped rollback plan before retrying.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "medium",
      confidence: "partial",
      verification: "Execution status is updated to rolled_back or awaiting_approval after rollback/review."
    }));
    return;
  }

  if (deploymentStatus === "rolled_back") {
    actionItems.unshift(actionItem({
      title: "复盘回滚结果",
      description: "Deployment was rolled back; review rollback notes before requesting a new approval gate.",
      priority: "medium",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "partial",
      verification: "A new approval gate or fixed deployment plan is generated before retry."
    }));
  }
}

function addProductionDeploymentPreflightPriority(
  preflightReport: EbosProductionDeploymentPreflightReport | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (!preflightReport) return;

  if (preflightReport.readinessStatus === "blocked") {
    okrs.unshift({
      objective: "Fix production deployment blockers before launch",
      keyResults: [
        { title: "Resolve all production deployment blockers", target: preflightReport.blockers.length || 1, unit: "blocker", status: "not_started" },
        { title: "Regenerate production deployment preflight", target: 1, unit: "report", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Fix production deployment blockers",
      description: `readinessStatus=blocked; readinessScore=${preflightReport.readinessScore}; blockers: ${preflightReport.blockers.join("; ") || "not specified"}`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Run check-ebos-production-deployment-preflight and confirm readinessStatus is no longer blocked."
    }));
    return;
  }

  if (preflightReport.readinessStatus === "ready_to_deploy") {
    okrs.unshift({
      objective: "Execute production deployment after explicit confirmation",
      keyResults: [
        { title: "Confirm production deployment approval", target: 1, unit: "confirmation", status: "not_started" },
        { title: "Run post-deploy smoke test", target: 1, unit: "report", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Execute production deployment",
      description: `readinessStatus=ready_to_deploy; readinessScore=${preflightReport.readinessScore}. Execute real deployment only after explicit user confirmation, then run post-launch smoke tests.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "medium",
      confidence: "complete",
      verification: "Production deployment is explicitly confirmed and run-ebos-post-launch-live-check reports passed routes."
    }));
    return;
  }

  actionItems.unshift(actionItem({
    title: "Fix production deployment preflight warnings",
    description: `readinessStatus=${preflightReport.readinessStatus}; warnings: ${preflightReport.warnings.slice(0, 5).join("; ") || "not specified"}`,
    priority: "high",
    sectionKey: "next_plan",
    effort: "low",
    confidence: "partial",
    verification: "Production deployment preflight is regenerated with readinessStatus=ready_to_deploy."
  }));
}

function addValidationLaunchExecutionPriority(
  launchExecutionReport: EbosValidationLaunchExecutionReport | undefined,
  postLaunchCheckReport: EbosValidationPostLaunchCheckReport | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  const postLaunch = postLaunchCheckReport;
  if (postLaunch && (postLaunch.status === "failed" || postLaunch.blockers.length > 0)) {
    okrs.unshift({
      objective: "Fix validation post-launch route failures before collecting validation data",
      keyResults: [
        { title: "Resolve all failed post-launch route checks", target: postLaunch.blockers.length || 1, unit: "blocker", status: "not_started" },
        { title: "Regenerate validation post-launch check report", target: 1, unit: "report", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Fix failed validation post-launch routes",
      description: `post-launch status=${postLaunch.status}; blockers: ${postLaunch.blockers.join("; ") || "not specified"}`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Run check-ebos-validation-post-launch again and confirm status is passed before collecting external metrics."
    }));
    return;
  }

  if (postLaunch?.status === "passed") {
    actionItems.unshift(actionItem({
      title: "Collect real validation data",
      description: "post-launch check passed; begin collecting only real CTA, inquiry, order, revenue, refund, and feedback signals.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "External intake input contains only user-provided observed channel metrics and validation report is regenerated."
    }));
    return;
  }

  if (!launchExecutionReport) return;

  if (launchExecutionReport.launchStatus === "blocked") {
    okrs.unshift({
      objective: "Unblock validation launch execution",
      keyResults: [
        { title: "Resolve launch execution blockers", target: launchExecutionReport.blockers.length || 1, unit: "blocker", status: "not_started" },
        { title: "Regenerate launch execution report", target: 1, unit: "report", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Fix validation launch execution blockers",
      description: `launchStatus=blocked; blockers: ${launchExecutionReport.blockers.join("; ") || "not specified"}`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Launch execution report is regenerated with launchStatus no longer blocked."
    }));
    return;
  }

  if (launchExecutionReport.launchStatus === "ready_to_deploy") {
    okrs.unshift({
      objective: "Execute validation deployment for AI Prompt Kit",
      keyResults: [
        { title: "Run launch execution checklist", target: launchExecutionReport.deploymentChecklist.length || 1, unit: "check", status: "not_started" },
        { title: "Generate post-launch dry-run check", target: 1, unit: "report", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Execute validation deployment",
      description: "launchStatus=ready_to_deploy; run deployment checklist and prepare post-launch smoke checks before claiming deployed status.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "medium",
      confidence: "complete",
      verification: "Launch execution JSON/Markdown and post-launch check report exist; deployed status is used only after explicit confirmation."
    }));
    return;
  }

  if (launchExecutionReport.launchStatus === "deployed_pending_verification") {
    actionItems.unshift(actionItem({
      title: "Run validation post-launch smoke check",
      description: "launchStatus=deployed_pending_verification; verify public validation routes before collecting external metrics.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "partial",
      verification: "Post-launch check report status is passed."
    }));
  }
}

function addValidationLaunchReadinessPriority(
  launchReadinessReport: EbosValidationLaunchReadinessReport | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (!launchReadinessReport) return;

  if (launchReadinessReport.readinessStatus === "blocked") {
    okrs.unshift({
      objective: "Fix validation launch blockers before starting real validation",
      keyResults: [
        { title: "Resolve all launch readiness blockers", target: launchReadinessReport.blockers.length || 1, unit: "blocker", status: "not_started" },
        { title: "Regenerate validation launch readiness report", target: 1, unit: "report", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "Fix validation launch blockers",
      description: `readinessStatus=blocked; readinessScore=${launchReadinessReport.readinessScore}; blockers: ${launchReadinessReport.blockers.join("; ") || "not specified"}`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Run check-ebos-validation-launch-readiness and confirm readinessStatus is no longer blocked."
    }));
    return;
  }

  if (launchReadinessReport.readinessStatus === "ready" || launchReadinessReport.readinessStatus === "ready_with_warnings") {
    actionItems.unshift(actionItem({
      title: "Start real validation launch",
      description: `readinessStatus=${launchReadinessReport.readinessStatus}; readinessScore=${launchReadinessReport.readinessScore}. Publish only real validation activity and keep external data empty until observed.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "medium",
      confidence: launchReadinessReport.readinessStatus === "ready" ? "complete" : "partial",
      verification: "Launch runbook exists, validation page is published, and external intake is filled only with real observed data."
    }));
    return;
  }

  actionItems.unshift(actionItem({
    title: "Fix validation launch readiness warnings",
    description: `readinessStatus=${launchReadinessReport.readinessStatus}; warnings: ${launchReadinessReport.warnings.slice(0, 5).join("; ") || "not specified"}`,
    priority: "high",
    sectionKey: "next_plan",
    effort: "low",
    confidence: "partial",
    verification: "Run check-ebos-validation-launch-readiness and confirm readinessStatus is ready or ready_with_warnings."
  }));
}

function addValidationResultPriority(
  validationResultReport: EbosValidationResultReport | null | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  if (validationResultReport === undefined) return;

  if (validationResultReport) {
    addExternalIntakeStatusPriority(validationResultReport, actionItems);
  }

  if (validationResultReport === null || validationResultNeedsRecording(validationResultReport)) {
    okrs.unshift({
      objective: "记录本轮 validation result，给下一次 EBOS 决策提供反馈",
      keyResults: [
        { title: "填写每个 validation plan 的 status、CTA、leads、orders、revenue 或 notes", target: 1, unit: "input", status: "not_started" },
        { title: "生成 validation result report JSON/Markdown", target: 1, unit: "report", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: "记录验证结果并生成 validation result report",
      description: "No completed validation input or usable result signal was found; record manual validation results before the next decision cycle.",
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "reports/ebos/validation/reports contains the next validation-result-report JSON and Markdown."
    }));
    return;
  }

  if ((validationResultReport.captureSummary?.manualSlotsCount ?? 0) > 0) {
    actionItems.unshift(actionItem({
      title: "补充 validation 外部渠道数据",
      description: `Validation capture found ${validationResultReport.captureSummary?.manualSlotsCount ?? 0} manual slots. External marketplace, social, and user-feedback metrics still require real user-provided data and cannot be filled by Codex.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "reports/ebos/validation/inputs includes real listingViews, messages, userFeedback, and channelResults from external channels."
    }));
  }

  const positiveDirections = [
    ...validationResultReport.continueDirections,
    ...validationResultReport.scaleDirections
  ];
  const failedDirections = validationResultReport.stopDirections;

  if (positiveDirections.length > 0) {
    const direction = positiveDirections[0] ?? "validated direction";
    okrs.unshift({
      objective: `Continue validation result winner: ${direction}`,
      keyResults: [
        { title: "Confirm repeatable conversion signal for the validated direction", target: 1, unit: "signal", status: "not_started" },
        { title: "Document next pricing, offer, or channel adjustment", target: 1, unit: "decision", status: "not_started" }
      ]
    });
    actionItems.unshift(actionItem({
      title: `Follow validation result: ${direction}`,
      description: `Latest validation result score=${validationResultReport.overallValidationScore}; continue or scale this direction based on recorded validation result evidence.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "medium",
      confidence: "partial",
      verification: "Next validation result records repeatable paid, presale, lead, or CTA evidence."
    }));
  }

  if (failedDirections.length > 0) {
    actionItems.push(actionItem({
      title: `Pause or adjust failed validation: ${failedDirections[0]}`,
      description: "Latest validation result marked this direction as stop/failed; lower priority until new evidence appears.",
      priority: "medium",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "partial",
      verification: "Next decision report no longer treats the failed validation as the main priority unless new evidence changes it."
    }));
  }
}

function addExternalIntakeStatusPriority(
  validationResultReport: EbosValidationResultReport,
  actionItems: EbosActionItem[]
) {
  const external = validationResultReport.externalIntakeSummary;
  if (!external) return;

  if (external.status === "template_generated_unfilled") {
    actionItems.unshift(actionItem({
      title: "Fill external intake with real channel data (已生成填报模板，但尚未填写真实外部渠道数据)",
      description: `${external.summary}. Use ${external.inputPath ?? "the external intake input"} and keep unknown metrics as 0.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Run import-ebos-external-intake dry-run, then --apply only after the local intake file contains real user-provided channel data."
    }));
    return;
  }

  if (external.status === "input_filled_not_imported" || external.status === "dry_run_available") {
    actionItems.unshift(actionItem({
      title: "Import external intake after dry-run review (external data not yet applied)",
      description: `${external.summary}. Review skipped changes before applying to validation input.`,
      priority: "high",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "External intake import report exists and validation result report references imported external channel data."
    }));
    return;
  }

  if (external.status === "imported") {
    actionItems.unshift(actionItem({
      title: "External intake imported",
      description: `External intake imported ${external.importedChannelsCount} channels and ${external.importedPlansCount} plans with ${external.appliedChangesCount} applied changes.`,
      priority: "medium",
      sectionKey: "next_plan",
      effort: "low",
      confidence: "complete",
      verification: "Validation result report and decision report are regenerated after the external intake import."
    }));
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

function addDecisionReportPriority(
  decisionReport: EbosDecisionReport | undefined,
  okrs: EbosOKR[],
  actionItems: EbosActionItem[]
) {
  const top = decisionReport?.doNext[0];
  if (!top) return;

  okrs.unshift({
    objective: `Validate decision report priority: ${top.title}`,
    keyResults: [
      { title: "Complete the primary validation asset", target: 1, unit: "asset", status: "not_started" },
      { title: "Record CTA clicks, leads, presale, or manual purchase intent", target: 1, unit: "evidence log", status: "not_started" }
    ]
  });

  actionItems.unshift(actionItem({
    title: top.title,
    description: top.reason,
    priority: "high",
    sectionKey: "next_plan",
    effort: "medium",
    confidence: decisionReport.overallConfidence,
    verification: "Next decision report or weekly report records validation result for this top recommendation."
  }));
}

function addCompetitorPublicAuditAction(report: EbosReport, actionItems: EbosActionItem[]) {
  const competitor = report.sections.find((section) => section.key === "competitor");
  if (!competitor) return;
  if (competitor.confidence !== "partial") return;
  if (!competitor.findings.some((finding) => finding.includes("competitor_evidence"))) return;
  if (readCompetitorsAuditedCount(competitor) !== 0) return;
  if (actionItems.some((item) => item.title.includes("public competitor URL audit"))) return;

  actionItems.push(actionItem({
    title: "Run public competitor URL audit",
    description: "Re-run competitor_evidence with --include-network and conservative caps so next reports can use observed public page pricing, FAQ, CTA, SEO, and GEO signals.",
    priority: "medium",
    sectionKey: "competitor",
    effort: "low",
    confidence: "partial",
    verification: "Next competitor_evidence payloadSummary shows competitorsAuditedCount > 0 and pagesSucceeded > 0."
  }));
}

function readCompetitorsAuditedCount(section: EbosReport["sections"][number]) {
  const text = section.findings.join("\n");
  const match = text.match(/competitorsAuditedCount=(\d+)/);
  return match ? Number(match[1]) : null;
}
