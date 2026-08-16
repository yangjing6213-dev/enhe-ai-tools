# ENHE Phase 2C.3A 执行清单

## 结论

`PHASE_2C_3A_STATUS=PASS`

本阶段只完成 Skill 安装与来源核验、正式公共 UI 的只读动效盘点、深度审计、机会筛选、动效性格与 Token 提案。没有创建 Prototype、实现动效、修改应用源码或运行应用测试/构建。

## 基线

- 来源 worktree：`C:\Users\HU\Documents\New project 2\.worktrees\enhe-support-exclusion-v1`
- 来源分支：`codex/enhe-support-exclusion-v1`
- 来源 HEAD：`06f488462efe84933a92dad867a49b7c188c08e5`
- R4 代码提交：`4662af4a1280b19a38f04a2f01bab1bcca815726`
- 审计 worktree：`C:\Users\HU\Documents\New project 2\.worktrees\enhe-motion-audit-v1`
- 审计分支：`codex/enhe-motion-audit-v1`
- 起始 HEAD：`06f488462efe84933a92dad867a49b7c188c08e5`

## 允许与禁止

本轮允许只读 Git、源码、测试、既有截图和 R4 证据；允许全局安装指定 Codex Skills；只允许新增本目录文档。

本轮没有运行 `npm ci`、`npm install`、`npm test`、`npm run build`、Prisma migration/seed、生产数据库、部署或 push。没有修改 `src/**`、`public/**`、package/lockfile、Prisma、Next 配置、middleware、sitemap、robots 或测试源码。

## 读取与审计范围

- 正式路由：`/`、`/en`、`/software`、`/en/software`。
- 公共 Header/Footer、桌面导航、移动菜单、语言切换、账户菜单、客服入口与面板。
- 首页 Hero、五产品舞台、评价轮播、品牌价值区。
- AI 工具分类选择器、移动分类 Sheet、新品/精选 rail、全部产品与服务端分页。
- 明确排除 admin、用户中心、支付、订单、产品详情、下载、OAuth、后台和未完成页面。

## 当前技术事实

- 正式审计范围使用 React 状态、CSS transition/keyframes、原生 timer/listener、原生 `scrollBy` 和 Tailwind utility transition。
- `motion` 与 `gsap` 已存在于仓库依赖，但正式审计范围没有导入或调用二者。
- 已批准的生产 Token 只有 `--enhe-motion-fast: 170ms` 与 `--enhe-motion-panel: 200ms`；Phase 1A 合同另锁定 product `300ms`、review interval `5000ms`、manual resume `6000ms`。

## 交付文件

1. `00-PHASE-2C3A-MANIFEST.md`
2. `01-R4-BASELINE-RESOLUTION.md`
3. `02-SKILL-INSTALL-AND-PROVENANCE.md`
4. `03-MOTION-SURFACE-INVENTORY.csv`
5. `04-ENHE-MOTION-PERSONALITY.md`
6. `05-IMPROVE-ANIMATIONS-AUDIT.md`
7. `06-HIGH-VALUE-MOTION-OPPORTUNITIES.md`
8. `07-REJECTED-MOTION-CANDIDATES.md`
9. `08-MOTION-TOKEN-PROPOSAL.md`
10. `09-PRIORITIZED-MOTION-ROADMAP.md`
11. `10-SOURCE-SCOPE.md`
12. `11-FINAL-RECEIPT.md`

## 阶段门禁

```text
EMIL_SKILLS_STATUS=INSTALLED_OR_VERIFIED
EMIL_SKILLS_REQUIRED_COUNT=8
EMIL_SKILLS_VERIFIED_COUNT=8
MOTION_SOURCE_AUDIT=PASS
MOTION_OPPORTUNITY_REVIEW=PASS
MOTION_PERSONALITY_DEFINED=PASS
MOTION_TOKEN_PROPOSAL=PASS
APPLICATION_SOURCE_CHANGED=NO
MOTION_IMPLEMENTATION_STARTED=NO
PROTOTYPE_CREATED=NO
ANIMATION_PLAN_CREATED=NO
USER_SELECTION_REQUIRED=YES
```

下一步只允许用户从推荐清单中选择最多三个目标：

`PHASE_2C_3_NEXT_ACTION=USER_SELECTS_UP_TO_3_MOTION_TARGETS_FOR_ISOLATED_PROTOTYPES`
