PHASE_1B_STATUS=NOT_READY
PHASE_1B_PUBLIC_SHELL_STATUS=NOT_READY
PHASE_1B_PRODUCT_DETAIL_STATUS=NOT_READY
PHASE_1B_COMMERCE_STATUS=NOT_READY
PHASE_1B_OVERALL_STATUS=NOT_READY

R006_STATUS=OPEN
R006_PHASE1B_GATE=BLOCKED
R006_REASON=PRODUCTION_FINGERPRINT_REQUIRED
R008_STATUS=OPEN
R008_PHASE1B_GATE=BLOCKED
R001_PUBLIC_SHELL_CODE_BOUNDARY=PASS
R001_PUBLIC_WEB_EXPOSURE_SCAN=FAIL_AT_OBSERVED_TIME
R001_PRODUCTION_FILE_INVENTORY=OPEN
R001_PRODUCT_DETAIL_AND_DOWNLOAD=BLOCKED

# ENHE Phase 1B gate evidence manifest

This directory contains read-only gate evidence collected after the approved Phase 1A design freeze. It does not implement the redesign or change production behavior.

## Required artifacts

- `01-R006-URL-BASELINE-REPORT.md`, `02-R006-PUBLIC-URL-BASELINE.csv`, `03-R006-LOCAL-ROUTE-INVENTORY.csv`, and `04-R006-DIFF-REPORT.csv`
- `05-R008-IMPLEMENTATION-REPORT.md` and `12-R008-CODE-PATCH.diff`
- `06-R001-PUBLIC-EXPOSURE-REPORT.md`, `07-R001-PUBLIC-EXPOSURE-SCAN.csv`, and `08-R001-PRODUCTION-INPUT-COLLECTION.md`
- `09-PHASE-1B-READINESS.md`, `10-REMAINING-INPUTS.md`, and `11-COMMAND-LOG.md`
- `tools/collect-production-fingerprint.ps1`, `tools/collect-production-file-metadata-template.sql`, `tools/collect-cdn-cache-metadata.md`, `tools/collect-public-url-baseline.ps1`, `tools/collect-local-route-inventory.ps1`, and `tools/collect-r006-diff.ps1`

## Scope and safety

All production requests used User-Agent `ENHE-Redesign-ReadOnly-Audit/1.0`, did not authenticate, and did not submit forms or call private APIs. Reports store public URL paths and hashes only where a private or delivery address was observed; complete private addresses, query values, cookies, secrets, and file contents are intentionally excluded.

The Phase 1A approval baseline is `f49dd3886f6fff4d05b692c793757398dbc756fa`. The approval record was committed as `1428dd2f9c2257668c51388b6857807dba503983`; a subsequent one-line narrative correction was committed separately as `e6f2d5559151b19b49cd37e6e77eba1bc78e2393` because existing commits were not amended.

R-006 contains 528/528 successful public URL fetches. Its 534-row diff is classified as 494 `MATCHED`, 32 `CODE_PRODUCTION_DRIFT`, 6 `NEEDS_DECISION`, and 2 `LANGUAGE_PARTNER_MISSING`; the latter two Chinese AI-news pages have no observed `hreflang_en` partner and remain unresolved. This evidence does not close R-006 because the production deployment fingerprint is still missing.
