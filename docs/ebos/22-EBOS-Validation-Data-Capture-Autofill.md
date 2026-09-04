# EBOS Validation Data Capture & Autofill

## 1. 作用

Validation Data Capture & Autofill 用于读取 ENHE 站内已经存在的 analytics、订单、收入和退款数据，并把能够安全归因的字段回填到 `validation-input.json`。它只处理站内真实数据库和现有 report 中可读取的数据，不登录外部平台，不调用外部 API。

## 2. Codex 可以自动采集哪些数据

- 站内 AnalyticsEvent：验证页 CTA 点击、产品页 CTA 点击、可识别的 page view。
- 站内订单：已付款订单、可归因产品、订单金额。
- 站内退款记录：退款数量、退款金额。
- 现有 validation input：已有状态、notes、userFeedback、channelResults。

## 3. 必须来自真实外部平台或用户反馈的数据

- 闲鱼、淘宝、Whop、小红书、微信等外部渠道的浏览量。
- 外部渠道咨询、收藏、想要、私信、评论。
- 用户真实反馈、购买顾虑、退款原因。
- 手动触达数量、正向回复、渠道链接。

这些数据不能由 Codex 代填。没有真实数据时保持 `0`、空字符串或空数组。

## 4. 为什么默认 dry-run

Autofill 默认 dry-run，是为了先展示将要写入的字段，避免覆盖用户已经手动填写的更高数值或真实反馈。只有显式传入 `--apply` 才会写回。

## 5. 如何运行 capture

```bash
npx tsx scripts/capture-ebos-validation-data.ts --date 2026-07-03
```

输出：

- `reports/ebos/validation/capture/2026-07-03-validation-capture-report.json`
- `reports/ebos/validation/capture/2026-07-03-validation-capture-report.md`

## 6. 如何运行 autofill dry-run

```bash
npx tsx scripts/autofill-ebos-validation-input.ts --date 2026-07-03
```

dry-run 不会修改 `validation-input.json`，只输出 candidate changes、skipped changes 和下一步命令。

## 7. 如何使用 --apply

```bash
npx tsx scripts/autofill-ebos-validation-input.ts --date 2026-07-03 --apply
```

`--apply` 会先创建 backup，再写回 high/medium confidence 的安全 changes。默认不会用更低的自动采集值覆盖用户已经填写的更高数值。

如确实需要覆盖已有字段，可使用：

```bash
npx tsx scripts/autofill-ebos-validation-input.ts --date 2026-07-03 --apply --force
```

## 8. 如何查看 backup

备份目录：

```text
reports/ebos/validation/backups/
```

文件格式：

```text
YYYY-MM-DD-validation-input.backup.TIMESTAMP.json
```

## 9. 如何重新生成 validation report

```bash
npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03
```

如果 capture report 存在，validation report 会引用 capture summary。Weekly/Monthly 会继续提示外部渠道数据仍需补充。

## 10. 数据安全边界

- 不伪造 pageViews、ctaClicks、leads、messages、orders、revenue、refunds 或 feedback。
- 不登录外部平台。
- 不调用外部 API。
- 不打印 `DATABASE_URL`、API key 或其他 secret value。
- 数据库不可用时只输出 warning，不让脚本崩溃。
- 写回 `validation-input.json` 前必须 backup。
