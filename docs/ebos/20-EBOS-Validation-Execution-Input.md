# EBOS Validation Execution Input v1

## 1. 为什么需要 Validation Execution Input

Validation Result Tracker 只能说明要验证什么，Execution Input 负责说明怎么执行、哪些字段要记录、哪些渠道要观察，以及哪些结果不能被伪造。它把验证计划转成可填写的执行记录结构。

## 2. 与其它 EBOS 文件的关系

- Decision Report: 决定本轮优先验证方向。
- Validation Tracker: 把 Decision Report 的 validation plans 转成可追踪计划。
- Validation Execution Input: 把每个计划转成执行清单、渠道记录和可填写字段。
- Validation Result Report: 读取真实 `validation-input.json` 后判断 continue、adjust、stop 或 scale。

Validation Execution Input 暂时不是 evidence kind，不进入 Evidence Catalog。

## 3. 生成 execution input

```bash
npx tsx scripts/generate-ebos-validation-execution-input.ts --date 2026-07-03
```

输出：

- `reports/ebos/validation/execution/YYYY-MM-DD-validation-execution-input.json`
- `reports/ebos/validation/execution/YYYY-MM-DD-validation-execution-input.md`
- `reports/ebos/validation/inputs/YYYY-MM-DD-validation-input.json`

如果真实 input 已存在，脚本不会覆盖。确实需要重建时再使用：

```bash
npx tsx scripts/generate-ebos-validation-execution-input.ts --date 2026-07-03 --force
```

## 4. 如何填写 validation-input.json

只填写真实观察到的数据。未知数字保持 `0`，未知文本保持空字符串，未知数组保持 `[]`。不要修改 `planId`。

常见字段：

- `status`: `not_started`、`running`、`completed`、`skipped`。
- `ctaClicks`: CTA 点击。
- `leads`: 留资或有效线索。
- `paidOrders`: 已支付订单。
- `presaleOrders`: 预售订单。
- `revenue`: 实收收入。
- `refundCount`: 退款数量。
- `userFeedback`: 用户反馈。
- `notes`: 执行说明或不确定信息。

## 5. AI Prompt Kit 应记录的指标

- landing page: `pageViews`、`ctaClicks`、`leads`、`conversionRate`、`notes`。
- marketplace / listing: `listingViews`、`messages`、`orders`、`revenue`。
- presale: `presaleOrders`、`paidOrders`、`revenue`、`refundCount`、`buyerFeedback`。

## 6. FaceSwap Studio 应记录的指标

- product page CTA: `productPageViews`、`productPageCtaClicks`、`ctaClicks`。
- pricing test: `priceShown`、`paidOrders`、`refundCount`、`feedback`。
- marketplace listing: `listingViews`、`messages`、`orders`、`revenue`。
- delivery/support: `deliveryFeedback`、`supportQuestions`、`notes`。

## 7. AI Video Studio 应记录的指标

- product page CTA: `productPageViews`、`productPageCtaClicks`、`ctaClicks`。
- pricing test: `priceShown`、`paidOrders`、`refundCount`、`feedback`。
- marketplace listing: `listingViews`、`messages`、`orders`、`revenue`。
- delivery/support: `deliveryFeedback`、`supportQuestions`、`notes`。

## 8. 不同渠道如何记录结果

- website: 记录页面访问、CTA 点击、线索、产品页反馈。
- whop / taobao / xianyu: 记录 listing views、messages、orders、revenue。
- xiaohongshu / douyin / wechat: 记录内容曝光、评论、私信、留资。
- manual_outreach / email: 记录 outreach count、positive replies、negative replies、calls booked、orders。

## 9. 如何判断 success / partial_success / failed

- landing_page: `CTA clicks >= 10` 是 partial_success，`leads >= 3` 是 success。
- presale: `presaleOrders >= 1` 是 success；`revenue > 0` 且 `refundCount = 0` 可以 continue 或 scale。
- content_test: `contentViews >= 100` 且 `CTA clicks >= 5` 是 partial_success，`leads >= 2` 是 success。
- marketplace_listing: `messages >= 3` 是 partial_success，`orders >= 1` 是 success。
- manual_outreach: `positiveReplies >= 3` 是 partial_success，`orders >= 1` 是 success。
- pricing_test: `paidOrders >= 1` 且 `refundCount = 0` 是 success；有订单但有退款是 partial_success，需要分析退款原因。

## 10. 下一周 EBOS 如何使用这些结果调权

生成并填写 `validation-input.json` 后，运行：

```bash
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
```

下一轮 Weekly / Monthly / Decision 会读取 Validation Result Report：

- success / scale: 提高该方向优先级。
- partial_success: 进入调整计划。
- failed / stop: 降低优先级或暂停。
- not_started / inconclusive: 提示继续记录结果，不把空结果当失败。

## 11. 边界

- 不开发 `/admin/ebos` UI。
- 不新增数据库 migration。
- 不新增依赖。
- 不调用外部 API。
- 不读取或打印 secret。
- 不伪造 CTA、线索、订单、收入、退款或用户反馈。
