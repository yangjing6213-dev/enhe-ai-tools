# Admin Operations Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the admin backend from basic CRUD screens into an operations-ready console with dashboard metrics, unified list controls, release layers, admin reminders, and COS deletion visibility.

**Architecture:** Keep database-backed workflows in existing admin pages and actions, and add small pure helper modules for calculations and rules so the risky behavior is covered by unit tests. Add one ProductRelease model to connect development progress with user-facing product versions while keeping tool changelogs as the tool-version layer.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, Vitest, Tencent COS SDK.

---

### Task 1: Dashboard And Message Helpers

**Files:**
- Create: `src/lib/admin-dashboard.ts`
- Create: `src/lib/admin-dashboard.test.ts`
- Create: `src/lib/admin-messages.ts`
- Create: `src/lib/admin-messages.test.ts`
- Modify: `src/app/admin/page.tsx`
- Create: `src/app/admin/messages/page.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] Write failing tests for dashboard growth, money formatting, message severity sorting, and message counts.
- [ ] Run `npm test -- src/lib/admin-dashboard.test.ts src/lib/admin-messages.test.ts` and verify the helpers are missing.
- [ ] Implement the helpers and update `/admin` to show paid amount, pending reviews, tool/user growth, and popular tools.
- [ ] Add `/admin/messages` with pending payment, pending refund, upload exception, and VIP-expiry reminders.

### Task 2: File List And COS Delete Closure

**Files:**
- Modify: `src/lib/admin-list.ts`
- Modify: `src/lib/admin-list.test.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/storage.test.ts`
- Modify: `src/app/admin/files/page.tsx`
- Modify: `src/app/admin/actions.ts`

- [ ] Write failing tests for file search/storage pagination and COS delete planning.
- [ ] Run `npm test -- src/lib/admin-list.test.ts src/lib/storage.test.ts` and verify the new expectations fail.
- [ ] Add file list helpers, storage badges, pagination controls, warning/error displays, COS delete planning, retry classification, and audit entries for upload/delete failures.

### Task 3: Product Release Layer

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260522193000_add_product_releases/migration.sql`
- Modify: `prisma/seed.ts`
- Create: `src/lib/release-layer.ts`
- Create: `src/lib/release-layer.test.ts`
- Modify: `src/app/admin/actions.ts`
- Create: `src/app/admin/releases/page.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/development/page.tsx`
- Modify: `src/app/admin/changelogs/page.tsx`

- [ ] Write failing tests for three-layer labels and summary counts.
- [ ] Add ProductRelease schema and migration.
- [ ] Add CRUD actions and `/admin/releases` page.
- [ ] Link development progress, product releases, and tool changelogs in the admin UI.

### Task 4: Verification

**Files:**
- All touched files.

- [ ] Run `npx prisma generate`.
- [ ] Run `npx prisma migrate deploy`.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `git status --short`, then commit and push only intended project files.
