import type { EbosEvidenceKind } from "../evidence";

export const EBOS_SKILL_IDS = [
  "technical-seo-auditor",
  "geo-visibility-auditor",
  "growth-product-manager",
  "digital-product-researcher",
  "competitor-watch-analyst",
  "landing-page-conversion-auditor",
  "weekly-business-reviewer",
  "monthly-strategy-reviewer",
  "ai-digital-product-launcher",
  "ebos-evidence-analyst"
] as const;

export type EbosSkillId = (typeof EBOS_SKILL_IDS)[number];

export type EbosSkillCategory =
  | "seo"
  | "geo"
  | "product"
  | "market"
  | "competitor"
  | "conversion"
  | "weekly_review"
  | "monthly_review"
  | "launch"
  | "evidence";

export type EbosSkillRiskLevel = "low" | "medium" | "high";

export type EbosSkillProblemType =
  | "no_traffic"
  | "no_revenue"
  | "product_opportunity"
  | "conversion_problem"
  | "seo_problem"
  | "geo_problem"
  | "competitor_research"
  | "weekly_planning"
  | "monthly_planning"
  | "evidence_gap";

export type EbosSkillRegistryItem = {
  id: EbosSkillId;
  name: string;
  category: EbosSkillCategory;
  description: string;
  skillPath: `skills/ebos/${string}/SKILL.md`;
  primaryUseCases: readonly string[];
  requiredEvidenceKinds: readonly EbosEvidenceKind[];
  optionalEvidenceKinds: readonly EbosEvidenceKind[];
  outputs: readonly string[];
  riskLevel: EbosSkillRiskLevel;
  owner: "codex";
  status: "active";
  version: "1.0.0";
};

export type EbosSkillSelectionContext = {
  objective?: string;
  evidenceKindsAvailable?: readonly EbosEvidenceKind[];
  missingEvidenceKinds?: readonly EbosEvidenceKind[];
  problemType?: EbosSkillProblemType;
  reportType?: "weekly" | "monthly";
  userGoal?: string;
};

export type EbosSkillSelectionResult = {
  selectedSkills: readonly EbosSkillRegistryItem[];
  reason: string;
  requiredEvidence: readonly EbosEvidenceKind[];
  missingEvidence: readonly EbosEvidenceKind[];
  nextActions: readonly string[];
};
