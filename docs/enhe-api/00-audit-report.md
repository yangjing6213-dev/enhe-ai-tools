# ENHE API Gateway Phase 0 Audit Report

Date: 2026-07-05

Target project: `C:\Users\HU\Documents\New project 2`

## Safety Scope

- This audit only inspected source code, configuration examples, deployment docs, and Prisma schema.
- Real secret files were not read: `.env` and `zpay.env` were identified by name only.
- Environment analysis records variable names and inferred purposes only.
- No business code, database migration, dependency install, cache cleanup, formatting, deployment, payment, refund, or publishing command was run.
- Phase 0 document changes are limited to `docs/enhe-api/*`.
- The project already had many unrelated uncommitted changes before this audit. They are treated as user/worktree state and were not reverted.

## Executive Summary

The current ENHE AI website is a Next.js monolith with a mature-enough account, session, user center, admin, order, payment proof, ZPAY, refund, legal, and deployment foundation. These capabilities should be reused for ENHE API Gateway onboarding, billing entry points, admin review, compliance pages, and developer console shell.

The high-throughput runtime API gateway itself should not be placed directly inside the existing website app for production. The recommended direction is a hybrid integration:

- Existing website app owns public pages, login, developer console UI, user center entry, plan purchase, admin, legal pages, and documentation.
- A separately deployed API gateway service owns `/v1/*` model-compatible endpoints, streaming, API key auth, rate limiting, request logging, upstream provider routing, and cost charging.
- Both systems share the same user identity domain and database contract, but gateway hot-path concerns stay isolated from marketing/admin web traffic.

## Technology Stack

| Area | Finding | Evidence |
| --- | --- | --- |
| Frontend framework | Next.js App Router, React, TypeScript | `package.json`, `src/app/*`, `next.config.ts` |
| Styling/UI | Tailwind CSS 4 era setup plus shared custom components | `package.json`, `src/app/globals.css`, `src/components/ui.tsx` |
| Backend framework | Next.js Route Handlers and Server Actions | `src/app/api/*/route.ts`, `src/app/actions.ts`, `src/app/admin/actions.ts` |
| Database | PostgreSQL | `prisma/schema.prisma` datasource provider, deployment Compose DB service |
| ORM | Prisma Client | `package.json`, `src/lib/db.ts`, `prisma/schema.prisma` |
| Authentication | Custom cookie session, HMAC-signed cookie payload, Prisma `sessions` table, bcrypt password hash | `src/lib/auth.ts`, `src/lib/auth-security.ts`, `prisma/schema.prisma` |
| CSRF | Signed token helper used by login/register forms | `src/lib/csrf.ts`, `src/app/(auth)/login/page-shell.tsx`, `src/app/(auth)/register/page-shell.tsx` |
| Payments | Manual payment proof plus ZPAY order/payment/refund integration | `src/app/api/uploads/payment-proof/route.ts`, `src/lib/zpay-orders.ts`, `src/lib/zpay.ts`, `src/app/api/zpay/notify/route.ts` |
| Admin | Server-side admin gate in admin layout plus audited admin actions | `src/app/admin/layout.tsx`, `src/lib/admin-audit.ts`, `src/app/admin/actions.ts` |
| Deployment | Next standalone output, Docker Compose, PostgreSQL container, Nginx reverse proxy example, health endpoint | `next.config.ts`, `deploy/enhe-ai-tools/docker-compose.yml`, `docker/nginx.conf`, `src/app/api/health/route.ts` |
| File storage | Local uploads or Tencent COS, signed download URLs | `src/lib/storage.ts` |
| Testing | Vitest, Playwright, ESLint, TypeScript check scripts | `package.json`, `vitest.config.ts`, `playwright.config.ts` |

## Directory Structure

| Path | Current role |
| --- | --- |
| `src/app` | Next App Router pages, admin, user center, public routes, route handlers |
| `src/app/(auth)` | Chinese login/register pages using shared auth shell |
| `src/app/en/(auth)` | English login/register routes |
| `src/app/user` | User center shell and layout |
| `src/app/orders` | User order detail and payment pages |
| `src/app/admin` | Admin UI shell, management pages, admin actions |
| `src/app/api` | API route handlers for session, tools, uploads, orders, ZPAY, health, analytics, AI news |
| `src/components` | Shared site chrome, UI, header/footer, form controls, payment poller |
| `src/lib` | Auth, DB, orders, payments, access control, storage, legal, SEO, admin helpers, domain logic |
| `prisma` | Prisma schema, seed, migrations |
| `deploy/enhe-ai-tools` | Docker deployment package, Compose, operational scripts, README |
| `docker` | Nginx reverse proxy example |
| `docs` | Existing project documentation; Phase 0 ENHE API docs now live under `docs/enhe-api` |
| `content`, `public`, `uploads` | Public content/assets/uploads |
| `scripts`, `tests`, `reports`, `remotion` | Operational scripts, test code, reports, video automation |

## User And Login System

### Existing data model

Reusable:

- `User` model stores `email`, `phone`, `passwordHash`, `nickname`, `avatar`, `role`, `status`, notification preferences, and relations to orders/sessions/logs.
- `Session` model stores `tokenHash`, `userAgent`, `ip`, `expiresAt`, `revokedAt`, and `lastSeenAt`.
- `LoginAttempt` model supports login throttling.

Evidence: `prisma/schema.prisma`

### Existing auth implementation

Reusable:

- `hashPassword` and `verifyPassword` use bcrypt.
- `signInUser` creates a random session token, stores only the hashed token, and sets an HTTP-only signed cookie.
- `getCurrentUser` verifies the signed cookie, fetches a valid non-revoked session, rejects disabled users, and updates `lastSeenAt`.
- `requireUser` and `requireAdmin` enforce server-side auth gates.
- Login rate limiting is implemented through recent failed `LoginAttempt` records.

Evidence:

- `src/lib/auth.ts`
- `src/lib/auth-security.ts`
- `src/app/actions.ts`
- `src/app/(auth)/login/page-shell.tsx`
- `src/app/(auth)/register/page-shell.tsx`

### API Gateway implication

The web console can reuse the current user/session system. Runtime API calls should not use browser sessions; they need a separate API key model with hashed keys, prefix display, revocation, last-used timestamps, owner binding, and gateway-side auth.

## User Center

Reusable:

- `/user` is protected by `requireUser`.
- It already shows notifications, orders, paid access, downloads, usage logs, comments, email settings, logout, and password changes.
- It can be extended with a dedicated `/user/api` subtree, but the current page is already dense and should not absorb all API Gateway console screens into one page.

Evidence:

- `src/app/user/layout.tsx`
- `src/app/user/page.tsx`
- `src/app/user/page-shell.tsx`
- `src/app/actions.ts`

Gap for ENHE API:

- No developer profile model.
- No API key UI.
- No wallet/credit balance UI.
- No API usage log table.
- No model pricing or provider routing UI.
- No developer docs center under user center.

## Order, Payment, Refund, And Billing System

### Existing data model

Reusable with caution:

- `Order` covers VIP and software-download order types.
- `PaymentTransaction` stores provider, trade IDs, payment type, status, amount, QR/payment URLs, raw provider response, notify payload, refund payload, and timestamps.
- `PaymentProof` supports manual proof review.
- `OrderRefundRecord` supports refund request/processing records.
- `ToolPurchase` stores paid software/service entitlement.
- `VipPlan`, `Membership`, and `VipAdjustmentLog` support VIP lifecycle.
- Monetary fields use Prisma `Decimal`.

Evidence: `prisma/schema.prisma`

### Existing payment flows

Reusable:

- User order creation for paid tools is implemented in `createSoftwareDownloadOrderAction`.
- Manual proof upload writes `PaymentProof` and updates `Order` to `pending_review`.
- Payment proof images are owner/admin protected.
- ZPAY payment creation signs provider params, stores payment transaction, and reuses pending QR/payment URLs when safe.
- ZPAY notify verifies signature, merchant, order number, success status, and amount before transactionally activating the order and creating `ToolPurchase`.
- Refund handling can call ZPAY refund, write `OrderRefundRecord`, mark local transaction as refunded, revoke entitlement, and audit admin actions.

Evidence:

- `src/app/actions.ts`
- `src/app/api/uploads/payment-proof/route.ts`
- `src/app/api/payment-proofs/[id]/image/route.ts`
- `src/lib/zpay-config.ts`
- `src/lib/zpay.ts`
- `src/lib/zpay-orders.ts`
- `src/app/api/zpay/notify/route.ts`
- `src/app/admin/actions.ts`
- `src/lib/membership.ts`
- `src/lib/order-rules.ts`

### API Gateway billing gap

The current order/payment system can be reused for plan purchase and credit top-up checkout, but it is not enough for metered API billing. ENHE API Gateway needs new wallet and ledger models:

- API plans
- subscriptions or package grants
- wallet balances split by plan/recharge/referral source
- immutable credit transactions
- request usage logs tied to billing transactions
- idempotent payment/top-up activation
- concurrency-safe balance deduction

## Admin System

Reusable:

- Admin area is protected at layout level with `requireAdmin`.
- Admin nav already has users, orders, payments, refunds, audit, settings, plans, files, content, and other modules.
- `writeAdminAuditLog` captures admin ID, action, target type, target ID, summary, metadata, IP, user-agent.
- Admin audit page lists/filter logs.

Evidence:

- `src/app/admin/layout.tsx`
- `src/lib/admin-audit.ts`
- `src/app/admin/audit/page.tsx`
- `src/app/admin/actions.ts`
- `src/app/admin/users/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/payments/page.tsx`
- `src/app/admin/refunds/page.tsx`

API Gateway gap:

- Need `/admin/api` or equivalent for API users, keys, model routes, provider accounts, wallets, usage logs, freezes, risk controls, pricing, and manual balance adjustments.
- Existing `AdminAuditLog` can be reused or extended with API-specific target types.

## Legal And Compliance Pages

Reusable:

- Legal slugs already include user agreement, privacy policy, disclaimer, membership/refund, copyright complaint, and minor protection.
- Legal pages are localized through shared page shell and public content fallback.
- Footer links map to legal pages.

Evidence:

- `src/lib/legal.ts`
- `src/app/legal/[slug]/page-shell.tsx`
- `src/app/(zh-public)/legal/[slug]/page.tsx`
- `src/app/en/legal/[slug]/page.tsx`
- `src/components/site-footer.tsx`

Required for ENHE API:

- Add API service terms covering API key use, model output, prohibited use, abuse control, resale/proxy restrictions, service interruption, and upstream provider dependencies.
- Update privacy policy to state whether request content, prompts, completions, metadata, IP/user-agent, and logs are stored, for how long, and whether users can request deletion.
- Update refund rules for prepaid credit, plan grants, consumed quota, service downtime, and account suspension.
- Confirm upstream provider terms allow proxying, aggregation, resale, or distribution before public launch.

## Public Navigation And Branding

Current public nav includes home, AI news, AI trends, software, account services, skill learning, login/user center/admin. ENHE API can be added as a new public nav item without replacing current IA.

Evidence:

- `src/components/site-header.tsx`
- `src/components/site-footer.tsx`
- `src/components/public-site-chrome.tsx`

Important constraint: ENHE API Gateway must use ENHE brand, independent UI, independent copy, and independent code. Any third-party product can be used only as an abstract product-mode reference.

## API Surface

Existing runtime APIs are mostly site operations:

- `src/app/api/session/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/orders/[id]/payment-status/route.ts`
- `src/app/api/tools/[id]/download/route.ts`
- `src/app/api/tools/[id]/use/route.ts`
- `src/app/api/uploads/*`
- `src/app/api/zpay/notify/route.ts`
- `src/app/api/ai-news/*`
- `src/app/api/admin/*`

There are no current `/v1/models`, `/v1/chat/completions`, `/v1/messages`, or `/v1/responses` gateway endpoints.

## Environment Variables

Only names and inferred purpose were recorded. Real values were not read.

| Variable names | Purpose |
| --- | --- |
| `DATABASE_URL`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | PostgreSQL connection and Docker DB setup |
| `AUTH_SECRET`, `AUTH_COOKIE_NAME`, `CSRF_COOKIE_NAME` | Auth/session/CSRF secrets and cookie names |
| `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | Canonical app/site origins |
| `ZPAY_API_BASE`, `ZPAY_PID`, `ZPAY_KEY`, `ZPAY_DEFAULT_TYPE`, `ZPAY_CHANNEL_ID` | ZPAY payment provider configuration |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `ADMIN_ALERT_EMAIL`, `ADMIN_ALERT_EMAILS`, `ADMIN_EMAIL_NOTIFICATIONS_ENABLED`, `ADMIN_EMAIL_ACTION_WAIT_MS`, `SMTP_*_TIMEOUT_MS` | Email alerts and admin notification delivery |
| `TENCENT_COS_SECRET_ID`, `TENCENT_COS_SECRET_KEY`, `TENCENT_COS_BUCKET`, `TENCENT_COS_REGION`, `TENCENT_COS_SIGNED_URL_EXPIRES_SECONDS`, `UPLOAD_DIR`, `UPLOAD_ALLOWED_EXTENSIONS` | Upload storage and signed downloads |
| `BAIDU_PUSH_TOKEN`, `BAIDU_PUSH_SITE_URL`, `INDEXNOW_KEY` | Search indexing submission |
| `AI_NEWS_IMPORT_TOKEN`, `AI_NEWS_IMPORT_URL`, `AI_TRENDS_REVALIDATE_TOKEN` | AI news/trends publishing and revalidation |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `PAGE_SPEED_API_KEY` | Current automation/SEO/audit model and PageSpeed integrations |
| `DOWNLOAD_RATE_LIMIT_MAX`, `DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS` | Existing download rate limiting |
| `PLAYWRIGHT_BASE_URL`, `PERFORMANCE_AUDIT_*`, `A11Y_AUDIT_*`, `EBOS_SITE_URL`, `ENHE_HEALTH_*` | Audit, browser, EBOS, and health-watch tooling |
| `FACE_SWAP_LICENSE_SECRET`, `LUMI_LICENSE_PRIVATE_KEY`, `LUMI_LICENSE_PRIVATE_KEY_FILE` | License generator secrets |

ENHE API Gateway will need additional names later, such as upstream provider keys/base URLs, Redis/rate-limit storage, API gateway base URL, console base URL, and gateway webhook/admin allowlists. Exact names should be finalized in Phase 2/Deployment docs, not added in Phase 0.

## Deployment And Operations

Current deployment uses:

- Next standalone output in `next.config.ts`.
- Docker Compose service `app` and internal PostgreSQL `db`.
- Host port `3001:3000` for app.
- Internal-only PostgreSQL in Compose.
- Health endpoint at `/api/health`.
- Nginx example proxy to `app:3000`.
- Deployment README with backup, health-watch, logs, and no global Docker cleanup guidance.

Evidence:

- `next.config.ts`
- `src/app/api/health/route.ts`
- `src/lib/health.ts`
- `deploy/enhe-ai-tools/docker-compose.yml`
- `deploy/enhe-ai-tools/README.md`
- `docker/nginx.conf`

API Gateway implication:

- A production gateway should have independent process/container scaling, latency monitoring, provider error monitoring, streaming-safe timeouts, and rate-limit storage.
- Shared app DB is acceptable for MVP data consistency, but hot request logs may require careful indexing, retention, or eventually separate storage.

## Reuse Assessment

| Capability | Can reuse? | Notes |
| --- | --- | --- |
| User account table | Yes | Reuse `User`; add API-specific profile table instead of duplicating user identity |
| Login/session | Yes for console | Browser console can use `requireUser`; runtime API uses API key auth |
| User center shell | Yes with extension | Add `/user/api` subtree instead of bloating existing `/user` page |
| Admin shell/auth/audit | Yes | Add API admin pages and target types |
| Existing order/payment | Partially | Reuse checkout/payment/refund building blocks; add wallet/credit ledger for metered billing |
| Legal pages | Yes with updates | Add API clauses and privacy/refund changes |
| Existing download/usage logs | No for API usage | They are tool download/usage logs, not token/API request logs |
| Existing rate limit | No for API runtime | Download rate limit is DB count based; API gateway needs API key/user/IP/model rate limiting, likely Redis |
| Existing Next API routes | Not enough for production gateway | Good for web operations; high-volume streaming `/v1/*` should be isolated |

## Phase 0 Conclusion

ENHE API Gateway should be integrated into the ENHE AI product experience, not launched as a disconnected third-party-style website. However, production runtime API traffic should be handled by an independent gateway service with a stable database contract to the existing ENHE account, payment, admin, and legal systems.
