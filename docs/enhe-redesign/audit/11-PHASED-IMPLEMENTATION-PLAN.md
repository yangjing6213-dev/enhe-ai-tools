# 分阶段实施计划（不直接编码）

## Phase 0：审计收尾

- 目标：冻结当前 SHA、URL、数据/支付/文件/SEO 基线；评审本目录报告。
- 依赖：生产只读访问、脱敏 DB/File 清单、商户/OAuth/对象存储资料。
- 允许修改：仅审计文档、只读快照。
- 禁止修改：业务代码、Schema、migration、生产、远程 Git。
- 数据迁移：不执行。
- 测试：不运行会生成产物的 build/test；仅静态/公开 HTTP。
- SEO/GEO：确认 514 条 sitemap 的 200/self-canonical/noindex/语言 partner。
- 回滚点：当前 commit + 归档 tag（待创建，需批准）。
- 交付物：本目录报告、阻塞清单、数据契约输入表。

## Phase 1：基础与设计系统

- 目标：建立新 token、公共壳、导航、表单/按钮/媒体/焦点/reduced-motion 契约。
- 依赖：高保真第一批设计稿、品牌字体/素材确认、干净 worktree。
- 允许修改：隔离分支下的 CSS/token/共享组件和测试。
- 禁止修改：支付、Schema、生产数据、旧 URL 删除。
- 数据迁移：无。
- 测试：lint/typecheck、组件/视觉/a11y smoke。
- SEO/GEO：html lang、canonical/hreflang、服务端核心内容不退化。
- 回滚点：Phase 1 分支前后截图+commit。
- 交付物：可复用设计系统和公共壳。

## Phase 2：第一批公共页面

- 目标：首页、五款演示、AI工具列表、登录注册、页头页脚。
- 依赖：Phase 1、五款真实视频/封面、真实品牌文案。
- 允许修改：对应公共路由与组件。
- 禁止修改：支付回调、订单、私有下载、后台。
- 数据迁移：仅只读适配现有 Tool/Settings。
- 测试：桌面/移动、键盘、reduced-motion、SSR HTML、metadata。
- SEO/GEO：首页/栏目 ItemList/Organization/VideoObject 只使用真实数据。
- 回滚点：旧公共壳版本和 URL 清单。
- 交付物：第一批验收站页面。

## Phase 3：第二批产品与内容

- 目标：产品详情、Skill、资讯、趋势、关于、搜索、帮助、教程、更新。
- 依赖：内容清理、英文完整性、URL 决策、作者/来源/日期。
- 允许修改：公共内容页面、分页、搜索分析。
- 禁止修改：交易状态机和生产支付。
- 数据迁移：内容字段映射 dry-run，不 apply。
- 测试：404/410、分页、schema、内部链接、搜索无结果。
- SEO/GEO：Article/Product/HowTo/FAQ/VideoObject 按真实类型；移除关键词墙。
- 回滚点：URL mapping + 旧内容快照。
- 交付物：内容与搜索验收包。

## Phase 4：登录、支付、优惠券和用户中心

- 目标：OAuth、账号关联、正式支付宝/微信、Explorer Pass、订单/退款、下载权限。
- 依赖：商户正式能力、OAuth 应用、私有存储、数据契约评审。
- 允许修改：认证/支付/订单/券/用户中心/下载 API 与迁移脚本（先 dry-run）。
- 禁止修改：未经批准的生产迁移、真实支付、旧历史删除。
- 数据迁移：PaymentProof 历史只读；订单/购买/文件映射先演练。
- 测试：回调验签/金额/幂等/查单/退款/权限/越权；不用真实密钥。
- SEO/GEO：私有页 noindex、不进 sitemap、不泄露下载地址。
- 回滚点：数据库备份+旧支付链路只读开关+镜像 digest。
- 交付物：sandbox 交易验收和回滚演练记录。

## Phase 5：后台

- 目标：按总方案重组商品、Skill、内容、订单、券、媒体、SEO/GEO、审计。
- 依赖：Phase 4 数据契约和最小权限模型。
- 允许修改：admin namespace 与授权测试。
- 禁止修改：绕过服务端权限、公开展示后台。
- 数据迁移：无新增生产写入，先影子读。
- 测试：角色/二次确认/审计/移动端关键操作。
- SEO/GEO：后台不进 sitemap，报告只显示可行动数据。
- 回滚点：管理员路由旧版可用、审计日志完整。
- 交付物：后台验收包。

## Phase 6：内容和 URL 迁移

- 目标：逐 URL keep/301/410/private archive，修复 sitemap/hreflang/内部链接。
- 依赖：生产 URL/流量/外链/Search Console 基线。
- 允许修改：redirect map、sitemap、内容 slug。
- 禁止修改：所有旧 URL 一律跳首页、无关 301、多级链。
- 数据迁移：内容/slug dry-run→人工批准→分批 apply。
- 测试：全量 HTTP、canonical/hreflang、软 404、链路上限。
- SEO/GEO：只纳入 200、indexable、自 canonical、完整内容。
- 回滚点：redirect map 版本+旧页面/备份。
- 交付物：迁移报告与失败 URL 清单。

## Phase 7：全量验证

- 目标：视觉、任务、响应式、a11y、技术、SEO/GEO、性能、双语、真实验收站操作。
- 依赖：Phase 1-6 全部完成。
- 允许修改：测试修复和报告。
- 禁止修改：未通过门禁时生产切换。
- 数据迁移：只验证，不新增范围。
- 测试：lint/typecheck/test/build/E2E/axe/HTTP/sitemap/structured data。
- SEO/GEO：按总方案页面验收顺序 2122-2137。
- 回滚点：Green 镜像/DB 备份/Blue 健康。
- 交付物：上线 go/no-go 报告。

## Phase 8：蓝绿上线与监控

- 目标：Blue 旧版、Green 新版切换，监控 24h/7d/30d/90d。
- 依赖：备份恢复成功、迁移批准、支付/下载/后台 smoke 全绿。
- 允许修改：经批准的部署、DNS/Nginx 流量切换和监控。
- 禁止修改：无审批的生产脚本、立即删除 Blue。
- 数据迁移：已验证迁移；失败立刻切回 Blue。
- 测试：健康、关键转化、回调、下载、日志、CWV、404。
- SEO/GEO：再次检查 sitemap/canonical/hreflang/robots。
- 回滚点：Blue 镜像+DB restore+redirect map。
- 交付物：切换记录、监控报告、回滚演练证据。

