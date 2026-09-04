# EBOS Validation Launch Operator Guide

## 1. 为什么需要 Launch Operator Guide

Step 10 已经把外部渠道数据填报模板、导入脚本、validation report、decision report、weekly report 和 monthly review 串起来。Step 10.5 的目标是把 AI Prompt Kit 验证页发布前检查、外部渠道发布素材、异常值审查、导入回填和复盘命令固化成 Codex 可执行 runbook，减少用户手动操作。

## 2. Codex 可以全权处理哪些事

- 本地扫描验证页路由、共享组件、CTA tracking、SEO/GEO 基础结构和合规提示。
- 检查 `docs/ebos/validation-assets` 中的 9 份发布素材。
- 检查 external intake template/input/import report 是否存在。
- 生成 readiness JSON/Markdown。
- 生成 launch runbook JSON/Markdown。
- 在外部数据由用户真实提供后，执行 dry-run import、异常值检查、`--apply` 和下游报告再生成。

## 3. 哪些事必须由用户确认或提供真实数据

- 是否发布验证页，以及是否把平台文案复制到闲鱼、淘宝、Whop、小红书、微信等外部平台。
- 外部平台真实浏览、点击、收藏、咨询、订单、收入、退款和用户反馈。
- 平台拒审、违规提示、用户聊天记录或成交记录的真实截图/文本摘要。

Codex 不能登录外部平台，不能替用户发布，不能伪造任何外部平台数据。

## 4. 如何运行 readiness check

```bash
npx tsx scripts/check-ebos-validation-launch-readiness.ts --date 2026-07-03
```

输出：

- `reports/ebos/validation/launch/2026-07-03-validation-launch-readiness.json`
- `reports/ebos/validation/launch/2026-07-03-validation-launch-readiness.md`

重点看：

- `readinessStatus`
- `readinessScore`
- `blockers`
- `warnings`
- `validationPages`
- `trackingChecks`
- `assetFiles`
- `externalIntakeChecks`

## 5. 如何运行 runbook 生成

```bash
npx tsx scripts/generate-ebos-validation-launch-runbook.ts --date 2026-07-03
```

输出：

- `reports/ebos/validation/launch/2026-07-03-validation-launch-runbook.json`
- `reports/ebos/validation/launch/2026-07-03-validation-launch-runbook.md`

runbook 会引用同日期 readiness report。如果 readiness report 不存在，runbook 仍会生成，但会提示先运行 readiness check。

## 6. 如何根据 runbook 发布验证页

1. 先运行 `npm run lint`、`npm run typecheck`、`npm run build`。
2. 运行 readiness check，确认没有 `blocked`。
3. 如果状态是 `ready` 或 `ready_with_warnings`，再生成 runbook。
4. 按 runbook 的用户最少动作确认发布页，并复制素材到外部平台。
5. 发布后不要补猜数据，只记录真实发生的点击、咨询、订单、收入、退款和反馈。

## 7. 如何回填外部渠道数据

1. 生成或确认 external intake input：

```bash
npx tsx scripts/generate-ebos-external-intake-template.ts --date 2026-07-03
```

2. 用户提供真实外部渠道数据后，填入：

```text
reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json
```

3. 先 dry-run：

```bash
npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03
```

4. 检查异常值，再 apply：

```bash
npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03 --apply
```

## 8. 如何重新生成 validation / decision / weekly / monthly

```bash
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-decision-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03
```

weekly/monthly 生成脚本会读取同日期 launch readiness report，并在计划里引用 `readinessStatus`。

## 9. 风险边界

- 不伪造浏览、点击、咨询、订单、收入、退款或用户反馈。
- 不登录闲鱼、淘宝、Whop、小红书、微信等外部平台。
- 不绕过平台规则。
- 不读取或打印 secret value。
- 不把未发生的外部平台数据写入 validation input。
- 不新增 `/admin/ebos` UI。
- 不新增 Prisma migration。
