# ENHE Night-Only Homepage UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved ENHE homepage UI refinements: new hero copy, night-only theme, footer support link, and language switcher beside the user center action.

**Architecture:** Keep the existing Next.js App Router page and component boundaries. Update only homepage source, header ordering, footer links, global theme tokens, and source tests.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright.

---

### Task 1: Lock Requirements In Source Tests

**Files:**
- Modify: `src/lib/home-redesign-source.test.ts`
- Modify: `src/lib/site-header-logo-source.test.ts`
- Test: `src/lib/site-footer-source.test.ts`

- [ ] Update homepage assertions for `AI`, `重塑你的人生`, the new two-line intro, and night-only tokens.
- [ ] Update header assertions so `帮助支持` is no longer present in `site-header.tsx`, and the language switcher appears after `site-user-center-cta`.
- [ ] Add a footer source test asserting that `帮助支持` is rendered from `site-footer.tsx`.
- [ ] Run `npm test -- src/lib/home-redesign-source.test.ts src/lib/site-header-logo-source.test.ts src/lib/site-footer-source.test.ts` and confirm it fails against the current implementation.

### Task 2: Apply Homepage And Navigation Changes

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/site-footer.tsx`
- Modify: `src/app/globals.css`

- [ ] Replace hero title and intro constants in `src/app/page.tsx`.
- [ ] Remove the header `帮助支持` link and keep it in the footer navigation.
- [ ] Render the language switcher immediately after the `用户中心` CTA.
- [ ] Set root theme tokens to the approved dark palette and remove the visible light-mode logo path.
- [ ] Preserve existing routes, cards, metrics, and CTA behavior.

### Task 3: Verify And Capture Preview

**Files:**
- Output: `output/playwright/enhe-home-night-only.png`
- Output: `output/playwright/enhe-home-night-mobile.png`

- [ ] Run targeted Vitest source tests.
- [ ] Run full `npm test`, `npm run typecheck`, and `npm run lint`.
- [ ] Start or reuse the local dev server.
- [ ] Capture desktop and mobile night-only screenshots with Playwright.
