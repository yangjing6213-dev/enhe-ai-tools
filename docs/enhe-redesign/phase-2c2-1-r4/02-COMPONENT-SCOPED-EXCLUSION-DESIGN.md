# 组件级静态客服排除区设计

## Token

```css
--support-trigger-icon-size: 44px;
--support-trigger-gap: 8px;
--support-exclusion-compact: 52px;
--support-exclusion-expanded: 104px;
--support-text-mode-min-width: 484px;
```

`--support-exclusion-current` 在 483px 及以下取 52px，在 484px 及以上取 104px；`--support-exclusion-applied` 再叠加右侧 safe-area inset。最大文字入口宽度为 95.546875px，加入 8px 后为 103.546875px，再按合同向上取整为 104px。

测试期强制文字入口与 104px reserve，在 481—1440px 每 1px、双语、连续两轮扫描后得到 `TEXT_SUPPORT_SAFE_MIN_WIDTH=481`。生产断点按 4px 规则取 484px，因此 `ICON_SUPPORT_MODE_MAX_WIDTH=483`。该断点不复用 768px 栅格断点。

## 作用域

- 软件卡片链接通过 `data-support-exclusion={sectionId}` 区分新品、精选和全部产品。
- 移动 rail 的每张操作区使用当前 reserve，不改变卡宽、图片或 rail 宽。
- 全部产品只在视觉最右列应用 reserve：单列全部、768px 第 2 张、三列第 3 张、四列第 4 张。
- 分页、Footer 与首页控制使用已有精确组件 class；只有首页品牌 CTA 新增 `data-support-exclusion="home-brand-cta"`。
- CTA 最小高度为 44px；文字、href、focus-visible 和语义不变。

## 为什么是静态组件模型

R3 已证明全部产品 CTA 与入口的相对右边界恒定，320—480px 间距始终为 -19px；继续寻找自然断点没有解。静态组件排除区直接表达“这个操作可能进入客服区域”，可由 CSS、栅格列与组件语义确定。

未使用 scroll listener、ResizeObserver、MutationObserver、持续 DOMRect 循环或客户端列测量。它们会引入滚动时序、hydration 和性能风险，却不能提高这个固定几何问题的正确性。也未使用全局 `main` padding 或右侧空白栏，因为那会无差别压缩内容、改变卡片/grid/rail 宽度并造成桌面退化。

## 交互与层叠

入口仍固定在右下 safe area。面板协议和业务 API 未改变；只补齐对话框焦点约束、Escape、焦点返回与内部视图切换后的焦点恢复。移动菜单与分类层保持高于移动客服入口，关闭后各自返回触发元素。

本轮没有新增动画、keyframes、GSAP、Motion 或 WAAPI；仅保留既有按钮 transition。

