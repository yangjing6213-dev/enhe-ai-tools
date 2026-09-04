# ENHE Light Dark SaaS Homepage UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current ENHE AI homepage HUD hero and header with the approved light/dark minimal SaaS design, then produce browser screenshots for user review.

**Architecture:** Keep the existing Next.js App Router, Prisma data loading, and public routes. Implement the new visual language with scoped CSS classes and semantic CSS variables so marketing pages can support light and dark modes while admin workflows remain structurally untouched.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest source tests, Playwright browser screenshots.

---

## File Structure

- Modify: `src/lib/home-redesign-source.test.ts`
  - Locks the accepted homepage structure, copy, CTA labels, metrics, no HUD/orbital/scroll-cue decorations, and light/dark CSS tokens.
- Modify: `src/lib/site-header-logo-source.test.ts`
  - Locks the header logo asset strategy and `用户中心` CTA.
- Create: `public/images/brand/enhe-icon-gradient-white-bg-cropped.png`
  - Runtime light-mode header logo, copied from the confirmed design artifact.
- Create: `public/images/brand/enhe-icon-gradient-transparent-cropped.png`
  - Runtime dark-mode header logo, copied from the confirmed design artifact.
- Modify: `src/components/site-header.tsx`
  - Replaces inline SVG logo with responsive image lockup, updates nav labels, preserves login/admin/user behavior.
- Modify: `src/components/mobile-nav-menu.tsx`
  - Restyles mobile menu to match the new dual-mode header.
- Modify: `src/app/page.tsx`
  - Replaces the HUD split hero with the approved centered SaaS hero, two CTAs, two pure-text metrics, and a real recommended-tools preview area.
- Modify: `src/components/tool-card.tsx`
  - Adds dual-mode friendly card styling for the homepage recommended section without changing the data contract.
- Modify: `src/app/globals.css`
  - Adds light/dark theme tokens, hides the interactive HUD background in the new light design, restyles header/homepage/tool cards, and removes homepage orbit/signal/scroll-cue dependence.
- Visual artifacts: `output/playwright/enhe-home-light.png`, `output/playwright/enhe-home-dark.png`, `output/playwright/enhe-home-mobile.png`
  - Generated after implementation for user confirmation.

---

### Task 1: Update Source Tests for the Accepted Design

**Files:**
- Modify: `src/lib/home-redesign-source.test.ts`
- Modify: `src/lib/site-header-logo-source.test.ts`

- [ ] **Step 1: Replace homepage source assertions**

Use these assertions in `src/lib/home-redesign-source.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage SaaS redesign source", () => {
  it("implements the accepted light and dark minimalist homepage direction", () => {
    const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(page).toContain("home-hero-shell");
    expect(page).toContain("home-hero-centered");
    expect(page).toContain("ENHE AI Tools");
    expect(page).toContain("AI工具");
    expect(page).toContain("即刻可用");
    expect(page).toContain("30+");
    expect(page).toContain("精选工具与课程");
    expect(page).toContain("自动解锁");
    expect(page).toContain("支付后开通权益");
    expect(page).toContain('href="/software"');
    expect(page).toContain('href="/skill-learning"');
    expect(page).toContain("home-product-preview");
    expect(page).toContain("recommendedTools");
    expect(page).toContain("isHomeRecommended: true");
    expect(page).toContain("take: 40");
    expect(page).not.toContain("HeroLogoMark");
    expect(page).not.toContain("enhe-orbital-system");
    expect(page).not.toContain("enhe-circuit-line");
    expect(page).not.toContain("enhe-signal");
    expect(page).not.toContain("home-hero-scroll-cue");

    expect(header).toContain("用户中心");
    expect(header).not.toContain("查看工具");

    expect(css).toContain("--marketing-bg: #ffffff");
    expect(css).toContain("--marketing-bg: #22242a");
    expect(css).toContain("--marketing-accent: #f05a35");
    expect(css).toContain(".home-hero-centered");
    expect(css).toContain(".home-hero-metrics");
    expect(css).toContain(".home-product-preview");
    expect(css).not.toContain(".enhe-orbital-system");
    expect(css).not.toContain(".home-hero-scroll-cue");
  });
});
```

- [ ] **Step 2: Replace header logo source assertions**

Use these assertions in `src/lib/site-header-logo-source.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site header brand source", () => {
  it("uses the approved cropped gradient logo assets and user-center CTA", () => {
    const component = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const mobileNav = readFileSync(new URL("../components/mobile-nav-menu.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(component).toContain("/images/brand/enhe-icon-gradient-white-bg-cropped.png");
    expect(component).toContain("/images/brand/enhe-icon-gradient-transparent-cropped.png");
    expect(component).toContain("site-brand-logo-light");
    expect(component).toContain("site-brand-logo-dark");
    expect(component).toContain("AI软件应用");
    expect(component).toContain("AI账号服务");
    expect(component).toContain("AI技能学习");
    expect(component).toContain("更新日志");
    expect(component).toContain("帮助支持");
    expect(component).toContain("用户中心");
    expect(component).not.toContain("FlatEnheLogoSvg");
    expect(component).not.toContain("查看工具");
    expect(component).not.toContain('href="/register"');

    expect(mobileNav).toContain("mobile-nav-panel");
    expect(mobileNav).toContain("用户中心");

    expect(css).toContain("width: 46px");
    expect(css).toContain("height: 30px");
    expect(css).toContain(".site-brand-logo-light");
    expect(css).toContain(".site-brand-logo-dark");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });
});
```

- [ ] **Step 3: Run tests to verify RED**

Run:

```powershell
npm test -- src/lib/home-redesign-source.test.ts src/lib/site-header-logo-source.test.ts
```

Expected: FAIL because production files still contain the HUD hero, inline `FlatEnheLogoSvg`, and old dark-only styling.

---

### Task 2: Add Runtime Brand Assets

**Files:**
- Create: `public/images/brand/enhe-icon-gradient-white-bg-cropped.png`
- Create: `public/images/brand/enhe-icon-gradient-transparent-cropped.png`

- [ ] **Step 1: Create the runtime asset directory**

Run:

```powershell
New-Item -ItemType Directory -Force -LiteralPath "public/images/brand"
```

Expected: directory exists.

- [ ] **Step 2: Copy confirmed cropped logo assets**

Run:

```powershell
Copy-Item -LiteralPath "docs/design/enhe-icon-gradient-white-bg-cropped.png" -Destination "public/images/brand/enhe-icon-gradient-white-bg-cropped.png" -Force
Copy-Item -LiteralPath "docs/design/enhe-icon-gradient-transparent-cropped.png" -Destination "public/images/brand/enhe-icon-gradient-transparent-cropped.png" -Force
```

Expected: both files exist under `public/images/brand/`.

---

### Task 3: Implement Header and Mobile Navigation

**Files:**
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/mobile-nav-menu.tsx`

- [ ] **Step 1: Update `SiteHeader`**

Implementation details:
- Import `Image` from `next/image`.
- Remove `FlatEnheLogoSvg`.
- Use two image elements inside `site-brand-mark`, with CSS toggling `site-brand-logo-light` and `site-brand-logo-dark`.
- Use approved nav labels as literal Chinese labels for the visual marketing nav while preserving the existing routes:
  - `AI软件应用` -> `/software`
  - `AI账号服务` -> `/online-tools`
  - `AI技能学习` -> `/skill-learning`
  - `更新日志` -> `/tutorials`
  - `帮助支持` -> `/legal/user-agreement`
  - `用户中心` -> `/user`
- Preserve conditional admin link for admin users.
- Show `登录` when logged out and `用户中心` as the right CTA.

- [ ] **Step 2: Update `MobileNavMenu`**

Implementation details:
- Keep the semantic `<details>` menu.
- Use `mobile-nav-panel` class for themed styling.
- Include a mobile user-center link in addition to the menu items.
- Preserve conditional admin link.

- [ ] **Step 3: Run targeted tests**

Run:

```powershell
npm test -- src/lib/site-header-logo-source.test.ts
```

Expected after implementation: PASS.

---

### Task 4: Implement the Homepage Hero and Preview

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the hero component structure**

Implementation details:
- Remove lucide imports that only supported the old three-button HUD hero.
- Remove `HeroLogoMark`.
- Keep the Prisma query and recommended tools data.
- Render `home-hero-centered` with:
  - Eyebrow: `ENHE AI Tools`
  - H1: `AI工具` and `即刻可用`
  - Intro copy from settings when configured, with a fallback of `用精选软件、账号服务和技能课程，把重复工作交给 AI 自动化，让创作、运营和学习更快进入结果。`
  - Metrics: `30+` / `精选工具与课程`, `自动解锁` / `支付后开通权益`
  - CTA links: `/software` and `/skill-learning`
- Add `home-product-preview` below the CTA area and use up to the first three real `recommendedTools` through existing `ToolCard`.

- [ ] **Step 2: Preserve empty-state behavior**

If no recommended tools exist, render a small `home-product-preview` with the same heading/copy and no fake data rows. The visual should not pretend to show unavailable tools.

- [ ] **Step 3: Run targeted homepage test**

Run:

```powershell
npm test -- src/lib/home-redesign-source.test.ts
```

Expected after implementation: PASS.

---

### Task 5: Implement Dual-Mode Styling

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/tool-card.tsx`

- [ ] **Step 1: Add marketing theme tokens**

Implementation details:
- Set light-mode root tokens for `--marketing-bg`, `--marketing-bg-soft`, `--marketing-text`, `--marketing-muted`, `--marketing-accent`, `--marketing-button`, `--marketing-card`, and `--marketing-border`.
- Add `@media (prefers-color-scheme: dark)` overrides using `#22242a`.
- Keep existing utility bridge classes but map them to the new semantic tokens where possible.

- [ ] **Step 2: Remove homepage HUD styling**

Implementation details:
- Delete or replace homepage-specific CSS selectors for:
  - `.enhe-orbital-system`
  - `.enhe-orbit-ring`
  - `.enhe-circuit-line`
  - `.enhe-circuit-node`
  - `.enhe-circuit-cross`
  - `.enhe-signal`
  - `.home-hero-scroll-cue`
- Keep unrelated logo CSS only if still used elsewhere.

- [ ] **Step 3: Add new homepage/header/card styling**

Implementation details:
- Header height <= 80px.
- Logo image display size exactly `46px` by `30px`.
- Hero uses `min-height: calc(100dvh - 80px)`, centered content, max 2-line H1, visible CTAs.
- Metrics use plain text only.
- Product preview uses real `ToolCard` output and themed cards.
- Buttons use black and `#f05a35`, with readable text in both modes.
- Mobile H1 must not overflow and CTA labels must stay on one line.

- [ ] **Step 4: Run source tests**

Run:

```powershell
npm test -- src/lib/home-redesign-source.test.ts src/lib/site-header-logo-source.test.ts
```

Expected: PASS.

---

### Task 6: Verify and Produce Visual Examples

**Files:**
- Create: `output/playwright/enhe-home-light.png`
- Create: `output/playwright/enhe-home-dark.png`
- Create: `output/playwright/enhe-home-mobile.png`

- [ ] **Step 1: Run static verification**

Run:

```powershell
npm run typecheck
npm run lint
npm test
```

Expected: all commands exit 0. If existing unrelated failures appear, report the exact failure and continue only after identifying whether the UI change caused it.

- [ ] **Step 2: Start local dev server**

Run:

```powershell
npm run dev
```

Expected: Next.js dev server starts, usually at `http://localhost:3000`.

- [ ] **Step 3: Check `npx` for Playwright CLI**

Run:

```powershell
npx --version
```

Expected: prints an npm/npx version.

- [ ] **Step 4: Generate screenshots**

Use Playwright to capture:
- Desktop light: `1280x720`, `colorScheme: "light"`, save `output/playwright/enhe-home-light.png`.
- Desktop dark: `1280x720`, `colorScheme: "dark"`, save `output/playwright/enhe-home-dark.png`.
- Mobile light: `390x844`, save `output/playwright/enhe-home-mobile.png`.

Expected: screenshots show the approved logo, `用户中心`, centered H1, plain metrics, no wheat/laurel/arcs/HUD orbit, and visible CTAs.

- [ ] **Step 5: User confirmation checkpoint**

Send the screenshot paths as Markdown image tags and ask the user to confirm whether this draft should be polished further or accepted as final.

---

## Self-Review

- Spec coverage: header logo, `用户中心`, light/dark backgrounds, centered SaaS hero, pure-text metrics, no wheat/arcs/HUD orbit, CTA labels, product preview, mobile constraints, and no route/business-flow changes are covered.
- Placeholder scan: no `TBD`, `TODO`, or deferred implementation placeholders remain in the plan.
- Type consistency: all source-test strings correspond to files and class names defined in the implementation tasks.
