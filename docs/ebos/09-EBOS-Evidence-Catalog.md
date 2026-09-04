# EBOS Evidence Catalog

## Purpose

The EBOS Evidence Catalog is the stable index for evidence envelopes under `reports/ebos/evidence/`. It records each evidence file by kind, date, quality, confidence, score, warnings, and action items so later EBOS stages can read one compact catalog instead of scanning every report directory.

## Why Monthly Review, Dashboard, And Skill Library Need It

Monthly Review needs a reliable month window of evidence. A dashboard needs fast summaries by kind and health. A Codex Skill Library needs a stable machine-readable entry point that is not coupled to individual generator scripts.

## Catalog Version

`catalogVersion` is currently `ebos-evidence-catalog-v1`. It is separate from the evidence envelope `contractVersion`, which is currently `ebos-evidence-v1`.

## Catalog Entry Fields

Each entry stores the source file path and filename, `evidenceKind`, `contractVersion`, `targetDate`, `generatedAt`, optional period fields, optional site/environment data, generator, score, grade, confidence, data completeness, warning/error/action counts, missing sources, validation status, validation issues, and an optional payload summary.

`validationStatus` can be:

- `valid`: the envelope passes validation and has no recorded warnings.
- `valid_with_warnings`: the envelope passes validation but records warnings.
- `invalid`: the file is corrupted or the envelope contract does not validate.

Invalid entries stay in the catalog so a broken file does not hide catalog health.

## Summary Fields

The catalog summary includes:

- `byKind`
- `byConfidence`
- `byValidationStatus`
- `latestByKind`
- `missingKinds`
- `averageScore`
- `criticalWarningsCount`
- `openActionItemsCount`
- `dateRange`

`missingKinds` uses the expected EBOS evidence kinds and does not treat missing future kinds as a runtime error.

## Generate The Catalog

Run:

```bash
npx tsx scripts/index-ebos-evidence.ts
```

This scans `reports/ebos/evidence/`, skips `reports/ebos/evidence/catalog/`, and writes:

- `reports/ebos/evidence/catalog/YYYY-MM-DD-evidence-catalog.json`
- `reports/ebos/evidence/catalog/latest-evidence-catalog.json`

## Query Latest Evidence

Use `getLatestEvidenceByKind(catalog, kind)` from `@/lib/ebos/evidence`.

```ts
import { getLatestEvidenceByKind, readEvidenceCatalog } from "@/lib/ebos/evidence";

const catalog = await readEvidenceCatalog();
const latestHealth = catalog ? getLatestEvidenceByKind(catalog, "health_snapshot") : null;
```

## Query Evidence In One Month

Use `getEvidenceForPeriod(catalog, dateFrom, dateTo)`.

```ts
import { getEvidenceForPeriod } from "@/lib/ebos/evidence";

const julyEvidence = getEvidenceForPeriod(catalog, "2026-07-01", "2026-07-31");
```

## Determine Missing Kinds

Read `catalog.summary.missingKinds` or call `findMissingEvidenceKinds(entries)`.

Missing future-stage kinds such as `monthly_review`, `seo_evidence`, `geo_evidence`, `market_evidence`, `competitor_evidence`, `revenue_evidence`, and `product_evidence` are expected during Step 3.8.

## Step 4 Codex Skill Library Usage

Step 4 can read `latest-evidence-catalog.json` first, then select the latest entries by kind without knowing where each generator writes its files.

## Step 7 Monthly Strategy Review Usage

Step 7 can read the catalog, query a month using `getEvidenceForPeriod`, aggregate open action items, and compare missing evidence kinds before generating a monthly strategy review.

## Security Rules

Do not write secrets into evidence payloads. Do not commit `.env`. Do not index sensitive values. Evidence should record whether a source is configured or missing, not the value of any credential.
