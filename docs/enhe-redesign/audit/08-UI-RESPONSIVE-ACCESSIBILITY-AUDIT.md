# UI、响应式与可访问性审计

## 当前证据

- `src/app/globals.css:3-54` 注册 Montserrat、SmileySans 等字体；`:60-104` 采用深色背景、橙色主色、半透明卡片。
- `src/app/globals.css:119-120,316-336,1272-1331` 使用 radial/linear/conic gradient、glass、backdrop-filter、glow 和标题 glitch/breathe 动效。
- `src/app/root-layout-shared.tsx:63-80` 全局挂载 InteractiveBackground、CursorGlow、BorderGlowController、TargetCursor、AnalyticsTracker，扩大客户端/脚本开销。
- `src/components/site-header.tsx:19-107` 有桌面导航、下拉、搜索、账户、管理员入口、语言切换和 Next Image；但包含 Build Your Own X 链接。
- `src/components/product-video-player.tsx:82-97` 使用原生 video、muted、controls、preload=metadata、IntersectionObserver；方向可复用。
- `src/app/globals.css:2437-2514` 有 prefers-reduced-motion 降级和 focus 基础规则；`288-290` 有 focus-visible outline。

## 与总方案差距

- 视觉基线仍是“深色+橙色+玻璃/光效”，与总方案 300-328 的暖白、近黑、鼠尾草绿以及禁止大面积旧视觉相冲突。
- 公共壳默认在所有页面加载动态背景/光标/第三方脚本；移动端、低端设备、prefers-reduced-motion 和首次内容绘制的实测数据未知。
- 现有 video 仅详情播放器证据；首页五款视频的顺序、手动切换、无预加载、字幕、手势和焦点行为尚未逐项确认。
- 组件有复用基础，但 CSS 体量约 59 KB、旧 token/兼容覆盖多，建议建立新 token 层并按页面迁移，不要一次性重写。

## Phase 1 建议

先定义颜色/排版/间距/焦点/动效 token，复用现有语义组件与原生 video；为导航、表单、轮播、对话框、空状态补 keyboard/aria/reduced-motion 验收。删除旧视觉只能在页面替换并有截图/回滚点后执行。

