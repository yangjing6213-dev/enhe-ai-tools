# 动效优先级路线图

本文件是决策排序，不是 implementation plan。任何代码、Prototype 或视觉变体都要等用户选择；本轮没有生成执行步骤、修改清单或实现分支。

## 排序

### P0：现有不良动效与可访问性

1. 正式 redesign production 移除遗留 450ms 全页入场，同时保留 software fixed sheet 不落入 transformed containing block 的测试意图。
2. 评价轮播对齐 W3C APG：焦点进入后不自行恢复；自动旋转与 `aria-live` 状态同步。5000/6000 合同不改。
3. 补齐 product/support 的 reduced-motion 边界；功能 loading 保留静态替代。
4. 收敛 review 240ms/easing、常驻 `will-change` 和 support filter transition。

这些是审计优先项，不代表已授权实施，也不需要先做视觉 Prototype 才能确认问题存在。

### P1：高价值 Prototype

最多推荐三个，按“用户价值 ÷ 实现与回归成本”排序：

1. Category layer 与 mobile sheet。
2. 首页完整产品状态过渡。
3. Mobile navigation drawer。

### P2：轻量微交互

- 客服 dialog 与内部状态连续性，前提是 R4 几何、focus trap 和层叠零变化。
- Review gesture/settle 校准，前提是 5000/6000、APG 与 reduced-motion 先锁定。
- 桌面 dropdown/account 的 170ms 锚定反馈。
- 少数高价值按钮的 120ms press / 170ms color feedback；不扩散到全部文本链接或卡片。

### REJECTED

导航/语言/分页路由动画、H1/SEO staged reveal、all-products stagger、rail autoplay/smooth keyboard scroll、客服位置/排除区运动、旧全局视觉和 reduced-motion 非必要运动均不实施。

## 三个推荐 Prototype 的验收轴

| target | whyNow | prototypeAxis | requiredVariants | affectedRoutes | protectedContracts | implementationRisk | testPlan | visualReviewPlan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Category layer / mobile sheet | 200ms 已批准且当前完全未落地；价值/成本比最高 | instant baseline vs 200ms opacity+8/12px；open/close/reverse；可选连续下拖 | desktop pointer、desktop keyboard、mobile touch、mobile keyboard、reduced-motion、zh/en | `/software`, `/en/software` | 7 categories、server navigation、Enter/Space/Arrow/Escape、outside click、48px swipe、z 20/21、客服层叠、SSR/SEO | MEDIUM | source contract、键盘/焦点、outside click、快速反转、483/484/768、reduced-motion、无 root overflow | 320/390/483/484/768/1440；正常/打开/关闭中；双语；客服同屏 |
| Home product stage | 明确锁定 300ms，但当前只有 loading 180ms；核心首页价值高 | instant text swap vs 300ms coherent state；方向、快速反转、image loading/error | previous/next pointer、Arrow keys、slow/fast image、error fallback、reduced-motion、zh/en | `/`, `/en` | five products/order、01/05、no autoplay、16:9、44px controls、detail href、客服 exclusion、aria status | MEDIUM_HIGH | wrapped index、连续输入、loading/error、focus、reduced-motion、无 layout shift/overflow、既有 product tests | desktop/mobile、首尾循环、加载/完成/错误、正常/低运动、客服同屏 |
| Mobile navigation drawer | 偶发空间层瞬时挂载；focus/scroll lifecycle 已具备可靠基线 | instant vs 170/200ms overlay+12px drawer；open/close/reverse | touch、Enter/Space、Escape、outside click、reduced-motion、support dialog already open、zh/en | `/`, `/en`, `/software`, `/en/software` below 768px | focus trap/return、body overflow restore、44px trigger、z 39/40、客服 z10、category z20/21、nav copy/routes | MEDIUM | focus first/last、Escape、rapid toggle、body scroll restore、support/category stacking、reduced-motion | 320/390/483/484/767；菜单开闭关键帧；客服与分类层竞争；双语 |

## 选择门

```text
PROTOTYPE_RECOMMENDATION_COUNT=3
USER_SELECTION_REQUIRED=YES
ANIMATION_PLAN_CREATED=NO
PHASE_2C_3_NEXT_ACTION=USER_SELECTS_UP_TO_3_MOTION_TARGETS_FOR_ISOLATED_PROTOTYPES
```

用户可以选 0—3 个，不选即不进入 Prototype。后续若选择，也必须在隔离 worktree 中做可丢弃原型，不能直接接入生产。
