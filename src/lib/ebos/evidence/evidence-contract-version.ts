export const EBOS_EVIDENCE_CONTRACT_VERSION = "ebos-evidence-v1" as const;

export function isSupportedEvidenceContractVersion(version: unknown) {
  return version === EBOS_EVIDENCE_CONTRACT_VERSION;
}

export function assertSupportedEvidenceContractVersion(
  version: unknown
): asserts version is typeof EBOS_EVIDENCE_CONTRACT_VERSION {
  if (!isSupportedEvidenceContractVersion(version)) {
    throw new Error(`Unsupported EBOS evidence contract version: ${String(version)}`);
  }
}
