# ENHE Validation Capture Report
目标日期：2026-07-03
生成时间：2026-07-04T02:11:24.409Z
输入文件：C:/Users/HU/Documents/New project 2/reports/ebos/validation/inputs/2026-07-03-validation-input.json
备份文件：C:/Users/HU/Documents/New project 2/reports/ebos/validation/backups/2026-07-03-validation-input.backup.2026-07-04T02-11-24-411Z.json
## 1. 自动采集总览
本报告只汇总站内真实数据库可读取的数据；不会伪造外部渠道数据。Analytics available=true，orders available=true。
可自动回填候选：0；可应用：0；跳过：0。
## 2. Analytics 事件摘要
来自真实数据库的 Analytics 事件数：60
CTA 点击事件数：0
Page view 事件数：0
- visit_home: 29
- seo_landing_view: 31
## 3. 订单与收入摘要
来自真实数据库的订单数：0
Paid orders：0
Revenue：0
Refund count：0
Refunded amount：0
## 4. 可自动回填字段
- none
## 5. 已跳过字段
- none
## 6. 需要人工补充的数据
以下仍需人工补充，来源必须是真实外部平台或用户反馈，不能由 Codex 代填。
- validation-product-1-faceswap-studio-ai.listingViews: 闲鱼、淘宝、Whop、小红书或微信等外部渠道的真实浏览数。
- validation-product-1-faceswap-studio-ai.messages: 外部渠道真实私信、评论咨询或购买前问题数量。
- validation-product-1-faceswap-studio-ai.favorites: 外部平台真实收藏、想要或类似意向动作数量。
- validation-product-1-faceswap-studio-ai.manualOutreachCount: 用户手动触达的人数或群数。
- validation-product-1-faceswap-studio-ai.positiveReplies: 明确表达兴趣、想看目录、想确认价格或交付的真实回复数。
- validation-product-1-faceswap-studio-ai.userFeedback: 真实用户原话摘要，不能由 Codex 编造。
- validation-product-1-faceswap-studio-ai.channelResults: 每个外部渠道的链接、指标和备注。
- validation-product-2-local-ai-video-studio-for-creator-workflows.listingViews: 闲鱼、淘宝、Whop、小红书或微信等外部渠道的真实浏览数。
- validation-product-2-local-ai-video-studio-for-creator-workflows.messages: 外部渠道真实私信、评论咨询或购买前问题数量。
- validation-product-2-local-ai-video-studio-for-creator-workflows.favorites: 外部平台真实收藏、想要或类似意向动作数量。
- validation-product-2-local-ai-video-studio-for-creator-workflows.manualOutreachCount: 用户手动触达的人数或群数。
- validation-product-2-local-ai-video-studio-for-creator-workflows.positiveReplies: 明确表达兴趣、想看目录、想确认价格或交付的真实回复数。
- validation-product-2-local-ai-video-studio-for-creator-workflows.userFeedback: 真实用户原话摘要，不能由 Codex 编造。
- validation-product-2-local-ai-video-studio-for-creator-workflows.channelResults: 每个外部渠道的链接、指标和备注。
- validation-direction-3-ai-prompt-kit.listingViews: 闲鱼、淘宝、Whop、小红书或微信等外部渠道的真实浏览数。
- validation-direction-3-ai-prompt-kit.messages: 外部渠道真实私信、评论咨询或购买前问题数量。
- validation-direction-3-ai-prompt-kit.favorites: 外部平台真实收藏、想要或类似意向动作数量。
- validation-direction-3-ai-prompt-kit.manualOutreachCount: 用户手动触达的人数或群数。
- validation-direction-3-ai-prompt-kit.positiveReplies: 明确表达兴趣、想看目录、想确认价格或交付的真实回复数。
- validation-direction-3-ai-prompt-kit.userFeedback: 真实用户原话摘要，不能由 Codex 编造。
- validation-direction-3-ai-prompt-kit.channelResults: 每个外部渠道的链接、指标和备注。
## 7. 数据质量提醒
- [warning] Currency inferred as CNY because no explicit currency field was detected.
## 8. 下一步操作
- 先运行 autofill dry-run 检查将写入的字段。
- 确认没有覆盖人工填写数据后，再使用 --apply 写回 validation-input。
- 写回后运行 check-ebos-validation-input 和 generate-ebos-validation-report。
- 外部渠道数据仍需人工从真实平台补充。
