# improve-animations deep 只读审计

## 范围与方法

审计按 Purpose/Frequency、Easing/Duration、Physicality/Origin、Interruptibility、Performance、Accessibility、Cohesion/Tokens、Missed Opportunities 八类执行。并行只读发现由主线程逐条重读 file:line、合同、测试和 R4 证据后合并；没有把子审计建议直接当结论。

正式范围使用 CSS keyframes/transition、React state、timer/listener、原生 scroll 与 Tailwind utility。`motion` 和 `gsap` 虽在 package 中，范围内零导入、零调用。未发现 `transition: all`、WAAPI、`AnimatePresence`、`useReducedMotion`、`layoutId`、ScrollTrigger、ResizeObserver 或 IntersectionObserver。评价 timer/listener 有完整 cleanup。

现有生产 motion token 只有 170ms/200ms；产品 300ms、评价 5000ms/6000ms 仍主要停留在批准合同或 JS 常量，未形成完整共享层。

## Findings

| severity | category | file:line | current behavior | evidence | why it matters | high-level fix | frequency | contract conflict | confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HIGH | Purpose / Frequency | `src/components/public-site-chrome.tsx:70`; `src/app/globals.css:1956-1958,5428-5436`; `src/styles/redesign/software.css:7-8,444-451` | 四条正式路由每次文档导航重播 450ms `ease` 入场；首页还下移 10px，software 仅改为 opacity-only | Header、语言、分类和分页均使用原生链接；`.fade-in` 包住全部 children | 高频任务路由被旧壳动画统一拖慢；450ms 不在批准的 170/200/300ms UI 预算内 | 后续仅对正式 redesign production 抑制遗留页面入场；保留 software 不创建 transformed containing block 的约束 | HIGH | YES | HIGH |
| HIGH | Accessibility | `src/components/redesign/home/EnheRedesignExperienceReviews.tsx:115-166,258-260` | focus 进入时暂停，但 focus 离开后自动恢复；自动轮播期间 track 始终 `aria-live="polite"` | W3C APG carousel 指导自动轮播在焦点进入后不应自行恢复，并建议自动旋转时 live region 为 `off` | 读屏上下文可能在用户未明确请求时变化；这比纯视觉 easing 更重要 | 保持 5000/6000 合同，但把自动恢复权和 live-region 状态与显式用户控制同步；不在本轮实现 | TIMER | YES_ACCESSIBILITY_GUIDANCE | HIGH |
| MEDIUM | Cohesion / Contract | `src/components/redesign/home/EnheRedesignProductShowcase.tsx:69-76,102-155`; `src/styles/redesign/home.css:282-295` | index、计数、文案、keyed 图片瞬切；180ms `ease` 只处理新图片 loading→ready | 批准合同明确 product transition 300ms | 核心产品舞台没有实现被批准的完整状态连续性，且加载反馈被误当产品过渡 | 以后以完整产品状态为单位验证 300ms opacity/transform 连续性，不延迟键盘结果 | MEDIUM | YES | HIGH |
| MEDIUM | Cohesion / Contract | `src/styles/redesign/tokens.css:33-34`; `src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx:220-254`; `src/styles/redesign/software.css:78-93,334-340` | desktop layer 与 mobile sheet 由 `hidden` 瞬时切换；200ms token 无消费者 | 正常 CSS 没有 transition/origin/退出态，reduced-motion 规则却关闭不存在的 transition | 明确获批的 category-layer 节奏没有落地 | 后续验证 200ms panel 原型；键盘 focus 与 aria 状态即时，退出可反转 | MEDIUM | YES | HIGH |
| MEDIUM | Accessibility | `src/styles/redesign/home.css:282-295,606-609`; `src/components/customer-support-widget.tsx:299,302,379`; `src/styles/redesign/shell.css:720-726` | product scale、support hover lift/filter 和 spinner 不在 redesign home/support 的明确 reduced-motion 覆盖内 | shell reduced rule只覆盖 preview/header/footer；home 只缩短 review transition | reduced-motion 覆盖按组件分裂，非必要位移或循环仍可能出现 | 未来按组件提供 instant/static 或短 opacity 替代；功能 loading 状态保留但不必旋转 | MIXED | PARTIAL | HIGH |
| MEDIUM | Physicality / Origin | `src/components/redesign/enhe-redesign-mobile-menu.tsx:100-104`; `src/styles/redesign/shell.css:470-489`; `src/components/customer-support-widget.tsx:187-195,367-380` | mobile drawer 和 support dialog 条件挂载在最终位置，关闭没有退出态 | CSS 无 transform-origin 或状态连续性；焦点逻辑本身完整 | 偶发空间表面缺少来源关系，界面显得瞬移 | 仅在用户选择后分别原型化；focus/scroll lock/客服几何保持即时且不动 | LOW_TO_MEDIUM | NO_EXPLICIT_CONTRACT | HIGH |
| MEDIUM | Cohesion / Easing | `src/styles/redesign/home.css:434-449`; `src/components/redesign/home/EnheRedesignExperienceReviews.tsx:60-63,124-147` | review 卡片每次以 240ms 裸 `ease` 移动，timer 是 JS 常量，`will-change` 常驻 | 5000/6000 数值正确，但 duration/easing/token 分散 | 视觉语言不统一，也让 reduced/暂停状态难以精确控制 | 保留时序合同，后续只校准共享 standard/move token 与层生命周期 | TIMER | PARTIAL | HIGH |
| MEDIUM | Accessibility adjacent | `src/components/customer-support-widget.tsx:208,221,330` | panel 内关闭按钮为 40×40，部分返回按钮/chip 未见 44px 最小目标 | source utility 明确为 `size-10` 或缺少 min-height | 这是审计中发现的非动效可访问性风险；不应借动效掩盖 | 单独进入未来 UI 可访问性修复，不作为 Motion Prototype | LOW | YES_44PX_PRINCIPLE | MEDIUM |
| MEDIUM | Physicality / Direct manipulation | `src/components/redesign/home/EnheRedesignExperienceReviews.tsx:168-188`; `src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx:242-254` | review 仅 35px 阈值，sheet 仅 48px 阈值；都在 release 后瞬时切换，无连续位移/速度 | pointer/touch 代码只记录 start/end | 慢长拖与快短 flick 的响应不一致，手势缺少 1:1 因果 | 仅在被选原型中比较“阈值保持”与“连续跟随”；不得扩展到滚动劫持 | LOW | NO_EXPLICIT_CONTRACT | MEDIUM |
| LOW | Performance | `src/styles/redesign/home.css:449`; `src/components/redesign/home/EnheRedesignExperienceReviews.tsx:260` | 五张 review 卡永久 `will-change: transform, opacity` | paused、hidden、reduced-motion 时仍保留声明 | 可能长期占用合成层资源 | 后续只在临近/进行移动时启用，或验证无需该 hint | ALWAYS | NO | HIGH |
| LOW | Performance / Contract | `src/components/customer-support-widget.tsx:299` | submit 按钮 transition 包含 `filter`/brightness | Phase 1A motion 原则是 opacity/transform only | 小面积但形成独立性能语言 | 未来改为颜色/opacity 状态；不在本轮修改 | RARE | YES | HIGH |
| LOW | Feedback / Tokens | `src/styles/redesign/tokens.css:33`; `src/styles/redesign/shell.css:321-340`; `src/styles/redesign/home.css:245-269`; `src/styles/redesign/software.css:66-76` | 170ms token 无范围内消费者，关键控件也没有统一 press 状态 | 源码检索无 `var(--enhe-motion-fast)` 消费与 `:active`/`active:` 命中 | 小而频繁的反馈不一致；但大范围补动画会更糟 | 只允许高价值按钮的 120ms press/170ms color feedback，指针/hover 条件明确 | HIGH | PARTIAL | HIGH |

```text
HIGH_SEVERITY_FINDING_COUNT=2
MEDIUM_SEVERITY_FINDING_COUNT=7
LOW_SEVERITY_FINDING_COUNT=3
```

W3C 依据：`https://www.w3.org/WAI/ARIA/apg/patterns/carousel/`。这是 Authoring Practices 指导，不在本文中冒充新的 WCAG 合规裁决。

## 主线程否决的弱结论

- `prefers-reduced-motion` 下 review transition 缩到 1ms 本身不是缺陷；停止自动 timer、保留手动控制是更高优先级合同。
- 客服 `animate-spin` 是有结束条件的功能状态，不应仅因“无限”关键字删除；问题是缺少低运动替代。
- `requestAnimationFrame` 两处只安排焦点返回，不是视觉动画。
- globals 中的旧 glitch/float/动态视觉仍存在于其他历史表面，但正式公共 layouts 已禁用，不能误报为本审计范围的活动动效。
- 240ms review transition 不因使用裸 `ease` 就自动升为 HIGH；正确时序与 cleanup 已保留。

审计到此停止，没有进入 plan generation。
