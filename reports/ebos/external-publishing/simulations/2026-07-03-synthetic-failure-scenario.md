# EBOS Synthetic Failure Scenario Report

## 1. 模拟目的
Use a clearly marked worst-case synthetic scenario to stress-test page copy, offer clarity, channel fit, and next validation priorities without polluting real EBOS data.

## 2. 重要声明：这是模拟数据
- synthetic: true
- simulated: true
- 这不是外部平台真实数据。
- 不能作为真实数据回填。
- 不能作为收入证据。
- 不能声称真实发布已经发生。

## 3. 最坏情况假设
- No real external publishing results are available yet.
- The validation page is live, but demand, message, lead, order, and revenue signals are still unobserved.
- The simulation intentionally assumes weak exposure, weak interaction, zero leads, zero paid orders, and zero revenue.
- The scenario is for diagnosis and planning only, not for revenue, validation, or decision evidence.

## 4. 模拟渠道数据
| channel | simulatedPublished | simulatedViews | simulatedClicks | simulatedMessages | simulatedLeads | simulatedPaidOrders | simulatedRevenue | failureNotes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| manual_outreach | true | 0 | 0 | 10 | 0 | 0 | 0 | 10 人触达后无人愿意继续了解或购买。 |
| wechat | true | 20 | 1 | 0 | 0 | 0 | 0 | 私域内容曝光低，无咨询。 |
| xiaohongshu | true | 80 | 0 | 0 | 0 | 0 | 0 | 有少量曝光，但没有互动和转化。 |
| xianyu | false | 0 | 0 | 0 | 0 | 0 | 0 | 未发布，不纳入真实判断。 |
| taobao | false | 0 | 0 | 0 | 0 | 0 | 0 | 未发布，不纳入真实判断。 |
| whop | false | 0 | 0 | 0 | 0 | 0 | 0 | 未发布，不纳入真实判断。 |

## 5. 漏斗诊断
- exposure low: simulatedViews=100.
- click low: simulatedClicks=1; simulatedClickRate=0.01.
- message low: simulatedMessages=10; most messages are simulated outreach sends, not real replies.
- lead zero: simulatedLeads=0.
- paid conversion zero: simulatedPaidOrders=0; simulatedRevenue=0.

## 6. 可能失败原因
- 用户不知道 Prompt Kit 具体能解决什么痛点。
- 页面表达偏概念，缺少具体交付物截图。
- 缺少价格锚点。
- 缺少立即可获得的免费样例。
- CTA 不够具体。
- 信任证明不足。
- 渠道人群与产品不匹配。
- 小红书标题不够结果导向。
- 私聊话术没有给对方足够明确的帮助理由。

## 7. 页面问题
- Hero 需要更具体。
- 需要展示 3 个真实 Prompt 模板示例。
- 需要增加“适合谁 / 不适合谁”。
- 需要增加“购买后得到什么”。
- 需要增加“免费领取 5 个模板”的入口。

## 8. 产品/报价问题
- 产品边界不清。
- 没有明确模板数量。
- 没有明确使用场景。
- 没有明确交付格式。
- 缺少入门低价包。
- 缺少免费样例作为零风险入口。
- 缺少 19 元入门包作为低摩擦付费测试。
- 缺少 49 元完整包和 99 元商业场景包的价格阶梯。

## 9. 渠道问题
- manual outreach 样本太小。
- 微信私域需要更强个人故事。
- 小红书需要标题和封面更强。
- 闲鱼/淘宝可能更适合商品化验证。

## 10. 优先优化建议
- Priority 1: 修改验证页 Hero，把“AI Prompt Kit”改成更具体的结果导向标题：一套帮你快速生成产品文案、SEO 内容和 AI 工具方案的实用提示词模板包。
- Priority 2: 增加免费样例：免费领取 5 个高频 Prompt 模板。
- Priority 3: 增加交付物说明：100+ Prompt 模板、按场景分类、中英文双语、Notion / Markdown / PDF 格式、可直接复制使用。
- Priority 4: 增加价格测试：免费样例、19 元入门包、49 元完整包、99 元商业场景包。
- Priority 5: 重写私聊话术，从“帮我看看”改成“我做了一个可免费领取的小模板包，想送你试用一下”。
- Priority 6: 重写小红书标题，突出免费、可复制、省时间。
- Priority 7: 下一轮真实验证目标：100 访问、10 CTA 点击、5 私信咨询、1 付费意向、1 真实订单或预售意向。

## 11. 下一轮真实验证计划
- 更新验证页 Hero。
- 添加 5 个免费模板样例。
- 添加交付物和格式说明。
- 准备 19/49/99 价格层级文案。
- 重写并发送 10 人私聊话术。
- 重写并发布 1 篇小红书笔记。
- 24 小时后只把真实数据填入 external-publish-result-input.json。

## Safety Warnings
- This is synthetic data.
- Do not backfill as real data.
- Do not use for revenue evidence.
- Do not claim real market validation.
