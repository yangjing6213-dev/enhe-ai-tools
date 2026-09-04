import type { EbosScore, EbosScoreGrade } from "./types";

export type WeightedScoreInput = {
  score: EbosScore | null | undefined;
  weight?: number | null;
};

export function normalizeScore(value: number | null | undefined): EbosScore | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(100, Math.max(0, value));
}

export function getScoreGrade(score: number | null | undefined): EbosScoreGrade {
  const normalized = normalizeScore(score);

  if (normalized === null) return "unknown";
  if (normalized >= 85) return "excellent";
  if (normalized >= 70) return "good";
  if (normalized >= 50) return "warning";
  return "critical";
}

export function calculateWeightedScore(sections: WeightedScoreInput[]): EbosScore | null {
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const section of sections) {
    const score = normalizeScore(section.score);
    const weight = section.weight ?? 1;

    if (score === null || weight <= 0 || !Number.isFinite(weight)) {
      continue;
    }

    weightedTotal += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;

  return Number((weightedTotal / totalWeight).toFixed(2));
}

