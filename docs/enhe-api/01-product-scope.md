# ENHE API Gateway Product Scope

Date: 2026-07-05

## Product Positioning

ENHE API Gateway is an ENHE-owned developer product for Chinese AI developers, AI coding tool users, and advanced creators who need a unified model API entry point, model routing, API keys, usage visibility, billing, and tool-specific configuration documents.

This product may reference common API gateway product patterns, but it must not copy third-party brand names, UI, visual assets, copy, frontend code, backend code, or documentation text.

Recommended naming:

- Public product name: ENHE API
- Technical product name: ENHE API Gateway
- Console name: Developer Console
- Model service name: ENHE Model Hub

## Users

| User type | Need |
| --- | --- |
| AI coding tool user | Configure Codex, Claude Code, Cursor, Cline, or similar tools with one ENHE API endpoint |
| Chinese developer | Use OpenAI-compatible and Anthropic-compatible APIs with local billing visibility |
| Creator/operator | Test model calls, review usage logs, and control spend |
| Admin/operator | Freeze risky users, disable leaked keys, adjust credit, monitor provider/model health, and resolve billing disputes |

## Product Principles

- First successful call should be achievable in about 5 minutes after login.
- Users must be able to create, view prefix, revoke, and rotate API keys.
- Full API keys must only be shown once at creation and never stored in plaintext.
- Every billable request must produce traceable usage and credit ledger records.
- Cost, charged amount, model, status, tokens, latency, and error state must be visible to users.
- Free/test credit must be small and abuse-controlled.
- Referral rewards should be issued only after verified activation or real usage, not immediately on registration.
- Admin actions on keys, users, credits, model routes, and refunds must be auditable.

## Proposed Public Routes

| Route | Scope |
| --- | --- |
| `/ai-api` | Public introduction page for ENHE API |
| `/ai-api/pricing` | Public plans and credit packages |
| `/ai-api/docs` | Public API docs and quickstart |
| `/ai-api/status` | Service status and incident notes, Phase 2 if not ready for MVP |

These routes should be implemented inside the current ENHE website because the public site already owns navigation, SEO, bilingual layout, footer legal links, and brand chrome.

Evidence:

- `src/components/site-header.tsx`
- `src/components/site-footer.tsx`
- `src/components/public-site-chrome.tsx`
- `src/app/(zh-public)/*`
- `src/app/en/*`

## Proposed User Console Routes

| Route | Scope |
| --- | --- |
| `/user/api` | API console overview |
| `/user/api/keys` | API keys |
| `/user/api/usage` | Usage and credit balance |
| `/user/api/logs` | Request logs |
| `/user/api/billing` | Plans, top-ups, invoices/order links |
| `/user/api/referrals` | Referral rewards |
| `/user/api/profile` | Developer profile |
| `/user/api/docs` | Private setup docs with user-specific base URL and key prefix hints |

These should be implemented as a dedicated user-center subtree, not merged into the current single `/user` page.

Evidence:

- Current `/user` is already a dense combined page: `src/app/user/page-shell.tsx`.
- Auth/user layout is reusable: `src/app/user/layout.tsx`.
- User gate is available: `src/lib/auth.ts`.

## Proposed Runtime API Routes

MVP:

- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/messages`

Phase 2:

- `POST /v1/responses`
- model auto-routing
- upstream failover/retry
- cache hit/miss metrics
- public service status page

Production recommendation: expose runtime endpoints from a separate API gateway service, for example `api.enhe-tech.com.cn`, rather than serving production traffic from the same Next.js website process.

## MVP Includes

### Product and docs

- ENHE-owned public introduction page.
- Pricing/plan explanation.
- Quickstart for OpenAI-compatible chat completions.
- Quickstart for Anthropic-compatible messages.
- Setup guides for Codex and Claude Code first.
- Clear prohibited-use and cost policy links.

### Account and profile

- Reuse current `User` identity.
- Add developer profile record on first console entry.
- Developer profile includes developer ID, display name, email snapshot, status, timestamps.

### API keys

- Create API key with `enhe_sk_live_` prefix.
- Store only `key_hash`.
- Store `key_prefix` for display and support.
- Show full key once on creation.
- Revoke key immediately.
- Track last used time.
- Default maximum of 20 active keys per user.

### Billing and balance

- Plans or credit packages connected to existing checkout.
- Separate balances for plan credit, recharge credit, and referral credit.
- Immutable credit transactions.
- Request logs tied to deduction records.
- Insufficient balance rejection before upstream call when feasible.

### Request logs

Fields should include request ID, user ID, API key ID, method, path, model, public model name, upstream provider, upstream model, status code, input tokens, output tokens, cache read/write tokens, cost, charged amount, latency, stream flag, error code, error message, hashed client IP, hashed user-agent, and timestamp.

### Admin

- Developer users list.
- Freeze/unfreeze developer profile or API access.
- Disable specific keys.
- View usage logs by user/key/model/status.
- Adjust credit with reason and audit log.
- Disable model routes.
- Configure provider/model pricing.

## MVP Excludes

- Team workspace.
- Public playground.
- SDK packages.
- Enterprise contract billing.
- Complex model ranking/recommendation.
- Prompt template marketplace.
- Full public incident dashboard if runtime monitoring is not ready.
- Automatic referral payout before verified paid or sustained usage.
- Public resale/white-label mode.

## Existing Capabilities To Reuse

| Existing capability | Reuse plan | Evidence |
| --- | --- | --- |
| Account/login | Reuse for console | `src/lib/auth.ts`, `src/app/(auth)/*`, `prisma/schema.prisma` |
| User center | Extend with `/user/api` | `src/app/user/*` |
| Admin shell | Extend with `/admin/api` | `src/app/admin/layout.tsx`, `src/app/admin/admin-ui.tsx` |
| Audit logs | Reuse for API admin operations | `src/lib/admin-audit.ts`, `src/app/admin/audit/page.tsx` |
| Orders/payments/refunds | Reuse for purchases/top-ups with new API ledger | `src/app/actions.ts`, `src/lib/zpay-orders.ts`, `src/app/admin/actions.ts`, `prisma/schema.prisma` |
| Legal pages | Update and link API terms | `src/lib/legal.ts`, `src/app/legal/[slug]/page-shell.tsx` |
| Storage/email | Reuse for admin notifications and documents if needed | `src/lib/storage.ts`, `src/lib/admin-email-notifications.ts` |

## New Capabilities Required

- API key generation, hashing, prefixing, revocation, and auth middleware.
- API developer profile status and onboarding.
- Wallet, credit ledger, plan grants, top-up, referral credits.
- Token/cost metering.
- Gateway request logs and retention rules.
- Provider/model route table.
- Upstream provider abstraction.
- Streaming proxy support.
- API-specific rate limiting by key/user/IP/model.
- Gateway observability: success rate, latency, provider error rate, cost, high-spend alerts.
- Abuse controls and admin freeze path.
- API service terms/privacy/refund clauses.

## Acceptance Criteria For Phase 1 Planning

Before implementation starts, Phase 1 PRD must clearly answer:

- What routes are in MVP and which are deferred?
- What data fields are shown on every console page?
- What exact first-call flow is expected?
- What pricing/credit model is user-visible?
- What errors and empty states are required?
- What legal pages must be updated before beta?
- What admin operations are mandatory before any paid beta?
