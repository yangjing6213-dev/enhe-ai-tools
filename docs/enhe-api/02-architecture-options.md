# ENHE API Gateway Architecture Options

Date: 2026-07-05

## Decision Drivers

- Reuse existing ENHE account, payment, admin, and legal systems.
- Keep ENHE-owned brand, UI, copy, and implementation.
- Avoid destabilizing the current ENHE website.
- Support streaming model responses.
- Support high-volume request logs and metered credit deduction.
- Keep provider secrets server-side.
- Let gateway scale and deploy independently from marketing/admin pages.
- Preserve a clear audit trail for payment, credit, key, user, and model-route operations.

## Option A: Directly Add Everything To Existing Next.js Project

### Shape

- Add `/ai-api`, `/user/api`, `/admin/api`, and `/v1/*` inside the existing Next.js app.
- Reuse the existing PostgreSQL database and Prisma client.
- Use Next Route Handlers for model gateway calls and streaming.

### Benefits

- Fastest initial integration.
- Lowest setup cost.
- Direct reuse of `User`, `Session`, `Order`, admin UI, and legal pages.
- One deployment pipeline.

### Problems

- Runtime API traffic shares the same process as public pages/admin.
- Streaming model calls can tie up web app resources.
- Gateway errors or upstream provider latency can affect the main website.
- Rate limiting likely needs Redis or another low-latency store; current app has no Redis dependency.
- High-volume logs may stress the same Prisma/PostgreSQL path without careful retention/indexing.
- Web deploys and gateway deploys would be coupled.
- Provider keys and gateway hot-path code live in the same blast radius as public site code.

### Evidence From Current Codebase

- Existing app is a single Next standalone service: `next.config.ts`, `deploy/enhe-ai-tools/docker-compose.yml`.
- Current API routes are normal site operations, not high-throughput streaming APIs: `src/app/api/*`.
- Current rate limiting is download-focused and DB-count based: `src/lib/access.ts`, `src/lib/access-rules.ts`.
- Current health endpoint checks only app/database: `src/app/api/health/route.ts`, `src/lib/health.ts`.

### Verdict

Acceptable only for a local prototype or very limited internal proof of concept. Not recommended for production gateway runtime.

## Option B: Fully Independent Console And API Service

### Shape

- Build a separate console app and separate API gateway service.
- Main ENHE website only links to the console.
- Identity, billing, and admin may be duplicated or synchronized.

### Benefits

- Strong isolation.
- Independent UI and backend velocity.
- Gateway and console can be designed from scratch.
- Lower risk to existing main site.

### Problems

- Duplicates login, user center, legal, payment, admin, and brand infrastructure.
- More SSO/session complexity.
- Higher implementation cost.
- Worse user continuity from existing ENHE user center.
- More places to audit and secure.

### Evidence From Current Codebase

- Existing user/auth/payment/admin/legal systems are already present and reusable: `src/lib/auth.ts`, `src/app/user/page-shell.tsx`, `src/lib/zpay-orders.ts`, `src/app/admin/layout.tsx`, `src/lib/legal.ts`.
- The current site already provides bilingual brand chrome and public navigation: `src/components/site-header.tsx`, `src/components/site-footer.tsx`.

### Verdict

Too much duplication for Phase 1. Not recommended unless the current website becomes impossible to extend.

## Option C: Hybrid Integration

### Shape

- Existing ENHE website app owns:
  - `/ai-api`
  - `/ai-api/pricing`
  - `/ai-api/docs`
  - `/user/api/*`
  - `/admin/api/*`
  - legal page updates
  - checkout/top-up screens
- Independent API gateway service owns:
  - `GET /v1/models`
  - `POST /v1/chat/completions`
  - `POST /v1/messages`
  - future `POST /v1/responses`
  - API key auth
  - rate limiting
  - streaming
  - upstream routing
  - request logging
  - credit deduction

### Benefits

- Reuses existing accounts, payments, admin, legal, and brand.
- Keeps high-throughput runtime traffic isolated.
- Allows independent gateway deployment and scaling.
- Reduces blast radius of upstream provider incidents.
- Lets console ship in the current UI without duplicating login.
- Provides a clean path to add Redis or queueing for gateway-only runtime concerns.

### Problems

- Requires a shared database contract between website and gateway.
- Requires cross-service auth/admin discipline.
- Requires careful transaction design for billing and logs.
- Requires deployment work for a second service and likely a second subdomain.

### Evidence From Current Codebase

- Current web app is strong at account/admin/payment/legal flows:
  - `src/lib/auth.ts`
  - `src/app/user/page-shell.tsx`
  - `src/app/admin/layout.tsx`
  - `src/lib/admin-audit.ts`
  - `src/lib/zpay-orders.ts`
  - `src/app/api/zpay/notify/route.ts`
  - `src/lib/legal.ts`
- Current deployment already documents port isolation and avoids touching existing services:
  - `deploy/enhe-ai-tools/README.md`
  - `deploy/enhe-ai-tools/docker-compose.yml`
- Gateway hot path needs capabilities not present today:
  - API key hashing and auth
  - Redis-style rate limiting
  - token/cost metering
  - provider routing
  - streaming proxy isolation
  - request log retention

### Verdict

Recommended.

## Recommended Target Architecture

```text
www.enhe-tech.com.cn
  Existing ENHE Next.js app
  - public ENHE API pages
  - developer console
  - user login/session
  - admin API operations
  - orders/payments/top-ups
  - legal/compliance pages

api.enhe-tech.com.cn
  ENHE API Gateway service
  - /v1/models
  - /v1/chat/completions
  - /v1/messages
  - streaming
  - API key auth
  - rate limits
  - provider routing
  - metering and logging

PostgreSQL
  Shared user/account/order/API billing data

Redis or equivalent
  Runtime rate limits, short-lived counters, anti-abuse windows

Upstream model providers
  Server-side only credentials
```

## Data Ownership Boundary

| Data | Owner |
| --- | --- |
| `users`, `sessions`, `login_attempts` | Existing website |
| public pages, legal pages | Existing website |
| API developer profile | Existing website creates/edits; gateway reads status |
| API keys | Console creates/revokes; gateway validates hashed keys |
| API wallet/balance | Shared billing domain; gateway deducts via transaction |
| API usage logs | Gateway writes; console/admin reads |
| Provider routes/pricing | Admin manages; gateway reads/cache |
| Payment orders/transactions | Existing website payment domain |
| Admin audit logs | Existing website/admin domain, with API target types |

## Proposed New Database Tables

Subject to Phase 2 design review:

- `api_developer_profiles`
- `api_keys`
- `api_plans`
- `api_subscriptions`
- `api_wallets`
- `api_credit_transactions`
- `api_usage_logs`
- `api_model_routes`
- `api_provider_accounts`
- `api_payments`
- `api_invoices`
- `api_referral_codes`
- `api_referrals`
- `api_rate_limit_windows`
- `api_admin_audit_logs` or reuse `admin_audit_logs` with API target types

## Runtime Request Flow

1. Client calls `api.enhe-tech.com.cn/v1/...` with `Authorization: Bearer enhe_sk_live_...`.
2. Gateway hashes the key and looks up active `api_keys`.
3. Gateway verifies developer profile/user status.
4. Gateway applies rate limits by key, user, IP hash, route, and model.
5. Gateway selects active model route and upstream provider.
6. Gateway preflights available balance when the model is billable.
7. Gateway forwards request to upstream provider and supports streaming if requested.
8. Gateway records success or failure usage log.
9. Gateway writes credit transaction for billable successful usage according to billing policy.
10. Console shows usage logs and balance through existing website pages.

## Console Request Flow

1. User logs in through existing ENHE auth.
2. User opens `/user/api`.
3. Website creates developer profile if missing.
4. User creates API key.
5. Full key is shown once.
6. User opens private setup docs.
7. User calls API gateway.
8. User returns to `/user/api/logs` and `/user/api/usage`.

## Deployment Recommendation

For Phase 1 and 2 planning:

- Keep website deployment unchanged.
- Design gateway service as a separate container/process.
- Use `api.enhe-tech.com.cn` for runtime API.
- Keep `www.enhe-tech.com.cn` for public site and console.
- Add Redis only to the gateway stack if rate-limit requirements demand it.
- Keep upstream provider secrets out of frontend and out of browser-visible config.

## Phase Decision

Recommended option: Option C, hybrid integration.

Reason:

The current ENHE codebase is strong enough to host the product shell and business operations, but the API gateway runtime has different scaling, latency, streaming, abuse, and billing-risk characteristics. Hybrid integration preserves user continuity while limiting production blast radius.
