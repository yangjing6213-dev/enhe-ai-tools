# 2026-10-18 UI / SEO / 首屏整改交接

工作目录：`C:\Users\HU\Documents\New project 2\.worktrees\enhe-forum-actions-release-20261017`。分支：`codex/full-audit-remediation-20261018`。本代理未提交、推送、部署或修改生产数据。本文记录本地结果，不能替代主代理的发布检查或上线验收。

## 逐项状态

| 项目 | 本地处理和验证 | 剩余边界 |
| --- | --- | --- |
| A11Y-001 字体 | **LOCAL PASS**。用户已同意接近风格的可用圆体；换为寒蝉全圆体 F v3.200 Regular 的完整 WOFF2，按 OFL 保留名称规则将派生字体命名 ENHE Rounded。15,865 字形、14,304 Unicode 映射全部保留。 | 独立 Chromium FontFace 及最终生产构建 12 个中英首页/登录/注册宽度样本加载通过；相邻表单装饰遮挡也已在最终构建复核消除。正式站待发布验收。旧 Alimama 文件未改造、未删除。 |
| A11Y-002 资讯订阅文字对比度 | `src/styles/redesign/ai-news.css` 针对蓝色订阅按钮及其后代恢复白色文字填充，避免全局黑色 text-fill 覆盖。两语言、桌面/移动共 4 个浏览器用例通过。 | DB-free 浏览器中的 CTA 使用与实际组件相同类名的合成节点验证 CSS；发布后需检查真实 CTA。 |
| A11Y-003 语义结构 | 列表卡片采用 div + listitem，普通卡片仍 article；产品演示列表标题用 h2、首页用 h3；悬浮账号入口是命名 region。渲染测试及命名区域浏览器检查通过。 | 发布后复核真实页面无障碍扫描；布局、卡片样式不变。 |
| SEO-01 标题被截断 | 元数据标题优先保留完整短语，不在字符预算中间切断中英文；调整后续品牌拼接的二次长度限制。已测 Google / Haiku / Copilot 审计样例及长英文标题。 | 生产数据库原文已由 ops 只读核实完整，因此没有回填数据库。发布后抽查实际 title / OG。 |
| SEO-02 英文趋势混入中文 | 英文视频条目遇到中文标题，使用已有英文简报标题；中文独有的可选视频说明不再在英文页直接输出。2 个渲染用例通过。 | 不自动翻译原始视频本身或编造英文内容。 |
| SEO-03 合集未入 sitemap | 加入中英文 `/ai-news/topics`，保留双向语言对应，weekly / 0.7，不编造 lastmod。sitemap 测试通过。 | 发布后重新读取 sitemap；不代表搜索引擎已收录。 |
| SEO-04 首页头像签名链接与大图 | 公开精选评论头像改为同源 id + 内容版本链接，同用户同头像复用 URL；已有图片优化器输出适配 56px 的缩略图。新增受限头像接口、12 个接口用例和数据映射测试通过。 | 线上图片优化响应、缓存命中、实际传输体积待发布后核实。 |
| SEO-05 404 索引指令冲突 | 主代理移除根默认 index 指令；本代理添加 HTTP 回归。未知路由、中文/英文工具越界分页、未知新闻详情 4 条真实请求均 404 且只有 noindex、不含 index。 | 数据库禁用时新闻档案有预览分支，`/ai-news/page/999999` 生产检查需上线执行；测试在配置数据库时包含它。 |
| PERF-01 首屏资源等待 | 首页遮罩标题在初始 HTML 即有可读蓝字，纹理与测量就绪后切回原动效；两行共用纹理优先加载且只请求一次；头像稳定链接与缩略。无 JS 可读、减弱动效、单纹理请求浏览器检查通过。 | 本地功能验证不是线上性能达标。nonce HTML 的安全缓存策略由主代理处理；上线后还需复测 LCP / 字体和头像字节，不能宣称已低于 2.5 秒。 |

## 实现文件范围

- SEO：`src/app/sitemap.ts`、`src/app/ai-news/[slug]/page-shell.tsx`、`src/lib/ai-news.ts`、`src/components/ai-trend-video-briefing.tsx` 及相邻测试。
- 语义和对比度：`src/styles/redesign/ai-news.css`、`src/components/redesign/site-floating-actions.tsx`、`src/components/redesign/software/EnheRedesignSoftwareCard.tsx`、`src/components/product-demo-card.tsx`、`src/components/product-demo-motion-card.tsx`、`src/app/globals.css` 及卡片测试。
- 头像：`src/lib/homepage-avatar.ts`、`src/app/api/homepage-avatars/route.ts`、`src/lib/redesign/home/homepage-comment-data.ts`、`src/components/user-avatar.tsx`、`src/components/redesign/home/EnheRedesignExperienceReviews.tsx` 及相邻测试；视觉 fixture 补充用户 id 和有效默认头像。
- 首屏：`src/components/MaskedHeading.tsx`、`src/components/MaskedHeading.css`、`src/components/redesign/home/EnheRedesignHero.tsx`。
- 浏览器：`tests/e2e/public-audit-regressions.spec.ts`、`tests/e2e/ai-news-content-card-contrast.spec.ts`。

头像接口仅从数据库读取 approved 且 showOnHomepage 的评论用户，验证当前头像版本。COS 仅接受本项目 bucket 下单级 `user-avatars` 图片名；本地仅接受对应上传目录；拒绝任意 src、其他 bucket、私有附件目录、跳转和非图片响应。8 MB 上限与 8 秒上游超时，响应不含签名 URL。安全代理已独立只读审查此路径。

## 已执行验证

1. 聚焦单元测试 **9 个文件 / 110 个测试 PASS**：

   `npx vitest run src/app/sitemap.test.ts src/lib/ai-news.test.ts src/components/ai-trend-video-briefing.test.tsx src/components/product-demo-card.test.tsx src/app/api/homepage-avatars/route.test.ts src/lib/redesign/home/homepage-comment-data.test.ts src/app/software/software-production-wiring.test.tsx src/lib/typography-source.test.ts src/lib/ai-trends-source.test.ts --maxWorkers=2`

2. 头像改为复用 UserAvatar 后的受影响复跑 **5 个文件 / 48 个测试 PASS**：

   `npx vitest run src/app/api/homepage-avatars/route.test.ts src/lib/redesign/home/homepage-comment-data.test.ts src/components/redesign/home/home-reviews.test.ts src/components/redesign/home/homepage-ui-polish.test.ts src/components/redesign/home/home-preview-regression.test.ts --maxWorkers=2`

3. 更新旧的 `<article` 源码冻结断言为合法列表语义；实际渲染额外断言 `<div role="listitem">`；其余冻结要求保留。最后受影响复跑 **2 个文件 / 14 个测试 PASS**：

   `npx vitest run src/components/redesign/software/software-catalog.test.ts src/app/software/software-production-wiring.test.tsx --maxWorkers=1`

4. 本地 Chromium **8 / 8 浏览器测试 PASS**，35 秒：

   `npx playwright test tests/e2e/public-audit-regressions.spec.ts tests/e2e/ai-news-content-card-contrast.spec.ts --workers=1`

   使用 `PORT=3349`、`ENHE_ADMIN_VISUAL_FIXTURE=1`，清空 `DATABASE_URL` / `DIRECT_URL` / `SEO_AUDIT_TEST_DATABASE_URL`；应用地址仅 `http://127.0.0.1:3349`。没有读取正式数据库。该测试服务已结束，端口无监听；临时 `next-env.d.ts` 路径变化已恢复。

5. 修改范围 ESLint、全仓 `npx tsc --noEmit`、`git diff --check` 均 PASS。前述测试有交集，不能把 110 + 48 + 14 宣称为独立测试总数。

本代理没有运行最终生产构建和完整发布闸门；主代理正在统一执行。测试结果记录见本轮工具输出以及外部证据目录的 `ui-seo-remediation-checks.json`，该 JSON 是结果汇总，不是伪造的原始运行日志。最初的 8 项浏览器用例未额外生成效果截图。

字体授权后补充：6 个受影响测试文件、33 项测试 PASS；修改范围 ESLint 与 diff-check PASS。独立 Chromium 148 实际加载整包 WOFF2 成功，中文、英文和按钮示例渲染正常，0 字体解码错误。随后只读接入主代理已构建的 `http://127.0.0.1:3107`，中英首页/登录/注册 × 390/1440 共 **12/12 字体样本 PASS**：实际 FontFace 状态 loaded，响应 200 / font/woff2 / 2,612,604 字节 / 一年 immutable 缓存，提交按钮使用新字体，文档无横向溢出。已保存 12 张页面截图和 `rounded-font-local-pages.json`。没有启动或关闭主代理服务；没有登录或表单提交。

手动截图复核另发现：手机注册页恐龙遮住 Google 按钮和底部登录入口的部分文字（`rounded-font-page-en-register-390.png`），虽 pointer-events:none 不阻挡点击但影响可读性。主代理授权后已做最小修复：`EnheRedesignFooter` 新增默认 true 的 `showMascot`，生产 wrapper 透传，中英 auth layouts（只含登录/注册）明确 false；桌面/手机一致隐藏，首页/其它页面保持原默认装饰与叠层。未修改公共页面布局和 CSS。渲染回归先得到中英 2 个失败，再修改后 4 文件 22 项 PASS，相关 ESLint / diff-check PASS。实际新构建截图待主代理最后构建后补充，不能将之前 12/12 字体通过当成遮挡问题已完成浏览器验收。

这项相邻修复的额外白名单：`src/components/redesign/enhe-redesign-footer.tsx`、`src/components/redesign/enhe-production-public-shell.tsx`、`src/app/(auth)/layout.tsx`、`src/app/en/(auth)/layout.tsx`、新增 `src/components/redesign/enhe-redesign-footer.test.tsx`、`src/components/redesign/production-wiring.test.ts`；现有 `tests/e2e/rounded-font-loading.spec.ts` 增加 auth 无恐龙/首页有恐龙断言。主代理统一运行最后构建与相关浏览器回归。

最终构建复核已完成：再次只读接入主代理 3107 服务，**12/12 PASS**；中英登录/注册在 390 / 1440 均无页尾恐龙，两个首页仍各有 1 个装饰。字体加载和按钮字体继续通过，页面无横向溢出。保留首轮问题截图，新增 `rounded-font-final-local-pages.json` 及 12 张 `rounded-font-final-page-*.png`。人工查看两张 390px 中英注册完整截图，Google 注册按钮和底部登录入口现已完整可见。未启动/关闭服务或进行业务写入。

## 字体证据与选择边界

证据目录：`C:\Users\HU\Documents\ENHE-网站巡检报告-2026-10-18\evidence`。

- `font-remediation-validation.json`：原文件哈希、字节数、三个官方格式的 Chromium 失败、候选加载和许可来源。
- `font-options-preview.png`：现有系统回退字体、寒蝉全圆体、霞鹜漫黑的同文案预览，候选仅用于本地预览，没有安装到网站。
- 原官方 ZIP：<https://fonts.alibabadesign.com/AlimamaFangYuanTiVF.zip>。原 WOFF2 是 2,408,604 字节，SHA-256 `2f36da22906ae5d601ce4af009cea08e8b538a9da47e9762c5dd520ac2f3e08f`。官方许可第 4 条限制转换、拆分和修改，因此未做字体修补或重打包发布。
- 推荐接近圆体：寒蝉全圆体 F v3.200，Regular 完整 TTF 6,205,268 字节，已在相同 Chromium 成功加载。来源 <https://github.com/Warren2060/ChillRound/releases/tag/v3.200>，OFL：<https://github.com/Warren2060/ChillRound/blob/main/LICENSE>。另备 Bold 原件，尚未做浏览器加载验证。
- 备选：霞鹜漫黑 v1.004，完整 Regular TTF 3,190,368 字节，成功加载，笔画更偏手写。来源 <https://github.com/lxgw/LxgwMarkerGothic/releases/tag/v1.004>，OFL：<https://github.com/lxgw/LxgwMarkerGothic/blob/main/OFL.txt>。
- **后续用户已明确批准**：采用寒蝉全圆体 Regular 的完整字库，转换后 2,612,604 字节，比旧 WOFF2 多 204,000 字节。字形顺序、Unicode 映射、横向度量及逐字形绘制轮廓摘要全部与原件一致。仅重命名字体识别名称以遵守 OFL 保留名称规则，未改动字形。新增 `public/fonts/enhe-rounded/{ENHERounded-Regular-full-bc07a6d90a6685fe.woff2,OFL.txt,manifest.json,README.md}`。

字体授权后证据统一写在 `C:\Users\HU\Documents\ENHE-网站整改回执-2026-10-18\evidence`：`rounded-font-conversion.json`、`rounded-font-browser-validation.json`、`rounded-font-bilingual-controls-preview.png`。这是最新字体验证，原巡检目录中“等待选择”的 JSON 仅保留诊断历史，不能作为当前状态。

字体新增修改白名单：上述 4 个资产文件；`src/app/globals.css`、`src/styles/redesign/{tokens,home,software}.css`、`next.config.ts` 的单条哈希字体缓存路径；`src/lib/typography-source.test.ts`、`src/app/brand-theme-source.test.ts`、`src/components/redesign/public-design-refresh.test.ts`、`src/lib/global-night-glass-ui-source.test.ts`、`src/lib/home-redesign-source.test.ts`、`src/lib/ui-polish-contract.test.ts`、`tests/e2e/typeshare-alignment.spec.ts`、`tests/e2e/rounded-font-loading.spec.ts`。原字体文件与许可保留，应用中已无旧引用。

## 性能测量证据

`avatar-thumbnail-remediation-measurement.json`：当前公开头像样本原 PNG 为 1254 × 1254，594,481 字节。相同 Sharp WebP quality 75 内存转换后，64px 为 760 字节、128px 为 2,030 字节，分别减少 99.87% / 99.66%。这仅证明缩略方案的样本潜力，尚未声称生产接口实际达到该数字。证据未保存签名查询参数。

上线后建议主代理抽样核实：标题完整短语、英文趋势、双语合集 sitemap、404/越界分页 robots、真实订阅按钮、头像的同源优化 URL 与响应类型/字节/缓存、首页首次加载和减弱动效。A11Y-001 已获用户授权，但仍须完成新构建应用页面和正式站的真实字体验收后才计发布验收完成。
