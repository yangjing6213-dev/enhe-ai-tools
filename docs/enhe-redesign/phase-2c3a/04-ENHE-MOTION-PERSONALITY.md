# ENHE 动效性格

## 定义

ENHE 的动效性格是：**克制、直接、沉稳、清晰、快速、有重量感**。它服务普通 AI 用户完成任务，不表演技术能力。暖白、近黑、鼠尾草绿和深墨绿形成的是编辑式、可信赖的产品气质；动效只负责解释状态、来源、层级和操作反馈。

## 品牌关键词与反面人格

| 接受 | 拒绝 |
| --- | --- |
| 克制、稳、短、明确、可打断、以任务为中心 | 弹跳、漂浮、炫技、电影式、霓虹、液态、游戏化、持续吸睛 |
| 小位移、快速收束、清楚的空间来源 | 全屏长距离飞入、过冲、反复呼吸、无目的 stagger |
| 功能优先、营销区有限表达 | 把路由、数据阅读、法律文本或键盘焦点做成表演 |

不得重新引入全局鼠标跟随、全局动态背景、持续光效、无限漂浮、大面积粒子、Glitch、持续呼吸、滚动劫持或大面积 3D 翻转。

## 频率分级

| 频率 | 典型表面 | 预算 |
| --- | --- | --- |
| 高频 | 导航、语言切换、分页、键盘焦点、连续数据阅读 | 路由与焦点保持 instant；只允许 120/170ms 的局部按压或颜色反馈，不得延迟结果 |
| 中频 | 分类层、移动菜单、产品切换、评价手动控制 | 170—300ms；必须解释来源或状态连续性 |
| 低频 | 客服面板、账户菜单、一次性营销强调 | 170—300ms；仍不得使用环境式循环运动 |
| 定时 | 评价自动轮播 | 5000ms interval、6000ms manual resume 为锁定合同；不得擅改 |

## 目的枚举

只有下列目的能通过：

1. `FEEDBACK`：确认按压、提交或状态改变。
2. `CONTINUITY`：让产品/评价状态变化可追踪。
3. `ORIGIN`：说明 drawer、sheet、popover、dialog 从何处出现。
4. `HIERARCHY`：让 overlay 与前景层关系清楚。
5. `DIRECT_MANIPULATION`：手势中的视觉位置跟随输入，并可在释放时稳定收束。

纯装饰、填充等待、制造“高级感”、把核心文字逐字展示，不是合格目的。

## 时间、缓动与位移

- 按压：120ms。
- hover/focus：沿用批准的 170ms，但焦点本身立即出现。
- panel/drawer/sheet：沿用批准的 200ms。
- 标准状态移动：240ms。
- 产品/有限营销过渡：沿用批准的 300ms 上限。
- UI 进入使用快速 ease-out；同屏位置变化使用对称 move 曲线；drawer/sheet 使用快速收束、无过冲曲线。
- 位移通常限制在 2/8/12px。drawer/sheet 可以通过遮罩和小位移说明方向，不需要从屏幕外完整飞行。

## Spring 边界

Spring 仅可用于用户直接拖拽后的短距离 settle，且必须高阻尼、无可见弹跳、可打断。普通 hover、路由、菜单、分页、文本、客服固定入口均不得使用 Spring。不得为了 Spring 新增依赖；仓库虽已有 `motion`，仍应先证明 CSS 无法满足。

## 功能区与营销区

- 功能区：导航、分类、分页、卡片、客服任务流以即时响应为主；不做 staged reveal 或滚动触发。
- 营销区：首页产品舞台可使用合同内 300ms 连续性；Hero/H1、品牌价值文案保持静态，不做分词或漂浮。
- 评价区：已有自动时序属于功能合同，不是营销循环许可。

## 移动端

- 触摸没有 hover 假设；hover 位移必须至少受 `(hover: hover)` 与适当指针能力约束。
- sheet/drawer 只动 opacity/transform，不动布局宽度、safe-area、客服排除区或页面栅格。
- rail 保持直接触摸、trackpad 和 `behavior: "auto"` 键盘滚动；不 smooth、不 autoplay。
- 动效不能改变 44px 目标、根 scrollWidth、scroll-snap 或 483/484 客服模式边界。

## Reduced motion

- 关闭自动评价 timer；保留全部手动控制。
- 去除 scale、长距离 translate、循环旋转等非必要运动；功能等待态应提供静态或低运动替代。
- 必要状态变化优先 instant；如 opacity 有助理解，可保留短、无位移的淡变，但不得把内容隐藏或延迟。
- 不得把 reduced-motion 当成重新启用其他自动行为的分支。

## 键盘原则

焦点环、焦点跳转、Enter/Space/Arrow/Escape 的功能结果必须即时，不得为了动画延迟 focus、aria 状态、路由或事件处理。产品/评价已有合同视觉 settling 时，可以在输入立即生效后独立完成，但不能移动焦点或阻塞连续按键。

## 性能原则

- 首选 opacity/transform；不动画 width、height、margin、padding、top、left、filter、blur 或大面积 shadow。
- `will-change` 只在临近或进行动效时短暂存在，不常驻全部卡片。
- timer、listener、timeline 必须清理；当前评价 timer/listener 清理应保留。
- 不因动效增加 observer、scroll listener、持续 DOMRect 循环或全局 animation loop。
- CSS 能完成时不引入运行时库；需要 presence 或直接操控时才评估仓库已有 `motion`。
