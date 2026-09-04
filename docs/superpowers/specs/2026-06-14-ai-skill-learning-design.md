 # AI技能学习模块 — 设计规格
 
 > **日期**: 2026-06-14
 > **状态**: 已确认
 > **目标**: 在 enhe-ai-tools 项目中新增"AI技能学习"付费课程模块，复用现有 Tool 模型和商业闭环。
 
 ## 概述
 
 在现有"AI软件应用"和"AI账号服务"之外增加第三种工具类型 `skill_learning`（AI技能学习）。
 每个课程是一个 Tool 条目，用户购买（创建订单 → 支付审核 → 解锁）后可在课程详情页查看教程、图文等学习内容。
 完全复用现有订单/支付/权限/审核系统，仅在 UI 层和少量类型定义处做扩展。
 
 ## 数据模型
 
 ### Prisma Schema
 
 `ToolType` 枚举新增 `skill_learning`：
 
 ```prisma
 enum ToolType {
   software
   online
   skill_learning
 }
 ```
 
 不需要新表或新字段。`Tool` 模型现有字段（name, slug, coverImage, content, tutorials, faqs, changelogs, priceSpecs, isVipRequired 等）直接用于课程管理。
 
 ## 路由映射
 
 | 路由 | 页面 | 对应现有模式 |
 |---|---|---|
 | `/skill-learning` | 前台课程列表 | `/software` |
 | `/tools/[slug]` | 课程详情（复用） | 现有详情页 |
 | `/admin/skill-learning` | 后台课程列表 | `/admin/software` |
 | `/admin/skill-learning/[id]` | 后台课程编辑 | `/admin/software/[id]` |
 
 ## 前端改动
 
 ### 1. 导航栏 (`site-header.tsx`)
 
 - `navItems` 新增 `[t.nav.skillLearning, "/skill-learning"]`，位于"AI账号服务"之后
 
 ### 2. 首页 (`page.tsx`)
 
 - Hero 按钮区新增第三个 CTA 按钮「AI技能学习」，跳转 `/skill-learning`
 - 图标使用 `BookOpen` (lucide-react)
 
 ### 3. 课程列表页 (`src/app/skill-learning/page.tsx`) — 新建
 
 - 完全复用 `software/page.tsx` 模式
 - 查询 `type: "skill_learning"`, `status: "published"`
 - 卡片使用 `ToolCard` 组件
 - 筛选支持：关键词、分类、排序（最新/热门按 purchase 数），去掉付费/免费切换（课程全部付费）
 
 ### 4. 课程详情页 (`src/app/tools/[slug]/page.tsx`) — 修改
 
 - 当 `tool.type === "skill_learning"` 时：
   - 购买按钮文案改为"购买课程"/"开始学习"
   - 购买后解锁区域展示教程内容和 FAQ（而非下载链接）
   - 标签显示"AI技能学习"
 
 ### 5. 用户中心
 
 - 已购课程显示在"已购软件"区域，复用现有逻辑
 
 ## 后台管理
 
 ### 1. 侧边栏 (`admin/layout.tsx`)
 
 - `adminNav` 新增 `["skillLearning", "/admin/skill-learning"]`，位于"AI账号服务"之后
 
 ### 2. 课程列表页 (`src/app/admin/skill-learning/page.tsx`) — 新建
 
 - 复用 `ToolAdminList` 组件，传入 `type="skill_learning"`
 - 标题："AI技能学习管理" / "AI Skill Learning Management"
 
 ### 3. 课程编辑页 (`src/app/admin/skill-learning/[id]/page.tsx`) — 新建
 
 - 复用 `ToolEditor` 组件
 - 课程模式下隐藏：版本号、系统要求、下载文件/下载链接字段
 
 ## 共享组件/库改动
 
 ### `tool-admin-list.tsx`
 
 - `AdminToolType` 类型扩展为 `"software" | "online" | "skill_learning"`
 - 新增 `isSkillLearning` 判断，与 `isAccountService` 平级
 - 课程模式下：
   - 列表页："新课程"按钮、"课程"列头、"暂无课程"提示
   - 编辑页：隐藏版本号/系统要求/下载文件/下载链接，显示教程内容提示
 - 新增 `toolAdminCopy` 中的课程相关文案（中英双语）
 
 ### `admin-tool-routes.ts`
 
 - 函数签名 `type` 参数扩展为 `"software" | "online" | "skill_learning"`
 - 路由映射：`"skill_learning"` → `/admin/skill-learning`
 
 ### `admin-list.ts`
 
 - `buildAdminToolWhere` 类型签名扩展
 
 ### `tool-publish-check.ts`
 
 - 课程类型的发布条件：需要教程内容（至少有 1 条 tutorial），不需要下载链接
 
 ## i18n 改动
 
 ### `i18n.ts` — 前台词典
 
 新增 key：
 - `nav.skillLearning`: "AI技能学习" / "AI Skill Learning"
 - `listing.skillLearningTitle`: "AI技能学习" / "AI Skill Learning"
 - `listing.skillLearningIntro`: "购买 AI 技能课程，解锁图文教程和实战指南。" / "Purchase AI skill courses to unlock tutorials and guides."
 - `home.skillLearningButton`: "AI技能学习" / "AI Skill Learning"
 - `toolDetail.skillLearning`: "AI技能学习" / "AI Skill Learning"
 - `toolDetail.buyCourse`: "购买课程 ¥{price}" / "Buy course CNY {price}"
 - `toolDetail.startLearning`: "开始学习" / "Start learning"
 - `toolDetail.courseContentTitle`: "课程内容" / "Course content"
 
 ### `admin-i18n.ts` — 后台词典
 
 新增 key：
 - `nav.skillLearning`: "AI技能学习" / "AI Skill Learning"
 
 ### `tool-admin-list.tsx` — 内联文案
 
 课程专属文案（中英）：
 - courseListIntro, newCourse, courseSearchPlaceholder, course, noCourses
 - courseEditorIntro, coursePrice, saveCourse, createCourse, deleteCourse
 
 ## 行为差异矩阵
 
 | 维度 | AI软件应用 | AI技能学习（课程） |
 |---|---|---|
 | 购买后解锁内容 | 下载链接/文件 | 教程图文 + FAQ |
 | 详情页 CTA | "购买下载"/"下载应用" | "购买课程"/"开始学习" |
 | 管理列表列头 | "工具" | "课程" |
 | 发布检查要求 | 下载链接或文件 | 至少 1 条教程 |
 | 编辑页版本/系统要求 | 显示 | 隐藏 |
 | 编辑页下载文件/链接 | 显示 | 隐藏 |
 | 订单类型 | `software_download` | 共用 `software_download` |
 
 ## 不影响的部分
 
 - 订单创建/支付/审核/退款流程（原样复用）
 - 权限校验 `assertToolAccess`
 - VIP 会员体系
 - ZPay 支付集成
 - COS 文件存储
 - 评论系统、通知系统、分析/仪表板
 - 部署配置
 
 ## 测试计划
 
 - 新增 `tool-publish-check` 课程类型用例
 - 新增 `admin-tool-routes` 课程类型路由用例
 - Playwright e2e：课程购买流程（创建订单 → 上传凭证 → 管理员审核 → 解锁 → 查看教程内容）
