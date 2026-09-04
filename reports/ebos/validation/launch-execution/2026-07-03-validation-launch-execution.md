# ENHE Validation Launch Execution Report

## 1. 当前发布状态
- targetDate: 2026-07-03
- generatedAt: 2026-07-04T08:57:05.437Z
- launchStatus: ready_to_deploy
- readinessReportPath: reports/ebos/validation/launch/2026-07-03-validation-launch-readiness.json
- runbookPath: reports/ebos/validation/launch/2026-07-03-validation-launch-runbook.json
- Codex 可以执行发布前检查、报告生成、dry-run 和数据回填整理。
- 用户必须确认真实部署、外部平台发布和真实数据来源。
- 不伪造数据：浏览、点击、消息、订单、收入、退款、反馈都只能来自真实观察。

## 2. 发布前检查清单
- manual_required | build | Run lint before launch | npm run lint
- manual_required | build | Run typecheck before launch | npm run typecheck
- manual_required | build | Run production build before launch | npm run build
- pass | route | Validate route /validation/ai-prompt-kit | /validation/ai-prompt-kit must exist and include Hero, summary, CTA, FAQ, compliance notice, and metadata.
- pass | route | Validate route /en/validation/ai-prompt-kit | /en/validation/ai-prompt-kit must exist and include Hero, summary, CTA, FAQ, compliance notice, and metadata.
- pass | seo | Confirm metadata | metadata must be present on validation pages.
- manual_required | seo | Confirm title | title must match the AI Prompt Kit validation offer.
- manual_required | seo | Confirm description | description must explain the validation offer without fabricated outcomes.
- pass | seo | Confirm FAQ | FAQ must be present for SEO/GEO answerability.
- pass | seo | Confirm summary | summary must be present for AI answer engines.
- pass | tracking | Confirm tracking event validation_ai_prompt_kit_cta_click | validation_ai_prompt_kit_cta_click must be present in the tracking plan and analytics whitelist.
- pass | tracking | Confirm tracking event validation_faceswap_cta_click | validation_faceswap_cta_click must be present in the tracking plan and analytics whitelist.
- pass | tracking | Confirm tracking event validation_ai_video_cta_click | validation_ai_video_cta_click must be present in the tracking plan and analytics whitelist.
- manual_required | validation_input | Confirm validation-input.json exists | reports/ebos/validation/inputs/2026-07-03-validation-input.json must exist before launch data capture.
- warning | external_intake | Confirm external-intake-input.json exists | reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json should exist; keep real channel data empty until observed.
- manual_required | validation_input | Confirm capture report exists | reports/ebos/validation/capture/2026-07-03-validation-capture-report.json should be available for manual slots.
- pass | deployment | Confirm launch readiness status | Launch readiness status is ready_with_warnings; ready_with_warnings is acceptable only when warnings are understood.
- manual_required | deployment | Confirm deployment is user-approved before claiming deployed status | Do not set deployed_pending_verification until deployment is explicitly confirmed.
- manual_required | rollback | Rollback validation route if launch fails | If route deployment fails, rollback the validation route change only; do not clean the whole worktree.
- manual_required | rollback | Rollback tracking event whitelist only if needed | If tracking breaks build/runtime, rollback the tracking event whitelist entry with a scoped change.
- manual_required | rollback | Keep reports during rollback | Keep reports/ebos artifacts for audit; do not delete evidence while rolling back site code.

## 3. 验证页路由
- Validate route /validation/ai-prompt-kit: /validation/ai-prompt-kit must exist and include Hero, summary, CTA, FAQ, compliance notice, and metadata.
- Validate route /en/validation/ai-prompt-kit: /en/validation/ai-prompt-kit must exist and include Hero, summary, CTA, FAQ, compliance notice, and metadata.

## 4. SEO/GEO 与 CTA Tracking
- Confirm metadata: metadata must be present on validation pages.
- Confirm title: title must match the AI Prompt Kit validation offer.
- Confirm description: description must explain the validation offer without fabricated outcomes.
- Confirm FAQ: FAQ must be present for SEO/GEO answerability.
- Confirm summary: summary must be present for AI answer engines.
- Confirm tracking event validation_ai_prompt_kit_cta_click: validation_ai_prompt_kit_cta_click must be present in the tracking plan and analytics whitelist.
- Confirm tracking event validation_faceswap_cta_click: validation_faceswap_cta_click must be present in the tracking plan and analytics whitelist.
- Confirm tracking event validation_ai_video_cta_click: validation_ai_video_cta_click must be present in the tracking plan and analytics whitelist.

## 5. 外部平台复制发布包
- xianyu: AI Prompt Kit marketplace listing for Xianyu; 用户动作: Copy the prepared title, description, FAQ, price test, and delivery notes into Xianyu manually.; 记录字段: views, messages, orders, revenue, refundCount, userFeedback
- taobao: AI Prompt Kit Taobao listing structure; 用户动作: Copy the product title, detail-page structure, after-sales notes, and compliance copy into Taobao manually.; 记录字段: views, clicks, messages, orders, revenue, refundCount, userFeedback
- whop: AI Prompt Kit Whop listing; 用户动作: Copy the English title, description, delivery notes, content configuration, support notes, and pricing test into Whop manually.; 记录字段: views, clicks, leads, orders, revenue, refundCount, userFeedback
- xiaohongshu: AI Prompt Kit Xiaohongshu notes; 用户动作: Choose one of the prepared note angles, publish it manually, and record only observed platform metrics.; 记录字段: views, saves, shares, messages, leads
- wechat: AI Prompt Kit WeChat copy; 用户动作: Copy the prepared WeChat Moments, group, or direct-message copy manually and record only real replies.; 记录字段: messages, leads, positiveReplies, orders

## 6. 上线后 Smoke Test
- pending | http_status | http://localhost:3000/validation/ai-prompt-kit | expected=200 | Page responds with 200.
- pending | page_content | http://localhost:3000/validation/ai-prompt-kit | expected=200 | Hero, FAQ, and compliance notice are visible.
- pending | cta_present | http://localhost:3000/validation/ai-prompt-kit | expected=200 | CTA copy is present and does not claim unobserved results.
- pending | metadata | http://localhost:3000/validation/ai-prompt-kit | expected=200 | Title and description metadata are present.
- pending | tracking_plan | http://localhost:3000/validation/ai-prompt-kit | expected=200 | CTA tracking plan includes validation_ai_prompt_kit_cta_click.
- pending | http_status | http://localhost:3000/en/validation/ai-prompt-kit | expected=200 | Page responds with 200.
- pending | page_content | http://localhost:3000/en/validation/ai-prompt-kit | expected=200 | Hero, FAQ, and compliance notice are visible.
- pending | cta_present | http://localhost:3000/en/validation/ai-prompt-kit | expected=200 | CTA copy is present and does not claim unobserved results.
- pending | metadata | http://localhost:3000/en/validation/ai-prompt-kit | expected=200 | Title and description metadata are present.
- pending | tracking_plan | http://localhost:3000/en/validation/ai-prompt-kit | expected=200 | CTA tracking plan includes validation_ai_prompt_kit_cta_click.
- pending | http_status | https://www.enhe-tech.com.cn/validation/ai-prompt-kit | expected=200 | Page responds with 200.
- pending | page_content | https://www.enhe-tech.com.cn/validation/ai-prompt-kit | expected=200 | Hero, FAQ, and compliance notice are visible.
- pending | cta_present | https://www.enhe-tech.com.cn/validation/ai-prompt-kit | expected=200 | CTA copy is present and does not claim unobserved results.
- pending | metadata | https://www.enhe-tech.com.cn/validation/ai-prompt-kit | expected=200 | Title and description metadata are present.
- pending | tracking_plan | https://www.enhe-tech.com.cn/validation/ai-prompt-kit | expected=200 | CTA tracking plan includes validation_ai_prompt_kit_cta_click.
- pending | http_status | https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | expected=200 | Page responds with 200.
- pending | page_content | https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | expected=200 | Hero, FAQ, and compliance notice are visible.
- pending | cta_present | https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | expected=200 | CTA copy is present and does not claim unobserved results.
- pending | metadata | https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | expected=200 | Title and description metadata are present.
- pending | tracking_plan | https://www.enhe-tech.com.cn/en/validation/ai-prompt-kit | expected=200 | CTA tracking plan includes validation_ai_prompt_kit_cta_click.

## 7. 外部数据回填流程
- user: User publishes external platforms
- user: User copies real data to Codex
- codex: Codex writes external-intake-input.json - reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json
- codex: dry-run import - npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03
- codex: apply import - npx tsx scripts/import-ebos-external-intake.ts --date 2026-07-03 --apply
- codex: check validation input - npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
- codex: generate validation report - npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03
- codex: generate decision report - npx tsx scripts/generate-ebos-decision-report.ts --date 2026-07-03
- codex: generate weekly/monthly - npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03 && npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03

## 8. Codex 可执行步骤
- Run build check: npm run build
- Run lint check: npm run lint
- Run typecheck check: npm run typecheck
- Check validation page files: npx tsx scripts/check-ebos-validation-launch-readiness.ts --date 2026-07-03
- Check CTA tracking: npx tsx scripts/check-ebos-validation-launch-readiness.ts --date 2026-07-03
- Check validation-input status: npx tsx scripts/check-ebos-validation-input.ts --date 2026-07-03
- Check external intake template: npx tsx scripts/generate-ebos-external-intake-template.ts --date 2026-07-03
- Generate validation launch execution report: npx tsx scripts/generate-ebos-validation-launch-execution.ts --date 2026-07-03
- Prepare post-launch dry-run check: npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn --dry-run

## 9. 用户最少动作
- 确认发布验证页，或明确说明暂缓发布的原因。
- 把平台文案复制到外部平台，不需要手动改代码。
- 真实发生咨询、订单、退款或用户反馈后，把数据复制给 Codex，不能补猜。

## 10. 回滚方案
- Rollback validation route if launch fails: If route deployment fails, rollback the validation route change only; do not clean the whole worktree.
- Rollback tracking event whitelist only if needed: If tracking breaks build/runtime, rollback the tracking event whitelist entry with a scoped change.
- Keep reports during rollback: Keep reports/ebos artifacts for audit; do not delete evidence while rolling back site code.

## 11. 下一步命令
- npm run lint
- npm run typecheck
- npm run build
- npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn --dry-run
- npx tsx scripts/generate-ebos-weekly-report.ts --date 2026-07-03
- npx tsx scripts/generate-ebos-monthly-review.ts --date 2026-07-03

## Warnings
- Codex can prepare launch execution, but cannot log in to external platforms.
- Do not fabricate external platform data.
- External intake input exists but is not filled with real channel data.
- Confirm external-intake-input.json exists: reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json should exist; keep real channel data empty until observed.

## Blockers
- none
