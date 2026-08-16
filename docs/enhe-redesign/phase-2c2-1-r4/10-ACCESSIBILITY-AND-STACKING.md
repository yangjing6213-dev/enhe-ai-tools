# 可访问性与层叠

## 客服入口与面板

- 图标模式为 44×44，图标可见、可见“客服/Chat”隐藏，双语 `aria-label` 存在。
- 原生 button 保留 Enter/Space 行为；`aria-expanded` 与打开状态同步，`aria-controls` 指向实际 panel。
- panel 使用 `role="dialog"` 与标题关联；Tab/Shift+Tab 被约束在可见可聚焦元素内。
- Escape 关闭 panel，焦点返回入口；入口打开时退出 Tab 顺序，关闭后恢复。
- FAQ、问题列表、消息表单和错误返回切换后，焦点回到当前 panel 的首个可用控件。
- 200% 缩放下入口仍可见，图标/文字模式与 reserve 按实际 layout viewport 重新生效。

`MOBILE_SUPPORT_ACCESSIBILITY=PASS`

`TEXT_SUPPORT_ACCESSIBILITY=PASS`

`SUPPORT_PANEL_OPEN_CLOSE=PASS`

`ESCAPE_CLOSE=PASS`

`FOCUS_RETURN=PASS`

`ARIA_EXPANDED_SYNC=PASS`

`ARIA_CONTROLS_VALID=PASS`

## 菜单与分类层

移动客服入口在生产移动壳为 z-index 10；分类 overlay/panel 为 20/21；移动菜单 overlay/sheet 为 39/40。菜单通过 pointer-down 记录真正的前置焦点，关闭后返回触发按钮；打开期间客服不会拦截 sheet。分类打开时父层同步提升，避免局部 stacking context 把 panel 压在客服下方。

`MOBILE_MENU_STACKING=PASS`

## 动效边界

`prefers-reduced-motion` 浏览器检查通过。本轮没有新增 keyframes、弹跳、脉冲、漂浮、自动隐藏、滚动跟随、GSAP、Motion 或 WAAPI；只保留已有 transition。

`NEW_MOTION_IMPLEMENTED=NO`

