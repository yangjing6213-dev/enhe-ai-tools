# 3 天验证执行清单

日期：2026-07-03  
原则：只记录真实发生的数据；没有发生时保持 0 或空值。

## Day 1

- 上线/优化 AI Prompt Kit 验证页。
- 准备 1 个平台上架。
- 发布 1 篇小红书/朋友圈。
- 记录 `pageViews` / `ctaClicks` / `leads`。

执行备注：
- 页面路径：`/validation/ai-prompt-kit`、`/en/validation/ai-prompt-kit`。
- CTA 事件：`validation_ai_prompt_kit_cta_click`。
- 如果没有真实浏览、点击或咨询，不要填估算值。

## Day 2

- 优化 FaceSwap Studio 入口。
- 发布 FaceSwap 文案。
- 记录 `productPageViews` / `productPageCtaClicks` / `messages`。

执行备注：
- 参考产品页：`/software/faceswap-studio-ai`。
- 建议事件名：`validation_faceswap_cta_click`。
- 只在真实用户访问、点击或咨询后记录。

## Day 3

- 优化 AI Video Studio 入口。
- 发布 AI Video 文案。
- 汇总咨询 / 点击 / 订单 / 退款 / 反馈。
- 填写 `validation-input.json`。
- 重新生成 validation report。

执行备注：
- 参考产品页：`/software/local-ai-video-studio-for-creator-workflows`。
- 建议事件名：`validation_ai_video_cta_click`。
- 重新生成报告前先运行：

```bash
npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
```
