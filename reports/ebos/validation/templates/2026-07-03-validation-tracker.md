# ENHE Validation Tracker

Target date: 2026-07-03
Period: 2026-06-29 to 2026-07-05
Decision report: reports/ebos/decision/2026-07-03-decision-report.json
Top priority direction: AI Prompt Kit
Top existing product: FaceSwap Studio｜本地人像合成研究工具

## How to Fill
- Edit the manual validation input JSON under reports/ebos/validation/inputs.
- For each result, keep planId unchanged and set status to not_started, running, completed, or skipped.
- Record only observed metrics: ctaClicks, leads, presaleOrders, paidOrders, revenue, refunds, replies, feedback, and notes.
- Leave unknown fields empty; EBOS must not fabricate clicks, leads, orders, or revenue.
- Run scripts/generate-ebos-validation-report.ts after manual results are recorded.

## Validation Plans
- Validate existing product: FaceSwap Studio｜本地人像合成研究工具; method=pricing_test; threshold=CTA clicks >= 10 or leads >= 3 or presale orders >= 1 within 7 days.; inputStatus=not_started
- Validate existing product: AI Video Studio｜本地视频生成工作台; method=pricing_test; threshold=CTA clicks >= 10 or leads >= 3 or presale orders >= 1 within 7 days.; inputStatus=not_started
- Validate AI Prompt Kit; method=landing_page; threshold=CTA clicks >= 10 or leads >= 3 or presale orders >= 1.; inputStatus=not_started

## Warnings
- none
