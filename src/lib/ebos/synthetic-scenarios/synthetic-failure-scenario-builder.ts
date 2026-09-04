import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosSyntheticChannelResult,
  EbosSyntheticFailureAnalysis,
  EbosSyntheticFailureScenario,
  EbosSyntheticOptimizationImplementation,
  EbosSyntheticOptimizationPlan,
  EbosSyntheticScenarioStatusSummary
} from "./synthetic-scenario-types";

const SYNTHETIC_WARNINGS = [
  "This is synthetic data.",
  "Do not backfill as real data.",
  "Do not use for revenue evidence.",
  "Do not claim real market validation."
] as const;

export function buildSyntheticFailureScenario(options: {
  targetDate: string | Date;
  now?: string | Date;
  simulationPurpose?: string;
}): EbosSyntheticFailureScenario {
  const targetDate = toDateKey(options.targetDate);
  const simulatedChannelResults = buildWorstCaseChannelResults();

  return {
    scenarioType: "synthetic_failure_scenario",
    targetDate,
    generatedAt: toIso(options.now ?? new Date()),
    synthetic: true,
    simulationPurpose: options.simulationPurpose
      ?? "Use a clearly marked worst-case synthetic scenario to stress-test page copy, offer clarity, channel fit, and next validation priorities without polluting real EBOS data.",
    failureAssumptions: [
      "No real external publishing results are available yet.",
      "The validation page is live, but demand, message, lead, order, and revenue signals are still unobserved.",
      "The simulation intentionally assumes weak exposure, weak interaction, zero leads, zero paid orders, and zero revenue.",
      "The scenario is for diagnosis and planning only, not for revenue, validation, or decision evidence."
    ],
    simulatedChannelResults,
    simulatedFunnelSummary: summarizeSyntheticFunnel(simulatedChannelResults),
    constraints: [
      "Synthetic results must stay under reports/ebos/external-publishing/simulations/.",
      "Synthetic results must not be written into external-publish-result-input.json.",
      "Synthetic results must not be written into external-intake-input.json.",
      "Synthetic results must not be used to set hasRealSignals=true.",
      "Synthetic results must not be used to set canBackfill=true.",
      "Synthetic results must not be counted as revenue, order, inquiry, or user feedback evidence."
    ],
    warnings: [...SYNTHETIC_WARNINGS]
  };
}

export async function readSyntheticFailureScenarioStatusForDate(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}): Promise<EbosSyntheticScenarioStatusSummary> {
  const targetDate = toDateKey(options.targetDate);
  const root = options.reportsRoot ?? join("reports", "ebos");
  const simulationsDir = join(root, "external-publishing", "simulations");
  const scenarioPath = join(simulationsDir, `${targetDate}-synthetic-failure-scenario.json`);
  const analysisPath = join(simulationsDir, `${targetDate}-synthetic-failure-analysis.json`);
  const optimizationPlanPath = join(simulationsDir, `${targetDate}-synthetic-optimization-plan.json`);
  const optimizationImplementationPath = join(simulationsDir, `${targetDate}-synthetic-optimization-implementation.json`);
  const scenario = await readJsonIfExists<EbosSyntheticFailureScenario>(scenarioPath);
  const analysis = await readJsonIfExists<EbosSyntheticFailureAnalysis>(analysisPath);
  const optimizationPlan = await readJsonIfExists<EbosSyntheticOptimizationPlan>(optimizationPlanPath);
  const optimizationImplementation = await readJsonIfExists<EbosSyntheticOptimizationImplementation>(optimizationImplementationPath);

  if (!scenario) {
    return {
      status: "not_generated",
      targetDate,
      synthetic: false,
      simulated: false,
      simulatedRevenue: 0,
      simulatedPaidOrders: 0,
      likelyFailureReasonsCount: 0,
      priorityFixesCount: 0,
      nextExperimentActionsCount: 0,
      warnings: [],
      summary: "No synthetic failure scenario exists for this date."
    };
  }

  return {
    status: "generated",
    targetDate,
    synthetic: scenario.synthetic === true,
    simulated: true,
    scenarioPath,
    ...(await exists(analysisPath) ? { analysisPath } : {}),
    ...(await exists(optimizationPlanPath) ? { optimizationPlanPath } : {}),
    ...(await exists(optimizationImplementationPath) ? { optimizationImplementationPath } : {}),
    optimizationImplementationCompleted: optimizationImplementation?.reportType === "synthetic_optimization_implementation",
    simulatedRevenue: scenario.simulatedFunnelSummary.simulatedRevenue,
    simulatedPaidOrders: scenario.simulatedFunnelSummary.simulatedPaidOrders,
    likelyFailureReasonsCount: analysis?.likelyFailureReasons.length ?? 0,
    priorityFixesCount: optimizationPlan?.priorityFixes.length ?? 0,
    nextExperimentActionsCount: optimizationPlan?.nextSprintActions.length ?? analysis?.nextExperimentPlan.length ?? 0,
    implementedFixesCount: optimizationImplementation?.implementedFixes.length ?? 0,
    nextRealValidationActionsCount: optimizationImplementation?.nextRealValidationPlan.length ?? 0,
    warnings: [
      ...scenario.warnings,
      ...(analysis?.warnings ?? []),
      ...(optimizationPlan?.warnings ?? []),
      ...(optimizationImplementation?.warnings ?? [])
    ],
    summary: optimizationImplementation
      ? "Synthetic failure scenario and optimization implementation exist. Treat both as simulated planning and copy/page implementation only; next step is real publishing validation with observed data."
      : "Synthetic failure scenario exists. Treat it as simulated planning input only; do not backfill or count it as real validation data."
  };
}

function buildWorstCaseChannelResults(): EbosSyntheticChannelResult[] {
  return [
    {
      channel: "manual_outreach",
      simulatedPublished: true,
      simulatedViews: 0,
      simulatedClicks: 0,
      simulatedSaves: 0,
      simulatedShares: 0,
      simulatedMessages: 10,
      simulatedLeads: 0,
      simulatedPositiveReplies: 0,
      simulatedNegativeReplies: 2,
      simulatedOrders: 0,
      simulatedPaidOrders: 0,
      simulatedRevenue: 0,
      simulatedRefundCount: 0,
      simulatedFeedbackThemes: [
        "Value proposition unclear",
        "No immediate reason to continue",
        "No concrete free sample"
      ],
      failureNotes: "10 人触达后无人愿意继续了解或购买。"
    },
    {
      channel: "wechat",
      simulatedPublished: true,
      simulatedViews: 20,
      simulatedClicks: 1,
      simulatedSaves: 0,
      simulatedShares: 0,
      simulatedMessages: 0,
      simulatedLeads: 0,
      simulatedPositiveReplies: 0,
      simulatedNegativeReplies: 0,
      simulatedOrders: 0,
      simulatedPaidOrders: 0,
      simulatedRevenue: 0,
      simulatedRefundCount: 0,
      simulatedFeedbackThemes: [
        "Private traffic exposure is low",
        "CTA does not trigger a reply"
      ],
      failureNotes: "私域内容曝光低，无咨询。"
    },
    {
      channel: "xiaohongshu",
      simulatedPublished: true,
      simulatedViews: 80,
      simulatedClicks: 0,
      simulatedSaves: 0,
      simulatedShares: 0,
      simulatedMessages: 0,
      simulatedLeads: 0,
      simulatedPositiveReplies: 0,
      simulatedNegativeReplies: 0,
      simulatedOrders: 0,
      simulatedPaidOrders: 0,
      simulatedRevenue: 0,
      simulatedRefundCount: 0,
      simulatedFeedbackThemes: [
        "Weak hook",
        "No save-worthy template preview",
        "No visible proof"
      ],
      failureNotes: "有少量曝光，但没有互动和转化。"
    },
    {
      channel: "xianyu",
      simulatedPublished: false,
      simulatedViews: 0,
      simulatedClicks: 0,
      simulatedSaves: 0,
      simulatedShares: 0,
      simulatedMessages: 0,
      simulatedLeads: 0,
      simulatedPositiveReplies: 0,
      simulatedNegativeReplies: 0,
      simulatedOrders: 0,
      simulatedPaidOrders: 0,
      simulatedRevenue: 0,
      simulatedRefundCount: 0,
      simulatedFeedbackThemes: [],
      failureNotes: "未发布，不纳入真实判断。"
    },
    {
      channel: "taobao",
      simulatedPublished: false,
      simulatedViews: 0,
      simulatedClicks: 0,
      simulatedSaves: 0,
      simulatedShares: 0,
      simulatedMessages: 0,
      simulatedLeads: 0,
      simulatedPositiveReplies: 0,
      simulatedNegativeReplies: 0,
      simulatedOrders: 0,
      simulatedPaidOrders: 0,
      simulatedRevenue: 0,
      simulatedRefundCount: 0,
      simulatedFeedbackThemes: [],
      failureNotes: "未发布，不纳入真实判断。"
    },
    {
      channel: "whop",
      simulatedPublished: false,
      simulatedViews: 0,
      simulatedClicks: 0,
      simulatedSaves: 0,
      simulatedShares: 0,
      simulatedMessages: 0,
      simulatedLeads: 0,
      simulatedPositiveReplies: 0,
      simulatedNegativeReplies: 0,
      simulatedOrders: 0,
      simulatedPaidOrders: 0,
      simulatedRevenue: 0,
      simulatedRefundCount: 0,
      simulatedFeedbackThemes: [],
      failureNotes: "未发布，不纳入真实判断。"
    }
  ];
}

function summarizeSyntheticFunnel(results: EbosSyntheticChannelResult[]) {
  const total = results.reduce((summary, result) => ({
    simulatedPublishedChannelsCount: summary.simulatedPublishedChannelsCount + (result.simulatedPublished ? 1 : 0),
    simulatedViews: summary.simulatedViews + result.simulatedViews,
    simulatedClicks: summary.simulatedClicks + result.simulatedClicks,
    simulatedSaves: summary.simulatedSaves + result.simulatedSaves,
    simulatedShares: summary.simulatedShares + result.simulatedShares,
    simulatedMessages: summary.simulatedMessages + result.simulatedMessages,
    simulatedLeads: summary.simulatedLeads + result.simulatedLeads,
    simulatedPositiveReplies: summary.simulatedPositiveReplies + result.simulatedPositiveReplies,
    simulatedNegativeReplies: summary.simulatedNegativeReplies + result.simulatedNegativeReplies,
    simulatedOrders: summary.simulatedOrders + result.simulatedOrders,
    simulatedPaidOrders: summary.simulatedPaidOrders + result.simulatedPaidOrders,
    simulatedRevenue: summary.simulatedRevenue + result.simulatedRevenue,
    simulatedRefundCount: summary.simulatedRefundCount + result.simulatedRefundCount
  }), {
    simulatedPublishedChannelsCount: 0,
    simulatedViews: 0,
    simulatedClicks: 0,
    simulatedSaves: 0,
    simulatedShares: 0,
    simulatedMessages: 0,
    simulatedLeads: 0,
    simulatedPositiveReplies: 0,
    simulatedNegativeReplies: 0,
    simulatedOrders: 0,
    simulatedPaidOrders: 0,
    simulatedRevenue: 0,
    simulatedRefundCount: 0
  });

  return {
    ...total,
    simulatedClickRate: ratio(total.simulatedClicks, total.simulatedViews),
    simulatedMessageRate: ratio(total.simulatedMessages, total.simulatedViews + total.simulatedMessages),
    simulatedLeadRate: ratio(total.simulatedLeads, total.simulatedViews + total.simulatedMessages),
    simulatedPaidConversionRate: ratio(total.simulatedPaidOrders, total.simulatedViews + total.simulatedMessages),
    notes: [
      "Synthetic scenario assumes zero leads, zero paid orders, and zero revenue.",
      "Manual outreach messages are simulated as sent messages, not real user replies.",
      "Marketplace channels are simulated as unpublished and must not be interpreted as failed real listings."
    ]
  };
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
