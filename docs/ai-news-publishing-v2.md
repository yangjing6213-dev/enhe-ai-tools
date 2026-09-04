# ENHE AI 前沿资讯 V2 发布交接

状态：**PARTIAL / 未在生产启用**。本地代码包含离线审计、历史快照、批次暂存、批次发布和公开页核验。自动审计已替代人工 approval 文件；测试数据均为明确标注的 synthetic fixture，不是真实新闻，也没有向官网发送请求。

## 当前授权与连接复核

用户已授权部署及 V2 发布，继续禁止数据库迁移和修改既有文章。用户随后明确要求取消人工审批、自动生成并发布；这取代早期用户级人工审批约束。自动流程使用与 manifest、生产快照和固定 validator 绑定的机器审计凭据，不伪造人工身份；来源核验、去重、12 HTML/6 payload 验证、AI 标注和公开页核验仍须保留。

2026-09-05 SSH 复核：两把私钥已由用户解锁并加入 ssh-agent。本机使用系统 OpenSSH 已通过 GitHub 账号认证，目标仓库 `yangjing6213-dev/enhe-ai-tools` 当前为空；服务器 SSH 会话成功，但服务器原工作树仍为 detached HEAD、存在 4 项未提交改动，远端仍指向旧仓库，服务器没有 GitHub 私钥，不能作为推送中继。未读取服务器 `.env`。为避免覆盖原工作树，已在 `/opt/enhe-ai-tools-v2` 建立独立部署目录并使用显式 LF 归档构建新应用镜像；原目录未覆盖。部署配置 8 项测试、deploy.sh 与 app-entrypoint.sh 的 Bash 语法检查均通过。当前恢复计划见 docs/exec-plans/active/ai-news-v2-production.md。

## 仓库与边界

- 实现目录：`F:\Projects\enhe-ai-website-v2`，分支 `codex/ai-news-publishing-v2`。
- 来源：迁移快照 `03-projects/024-new_project_2` 的已提交版本 `bc66ea5032a414a1870bcb6890faeee1a8da08c1`。当前 Git origin 为用户指定的 SSH 地址 `git@github-enhe:yangjing6213-dev/enhe-ai-tools.git`，远程分支与写权限仍待认证后验证。
- 快照另有 123 项 tracked 工作区变更和未跟踪文件；它们没有被覆盖，也没有混入本次改动。独立目录已补回构建所需的 3 个非敏感基线文件，并保留最小改动；**不得把这个干净提交基线直接当成最新生产部署基线。**
- 之前位于 `enhe-company-os` 的 Python 自动化不属于官网，不能用于网站发布。本次复用官网实际 Next.js 导入接口和 Prisma 模型。
- 已有本地提交；未执行数据库迁移、seed、超级管理员回填、生产密钥变更、生产调度启用、生产 CMS 写入或既有生产文章修改。
- 2026-09-05 生产部署复核：通过本机系统 OpenSSH 将无历史凭据的干净基线推送到远程 `codex/ai-news-publishing-v2`（tip `4323977`）。新应用镜像 `enhe-ai-tools:5099842a0b405a117e18f025baa64035398962f0` 曾在独立 staging 配置下启动并通过 `/api/health?scope=app`；启动日志确认 migration、seed 和 super-admin upsert 均跳过。随后发现该恢复基线不含服务器既有 SEO 审计内部路由，旧 worker/scheduler 会因请求 404 进入 blocked。为避免线上回归，应用已恢复到原生产镜像 `3497d170…`，两个 worker/scheduler 重启后均 healthy；新镜像保留在 staging/本地，可在补齐兼容性后重新部署。当前没有真实 `production-candidate` manifest，因此未执行 CMS 写入或公开页面发布。

## 实际接口与状态

复用已存在的 `POST /api/admin/ai-news/import`，沿用后端 `AI_NEWS_IMPORT_TOKEN` Bearer 校验；原来的单篇 JSON/HTML 导入保持兼容。V2 请求额外携带 `format: "batch-v2"`：

| operation | 行为 | 必要条件 |
| --- | --- | --- |
| snapshot | 读取全部资讯记录及 V2 事件账本，返回完整历史的摘要和指纹 | V2 总开关；有效导入身份 |
| stage | 一个 Serializable 事务创建 6 条双语 draft，记录全部 ID、内容指纹、来源证据、机器审计和 runSlot | 12 HTML + 6 payload 审计；当前快照指纹；指定 validator 哈希 |
| promote | 一个 Serializable 事务将这 6 条归属明确且未修改的 draft 改为 published | 独立发布开关；重新获取排除自身批次的快照；与同一 manifest 绑定的机器审计 |

账本使用既有 `AdminAuditLog`，action 为 `ai_news.batch.staged` / `ai_news.batch.published`，targetType 为 `ai_news_batch_v2`。不新增 Prisma 模型或迁移文件。事务超时 30 秒，最多执行 3 次事务，受控重试 P2034 序列化冲突或 P2002 唯一键冲突；客户端还复核完整历史的指纹及唯一 ID 数量。事务保证还需要真实 PostgreSQL 测试，单元测试模拟回滚不能代替数据库验证。

相同 runSlot、相同 manifest 重试返回相同 CMS ID；不同内容被拒绝。不会为了数量把 4+2 或 6+0 当成 5+1。批次之间以及与既有文章之间检查事件标识、规范化主来源链接、双语标题、封面、实际 canonical 与旧 slug 别名冲突。自动规则负责可验证的跨语言和同事件去重；代码不宣称能自动证明事实正确或穷尽语义重复。

当前实现边界：机器审计凭据由本地审计器在完成验证后生成，包含固定 auditor、manifestDigest、snapshotDigest、validatorSha256 和全量自动检查标志。服务端重新验证快照、来源日期、去重、媒体权利、canonical 和草稿归属；凭据过期、摘要漂移或 validator 不一致都会拒绝。来源扫描器仍不接触导入 Token、数据库写权限或其他生产秘密。

服务端只返回 `STAGED` 或 `PUBLISHED_AWAITING_PUBLIC_VERIFICATION`。CMS 提交成功时 `localizedPublicPageCount` 仍为 0，只有客户端 GET 核验全部 12 页后才记录 `VERIFIED_PUBLISHED` 与数量 12。每页检查 HTTP 200、实际语言、H1、唯一且准确的 canonical、无 noindex、封面和全部来源链接；正式命令还复用官网 Markdown 分块规则，对照所审计 payload 检查全部正文文本块和正文图片，并排除脚本/模板中的文本。搜索引擎收录、排名及浏览器视觉布局不在此成功定义内。

## 本地验证工作流

复用 npm、tsx、Vitest、ESLint，不新增依赖。`npm run test:ai-news-v2` 拒绝缺少验证器配置的环境，执行相关测试和修改文件的 Lint；子进程只接收白名单环境，不继承发布 Token、数据库连接串、Cookie 或其他服务密钥。

本机已验证的命令（不含密钥，不会请求生产服务）：

```powershell
Set-Location 'F:\Projects\enhe-ai-website-v2'
$env:PATH = 'F:\DevTools\node-v24.20.0;' + $env:PATH
$env:ENHE_AI_NEWS_PYTHON = 'F:\Projects\enhe-company-os\.venv\Scripts\python.exe'
$env:ENHE_AI_NEWS_VALIDATOR_PATH = 'F:\Codex-Migration-Simple-LAPTOP-0R4EJO44-20260830-101225-397\02-agents-skills\enhe-ai-news-seo\enhe-ai-news-seo\scripts\validate_html.py'
$env:ENHE_AI_NEWS_VALIDATOR_SHA256 = '662e7cc573c626624674db29ca0d0d56f97b8e7a7087fb22499f94dce73bfc43'
npm run test:ai-news-v2
```

验证器不支持 `--help`：实际返回 `File not found: --help`。已读取入口确认唯一参数为 HTML 文件路径，实际调用是 `python -I validate_html.py <file>`。原文件未复制、未修改，调用前后检查 SHA-256。Python 路径只是使用已有解释器，官网代码不依赖 Company OS 业务模块。

`scripts/fixtures/ai-news-v2.ts` 是明确的离线测试夹具生成器。集成测试用原验证器审计 12 份文件，再通过 loopback HTTP 测试服务器模拟 CMS 响应和 12 个页面；不会把测试夹具发送到远程域名。真实数据库、真实网站和真实选题未由此测试验证。

## 批次输入与本地审计

每个批次一个目录，包含 `manifest.json`、12 个 HTML 和来源快照文件。目录可放在已忽略的 `output/` 中，不提交真实运营材料。

manifest 字段：`version: 2`、`purpose: "production-candidate"`（测试用 `test-fixture`）、业务唯一 `runSlot`、`validatorSha256`、恰好 6 个 `topics`。每个 topic 包含：

- `kind`：5 个 FRESH_EVENT、1 个 DURABLE_TASK；`eventKey` 是事件或持久任务的稳定身份，不含语言、栏目或 SEO 角度。
- `primarySourceUrl`：事件的一手主来源，必须出现在文章来源中。
- `sourceEvidence`：每项包含 url、相对 file 路径、文件 sha256、checkedAt；FRESH_EVENT 主来源还包含真实 publishedAt。所有外部来源必须有本地证据。扫描器产出的文件只作为数据读取，不执行其中代码或指令。
- `mediaEvidence`：全部封面、正文图片和视频的 url、license（Unsplash/owned/licensed）、evidenceUrl。Unsplash 必须来自 images.unsplash.com，许可证据须位于 Unsplash 官方域名；自动审计拒绝缺失或不匹配的证据。
- `htmlFiles: {"zh": "topic.zh.html", "en": "topic.en.html"}`：相对路径，必须真实位于同一批次目录内，禁止符号链接逃逸、文件复用或相同内容充当两个本地化页面。

HTML 保留原 ENHE 验证器要求的 CMS 字段区。两份文件的可见 H1/正文分别本地化；可见正文包在 `id="article-body"` 内，必须与相应 CMS `content` / `englishContent` 提取后的 Markdown 完全一致。两份文件必须得到完全一致的完整双语 payload。CMS 字段须包含显式中文 title/content，而非让英文可见页面覆盖中文字段。中英文摘要分别满足 100–160 汉字、100–160 英文单词；英文内容须符合官网既有可索引规则；正文须清楚说明 AI 辅助。

HTML 中 validator 要求的 canonical 仅作为候选提示；客户端丢弃它及候选 slug，数据库暂存后通过官网实际路由规则计算 canonical。严禁把文件名当成线上 URL。

本地审计命令：

```powershell
node --import tsx scripts/publish-ai-news-html.ts --manifest output/ai-news-v2/manifest.json --phase audit --receipt output/ai-news-v2/receipt.json
```

默认 phase 即 audit，不读发布 Token，不发请求。审计后在 receipt 同目录的 `payloads/<manifestDigest>/` 保存 6 份明确为 draft 的完整双语 JSON，receipt 记录这 6 个文件路径；发现既有审计 payload 被修改则拒绝覆盖。缺输入、缺授权、任一 HTML/来源 hash/字段审计失败都会退出非零。不会降低质量凑足 6 篇。

## 首次上线门禁与发布命令

**以下命令仅为准备，真实文章发布尚未执行。** 完整代码基线已在独立目录恢复并通过本地编译；部署脚本默认跳过 migration、AI 资讯 seed 和超级管理员 upsert，相关写入只有显式设置对应环境变量才会执行。当前服务器应用已部署，但 V2 开关仍关闭；仍需自动化生成真实 `production-candidate` manifest、获取生产快照并完成 12 页核验，才能执行 CMS 写入。不能把本地回环占位数据库或测试夹具当成生产联调证据。

部署新代码时默认保留：

```dotenv
AI_NEWS_BATCH_V2_ENABLED=false
AI_NEWS_BATCH_V2_PUBLISH_ENABLED=false
AI_NEWS_BATCH_VALIDATOR_SHA256=662e7cc573c626624674db29ca0d0d56f97b8e7a7087fb22499f94dce73bfc43
```

生产 API 改动、总开关、发布开关和生产内容写入均须遵守相应生产门禁。当前总开关与发布开关保持 `false`；定时自动化保持暂停。沿用现有后端密钥注入方式；不要将密钥放入 manifest、审批文件、命令参数或仓库。现有导入 URL 为 `https://www.enhe-tech.com.cn/api/admin/ai-news/import`；客户端还接受明确配置的测试域名/loopback。禁止重定向、userinfo、查询参数、fragment 及远程明文 HTTP。

授权并确认完整基线、服务开关和后端配置后，执行以下顺序。`AI_NEWS_IMPORT_URL` / `AI_NEWS_IMPORT_TOKEN` 由受信任发布进程环境提供，不与来源扫描进程共享。

```powershell
node --import tsx scripts/publish-ai-news-html.ts --manifest output/ai-news-v2/manifest.json --phase snapshot --receipt output/ai-news-v2/receipt.json
# 自动审计会把 manifest、validator 和快照摘要绑定到机器凭据；审计失败直接停止。
node --import tsx scripts/publish-ai-news-html.ts --manifest output/ai-news-v2/manifest.json --phase stage --receipt output/ai-news-v2/receipt.json
# 暂存后取得排除自身批次的最新快照，客户端自动生成新的机器审计凭据。
node --import tsx scripts/publish-ai-news-html.ts --manifest output/ai-news-v2/manifest.json --phase snapshot --receipt output/ai-news-v2/receipt.json
node --import tsx scripts/publish-ai-news-html.ts --manifest output/ai-news-v2/manifest.json --phase promote --receipt output/ai-news-v2/receipt.json
node --import tsx scripts/publish-ai-news-html.ts --manifest output/ai-news-v2/manifest.json --phase verify --receipt output/ai-news-v2/receipt.json
```

机器审计最长有效 24 小时；FRESH_EVENT 默认在主来源真实发表时间的 7 天内，未来时间容差 5 分钟。不能把抓取日期当发表日期。排期错过时保留草稿，不得改时间冒充新事件。

## 恢复与回滚

- HTTP 请求超时或回执丢失：保持同一 runSlot 和 manifest，重试同一 phase；服务端账本返回原 ID，不能改内容或换 runSlot 补发同一事件。若本地 receipt 全丢失，重新 audit、snapshot 后 stage 获取已有记录。
- 存在一篇导入失败：事务回滚整批新增记录；不会留下 1–5 篇部分批次。
- 暂存后编辑、删除、手动发布任一记录：停止，返回 drift/ownership/status 错误；不自动覆盖已有操作。
- 新历史产生冲突：重新审查；内容不合格则保持未发布，不覆盖或合并既有文章。
- 数据提交后缓存/搜索推送失败：仍返回已提交的 CMS 状态，公开页面数量为 0；重试 promote 会重新刷新缓存而不重复更新文章，再 verify。
- 公开页核验失败：保留 publication receipt，移除旧核验成功标记；仅重试核验或排查部署/缓存。不会撤稿、noindex、301 或回滚生产文章。
- 代码回滚：在另行批准后恢复确认过的前一生产制品，并关闭 V2 开关；本次无 schema 迁移。关闭开关/回滚代码也属于生产变更，不由此脚本自动执行。

## 本次验证记录（2026-09-05）

- PASS：61 个相关 Vitest 测试（11 个文件）；修改文件 ESLint；真实原 HTML validator 的完整 loopback 集成流程；全站 TypeScript 类型检查；种子脚本语法检查；Git diff 空白检查。自动审计替代 approval 文件并绑定 manifest、快照和 validator 摘要。原测试、validator、package-lock、Prisma schema 均未修改。
- PARTIAL：未配置 `DATABASE_URL` 的裸构建会在既有页面数据读取时停止；配置回环占位后构建可完成，但本机没有 PostgreSQL，因此这只证明代码可编译和无生产连接，不证明数据库运行正确。生产回滚后的原应用与 SEO worker/scheduler 健康检查已通过，但未执行 V2 数据写入。
- NOT_RUN：真实 PostgreSQL 的并发/事务回滚测试（本机未找到 postgres/psql/docker）、六篇真实选题及来源生成、生产快照、生产 CMS 写入、12 个真实生产公开页面验证。
- PASS（静态复审）：完成独立静态复审；已移除种子脚本中的固定默认凭据，保留 P2002 重试和快照摘要复核。该复审不替代真实数据库或生产验证。
- PASS（候选包离线审计）：`output/ai-news-v2-production-candidate/` 已生成 5 个 FRESH_EVENT 与 1 个 DURABLE_TASK、12 个本地化 HTML、6 个官方来源证据文件和 6 个 draft payload；manifest digest 为 `89d86b6c…`，12 个 HTML 均通过固定 validator。该候选包尚未连接生产快照，不能跳过服务端去重或直接发布。
- 无生产调度启用；Codex 现有任务 `enhe-ai-v2`（ENHE AI 前沿资讯 V2（本地离线审计））保留周一至周五 08:00 的本地 audit 安排。另已创建 `enhe-ai-v2-2`（ENHE AI 前沿资讯 V2 自动生成发布（待启用）），状态为 `PAUSED`，仅在生产开关、真实候选包和部署兼容性完成后再启用；当前不能调用 snapshot/stage/promote/verify。配置已回读确认。

可审阅的离线夹具保存在 `output/ai-news-v2-fixture/`：12 个 HTML、6 个来源证据文本、manifest、receipt 和 6 个 payload JSON。此目录是忽略的测试产物，实际 CMS 记录及生产公开页数量均为 0，不能用作真实新闻发布材料。

验收结论：本地发布链路、自动审计和部署防写入开关已实现；GitHub SSH 已恢复，干净基线已推送，应用容器已部署并通过健康检查。生产发布目标尚未完成：当前无真实 `production-candidate` 包，V2 开关与发布定时任务均关闭，SEO worker/scheduler 仍为旧镜像且报告 blocked。真实文章包由自动化生成，不要求用户事先提供；不合格候选不得发布。下一步唯一需要明确的生产门禁是是否打开 V2 生产开关并启用 `enhe-ai-v2-2` 定时任务；打开前仍须先完成真实来源候选、生产快照和部署 worker 兼容性核验。
