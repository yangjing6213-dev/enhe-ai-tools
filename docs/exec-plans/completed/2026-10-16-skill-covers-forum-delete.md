# AI Skill covers and administrator topic deletion

Status: PASS

Scope: fix missing published AI Skill covers and add administrator-only topic deletion to the public forum. Preserve the existing site layout, mascot effects, reviews, user replies and unrelated work. No schema changes or production-content deletion during verification. Push and production deployment are authorized by the user.

## Plan and checks

1. Trace the live cover requests and repair the published-cover lookup. Verify affected image requests and focused regression tests.
2. Add confirmed administrator topic deletion using existing moderation status and audit records. Verify anonymous/regular-user rejection, administrator success, non-public deleted content, and list/detail controls in both languages.
3. Review the complete scoped diff; run relevant tests, lint, typecheck, build and browser checks. Push the exact release and deploy with the existing backup/rollback/health workflow, then repeat public-page checks.

## Evidence and progress

- Baseline release: 0931422ed2dc1dabbfac173da590fa37118e855a; clean isolated worktree and release branch codex/enhe-mascot-production-20261016.
- Cover investigation: AI Skill COS-upload images use /api/tool-images while its catalog lookup filters only type software; existing legacy /api/uploads images are unaffected.
- Forum investigation: only reply deletion exists. Existing rejected moderation status hides posts without cascading deletion of replies and media; implementation will reuse this behavior with server authorization and auditing.
- Implemented the narrow published-cover lookup fix and administrator-only, confirmed topic hiding with transactional audit records and localized controls.
- PASS: 117 focused Vitest checks across 14 files; full lint and typecheck; production build; 3 browser tests in development mode and the same 3 tests against the production build. Browser tests used a new, dedicated local Docker test database and were restricted to forum-topic-delete.spec.ts; no production records or cloud-storage writes were used.
- PASS: complete dependency audit (including development, optional and peer dependencies), zero vulnerabilities; independent source/diff review and test-data boundary review.
- Deployed release: 4654e5dbcf18e05daa447444a7d91bcf2e96998e on codex/enhe-mascot-production-20261016. Server checkout and active runtime identity matched; app, worker and scheduler healthy. Existing backup/rollback compatibility gates passed; no pending database migrations.
- PASS: the two affected public cover endpoints returned HTTP 200 image responses (778348 and 1377010 bytes). All three AI Skill cards rendered images without fallback in Chinese/English at 390px and 1440px. Skill and forum pages returned HTTP 200; signed-out visitors had no topic deletion controls; zero browser page errors.
- Production verification was read-only. Actual administrator deletion, cancellation, audit persistence and retained data were exercised only in the isolated local test database, which was removed afterward.
- No remaining work for this scope. This completed record is a documentation-only follow-up; the deployed application remains release 4654e5db.
