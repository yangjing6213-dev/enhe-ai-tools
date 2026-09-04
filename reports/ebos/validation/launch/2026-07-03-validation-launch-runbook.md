# ENHE Validation Launch Operator Runbook

## 1. 发布目标
发布并验证 AI Prompt Kit 最小可交付产品的真实需求，形成可复盘的外部渠道和站内证据。

## 2. 当前准备状态
- readinessStatus=ready_with_warnings
- readinessScore=98
- blockers=0
- warnings=1

## 3. 验证页检查
- /validation/ai-prompt-kit: exists=true, hero=true, summary=true, CTA=true, FAQ=true, compliance=true, tracking=true, metadata=true
- /en/validation/ai-prompt-kit: exists=true, hero=true, summary=true, CTA=true, FAQ=true, compliance=true, tracking=true, metadata=true

## 4. CTA Tracking 检查
- validation_ai_prompt_kit_cta_click: found=true
- validation_faceswap_cta_click: found=true
- validation_ai_video_cta_click: found=true

## 5. 验证素材检查
- AI Prompt Kit landing page copy: ready=true
- AI Prompt Kit marketplace listing copy: ready=true
- AI Prompt Kit minimum product draft: ready=true
- AI Video Studio validation copy: ready=true
- Codex operator summary: ready=true
- FaceSwap validation copy: ready=true
- Social promotion copy: ready=true
- Three-day validation checklist: ready=true
- Validation input fill guide: ready=true

## 6. 外部渠道发布步骤
- 闲鱼发布: 使用 AI Prompt Kit 标题、卖点、价格测试和 FAQ 文案发布或准备草稿。
- 淘宝发布: 整理商品标题、详情页、交付说明、售后边界和价格测试信息。
- Whop listing: 整理英文 listing、benefits、delivery、FAQ、support 和 pricing 文案。
- 小红书笔记: 使用合规种草文案说明场景、交付物和咨询入口。
- 微信私域: 整理朋友圈、私聊、社群发布文本和用户咨询记录口径。

## 7. 数据填报与导入步骤
- 生成 external intake template: npx tsx scripts/generate-ebos-external-intake-template.ts --date 2026-07-03
- 等待用户提供真实数据: 只接收真实发生的浏览、点击、咨询、订单、收入、退款、反馈。
- dry-run import: npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03
- 检查异常值: 检查异常高点击、订单、收入、退款和空字段，不确定时保留 warning。
- --apply: npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03 --apply
- 重新生成 validation / decision / weekly / monthly: npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03 && npx tsx scripts/generate-ebos-decision-report.ts --date 2026-07-03 && npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03 && npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03

## 8. Codex 可执行命令
- npm run build
- npm run lint
- npm run typecheck
- npx tsx scripts/check-ebos-validation-launch-readiness.ts --date 2026-07-03
- npx tsx scripts/check-ebos-validation-launch-readiness.ts --date 2026-07-03
- npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
- npx tsx scripts/generate-ebos-external-intake-template.ts --date 2026-07-03
- npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
- npx tsx scripts/generate-ebos-decision-report.ts --date 2026-07-03
- npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
- npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03

## 9. 用户最少动作
- 确认发布验证页，或明确说明暂缓发布的原因。
- 把平台文案复制到外部平台，不需要手动改代码。
- 真实发生咨询、订单、退款或用户反馈后，把数据复制给 Codex，不能补猜。

Codex 不会替你编造外部平台数据；用户只需要确认发布、复制文案、在真实发生数据后提供记录。

## 10. 回滚与风险
- 如果 validation page 编译、路由、CTA tracking 或合规文案失败，先暂缓发布并修复 readiness blockers。
- 如果外部平台文案被平台拒绝，保留拒绝原因，不要绕过平台规则。
- 如果没有真实用户行为，validation input 保持 0、空字符串或空数组，不要补猜。
- 如果导入 external intake 后发现异常值，恢复 validation input backup，并重新执行 dry-run。

## 11. 下一步复盘
- 发布后 24-72 小时收集真实 CTA、咨询、订单、退款和反馈。
- 把外部渠道数据填入 external intake input。
- 执行 dry-run import，确认无异常后 --apply。
- 重新生成 validation / decision / weekly / monthly 报告。

## Warnings
- Codex 不能伪造外部平台数据。
- Codex 不能登录闲鱼、淘宝、Whop、小红书、微信或其他外部平台。
- 真实订单、咨询、退款、点击和用户反馈必须来自真实用户行为。
- External intake input exists but is not filled with real channel data.
