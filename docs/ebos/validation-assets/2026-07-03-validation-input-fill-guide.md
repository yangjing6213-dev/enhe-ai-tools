# validation-input 填写指南

日期：2026-07-03  
文件：`reports/ebos/validation/inputs/2026-07-03-validation-input.json`

## 1. 打开哪个文件填写

只填写：

```text
reports/ebos/validation/inputs/2026-07-03-validation-input.json
```

不要改 tracker、decision report、weekly report 或 evidence catalog 来代替真实执行结果。

## 2. AI Prompt Kit 字段怎么填

- `status`：准备开始执行填 `running`；有真实结果并完成阶段复盘填 `completed`；决定不执行填 `skipped`。
- `pageViews`：验证页真实浏览数。
- `ctaClicks`：验证页 CTA 真实点击数。
- `leads`：真实留下联系方式、明确咨询或进入后续沟通的人数。
- `conversionRate`：如果手动计算，使用真实 `leads / pageViews` 或 `paidOrders / pageViews`；否则保持 0。
- `listingViews`：平台上架真实浏览数。
- `messages`：平台或私域真实咨询数。
- `presaleOrders`：真实预售订单数。
- `paidOrders`：真实已付款订单数。
- `revenue`：真实到账金额。
- `userFeedback`：用户原话摘要，不要编造。
- `channelResults`：记录真实发布渠道、链接、浏览、点击、咨询和备注。
- `notes`：记录页面路径、CTA 事件、上架文案路径、执行限制。

## 3. FaceSwap Studio 字段怎么填

- `status`：准备文案和入口后可填 `running`；完成阶段复盘填 `completed`。
- `priceShown`：实际展示给用户的价格。
- `ctaClicks`：所有相关 CTA 点击数。
- `paidOrders`：真实付款订单数。
- `refundCount`：真实退款数。
- `feedback`：真实价格或使用反馈。
- `productPageViews`：产品页真实浏览数。
- `productPageCtaClicks`：产品页 CTA 真实点击数。
- `listingViews`：上架平台真实浏览数。
- `messages`：真实咨询数。
- `deliveryFeedback`：真实交付、安装或使用反馈。
- `supportQuestions`：真实支持问题数。
- `notes`：记录产品页路径、上架文案路径、事件名和未执行原因。

## 4. AI Video Studio 字段怎么填

- `status`：准备文案和入口后可填 `running`；完成阶段复盘填 `completed`。
- `priceShown`：实际展示价格。
- `ctaClicks`：所有相关 CTA 点击数。
- `paidOrders`：真实付款订单数。
- `refundCount`：真实退款数。
- `feedback`：真实设备、价格或使用反馈。
- `productPageViews`：产品页真实浏览数。
- `productPageCtaClicks`：产品页 CTA 真实点击数。
- `listingViews`：上架平台真实浏览数。
- `messages`：真实咨询数。
- `deliveryFeedback`：真实部署、显卡、安装或交付反馈。
- `supportQuestions`：真实支持问题数。
- `notes`：记录产品页路径、上架文案路径、事件名和执行限制。

## 5. running / completed / skipped 使用规则

- `running`：资产已准备，正在或即将执行验证，但还没有阶段结论。
- `completed`：验证周期结束，已记录真实数据并生成报告。
- `skipped`：明确不执行该计划，并在 `notes` 写原因。
- `not_started`：尚未准备或尚未决定开始。

## 6. 没有数据是否填 0

是。数字字段没有真实数据时填 `0`，字符串字段没有信息时填空字符串，数组字段没有内容时填 `[]`。

不能把“感觉有人会点”“预计会成交”“应该有浏览”写成真实指标。

## 7. 用户反馈怎么记录

只记录真实用户表达，例如：

- “价格可以接受，但想先看目录。”
- “显卡不够，暂时不买。”
- “希望增加英文版。”

不要把自己的判断写成用户反馈。自己的判断写到 `notes`。

## 8. 退款原因怎么记录

如果发生退款，在对应 plan 中记录：

- `refundCount`
- `feedback` 或 `deliveryFeedback`
- `notes` 中补充退款原因、时间、是否交付、是否有支持问题

没有退款时保持 `refundCount: 0`。

## 9. 填完后运行哪些命令

```bash
npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03
```

如果 check 命令失败，先修正 JSON 结构和字段类型，再生成报告。
