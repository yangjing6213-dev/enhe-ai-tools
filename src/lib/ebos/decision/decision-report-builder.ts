import { getWeeklyWindow } from "../date-window";
import type { EbosEvidenceActionItem, EbosEvidenceWarning } from "../evidence";
import type { EbosConfidenceLevel } from "../types";
import type { EbosValidationResultReport } from "../validation";
import {
  readDecisionEvidence,
  type EbosDecisionFileSystem
} from "./evidence-decision-reader";
import {
  prioritizeExistingProducts,
  prioritizeProductDirections
} from "./product-direction-prioritizer";
import { generateValidationPlans } from "./validation-plan-generator";
import type {
  EbosDecisionAction,
  EbosDecisionEvidenceUsed,
  EbosDecisionReport,
  EbosEvidenceDecisionInput
} from "./decision-types";

export async function buildEbosDecisionReport(options: {
  targetDate?: string | Date;
  generatedAt?: string | Date;
  catalogPath?: string;
  input?: EbosEvidenceDecisionInput;
  evidenceUsed?: EbosDecisionEvidenceUsed[];
  warnings?: EbosEvidenceWarning[];
  dataGaps?: string[];
  validationResultReport?: EbosValidationResultReport | null;
  fs?: EbosDecisionFileSystem;
} = {}): Promise<EbosDecisionReport> {
  const targetDate = toDateKey(options.targetDate ?? new Date());
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const period = getWeeklyWindow(new Date(`${targetDate}T12:00:00`));
  const readResult = options.input
    ? {
        input: options.input,
        evidenceUsed: options.evidenceUsed ?? [],
        warnings: options.warnings ?? [],
        dataGaps: options.dataGaps ?? [],
        evidenceCatalogPath: options.catalogPath ?? "reports/ebos/evidence/catalog/latest-evidence-catalog.json"
      }
    : await readDecisionEvidence({ catalogPath: options.catalogPath, fs: options.fs });
  const priorityProductDirections = applyValidationFeedbackToDirections(
    prioritizeProductDirections(readResult.input),
    options.validationResultReport
  );
  const priorityExistingProducts = applyValidationFeedbackToProducts(
    prioritizeExistingProducts(readResult.input),
    options.validationResultReport
  );
  const validationPlans = generateValidationPlans({
    priorityProductDirections,
    priorityExistingProducts
  }, readResult.input);
  const doNext = buildDoNext(priorityProductDirections, priorityExistingProducts);
  const overallConfidence = calculateDecisionConfidence(readResult.evidenceUsed, readResult.warnings, readResult.dataGaps);

  return {
    reportType: "decision",
    targetDate,
    periodStart: toDateKey(period.start),
    periodEnd: toDateKey(period.end),
    generatedAt,
    evidenceCatalogPath: readResult.evidenceCatalogPath,
    evidenceUsed: readResult.evidenceUsed,
    overallConfidence,
    strategicSummary: buildStrategicSummary(doNext, overallConfidence, options.validationResultReport),
    priorityProductDirections,
    priorityExistingProducts,
    validationPlans,
    stopDoing: buildStopDoing(),
    doNext,
    codexTasks: buildCodexTasks(validationPlans),
    risks: buildRisks(readResult.dataGaps),
    warnings: readResult.warnings,
    dataGaps: readResult.dataGaps
  };
}

function buildDoNext(
  directions: ReturnType<typeof prioritizeProductDirections>,
  products: ReturnType<typeof prioritizeExistingProducts>
): EbosDecisionAction[] {
  const main = directions[0]
    ? {
        title: `Validate ${directions[0].name}`,
        reason: directions[0].reason,
        evidenceRefs: directions[0].sourceSignals
      }
    : products[0]
      ? {
          title: `Validate existing product: ${products[0].productName}`,
          reason: products[0].reason,
          evidenceRefs: ["product_evidence", "revenue_evidence"]
        }
      : null;
  const backup = products[0] && (!main || !main.title.includes(products[0].productName))
    ? {
        title: `Backup: validate ${products[0].productName}`,
        reason: products[0].reason,
        evidenceRefs: ["product_evidence", "revenue_evidence"]
      }
    : directions[1]
      ? {
          title: `Backup: validate ${directions[1].name}`,
          reason: directions[1].reason,
          evidenceRefs: directions[1].sourceSignals
        }
      : null;

  return [main, backup].filter((item): item is EbosDecisionAction => item !== null).slice(0, 2);
}

function applyValidationFeedbackToDirections(
  directions: ReturnType<typeof prioritizeProductDirections>,
  validationResultReport?: EbosValidationResultReport | null
) {
  if (!validationResultReport) return directions;

  return directions
    .map((direction) => {
      const analysis = validationResultReport.analyses.find((item) => sameTarget(item.targetDirection, direction.name));
      if (!analysis) return direction;
      if (analysis.decisionRecommendation === "scale" || analysis.decisionRecommendation === "continue") {
        return {
          ...direction,
          totalPriorityScore: Math.min(100, direction.totalPriorityScore + 8),
          reason: `${direction.reason} Validation result supports continuing: ${analysis.reason}.`
        };
      }
      if (analysis.decisionRecommendation === "stop") {
        return {
          ...direction,
          totalPriorityScore: Math.max(0, direction.totalPriorityScore - 20),
          recommendation: "watch" as const,
          reason: `${direction.reason} Validation result suggests stopping or lowering priority: ${analysis.reason}.`
        };
      }
      if (analysis.decisionRecommendation === "adjust") {
        return {
          ...direction,
          totalPriorityScore: Math.max(0, direction.totalPriorityScore - 5),
          reason: `${direction.reason} Validation result suggests adjustment before scaling: ${analysis.reason}.`
        };
      }
      return direction;
    })
    .sort((a, b) => b.totalPriorityScore - a.totalPriorityScore);
}

function applyValidationFeedbackToProducts(
  products: ReturnType<typeof prioritizeExistingProducts>,
  validationResultReport?: EbosValidationResultReport | null
) {
  if (!validationResultReport) return products;

  return products
    .map((product) => {
      const analysis = validationResultReport.analyses.find((item) => {
        const target = item.targetProduct ?? item.targetDirection;
        return sameTarget(target, product.productName);
      });
      if (!analysis) return product;
      if (analysis.decisionRecommendation === "scale" || analysis.decisionRecommendation === "continue") {
        return {
          ...product,
          totalPriorityScore: Math.min(100, product.totalPriorityScore + 8),
          reason: `${product.reason} Validation result supports continuing: ${analysis.reason}.`
        };
      }
      if (analysis.decisionRecommendation === "stop") {
        return {
          ...product,
          totalPriorityScore: Math.max(0, product.totalPriorityScore - 20),
          recommendation: "watch" as const,
          reason: `${product.reason} Validation result suggests stopping or lowering priority: ${analysis.reason}.`
        };
      }
      if (analysis.decisionRecommendation === "adjust") {
        return {
          ...product,
          totalPriorityScore: Math.max(0, product.totalPriorityScore - 5),
          reason: `${product.reason} Validation result suggests adjustment before scaling: ${analysis.reason}.`
        };
      }
      return product;
    })
    .sort((a, b) => b.totalPriorityScore - a.totalPriorityScore);
}

function buildStopDoing(): EbosDecisionAction[] {
  return [
    {
      title: "Do not optimize UI endlessly",
      reason: "Without first-revenue evidence, UI polish should not displace validation work.",
      evidenceRefs: ["revenue_evidence"]
    },
    {
      title: "Do not build too many products at once",
      reason: "Cross-evidence prioritization is designed to keep this week to one main validation and one backup.",
      evidenceRefs: ["market_evidence", "product_evidence"]
    },
    {
      title: "Do not start heavy development before revenue proof",
      reason: "firstRevenueAchieved=false means heavy builds should wait for landing page, content, marketplace, or pricing validation.",
      evidenceRefs: ["revenue_evidence"]
    }
  ];
}

function buildCodexTasks(plans: ReturnType<typeof generateValidationPlans>): EbosEvidenceActionItem[] {
  return plans
    .slice(0, 2)
    .flatMap((plan, planIndex) => plan.codexTasks.slice(0, 3).map((task, taskIndex): EbosEvidenceActionItem => ({
      id: `decision-codex-task-${planIndex + 1}-${taskIndex + 1}`,
      title: task,
      description: `Supports validation plan: ${plan.title}.`,
      priority: planIndex === 0 ? "high" : "medium",
      owner: "codex",
      relatedSection: "next_plan",
      evidenceRefs: [plan.id],
      status: "open"
    })))
    .slice(0, 6);
}

function buildRisks(dataGaps: string[]) {
  return [
    "Decision report does not fabricate traffic, sales, revenue, or competitor performance.",
    "Public competitor page structure is directional evidence only.",
    ...(dataGaps.length ? ["Some evidence is missing, so recommendations must be treated as partial-confidence decisions."] : [])
  ];
}

function buildStrategicSummary(
  doNext: EbosDecisionAction[],
  confidence: EbosConfidenceLevel,
  validationResultReport?: EbosValidationResultReport | null
) {
  const main = doNext[0]?.title ?? "No strong validation direction";
  const backup = doNext[1]?.title ? ` Backup: ${doNext[1].title}.` : "";
  const validationFeedback = validationResultReport
    ? ` Validation feedback: continue=${validationResultReport.continueDirections.join(", ") || "none"}, scale=${validationResultReport.scaleDirections.join(", ") || "none"}, stop=${validationResultReport.stopDirections.join(", ") || "none"}.`
    : validationResultReport === null
      ? " Validation feedback missing; record validation results before treating priorities as final."
      : "";
  return `This week should focus on ${main}.${backup} Confidence: ${confidence}.${validationFeedback}`;
}

function sameTarget(left: string, right: string) {
  const normalizedLeft = normalizeTarget(left);
  const normalizedRight = normalizeTarget(right);
  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
}

function normalizeTarget(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function calculateDecisionConfidence(
  evidenceUsed: EbosDecisionEvidenceUsed[],
  warnings: EbosEvidenceWarning[],
  dataGaps: string[]
): EbosConfidenceLevel {
  if (dataGaps.length || warnings.length) return "partial";
  if (evidenceUsed.length === 0) return "unknown";
  return evidenceUsed.every((item) => item.confidence === "complete") ? "complete" : "partial";
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
