# 首页与 AI Skill 页面交互优化实施计划

**目标：** 按本次要求更新首页文案和页尾按钮，增加真正显示个人订单/站内信的悬浮面板，并统一 AI Skill 卡片与即时搜索体验。

**实现方式：** 保留现有 Next.js 公共页面结构和软件卡片组件；悬浮入口改为无底色按钮，通过受登录保护的接口读取当前用户最近订单和站内信；AI Skill 页面复用软件卡片视觉、尺寸与动效，搜索输入即时筛选页面已公开的卡片。

**技术栈：** Next.js App Router、React、Prisma、Vitest、Playwright。

---

### 任务一：先锁定验收行为

**文件：**
- 修改：`src/components/redesign/home/home-copy.test.ts`
- 修改：`src/components/redesign/navigation.test.ts`
- 修改：`tests/e2e/homepage-ui-polish.spec.ts`
- 新增：`src/app/api/user/quick-access/route.test.ts`
- 新增：AI Skill 页面/搜索的定向测试（放在对应实现附近）

- [x] 测试首页标题两行文案、页尾 CTA 不显示、购物车/站内信是无底色按钮并打开面板。
- [x] 测试面板只显示接口返回的订单和站内信，不登录时显示登录入口。
- [x] 测试 AI Skill 下拉菜单不含“查看全部 AI Skill”、卡片复用软件卡片、搜索区无分类下拉和筛选按钮。
- [x] 测试搜索输入会自动更新查询并展示对应结果；先运行目标测试确认缺失行为导致失败。

### 任务二：实现个人悬浮面板

**文件：**
- 新增：`src/app/api/user/quick-access/route.ts`
- 修改：`src/components/redesign/site-floating-actions.tsx`
- 修改：`src/styles/redesign/site-refresh.css`

- [x] 接口通过当前登录用户读取最近 5 笔订单、最近 5 条站内信及未读状态；未登录返回 401，响应禁止缓存。
- [x] 两个悬浮按钮使用透明底色；点击后显示订单或站内信弹窗，支持关闭、键盘 Escape、错误/空状态和“查看全部”入口。
- [x] 在窄屏限制弹窗宽度并保留按钮可见、键盘焦点清晰。

### 任务三：首页与 AI Skill 页面

**文件：**
- 修改：`src/lib/redesign/home/home-copy.ts`
- 修改：`src/components/redesign/home/EnheRedesignBrandValue.tsx`
- 修改：`src/components/redesign/enhe-redesign-header.tsx`
- 修改：`src/app/ai-skills/page-shell.tsx`
- 新增：`src/app/ai-skills/ai-skills-catalog.tsx`
- 修改：`src/lib/redesign/software/software-production.ts`（只导出/复用现有产品卡片映射）
- 修改：相关软件目录测试、AI Skill 测试

- [x] 首页标题显示为“AI一站式平台 / 创造未来 改变生活”，移除页尾“探索 AI 工具”按钮。
- [x] 桌面 AI Skill 下拉菜单移除自动添加的“查看全部 AI Skill”入口。
- [x] AI Skill 列表改用软件页相同卡片组件、布局和悬停动效。
- [x] 删除分类下拉和筛选按钮，输入后自动按关键词更新列表；不输入时保留全部公开 AI Skill。

### 任务四：验证与发布

**文件：**
- 修改：`docs/exec-plans/active/enhe-home-skills-ui-2026-10-11.md`（记录实际结果并完成状态）

- [x] 运行完整 Vitest（2,701 项通过，97 项按项目设置跳过）、目标 Playwright 检查、lint、typecheck 和 build。
- [x] 审核差异与工作区状态，确认没有密钥或无关文件。
- [x] 按已授权流程推送并部署；核对发布提交及首页、AI Skill 页健康状态。

### 验证记录

- `npm test`：531 个测试文件通过，9 个跳过；2,701 项通过，97 项跳过。
- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过；本地没有配置 `DATABASE_URL`，构建时依赖数据库的动态内容无法从本机读取，但不会改变线上数据或密钥。
- Playwright：目标交互检查通过；发布脚本的完整生产模式检查 332 项通过、140 项按无数据库验收配置跳过。
- 发布提交 `9ffcd3feb08ffbb6f3c6ff569506e0f39e3139f3` 已推送并部署；生产浏览器确认首页和 `/ai-skills` 返回正常，搜索即时筛选，未登录 API 返回 401 且不缓存，购物车和站内信图标可打开透明底浮窗，页尾没有“探索 AI 工具”按钮。
- 服务器初次从 GitHub 拉取时 TLS 连接中断；核对推送分支与服务器原版本后，经 SSH 传送同一已推送提交并按发布锁继续部署。数据库无待执行迁移，服务健康检查通过。
