# Development Progress Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only dashboard that shows the current website development version, feature completion status, unfinished work, and recommended next tasks.

**Architecture:** Store versions and progress items in PostgreSQL through Prisma so the dashboard is editable from the admin area. Keep calculation logic in a small pure helper with tests, and render the admin UI with the existing glass-style admin components.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, Tailwind CSS, Vitest.

---

### Task 1: Progress Calculation Helpers

**Files:**
- Create: `src/lib/development-progress.ts`
- Test: `src/lib/development-progress.test.ts`

- [x] Write a failing Vitest test for weighted completion, module grouping, and Chinese status labels.
- [x] Run `npm test -- src/lib/development-progress.test.ts` and verify it fails because the helper module does not exist.
- [x] Implement `calculateDevelopmentSummary`, `groupDevelopmentItemsByModule`, `statusMeta`, `priorityMeta`, and `versionStatusMeta`.
- [x] Re-run `npm test -- src/lib/development-progress.test.ts` and verify it passes.

### Task 2: Database Schema And Seed Data

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260522174500_add_development_progress/migration.sql`
- Modify: `prisma/seed.ts`

- [x] Add `DevelopmentVersionStatus`, `DevelopmentItemStatus`, and `DevelopmentPriority` enums.
- [x] Add `DevelopmentVersion` and `DevelopmentItem` models with version/item relationships and indexes.
- [x] Add SQL migration for the new enums and tables.
- [x] Seed a V1.0 version and current feature progress items.

### Task 3: Admin CRUD And Dashboard UI

**Files:**
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/admin/layout.tsx`
- Create: `src/app/admin/development/page.tsx`

- [x] Add admin actions to create, update, and delete development versions.
- [x] Add admin actions to create, update, and delete development progress items.
- [x] Add the `开发进度驾驶舱` menu item.
- [x] Build `/admin/development` with summary cards, a progress bar, module groups, status chips, version editing, and progress item editing.

### Task 4: Verification And Delivery

**Files:**
- All files changed above.

- [x] Run `npx prisma generate`.
- [x] Run `npx prisma migrate deploy`.
- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Run `npm run test:e2e`.
- [x] Commit and push to `main`.
