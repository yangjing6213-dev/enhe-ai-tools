# 登录与注册滑动提交

用户要求：按附件 SlideCommit 动效替换登录与注册的主按钮，完成后推送并部署。保留 Google 入口、现有表单字段、后台认证和安全校验。无需数据库改动。

## 实施与验收

1. 基于附件组件和现有 motion 依赖接入滑轨；真实提交期间显示等待状态，校验失败和取消拖动不提交，键盘与无脚本入口可用。
2. 针对页面和认证流程运行单元测试、独立本地测试数据库的浏览器测试，以及 lint、类型检查和正式构建。复核手机宽度、中英文、错误重试和重复提交防护。
3. 复核差异后提交、推送现有独立发布分支；沿用服务器备份与健康检查部署流程，进行只读线上检查。

## 范围与基线

- 工作区：enhe-mascot-production；分支：codex/enhe-mascot-production-20261016。
- 开始代码提交：60d4c0d0f671ad3a25224357850d07bfd4315b37。
- 开始生产版本：2503b2dce0d2018da303a67818cdb5a527e1cd74。
- 不改认证 action、数据库结构、支付或论坛功能。真实登录注册验证仅使用独立本地测试数据库，不创建正式用户。
- 复用按钮现有宽度，高 56px、圆角 28px，采用用户深灰轨道与浅色滑块。不新增依赖。

## 验证记录

- PASS：`npm test -- src/lib/auth-slide-pages.test.tsx src/lib/google-login-page.test.tsx src/app/actions.login-return.test.ts --maxWorkers=1 --testTimeout=20000`，3 个文件、11 项测试通过。
- PASS：`npm run lint`、`npm run typecheck`、`npm run build`，最终接线与样式状态均成功。
- PASS：完整依赖检查 `npm audit --include=dev --include=optional --include=peer --audit-level=high --registry=https://registry.npmjs.org`，0 个漏洞；依赖未改动。
- PASS：独立本地 PostgreSQL 测试库的正式构建浏览器测试 `npx playwright test --config tests/playwright.auth.config.ts`，8 项通过。包括 320/390/1440px 中英文布局、空字段拦截、短拖/Escape/pointercancel、等待时防重复、连续错误重试、真实登录、触摸注册、回车注册、减少动态效果、无 JavaScript 的默认回车注册、默认头像选择。
- PASS：无数据库正式构建页面检查 `npx playwright test tests/e2e/auth-shell-dbfree.spec.ts --workers=1`，8 项通过；覆盖两种语言、两类表单、320/390px，无外部请求、提交请求或浏览器错误。
- 已复现并修正：原附件首次 pointermove 不跟手、末端取消可能误提交；初版等待/窄屏标签裁切；表单等待状态可能在真实请求未结束时提前恢复。最终通过隐藏提交按钮的 `formAction` 等待同一原 Server Action 的 Promise，在 `finally` 解锁；原 `<form action>` 与无脚本按钮仍走原认证动作。
- 独立审查：原动作引用、CSRF、returnTo、Google 入口、异常/跳转转发及无脚本默认提交顺序保留；未发现发布阻塞项。
- 最后进行差异复核与推送部署；尚未发布。
