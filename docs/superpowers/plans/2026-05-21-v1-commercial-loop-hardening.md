# V1 Commercial Loop Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ENHE AI Tools V1 order, payment proof, VIP membership, paid download, upload, comment, tutorial, auth security, deployment, and critical integration flows consistent and verifiable.

**Architecture:** Keep existing Next.js Server Actions and Prisma models, but move fragile cross-cutting behavior into focused service modules: order lifecycle, storage, session security, CSRF, and login throttling. UI pages remain thin and call the service/actions, while tests cover the rule layer and mocked transaction flows.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, Vitest, Tailwind CSS, Tencent Cloud COS Node.js SDK.

---

### Task 1: Order And Entitlement Rules

**Files:**
- Modify: `src/lib/order-rules.ts`
- Modify: `src/app/actions.ts`
- Modify: `src/app/admin/actions.ts`
- Test: `src/lib/order-rules.test.ts`
- Test: `src/lib/membership.test.ts`

- [x] Add tests that manual admin status edits cannot set `activated`.
- [x] Keep VIP and software entitlement creation inside `activateVipForOrder`.
- [x] Ensure user cancellation is limited to `pending_payment`, `pending_review`, and `rejected`.
- [ ] Add user-facing redirect feedback after cancel.

### Task 2: Upload Storage Service

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`
- Modify: `src/app/api/admin/upload/route.ts`
- Modify: `src/app/api/uploads/payment-proof/route.ts`
- Modify: `src/app/admin/files/page.tsx`
- Modify: `.env.example`
- Modify: `package.json`

- [ ] Test local storage key generation and COS readiness detection.
- [ ] Implement local upload with public `/uploads/...` URL.
- [ ] Implement COS upload when all COS environment variables exist.
- [ ] Make admin upload create a `files` record automatically.
- [ ] Make payment proof upload use the same storage service and write the proof URL.

### Task 3: Comments And Tutorials

**Files:**
- Modify: `prisma/schema.prisma`
- Add migration: `prisma/migrations/<timestamp>_add_tutorial_notes_errors_and_sessions/migration.sql`
- Modify: `src/app/admin/tutorials/page.tsx`
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/admin/comments/page.tsx`
- Modify: `src/app/actions.ts`
- Modify: `src/app/tools/[slug]/page.tsx`

- [ ] Add `tutorials.notes` and `tutorials.common_errors`.
- [ ] Show and edit those fields in admin tutorial management.
- [ ] Render notes and common errors on tool detail tutorial blocks.
- [ ] Add comment pin and unpin action in admin comment management.
- [ ] Sort approved comments with pinned comments first.

### Task 4: Auth Security

**Files:**
- Modify: `prisma/schema.prisma`
- Add migration: same migration as Task 3
- Modify: `src/lib/auth.ts`
- Create: `src/lib/auth-security.test.ts`
- Create: `src/lib/csrf.ts`
- Modify: `src/app/actions.ts`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] Store signed random sessions in a `sessions` table instead of raw user IDs in cookies.
- [ ] Record login attempts and limit repeated failures.
- [ ] Add CSRF token generation and verification to login/register and core user actions.

### Task 5: Deployment Config Cleanup

**Files:**
- Move: `docker-compose.yml` to `deploy/docker-compose.local.yml`
- Create: `deploy/docker-compose.enhe.yml`
- Modify: `README.md`
- Modify: `deploy.sh`

- [ ] Remove root-level production-looking compose to avoid accidental server use.
- [ ] Document the Tencent Cloud safe compose path and ports.
- [ ] Keep local compose available under `deploy/`.

### Task 6: Critical Flow Tests

**Files:**
- Create: `src/lib/commercial-flow.test.ts`
- Modify: existing service tests if needed

- [ ] Test VIP order approval creates or extends membership.
- [ ] Test software order approval creates `ToolPurchase`.
- [ ] Test ordinary users are blocked from VIP downloads and online tools.
- [ ] Test VIP users are allowed.
- [ ] Test cancellable and non-cancellable order statuses.

