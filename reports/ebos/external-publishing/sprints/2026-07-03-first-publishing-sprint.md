# ENHE EBOS First External Publishing Sprint

Target date: 2026-07-03  
Status: `deploymentStatus=verified`, `externalPublishingStatus=waiting_real_data`  
Source pack: `reports/ebos/external-publishing/packs/2026-07-03-external-publishing-pack.json`  
Result input: `reports/ebos/external-publishing/inputs/2026-07-03-external-publish-result-input.json`

## 1. Sprint Goal

Run the first real external-channel validation sprint for ENHE AI Prompt Kit.

The goal is not to make the metrics look good. The goal is to collect the first real signals from low-friction channels:

- real replies
- real views
- real saves or shares
- real messages
- real leads
- real orders or paid orders
- real revenue
- real refunds
- real user feedback

Do not fabricate publication status, URLs, metrics, revenue, refunds, or feedback.

## 2. Priority Channels

1. `manual_outreach`
2. `wechat`
3. `xiaohongshu`

Backup channels:

1. `xianyu`
2. `taobao`
3. `whop`

## 3. Manual Outreach

Publishing / outreach goal:

Reach 10 real potential users one by one and learn whether the AI tool site operations prompt kit is worth reviewing, buying, or rejecting.

Copy title:

```text
AI工具站运营 Prompt Pack 私聊触达话术
```

Copy body:

```text
我做了一个 AI 工具站运营 Prompt Pack 验证页，想找 3-5 个真实运营者看一下：是否需要一套能直接复制改写的产品页、FAQ、SEO/GEO、上架和周复盘 Prompt。如果你愿意，我发你链接，看看到底有没有用。不承诺收益或增长，只验证需求。
```

Promotion link:

```text
https://www.enhe-tech.com.cn/validation/ai-prompt-kit
```

CTA:

```text
回复 yes 我发验证页，或直接说不需要。
```

Compliance notice:

只触达认识的真实潜在用户；用户拒绝后停止继续触达；不记录隐私敏感内容；不承诺收入、排名或自动增长。

Data to record:

- `messages`
- `leads`
- `positiveReplies`
- `negativeReplies`
- `orders`
- `paidOrders`
- `revenue`
- `userFeedback`
- `evidence`
- `notes`

User minimum action:

选择 10 个真实潜在用户，逐个私聊发送话术和验证页链接，并记录真实回复。

24-hour metrics:

- messages sent
- positiveReplies
- negativeReplies
- leads
- orders
- paidOrders
- revenue
- userFeedback

Decision criteria:

- If at least 2 users ask for details or preview, keep this direction active.
- If at least 1 user pays or asks pricing, prioritize checkout and delivery readiness.
- If most replies are negative or confused, rewrite the value proposition before scaling.

## 4. WeChat

Publishing / outreach goal:

Post once to a private traffic channel and collect real replies, leads, and purchase intent from known contacts.

Copy title:

```text
AI Prompt Kit：给 AI 工具站的运营提示词包
```

Copy body:

```text
我上线了一个 AI 工具站运营 Prompt Pack 验证页，覆盖产品页文案、FAQ、SEO/GEO、上架文案、竞品分析和周复盘。如果你正在做 AI 工具、数字产品或独立项目，可以帮我看下这个方向是否有价值。数据只记录真实咨询、回复、订单、收入和反馈。
```

Promotion link:

```text
https://www.enhe-tech.com.cn/validation/ai-prompt-kit
```

CTA:

```text
有兴趣的话打开验证页，或直接微信回复我。
```

Compliance notice:

只记录数量和匿名反馈摘要；不导出聊天记录；不记录隐私敏感内容；不承诺收入、排名或自动增长。

Data to record:

- `published`
- `publishedAt`
- `messages`
- `leads`
- `positiveReplies`
- `negativeReplies`
- `orders`
- `paidOrders`
- `revenue`
- `userFeedback`
- `evidence`
- `notes`

User minimum action:

发一条朋友圈或微信群消息，并在 24 小时后记录真实私信、正向回复、负向回复、订单和收入。

24-hour metrics:

- messages
- leads
- positiveReplies
- negativeReplies
- orders
- paidOrders
- revenue

Decision criteria:

- If at least 3 real replies arrive, keep WeChat as a validation channel.
- If replies ask what is included, improve the landing page and sample preview.
- If there are no replies after 24 hours, test manual outreach before repeating the same WeChat copy.

## 5. Xiaohongshu

Publishing / outreach goal:

Publish one note to test whether public content can generate views, saves, shares, private messages, or leads.

Copy title:

```text
我把 AI 工具站运营拆成了一套 Prompt 包
```

Copy body:

```text
适合独立开发者、AI 工具站运营者、数字产品卖家。这是一个 AI 工具站运营 Prompt Pack 验证页，覆盖产品页、FAQ、SEO/GEO、上架文案、竞品分析和周复盘。当前只验证需求，不承诺排名、收入或自动增长。真实判断看笔记浏览、收藏、分享、私信、线索和用户反馈。
```

Promotion link:

```text
https://www.enhe-tech.com.cn/validation/ai-prompt-kit
```

CTA:

```text
想要预览的话，打开验证页或私信我。
```

Compliance notice:

不要刷量；不要把平台不可见数据写成已发生；只记录小红书后台或真实私信中能看到的数据。

Data to record:

- `published`
- `publishedAt`
- `publishedUrl`
- `views`
- `saves`
- `shares`
- `messages`
- `leads`
- `userFeedback`
- `evidence`
- `notes`

User minimum action:

手动发布 1 篇小红书笔记，并在 24 小时后记录真实浏览、收藏、分享、私信和线索。

24-hour metrics:

- views
- saves
- shares
- messages
- leads
- userFeedback

Decision criteria:

- If views are non-zero but no saves or messages, improve the hook and content proof.
- If saves or messages appear, keep testing public content.
- If a user asks for preview or price, move that lead into validation intake.

## 6. Backup Channels

Use these only after the priority sprint has at least one real signal or the user explicitly wants to prepare marketplace listings.

- `xianyu`: optional listing if delivery and refund handling are ready.
- `taobao`: optional listing if product delivery, customer support, and refund flow are ready.
- `whop`: optional English listing or waitlist only in an authorized account environment.

## 7. Update Guide For external-publish-result-input.json

Users must fill only real fields:

- `published`
- `publishedAt`
- `publishedUrl` when the channel provides a real URL
- observed metrics from the platform or real users
- anonymous `userFeedback`
- `evidence` references such as screenshot filename or public URL
- `notes` for failures or caveats

These fields can remain `0` if no data exists:

- `views`
- `clicks`
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

`hasRealSignals=true` only when at least one channel has real publication status, real messages, real views, real orders, real revenue, real feedback, or real evidence.

`canBackfill=true` only when the result input is valid, has real signals, and has no blocker such as `paidOrders > orders`, `refundCount > paidOrders`, or `refundedAmount > revenue`.

## 8. Allowed Commands

```bash
npx tsx scripts/check-ebos-external-publish-results.ts --date 2026-07-03
npx tsx scripts/backfill-ebos-external-channel-data.ts --date 2026-07-03
```

Do not run backfill apply in this stage.

