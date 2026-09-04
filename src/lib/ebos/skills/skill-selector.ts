import type { EbosEvidenceKind } from "../evidence";
import { EBOS_SKILL_REGISTRY, getEbosSkillById } from "./skill-registry";
import type {
  EbosSkillId,
  EbosSkillProblemType,
  EbosSkillRegistryItem,
  EbosSkillSelectionContext,
  EbosSkillSelectionResult
} from "./skill-types";

const SKILLS_BY_PROBLEM: Record<EbosSkillProblemType, readonly EbosSkillId[]> = {
  no_traffic: ["technical-seo-auditor", "geo-visibility-auditor"],
  no_revenue: ["growth-product-manager", "landing-page-conversion-auditor"],
  product_opportunity: ["digital-product-researcher", "growth-product-manager"],
  conversion_problem: ["landing-page-conversion-auditor"],
  seo_problem: ["technical-seo-auditor"],
  geo_problem: ["geo-visibility-auditor"],
  competitor_research: ["competitor-watch-analyst"],
  weekly_planning: ["weekly-business-reviewer"],
  monthly_planning: ["monthly-strategy-reviewer"],
  evidence_gap: ["ebos-evidence-analyst"]
};

export function selectEbosSkills(
  context: EbosSkillSelectionContext
): EbosSkillSelectionResult {
  const problemType = context.problemType ?? inferProblemType(context);
  const skillIds = problemType
    ? SKILLS_BY_PROBLEM[problemType]
    : inferReportSkills(context);
  const selectedSkills = skillIds.map(readSkill);
  const requiredEvidence = uniqueEvidence(
    selectedSkills.flatMap((skill) => skill.requiredEvidenceKinds)
  );
  const availableEvidence = new Set(context.evidenceKindsAvailable ?? []);
  const explicitlyMissingEvidence = new Set(context.missingEvidenceKinds ?? []);
  const missingEvidence = requiredEvidence.filter(
    (kind) => !availableEvidence.has(kind) || explicitlyMissingEvidence.has(kind)
  );

  return {
    selectedSkills,
    reason: createSelectionReason(problemType, selectedSkills, context),
    requiredEvidence,
    missingEvidence,
    nextActions: createNextActions(selectedSkills, missingEvidence)
  };
}

function readSkill(id: EbosSkillId): EbosSkillRegistryItem {
  const skill = getEbosSkillById(id);
  if (!skill) {
    throw new Error(`Unknown EBOS skill id: ${id}`);
  }

  return skill;
}

function inferReportSkills(context: EbosSkillSelectionContext): readonly EbosSkillId[] {
  if (context.reportType === "weekly") return SKILLS_BY_PROBLEM.weekly_planning;
  if (context.reportType === "monthly") return SKILLS_BY_PROBLEM.monthly_planning;
  return ["ebos-evidence-analyst"];
}

function inferProblemType(
  context: EbosSkillSelectionContext
): EbosSkillProblemType | undefined {
  const text = `${context.objective ?? ""} ${context.userGoal ?? ""}`.toLowerCase();
  if (!text.trim()) return undefined;

  if (hasAny(text, ["traffic", "流量"])) return "no_traffic";
  if (hasAny(text, ["revenue", "income", "sales", "收入", "销售"])) return "no_revenue";
  if (hasAny(text, ["product opportunity", "产品机会", "选品"])) {
    return "product_opportunity";
  }
  if (hasAny(text, ["conversion", "转化"])) return "conversion_problem";
  if (hasAny(text, ["seo", "search engine"])) return "seo_problem";
  if (hasAny(text, ["geo", "ai search", "answer engine", "生成式搜索"])) {
    return "geo_problem";
  }
  if (hasAny(text, ["competitor", "竞品"])) return "competitor_research";
  if (hasAny(text, ["weekly", "周报", "下周"])) return "weekly_planning";
  if (hasAny(text, ["monthly", "月报", "下月"])) return "monthly_planning";
  if (hasAny(text, ["evidence", "数据缺口", "缺什么数据"])) return "evidence_gap";

  return undefined;
}

function hasAny(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function uniqueEvidence(kinds: readonly EbosEvidenceKind[]) {
  return [...new Set(kinds)];
}

function createSelectionReason(
  problemType: EbosSkillProblemType | undefined,
  selectedSkills: readonly EbosSkillRegistryItem[],
  context: EbosSkillSelectionContext
) {
  if (problemType) {
    return `Selected ${selectedSkills.map((skill) => skill.id).join(", ")} for ${problemType}.`;
  }

  if (context.reportType) {
    return `Selected ${selectedSkills.map((skill) => skill.id).join(", ")} for ${context.reportType} report planning.`;
  }

  return "Selected ebos-evidence-analyst as the default EBOS skill because no specific problem type was provided.";
}

function createNextActions(
  selectedSkills: readonly EbosSkillRegistryItem[],
  missingEvidence: readonly EbosEvidenceKind[]
) {
  const evidenceActions = missingEvidence.map(
    (kind) =>
      `Generate or locate ${kind} evidence before finalizing the selected skill output.`
  );
  const skillActions = selectedSkills.map(
    (skill) => `Use ${skill.skillPath} and follow its checklist before producing final recommendations.`
  );

  return [...evidenceActions, ...skillActions];
}
