# Codex Validation Operator Summary

日期：2026-07-03  
阶段：Step 9.8 - Codex Validation Operator Mode v1

## 1. Codex 本轮完成了什么

- 准备 AI Prompt Kit 最小产品定义。
- 准备 AI Prompt Kit 官网落地页文案，中英文各一套。
- 准备 AI Prompt Kit 平台上架文案，覆盖闲鱼、淘宝、Whop、小红书和微信私域。
- 准备 FaceSwap Studio 验证文案、价格测试、FAQ、合规提示和记录字段。
- 准备 AI Video Studio 验证文案、显卡/部署门槛说明、FAQ 和记录字段。
- 准备小红书、朋友圈、微信群和私聊回复文案。
- 准备 3 天验证执行清单。
- 准备 validation-input 填写指南。
- 准备站内 AI Prompt Kit 验证页和 CTA tracking。

## 2. 已经可以直接使用的资产

- AI Prompt Kit 验证页：`/validation/ai-prompt-kit`
- AI Prompt Kit 英文验证页：`/en/validation/ai-prompt-kit`
- CTA 事件：`validation_ai_prompt_kit_cta_click`
- FaceSwap 建议事件：`validation_faceswap_cta_click`
- AI Video 建议事件：`validation_ai_video_cta_click`
- 上架与社媒文案：`docs/ebos/validation-assets/`
- 填写文件：`reports/ebos/validation/inputs/2026-07-03-validation-input.json`

## 3. 用户只需要做的最少动作

1. 打开验证页，确认 AI Prompt Kit 的价格和交付范围是否可以对外展示。
2. 从文档中选择 1 个平台上架文案发布。
3. 从社交推广文案中选择 1 条发布到小红书、朋友圈或微信群。
4. 手动回复真实咨询。
5. 把真实发生的浏览、点击、咨询、订单、退款和反馈填回 validation-input。

## 4. 不能由 Codex 代填的数据

以下真实数据不能由 Codex 代填：

- 页面浏览量
- CTA 点击数
- 用户咨询数
- 预售订单数
- 已付款订单数
- 收入金额
- 退款数
- 用户原话反馈
- 平台上架后的真实浏览和消息

没有真实发生时必须保持 `0`、空字符串或空数组。

## 5. 下一次应运行的命令

```bash
npm run test -- src/lib/ebos
npm run lint
npm run typecheck
npm run build
npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03
```

## 6. 如果用户完全不会操作，下一步建议 Codex 做什么

在不登录外部平台、不调用外部 API、不伪造数据的前提下，下一步建议 Codex 做一个本地执行包：

- 生成 1 页可打印的发布顺序表。
- 生成可复制的发布清单，用户只需要逐条复制到平台。
- 准备一个手动记录表格模板。
- 在用户真实执行后，协助把用户提供的真实数据填入 validation-input。
