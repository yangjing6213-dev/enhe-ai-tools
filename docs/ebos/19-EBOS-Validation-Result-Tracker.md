# EBOS Validation Result Tracker v1

## 1. 作用

Validation Result Tracker 把 Decision Report 中的 validation plans 转成可手工填写的 JSON/Markdown 跟踪结构。它记录计划是否开始、CTA 点击、线索、预售、订单、收入、退款、人工外联和用户反馈，然后生成 validation result report，供下一次 EBOS 决策引用。

## 2. 为什么要在自动调度前完成

在自动调度周报、月报、决策复盘前，EBOS 必须先知道上一次验证是否产生了真实信号。否则系统只能不断生成新计划，无法判断一个方向应该继续、调整、停止或放大。

## 3. 和 Decision Report 的关系

Decision Report 负责提出本周优先方向和验证计划。Validation Tracker 负责承接这些计划并记录结果。Validation Result Report 会作为 decision feedback artifact 被下一轮 Decision / Weekly / Monthly 读取，但它不改变原始 evidence catalog。

## 4. 为什么暂时不是 evidence kind

Validation Result 是对决策计划的执行反馈，不是独立的数据源证据。它可能来自手工记录，字段也可能不完整。v1 先把它保持为 decision feedback artifact，避免把未审计的手工记录混入 Evidence Catalog。

## 5. 生成 validation template

```bash
npx tsx scripts/generate-ebos-validation-template.ts --date 2026-07-03
```

可选指定 decision report：

```bash
npx tsx scripts/generate-ebos-validation-template.ts --date 2026-07-03 --decision-report reports/ebos/decision/2026-07-03-decision-report.json
```

输出文件：

- `reports/ebos/validation/templates/YYYY-MM-DD-validation-tracker.json`
- `reports/ebos/validation/templates/YYYY-MM-DD-validation-tracker.md`
- `reports/ebos/validation/inputs/YYYY-MM-DD-validation-input.example.json`

## 6. 填写 validation input

复制或参考 `.example.json` 的结构，创建实际输入文件，例如：

```json
{
  "trackerPath": "reports/ebos/validation/templates/2026-07-03-validation-tracker.json",
  "targetDate": "2026-07-03",
  "results": [
    {
      "planId": "validation-direction-3-ai-prompt-kit",
      "status": "completed",
      "ctaClicks": 12,
      "leads": 3,
      "paidOrders": 1,
      "revenue": 99,
      "refundCount": 0,
      "notes": "Manual validation completed."
    }
  ]
}
```

未知字段可以留空。不要补造点击、线索、订单或收入。

## 7. 字段含义

- `planId`: 必须和 tracker 中的 validation plan id 一致。
- `status`: `not_started`、`running`、`completed`、`skipped`。
- `actualMetricValue`: 某个自定义指标的实际值。
- `actualMetricLabel`: 自定义指标名称。
- `ctaClicks`: CTA 点击数。
- `leads`: 留资或有效线索数。
- `presaleOrders`: 预售订单数。
- `paidOrders`: 已付费订单数。
- `revenue`: 实收收入。
- `refundCount`: 退款数量。
- `manualOutreachCount`: 人工外联次数。
- `positiveReplies`: 正向回复数。
- `negativeReplies`: 负向回复数。
- `userFeedback`: 用户反馈文本数组。
- `channelResults`: 分渠道结果记录。
- `notes`: 补充说明。
- `completedAt`: 验证完成时间。

## 8. 生成 validation result report

无 input 时也可以生成报告，所有计划会保持 `not_started` 或 `inconclusive`，不会被误判失败：

```bash
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
```

使用实际 input：

```bash
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03 --input reports/ebos/validation/inputs/2026-07-03-validation-input.json
```

输出文件：

- `reports/ebos/validation/reports/YYYY-MM-DD-validation-result-report.md`
- `reports/ebos/validation/reports/YYYY-MM-DD-validation-result-report.json`

## 9. 结果解释

- `success`: 达到订单、收入或阈值信号，建议继续或放大。
- `partial_success`: 有 CTA、线索、回复或反馈，但尚未形成干净订单证据，建议调整。
- `failed`: 已完成但没有足够需求信号，建议停止或降低优先级。
- `inconclusive`: 结果不足，不能判断。
- `not_started`: 尚未开始或尚未记录结果。

## 10. 让下一周 EBOS 调整方向

Weekly / Monthly / Decision 生成脚本会读取最新 validation result report：

- 有 success / scale 时，下一轮计划会引用该方向并建议继续或放大。
- 有 failed / stop 时，下一轮计划会降低该方向优先级或建议暂停。
- 没有 input / report 时，Weekly / Monthly 会提示“需要记录验证结果”。

## 11. v1 边界

- 不开发 `/admin/ebos` UI。
- 不新增数据库 migration。
- 不新增依赖。
- 不调用外部 API。
- 不读取或打印 secret。
- 不把 validation result 加入 Evidence Catalog。
