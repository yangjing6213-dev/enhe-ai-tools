# ENHE Homepage Redesign - OHZI Faithful Reference README

Date: 2026-06-11

Reference:
- Godly feature: https://godly.website/website/ohzi-interactive-555
- Source website: https://ohzi.io

## Design Read

This redesign should not merely be "inspired by OHZI". It should follow the OHZI homepage structure closely and only replace the brand text, navigation labels, and business content for ENHE.

Target:
- Keep the OHZI-style full-screen cinematic dark scene.
- Keep one floating glowing 3D cube as the central memory object.
- Keep sparse centered hero copy above the cube.
- Keep the glass primary button below the cube.
- Keep the minimal header with logo on the left and hamburger menu on the right.
- Keep a full-screen menu state with large left-side navigation and a cube on the right.
- Remove the ENHE colored logo from the main hero object. ENHE logo appears only in the header/title bar.
- The header logo must use a transparent asset with no white background, no white outline, no glow, no drop shadow, and no extra border.

## OHZI Structure To Match

### Home State

OHZI:
- Top-left white logo + studio name.
- Top-right hamburger menu.
- Center top headline.
- Center subtitle.
- Floating translucent 3D cube with internal glow.
- Glass `EXPLORE` button below the cube.
- Dark reflective floor/water below the cube.
- Minimal bottom utility text and icon.

ENHE mapping:
- Top-left ENHE header logo, small and unframed.
- Top-right hamburger menu.
- Headline: `驾驭 AI 智能，重塑你的人生`
- Subtitle: `本地应用与云端工具，帮你把重复工作交给自动化`
- Floating translucent cube, but the cube does not contain the ENHE logo.
- Primary button: `探索工具`
- Bottom microcopy: `向下探索工具`
- Bottom-right mail/customer-service icon can remain as a thin outline utility symbol.

### Menu State

OHZI:
- Scene switches after `EXPLORE` or menu click.
- Left side shows `1/4 - GET TO KNOW`.
- Large menu items appear vertically.
- Active item is white and has a vertical marker bar.
- Inactive items are gray and dim.
- The cube moves to the right and changes internal color.

ENHE mapping:
- Scene switches after `探索工具` or hamburger click.
- Left side label: `1/4 - 开始探索`
- Menu items:
  - `本地应用`
  - `云端工具`
  - `下载记录`
  - `用户中心`
- Active item: `本地应用`
- Right cube uses a purple/cyan internal portal glow.

## Interaction Logic

### Required Interactions

1. Entry loading:
   - Dark screen.
   - Subtle progress bar or brief logo preload.
   - Fade into hero scene.

2. Idle hero:
   - Cube slowly floats and rotates by a few degrees.
   - Internal light pulses slowly.
   - Reflection shimmers subtly.
   - Background has faint fog and sparse particles.

3. Pointer movement:
   - Pointer slightly shifts the cube and background light.
   - No strong mouse trail.
   - The motion should feel physical and premium.

4. Primary button hover:
   - Glass button brightens.
   - Button scales or translates slightly.
   - Button must not change layout.

5. Explore/menu click:
   - Hero copy fades out or shifts.
   - Cube slides/rotates to the right.
   - Full-screen menu text appears on the left.

6. Scroll:
   - Scroll hints transition to tool sections below the first viewport.
   - `精选本地应用` and `精选云端工具` must not be visible on the first viewport.

7. Reduced motion:
   - Disable cube rotation, pointer parallax, and shimmer when `prefers-reduced-motion` is active.

## Visual Style

### Color

- Background: near black, blue-black, no bright gradient mesh.
- Main light: muted blue/cyan edge light.
- Internal cube light: warm amber on home state, purple/cyan on menu state.
- Text: white headline, pale gray subtitle, dim gray inactive menu items.
- Button: transparent glass, white hairline, subtle inner highlight.

Suggested tokens:

```css
--bg: #070b0f;
--bg-deep: #030506;
--text: #f7f8fb;
--muted: rgba(247, 248, 251, 0.72);
--dim: rgba(247, 248, 251, 0.34);
--cyan-edge: #4f83ff;
--warm-core: #d59b46;
--purple-core: #aa44d8;
```

### Typography

- Use Montserrat or a close geometric sans for OHZI-like fidelity.
- Headline: bold / extra bold, centered, strong but not oversized.
- Subtitle: light-medium, wide tracking, centered.
- Menu: extra bold uppercase-style Chinese scale, large vertical list.

### Layout

- Body must be full viewport and overflow hidden for the hero state.
- Header is fixed and transparent.
- Hero text is centered near top third.
- Cube is centered below hero text.
- Button sits below cube.
- Menu state uses asymmetric layout: navigation left, cube right.

## Direct Frontend Generation Prompt - Chinese

请按 OHZI Interactive 官网首页的结构高保真设计 ENHE AI Tools 首页，只替换文字和业务内容，不要改成其他风格。

必须匹配的参考结构：
- 全屏深色沉浸式首页。
- 左上角小 Logo + 品牌名，右上角汉堡菜单。
- 首屏中心上方一行主标题，一行副标题。
- 中心是悬浮半透明发光立方体，内部有暖色光源，底部有黑色水面/镜面反射。
- 立方体下面是玻璃质感主按钮。
- 不要在首屏展示本地应用列表、云端工具列表、价格、会员或卡片。
- 点击探索或菜单后进入全屏菜单状态：左侧大号导航列表，右侧立方体变色并偏右显示。

ENHE 替换文案：
- Header 品牌：使用 ENHE 原始透明 Logo，旁边文字可为 `ENHE AI`。
- 主标题：`驾驭 AI 智能，重塑你的人生`
- 副标题：`本地应用与云端工具，帮你把重复工作交给自动化`
- 主按钮：`探索工具`
- 菜单项：`本地应用`、`云端工具`、`下载记录`、`用户中心`
- 底部提示：`向下探索工具`

Logo 规则：
- ENHE 彩色 Logo 只能出现在顶部标题栏。
- 首页中心视觉、立方体、背景、按钮里都不要出现 ENHE Logo。
- Logo 必须使用透明背景素材。
- 不要给 Logo 加白底、白边、描边、发光、投影、圆形容器或玻璃框。

视觉规则：
- 画面整体接近 OHZI：深黑/蓝黑背景、中心发光立方体、少量雾化、低亮度、空间深度。
- 不要做普通 AI 紫蓝渐变。
- 不要做卡片式 SaaS 首页。
- 不要有大面积边框、斜线网格、复杂 UI 面板。
- 不要把中文文字做成图片，所有文字必须是 DOM 文本。

动效规则：
- 首屏加载后，标题淡入，立方体从暗处浮现。
- 立方体缓慢浮动和旋转。
- 内部光源缓慢脉冲。
- 地面反射轻微波动。
- 鼠标移动时产生轻微视差。
- 按钮 hover 有玻璃高光和轻微 scale。
- 点击 `探索工具` 切换到全屏菜单状态。
- 菜单状态左侧大字导航逐行出现，当前项有竖线标记。
- 支持 `prefers-reduced-motion`。

实现建议：
- 第一版可以使用 CSS 3D + Canvas 粒子/反射实现，确保性能稳定。
- 如果引入 Three.js，3D 只用于中心立方体和反射，不要重做整站引擎。
- DOM 负责文字、按钮、导航和可访问性；Canvas/WebGL 只负责背景与立方体视觉。
- 移动端保留同样结构，但立方体缩小，菜单改为全屏纵向列表。

## Direct Frontend Generation Prompt - English

Design the ENHE AI Tools homepage as a faithful structural adaptation of the OHZI Interactive homepage. Only replace the text and business content. Do not reinterpret it into a different tech landing page style.

Reference structure to match:
- Full-screen dark immersive homepage.
- Small logo and brand name in the top-left, hamburger menu in the top-right.
- One centered headline and one centered subtitle near the top.
- A floating translucent glowing cube in the center, with warm internal light and black mirror/water reflection below.
- A glass primary button below the cube.
- Do not show local-app lists, cloud-tool lists, pricing, VIP, or cards in the first viewport.
- On explore/menu click, transition into a full-screen menu state: large navigation list on the left, cube shifted right with a different internal color.

ENHE replacement copy:
- Header brand: use the original transparent ENHE logo asset, with optional text `ENHE AI`.
- Headline: `驾驭 AI 智能，重塑你的人生`
- Subtitle: `本地应用与云端工具，帮你把重复工作交给自动化`
- Primary button: `探索工具`
- Menu items: `本地应用`, `云端工具`, `下载记录`, `用户中心`
- Bottom hint: `向下探索工具`

Logo rules:
- The colorful ENHE logo may only appear in the top title/header bar.
- Do not place the ENHE logo inside the hero cube, central object, background, or buttons.
- Use a transparent logo asset.
- Do not add a white background, white edge, outline, glow, drop shadow, round container, or glass frame to the logo.

Visual rules:
- Stay close to OHZI: deep black/blue-black scene, central glowing cube, sparse fog, low brightness, spatial depth.
- Do not create a generic AI purple-blue gradient page.
- Do not create a card-based SaaS homepage.
- Do not add large borders, diagonal grid lines, or complex UI panels.
- Do not render Chinese text as an image; all text must be real DOM text.

Motion rules:
- On load, fade in the title and reveal the cube from darkness.
- The cube slowly floats and rotates.
- Internal light pulses slowly.
- Reflection shimmers subtly.
- Pointer movement adds slight parallax.
- Button hover adds glass highlight and slight scale.
- Click `探索工具` to switch into the full-screen menu state.
- Menu state reveals large navigation items line by line, with a vertical marker on the active item.
- Respect `prefers-reduced-motion`.

Implementation suggestion:
- First version can use CSS 3D plus Canvas particles/reflection for stable performance.
- If adding Three.js, use it only for the central cube and reflection, not a full site engine.
- DOM owns text, buttons, navigation, accessibility, and SEO. Canvas/WebGL owns only the scene visuals.
- Mobile keeps the same structure with a smaller cube and full-screen vertical menu.

