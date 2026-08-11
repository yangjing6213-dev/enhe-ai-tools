# Phase 1B.2.3 SEO audit failure report

| required record | evidence |
|---|---|
| Test name | `SEO audit public API helpers > loads a recheck source only for an eligible paid owner with remaining credit` |
| Test command | `npm test -- src/lib/seo-audit/public-api.test.ts --reporter=verbose` |
| Failure message | The second promise rejected with `SEO_AUDIT_RECHECK_UNAVAILABLE` instead of resolving. |
| Failure assertion | `src/lib/seo-audit/public-api.test.ts:282`, the rejected-refund eligibility assertion. |
| Call path | Vitest -> `loadOwnedSeoAuditRecheckSource` -> injected mock database -> credit, order, refund, and expiry guards. |
| Input source | Inline deterministic mock records. No tracked/generated external source, dynamic import, environment variable, SEO API, production data, secret, or database connection. |
| Expected contract | A completed owned professional/deep audit with an unexpired remaining credit and an activated/paid non-blocked order can be rechecked; pending refunds block it. |
| Actual behavior | The first assertion injected `2026-07-27`; the second and third used the wall clock against a fixed `2026-08-03` expiry, so expiry short-circuited the intended refund checks. |
| Recent related commit | `3d61b6c` introduced the helper and test; Phase 1B.2 Prisma commits did not introduce the date rollover. |
| Working example | The helper already exposes `options.now`, and the same test's first call already used it correctly. |
| Difference list | Production behavior correctly uses current time; test fixture uses a fixed expiry; only one of three related calls pinned time; the third assertion could pass for the wrong reason. |
| Root-cause hypothesis | An incomplete test fixture omitted the injected clock on two calls and became date-dependent after the fixed expiry. |
| Minimum verification experiment | Run the focused test at the current date, then pass one shared `2026-07-27` clock to all three calls. The failure moves from 6/7 to 7/7 without changing implementation behavior. |
| Confirmed root cause | `OTHER_CONFIRMED_ROOT_CAUSE` — `SEO_AUDIT_TEST_CLOCK_NOT_PINNED`. |
| Modified file | `src/lib/seo-audit/public-api.test.ts` only. No implementation, fixture file, source adapter, or external source was needed. |
| Why this fixes the root cause | All branches now evaluate the same eligibility instant, so the rejected and pending refund assertions test their named conditions instead of calendar rollover. |
| Regression test | The original focused test changed from 6 passed / 1 failed to 7 passed / 0 failed. |
| Final status | `SEO_AUDIT_GREEN_STATUS=PASS`; commit `44024d555ddbabd3d431379a337e7eb99d516b4e`. |

```text
SEO_AUDIT_ROOT_CAUSE=OTHER_CONFIRMED_ROOT_CAUSE:SEO_AUDIT_TEST_CLOCK_NOT_PINNED
SEO_AUDIT_RED_STATUS=CONFIRMED_EXISTING_FAILURE
SEO_AUDIT_GREEN_STATUS=PASS
NETWORK_OR_SECRET_REQUIRED=NO
PRODUCTION_IMPLEMENTATION_MODIFIED=NO
```
