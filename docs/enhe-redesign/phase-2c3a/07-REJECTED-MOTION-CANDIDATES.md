# 拒绝动效清单

| # | 候选 | 决定 | 原因 |
| ---: | --- | --- | --- |
| 1 | 核心导航点击 | KEEP_INSTANT | 高频任务路径，路由结果不得等待；只允许局部颜色/press 反馈。 |
| 2 | 键盘焦点跳转 | KEEP_INSTANT | focus ring 和焦点目标必须立即可见，不做滚动式或飞行动画。 |
| 3 | 语言切换路由 | KEEP_INSTANT | 语言是文档状态，不做跨页过渡。 |
| 4 | 分页页面跳转 | KEEP_INSTANT | 服务端页面、canonical、prev/next 与可爬取性优先。 |
| 5 | 全部产品数据阅读 | REJECT | 不 stagger、不逐卡 reveal、不因进入视口隐藏数据。 |
| 6 | 客服 fixed right/bottom 位置 | REJECT | R4 固定几何和 safe-area 合同；位置动画会增加碰撞与误触风险。 |
| 7 | 客服 exclusion margin/padding | REJECT | 52/104px 静态排除区不得动画。 |
| 8 | 客服滚动跟随或动态避让 | REJECT | R4 已明确使用组件级静态模型；不引入 listener/observer/DOMRect loop。 |
| 9 | 客服入口 44×44 与 483/484 切换 | REJECT | 尺寸、模式边界与入口可访问名锁定。 |
| 10 | SEO 核心文本 | REJECT | SSR 可读性、索引与无 JS 基线优先。 |
| 11 | Footer 法律链接 | KEEP_INSTANT | 路由即时；最多允许 170ms 颜色微反馈。 |
| 12 | 正式 H1 分词、逐字或 staged reveal | REJECT | 核心语义不应等待，也与克制品牌性格冲突。 |
| 13 | 管理员入口判断 | REJECT | 权限判断是服务端安全边界，不是动画状态。 |
| 14 | 服务端分页数据替换 | REJECT | 不引入 client presence、9+3 隐藏分支或假加载。 |
| 15 | 产品详情链接路由 | KEEP_INSTANT | 链接结果即时；可给按压反馈，但不做页面过渡。 |
| 16 | reduced-motion 中的 translate/scale/loop | REJECT | 保留功能状态和手动控制，去除非必要运动。 |
| 17 | Hero 背景、H1 或品牌价值持续漂浮 | REJECT | 无功能目的，抢夺注意力。 |
| 18 | 全局鼠标跟随 / cursor glow | REJECT | Phase 2C.1 已从公共 layouts 禁用，不得复活。 |
| 19 | 全局动态背景、持续 glow、粒子、glitch、breathing | REJECT | 违反 Phase 1A 视觉合同与 ENHE 动效性格。 |
| 20 | rail autoplay 或键盘 smooth scroll | REJECT | 合同锁定 user-driven、无自动 movement、`behavior:"auto"`。 |
| 21 | 产品卡 hover lift 全覆盖 | REJECT | 高频、大面积、弱目的；移动端 hover 语义不可靠。 |
| 22 | 全部产品/rail 卡片 stagger | REJECT | 增加数据阅读等待并可能影响 hydration/SEO 观感。 |
| 23 | 评价 5000/6000 时序改动或持续漂移 | REJECT | interval/resume 已锁定；只审计可访问性和视觉 settle。 |

```text
REJECTED_MOTION_CANDIDATE_COUNT=23
SUPPORT_BUTTON_POSITION_ANIMATED=NO
SUPPORT_EXCLUSION_GEOMETRY_ANIMATED=NO
SUPPORT_SCROLL_FOLLOW=NO
SUPPORT_ICON_MODE_SIZE=44x44_UNCHANGED
SUPPORT_MODE_BOUNDARY=483|484_UNCHANGED
```
