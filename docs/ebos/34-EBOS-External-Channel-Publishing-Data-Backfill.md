# EBOS External Channel Publishing + Data Backfill

## 1. Why External Publishing Starts After Verified

`deploymentStatus=verified` means the public validation page is reachable and the required page checks passed. It does not prove market demand. EBOS must now collect real external channel signals before treating the AI Prompt Kit direction as validated.

## 2. Channels

- Xianyu: publish a commodity-style listing and record views, messages, orders, revenue, refunds, and user feedback.
- Taobao: publish a compliant product-detail draft or listing and record views, clicks, messages, orders, revenue, and refunds.
- Whop: publish an English listing or waitlist and record listing views, clicks, messages, paid orders, revenue, and refunds.
- Xiaohongshu: publish a note and record views, saves, shares, messages, and leads.
- WeChat: publish to Moments or groups and record messages, leads, positive replies, orders, revenue, and feedback.
- Manual outreach: send one-to-one messages to real potential users and record replies, leads, orders, revenue, and feedback.

## 3. What Codex Can Do

- Generate copy-ready publishing assets.
- Generate local result-input templates.
- Validate filled result data.
- Run dry-run backfill.
- Apply backfill only when real signals exist and `--apply` is explicitly used.

## 4. What The User Must Do

- Log in to each external platform manually.
- Review and follow platform rules.
- Publish or save the listing/note/message manually.
- Copy real published URLs and observed metrics into the result input.
- Keep unknown metrics as `0`.

## 5. Real Data Only

Do not invent:

- views
- clicks
- favorites
- saves
- shares
- messages
- leads
- orders
- paidOrders
- revenue
- refundCount
- refundedAmount
- userFeedback
- publishedUrl

Empty data is not a validation success. It only means EBOS is waiting for real external channel data.

## 6. Result Input

Generate the publishing pack and editable result file:

```bash
npx tsx scripts/generate-ebos-external-publishing-pack.ts --date 2026-07-03
```

Fill:

```text
reports/ebos/external-publishing/inputs/2026-07-03-external-publish-result-input.json
```

The default template uses:

- `published=false`
- numeric metrics as `0`
- `publishedUrl=null`
- empty `userFeedback`, `evidence`, and `failures`

## 7. Check Data

```bash
npx tsx scripts/check-ebos-external-publish-results.ts --date 2026-07-03
```

The check reports:

- `valid`
- `publishCoverage`
- `dataCoverage`
- `hasRealSignals`
- `canBackfill`
- `warnings`
- `blockers`

## 8. Dry-run Backfill

```bash
npx tsx scripts/backfill-ebos-external-channel-data.ts --date 2026-07-03
```

Dry-run does not write the existing external intake input.

## 9. Apply Backfill

Only apply after the result input contains real observed data:

```bash
npx tsx scripts/backfill-ebos-external-channel-data.ts --date 2026-07-03 --apply
```

Apply creates a backup before writing:

```text
reports/ebos/external-publishing/backups/
```

If `canBackfill=false`, apply does not write.

## 10. Refresh EBOS Reports

After a successful apply:

```bash
npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03
npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03 --apply
npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-revenue-evidence.ts --date 2026-07-03
npx tsx scripts/generate-ebos-decision-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03
```

If there is no real external data yet, do not run apply. Continue waiting for real channel data.
