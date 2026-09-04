# ENHE Symbiosis Glass Homepage UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the approved night-only ENHE homepage with the new symbiosis brand copy, inspiration-focused metric text, rounder premium typography, and stronger glassmorphism cards.

**Architecture:** Keep the current Next.js homepage and component structure. Update homepage constants/text nodes, global font tokens, glass card CSS, and source tests only.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright.

---

### Task 1: Source Test Lock

**Files:**
- Modify: `src/lib/home-redesign-source.test.ts`

- [ ] Assert the hero eyebrow is `Symbiosis · Awakening · Creation`.
- [ ] Assert the title lines are `ENHE AI` and `重塑你的人生`.
- [ ] Assert the intro is `与 AI 共生，在时代中觉醒，用创造定义未来。`.
- [ ] Assert the second metric is `灵感落地` with `把想法变成看得见的成果`.
- [ ] Assert the CSS includes the premium rounded font stack and glassmorphism blur/background rules.
- [ ] Run the targeted test and confirm it fails against the previous implementation.

### Task 2: Homepage And Style Update

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] Replace homepage hero constants and visible eyebrow text.
- [ ] Replace the second metric copy.
- [ ] Update the font stack to prefer `Microsoft YaHei UI`, `MiSans`, and `HarmonyOS Sans SC`.
- [ ] Strengthen `.home-product-preview`, `.mobile-nav-panel`, `.site-language-switcher`, and related cards with translucent frosted glass styling.

### Task 3: Verify And Capture

**Files:**
- Output: `output/playwright/enhe-home-symbiosis-glass.png`
- Output: `output/playwright/enhe-home-symbiosis-glass-mobile.png`

- [ ] Run targeted Vitest source tests.
- [ ] Run full `npm test`, `npm run typecheck`, and `npm run lint`.
- [ ] Capture updated desktop and mobile screenshots from the local dev server.
