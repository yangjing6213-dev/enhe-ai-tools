# EBOS First External Publishing Sprint

Step: 18  
Target date: 2026-07-03  
Status before sprint: `externalPublishingStatus=waiting_real_data`

## Purpose

The validation landing page is live and verified. EBOS now needs real external signals before any backfill or business decision can be treated as evidence.

This sprint creates the first practical publishing loop:

1. select low-friction channels
2. publish or reach out manually
3. collect real results
4. validate the result input
5. dry-run backfill
6. apply only after real data exists and validation passes

## Priority Channels

Use these first:

1. `manual_outreach`
2. `wechat`
3. `xiaohongshu`

Why:

- They require the least setup.
- They can produce direct qualitative feedback quickly.
- They do not require marketplace listing readiness.
- They reduce the risk of pretending that empty marketplace metrics are validation.

Backup channels:

1. `xianyu`
2. `taobao`
3. `whop`

Use backup channels only when product delivery, account environment, platform rules, and refund handling are ready.

## Files

Sprint plan:

`reports/ebos/external-publishing/sprints/2026-07-03-first-publishing-sprint.md`

Machine-readable sprint plan:

`reports/ebos/external-publishing/sprints/2026-07-03-first-publishing-sprint.json`

User action checklist:

`reports/ebos/external-publishing/checklists/2026-07-03-user-minimum-publishing-actions.md`

Real signal collection sheet:

`reports/ebos/external-publishing/inputs/2026-07-03-real-signal-collection-sheet.md`

Structured result input:

`reports/ebos/external-publishing/inputs/2026-07-03-external-publish-result-input.json`

## User Minimum Actions

Minimum action set:

1. Send manual outreach to 10 real potential users.
2. Post one WeChat Moments or relevant group message.
3. Publish one Xiaohongshu note.
4. Optionally create one Xianyu listing if delivery and refund handling are ready.
5. Optionally create one Taobao listing if delivery, support, and refund handling are ready.
6. Optionally create one Whop listing in an authorized account environment.

## Data Rules

Only real data can enter EBOS.

Do not fabricate:

- `published=true`
- `publishedUrl`
- views
- clicks
- saves
- shares
- messages
- leads
- positive replies
- negative replies
- orders
- paid orders
- revenue
- refunds
- user feedback
- evidence

If no data exists, keep the metric at `0`.

## Updating external-publish-result-input.json

Fields users should fill with real data:

- `published`
- `publishedAt`
- `publishedUrl`
- `listingTitle`
- platform-visible metrics
- real message and lead counts
- real order, paid order, revenue, and refund counts
- anonymous `userFeedback`
- `evidence`
- `notes`
- `failures`

Fields that can remain `0`:

- `views`
- `clicks`
- `favorites`
- `saves`
- `shares`
- `messages`
- `leads`
- `positiveReplies`
- `negativeReplies`
- `orders`
- `paidOrders`
- `revenue`
- `refundCount`
- `refundedAmount`

Set `published=true` only when the channel was actually posted, listed, sent, or used for real outreach.

`hasRealSignals=true` when at least one channel has a real publication, real URL, real view, real click, real save, real share, real message, real lead, real order, real revenue, real feedback, or real evidence.

`canBackfill=true` when:

1. result input validation is valid
2. `hasRealSignals=true`
3. there are no blockers

Known blockers include:

- `paidOrders > orders`
- `refundCount > paidOrders`
- `refundedAmount > revenue`

## Allowed Commands In This Stage

```bash
npx tsx scripts/check-ebos-external-publish-results.ts --date 2026-07-03
npx tsx scripts/backfill-ebos-external-channel-data.ts --date 2026-07-03
npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03
```

Backfill must remain dry-run in this stage.

Do not run:

```bash
npx tsx scripts/backfill-ebos-external-channel-data.ts --date 2026-07-03 --apply
```

## Operating Rule

Waiting for real data is a valid EBOS state. Empty metrics are not failure, but empty metrics must not be converted into fake evidence.

