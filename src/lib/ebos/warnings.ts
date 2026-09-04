import type { EbosDataSourceKey, EbosSectionKey, EbosWarning } from "./types";

export function createMissingDataWarning(source: EbosDataSourceKey): EbosWarning {
  return {
    code: "missing_data",
    source,
    severity: "warning",
    message: `EBOS data source ${source} is missing for this report.`
  };
}

export function createPartialDataWarning(source: EbosDataSourceKey): EbosWarning {
  return {
    code: "partial_data",
    source,
    severity: "warning",
    message: `EBOS data source ${source} is only partially available.`
  };
}

export function createNoRevenueWarning(): EbosWarning {
  return {
    code: "no_revenue",
    section: "revenue",
    severity: "critical",
    message: "No revenue was detected for the reporting window."
  };
}

export function createLowConfidenceWarning(section: EbosSectionKey): EbosWarning {
  return {
    code: "low_confidence",
    section,
    severity: "warning",
    message: `EBOS section ${section} has low confidence because data is incomplete.`
  };
}

