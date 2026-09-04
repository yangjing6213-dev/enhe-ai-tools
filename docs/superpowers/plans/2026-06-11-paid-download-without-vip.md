# Paid Download Without VIP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove VIP sales and VIP access gates from the product surface, and make paid software downloads unlock through per-tool purchase orders.

**Architecture:** Keep existing historical VIP tables and old order records for compatibility, but remove active VIP entry points from navigation, admin menus, dashboards, user center, and tool pages. Reuse the existing `software_download` order, `PaymentProof`, and `ToolPurchase` flow, and change download-link visibility to depend on the purchased tool entitlement.

**Tech Stack:** Next.js App Router, React Server Components, Prisma/Postgres, Vitest, TypeScript, existing manual QR-code payment review.

---

## Files

- Modify `src/lib/tool-download-link.ts`: replace VIP-only download-link rules with purchase-aware rules.
- Modify `src/lib/tool-download-link.test.ts`: assert free and purchased software can see links, unpaid paid software cannot, and CTAs no longer route to pricing.
- Modify `src/lib/user-entitlements.ts`: remove VIP from entitlement calculation.
- Modify `src/lib/user-entitlements.test.ts`: assert purchased software and free online tools work without VIP.
- Modify `src/lib/access-rules.ts` and `src/lib/access-rules.test.ts`: remove VIP gate helpers and introduce paid-download purchase helper.
- Modify `src/lib/access.ts`: stop redirecting online tools and downloads to `/pricing`.
- Modify `src/app/tools/[slug]/page.tsx`: remove VIP UI, show paid-download prompt, show download links only when allowed.
- Modify `src/app/actions.ts`: remove new VIP order creation path from active UI, keep software-download order creation and payment review activation.
- Modify `src/components/site-header.tsx` and `src/components/mobile-nav-menu.tsx`: remove pricing nav and membership crown.
- Modify `src/app/pricing/page.tsx`: replace VIP pricing page with discontinued notice and software link.
- Modify `src/app/admin/layout.tsx`: remove member-plan nav.
- Modify `src/app/admin/page.tsx`: remove active VIP and expiring VIP dashboard stats.
- Modify `src/app/admin/messages/page.tsx`: remove VIP expiry messages.
- Modify `src/app/admin/tool-admin-list.tsx`: remove VIP controls and badges; keep paid software controls.
- Modify `src/app/user/page.tsx`: remove membership panel and VIP-dependent entitlement display.
- Modify `src/lib/i18n.ts` and `src/lib/admin-i18n.ts`: update visible labels and funnel labels away from VIP.
- Modify source tests under `src/lib/*source.test.ts` as needed to lock removed links and labels.

## Task 1: TDD Permission Helpers

**Files:**
- Modify: `src/lib/tool-download-link.test.ts`
- Modify: `src/lib/tool-download-link.ts`
- Modify: `src/lib/access-rules.test.ts`
- Modify: `src/lib/access-rules.ts`

- [ ] **Step 1: Write failing tests for purchase-aware download links**

Add tests that call:

```ts
canShowDownloadLinkArea({
  isDownloadPaid: true,
  hasDownloadPurchase: false,
  hasDownloadLink: true
})
```

Expected result: `false`.

Add tests for free software and purchased paid software returning `true`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/lib/tool-download-link.test.ts src/lib/access-rules.test.ts
```

Expected: FAIL because helpers still accept VIP-oriented input.

- [ ] **Step 3: Implement minimal helper changes**

Change `canShowDownloadLinkArea` to use `isDownloadPaid`, `hasDownloadPurchase`, and `hasDownloadLink`.

Change `resolveSoftwareDownloadCtaHref` to return:

- `#download-links` when link area is visible.
- `pay-required` marker for unpaid paid software.
- protected download URL for free software without display-only link area.

Replace VIP access helper tests with paid-download purchase helper tests.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
npm test -- src/lib/tool-download-link.test.ts src/lib/access-rules.test.ts
```

Expected: PASS.

## Task 2: TDD User Entitlements

**Files:**
- Modify: `src/lib/user-entitlements.test.ts`
- Modify: `src/lib/user-entitlements.ts`

- [ ] **Step 1: Write failing entitlement tests**

Add tests asserting:

- Free software with a download file is downloadable without VIP.
- Paid software is listed in purchased software only when its tool id is in `purchasedToolIds`.
- Online tools with `onlineUrl` are available without VIP.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/lib/user-entitlements.test.ts
```

Expected: FAIL because current function requires `hasVip`.

- [ ] **Step 3: Implement minimal entitlement changes**

Remove `hasVip` from active decisions and keep purchased-tool checks for paid software.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
npm test -- src/lib/user-entitlements.test.ts
```

Expected: PASS.

## Task 3: Remove VIP Frontend Entrypoints

**Files:**
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/mobile-nav-menu.tsx`
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/lib/i18n.ts`
- Test: source tests that cover header/pricing text.

- [ ] **Step 1: Write failing source tests**

Assert:

- Site header does not include `t.nav.pricing` in `navItems`.
- Site header does not import or render `Crown`.
- Pricing page no longer imports `createOrderAction`, `VipPlan`, or renders plan forms.

- [ ] **Step 2: Run targeted source tests**

Run:

```bash
npm test -- src/lib/site-header-nav.test.ts src/lib/site-header-logo-source.test.ts
```

Expected: FAIL after adding the new assertions.

- [ ] **Step 3: Implement frontend entrypoint removal**

Remove the pricing nav item and membership crown. Replace `/pricing` content with an informational discontinued page linking to `/software`.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm test -- src/lib/site-header-nav.test.ts src/lib/site-header-logo-source.test.ts
```

Expected: PASS.

## Task 4: Update Tool Detail Paid Download Flow

**Files:**
- Modify: `src/app/tools/[slug]/page.tsx`
- Modify: `src/lib/tool-download-link.ts`
- Modify: `src/lib/i18n.ts`
- Test: `src/lib/tool-detail-layout-source.test.ts` and `src/lib/tool-download-link.test.ts`

- [ ] **Step 1: Write failing source tests**

Assert the tool detail source no longer contains:

- `openVip`
- `href="/pricing"`
- `userHasVip`
- `isDownloadLinkVipOnly`

Assert it still contains `createSoftwareDownloadOrderAction`, `hasDownloadPurchase`, and the download links section.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/lib/tool-detail-layout-source.test.ts src/lib/tool-download-link.test.ts
```

Expected: FAIL until source and helper changes are applied.

- [ ] **Step 3: Implement tool detail changes**

Use `ToolPurchase` as the purchase signal. For paid software without purchase, render a payment form and a clear payment-required note. For free software or purchased paid software, show the download-link area.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
npm test -- src/lib/tool-detail-layout-source.test.ts src/lib/tool-download-link.test.ts
```

Expected: PASS.

## Task 5: Admin and User Center Cleanup

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/messages/page.tsx`
- Modify: `src/app/admin/tool-admin-list.tsx`
- Modify: `src/app/user/page.tsx`
- Modify: `src/lib/admin-i18n.ts`
- Modify: `src/lib/i18n.ts`
- Test: source tests for admin/user pages.

- [ ] **Step 1: Write failing source tests**

Assert:

- Admin nav source does not contain `["plans", "/admin/plans"]`.
- Admin dashboard source does not query `prisma.membership`.
- Admin messages source does not create `vip_expiring` messages.
- Tool admin editor source does not render `isVipRequired` or `isDownloadLinkVipOnly`.
- User center source does not call `getActiveMembership`.

- [ ] **Step 2: Run source tests to verify failure**

Run:

```bash
npm test -- src/lib/admin-dashboard.test.ts src/lib/user-center-page-source.test.ts src/lib/admin-tool-editor-source.test.ts
```

Expected: FAIL after assertions are added.

- [ ] **Step 3: Implement cleanup**

Remove VIP menu entries, panels, stats, message types, and editor controls. Keep paid-download fields and historical order display.

- [ ] **Step 4: Run source tests to verify green**

Run:

```bash
npm test -- src/lib/admin-dashboard.test.ts src/lib/user-center-page-source.test.ts src/lib/admin-tool-editor-source.test.ts
```

Expected: PASS.

## Task 6: Payment Review Language and Compatibility

**Files:**
- Modify: `src/lib/membership.ts`
- Modify: `src/lib/admin-email-notifications.ts`
- Modify: `src/lib/notification-messages.ts`
- Modify: `src/app/admin/payments/[id]/page.tsx`
- Modify: status/source tests as needed.

- [ ] **Step 1: Write failing tests or source assertions**

Assert payment review messages refer to download entitlement for `software_download` orders and no active UI says approving a software order opened VIP.

- [ ] **Step 2: Run targeted tests**

Run:

```bash
npm test -- src/lib/admin-email-notifications.test.ts src/lib/notification-display.test.ts src/lib/membership.test.ts
```

Expected: FAIL where old VIP language or expectations remain.

- [ ] **Step 3: Implement language cleanup**

Keep the function behavior compatible but rename user-facing text where possible. Avoid database migrations.

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
npm test -- src/lib/admin-email-notifications.test.ts src/lib/notification-display.test.ts src/lib/membership.test.ts
```

Expected: PASS.

## Task 7: Full Verification and Deployment

**Files:**
- All modified files.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 2: Browser smoke test**

Run Playwright against local or production build to confirm:

- Header has no member pricing link.
- Tool detail paid software shows purchase flow before entitlement.
- User center has orders and purchased software, not membership panel.

- [ ] **Step 3: Commit implementation**

Commit with:

```bash
git add .
git commit -m "Replace VIP sales with paid downloads"
```

- [ ] **Step 4: Push and deploy**

Push `main` to GitHub and deploy to Tencent Cloud with the existing deployment workflow.

- [ ] **Step 5: Online verification**

Verify:

```bash
curl.exe -fsS --max-time 20 https://www.enhe-tech.com.cn/api/health
```

Expected: JSON reports app and database `ok`.
