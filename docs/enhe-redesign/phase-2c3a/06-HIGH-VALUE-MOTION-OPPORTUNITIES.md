# 高价值动效机会

## 四重门禁

| rank | Frequency | Purpose | Speed | Function | 结果 |
| ---: | --- | --- | --- | --- | --- |
| 1 | 偶发 | sheet/popover 来源 | 锁定 200ms | 解释层级和方向 | PASS |
| 2 | 中频 | 产品状态连续性 | 锁定 300ms | 让媒体、计数和文案成为同一状态 | PASS |
| 3 | 偶发 | drawer 来源 | 170—200ms | 解释导航层级 | PASS |
| 4 | 偶发 | launcher→dialog 连续性 | 170—200ms | 解释任务入口 | PASS_WITH_GEOMETRY_GUARD |
| 5 | 低频/定时 | review 位置连续性 | 240ms；时序不改 | 改善手势因果与一致性 | PASS_WITH_CONTRACT_GUARD |
| 6 | 低频 | trigger→popover 来源 | 170ms | 解释锚定关系 | PASS_LOW_VALUE |
| 7 | 高频 | 局部按压确认 | 120/170ms | 仅确认指针动作 | PASS_NARROW_SCOPE |

## 机会明细

| rank | location | currentState | purpose | frequency | suggestedTool | properties | durationBudget | easingFamily | reducedMotion | mobileBehavior | expectedValue | implementationCost | risk | prototypeRecommended |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AI 工具分类 layer / mobile sheet | `hidden` 瞬切，200ms token 未使用 | ORIGIN + HIERARCHY | medium | CSS/React retained state first；只有连续拖拽才评估既有 Motion | opacity + translateY 8—12px | 200ms | ease-ui-drawer | instant 或短 opacity-only | 从底边小位移收束；不改变 fixed anchoring、z-index 或 safe area | HIGH | MEDIUM | 退出态、focus 与 outside-click 回归 | YES |
| 2 | 首页五产品舞台 | 文案/计数/keyed 图片瞬切；180ms 只处理加载 | CONTINUITY | medium | CSS + React state；presence 无法简单表达时才评估既有 Motion | opacity + translateX/scale 的最小组合 | 300ms | ease-ui-move | instant 内容切换或 opacity-only | 控件仍在图片下方；不改 44px、布局或详情链接 | HIGH | MEDIUM_HIGH | 快速反转、图片加载、aria-live | YES |
| 3 | 移动导航 drawer / overlay | 条件挂载在最终位置 | ORIGIN + HIERARCHY | medium | CSS + React retained mount | overlay opacity + drawer translateX 8—12px | 170—200ms | ease-ui-drawer | instant/opacity-only | 右侧来源明确；focus、Escape、scroll lock 同帧生效 | MEDIUM_HIGH | MEDIUM | body overflow、焦点返回、客服层叠 | YES |
| 4 | 客服 launcher→dialog 与内部视图 | launcher 同帧 sr-only，dialog/FAQ/form 瞬切 | ORIGIN + CONTINUITY | low | CSS + React retained state | panel opacity + scale .98→1；内部 opacity | 170—200ms | ease-ui-out | instant/static | 绝不动画 fixed right/bottom、44×44、reserve、margin/padding 或 483/484 边界 | MEDIUM | MEDIUM_HIGH | R4 碰撞、focus trap、层叠、提交状态 | NO |
| 5 | 首页评价 carousel | 240ms 裸 ease；手势阈值后才切换 | CONTINUITY + DIRECT_MANIPULATION | timer/low manual | CSS token calibration；只有被选时才评估 pointer/Motion | transform + opacity | 240ms settle；5000/6000 不变 | ease-ui-move | 无 timer；instant 或 opacity-only | 不改变邻卡可见、暂停、按键与 aria 语义 | MEDIUM | HIGH | APG、timer、快速拖拽、合成层 | NO |
| 6 | 桌面 AI Skill / account popover | 原生 details 瞬开合 | ORIGIN | low | CSS only where native semantics can be retained | opacity + translateY 2—8px | 170ms | ease-ui-out | instant | 移动端不复用；移动 drawer 单独处理 | LOW_MEDIUM | LOW_MEDIUM | details 关闭态与键盘语义 | NO |
| 7 | 菜单/产品/评价/分类等关键按钮 press feedback | hover/press 不统一，170ms token 无消费者 | FEEDBACK | high | CSS only | color/border/opacity；细指针可有 2px 内 transform | 120ms press / 170ms hover | ease-ui-out | 无 transform，颜色 instant | touch 用 `:active`，无 sticky hover；不应用于普通文本链接全集 | LOW_MEDIUM | LOW | 过度扩散、触摸 hover、视觉噪声 | NO |

```text
MOTION_OPPORTUNITY_COUNT=7
PROTOTYPE_RECOMMENDATION_COUNT=3
TOP_PROTOTYPE_TARGETS=CATEGORY_LAYER_AND_MOBILE_SHEET|HOME_PRODUCT_STAGE_TRANSITION|MOBILE_NAVIGATION_DRAWER
```

## 为什么其他候选不应动

导航/语言/分页/产品详情路由的功能结果必须即时；rail 已有直接操控和 `behavior:"auto"`；全部产品是服务端 12/页数据阅读，不做 stagger；Hero/H1、SEO 文本、品牌价值和 Footer 法律区没有功能性动效目的；客服固定位置与排除区是碰撞安全合同，不是动效画布。详见拒绝清单。

本文件是用户选择清单，不是 Prototype 或 implementation plan。
