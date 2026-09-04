# EBOS Synthetic Failure Scenario Lab

Step: 19S  
Purpose: build a clearly marked simulated worst-case lab for strategy diagnosis without contaminating real EBOS operating data.

## 1. Why Run Failure Simulation

The user currently has no real external channel data from private outreach, WeChat, Xiaohongshu, Xianyu, Taobao, or Whop.

Instead of inventing real metrics, EBOS can run a synthetic failure scenario to ask:

- what if the first external sprint gets low exposure
- what if nobody asks for details
- what if there are zero leads
- what if there are zero paid orders
- what if revenue remains zero

This helps prioritize page, copy, offer, pricing, and channel fixes before the next real publishing sprint.

## 2. Synthetic Data vs Real Data

Synthetic data:

- is marked `synthetic=true`
- uses `simulated*` fields
- lives only under `reports/ebos/external-publishing/simulations/`
- is used only for planning and diagnosis

Real data:

- comes from real external platforms or real users
- is written by the user into `external-publish-result-input.json`
- can be checked by `check-ebos-external-publish-results`
- can be dry-run backfilled
- can be applied only after real signals exist and blockers are zero

## 3. Why Synthetic Data Must Not Be Backfilled

Synthetic data is not observed behavior.

It must not be written to:

- `reports/ebos/external-publishing/inputs/2026-07-03-external-publish-result-input.json`
- `reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json`
- validation input
- revenue evidence
- decision evidence

It must not set:

- `hasRealSignals=true`
- `canBackfill=true`
- `published=true` in real result input
- real revenue
- real orders
- real feedback

## 4. How To Use Failure Simulation

Use the synthetic report to identify likely weak points:

- unclear Hero
- unclear delivery format
- no free sample
- no price anchor
- weak CTA
- weak trust proof
- weak channel fit
- weak Xiaohongshu title
- weak private-message reason

Then turn the highest priority fixes into real page, copy, and offer changes before the next real channel sprint.

## 5. Generate Scenario

```bash
npx tsx scripts/generate-ebos-synthetic-failure-scenario.ts --date 2026-07-03
```

Outputs:

- `reports/ebos/external-publishing/simulations/2026-07-03-synthetic-failure-scenario.json`
- `reports/ebos/external-publishing/simulations/2026-07-03-synthetic-failure-scenario.md`

## 6. Generate Analysis And Optimization Plan

```bash
npx tsx scripts/analyze-ebos-synthetic-failure-scenario.ts --date 2026-07-03
```

Outputs:

- `reports/ebos/external-publishing/simulations/2026-07-03-synthetic-failure-analysis.json`
- `reports/ebos/external-publishing/simulations/2026-07-03-synthetic-failure-analysis.md`
- `reports/ebos/external-publishing/simulations/2026-07-03-synthetic-optimization-plan.json`
- `reports/ebos/external-publishing/simulations/2026-07-03-synthetic-optimization-plan.md`

## 7. Next Real Validation Sprint

After optimization:

1. update Hero and offer copy
2. add free sample entry
3. clarify template count and delivery format
4. prepare price tiers
5. rewrite private outreach copy
6. rewrite Xiaohongshu title
7. publish or reach out through real channels
8. wait 24 hours
9. record only real data in `external-publish-result-input.json`
10. run check and dry-run backfill

Only after `hasRealSignals=true`, `canBackfill=true`, and blockers are zero can real apply be considered.

