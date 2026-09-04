import { getDataSourceCompletenessScore } from "./data-source";
import type { EbosConfidenceLevel, EbosDataSourceState } from "./types";

export function calculateConfidence(dataSources: EbosDataSourceState[]): EbosConfidenceLevel {
  if (dataSources.length === 0) return "unknown";

  const configuredSources = dataSources.filter((source) => source.status !== "not_configured");

  if (configuredSources.length === 0) return "unknown";

  const completeness =
    configuredSources.reduce(
      (total, source) => total + getDataSourceCompletenessScore(source.status),
      0
    ) / configuredSources.length;

  if (completeness === 0) return "unavailable";
  if (completeness === 1) return "complete";
  return "partial";
}

