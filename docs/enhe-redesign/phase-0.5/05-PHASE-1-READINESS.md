# Phase 1A / Phase 1B 启动准备度

## 结论

`PHASE_1A_STATUS=READY`

`PHASE_1B_STATUS=NOT_READY`

Phase 1A 设计与契约可以立即开始；Phase 1B 代码实现尚未达到启动门禁。

## 已具备

- Phase 0 审计已被补充决策正式接收。
- 新干净 worktree 和 `redesign/typeshare-v1` 分支已建立。
- Next/React/TypeScript/Tailwind/Prisma 现有栈可复用。
- 现有 SEO metadata、双语 URL、结构化数据、组件和原生 video 基础可作为设计约束。
- 支付共用 ZPAY、`alipay`/`wxpay`、默认支付宝的业务决策已确认。

## Phase 1A：允许立即开始

- 设计 token 与设计系统规范。
- 第一批高保真页面。
- 公共壳信息架构。
- SEO/GEO 语义和验收门禁。
- 响应式、a11y 与 reduced-motion。
- 组件状态和测试计划。

Phase 1A 不得修改业务代码、Schema、交易、下载和生产路由。

## Phase 1B：开始前门禁

1. R-008 外部脚本的合规与性能决策完成。
2. R-006 生产 URL/sitemap/canonical 基线冻结。
3. 第一批高保真设计确认。
4. 证明公共壳和产品组件不会渲染真实交付地址。
5. 原工作区远程仓库仍待用户确认；本阶段不 push。

R-001 是文件交付、产品详情和下载实现的硬门禁，不阻止 Phase 1A 的纯设计 token 文档。

## 可以推迟

- OAuth、Explorer Pass、正式支付回调/查单/退款实现：Phase 4。
- 内容字段映射和 URL 批量迁移：Phase 3/6。
- 后台重组、备份恢复和蓝绿上线：Phase 5/7/8。

## 允许的下一动作

仅在本 worktree 中执行 Phase 1A 设计与契约工作；Phase 1B 在全部门禁关闭前不得开始。
