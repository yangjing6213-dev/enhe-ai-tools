# ENHE Homepage Redesign Reference README

Date: 2026-06-11

Reference sources:
- Godly feature page: https://godly.website/website/ohzi-interactive-555
- Original site: https://ohzi.io

## 1. OHZI Design Breakdown

### Interaction Logic

OHZI is not structured like a normal scroll landing page. It behaves more like a full-screen interactive scene:

- The visual layer is a single full-viewport WebGL canvas.
- The HTML sections are state layers placed over the canvas, shown and hidden by app state.
- The first action is `EXPLORE`, which transitions from the home scene into a menu scene.
- The menu is not a dropdown. It is a full-screen navigation state with large section titles.
- Scroll/click drives scene progression rather than simply moving down a document.
- The site uses progress, scroll hints, tap/hold hints, volume controls, and a custom cursor to teach interaction.
- SEO text exists in the DOM separately from the immersive visual layer.

### Motion And Interaction Effects

- Initial loader with progress feedback before entering the site.
- 3D object idle motion and light changes, creating a living center object.
- State transitions change the scene object color, position, lighting, and overlay text.
- Large section titles animate letter-by-letter and preserve strong spatial hierarchy.
- Buttons use glass material, hover opacity, and active scale feedback.
- A custom cursor follows the pointer and supports the glass/immersive feeling.
- Audio is optional and user-triggered, with visible volume controls.
- Scroll and click hints fade in/out depending on the active state.

### Technology Stack Observed

From the page HTML, CSS, and bundled assets:

- Vite-style module bundles.
- Three.js / WebGL chunk loaded as `three-...js`.
- Custom OHZI engine/core bundle loaded as `ohzi-core-...js`.
- Full-screen canvas: `.main-canvas`.
- Local Montserrat font files.
- CSS glass material using translucent fills, inset highlights, and blur.
- GLSL/shader-like code in the core bundle.
- Web Audio / Three.js audio objects.
- Custom resource loaders for textures, GLTF, Draco, Basis, HDR, videos, JSON, audio, and fonts.
- Analytics/tracking through GTM/Mixpanel-like events and Sentry.
- Godly tags list: Dark, Interactive, Montserrat, Transitions, 3D, Audio, WebGL, Amazon Web Services.

### Layout

- Header: fixed, minimal, transparent, only logo/name and menu.
- Hero: centered title and subtitle, no card grid.
- Primary visual: one 3D object as the memory anchor.
- Menu: left-aligned giant navigation list, dim inactive items, small progress label.
- Content sections: absolute overlays, not traditional stacked blocks.
- Footer/control layer: volume, email/contact, scroll/progress controls.

### Visual Style

- Dark cinematic stage, nearly black with blue/green undertones.
- One central 3D object with emissive light.
- Reflective black floor/water surface.
- Strong contrast: white headline against deep background.
- Low information density; every element has breathing room.
- Glass buttons are used sparingly, not as a full page of cards.
- Accent color changes by scene, but each scene is restrained.

## 2. What To Transfer To ENHE

Do not copy OHZI's cube or content. Transfer the design logic:

- ENHE needs one memorable interactive brand object, not more cards.
- Use the ENHE logo as the central visual source, but do not distort the logo.
- Build an "ENHE AI Core" scene: a dark reflective stage, floating glass core, internal ENHE energy mark, soft particles.
- Keep the first viewport focused on one statement and one action.
- Move local apps and cloud tools below the first viewport, revealed after scroll.
- Use interaction to create surprise: entry reveal, pointer light, magnetic CTA, menu state, scroll-driven section reveal.

## 3. Frontend Generation Prompt - Chinese

你是高级前端设计师和动效工程师。请为 ENHE AI Tools 重新设计首页，参考 OHZI Interactive 的设计逻辑，但不要照抄它的立方体、文案或布局。目标是未来极简、高级科技、强品牌记忆点、低亮度暗色沉浸式首页。

项目背景：
- 网站名称：ENHE AI Tools / 恩禾 ENHE AI。
- 产品类型：AI 工具与软件下载站，当前已取消 VIP 会员价格功能，核心转为付费下载某个软件后解锁下载链接。
- 首屏必须保留中文标语：`驾驭 AI 智能，重塑你的人生`。
- 顶部导航透明，无背景、无边框。
- 使用项目现有 ENHE 原始 Logo，不要重新生成或扭曲 Logo。
- 首页第一眼不要看到“精选本地应用”和“精选云端工具”，它们需要在向下滚动后出现。

视觉方向：
- 深黑/深蓝黑背景，低亮度，不要霓虹过曝。
- 首屏是一块沉浸式暗场景，不是传统卡片式首页。
- 中心视觉是“ENHE AI Core”：一个悬浮的半透明玻璃能量核心或方舟，内部承载 ENHE 原始图标光源，底部有黑色镜面/水面反射。
- 背景有少量细颗粒、雾化光束、低亮光晕和空间深度。
- 不使用大面积边框，不做复杂窗口框，不堆叠玻璃卡片。
- 字体建议使用 Montserrat / Satoshi / Geist 一类几何无衬线，标题粗重，正文轻且留白大。

首屏布局：
- 左上角：ENHE 横向 Logo。
- 中间或偏上：主标题 `ENHE AI Tools`。
- 主标题下：`驾驭 AI 智能，重塑你的人生`。
- 副文案：一句以内，表达“用 AI 自动化重复工作，让工具真正进入日常行动”。
- 中心：ENHE AI Core 3D/伪 3D 视觉物体。
- 下方：主按钮 `探索工具`，次按钮 `本地应用` / `云端工具` 可选。
- 右上角：极简菜单按钮或导航，保持透明。

交互动效：
- 页面进入时：背景粒子先出现，ENHE AI Core 从暗处浮现，标题轻微上升显现。
- 鼠标移动：场景有低亮度光源跟随，粒子轻微偏移，核心有微弱视差。
- CTA hover：按钮产生短暂光轨和轻微磁吸，不改变布局。
- 点击 `探索工具`：进入全屏菜单状态，左侧显示“大号导航列表”，右侧核心物体切换颜色/角度。
- 滚动：首屏向下过渡到“本地应用”和“云端工具”内容区，采用淡入和位移，不要普通硬切。
- 支持 `prefers-reduced-motion`，低性能设备自动减少 WebGL/粒子数量。

实现建议：
- 如果项目允许新增依赖，使用 Three.js 创建轻量 3D 核心；否则使用 CSS 3D + Canvas particles 作为第一版。
- 不要做复杂游戏引擎。首屏只需要一个中心对象、灯光、粒子和状态切换。
- DOM 保留真实文本、按钮和导航，Canvas/3D 只做背景视觉。
- 移动端保留同一视觉核心，但简化粒子和反射。
- SEO 与可访问性：H1、描述文本、按钮文本必须是真实 DOM 文本。

避免：
- 不要做普通 AI 紫蓝渐变首页。
- 不要堆卡片，不要满屏边框。
- 不要把 Logo 画错、压扁、拉伸或重新设计。
- 不要在首屏展示会员价格/VIP。
- 不要让视觉亮度过高。
- 不要让中文文字变成图片。

## 4. Frontend Generation Prompt - English

You are a senior frontend designer and motion engineer. Redesign the ENHE AI Tools homepage using the design logic of OHZI Interactive as inspiration, but do not copy its cube, copy, or layout. The goal is a futuristic minimalist, premium dark-tech, highly memorable brand homepage.

Project context:
- Brand: ENHE AI Tools / 恩禾 ENHE AI.
- Product: AI tools and paid software downloads. VIP membership pricing has been removed; users pay for a specific software download to unlock its link.
- The Chinese slogan must remain: `驾驭 AI 智能，重塑你的人生`.
- Header must be fully transparent with no background and no border.
- Use the existing ENHE logo assets exactly. Do not regenerate, distort, or redesign the logo.
- The first viewport must not show "精选本地应用" or "精选云端工具"; those sections appear after scrolling.

Visual direction:
- Deep black / blue-black atmosphere, low brightness, no overexposed neon.
- The first viewport should feel like an immersive dark stage, not a card-based landing page.
- The central memory object is the "ENHE AI Core": a floating translucent glass energy core or ark containing the original ENHE icon as an internal light source, with a black mirror/water reflection below.
- Add sparse particles, subtle volumetric light, muted glow, and spatial depth.
- Avoid heavy borders, framed windows, and repeated glass cards.
- Typography: geometric sans such as Montserrat, Satoshi, or Geist. Heavy headline, light body, generous space.

First viewport layout:
- Top left: original ENHE horizontal logo.
- Center or upper center: title `ENHE AI Tools`.
- Below title: `驾驭 AI 智能，重塑你的人生`.
- Supporting copy: one concise sentence about automating repetitive work with AI.
- Center: ENHE AI Core 3D or pseudo-3D visual object.
- Bottom center: primary CTA `探索工具`; optional secondary CTAs `本地应用` and `云端工具`.
- Top right: minimal menu button or navigation, transparent.

Motion and interaction:
- On entry: particles appear first, the ENHE AI Core emerges from darkness, and the title rises subtly.
- Pointer movement: a low-brightness light follows the cursor, particles drift slightly, and the core has subtle parallax.
- CTA hover: short light streak and magnetic movement without layout shift.
- Click `探索工具`: transition into a full-screen menu state with large navigation on the left and the core object changing color/angle on the right.
- Scroll: transition from hero into local apps and cloud tools using fade and spatial movement, not a hard cut.
- Respect `prefers-reduced-motion`; reduce particles/WebGL on low-performance devices.

Implementation guidance:
- If adding a dependency is acceptable, use Three.js for a lightweight central 3D core. Otherwise, start with CSS 3D plus Canvas particles.
- Do not build a full game engine. The homepage needs only one central object, lighting, particles, and state transitions.
- Keep real text, buttons, and navigation in the DOM. Canvas/3D should be visual background only.
- On mobile, keep the same central motif but simplify particles and reflection.
- SEO and accessibility: H1, description, and button labels must be real DOM text.

Avoid:
- No generic AI purple-blue gradient landing page.
- No card grid in the first viewport.
- No heavy borders or framed glass windows.
- Do not redraw, stretch, or distort the ENHE logo.
- Do not show VIP/pricing in the first viewport.
- Do not make the scene too bright.
- Do not render Chinese text as an image.

## 5. Recommended Implementation Direction After Approval

Recommended first implementation path:

1. Build the static DOM structure and responsive layout in the existing Next.js app.
2. Add a lightweight client-only hero scene component.
3. Start with CSS 3D + Canvas particles to keep performance and deployment simple.
4. If the design direction is approved and the first version feels strong, upgrade only the central object to Three.js.

Why this route:

- The current project does not include Three.js yet.
- A full OHZI-level WebGL engine would be expensive and unnecessary for this product site.
- ENHE needs brand memory and premium interaction, not a complete 3D navigation game.
- This approach lets us ship a polished homepage faster while preserving a path to deeper WebGL later.

