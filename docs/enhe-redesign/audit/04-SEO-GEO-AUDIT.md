# SEO / GEO 审计

## 已验证优势

- 公开探测（2026-08-10）：首页、/software、/en/software、/skill-learning、/ai-news、/ai-trends、/about、/en/about 均 HTTP 200；都有 title、H1、canonical、robots=index/follow，HTML 含 JSON-LD。
- 登录为 HTTP 200 + `noindex, follow`；搜索为 HTTP 200 + `noindex, follow`；随机不存在路径为 HTTP 404。
- `src/lib/seo.ts:733-780` 统一生成 canonical、语言 alternates、OG 与 Twitter；`src/lib/seo.ts:860-895` 提供 Breadcrumb/FAQ；`src/lib/seo.ts:1059-1104` 提供 Product。
- `src/app/robots.ts:26-73` 显式允许 OAI-SearchBot、GPTBot、ChatGPT-User、Perplexity、Claude、Google-Extended、Bing 等，并禁用后台/订单/支付/API。
- `src/app/sitemap.ts:187-355` 只查询 published Tool/NewsArticle，计算英文可索引性和语言 alternates；线上 sitemap 解析为 514 条 URL（中文 259、英文 255）。

## 主要缺陷与差距

1. **Sitemap 单体且含旧别名风险（P1）**：线上统计含 `/online-tools` 两条；公开探测该路径返回 301。总方案 1586-1624 明确 sitemap 不应含重定向、参数、noindex 或归档页。应先在生产抓取全部 URL 状态/canonical，再拆分或过滤。
2. **代码/生产漂移（P1）**：线上 `/ai-topics`、`/ai-topics/ai-content-creation-tools`、`/product-demos` 为 200，但当前 checkout 的 page 文件清单未见对应路径；不能假设本地缺页就是线上缺页，必须锁定部署 SHA。
3. **总方案公共路由缺口（P1）**：`/help`、`/updates`、`/product-paths` 公开探测 404；总方案 238-274 将帮助/教程/更新列为公共信息架构。需要决定新增、迁移或继续 404，不可让 footer 形成孤立链接。
4. **中英文数量不对称（P2）**：sitemap 中文 259、英文 255；动态页面是否具备完整英文正文由 `shouldIndexEnglishToolPage` 决定，需抽样内容质量审验，不把自动 fallback 当作人工翻译。
5. **内容机器化风险（P2）**：`src/app/software/page-shell.tsx:95-122,251-274` 明确出现“可摘录答案/GEO”等面向机器的文案。总方案 1688-1703 要求自然人类表达，后续应重写为用户任务语言。
6. **Schema 真实性门槛尚未完成（P1）**：产品详情将 `aggregateRating = null`（`src/app/tools/[slug]/page-shell.tsx:392-430`），这是保守正确；但真实购买评价、Offer/库存、下架状态与线上 DB 一致性仍未知。
7. **第三方脚本性能/隐私（P1）**：`src/app/root-layout-shared.tsx:63-71` beforeInteractive 注入外部 ByteDance 脚本；需确认同意、地域政策、阻塞时间和 Core Web Vitals 影响。
8. **分页/参数需继续验证（P2）**：软件/资讯列表支持 searchParams，资讯对带筛选请求永久重定向（`src/app/(zh-public)/ai-news/page.tsx:16-24`）；需在生产逐个验证 canonical、分页可抓取性、参数 noindex 与多级跳转。

## URL 决策原则

- 保留并升级：`/`, `/en`, `/software`, `/skill-learning`, `/ai-news`, `/ai-trends`, `/about`, 真实发布的详情页。
- 合并 301：`/online-tools` → `/account-services`（当前 next.config.ts:49-52 已配置；需验证链路和 sitemap 移除）。
- 继续 404/待决：`/help`, `/updates`, `/product-paths`, 当前 header 指向但线上 404 的 `/skill-learning/build-your-own-x`。
- 私有归档/noindex：login/register/search/user/orders/payment/admin/api；robots 不是权限控制，必须保留服务端授权。

## GEO 机会

- 真实定义块、任务→工具选择、FAQ/比较、来源/日期、作者/机构、产品/Skill/资讯关系图。
- 继续使用可摘录结构，但删除“为 AI 摘录而写”的可见标签；所有数据和评价必须可追溯。
- OAI-SearchBot 已允许；下一阶段应以 10-20 个真实查询建立人工抽样基线，不凭 JSON-LD 或“SEO 分数”推断 AI 引用。

