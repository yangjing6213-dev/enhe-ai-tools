import {
  getEvidenceForPeriod,
  readEvidenceCatalog,
  type EbosEvidenceCatalog,
  type EbosEvidenceCatalogEntry
} from "../evidence";
import type { EbosConfidenceLevel } from "../types";
import { generateMonthlyReviewPlan } from "./monthly-review-plan";
import type {
  EbosMonthlyEvidenceUsed,
  EbosMonthlyReview,
  EbosMonthlyReviewBuildOptions,
  EbosMonthlyStrategicFinding
} from "./monthly-review-types";

const DEFAULT_CATALOG_PATH = "reports/ebos/evidence/catalog/latest-evidence-catalog.json";
const REQUIRED_KINDS = ["weekly_report", "health_snapshot", "data_source_readiness"] as const;

export async function buildMonthlyEbosReview(
  options: EbosMonthlyReviewBuildOptions = {}
): Promise<EbosMonthlyReview> {
  const targetDate = options.targetDate ?? new Date();
  const period = getMonthPeriod(targetDate);
  const catalogPath = options.catalogPath ?? DEFAULT_CATALOG_PATH;
  const catalog = options.catalog ?? await readEvidenceCatalog({ catalogPath }) ?? emptyCatalog(catalogPath);
  const evidenceEntries = getMonthlyEvidence(catalog, period.start, period.end);
  const evidenceUsed = evidenceEntries.map(toEvidenceUsed);
  const dataGaps = buildDataGaps(evidenceEntries, catalog.summary.missingKinds);
  const sampleIsThin = evidenceUsed.length < 5;
  const warnings = buildWarnings(dataGaps, sampleIsThin);
  const overallScore = calculateAverageScore(evidenceEntries);
  const confidence = calculateMonthlyConfidence(evidenceEntries, dataGaps, sampleIsThin);
  const plan = generateMonthlyReviewPlan({
    evidenceEntries,
    missingKinds: catalog.summary.missingKinds,
    openActionItemsCount: countOpenActionItems(evidenceEntries, catalog),
    sampleIsThin,
    decisionReport: options.decisionReport,
    validationResultReport: options.validationResultReport,
    launchReadinessReport: options.validationLaunchReadinessReport,
    launchExecutionReport: options.validationLaunchExecutionReport,
    postLaunchCheckReport: options.validationPostLaunchCheckReport,
    productionDeploymentPreflightReport: options.productionDeploymentPreflightReport,
    productionDeploymentApprovalGate: options.productionDeploymentApprovalGate,
    deploymentExecutionStatus: options.deploymentExecutionStatus,
    deploymentOperatorChecklist: options.deploymentOperatorChecklist,
    externalPublishingStatus: options.externalPublishingStatus,
    syntheticFailureScenarioStatus: options.syntheticFailureScenarioStatus,
    optimizedValidationPageRedeployStatus: options.optimizedValidationPageRedeployStatus,
    migrationReleaseStatus: options.migrationReleaseStatus
  });
  const majorWins = buildMajorWins(evidenceEntries);
  const majorRisks = buildMajorRisks(evidenceEntries, catalog, dataGaps);
  const growthOpportunities = buildGrowthOpportunities(catalog.summary.missingKinds);
  const strategicFindings = [
    ...majorWins,
    ...majorRisks,
    ...growthOpportunities
  ];

  return {
    reportType: "monthly",
    targetMonth: period.month,
    periodStart: period.start,
    periodEnd: period.end,
    generatedAt: new Date().toISOString(),
    evidenceCatalogPath: catalogPath,
    evidenceUsed,
    overallScore,
    confidence,
    executiveSummary: buildExecutiveSummary(overallScore, confidence, sampleIsThin, options.manualInput?.executiveNote),
    strategicFindings,
    majorWins,
    majorRisks,
    failedAssumptions: buildFailedAssumptions(dataGaps),
    growthOpportunities,
    stopDoing: plan.stopDoing,
    keepDoing: plan.keepDoing,
    startDoing: plan.startDoing,
    nextMonthOKRs: plan.nextMonthOKRs,
    codexTasks: plan.codexTasks,
    dataGaps,
    warnings,
    actionItems: plan.actionItems,
    deploymentExecutionStatus: options.deploymentExecutionStatus,
    externalPublishingStatus: options.externalPublishingStatus,
    syntheticFailureScenarioStatus: options.syntheticFailureScenarioStatus,
    optimizedValidationPageRedeployStatus: options.optimizedValidationPageRedeployStatus,
    migrationReleaseStatus: options.migrationReleaseStatus
  };
}

function getMonthlyEvidence(
  catalog: EbosEvidenceCatalog,
  start: string,
  end: string
) {
  const byTargetDate = getEvidenceForPeriod(catalog, start, end);
  const overlapping = catalog.entries.filter((entry) => {
    if (!entry.periodStart || !entry.periodEnd) return false;
    return entry.periodStart <= end && entry.periodEnd >= start;
  });
  const merged = new Map<string, EbosEvidenceCatalogEntry>();

  for (const entry of [...byTargetDate, ...overlapping]) {
    merged.set(entry.id, entry);
  }

  return [...merged.values()].sort((a, b) => {
    const generated = b.generatedAt.localeCompare(a.generatedAt);
    if (generated !== 0) return generated;
    return a.id.localeCompare(b.id);
  });
}

function toEvidenceUsed(entry: EbosEvidenceCatalogEntry): EbosMonthlyEvidenceUsed {
  return {
    catalogEntryId: entry.id,
    evidenceKind: entry.evidenceKind,
    targetDate: entry.targetDate,
    score: entry.score,
    confidence: entry.confidence,
    filePath: entry.filePath,
    summary: entry.payloadSummary
  };
}

function buildDataGaps(
  entries: EbosEvidenceCatalogEntry[],
  missingKinds: string[]
) {
  const presentKinds = new Set(entries.map((entry) => entry.evidenceKind));
  const gaps: string[] = [];

  for (const kind of REQUIRED_KINDS) {
    if (!presentKinds.has(kind)) {
      gaps.push(`缺少 ${kind} evidence。`);
    }
  }

  for (const kind of ["revenue_evidence", "product_evidence", "seo_evidence", "geo_evidence"]) {
    if (missingKinds.includes(kind)) {
      gaps.push(`缺少 ${kind}，相关结论只能标记为机会或风险，不能作为事实。`);
    }
  }

  return gaps;
}

function buildWarnings(dataGaps: string[], sampleIsThin: boolean) {
  return [
    ...(sampleIsThin
      ? [{
          code: "partial_data" as const,
          severity: "warning" as const,
          message: "Monthly Review evidence 样本不足，当前结论只适合作为方向性判断。"
        }]
      : []),
    ...dataGaps.map((gap, index) => ({
      code: "missing_data" as const,
      severity: "warning" as const,
      message: gap,
      source: undefined,
      recommendation: index === 0 ? "优先补齐 catalog 中缺失的 evidence kind。" : undefined
    }))
  ];
}

function calculateAverageScore(entries: EbosEvidenceCatalogEntry[]) {
  const scores = entries
    .map((entry) => entry.score)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));

  if (scores.length === 0) return null;
  return Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2));
}

function calculateMonthlyConfidence(
  entries: EbosEvidenceCatalogEntry[],
  dataGaps: string[],
  sampleIsThin: boolean
): EbosConfidenceLevel {
  if (entries.length === 0) return "unknown";
  if (!sampleIsThin && dataGaps.length === 0 && entries.every((entry) => entry.confidence === "complete")) return "complete";
  return "partial";
}

function buildMajorWins(entries: EbosEvidenceCatalogEntry[]): EbosMonthlyStrategicFinding[] {
  const health = entries.find((entry) => entry.evidenceKind === "health_snapshot");
  if (typeof health?.score === "number" && health.score >= 85) {
    return [finding(
      "技术健康基础较好",
      `health_snapshot score 为 ${health.score}，说明构建、类型检查、EBOS 测试和关键页面健康基础较好。`,
      [health.id],
      "info",
      "继续保持构建、类型检查、EBOS 测试健康。"
    )];
  }
  return [];
}

function buildMajorRisks(
  entries: EbosEvidenceCatalogEntry[],
  catalog: EbosEvidenceCatalog,
  dataGaps: string[]
): EbosMonthlyStrategicFinding[] {
  const risks: EbosMonthlyStrategicFinding[] = [];
  const dataSource = entries.find((entry) => entry.evidenceKind === "data_source_readiness");
  const weekly = entries.find((entry) => entry.evidenceKind === "weekly_report");
  const openActionItemsCount = countOpenActionItems(entries, catalog);

  if ((dataSource?.warningsCount ?? 0) >= 5 || dataGaps.some((gap) => gap.includes("data_source_readiness"))) {
    risks.push(finding(
      "经营数据源不足",
      "data_source_readiness 显示多个关键经营数据源仍缺失，月度复盘不能形成完整收入、流量、SEO/GEO 事实链。",
      dataSource ? [dataSource.id] : [],
      "warning",
      "优先补齐收入、SEO/GEO、流量和产品转化 evidence。"
    ));
  }

  if ((weekly?.actionItemsCount ?? openActionItemsCount) >= 10) {
    risks.push(finding(
      "执行积压风险",
      `当前 open action items 约 ${weekly?.actionItemsCount ?? openActionItemsCount} 个，可能导致计划持续新增但无法关闭。`,
      weekly ? [weekly.id] : [],
      "warning",
      "下月 OKR 必须包含减少执行积压。"
    ));
  }

  return risks;
}

function buildGrowthOpportunities(missingKinds: string[]): EbosMonthlyStrategicFinding[] {
  if (missingKinds.includes("revenue_evidence") || missingKinds.includes("product_evidence")) {
    return [finding(
      "优先建立收入与产品转化证据",
      "当前缺少 revenue_evidence 或 product_evidence，最有价值的增长机会是把产品访问、下载、购买、退款和收入证据链打通。",
      [],
      "opportunity",
      "先建立收入和产品转化 evidence，再优化投放或内容扩张。"
    )];
  }
  return [];
}

function buildFailedAssumptions(dataGaps: string[]): EbosMonthlyStrategicFinding[] {
  if (dataGaps.length === 0) return [];
  return [finding(
    "不能假设收入、流量或订单已经被验证",
    "当前 evidence 样本不足或关键 evidence 缺失，收入、流量、订单只能作为待验证对象。",
    [],
    "warning",
    "所有经营判断必须回到 catalog evidence。"
  )];
}

function buildExecutiveSummary(
  overallScore: number | null,
  confidence: EbosConfidenceLevel,
  sampleIsThin: boolean,
  manualNote?: string
) {
  const sampleNote = sampleIsThin ? "当前 evidence 样本不足，结论只适合作为方向性判断；" : "";
  const scoreText = overallScore === null ? "暂无可计算经营评分" : `本月 evidence 平均分为 ${overallScore}`;
  const note = manualNote ? ` ${manualNote}` : "";
  return `${sampleNote}${scoreText}，confidence 为 ${confidence}。下月重点是补齐经营证据链、减少执行积压，并建立收入与产品转化 evidence。${note}`;
}

function countOpenActionItems(
  entries: EbosEvidenceCatalogEntry[],
  catalog: EbosEvidenceCatalog
) {
  const current = entries.reduce((total, entry) => total + entry.actionItemsCount, 0);
  return current || catalog.summary.openActionItemsCount;
}

function finding(
  title: string,
  description: string,
  evidenceRefs: string[],
  severity: EbosMonthlyStrategicFinding["severity"],
  recommendation: string
): EbosMonthlyStrategicFinding {
  return {
    title,
    description,
    evidenceRefs,
    severity,
    recommendation
  };
}

function emptyCatalog(rootDir: string): EbosEvidenceCatalog {
  return {
    catalogVersion: "ebos-evidence-catalog-v1",
    generatedAt: new Date().toISOString(),
    rootDir,
    totalEntries: 0,
    entries: [],
    summary: {
      byKind: {},
      byConfidence: {},
      byValidationStatus: {},
      latestByKind: {},
      missingKinds: [
        "health_snapshot",
        "data_source_readiness",
        "weekly_report",
        "monthly_review",
        "seo_evidence",
        "geo_evidence",
        "market_evidence",
        "competitor_evidence",
        "revenue_evidence",
        "product_evidence"
      ],
      averageScore: null,
      criticalWarningsCount: 0,
      openActionItemsCount: 0,
      dateRange: null
    }
  };
}

function getMonthPeriod(date: Date) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const start = `${month}-01`;
  const endDate = new Date(year, monthIndex + 1, 0);
  const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;

  return { month, start, end };
}
