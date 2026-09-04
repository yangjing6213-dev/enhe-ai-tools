import { calculateConfidence } from "../confidence";
import { DEFAULT_EBOS_SECTION_KEYS } from "../constants";
import { createDataSourceState } from "../data-source";
import { getWeeklyWindow } from "../date-window";
import { createEmptyWeeklySnapshot, type EbosInternalDatabaseSnapshot, type EbosWeeklySnapshot } from "../adapters/adapter-types";
import { createInternalDatabaseAdapter } from "../adapters/internal-database";
import { createManualInputAdapter } from "../adapters/manual-input";
import { createEmptyEbosReport } from "../report-schema";
import { calculateWeightedScore, getScoreGrade, normalizeScore } from "../score";
import type { EbosActionItem, EbosDataSourceKey, EbosDataSourceState, EbosReport, EbosReportSection, EbosSectionKey, EbosWarning } from "../types";
import { createLowConfidenceWarning, createMissingDataWarning, createNoRevenueWarning, createPartialDataWarning } from "../warnings";
import { calculateWebsiteHealthScore, type EbosWebsiteHealthSnapshot } from "../health";
import type { EbosIntegrationReadinessReport } from "../integrations";
import type { EbosEvidenceCatalogEntry } from "../evidence";
import { renderWeeklyReportHtml } from "./weekly-report-html";
import { renderWeeklyReportMarkdown } from "./weekly-report-markdown";
import { generateNextWeekPlan } from "./weekly-report-plan";
import type { EbosWeeklyReportOptions, EbosWeeklyReportResult } from "./weekly-report-types";

function actionItem(input: Omit<EbosActionItem, "status">): EbosActionItem {
  return { status: "open", ...input };
}

export async function buildWeeklyEbosReport(options: EbosWeeklyReportOptions = {}): Promise<EbosWeeklyReportResult> {
  const targetDate = options.targetDate ?? new Date();
  const period = getWeeklyWindow(targetDate);
  const previousPeriod = getWeeklyWindow(new Date(period.start.getTime() - 24 * 60 * 60 * 1000));
  const adapters = options.adapters ?? [createInternalDatabaseAdapter(), createManualInputAdapter()];
  const snapshot = createEmptyWeeklySnapshot();
  const dataSourceStatus: EbosDataSourceState[] = [];
  const adapterWarnings: EbosWarning[] = [];

  for (const adapter of adapters) {
    try {
      const result = await adapter.readWeeklySnapshot({
        period,
        previousPeriod,
        manualInput: options.manualInput
      });
      dataSourceStatus.push(result.dataSource);
      adapterWarnings.push(...result.warnings);
      if (result.snapshot) mergeSnapshot(snapshot, result.snapshot);
    } catch (error) {
      const warning: EbosWarning = {
        code: "missing_data",
        source: adapter.key,
        severity: "warning",
        message: `EBOS adapter ${adapter.key} 读取失败，周报继续生成：${error instanceof Error ? error.message : "unknown error"}`
      };
      dataSourceStatus.push(createDataSourceState(adapter.key, "unavailable", { warnings: [warning] }));
      adapterWarnings.push(warning);
    }
  }

  const report = createEmptyEbosReport("weekly", targetDate);
  report.sections = DEFAULT_EBOS_SECTION_KEYS.map((key) => buildSection(key, snapshot, dataSourceStatus, options.websiteHealthSnapshot));
  report.warnings = [
    ...adapterWarnings,
    ...(options.evidenceWarnings ?? []),
    ...buildGlobalMissingDataWarnings(),
    ...buildIntegrationReadinessWarnings(options.integrationReadinessReport)
  ];
  report.actionItems = report.sections.flatMap((section) => section.actionItems);
  report.overallScore = calculateWeightedScore(report.sections.map((section) => ({ score: section.score, weight: section.weight })));
  report.confidence = report.warnings.length ? "partial" : calculateConfidence(dataSourceStatus);
  applyEvidenceCatalogEntries(report, options.evidenceCatalogEntries ?? []);
  report.overallScore = calculateWeightedScore(report.sections.map((section) => ({ score: section.score, weight: section.weight })));

  const nextWeekPlan = generateNextWeekPlan(
    report,
    options.decisionReport,
    options.validationResultReport,
    options.validationLaunchReadinessReport,
    options.validationLaunchExecutionReport,
    options.validationPostLaunchCheckReport,
    options.productionDeploymentPreflightReport,
    options.productionDeploymentApprovalGate,
    options.deploymentExecutionStatus,
    options.deploymentOperatorChecklist,
    options.externalPublishingStatus,
    options.syntheticFailureScenarioStatus,
    options.optimizedValidationPageRedeployStatus,
    options.migrationReleaseStatus
  );
  const nextPlanSection = report.sections.find((section) => section.key === "next_plan");
  if (nextPlanSection) {
    nextPlanSection.actionItems = nextWeekPlan.actionItems;
    nextPlanSection.findings = [`下周计划已生成 ${nextWeekPlan.okrs.length} 个 Objective 和 ${nextWeekPlan.actionItems.length} 个 Codex 执行任务。`];
    nextPlanSection.opportunities = ["把 EBOS 周报行动项转成可验收的开发/运营任务。"];
    nextPlanSection.score = normalizeScore(nextWeekPlan.actionItems.length >= 3 ? 70 : 55);
    nextPlanSection.grade = getScoreGrade(nextPlanSection.score);
    nextPlanSection.confidence = "partial";
  }
  report.actionItems = [...report.sections.flatMap((section) => section.actionItems), ...nextWeekPlan.actionItems];
  report.okrs = nextWeekPlan.okrs;

  const markdown = renderWeeklyReportMarkdown(report, nextWeekPlan);
  const html = options.includeHtml === false ? "" : renderWeeklyReportHtml(report, nextWeekPlan);

  return {
    report,
    markdown,
    html,
    nextWeekPlan,
    dataSourceStatus,
    snapshot,
    deploymentExecutionStatus: options.deploymentExecutionStatus,
    externalPublishingStatus: options.externalPublishingStatus,
    syntheticFailureScenarioStatus: options.syntheticFailureScenarioStatus,
    optimizedValidationPageRedeployStatus: options.optimizedValidationPageRedeployStatus,
    migrationReleaseStatus: options.migrationReleaseStatus
  };
}

const EVIDENCE_SECTION_MAP = {
  seo_evidence: "seo",
  geo_evidence: "geo",
  product_evidence: "product",
  revenue_evidence: "revenue",
  market_evidence: "market",
  competitor_evidence: "competitor"
} as const satisfies Partial<Record<EbosEvidenceCatalogEntry["evidenceKind"], EbosSectionKey>>;

function applyEvidenceCatalogEntries(
  report: EbosReport,
  entries: EbosEvidenceCatalogEntry[]
) {
  for (const [kind, sectionKey] of Object.entries(EVIDENCE_SECTION_MAP) as Array<[keyof typeof EVIDENCE_SECTION_MAP, EbosSectionKey]>) {
    const entry = entries
      .filter((item) => item.evidenceKind === kind)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
    if (!entry) continue;

    const section = report.sections.find((item) => item.key === sectionKey);
    if (!section) continue;

    section.score = normalizeScore(entry.score ?? section.score);
    section.grade = getScoreGrade(section.score);
    section.confidence = entry.confidence;
    section.findings = [
      `${kind} is available from ${entry.filePath}.`,
      `Evidence score: ${entry.score ?? "unknown"}.`,
      ...(kind === "competitor_evidence" ? buildCompetitorEvidenceFindings(entry.payloadSummary) : [])
    ];
    section.risks = entry.warnings?.map((warning) => warning.message).slice(0, 5) ?? section.risks;
    section.opportunities = [
      `Use ${kind} action items to make next-week ${sectionKey} work more specific.`
    ];
    section.actionItems = (entry.actionItems ?? []).map((item) => ({
      title: item.title,
      description: item.description,
      priority: item.priority === "critical" ? "high" : item.priority,
      sectionKey,
      status: item.status === "done" ? "done" : "open",
      effort: "medium",
      confidence: entry.confidence,
      verification: `Next ${kind} score improves or this action item is closed.`
    }));
  }
}

function buildCompetitorEvidenceFindings(summary?: Record<string, unknown>) {
  if (!summary) return [];
  const competitorsAuditedCount = readSummaryNumber(summary.competitorsAuditedCount);
  const pagesAttempted = readSummaryNumber(summary.pagesAttempted);
  const pagesSucceeded = readSummaryNumber(summary.pagesSucceeded);
  const pagesFailed = readSummaryNumber(summary.pagesFailed);
  const includeNetworkSources = summary.includeNetworkSources === true;

  return [
    `includeNetworkSources=${String(includeNetworkSources)}.`,
    `competitorsAuditedCount=${competitorsAuditedCount ?? 0}.`,
    `pagesSucceeded=${pagesSucceeded ?? 0}/pagesAttempted=${pagesAttempted ?? 0}; pagesFailed=${pagesFailed ?? 0}.`
  ];
}

function readSummaryNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildSection(
  key: EbosSectionKey,
  snapshot: EbosInternalDatabaseSnapshot,
  dataSourceStatus: EbosDataSourceState[],
  websiteHealthSnapshot?: EbosWebsiteHealthSnapshot
): EbosReportSection {
  switch (key) {
    case "revenue":
      return buildRevenueSection(snapshot, dataSourceStatus);
    case "traffic":
      return buildTrafficSection(snapshot, dataSourceStatus);
    case "seo":
      return buildSeoSection(snapshot, dataSourceStatus);
    case "geo":
      return buildGeoSection(snapshot, dataSourceStatus);
    case "product":
      return buildProductSection(snapshot, dataSourceStatus);
    case "content":
      return buildContentSection(snapshot, dataSourceStatus);
    case "market":
      return buildMissingExternalSection("market", "市场机会", "market_research", "Step 4 接入 market research 后，才能把外部需求信号纳入周报。");
    case "competitor":
      return buildMissingExternalSection("competitor", "竞争对手", "market_research", "当前阶段不抓取竞品数据，需后续建立竞品监测输入。");
    case "website_health":
      return buildWebsiteHealthSection(snapshot, dataSourceStatus, websiteHealthSnapshot);
    case "next_plan":
      return buildBaseSection("next_plan", "下周计划", 55, "partial", ["下周计划会根据所有 section 自动生成。"], ["计划质量依赖上游数据完整度。"], ["把 action item 转成可验收任务。"], [createLowConfidenceWarning("next_plan")]);
  }
}

function buildRevenueSection(snapshot: EbosInternalDatabaseSnapshot, dataSourceStatus: EbosDataSourceState[]) {
  const { orders } = snapshot;
  const warnings: EbosWarning[] = [];
  let score = orders.weeklyRevenue > 0 ? 60 : 25;
  if (orders.previousWeeklyRevenue > 0 && orders.weeklyRevenue > orders.previousWeeklyRevenue) score += 15;
  if (orders.paidOrders > 0) score += 10;
  if (orders.weeklyRevenue === 0) warnings.push(createNoRevenueWarning());

  return buildBaseSection(
    "revenue",
    "收入分析",
    score,
    calculateConfidence(dataSourceStatus),
    [
      `本周收入 CNY ${orders.weeklyRevenue.toFixed(2)}，本周订单 ${orders.weeklyOrders} 个，累计已支付/已激活订单 ${orders.paidOrders} 个。`,
      `累计退款记录 ${orders.refunds} 条。`
    ],
    orders.weeklyRevenue === 0 ? ["本周没有检测到收入，必须优先验证真实支付路径。"] : [],
    orders.weeklyRevenue > 0 ? ["复盘收入来源页面，扩大同类产品和内容入口。"] : ["优先验证第一批真实收入。"],
    warnings,
    [
      actionItem({
        title: orders.weeklyRevenue === 0 ? "优先验证第一批真实收入" : "复盘已产生收入的入口",
        priority: "high",
        sectionKey: "revenue",
        targetAdminPath: "/admin/orders",
        effort: "medium",
        confidence: "partial",
        verification: "检查后台订单、支付记录和支付失败原因。"
      })
    ],
    dataSourceStatus
  );
}

function buildProductSection(snapshot: EbosInternalDatabaseSnapshot, dataSourceStatus: EbosDataSourceState[]) {
  const { products, orders } = snapshot;
  const warnings: EbosWarning[] = [];
  let score = products.publishedProducts > 0 ? 55 : 30;
  if (products.newProductsThisWeek > 0) score += 10;
  if (products.totalDownloads + products.totalUsage > 0) score += 10;
  if (orders.totalOrders > 0) score += 10;
  if (products.publishedProducts === 0) warnings.push(createLowConfidenceWarning("product"));

  return buildBaseSection(
    "product",
    "产品分析",
    score,
    calculateConfidence(dataSourceStatus),
    [
      `当前产品 ${products.totalProducts} 个，已发布 ${products.publishedProducts} 个，本周新增 ${products.newProductsThisWeek} 个。`,
      `累计下载 ${products.totalDownloads} 次，累计使用 ${products.totalUsage} 次。`
    ],
    products.publishedProducts === 0 ? ["没有已发布产品会阻断收入与转化验证。"] : [],
    ["优先优化高意图产品页的 FAQ、截图/视频、价格规格和购买入口。"],
    warnings,
    [
      actionItem({
        title: "检查产品页承接能力",
        priority: "high",
        sectionKey: "product",
        targetAdminPath: "/admin/software",
        effort: "medium",
        confidence: "partial",
        verification: "至少完成 3 个已发布产品页的购买入口、FAQ、媒体资产检查。"
      })
    ],
    dataSourceStatus
  );
}

function buildContentSection(snapshot: EbosInternalDatabaseSnapshot, dataSourceStatus: EbosDataSourceState[]) {
  const { content, seo } = snapshot;
  const warnings: EbosWarning[] = [];
  let score = content.aiNewsArticles > 0 ? 55 : 30;
  if (content.newAiNewsThisWeek + content.newAiTrendBriefingsThisWeek > 0) score += 15;
  if (seo.conversionEvents === 0) warnings.push({
    code: "partial_data",
    section: "content",
    severity: "warning",
    message: "当前内容没有检测到转化事件，需补充产品/服务/教程入口。"
  });

  return buildBaseSection(
    "content",
    "内容分析",
    score,
    calculateConfidence(dataSourceStatus),
    [
      `AI 资讯 ${content.aiNewsArticles} 篇，本周新增 ${content.newAiNewsThisWeek} 篇。`,
      `AI 趋势简报 ${content.aiTrendBriefings} 篇，本周新增 ${content.newAiTrendBriefingsThisWeek} 篇。`
    ],
    warnings.map((warning) => warning.message),
    ["把高意图 AI 资讯连接到产品、教程、账号服务或趋势页。"],
    warnings,
    [
      actionItem({
        title: "为高意图内容补转化入口",
        priority: "medium",
        sectionKey: "content",
        targetAdminPath: "/admin/ai-news",
        effort: "medium",
        confidence: "partial",
        verification: "至少 3 篇内容新增自然内部链接和下一步 CTA。"
      })
    ],
    dataSourceStatus
  );
}

function buildTrafficSection(snapshot: EbosInternalDatabaseSnapshot, dataSourceStatus: EbosDataSourceState[]) {
  const { seo, websiteHealth } = snapshot;
  const score = seo.seoLandingViews > 0 || websiteHealth.analyticsEvents > 0 ? 55 : 35;
  const warnings = [
    createMissingDataWarning("google_analytics"),
    createMissingDataWarning("cloudflare")
  ];

  return buildBaseSection(
    "traffic",
    "流量分析",
    score,
    "partial",
    [`本周站内 analytics 事件 ${websiteHealth.analyticsEvents} 条，SEO landing view ${seo.seoLandingViews} 条。`],
    seo.seoLandingViews === 0 ? ["当前站内未检测到 SEO landing view，需要确认埋点和流量入口。"] : [],
    ["接入 Google Analytics 或 Cloudflare 后，可以补齐来源、地域和会话层数据。"],
    warnings,
    [
      actionItem({
        title: "补齐流量来源数据源",
        priority: "medium",
        sectionKey: "traffic",
        effort: "medium",
        confidence: "unknown",
        verification: "下一版 EBOS 可展示 GA/Cloudflare 或明确 warning。"
      })
    ],
    dataSourceStatus
  );
}

function buildSeoSection(snapshot: EbosInternalDatabaseSnapshot, dataSourceStatus: EbosDataSourceState[]) {
  const { seo } = snapshot;
  const score = seo.seoLandingViews > 0 ? 55 + Math.min(20, seo.searchEvents * 2) : 35;
  const warnings = [createMissingDataWarning("google_search_console")];

  return buildBaseSection(
    "seo",
    "SEO 分析",
    score,
    "partial",
    [`站内 SEO landing view ${seo.seoLandingViews} 次，organic ${seo.organicLandings} 次，AI answer ${seo.aiAnswerLandings} 次。`],
    ["尚未接入 Google Search Console，无法判断曝光、点击、CTR 和平均排名。"],
    ["优先把站内高意图搜索词与 GSC 查询数据打通。"],
    warnings,
    [
      actionItem({
        title: "接入 Google Search Console 查询数据",
        priority: "medium",
        sectionKey: "seo",
        effort: "medium",
        confidence: "unknown",
        verification: "周报展示 query/page/click/impression 或明确缺失原因。"
      })
    ],
    dataSourceStatus
  );
}

function buildGeoSection(snapshot: EbosInternalDatabaseSnapshot, dataSourceStatus: EbosDataSourceState[]) {
  const { geo } = snapshot;
  const score = geo.reviewedResults > 0 ? 45 + Math.round((geo.brandMentionRate + geo.domainCitationRate) / 4) : geo.queries > 0 ? 40 : 30;
  const warnings = [createMissingDataWarning("ai_search_probe")];

  return buildBaseSection(
    "geo",
    "GEO 分析",
    score,
    geo.reviewedResults > 0 ? "partial" : "unknown",
    [`GEO 查询 ${geo.queries} 条，平台 ${geo.providers} 个，本周已记录结果 ${geo.reviewedResults} 条。`],
    geo.reviewedResults === 0 ? ["GEO 模块已有结构，但本周没有可用回答引擎结果。"] : [],
    ["接入 AI Search Probe，记录品牌提及率、域名引用率和竞品出现频率。"],
    warnings,
    [
      actionItem({
        title: "建立 AI Search Probe 抽样",
        priority: "medium",
        sectionKey: "geo",
        targetAdminPath: "/admin/geo-monitoring",
        effort: "medium",
        confidence: "unknown",
        verification: "至少记录 10 条回答引擎查询结果。"
      })
    ],
    dataSourceStatus
  );
}

function buildWebsiteHealthSection(
  snapshot: EbosInternalDatabaseSnapshot,
  dataSourceStatus: EbosDataSourceState[],
  websiteHealthSnapshot?: EbosWebsiteHealthSnapshot
) {
  if (websiteHealthSnapshot) {
    const healthScore = calculateWebsiteHealthScore(websiteHealthSnapshot);
    const warnings = healthScore.risks
      .filter((risk) => risk.severity !== "info")
      .map((risk): EbosWarning => ({
        code: "partial_data",
        section: "website_health",
        severity: risk.severity === "critical" ? "critical" : "warning",
        message: risk.message
      }));

    return buildBaseSection(
      "website_health",
      "网站健康",
      healthScore.score,
      healthScore.confidence,
      healthScore.findings.map((finding) => finding.message),
      healthScore.risks.map((risk) => risk.message),
      healthScore.recommendations.map((recommendation) => recommendation.message),
      warnings,
      healthScore.recommendations.map((recommendation) => actionItem({
        title: recommendation.message,
        priority: recommendation.priority,
        sectionKey: "website_health",
        effort: "medium",
        confidence: healthScore.confidence,
        verification: "下一次 EBOS health snapshot 中对应检查通过或被明确标记为 skipped。"
      })),
      dataSourceStatus
    );
  }

  const { websiteHealth } = snapshot;
  const warnings = [createPartialDataWarning("manual_input")];
  return buildBaseSection(
    "website_health",
    "网站健康",
    websiteHealth.analyticsEvents > 0 ? 55 : 45,
    "partial",
    [
      `当前用户 ${websiteHealth.users} 个，本周新增用户 ${websiteHealth.weeklyUsers} 个。`,
      `Baidu push 待处理 ${websiteHealth.pendingBaiduPushItems} 条，评论 ${websiteHealth.comments} 条。`
    ],
    ["当前阶段无法从周报内直接读取 lint/typecheck/build/Playwright/Lighthouse 结果。"],
    ["Step 3 接入 Playwright/Lighthouse 后，可补齐性能、可访问性和核心路径健康度。"],
    warnings,
    [
      actionItem({
        title: "接入站点健康自动巡检",
        priority: "medium",
        sectionKey: "website_health",
        effort: "medium",
        confidence: "partial",
        verification: "周报可展示 lint/typecheck/build/Playwright/Lighthouse 状态。"
      })
    ],
    dataSourceStatus
  );
}

function buildMissingExternalSection(
  key: EbosSectionKey,
  title: string,
  source: "market_research" | "manual_input",
  finding: string
) {
  const warning = createMissingDataWarning(source);
  return buildBaseSection(
    key,
    title,
    null,
    "unknown",
    [finding],
    ["当前阶段未接外部 API 或人工输入，不能生成市场/竞品结论。"],
    ["Step 4 接入 market research 或人工输入后再进行判断。"],
    [warning],
    [
      actionItem({
        title: key === "market" ? "接入 market research 输入" : "建立竞品监测输入",
        priority: "medium",
        sectionKey: key,
        effort: "medium",
        confidence: "unknown",
        verification: "下一版 EBOS 周报包含来源、时间和置信度标注。"
      })
    ],
    [createDataSourceState(source, "not_configured")]
  );
}

function buildBaseSection(
  key: EbosSectionKey,
  title: string,
  rawScore: number | null,
  confidence: EbosReportSection["confidence"],
  findings: string[],
  risks: string[],
  opportunities: string[],
  warnings: EbosWarning[],
  actionItems: EbosActionItem[] = [],
  dataSources: EbosDataSourceState[] = []
): EbosReportSection {
  const score = normalizeScore(rawScore);
  return {
    key,
    title,
    score,
    grade: getScoreGrade(score),
    confidence,
    findings: findings.length ? findings : ["当前没有足够数据形成判断，已生成数据缺口提醒。"],
    risks: risks.length ? risks : ["暂无高置信度风险，但数据仍需补齐。"],
    opportunities: opportunities.length ? opportunities : ["补齐数据源后再识别机会。"],
    actionItems: actionItems.length ? actionItems : [
      actionItem({
        title: `补齐 ${title} 数据源`,
        priority: "medium",
        sectionKey: key,
        effort: "medium",
        confidence: "unknown",
        verification: "下一版周报该 section 不再为空。"
      })
    ],
    warnings,
    dataSources,
    weight: 1
  };
}

function buildGlobalMissingDataWarnings() {
  return [
    createMissingDataWarning("google_search_console"),
    createMissingDataWarning("google_analytics"),
    createMissingDataWarning("cloudflare"),
    createMissingDataWarning("whop"),
    createMissingDataWarning("market_research"),
    createMissingDataWarning("ai_search_probe")
  ];
}

function buildIntegrationReadinessWarnings(report?: EbosIntegrationReadinessReport): EbosWarning[] {
  if (!report) return [];

  return report.checks
    .filter((check) => ["missing_config", "not_configured", "unavailable", "unknown"].includes(check.status))
    .map((check) => ({
      code: "missing_data",
      source: check.key as EbosDataSourceKey,
      severity: "warning",
      message: `${check.label} data source is ${check.status}. Missing config: ${check.missingEnvKeys.length ? check.missingEnvKeys.join(", ") : "none recorded"}.`
    }));
}

function mergeSnapshot(target: EbosInternalDatabaseSnapshot, source: EbosWeeklySnapshot) {
  mergeNumberObject(target.products, source.products);
  mergeNumberObject(target.orders, source.orders);
  mergeNumberObject(target.content, source.content);
  mergeNumberObject(target.seo, source.seo);
  mergeNumberObject(target.geo, source.geo);
  mergeNumberObject(target.websiteHealth, source.websiteHealth);
}

function mergeNumberObject<T extends Record<string, number>>(target: T, source?: Partial<T>) {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      target[key as keyof T] = ((target[key as keyof T] ?? 0) + value) as T[keyof T];
    }
  }
}
