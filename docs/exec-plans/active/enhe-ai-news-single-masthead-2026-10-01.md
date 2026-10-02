# ENHE AI News single-masthead acceptance

Status: `PASS_LOCAL_ONLY`; the selected masthead acceptance was rechecked on 2026-10-02. The current closure receipt has a fresh local self-audit; its independent review remains limited to a prior snapshot.

## Goal

Use one shared public-site masthead across the AI News route family. Keep the
AI News-local navigation for Latest and Topics, while removing any second
AI News top bar and any duplicate account or language entry from that local
section shell.

## Scope

- `src/lib/typeshare-alignment.test.ts`
- `tests/e2e/typeshare-alignment.spec.ts`
- `docs/superpowers/plans/2026-09-27-enhe-typeshare-alignment.md`
- `docs/exec-plans/MASTER_BACKLOG.md`
- `docs/exec-plans/active/enhe-current-head-governance-alignment-2026-09-27.md`
- `docs/handoffs/ENHE-LOCAL-WEBSITE-CLOSURE-2026-09-30.md`
- this contract and the current local-closure receipt

Runtime UI changes are allowed only if focused checks show the selected
structure is not already implemented. Preserve unrelated worktree changes.

## Constraints

- Do not read or modify `.env`, connect to a database, publish content, deploy,
  or perform a remote write in this acceptance batch. The later owner-directed
  project plan authorizes a local candidate commit after exact path review and
  verification; GitHub push and Tencent Cloud stages remain separate gates.
- Keep this change to the AI News masthead/navigation acceptance and its
  evidence. Do not alter article copy, page content, or admin behavior.
- `AI News` and `Topics` remain reachable through the local section navigation.

## Acceptance

- Each AI News route has exactly one shared `header.redesign-header`.
- At desktop widths, exactly one visible account entry and one visible
  language switch appear in the shared masthead; on mobile, there is one
  account entry in the menu and no duplicate language switch there.
- The AI News section contains one two-link local navigation for Latest and
  Topics, with the correct active-route marker and no second header/banner,
  account entry, or language switch.
- Existing bilingual, responsive, keyboard, no-overflow, no-console-error,
  and same-origin checks remain in the TypeShare Playwright suite.
- Record fresh focused test results and refresh the local path/hash receipt.

## Verification

- `npm test -- src/lib/typeshare-alignment.test.ts`
- `npm run test:e2e -- tests/e2e/typeshare-alignment.spec.ts`, with database
  environment variables explicitly empty for the local test process.
- Targeted ESLint for the changed test files and `git diff --check`.
- Reconcile the current receipt after all edits; local tests do not imply
  production content or deployment acceptance.

## Initial evidence

The current `AiNewsWorkspaceShell` renders a local navigation and content
wrapper only. Existing TypeShare browser assertions already check a single
shared masthead and absence of account/language controls in the AI News
section. This batch makes the chosen rule explicit in the source contract and
the live browser acceptance; a runtime UI change is not presumed.

## Results

- `npm test -- src/lib/typeshare-alignment.test.ts`: PASS, 1 file / 7 tests.
- `npm run test:e2e -- tests/e2e/typeshare-alignment.spec.ts`: PASS, 24/24.
  This covers 8 bilingual routes at 9 widths and 16 keyboard cases; the
  viewport checks found no horizontal overflow, browser errors, or non-local
  requests.
- Fresh verification on 2026-10-02: targeted ESLint, `npm run typecheck`, and
  `git diff --check` PASS.
- The browser server was loopback-only; `DATABASE_URL`, `DIRECT_URL`, and
  `SEO_AUDIT_TEST_DATABASE_URL` were empty in the local test process. No runtime
  page source changed.
- The refreshed closure receipt has a local self-audit. The last independent
  audit applies only to an earlier snapshot and is not represented as current
  independent verification.

## 2026-10-02 follow-up

- Reconfirmed the selected structure in a fresh public + TypeShare browser run: 48/48 passed across bilingual routes and responsive/keyboard checks. The shared public masthead appears once; AI News keeps only its Latest/Topics local navigation.
- TDD follow-up also corrected the nearby live-status region and admin focus-ring cascade; the dedicated admin focus E2E passed 1/1. The runtime masthead itself required no further change.
- Lint, official typecheck, and the DB-free production build passed. Full Vitest remains partial due only to the protected D4R worktree-scope assertion; the result and refreshed worktree receipt are recorded in the local-closure handoff.

## 2026-10-03 root-listing follow-up

- Red reproduction found that `/ai-news` and `/en/ai-news` omitted the local
  Latest/Topics navigation even though topic routes had it. The list page now
  wraps both DB-free and configured-data states in `AiNewsWorkspaceShell`,
  including paginated paths, and the public shell forwards the actual
  pathname so the shared masthead marks AI News active. This keeps one global
  masthead and one local navigation without duplicate account or language
  controls.
- The TypeShare, AI News Topics, and deep-route locale browser suite passed
  32/32 with all database URL variables empty. Eight focused source suites
  passed 49/49; the final reduced-motion contract rerun passed 6/6. Full ESLint,
  typecheck, and the production build passed; the build generated 121/121
  pages and emitted only expected empty-database-URL Prisma messages.
- Full Vitest's last pre-fix run had 2,444 passed, 90 skipped, and 3 failed.
  The two metadata-test environment failures are fixed and pass in focused
  tests. One protected clean-worktree D4R assertion remains to be checked by a
  complete suite run after the local candidate commit. This is not production
  or database verification.
- Reviewer rechecked the route wrapping, global pathname, product-type query
  scope, DB-free mocks, and test contracts; no unresolved findings remain in
  this slice. The local candidate has 109 dirty paths at base
  `41b7af32fa7a3a9fccfd8512c0d20ffda029458c`. No `.env`, database, publication,
  deploy, or remote write was used.
