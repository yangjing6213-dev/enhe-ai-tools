# ZPAY Software Download Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ZPAY dynamic QR payments so a successful callback automatically unlocks a paid software download link, and connect admin refund processing to the ZPAY refund API.

**Architecture:** Keep existing `Order` and `ToolPurchase` behavior. Add a dedicated `PaymentTransaction` record for ZPAY provider state, QR/payment URLs, provider order ids, callback payloads, and refund payloads. Put signing, config loading, provider calls, callback verification, activation, and refund orchestration in focused server-only helpers.

**Tech Stack:** Next.js App Router, Prisma/Postgres, Vitest, ZPAY `mapi.php`, ZPAY `api.php?act=refund`, existing server actions and pages.

---

### Task 1: ZPAY Core Helpers

**Files:**
- Create: `src/lib/zpay-config.ts`
- Create: `src/lib/zpay.ts`
- Test: `src/lib/zpay.test.ts`

- [ ] Write failing tests for MD5 signing, callback verification, amount formatting, payment method mapping, and `zpay.env` fallback loading.
- [ ] Implement minimal config and signing helpers.
- [ ] Run `npm test -- src/lib/zpay.test.ts`.

### Task 2: Payment Transaction Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260611193000_add_payment_transactions/migration.sql`

- [ ] Add `PaymentTransactionStatus` enum and `PaymentTransaction` model.
- [ ] Relate `Order` to one optional `PaymentTransaction`.
- [ ] Add cleanup for order/user deletes.
- [ ] Run `npx prisma generate`.

### Task 3: ZPAY Payment Creation and Callback Activation

**Files:**
- Create: `src/lib/zpay-orders.ts`
- Create: `src/app/api/zpay/notify/route.ts`
- Create: `src/app/api/orders/[id]/payment-status/route.ts`
- Test: `src/lib/zpay-orders.test.ts`

- [ ] Create or reuse a pending ZPAY transaction for a software download order.
- [ ] Verify notify payload signature, merchant id, status, and amount.
- [ ] On success, mark order `activated`, set `paidAt` and `activatedAt`, upsert `ToolPurchase`, and mark transaction `paid`.
- [ ] Make callback idempotent and return `success` for duplicate valid notifications.

### Task 4: Payment UI

**Files:**
- Modify: `src/app/orders/[id]/pay/page.tsx`
- Create: `src/components/zpay-payment-status-poller.tsx`
- Modify: `src/app/tools/[slug]/page.tsx`

- [ ] Replace fixed personal QR payment for software download orders with ZPAY QR/payment URL rendering.
- [ ] Keep fixed-code proof upload only as a fallback for non-ZPAY or provider creation failure.
- [ ] Poll local payment status and redirect to the order page after automatic unlock.
- [ ] Map UI payment method `wechat` to ZPAY `wxpay`.

### Task 5: ZPAY Refund

**Files:**
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/admin/refunds/[id]/page.tsx`
- Test: `src/lib/zpay-orders.test.ts`

- [ ] When admin marks a pending refund as completed for a ZPAY-paid order, call `api.php?act=refund` before revoking access.
- [ ] Store provider refund result in `PaymentTransaction.refundPayload` and refund proof/note.
- [ ] If ZPAY refund fails, redirect back with a clear error and do not revoke access.

### Task 6: Verification

**Commands:**
- `npm test -- src/lib/zpay.test.ts src/lib/zpay-orders.test.ts`
- `npx prisma generate`
- `npm run lint`
- `npm run build`

- [ ] Confirm ZPAY config is present without printing secrets.
- [ ] Confirm build passes after Prisma generation.
- [ ] Confirm no tracked secret files were added.
