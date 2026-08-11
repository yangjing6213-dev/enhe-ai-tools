# P0/P1 风险关闭矩阵

| Risk | Current status | Owner/dependency | Closure condition | Phase 1A / 1B impact |
|---|---|---|---|---|
| R-001 私有下载地址 | OPEN / conditional P0 | 运维 + DB/File/CDN 只读清单 | 证明无永久商品包地址；统一短时签名、禁公共缓存并完成历史扫描 | 不阻止 1A；文件交付、产品详情和下载实现的硬门禁 |
| R-002 PaymentProof | OPEN P1 | 支付/数据负责人 | 新订单不再上传/审核；历史订单只读迁移方案通过 | 可做设计文档，不可做交易实现 |
| R-003 ZPAY | PARTIALLY RESOLVED P1 | 支付商户 + 运维 | sandbox 回调、查单、退款、幂等、金额、补偿、对账测试通过 | BLOCKER for Phase 4, not UI Phase 1 blocker |
| R-004 OAuth | OPEN P1 | OAuth 应用与隐私资料 | AccountIdentity、冲突邮箱、state/nonce/PKCE、合并/解绑方案批准 | 可推迟 Phase 4 |
| R-005 Explorer Pass | OPEN P1 | 价格/促销规则 | 唯一发放、锁定、券后金额、回调核销模型批准 | 可推迟 Phase 4 |
| R-006 URL/sitemap 漂移 | OPEN P1 | 生产 SHA + Search Console | 全量 URL 状态/canonical/hreflang 对账，移除 redirect/noindex | 不阻止 1A；1B 前必须冻结基线 |
| R-007 公共 IA 404 | OPEN P1 | 内容/设计确认 | `/help`、`/updates` 进入 Phase 3；Build Your Own X 逐 URL 决策 | 不阻止设计 token |
| R-008 外部脚本 | OPEN P1 | 合规/增长 | 用途、同意、延迟加载、CWV 预算确认 | 不阻止 1A；1B 前必须决策 |
| R-009 脏工作区 | CLOSED for isolation / open for original | 仓库维护者 | 新 worktree 干净且文档 commit 可回滚 | 已解除 Phase 1 隔离阻塞 |
| R-010 旧视觉 | OPEN P2 | 高保真设计稿 | 新 token/公共壳替代旧 glass/glow | Phase 1 核心工作 |
| R-011 英文内容 | OPEN P2 | 编辑/翻译 | 逐页英文质量和 sitemap partner 审核 | Phase 2/3 |
| R-012 运维证据 | OPEN P2 | 运维权限 | backup/restore/CI/staging/health/rollback 证据 | Phase 7/8 前必须关闭 |

## Phase 1A：设计与契约

`PHASE_1A_STATUS=READY`

可以立即开始设计 token 与设计系统规范、第一批高保真页面、公共壳信息架构、SEO/GEO 语义和验收门禁、响应式/a11y/reduced-motion、组件状态和测试计划。Phase 1A 只产出设计与契约，不修改业务代码、Schema、交易、下载或生产路由。

## Phase 1B：代码实现

`PHASE_1B_STATUS=NOT_READY`

开始前必须满足：R-008 外部脚本决策完成；R-006 URL/sitemap/canonical 基线冻结；第一批高保真设计确认；证明公共壳和产品组件不会渲染真实交付地址。R-001 不阻止纯设计 token 文档，但继续作为文件交付、产品详情和下载实现的硬门禁。
