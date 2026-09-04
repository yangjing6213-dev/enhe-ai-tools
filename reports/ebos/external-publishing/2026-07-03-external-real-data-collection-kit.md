# External Real Data Collection Kit

- reportType: external_real_data_collection_kit
- targetDate: 2026-07-03
- generatedAt: 2026-07-08T01:08:00+08:00
- hasRealSignals: false
- canBackfill: false
- externalPublishingStatus: waiting_real_data

## Channels

- xianyu
- taobao
- whop
- xiaohongshu
- wechat
- manual_outreach

## Fill Rules

- Use the real platform URL if publicly available.
- For WeChat private chat/manual outreach, do not invent a URL; put evidence notes without private identifiers.
- Never use placeholder URLs as publishedUrl.
- views/clicks/messages/orders/revenue must be real observed data.
- synthetic data cannot be used for backfill apply.
- no real data means keep waiting_real_data.

## Commands

- check: `npx tsx scripts/check-ebos-external-publish-results.ts --date 2026-07-03`
- dry-run: `npx tsx scripts/backfill-ebos-external-channel-data.ts --date 2026-07-03`
- apply is forbidden while hasRealSignals=false or canBackfill=false.

## User Next Codex Instruction

After filling real results, ask Codex to run check-ebos-external-publish-results and backfill-ebos-external-channel-data dry-run for 2026-07-03. Do not request --apply unless hasRealSignals=true and canBackfill=true.
