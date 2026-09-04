# EBOS Cross-Evidence Prioritization v1

## 1. Why This Exists

Cross-Evidence Prioritization turns the existing EBOS evidence catalog into a focused operating decision for the next week. It combines market, competitor, product, revenue, SEO, and GEO evidence so ENHE does not chase too many directions at once.

## 2. Difference From Market And Competitor Evidence

Market Evidence identifies demand directions. Competitor Evidence identifies public page structure and differentiation signals. Decision Report is the operating layer that ranks what ENHE should validate next.

## 3. Not A New Evidence Kind

Decision Report is not written into `EBOS_EVIDENCE_KINDS` and is not indexed by the evidence catalog. It reads `reports/ebos/evidence/catalog/latest-evidence-catalog.json` and related envelopes, then outputs a decision artifact under `reports/ebos/decision`.

## 4. Scoring Rules

Product direction priority uses a 100-point model:

- Market score: up to 20 from market opportunity priority.
- Competitor score: up to 15 when competitor opportunities align.
- Product fit score: up to 20 when ENHE already has a matching product or capability.
- Revenue urgency score: up to 15 when first revenue is not achieved and the direction can be validated cheaply.
- SEO potential score: up to 10 for content or page-led opportunities.
- GEO potential score: up to 10 for FAQ, summary, prompt, and tutorial-friendly directions.
- Validation speed score: up to 10 for prompt kits, workflow packs, templates, and content clusters.
- Build difficulty score: subtract up to 10 for heavy software or platform work.

## 5. Catalog Reading

The reader starts from `reports/ebos/evidence/catalog/latest-evidence-catalog.json`. It does not scan evidence directories directly. Missing evidence becomes `dataGaps`; read or validation problems become warnings.

## 6. Validation Plans

The generator produces plans for the top three combined priorities, but `doNext` stays intentionally narrow: one main validation direction and one backup direction.

## 7. Recommendation Meanings

- `validate_this_week`: run a concrete validation now.
- `prepare_landing_page`: prepare the offer page before validation.
- `create_content_test`: test demand through content and CTA.
- `improve_existing_product`: fix or package an existing product before broader validation.
- `watch`: keep in backlog.
- `ignore`: do not spend current cycle time.

## 8. First Revenue Constraint

When `firstRevenueAchieved=false`, EBOS should not recommend heavy development as the main next step. The operating priority is low-cost validation: landing page, content test, marketplace listing, pricing test, presale, or manual outreach.

## 9. Run Command

```bash
npx tsx scripts/generate-ebos-decision-report.ts --date 2026-07-03
```

Outputs:

- `reports/ebos/decision/YYYY-MM-DD-decision-report.md`
- `reports/ebos/decision/YYYY-MM-DD-decision-report.json`

## 10. Weekly Scheduling

Weekly and monthly generators may read the latest decision report if it exists. If it is missing, the original report flow continues unchanged.

## 11. Data Boundary

Decision Report does not fabricate revenue, traffic, sales, rankings, or competitor performance. It only ranks validation work based on existing EBOS evidence.
