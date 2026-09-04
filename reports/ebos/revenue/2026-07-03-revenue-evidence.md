# ENHE Revenue Evidence Report

目标日期：2026-07-03
周期：2026-06-29 至 2026-07-05
生成时间：2026-07-03T11:43:03.700Z

## 1. 收入验证总体评分
评分：50
置信度：partial
尚未完成真实收入验证。

## 2. 收入摘要
币种：CNY
Gross revenue：29
Net revenue：0
Refunded amount：29
Average order value：29

## 3. 订单摘要
总订单：1
已支付订单：1
待支付订单：0
取消/未支付订单：0

## 4. 退款摘要
退款数：1
周期内退款：0
退款金额：29
退款率：1
- Refund rate is higher than 20%.

## 5. 产品收入归因
- Upload Fix Local App 1780594990538：net=0, paidOrders=0, readiness=0
- E2E VIP 软件 1779325662692-320：net=0, paidOrders=0, readiness=10
- Auto Local Tool 1780589814970：net=0, paidOrders=0, readiness=10
- 测试：net=0, paidOrders=0, readiness=30
- E2E VIP 在线工具 1779325662692-320：net=0, paidOrders=0, readiness=20
- ENHE 文案清洗在线工具：net=0, paidOrders=0, readiness=20
- ENHE 批量文件重命名助手：net=0, paidOrders=1, readiness=55
- FaceSwap Studio｜本地人像合成研究工具：net=0, paidOrders=0, readiness=75
- AI Video Studio｜本地视频生成工作台：net=0, paidOrders=0, readiness=75
- AI语音生成｜本地配音素材工作台：net=0, paidOrders=0, readiness=75
- 聊天截图素材制作｜无需代码：net=0, paidOrders=0, readiness=75
- Lumi-OS｜AI情感智能体 | AI伴侣 | 贾维斯：net=0, paidOrders=0, readiness=75
未归因收入：0

## 6. 第一笔收入验证状态
尚未完成真实收入验证

## 7. 高优先级收益验证产品
- FaceSwap Studio｜本地人像合成研究工具：readiness=75
- AI Video Studio｜本地视频生成工作台：readiness=75

## 8. 主要风险
- 尚未完成第一批真实收入验证。
- 购买后交付承接不完整。

## 9. 增长机会
- 选择 1-2 个高 readiness 产品做限时付费验证。
- 优先验证 FaceSwap Studio｜本地人像合成研究工具。
- 优先验证 AI Video Studio｜本地视频生成工作台。

## 10. Codex 收益验证任务
- [critical] 选择 1-2 个高 readiness 产品进行首批收入验证: 选择产品页 readiness 高、价格和交付配置较完整的产品，完成一次真实下单和支付验证。
- [high] 补齐购买后的下载/交付承接: 对已有价格配置但缺少下载或交付配置的产品补齐文件、在线地址或售后说明。
- [high] 验证产品收入路径：FaceSwap Studio｜本地人像合成研究工具: 检查产品页 CTA、价格、下载交付、订单、支付、退款记录，并完成真实付费验证。
- [high] 验证产品收入路径：AI Video Studio｜本地视频生成工作台: 检查产品页 CTA、价格、下载交付、订单、支付、退款记录，并完成真实付费验证。

## 11. 数据库字段与口径说明
Order fields：id, orderNo, toolId, toolPriceSpecId, amount, orderStatus, paidAt, createdAt
Refund fields：id, orderId, amount, status, createdAt, completedAt
Product fields：id, slug, name, englishName, isDownloadPaid, downloadPrice, downloadFileId, onlineUrl, priceSpecs, faqs
Attribution fields：toolId, tool.id, tool.slug, tool.name
- Currency inferred as CNY because no explicit currency field was detected.

## 12. 数据缺口
- Currency inferred as CNY because no explicit currency field was detected.
- 尚未完成第一批真实收入验证。