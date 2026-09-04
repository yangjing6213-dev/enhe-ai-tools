# User Minimum Publishing Actions

Target date: 2026-07-03  
Result input to update after real activity: `reports/ebos/external-publishing/inputs/2026-07-03-external-publish-result-input.json`

Only record real data. If no data exists, keep the number at `0`. Do not fill fake numbers to make EBOS pass.

## 1. WeChat Moments Or Group

Copy this:

```text
我上线了一个 AI 工具站运营 Prompt Pack 验证页，覆盖产品页文案、FAQ、SEO/GEO、上架文案、竞品分析和周复盘。如果你正在做 AI 工具、数字产品或独立项目，可以帮我看下这个方向是否有价值。数据只记录真实咨询、回复、订单、收入和反馈。

https://www.enhe-tech.com.cn/validation/ai-prompt-kit

有兴趣的话打开验证页，或直接微信回复我。
```

Post it to:

- WeChat Moments, or
- one relevant WeChat group where this is allowed.

After posting, record:

- whether it was posted
- posting time
- messages
- leads
- positive replies
- negative replies
- orders
- paid orders
- revenue
- anonymous feedback

After 24 hours, check:

- whether anyone replied
- whether anyone asked for preview, price, delivery, or example prompts
- whether anyone rejected it and why

## 2. WeChat Private Message 10 People

Copy this:

```text
我做了一个 AI 工具站运营 Prompt Pack 验证页，想找 3-5 个真实运营者看一下：是否需要一套能直接复制改写的产品页、FAQ、SEO/GEO、上架和周复盘 Prompt。如果你愿意，我发你链接，看看到底有没有用。不承诺收益或增长，只验证需求。

https://www.enhe-tech.com.cn/validation/ai-prompt-kit

回复 yes 我发验证页，或直接说不需要。
```

Send it to:

- 10 real potential users you know.

After sending, record:

- messages sent
- leads
- positive replies
- negative replies
- orders
- paid orders
- revenue
- anonymous feedback

After 24 hours, check:

- how many people replied
- how many asked for more detail
- how many said no
- whether anyone paid or asked for pricing

If there is a consultation or order:

- record the channel as `manual_outreach`
- record only counts and anonymous feedback
- do not paste private chat content into EBOS

## 3. Xiaohongshu One Note

Copy this title:

```text
我把 AI 工具站运营拆成了一套 Prompt 包
```

Copy this body:

```text
适合独立开发者、AI 工具站运营者、数字产品卖家。这是一个 AI 工具站运营 Prompt Pack 验证页，覆盖产品页、FAQ、SEO/GEO、上架文案、竞品分析和周复盘。当前只验证需求，不承诺排名、收入或自动增长。真实判断看笔记浏览、收藏、分享、私信、线索和用户反馈。

https://www.enhe-tech.com.cn/validation/ai-prompt-kit

想要预览的话，打开验证页或私信我。
```

Post it to:

- Xiaohongshu as 1 note.

After posting, record:

- published URL if visible
- publishing time
- views
- saves
- shares
- messages
- leads
- anonymous feedback

After 24 hours, check:

- views
- saves
- shares
- private messages
- whether anyone asked for preview or price

## 4. Optional Xianyu Listing

Only do this if product delivery and refund handling are ready.

Copy the Xianyu asset from:

`reports/ebos/external-publishing/packs/2026-07-03-external-publishing-pack.md`

After publishing, record:

- published URL
- views
- messages
- orders
- paid orders
- revenue
- refunds
- anonymous feedback

## 5. Optional Taobao Listing

Only do this if product delivery, customer support, and refund flow are ready.

Copy the Taobao asset from:

`reports/ebos/external-publishing/packs/2026-07-03-external-publishing-pack.md`

After publishing, record:

- published URL
- views
- clicks
- messages
- orders
- paid orders
- revenue
- refunds

## 6. Optional Whop Listing

Only do this in an authorized Whop account environment.

Copy the Whop asset from:

`reports/ebos/external-publishing/packs/2026-07-03-external-publishing-pack.md`

After publishing, record:

- published URL
- listing views
- clicks
- messages
- paid orders
- revenue
- refunds

## 7. Where To Fill Real Results

Fill the real results into:

`reports/ebos/external-publishing/inputs/2026-07-03-external-publish-result-input.json`

Rules:

- Set `published=true` only after a real post, listing, or outreach happened.
- Fill `publishedUrl` only if the platform gives a real URL.
- Keep every unknown number at `0`.
- Add only anonymous feedback summaries.
- Do not add invented screenshots, invented URLs, or invented metrics.

