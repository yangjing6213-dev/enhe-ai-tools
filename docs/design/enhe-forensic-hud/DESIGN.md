---
version: beta
name: ENHE-liquid-glass-os-design
description: A cool, premium Liquid Glass inspired visual system for ENHE AI Tools. This direction replaces the earlier warm forensic HUD palette with a colder Apple-like spatial glass language: graphite blue canvas, frosted translucent surfaces, soft cyan and periwinkle highlights, restrained aurora light, readable typography, and image-led tool cards.
status: preview-for-user-confirmation
---

# ENHE AI Tools - Cool Liquid Glass Design Direction

## Research Basis

This document is based on public design signals and rumor analysis available in May 2026.

- Apple has publicly introduced **Liquid Glass** as a translucent material that reflects, refracts, and adapts to surrounding content across Apple platforms.
- Current public discussion around future iOS versions points less to a completely new color language and more to refinement of Liquid Glass: better readability, more restrained transparency, and stronger user control over visual intensity.
- There is no official public **iOS 27 color specification**. Treat iOS 27 images online as rumor, concept, or extrapolation unless Apple publishes formal guidance.

The ENHE design should therefore not copy a single leaked screenshot. It should adopt the more durable direction: **cool, legible, spatial glass with subtle motion**.

Reference URLs:

- Apple Newsroom, Liquid Glass design announcement: https://www.apple.com/sg/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- TechRadar iOS 27 Liquid Glass readability report: https://www.techradar.com/phones/ios/liquid-glass-isnt-going-anywhere-in-ios-27-but-theres-good-news-for-its-readability

## Design Goal

Move away from the warm amber forensic HUD mood. The new ENHE interface should feel:

- Apple-like but not cloned.
- Cold, clean, premium, and young.
- Futuristic without heavy sci-fi decoration.
- Glassy and spatial, but still readable.
- Product-ready for software tools, payments, admin workflows, and file management.

## Visual Keywords

- Liquid glass
- Frosted depth
- Cool graphite
- Ice blue glow
- Spatial layers
- Quiet aurora
- Adaptive translucency
- Premium utility
- Soft refraction
- Image-led cards

## Core Palette

The dominant palette must be cool. Warm colors are only for warning or risk states.

```yaml
colors:
  canvas: "#070A12"
  canvas_deep: "#030611"
  canvas_soft: "#0D1424"
  canvas_aura_blue: "#102A4F"
  canvas_aura_cyan: "#0B4F5E"

  glass_surface: "rgba(238, 246, 255, 0.10)"
  glass_surface_strong: "rgba(238, 246, 255, 0.16)"
  glass_surface_soft: "rgba(238, 246, 255, 0.06)"
  glass_refraction: "rgba(144, 190, 255, 0.18)"
  glass_highlight: "rgba(255, 255, 255, 0.42)"

  border: "rgba(210, 230, 255, 0.18)"
  border_strong: "rgba(210, 230, 255, 0.32)"
  border_focus: "rgba(125, 211, 252, 0.52)"

  text: "#F6FAFF"
  text_soft: "#C8D6EA"
  text_muted: "#8F9DB2"
  text_dim: "#667489"

  primary: "#8EA7FF"
  primary_bright: "#B9C7FF"
  cyan: "#7DD3FC"
  cyan_bright: "#A7F3FF"
  mint: "#5EF1C7"
  violet: "#C4B5FD"

  success: "#5EF1C7"
  warning: "#FFB86B"
  danger: "#FF6B7A"

  shadow: "rgba(0, 0, 0, 0.48)"
```

### Palette Rules

- The page must not read as orange, amber, brown, beige, or sepia.
- Amber is allowed only for warning badges, refund risk, or payment review attention.
- Primary CTAs use cool glass states, not solid neon fills.
- Cyan glow should be soft, not overpowering.
- Purple is a secondary shimmer, never the whole theme.

## Typography

Use crisp system typography with generous spacing and high contrast.

```yaml
typography:
  display_xl:
    fontFamily: "Inter, SF Pro Display, Arial, Helvetica, sans-serif"
    fontSize: "56px"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "0"
  display_lg:
    fontFamily: "Inter, SF Pro Display, Arial, Helvetica, sans-serif"
    fontSize: "40px"
    fontWeight: 640
    lineHeight: 1.08
    letterSpacing: "0"
  title_lg:
    fontFamily: "Inter, SF Pro Display, Arial, Helvetica, sans-serif"
    fontSize: "28px"
    fontWeight: 640
    lineHeight: 1.16
    letterSpacing: "0"
  title_md:
    fontFamily: "Inter, SF Pro Text, Arial, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 620
    lineHeight: 1.25
    letterSpacing: "0"
  body_md:
    fontFamily: "Inter, SF Pro Text, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 450
    lineHeight: 1.58
    letterSpacing: "0"
  body_sm:
    fontFamily: "Inter, SF Pro Text, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 450
    lineHeight: 1.46
    letterSpacing: "0"
  caption:
    fontFamily: "Inter, SF Pro Text, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 620
    lineHeight: 1.25
    letterSpacing: "0.04em"
```

### Typography Rules

- Do not use negative letter spacing.
- Avoid giant text inside admin surfaces.
- Chinese text should be treated as product UI text, not poster text, except for homepage hero.
- Use cool white for important text and muted blue-gray for secondary text.

## Materials

```yaml
materials:
  liquid_nav:
    background: "linear-gradient(135deg, rgba(246,250,255,.14), rgba(125,211,252,.08))"
    border: "1px solid rgba(210,230,255,.18)"
    backdropFilter: "blur(28px) saturate(150%)"
    shadow: "0 22px 70px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.22)"

  glass_panel:
    background: "linear-gradient(145deg, rgba(238,246,255,.13), rgba(125,211,252,.06))"
    border: "1px solid rgba(210,230,255,.18)"
    backdropFilter: "blur(30px) saturate(145%)"
    shadow: "0 30px 90px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.16)"

  glass_card:
    background: "linear-gradient(145deg, rgba(238,246,255,.12), rgba(142,167,255,.055))"
    border: "1px solid rgba(210,230,255,.16)"
    backdropFilter: "blur(22px) saturate(140%)"
    shadow: "0 18px 50px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.14)"

  floating_media:
    background: "rgba(246,250,255,.08)"
    border: "1px solid rgba(210,230,255,.18)"
    objectFit: "cover"
    shadow: "0 24px 70px rgba(0,0,0,.36)"
```

## Shape And Radius

```yaml
rounded:
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "34px"
  full: "9999px"
```

Use rounded corners, but avoid making every element a pill. Cards and panels should feel like softened glass panes; command buttons can be pill-shaped.

## Layout Rules

### Homepage

- Hero uses a left text block and a right kinetic logo stage.
- The logo stage should be unframed. Avoid rectangular card borders around the logo.
- Background uses cool aurora and dotted grid, with mouse-reactive highlights only if motion remains subtle.
- Tool sections should show cover images. No text-only tool cards.
- Featured software and online tools should use a two-column desktop layout and single-column mobile layout.

### Tool Cards

Tool cards must include:

- Cover image.
- Type badge.
- VIP or paid-download badge when relevant.
- Tool name.
- Short description.
- Download/use counts.
- Cool glass hover state.

Cards should look like premium app/file assets, not commodity shop products.

### Admin

Admin screens should prioritize readability over atmosphere.

- Use dense but breathable list layouts.
- Keep filters in a single glass toolbar.
- Use detail pages for editing.
- Use cool status colors:
  - pending: cyan or blue
  - approved/active: mint
  - rejected/failed: soft red
  - refunded/cancelled: muted gray
- Avoid using English-only labels when language is Chinese.

## Components

```yaml
components:
  liquid_button:
    background: "rgba(246,250,255,.08)"
    border: "1px solid rgba(210,230,255,.18)"
    color: "{colors.text}"
    hoverBackground: "rgba(125,211,252,.14)"
    hoverBorder: "rgba(125,211,252,.48)"
    hoverShadow: "0 0 28px rgba(125,211,252,.20)"
    rounded: "{rounded.full}"

  primary_button:
    background: "linear-gradient(135deg, rgba(142,167,255,.42), rgba(125,211,252,.28))"
    border: "1px solid rgba(210,230,255,.30)"
    color: "#F8FBFF"
    shadow: "0 18px 45px rgba(71,122,255,.20)"
    rounded: "{rounded.full}"

  status_chip:
    background: "rgba(246,250,255,.08)"
    border: "1px solid rgba(210,230,255,.16)"
    color: "{colors.text_soft}"
    rounded: "{rounded.full}"

  tool_cover:
    aspectRatio: "16 / 10"
    background: "linear-gradient(145deg, rgba(142,167,255,.18), rgba(125,211,252,.08))"
    rounded: "{rounded.lg}"
    border: "1px solid rgba(210,230,255,.16)"
```

## Motion

Motion should be calm and premium.

- Logo can breathe, refract, and respond to click deformation.
- Orbiting particles around the hero logo should be small and slow.
- Background motion should not continuously flow like a video. Use mouse-reactive glow instead.
- Hover states use lift of 2-4px, border brightening, and soft shadow.
- Respect reduced-motion preferences.

```yaml
motion:
  breathe:
    duration: "5s"
    easing: "ease-in-out"
    scaleRange: "0.985 - 1.015"
  hoverLift:
    duration: "180ms"
    easing: "cubic-bezier(.2,.8,.2,1)"
  clickMorph:
    duration: "420ms"
    easing: "cubic-bezier(.2,.9,.25,1.25)"
```

## Imagery

- Prefer real software screenshots, UI captures, or generated product visuals.
- Covers should be cold, crisp, and high contrast.
- Avoid stock-like abstract gradients as the only tool image.
- For placeholder covers, use cool glass folder/card compositions with subtle cyan and periwinkle highlights.

## Accessibility

- Text contrast must remain high despite glass transparency.
- Never place important text over busy imagery without a solid enough glass layer.
- Avoid relying on color alone for order/payment status.
- Buttons must have visible focus states.
- Transparent panels should have enough opacity for readability on both dark and image backgrounds.

## Do Not Use

- Warm amber as primary brand color.
- Heavy orange HUD overlays.
- Beige forensic dossier mood.
- Thick neon outlines.
- Constant animated background flow.
- Purple-blue gradient domination.
- Black metal logo fills.
- Decorative orbs or bokeh blobs.
- Text-only tool cards.

## Preview Deliverable

The confirmation preview for this direction is:

- `docs/design/enhe-forensic-hud/ios27-liquid-glass-preview.html`
- `docs/design/enhe-forensic-hud/ios27-liquid-glass-preview.png`

The live product UI should only be recolored after user approval of the preview.

## Implementation Notes For Later

When this design is approved, update:

- `src/app/globals.css`
- `src/app/page.tsx`
- shared cards and buttons in `src/components`
- admin list surfaces and filters
- homepage hero logo stage
- tool cards to make cover imagery mandatory in frontend and admin views

Do not change business logic while applying the visual theme.
