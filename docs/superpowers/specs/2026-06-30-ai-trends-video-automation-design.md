# AI Trends Video Automation Design

- Date: 2026-06-30
- Scope: `AI趋势分析` 自动化升级 + `/ai-trends` 主入口视频模块
- Status: approved design, pending implementation plan

## Goal

在现有 AI 趋势简报体系上增加“视频产出与主页联动”能力，同时保持当前 `/ai-trends` 的 SEO / GEO 架构不退化。

用户要求：

1. 自动化在完成趋势调研和 HTML 报告后，再生成视频。
2. 邮件继续发送完整 HTML 报告。
3. 网站主入口 [`/ai-trends`](C:/Users/HU/Documents/New project 2/src/app/ai-trends/page-shell.tsx) 在“需求热度排行”区域上方展示视频播放窗口。
4. 视频窗口默认展示“最新一期已发布 AI 趋势简报的视频”。
5. 对网站的修改不允许破坏现有 SEO 和 GEO 架构。

## Current State

现有站点已经有完整的 AI 趋势信息架构：

1. 主入口 `/ai-trends` 是可索引的公开聚合页，带 canonical、语言 alternates、sitemap 接入，以及 `CollectionPage` / `WebPage` / FAQ / Breadcrumb 结构化数据。
2. `daily` 列表页和单日详情页是 `noindex, follow`，不与主入口竞争索引。
3. `AiTrendBriefing` 已经是趋势内容的主发布实体，包含：
   - 标题、摘要、核心结论
   - `fullHtml`
   - 来源信号与需求拆解
   - 发布状态与发布时间
4. 单日详情页已支持嵌入完整 HTML 报告，说明 AI 趋势内容已经走服务端内容链路，而不是纯前端拼装。

当前缺口：

1. `AiTrendBriefing` 没有视频字段。
2. 自动化只生成 HTML 邮件与 HTML 报告，不生成视频。
3. `/ai-trends` 主入口没有“最新视频简报”模块。

## Chosen Approach

采用“视频属于 `AiTrendBriefing`”的方案。

原因：

1. 内容实体单一：一份简报同时拥有 HTML、来源信号、结构化趋势数据、视频资产。
2. 同步简单：邮件、daily 详情、主页视频都能围绕同一条已发布 briefing 记录。
3. SEO / GEO 风险最低：主页继续服务端渲染现有趋势内容，只是在同一份服务端数据上增加视频模块。
4. 降低状态漂移：避免“主页展示的视频”和“最新一期趋势简报”脱节。

不采用以下方案：

1. `SiteSetting` 单独维护主页视频：会让视频与简报记录分离。
2. 在 `public` 或 JSON manifest 中旁路写视频元数据：会形成第二套内容源，不利于长期维护与 GEO 一致性。

## Design

### 1. Data Model

扩展 [`AiTrendBriefing`](C:/Users/HU/Documents/New project 2/prisma/schema.prisma)。

新增字段：

1. `videoUrl String?`
2. `videoTitle String?`
3. `videoDescription String?`
4. `videoPosterUrl String?`
5. `videoDurationSeconds Int?`

约束：

1. 所有字段均为可空，保证历史 briefing 不需要一次性补全。
2. “主页展示视频”的判定条件为：
   - `status = published`
   - `publishedAt != null`
   - `videoUrl != null`
3. `videoUrl` 允许站内上传地址或可信外部可访问地址，但实现上优先使用站内可控静态/上传路径。

### 2. Domain / Read Model Changes

扩展 [`src/lib/ai-trends.ts`](C:/Users/HU/Documents/New project 2/src/lib/ai-trends.ts)：

1. `AiTrendBriefingPublishInput`
   - 接受视频字段。
2. `AiTrendBriefingPublishData`
   - 校验并携带视频字段。
3. `AiTrendBriefingRecord`
   - 增加视频字段映射。
4. `AiTrendBriefingView`
   - 增加视频字段，供页面层直接使用。
5. `toAiTrendBriefingView`
   - 按 `includeFullHtml` 逻辑之外，始终映射视频信息。
6. 新增一个只读 helper：
   - `getLatestPublishedAiTrendBriefingWithVideo()`

读取策略：

1. 主页不自行拼“哪一条最新可播”，而是通过 `lib/ai-trends` 统一查询。
2. 查询条件只返回最新一条已发布且带视频的简报。
3. 无视频时返回 `null`，页面执行无视频回退。

### 3. Automation Flow

自动化流程升级为：

1. 联网调研最新公开趋势信号。
2. 生成中文视觉化 HTML 报告。
3. 生成视频脚本输入：
   - 标题
   - 核心结论
   - 热度排行摘要
   - 重点方向卡片
   - 趋势判断 / 机会优先级
4. 调用现有视频生成路径，产出 MP4。
5. 如可行，同步产出 poster 首帧图。
6. 发布/更新 `AiTrendBriefing`：
   - `fullHtml`
   - `sourceSignals`
   - `demandBreakdowns`
   - 新增视频字段
7. 发送 HTML 邮件。
8. 站点 `/ai-trends` 自动读取最新已发布且带视频的 briefing，并展示在主入口。

失败策略：

1. 视频生成失败时：
   - 简报 HTML 仍可发布。
   - 邮件仍可发送。
   - `video*` 字段保持空值。
   - `/ai-trends` 主页不渲染播放器。
2. 视频上传/保存失败但 HTML 成功时，视为“无视频发布”，不能阻断整个趋势简报。

### 4. Video Rendering Strategy

用户提到 `Remotion Skill`，但当前环境没有现成可直接调用的该技能或对应专用工具。

因此实现采用“等价视频渲染方案”：

1. 保留自动化层面的“调研后生成视频”要求。
2. 以仓库现有视频/视觉资产工作流为基础生成 MP4。
3. 输出结果必须满足站点可嵌入：
   - 浏览器可直接播放
   - 可通过 `video` 标签挂载
   - URL 稳定可访问

实现约束：

1. 视频时长优先控制在短视频摘要范围，避免主页首屏过重。
2. 画面风格优先做“趋势摘要型视频”，而不是复杂叙事片。
3. 文本镜头必须与 HTML 报告结构一致，避免视频与正文结论相互矛盾。

### 5. `/ai-trends` Main Page Changes

只修改主入口页 [`src/app/ai-trends/page-shell.tsx`](C:/Users/HU/Documents/New project 2/src/app/ai-trends/page-shell.tsx)。

新增一个“Latest trend briefing video”模块，位置：

1. 放在“可摘录答案 / Extractable answer”之后。
2. 放在“需求热度排行 / Demand heat ranking”之前。

内容结构：

1. 模块标题
   - 中文：最新一期视频简报
   - 英文：Latest video briefing
2. 视频播放器
3. 右侧或下方文本摘要：
   - 简报标题
   - 日期
   - 核心结论
   - 跳转到对应 daily 详情页按钮

播放器行为：

1. `autoplay`
2. `muted`
3. `loop`
4. `playsInline`
5. `preload="metadata"`
6. `poster` 优先使用 `videoPosterUrl`

原因：

1. 浏览器对自动播放的兼容性要求视频静音。
2. `playsInline` 避免移动端强制全屏。
3. `preload="metadata"` 可减少无必要的首屏资源压力。

无视频回退：

1. 如果没有任何已发布且带视频的 briefing：
   - 页面完全不展示视频模块。
   - 保持现有 `/ai-trends` 结构不变。

### 6. SEO / GEO Safeguards

这部分是硬约束。

必须保持：

1. `/ai-trends` 继续是唯一可索引的趋势聚合入口。
2. `/ai-trends/daily` 与 `/ai-trends/daily/[date]` 继续 `noindex, follow`。
3. 现有 `canonical`、`alternates`、`sitemap`、`robots` 逻辑不变。
4. 主页趋势内容继续服务端输出，而不是客户端懒加载主要文本。

新增但不破坏现有结构：

1. 在主页现有 `StructuredData` 基础上增量加入 `VideoObject`。
2. 不替换现有 `CollectionPage`、`WebPage`、FAQ、Breadcrumb。
3. `VideoObject` 只在存在视频时输出。

`VideoObject` 至少包含：

1. `name`
2. `description`
3. `contentUrl`
4. `thumbnailUrl`（如有）
5. `uploadDate`（取 briefing 的 `publishedAt` 或 `date`）
6. `duration`（如有）
7. `embedUrl` 可选，若站点后续提供独立视频详情锚点再补

GEO 保护原则：

1. 视频只是补充表达层，不能取代主页可抓取文本。
2. 视频周围保留清晰可抽取的文字摘要。
3. 趋势方向、热度、结论、来源提示仍保持文本可见。

### 7. Accessibility / UX Constraints

1. 自动播放必须静音。
2. 必须保留浏览器原生播放控件或提供可暂停能力，避免不可控自动动效。
3. 移动端播放器不能挤压正文层级，优先纵向堆叠。
4. 视频容器应使用固定宽高比，避免 CLS。
5. 若视频不可加载，展示文本和链接，不让整个模块塌陷。

### 8. Files Expected To Change In Implementation

核心文件：

1. [`prisma/schema.prisma`](C:/Users/HU/Documents/New project 2/prisma/schema.prisma)
2. `prisma/migrations/<timestamp>_add_ai_trend_briefing_video_fields/`
3. [`src/lib/ai-trends.ts`](C:/Users/HU/Documents/New project 2/src/lib/ai-trends.ts)
4. [`src/app/ai-trends/page-shell.tsx`](C:/Users/HU/Documents/New project 2/src/app/ai-trends/page-shell.tsx)

可能新增：

1. `src/components/ai-trend-video-briefing.tsx`
2. 自动化脚本或发布脚本
3. 视频渲染辅助脚本
4. 相关测试文件

不计划改动：

1. `/ai-trends/daily` 列表页的索引策略
2. `/ai-trends/daily/[date]` 现有完整 HTML iframe 展示逻辑
3. `/sitemap.xml` 中 `ai-trends` 的入口策略

### 9. Testing Plan

实现后需要验证：

1. Prisma 迁移成功。
2. 历史无视频 briefing 仍可正常读取和渲染。
3. 新发布 briefing 写入视频字段后：
   - `/ai-trends` 主页能显示最新视频模块。
   - 标题、日期、核心结论、跳转链接正确。
4. 没有视频 briefing 时：
   - `/ai-trends` 主页不出现空白视频容器。
5. `Metadata`、`StructuredData`、`robots`、`sitemap` 不回归。
6. 中英文 `/ai-trends` 页面都能正常渲染。
7. 移动端布局不溢出，播放器不会导致明显 CLS。

推荐测试层级：

1. `lib/ai-trends` 单元测试：
   - 最新已发布视频 briefing 查询
   - 无视频 / 无发布项回退
2. 页面渲染测试：
   - 有视频状态
   - 无视频状态
3. 若已有 e2e 基础：
   - `/ai-trends` 首屏播放器存在性与位置验证

## Risks

1. 视频资源过大导致主页首屏负担上升。
2. 自动化视频生成链路比 HTML 生成更脆弱。
3. 若视频文案和 HTML 报告不是同一份结构化数据源，容易出现结论不一致。
4. 若主页直接读取外部视频地址，可能引入稳定性与缓存问题。

## Risk Controls

1. 视频仅预加载 metadata，不做全量预加载。
2. 视频字段可空，确保发布流程对视频失败具备降级能力。
3. 视频脚本输入直接复用趋势简报结构化数据。
4. 主页只展示“最新已发布且带视频”的一条 briefing，避免复杂选择逻辑。

## Out Of Scope

1. 不修改 `/ai-trends/daily` 列表页布局。
2. 不为所有历史 briefing 立即补视频。
3. 不新增独立“视频详情页”。
4. 不改变现有 AI 趋势 HTML 报告登录策略。
5. 不实现后台手动置顶视频能力。

## Implementation Readiness

该设计已满足进入 implementation plan 的条件：

1. 内容实体明确
2. 页面挂载位置明确
3. SEO / GEO 保护边界明确
4. 回退逻辑明确
5. 测试目标明确
