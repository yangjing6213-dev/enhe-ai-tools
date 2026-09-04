# Real Signal Collection Sheet

Target date: 2026-07-03  
Write final structured results to: `reports/ebos/external-publishing/inputs/2026-07-03-external-publish-result-input.json`

Only fill real data from an external platform or real user behavior.

If a metric has no data, fill `0`.

Do not fill fake data just to make EBOS pass.

| channel | published | publishedAt | publishedUrl | views | clicks | saves | shares | messages | leads | positiveReplies | negativeReplies | orders | paidOrders | revenue | refundCount | userFeedback | evidence | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| manual_outreach |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| wechat |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| xiaohongshu |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| xianyu |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| taobao |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| whop |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Field Rules

- `published`: write `true` only when a real post, listing, or outreach happened.
- `publishedAt`: use the real publishing or outreach time.
- `publishedUrl`: use only the real public URL. If there is no URL, leave it blank or use `null` in JSON.
- `views`, `clicks`, `saves`, `shares`: use platform-visible numbers only.
- `messages`, `leads`, `positiveReplies`, `negativeReplies`: count real user interactions only.
- `orders`, `paidOrders`, `revenue`, `refundCount`: use real commercial records only.
- `userFeedback`: use anonymous summaries. Do not paste private chat records.
- `evidence`: use screenshot filenames, public URLs, or short evidence references.
- `notes`: write caveats, failures, or channel-specific context.

