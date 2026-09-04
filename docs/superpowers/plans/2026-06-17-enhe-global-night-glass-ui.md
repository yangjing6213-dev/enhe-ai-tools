# ENHE Global Night Glass UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved ENHE night-mode glass UI across public, account, order, payment, and admin surfaces without changing website functionality.

**Architecture:** Use the existing Next.js App Router, Tailwind v4, shared `globals.css`, and local shared components. Prefer global tokens and component class updates over large page rewrites, then patch page-level legacy utility colors where needed.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest source tests, Playwright screenshot verification.

---

### Task 1: Source Tests For Global UI Contract

**Files:**
- Create: `src/lib/global-night-glass-ui-source.test.ts`
- Modify: none

- [ ] **Step 1: Write failing source tests**

Create tests that read `globals.css`, `components/ui.tsx`, `components/form-submit-button.tsx`, `components/tool-card.tsx`, `app/admin/admin-ui.tsx`, and `app/admin/layout.tsx`.

The test must require:

- Shared orange accent token `--marketing-accent: #f05a35`.
- `.glass`, `.evidence-card`, `.dossier-card`, `.admin-shell-card`, and `.surface-panel` classes.
- `backdrop-filter: blur(28px) saturate(160%)`.
- `ButtonLink` and `FormSubmitButton` no longer use `#7DD3FC` or `#7AA7FF` for primary button styling.
- `admin-ui.tsx` exports shared `inputClass`, `selectClass`, and `textareaClass` using `border-white/14`, `bg-white/7`, and `focus:border-[var(--marketing-accent)]`.
- Admin layout uses `admin-shell-card` and `admin-nav-link`.

- [ ] **Step 2: Run red test**

Run: `npm test -- src/lib/global-night-glass-ui-source.test.ts`

Expected: FAIL because the source test does not exist yet or because old blue classes still exist.

### Task 2: Global CSS And Shared Public Components

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui.tsx`
- Modify: `src/components/form-submit-button.tsx`
- Modify: `src/components/password-input.tsx`

- [ ] **Step 1: Add global utility classes**

Add shared classes to `globals.css`:

- `.surface-panel`
- `.surface-panel-soft`
- `.filter-surface`
- `.admin-shell-card`
- `.admin-nav-link`
- `.admin-nav-link:hover`
- `.form-control-dark`
- `.form-select-dark`
- `.status-success`
- `.status-warning`
- `.status-danger`

These classes should use the existing approved night tokens, frosted blur, subtle borders, and orange accent focus states.

- [ ] **Step 2: Update shared public components**

Update `ui.tsx` so `Badge`, `ButtonLink`, `SectionTitle`, and `EmptyState` use the approved visual system.

- [ ] **Step 3: Update form submit buttons**

Update `form-submit-button.tsx` variant classes:

- Primary: black pill with white text.
- Success: orange pill with white text.
- Secondary: translucent glass pill with white/muted text.
- Danger: dark red translucent pill.

- [ ] **Step 4: Update password visibility control**

Update `password-input.tsx` focus and hover states to use orange accent and existing muted text tokens.

- [ ] **Step 5: Run focused source tests**

Run: `npm test -- src/lib/global-night-glass-ui-source.test.ts src/lib/home-redesign-source.test.ts`

Expected: PASS.

### Task 3: Public Listing, Cards, Auth, Pricing, And Account Surfaces

**Files:**
- Modify: `src/components/tool-card.tsx`
- Modify: `src/app/software/page.tsx`
- Modify: `src/app/online-tools/page.tsx`
- Modify: `src/app/skill-learning/page.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/app/user/page.tsx`
- Modify as needed: `src/app/orders/[id]/page.tsx`
- Modify as needed: `src/app/orders/[id]/pay/page.tsx`

- [ ] **Step 1: Update tool card visual language**

Keep all props and links unchanged. Replace old cyan/blue highlights with orange/muted glass tokens.

- [ ] **Step 2: Update listing filter bars**

Apply `filter-surface`, `form-control-dark`, and `form-select-dark` to software, online tools, and skill learning filter forms.

- [ ] **Step 3: Update auth cards**

Keep login/register actions and hidden CSRF inputs unchanged. Apply the shared glass panel, dark inputs, and button variants.

- [ ] **Step 4: Update pricing card**

Keep the CTA target `/software`. Apply the same card and button styling.

- [ ] **Step 5: Update account/order/payment surfaces**

Keep actions, forms, order IDs, hidden fields, payment proof upload, and status logic unchanged. Apply shared panels, form controls, buttons, and status classes.

- [ ] **Step 6: Run source and functional tests**

Run: `npm test`

Expected: PASS.

### Task 4: Admin Layout And Admin Shared Components

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/admin-ui.tsx`

- [ ] **Step 1: Update admin layout shell**

Use `admin-shell-card` for sidebar and `admin-nav-link` for nav links. Preserve all hrefs and dictionary keys.

- [ ] **Step 2: Update admin shared input classes**

Update `inputClass`, `selectClass`, and `textareaClass` to use the global dark glass controls and orange focus border.

- [ ] **Step 3: Update admin section headings**

Use white headings and muted intros with the same rounded type system.

- [ ] **Step 4: Run admin source tests**

Run: `npm test -- src/lib/admin-i18n.test.ts src/lib/global-night-glass-ui-source.test.ts`

Expected: PASS.

### Task 5: Visual Verification

**Files:**
- Create screenshots under: `output/playwright/`

- [ ] **Step 1: Ensure dev server responds**

Run: `Invoke-WebRequest -Uri 'http://localhost:3001' -UseBasicParsing -TimeoutSec 5`

Expected: HTTP 200.

- [ ] **Step 2: Capture public desktop and mobile screenshots**

Capture:

- `/`
- `/software`
- `/online-tools`
- `/skill-learning`
- `/pricing`
- `/login`
- `/register`

- [ ] **Step 3: Capture admin screenshots if authenticated session allows**

Capture `/admin`. If redirected to login, report that admin screenshot requires an authenticated admin session.

- [ ] **Step 4: Inspect screenshots**

Verify:

- No obvious old blue CTA dominance.
- No text overflow.
- Mobile header and cards fit.
- Glass cards remain readable.

### Task 6: Final Verification

**Files:**
- No new files required.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: all test files and tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 4: Summarize changed files and screenshots**

Report exact files changed, verification output, and screenshot paths.

