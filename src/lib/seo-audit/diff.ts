export type SeoAuditDiffSnapshot = {
  projectId: string;
  engineVersion: string;
  score: number;
  evidenceCoverage: number;
  findingIds: readonly string[];
};

export type SeoAuditDiff = {
  scoreDelta: number;
  evidenceCoverageDelta: number;
  newFindingIds: string[];
  resolvedFindingIds: string[];
  unchangedFindingIds: string[];
};

export type SeoAuditDiffErrorCode =
  | "SEO_AUDIT_DIFF_PROJECT_MISMATCH"
  | "SEO_AUDIT_DIFF_ENGINE_MAJOR_MISMATCH";

export class SeoAuditDiffError extends Error {
  readonly code: SeoAuditDiffErrorCode;

  constructor(code: SeoAuditDiffErrorCode) {
    super(code);
    this.name = "SeoAuditDiffError";
    this.code = code;
  }
}

export function buildSeoAuditDiff(
  previous: SeoAuditDiffSnapshot,
  current: SeoAuditDiffSnapshot,
): SeoAuditDiff {
  if (!previous.projectId || previous.projectId !== current.projectId) {
    throw new SeoAuditDiffError("SEO_AUDIT_DIFF_PROJECT_MISMATCH");
  }

  const previousMajor = readEngineMajor(previous.engineVersion);
  const currentMajor = readEngineMajor(current.engineVersion);
  if (previousMajor === null || previousMajor !== currentMajor) {
    throw new SeoAuditDiffError("SEO_AUDIT_DIFF_ENGINE_MAJOR_MISMATCH");
  }

  const previousIds = unique(previous.findingIds);
  const currentIds = unique(current.findingIds);
  const previousSet = new Set(previousIds);
  const currentSet = new Set(currentIds);

  return {
    scoreDelta: current.score - previous.score,
    evidenceCoverageDelta:
      current.evidenceCoverage - previous.evidenceCoverage,
    newFindingIds: currentIds.filter((id) => !previousSet.has(id)),
    resolvedFindingIds: previousIds.filter((id) => !currentSet.has(id)),
    unchangedFindingIds: previousIds.filter((id) => currentSet.has(id)),
  };
}

function readEngineMajor(version: string) {
  const match = /^(\d+)(?:\.|$)/.exec(version);
  return match ? Number(match[1]) : null;
}

function unique(values: readonly string[]) {
  return [...new Set(values)];
}
