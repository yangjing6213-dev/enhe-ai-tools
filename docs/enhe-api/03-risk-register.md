# ENHE API Gateway Risk Register

Date: 2026-07-05

## Risk Summary

The largest technical risk is billing correctness under concurrent streaming API requests. A production gateway must prevent negative balance, duplicate charges, missing logs, and unbounded upstream cost even when requests stream, fail, retry, or disconnect.

## Risks

| ID | Risk | Severity | Evidence / basis | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Directly serving `/v1/*` from the existing website process can destabilize public/admin pages under gateway load. | High | Current deployment is one Next standalone app in `deploy/enhe-ai-tools/docker-compose.yml`; current APIs are regular site operations under `src/app/api/*`. | Use hybrid architecture. Keep `/v1/*` in a separate gateway service. |
| R2 | Metered billing can overcharge, undercharge, or create negative balances under concurrent requests. | High | Existing payments are order-based, not metered. `Order` and `PaymentTransaction` exist in `prisma/schema.prisma`, but no API wallet/credit ledger exists. | Add wallet + immutable credit transactions; use DB transactions and row locks/advisory locks or a safe deduction protocol. |
| R3 | API keys could be stored or logged insecurely if implemented casually. | High | Current auth uses secure session token hashing in `src/lib/auth.ts`; no API key model exists yet. | Store only key hash, show full key once, store prefix only, redact logs, add leak/revoke flow. |
| R4 | Upstream provider keys could leak to frontend or logs. | High | Current secret-bearing integrations use env variables, e.g. `src/lib/zpay-config.ts`, `src/lib/storage.ts`; gateway will add more provider secrets. | Keep provider keys server-side only; never expose in `NEXT_PUBLIC_*`; redact error logs; document env ownership. |
| R5 | Existing legal pages do not yet cover API prompt/completion logging, model provider routing, quota consumption, and API abuse. | High | Legal content exists in `src/lib/legal.ts`, but it is written for tools, memberships, downloads, AI account services, and paid services. | Update user agreement, privacy policy, disclaimer, refund rules, and prohibited use before beta. |
| R6 | Upstream provider terms may prohibit resale/proxy/aggregation. | High | Product goal implies gateway/proxy behavior; no provider contract evidence exists in codebase. | Before launch, review each provider's terms and document allowed use. Disable providers lacking resale/proxy rights. |
| R7 | Request logs may store sensitive prompt/completion content or personal data without retention controls. | High | Existing logs store tool usage/download metadata in `DownloadLog`, `ToolUsageLog`, `AnalyticsEvent`; API request content policy is not defined. | Default to metadata-only logs; if content capture is needed, make it opt-in/admin-gated with retention and deletion policy. |
| R8 | Existing DB may become overloaded by high-volume usage logs. | Medium/High | Current PostgreSQL is shared by website, admin, content, orders, and analytics (`prisma/schema.prisma`). | Add indexes/partitioning/retention; consider async log queue or separate table/storage if volume grows. |
| R9 | No existing Redis or dedicated rate-limit store for API runtime. | Medium/High | `package.json` has no Redis dependency; existing rate limit is download count based in `src/lib/access.ts`. | Add gateway-specific Redis or equivalent for low-latency counters. |
| R10 | Streaming disconnects can create ambiguous token usage and billing outcomes. | High | Current app has no model streaming gateway code. | Define billing policy for partial streams, upstream failures, client disconnects, and token reconciliation. |
| R11 | Payment/top-up reuse can double-credit if callbacks or retries are not idempotent. | High | ZPAY notify handles activation transactionally in `src/lib/zpay-orders.ts`; API credit top-ups need equivalent idempotency. | Use unique payment/order references, credit transaction idempotency keys, and transactionally mark processed callbacks. |
| R12 | Admin manual balance adjustments can be abused or become untraceable. | High | Existing `AdminAuditLog` and VIP adjustment logs exist: `src/lib/admin-audit.ts`, `prisma/schema.prisma`. | Require reason, before/after balance, admin audit log, and optional dual review for large adjustments. |
| R13 | Current `/user` page is too dense for API console expansion. | Medium | User center already renders orders, notifications, entitlements, logs, comments, settings in `src/app/user/page-shell.tsx`. | Add `/user/api/*` dedicated routes with shared layout instead of merging into current page. |
| R14 | Admin navigation can become crowded and hard to operate. | Medium | Admin nav is centralized in `src/app/admin/layout.tsx` and already includes many modules. | Add a single `/admin/api` group entry with internal tabs/pages. |
| R15 | Gateway and console sharing DB tables can cause schema coupling. | Medium | Existing Prisma schema is a single source in `prisma/schema.prisma`. | Define API schema docs before migrations; version gateway reads; keep API tables under `api_*` prefix. |
| R16 | API Gateway product may accidentally copy third-party UI/copy if implementation uses competitor pages as source. | High | User explicitly forbids copying any third-party brand, UI, copy, or code. | Use ENHE-specific product language, independent UI, original docs, and code review checklist for brand/copy originality. |
| R17 | Existing `.env`/`zpay.env` secret files could be accidentally exposed in docs or commits. | High | Secret files exist by name; `src/lib/zpay-config.ts` can read `zpay.env`. | Never read or copy real values; record only env names; keep `.gitignore`; add preflight secret scan before release. |
| R18 | Gateway abuse could create sudden upstream cost spikes. | High | No API-specific spend controls exist today. | New-user credit caps, per-key limits, per-user spend ceiling, model max token limits, anomaly freeze path, cost alerts. |
| R19 | API response compatibility may drift from OpenAI/Anthropic expectations. | Medium | No existing `/v1/*` implementation. | Write API contract tests for OpenAI-compatible and Anthropic-compatible responses and streams. |
| R20 | Current payment methods may not fit prepaid API credit UX. | Medium | Existing flow supports paid tool orders and manual/ZPAY review: `src/app/actions.ts`, `src/lib/zpay-orders.ts`. | Define API credit packages separately; reuse payment primitives but build API-specific activation/ledger. |
| R21 | Privacy policy around IP/user-agent hashing is undefined. | Medium | Existing logs store IP/user-agent in several places: `DownloadLog`, `ToolUsageLog`, `AnalyticsEvent`, `AdminAuditLog`. | For API logs, store hashes for client IP/user-agent by default; document retention. |
| R22 | Model route changes can break active users without notice. | Medium | Existing admin has settings/content tools, but no model-route operational workflow. | Add model status, deprecation notice, admin audit, and fallback plan. |
| R23 | Public docs may encourage insecure API key handling. | Medium | New docs are required for Codex/Claude Code/Cursor/Cline setup. | Docs must include key security warnings and key rotation/revoke instructions. |
| R24 | The current worktree is already dirty, increasing review noise. | Medium | Initial `git status --short` showed many modified/untracked files outside `docs/enhe-api`. | Keep Phase 0 changes isolated; final self-check must show only `docs/enhe-api/*` changed by this phase. |

## Security Must-Haves Before Beta

- API keys hashed at rest.
- Full API key visible only once.
- API key prefix only in UI/logs.
- Revoked key rejected immediately.
- Upstream provider secrets server-side only.
- No prompt/completion content stored unless explicit policy exists.
- User can only read own keys/logs/billing.
- Admin pages require `requireAdmin`.
- Admin adjustments and key/user/model operations write audit logs.
- Rate limits exist for IP, user, key, and new accounts.
- Spend ceilings exist for new and suspicious users.

## Billing Must-Haves Before Paid Launch

- Monetary values use Decimal-compatible storage.
- Credit deduction and usage log are traceable to each other.
- Concurrent requests cannot make balance negative.
- Failed requests have an explicit billing policy.
- Streaming requests have an explicit billing policy.
- Payment callback/top-up activation is idempotent.
- Refund and credit reversal rules are documented.

## Compliance Must-Haves Before Public Launch

- User agreement updated for API services.
- Privacy policy updated for request metadata/content logging.
- Refund rules updated for API plans, prepaid credit, consumed quota, and downtime.
- Prohibited-use policy covers abuse, attacks, illegal content, resale, account sharing, and automated scraping.
- Provider terms reviewed for proxy/resale/redistribution permission.
- ENHE-owned brand, UI, copy, and implementation verified.

## Phase 1 Readiness

Phase 1 can proceed as a PRD and information architecture phase if it stays documentation-only first. Business code should wait until Phase 1 scope and Phase 2 architecture/data model are reviewed.
