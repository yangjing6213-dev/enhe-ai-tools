 # AI技能学习模块 — 实施计划
 
 > **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
 **Goal:** 在 enhe-ai-tools 项目中新增"AI技能学习"付费课程模块，含前台列表/详情、首页/导航入口、后台管理列表/编辑页，复用现有 Tool 模型。
 
 **Architecture:** 在 Prisma `ToolType` 枚举新增 `skill_learning`，所有类型签名扩展为三值联合类型。新建 `skill-learning` 路由的列表页/后台管理页，复用 `ToolCard`/`ToolAdminList`/`ToolEditor` 组件。课程模式下隐藏软件专属字段（版本、下载链接），突出教程内容。
 
 **Tech Stack:** Next.js 15 App Router, TypeScript, Prisma, PostgreSQL, Tailwind CSS 4, Vitest
 
 ---
 
 ### Task 1: Prisma Schema — 新增 ToolType 枚举值
 
 **Files:**
 - Modify: `prisma/schema.prisma`
 
 - [ ] **Step 1: 编辑 schema 文件**
 
 在 `prisma/schema.prisma` 的 `enum ToolType` 中添加 `skill_learning`：
 
 ```prisma
 enum ToolType {
   software
   online
   skill_learning
 }
 ```
 
 - [ ] **Step 2: 运行 Prisma Generate**
 
 ```bash
 npx prisma generate
 ```
 
 Expected: 无错误，Prisma Client 重新生成，`ToolType` 包含 `skill_learning`。
 
 - [ ] **Step 3: 运行 Prisma Migrate Dev**
 
 ```bash
 npx prisma migrate dev --name add_skill_learning_tool_type
 ```
 
 Expected: 生成迁移文件，PostgreSQL 枚举更新成功。
 
 - [ ] **Step 4: Commit**
 
 ```bash
 git add prisma/schema.prisma prisma/migrations
 git commit -m "feat: add skill_learning to ToolType enum"
 ```
 
 ---
 
 ### Task 2: 路由工具库 — 扩展 admin-tool-routes.ts
 
 **Files:**
 - Modify: `src/lib/admin-tool-routes.ts`
 - Test: `src/lib/admin-tool-routes.test.ts` (modify)
 
 - [ ] **Step 1: 先写测试**
 
 在 `admin-tool-routes.test.ts` 中添加课程路由测试：
 
 ```ts
 it("gets base path for skill_learning type", () => {
   expect(getAdminToolBasePath("skill_learning")).toBe("/admin/skill-learning");
 });
 
 it("gets edit path for skill_learning type", () => {
   expect(getAdminToolEditPath("skill_learning", "abc123")).toBe("/admin/skill-learning/abc123");
 });
 
 it("gets new path for skill_learning type", () => {
   expect(getAdminToolNewPath("skill_learning")).toBe("/admin/skill-learning/new");
 });
 ```
 
 - [ ] **Step 2: 运行测试确认失败**
 
 ```bash
 npx vitest run src/lib/admin-tool-routes.test.ts
 ```
 
 Expected: TypeScript 编译错误（`skill_learning` 不在联合类型中）。
 
 - [ ] **Step 3: 实现**
 
 将三个函数的 `type` 参数类型从 `"software" | "online"` 扩展为 `"software" | "online" | "skill_learning"`，添加路由映射：
 
 ```ts
 export function getAdminToolBasePath(type: "software" | "online" | "skill_learning") {
   if (type === "software") return "/admin/software";
   if (type === "online") return "/admin/online-tools";
   return "/admin/skill-learning";
 }
 ```
 
 - [ ] **Step 4: 运行测试确认通过**
 
 ```bash
 npx vitest run src/lib/admin-tool-routes.test.ts
 ```
 
 Expected: 全部 PASS。
 
 - [ ] **Step 5: Commit**
 
 ```bash
 git add src/lib/admin-tool-routes.ts src/lib/admin-tool-routes.test.ts
 git commit -m "feat: extend admin-tool-routes for skill_learning type"
 ```
 
 ---
 
 ### Task 3: 管理列表库 — 扩展 admin-list.ts
 
 **Files:**
 - Modify: `src/lib/admin-list.ts`
 
 - [ ] **Step 1: 实现**
 
 将 `buildAdminToolWhere` 的 `type` 参数从 `"software" | "online"` 扩展为 `"software" | "online" | "skill_learning"`：
 
 ```ts
 export function buildAdminToolWhere(
   type: "software" | "online" | "skill_learning",
   filters: Pick<AdminToolListParams, "q" | "status" | "categoryId">
 ): Prisma.ToolWhereInput {
   // 函数体不变
 }
 ```
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 Expected: 无类型错误。
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/lib/admin-list.ts
 git commit -m "feat: extend admin-list buildAdminToolWhere for skill_learning"
 ```
 
 ---
 
 ### Task 4: 发布检查 — 扩展 tool-publish-check.ts
 
 **Files:**
 - Modify: `src/lib/tool-publish-check.ts`
 - Test: `src/lib/tool-publish-check.test.ts` (modify)
 
 - [ ] **Step 1: 先写测试**
 
 在 `tool-publish-check.test.ts` 中添加课程类型用例：
 
 ```ts
 it("skill_learning course without tutorials is not publishable", () => {
   const issues = getToolPublishIssues({
     type: "skill_learning",
     categoryId: "cat1",
     coverImage: "/img.png",
     shortDescription: "Learn AI prompting",
     content: "Full course content",
     downloadFileId: null,
     downloadFile: null,
     tutorials: []
   });
   expect(issues).toContain("缺少教程内容");
 });
 
 it("skill_learning course with tutorials is publishable", () => {
   const issues = getToolPublishIssues({
     type: "skill_learning",
     categoryId: "cat1",
     coverImage: "/img.png",
     shortDescription: "Learn AI prompting",
     content: "Full course content",
     downloadFileId: null,
     downloadFile: null,
     tutorials: [{ id: "t1", title: "Getting Started" }]
   });
   expect(issues.length).toBe(0);
 });
 
 it("skill_learning does not require download link", () => {
   const issues = getToolPublishIssues({
     type: "skill_learning",
     categoryId: "cat1",
     coverImage: "/img.png",
     shortDescription: "Learn AI prompting",
     content: "Full course content",
     downloadFileId: null,
     downloadFile: null,
     tutorials: [{ id: "t1", title: "Getting Started" }]
   });
   expect(issues).not.toContain("未填写下载链接");
 });
 ```
 
 - [ ] **Step 2: 运行测试确认失败**
 
 ```bash
 npx vitest run src/lib/tool-publish-check.test.ts
 ```
 
 Expected: 新增测试 FAIL。
 
 - [ ] **Step 3: 实现**
 
 修改 `getToolPublishIssues`，在软件专属检查前加上类型判断，课程类型不检查下载链接但检查教程：
 
 ```ts
 // 为 skill_learning 类型添加教程检查
 if (tool.type === "skill_learning") {
   const hasTutorials = Array.isArray(tool.tutorials) ? tool.tutorials.length > 0 : false;
   if (!hasTutorials) {
     issues.push("缺少教程内容");
   }
   // 不检查下载链接
   return issues;
 }
 ```
 
 - [ ] **Step 4: 运行测试确认通过**
 
 ```bash
 npx vitest run src/lib/tool-publish-check.test.ts
 ```
 
 Expected: 全部 PASS。
 
 - [ ] **Step 5: Commit**
 
 ```bash
 git add src/lib/tool-publish-check.ts src/lib/tool-publish-check.test.ts
 git commit -m "feat: add skill_learning publish check rules with tests"
 ```
 
 ---
 
 ### Task 5: 后台 i18n — 扩展 admin-i18n.ts
 
 **Files:**
 - Modify: `src/lib/admin-i18n.ts`
 
 - [ ] **Step 1: 实现**
 
 在 `adminDictionaries.zh.nav` 和 `adminDictionaries.en.nav` 中各添加一条，放在 `onlineTools` 之后：
 
 ```ts
 skillLearning: "AI技能学习",  // zh
 skillLearning: "AI Skill Learning",  // en
 ```
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/lib/admin-i18n.ts
 git commit -m "feat: add skillLearning nav entry to admin i18n"
 ```
 
 ---
 
 ### Task 6: 前台 i18n — 扩展 i18n.ts
 
 **Files:**
 - Modify: `src/lib/i18n.ts`
 
 - [ ] **Step 1: 实现**
 
 在中英词典中添加以下 key。中文词典：
 
 ```ts
 nav.skillLearning: "AI技能学习",
 listing.skillLearningTitle: "AI技能学习",
 listing.skillLearningIntro: "购买 AI 技能课程，解锁图文教程和实战指南。",
 home.skillLearningButton: "AI技能学习",
 toolDetail.skillLearning: "AI技能学习",
 toolDetail.buyCourse: "购买课程 ¥{price}",
 toolDetail.startLearning: "开始学习",
 toolDetail.courseContentTitle: "课程内容",
 ```
 
 英文词典：
 
 ```ts
 nav.skillLearning: "AI Skill Learning",
 listing.skillLearningTitle: "AI Skill Learning",
 listing.skillLearningIntro: "Purchase AI skill courses to unlock step-by-step tutorials and practical guides.",
 home.skillLearningButton: "AI Skill Learning",
 toolDetail.skillLearning: "AI Skill Learning",
 toolDetail.buyCourse: "Buy course CNY {price}",
 toolDetail.startLearning: "Start learning",
 toolDetail.courseContentTitle: "Course content",
 ```
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/lib/i18n.ts
 git commit -m "feat: add skill_learning i18n keys to frontend dictionaries"
 ```
 
 ---
 
 ### Task 7: 后台 UI 组件 — 扩展 tool-admin-list.tsx
 
 **Files:**
 - Modify: `src/app/admin/tool-admin-list.tsx`
 
 - [ ] **Step 1: 实现**
 
 修改点 1 — 类型扩展（第 10 行）：
 ```ts
 type AdminToolType = "software" | "online" | "skill_learning";
 ```
 
 修改点 2 — 在 `ToolAdminList` 组件中添加 `isSkillLearning` 标志（约第 115 行，在 `isAccountService` 之后）：
 ```ts
 const isSkillLearning = type === "skill_learning";
 ```
 
 修改点 3 — 标题和简介逻辑（约第 119-122 行），当 `isSkillLearning` 时使用课程文案：
 ```ts
 {isSkillLearning ? copy.courseListIntro : isAccountService ? copy.serviceListIntro : copy.listIntro}
 ```
 
 修改点 4 — 新增按钮（约第 124 行）：
 ```ts
 {isSkillLearning ? copy.newCourse : isAccountService ? copy.newService : copy.newTool}
 ```
 
 修改点 5 — 搜索 placeholder（约第 132 行）：
 ```ts
 placeholder={isSkillLearning ? copy.courseSearchPlaceholder : isAccountService ? copy.serviceSearchPlaceholder : copy.searchPlaceholder}
 ```
 
 修改点 6 — 列表列头（约第 170-176 行）：
 ```ts
 <span>{isSkillLearning ? copy.course : isAccountService ? copy.service : copy.tool}</span>
 ```
 
 修改点 7 — 空状态（约第 181 行）：
 ```ts
 {isSkillLearning ? copy.noCourses : isAccountService ? copy.noServices : copy.noTools}
 ```
 
 修改点 8 — 价格列头（约第 173 行）：
 ```ts
 <span>{isSkillLearning ? copy.coursePrice : isAccountService ? copy.servicePrice : copy.accessPrice}</span>
 ```
 
 修改点 9 — `ToolEditor` 中课程模式隐藏版本和系统要求（约第 272 行 `!isAccountService` 改为 `!isAccountService && !isSkillLearning`）：
 ```ts
 {!isAccountService && !isSkillLearning ? (<>版本/系统要求字段...</>) : null}
 ```
 
 修改点 10 — `ToolEditor` 中课程模式隐藏下载链接字段（约第 308 行 `!isAccountService` 改为 `!isAccountService && !isSkillLearning`）：
 ```ts
 {!isAccountService && !isSkillLearning ? (<Field label={copy.downloadFileUrl}>...</Field>) : null}
 ```
 
 修改点 11 — 编辑页标题和简介（`ToolEditor` 组件内）：
 ```ts
 {isSkillLearning ? copy.courseEditorIntro : isAccountService ? copy.serviceEditorIntro : copy.editorIntro}
 ```
 
 修改点 12 — 基础信息区块标题（`basicServiceIntro`/`basicToolIntro` → 新增 `basicCourseIntro`）：
 ```ts
 // 在 toolAdminCopy 中新增 basicCourseIntro（中英双语）
 basicCourseIntro: "维护 AI 技能学习课程名称、分类、状态和排序。",
 ```
 
 修改点 13 — 保存/删除按钮：
 ```ts
 tool ? (isSkillLearning ? copy.saveCourse : isAccountService ? copy.saveService : copy.saveTool) ...
 ```
 
 修改点 14 — 在 `toolAdminCopy` 对象中新增课程专属文案（中文 + 英文），共 12 条。
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 Expected: 无类型错误。
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/app/admin/tool-admin-list.tsx
 git commit -m "feat: extend ToolAdminList/ToolEditor for skill_learning course mode"
 ```
 
 ---
 
 ### Task 8: 导航栏 — 修改 site-header.tsx
 
 **Files:**
 - Modify: `src/components/site-header.tsx`
 
 - [ ] **Step 1: 实现**
 
 在 `navItems` 数组中，`onlineTools` 之后、`user` 之前添加：
 
 ```ts
 [t.nav.skillLearning, "/skill-learning"],
 ```
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/components/site-header.tsx
 git commit -m "feat: add skill learning nav item to site header"
 ```
 
 ---
 
 ### Task 9: 首页 — 修改 page.tsx
 
 **Files:**
 - Modify: `src/app/page.tsx`
 
 - [ ] **Step 1: 实现**
 
 在 lucide-react 导入中添加 `BookOpen`：
 ```ts
 import { BookOpen, ChevronRight, Cloud, MonitorDown } from "lucide-react";
 ```
 
 在 hero 按钮区，`onlineButton` 之后添加第三个按钮：
 ```tsx
 <ButtonLink href="/skill-learning" className="home-hero-cta">
   <BookOpen size={22} />
   {t.home.skillLearningButton}
   <ChevronRight size={18} />
 </ButtonLink>
 ```
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/app/page.tsx
 git commit -m "feat: add skill learning hero CTA button on homepage"
 ```
 
 ---
 
 ### Task 10: 后台侧边栏 — 修改 admin/layout.tsx
 
 **Files:**
 - Modify: `src/app/admin/layout.tsx`
 
 - [ ] **Step 1: 实现**
 
 在 `adminNav` 数组中，`onlineTools` 之后添加：
 
 ```ts
 ["skillLearning", "/admin/skill-learning"],
 ```
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/app/admin/layout.tsx
 git commit -m "feat: add skill learning entry to admin sidebar"
 ```
 
 ---
 
 ### Task 11: 前台课程列表页 — 新建 skill-learning/page.tsx
 
 **Files:**
 - Create: `src/app/skill-learning/page.tsx`
 
 - [ ] **Step 1: 创建文件**
 
 完全参照 `src/app/online-tools/page.tsx` 模式，关键差异：
 - `type: "skill_learning"`
 - 标题使用 `t.listing.skillLearningTitle` / `t.listing.skillLearningIntro`
 - 去掉 `paid` 筛选（课程全部付费）
 - 排序按 `createdAt` 或 `downloadCount`
 
 完整代码见下方实现。
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/app/skill-learning/page.tsx
 git commit -m "feat: create skill-learning listing page"
 ```
 
 ---
 
 ### Task 12: 后台课程列表页 — 新建 admin/skill-learning/page.tsx
 
 **Files:**
 - Create: `src/app/admin/skill-learning/page.tsx`
 
 - [ ] **Step 1: 创建文件**
 
 完全参照 `src/app/admin/software/page.tsx` 模式。关键差异：
 - `type="skill_learning"`
 - `buildAdminToolWhere("skill_learning", filters)`
 - 标题 "AI技能学习管理" / "AI Skill Learning Management"
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/app/admin/skill-learning/page.tsx
 git commit -m "feat: create admin skill-learning list page"
 ```
 
 ---
 
 ### Task 13: 后台课程编辑页 — 新建 admin/skill-learning/[id]/page.tsx
 
 **Files:**
 - Create: `src/app/admin/skill-learning/[id]/page.tsx`
 
 - [ ] **Step 1: 创建文件**
 
 参照 `src/app/admin/software/[id]/page.tsx`（如果存在），或参照 `software` 和 `online-tools` 中的编辑逻辑。关键差异：
 - `type="skill_learning"`
 - 标题 "编辑AI技能学习课程" / "Edit AI Skill Learning Course"
 - 新建时标题 "新增AI技能学习课程" / "New AI Skill Learning Course"
 
 - [ ] **Step 2: 先确认 software/[id]/page.tsx 是否存在**
 
 ```bash
 ls src/app/admin/software/[id]/
 ```
 
 如果存在，复制模式；如果不存在，则参照 `online-tools/[id]` 或在 `tool-admin-list.tsx` 中查找当前如何承载编辑页。
 
 - [ ] **Step 3: Typecheck & commit**
 
 ```bash
 npx tsc --noEmit
 git add src/app/admin/skill-learning/[id]/page.tsx
 git commit -m "feat: create admin skill-learning editor page"
 ```
 
 ---
 
 ### Task 14: 工具详情页 — 适配 skill_learning
 
 **Files:**
 - Modify: `src/app/tools/[slug]/page.tsx`
 
 - [ ] **Step 1: 实现**
 
 在详情页中为 `skill_learning` 类型添加分支逻辑：
 
 1. 类型标签：当 `tool.type === "skill_learning"` 时显示 `t.toolDetail.skillLearning`
 2. 购买按钮：当 `tool.type === "skill_learning"` 时，未购买显示 `t.toolDetail.buyCourse.replace("{price}", price)`，已购买显示 `t.toolDetail.startLearning`
 3. 已购买解锁区域：展示教程内容（而非下载链接），标题使用 `t.toolDetail.courseContentTitle`
 
 - [ ] **Step 2: Typecheck**
 
 ```bash
 npx tsc --noEmit
 ```
 
 - [ ] **Step 3: Commit**
 
 ```bash
 git add src/app/tools/[slug]/page.tsx
 git commit -m "feat: adapt tool detail page for skill_learning course type"
 ```
 
 ---
 
 ### Task 15: 全量验证
 
 - [ ] **Step 1: 运行所有 Vitest 测试**
 
 ```bash
 npx vitest run
 ```
 
 Expected: 全部 PASS（已有 70 个测试文件，约 179 个用例）。
 
 - [ ] **Step 2: Typecheck 全量**
 
 ```bash
 npx tsc --noEmit
 ```
 
 Expected: 无类型错误。
 
 - [ ] **Step 3: Lint**
 
 ```bash
 npx eslint .
 ```
 
 Expected: 无新增 lint 错误。
 
 - [ ] **Step 4: 本地构建**
 
 ```bash
 npm run build
 ```
 
 Expected: 构建成功。
 
 - [ ] **Step 5: 本地启动验证**
 
 ```bash
 npm run start
 ```
 
 手动验证：
 1. `GET /skill-learning` → 课程列表页正常渲染
 2. `GET /admin/skill-learning` → 后台课程列表正常渲染
 3. 导航栏出现"AI技能学习"按钮
 4. 首页出现第三个 CTA 按钮
 
 - [ ] **Step 6: Commit**
 
 ```bash
 git commit -m "chore: final verification — all tests and typecheck pass"
 ```
 
 ---
 
 ### Task 16: 同步到 GitHub 和腾讯云
 
 - [ ] **Step 1: 推送到 GitHub**
 
 ```bash
 git push origin main
 ```
 
 - [ ] **Step 2: 腾讯云部署**
 
 ```bash
 powershell -ExecutionPolicy Bypass -File scripts/push-and-deploy.ps1
 ```
 
 或使用 `deploy.sh` 在服务器上执行。
 
 - [ ] **Step 3: 验证线上健康**
 
 ```bash
 curl https://www.enhe-tech.com.cn/api/health
 ```
 
 Expected: `{"status":"ok","database":"ok"}`
 
 - [ ] **Step 4: 线上冒烟测试**
 
 1. `GET /skill-learning` → 200 OK
 2. `GET /admin/skill-learning` → 200 OK（需管理员登录）
