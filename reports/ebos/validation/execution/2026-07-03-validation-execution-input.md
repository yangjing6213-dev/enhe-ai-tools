# ENHE Validation Execution Input

目标日期：2026-07-03
生成时间：2026-07-03T18:47:48.763Z
Decision Report：reports/ebos/decision/2026-07-03-decision-report.json
Validation Tracker：reports/ebos/validation/templates/2026-07-03-validation-tracker.json
填写文件：reports/ebos/validation/inputs/2026-07-03-validation-input.json

## 1. 本轮验证目标
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: Validate whether FaceSwap Studio｜本地人像合成研究工具 can produce first-revenue intent before starting new product work.
- Validate existing product: AI Video Studio｜本地视频生成工作台: Validate whether AI Video Studio｜本地视频生成工作台 can produce first-revenue intent before starting new product work.
- Validate AI Prompt Kit: Validate whether AI Prompt Kit can produce near-term purchase intent before heavy development.

## 2. 验证计划列表
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: method=pricing_test, status=not_started, threshold=CTA clicks >= 10 or leads >= 3 or presale orders >= 1 within 7 days.
- Validate existing product: AI Video Studio｜本地视频生成工作台: method=pricing_test, status=not_started, threshold=CTA clicks >= 10 or leads >= 3 or presale orders >= 1 within 7 days.
- Validate AI Prompt Kit: method=landing_page, status=not_started, threshold=CTA clicks >= 10 or leads >= 3 or presale orders >= 1.

## 3. AI Prompt Kit 执行记录
- Validate AI Prompt Kit
- 需要填写字段：pageViews, ctaClicks, leads, conversionRate, notes, listingViews, messages, presaleOrders, paidOrders, revenue
- 验收标准：Validate AI Prompt Kit has a clear offer, CTA, and tracking note.; All observed results are written to validation-input.json without fabricated metrics.; Every required channel has a URL, skipped reason, or manual note.

## 4. FaceSwap Studio 执行记录
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具
- 需要填写字段：priceShown, ctaClicks, paidOrders, refundCount, feedback, productPageViews, productPageCtaClicks, listingViews, messages, deliveryFeedback, supportQuestions
- 验收标准：Validate existing product: FaceSwap Studio｜本地人像合成研究工具 has a clear offer, CTA, and tracking note.; All observed results are written to validation-input.json without fabricated metrics.; Every required channel has a URL, skipped reason, or manual note.; Product delivery/support feedback is recorded when users ask about delivery or support.

## 5. AI Video Studio 执行记录
- Validate existing product: AI Video Studio｜本地视频生成工作台
- 需要填写字段：priceShown, ctaClicks, paidOrders, refundCount, feedback, productPageViews, productPageCtaClicks, listingViews, messages, deliveryFeedback, supportQuestions
- 验收标准：Validate existing product: AI Video Studio｜本地视频生成工作台 has a clear offer, CTA, and tracking note.; All observed results are written to validation-input.json without fabricated metrics.; Every required channel has a URL, skipped reason, or manual note.; Product delivery/support feedback is recorded when users ask about delivery or support.

## 6. 渠道记录表
- website: Validate existing product: FaceSwap Studio｜本地人像合成研究工具: publish or update ENHE page CTA.; fields=ctaClicks, productPageViews, productPageCtaClicks
- whop: Validate existing product: FaceSwap Studio｜本地人像合成研究工具: prepare marketplace listing copy.; fields=listingViews, messages
- website: Validate existing product: AI Video Studio｜本地视频生成工作台: publish or update ENHE page CTA.; fields=ctaClicks, productPageViews, productPageCtaClicks
- whop: Validate existing product: AI Video Studio｜本地视频生成工作台: prepare marketplace listing copy.; fields=listingViews, messages
- website: Validate AI Prompt Kit: publish or update ENHE page CTA.; fields=pageViews, ctaClicks, leads
- whop: Validate AI Prompt Kit: prepare marketplace listing copy.; fields=listingViews, messages, revenue

## 7. Codex 执行清单
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: Audit FaceSwap Studio｜本地人像合成研究工具 product page pricing, CTA, FAQ, and delivery copy.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: Draft a pricing test checklist for FaceSwap Studio｜本地人像合成研究工具.
- Validate existing product: AI Video Studio｜本地视频生成工作台: Audit AI Video Studio｜本地视频生成工作台 product page pricing, CTA, FAQ, and delivery copy.
- Validate existing product: AI Video Studio｜本地视频生成工作台: Draft a pricing test checklist for AI Video Studio｜本地视频生成工作台.
- Validate AI Prompt Kit: Draft one focused AI Prompt Kit validation page with pricing, FAQ, and CTA.
- Validate AI Prompt Kit: Add tracking notes for CTA clicks, leads, and manual purchase intent.
- Validate AI Prompt Kit: Create one comparison or use-case content brief supporting AI Prompt Kit.

## 8. 人工执行清单
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: Confirm the FaceSwap Studio｜本地人像合成研究工具 validation offer and price.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: Handle manual payment, lead follow-up, or customer questions.
- Validate existing product: AI Video Studio｜本地视频生成工作台: Confirm the AI Video Studio｜本地视频生成工作台 validation offer and price.
- Validate existing product: AI Video Studio｜本地视频生成工作台: Handle manual payment, lead follow-up, or customer questions.
- Validate AI Prompt Kit: Review the AI Prompt Kit offer and decide the validation price.
- Validate AI Prompt Kit: Respond manually to leads or presale inquiries within 24 hours.

## 9. 成功 / 失败判断规则
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: partial_success: paidOrders >= 1 and refundCount > 0 requires refund reason analysis | success: paidOrders >= 1 and refundCount = 0 | continue_or_scale: paidOrders >= 1 and refundCount = 0 can continue or scale | failed: priceShown but no CTA clicks, paid orders, or feedback
- Validate existing product: AI Video Studio｜本地视频生成工作台: partial_success: paidOrders >= 1 and refundCount > 0 requires refund reason analysis | success: paidOrders >= 1 and refundCount = 0 | continue_or_scale: paidOrders >= 1 and refundCount = 0 can continue or scale | failed: priceShown but no CTA clicks, paid orders, or feedback
- Validate AI Prompt Kit: partial_success: CTA clicks >= 10 | success: leads >= 3 | continue_or_scale: leads keep growing for two review cycles | failed: pageViews = 0 or no CTA clicks/leads after the test window

## 10. 如何填写验证结果
- 打开 validation-input.json，只填写真实观察到的结果。
- 不要伪造 CTA、线索、订单、收入、退款或用户反馈。
- 未知数字保持 0，未知文本保持空字符串，未知数组保持 []。
- 必须保留 planId，不要改名。
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: priceShown - Price shown during the test.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: ctaClicks - Observed CTA clicks.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: paidOrders - Observed paid orders.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: refundCount - Observed refunds.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: feedback - Observed pricing feedback.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: productPageViews - Observed product page views.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: productPageCtaClicks - Observed product page CTA clicks.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: listingViews - Observed marketplace listing views.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: messages - Observed marketplace messages.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: deliveryFeedback - Observed delivery or support feedback.
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具: supportQuestions - Observed support questions.
- Validate existing product: AI Video Studio｜本地视频生成工作台: priceShown - Price shown during the test.
- Validate existing product: AI Video Studio｜本地视频生成工作台: ctaClicks - Observed CTA clicks.
- Validate existing product: AI Video Studio｜本地视频生成工作台: paidOrders - Observed paid orders.
- Validate existing product: AI Video Studio｜本地视频生成工作台: refundCount - Observed refunds.
- Validate existing product: AI Video Studio｜本地视频生成工作台: feedback - Observed pricing feedback.
- Validate existing product: AI Video Studio｜本地视频生成工作台: productPageViews - Observed product page views.
- Validate existing product: AI Video Studio｜本地视频生成工作台: productPageCtaClicks - Observed product page CTA clicks.
- Validate existing product: AI Video Studio｜本地视频生成工作台: listingViews - Observed marketplace listing views.
- Validate existing product: AI Video Studio｜本地视频生成工作台: messages - Observed marketplace messages.
- Validate existing product: AI Video Studio｜本地视频生成工作台: deliveryFeedback - Observed delivery or support feedback.
- Validate existing product: AI Video Studio｜本地视频生成工作台: supportQuestions - Observed support questions.
- Validate AI Prompt Kit: pageViews - Observed landing page views.
- Validate AI Prompt Kit: ctaClicks - Observed CTA clicks.
- Validate AI Prompt Kit: leads - Observed leads or signups.
- Validate AI Prompt Kit: conversionRate - Manual conversion rate, if calculated.
- Validate AI Prompt Kit: notes - Manual notes from the landing page test.
- Validate AI Prompt Kit: listingViews - Observed marketplace listing views.
- Validate AI Prompt Kit: messages - Observed buyer messages.
- Validate AI Prompt Kit: presaleOrders - Observed presale orders.
- Validate AI Prompt Kit: paidOrders - Observed paid orders.
- Validate AI Prompt Kit: revenue - Observed revenue.

## 11. 下一次复盘使用方式
- 运行 generate-ebos-validation-report.ts 读取 validation-input.json。
- Weekly / Monthly / Decision 会根据 success、partial_success、failed、not_started 调整下一轮优先级。
- Which validation plan produced the strongest observed signal?
- Which channel produced clicks, leads, messages, or orders?
- Did any paid order refund or produce delivery/support risk?
- Should EBOS continue, adjust, stop, or scale the direction next week?

## Warnings
- none
