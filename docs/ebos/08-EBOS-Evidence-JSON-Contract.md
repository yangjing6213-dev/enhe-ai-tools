# EBOS Evidence JSON Contract

## Why EBOS Needs An Evidence Contract

EBOS reports must be reusable by weekly reports, monthly reviews, SEO/GEO checks, dashboards, Codex skills, and later agent workflows. A stable JSON contract prevents each consumer from guessing the shape of health snapshots, data-source readiness reports, or weekly report evidence.

The evidence contract also separates observed evidence from interpretation. Each envelope carries metadata, quality signals, warnings, action items, and a payload.

## Current Version

Current contract version:

```text
ebos-evidence-v1
```

Unsupported versions are validation issues. They should not crash the main EBOS report flow.

## Envelope Structure

Every evidence JSON file uses this structure:

```ts
type EbosEvidenceEnvelope<TPayload> = {
  meta: EbosEvidenceMeta;
  quality: EbosEvidenceQuality;
  payload: TPayload;
  warnings: EbosEvidenceWarning[];
  actionItems: EbosEvidenceActionItem[];
};
```

`meta` records the contract version, evidence kind, generated time, target date, optional period, site URL, environment, generator, source files, and schema notes.

`quality` records score, grade, confidence, data completeness, warning count, error count, and missing sources.

`payload` is the original evidence body. EBOS Step 3.7 keeps payloads close to the legacy JSON shape so current scripts and readers remain compatible.

## Evidence Kinds

- `health_snapshot`: command health, build/lint/typecheck status, smoke checks, health score.
- `data_source_readiness`: configured and missing EBOS data sources.
- `weekly_report`: generated weekly EBOS report object and next-week plan evidence.
- `monthly_review`: future monthly review input/output evidence.
- `seo_evidence`: future SEO crawl, GSC, sitemap, indexability, and structured-data evidence.
- `geo_evidence`: future AI search / answer-engine visibility evidence.
- `market_evidence`: future market opportunity evidence.
- `competitor_evidence`: future competitor monitoring evidence.
- `revenue_evidence`: future revenue, order, payment, and funnel evidence.
- `product_evidence`: future product page, conversion, media, FAQ, and offer evidence.

## File Naming

New contract evidence files use:

```text
reports/ebos/evidence/{kind}/YYYY-MM-DD-{kind}.json
```

Examples:

```text
reports/ebos/evidence/health_snapshot/2026-07-03-health_snapshot.json
reports/ebos/evidence/data_source_readiness/2026-07-03-data_source_readiness.json
reports/ebos/evidence/weekly_report/2026-06-29-weekly_report.json
```

## Legacy Report Compatibility

Step 3.7 does not migrate or delete legacy report files. Existing outputs remain:

```text
reports/ebos/health/YYYY-MM-DD-health-snapshot.json
reports/ebos/health/YYYY-MM-DD-health-snapshot.md
reports/ebos/data-sources/YYYY-MM-DD-data-sources.json
reports/ebos/data-sources/YYYY-MM-DD-data-sources.md
reports/ebos/weekly/YYYY-MM-DD-weekly-report.md
reports/ebos/weekly/YYYY-MM-DD-weekly-report.html
```

`latest-report-reader.ts` reads the new envelope first. If no envelope exists, it falls back to the legacy path and normalizes the legacy JSON for the caller.

## Monthly Review Reuse

Monthly Review should read all relevant evidence envelopes for the target month, validate them, and aggregate by `meta.evidenceKind`, `meta.targetDate`, and `quality.confidence`. It should prefer envelope quality metadata over ad hoc payload inspection.

## Dashboard Reuse

The dashboard can list evidence files by kind and target date, then display:

- `quality.score`
- `quality.grade`
- `quality.confidence`
- `quality.missingSources`
- `warnings`
- `actionItems`

The dashboard should treat payload details as drill-down data, not as the primary cross-report contract.

## Codex Skill Library Reuse

Codex skills can reference evidence envelopes as stable inputs:

- Health skill reads `health_snapshot`.
- Data-source setup skill reads `data_source_readiness`.
- Weekly planning skill reads `weekly_report`.
- Future SEO/GEO skills read `seo_evidence` and `geo_evidence`.

Skills should cite `meta.sourceFiles` and `meta.generatedAt` when producing recommendations.

## Security Rules

- Do not write `.env` content into evidence files.
- Do not print or store secret values.
- Do not include raw tokens, API keys, database passwords, cookies, payment credentials, or service-account JSON.
- Evidence may include missing environment variable names, but not values.
- Evidence generation is read-only and must not publish content, mutate users, mutate payments, or deploy production code.
