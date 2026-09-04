# Homepage Minimal First Viewport And SEO Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage so the first viewport shows only the premium hero composition, move featured content below the fold, then audit the live site SEO without changing production SEO pages yet.

**Architecture:** Keep the current Next.js App Router structure, preserve routes and business logic, and isolate the homepage change to the homepage source plus shared CSS tokens. After the UI change is verified locally, audit the live site with browser-backed checks and produce a confirmed action list before any live SEO edits.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright, browser/web audit tooling.

---

### Task 1: Lock The Homepage First-Viewport Contract

**Files:**
- Modify: `src/lib/home-redesign-source.test.ts`

- [ ] Add source assertions for a dedicated hero stage and a dedicated featured-content section below it.
- [ ] Assert the featured section keeps the `updates` anchor while moving out of the hero section.
- [ ] Assert the homepage CSS defines the new hero-stage and featured-shell layout hooks.
- [ ] Run `npm test -- src/lib/home-redesign-source.test.ts` and confirm the test fails before implementation.

### Task 2: Recompose The Homepage Layout

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] Split the homepage into a hero section and a separate featured-content section.
- [ ] Keep the existing hero copy, metrics, and three CTA routes unchanged.
- [ ] Preserve the six recommended tools inside the featured card only.
- [ ] Tune spacing, viewport height, and glass styling so the first viewport remains minimal on desktop and mobile.

### Task 3: Verify The UI Locally

**Files:**
- Output: `output/playwright/enhe-home-minimal-desktop.png`
- Output: `output/playwright/enhe-home-minimal-mobile.png`

- [ ] Run `npm test -- src/lib/home-redesign-source.test.ts`.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run lint`.
- [ ] Start or reuse the local dev server.
- [ ] Capture desktop and mobile homepage screenshots to verify the featured card sits below the fold.

### Task 4: Audit Live SEO

**Files:**
- Output: `docs/superpowers/specs/2026-06-17-enhe-live-seo-audit-notes.md`

- [ ] Inspect the live homepage, key listing pages, `robots.txt`, and `sitemap.xml`.
- [ ] Check canonical, title, description, headings, mobile behavior, JSON-LD, and crawlability.
- [ ] Summarize issues by priority and propose a staged remediation plan.
- [ ] Stop before editing live SEO pages until the user confirms the remediation plan.
