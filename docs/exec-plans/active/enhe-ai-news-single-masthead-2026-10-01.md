# ENHE AI News single-masthead acceptance

Status: `PASS_LOCAL_ONLY` for the masthead contract. Overall release-candidate
acceptance is `PARTIAL`; see the 2026-10-03 candidate reconciliation in
`docs/exec-plans/MASTER_BACKLOG.md`.

## 2026-10-03 final candidate verification

- A fresh read-only candidate overlay review found 0 Critical, 0 Important,
  and 0 Minor findings. It rechecked the seven normalized content-difference
  paths and the single-masthead, bilingual pagination, and local database-free
  boundaries. Its focused AI News and release-workflow checks passed 36/36;
  PowerShell and Node syntax checks passed. No files were changed by the
  reviewer, and the protected D4R scope failure remains separate.
- The one shared masthead and local Latest/Topics navigation passed the
  AI News/Topics/deep-route browser suite: 32/32. Six focused suites passed
  38/38 after the final admin copy cleanup.
- The latest split Vitest checks are `PARTIAL`: excluding the protected D4R
  file, 485 files passed, 9 skipped, and 2,457 tests passed with no failures;
  the protected file was run separately and had 7 passed, 1 failed. Together
  these runs account for 2,464 passed, 90 skipped, and 1 failed; this is a
  reconciled total, not the output of one invocation. The sole failure is the
  frozen D4R worktree-scope assertion at
  `src/lib/production-motion-final-source.test.ts`; that protected file was
  left unchanged. This does not invalidate the scoped masthead browser result,
  but it prevents claiming a fully green release candidate.
- The historical guard already sees 220 paths (212 outside its allowlist) from
  its old baseline to source HEAD `41b7af3`; the candidate range sees 317 (309
  outside). The test file is byte-identical at both heads, showing this is a
  stale history-scope contract rather than a failure introduced only here.
- Targeted ESLint, `npm run typecheck`, and `git diff --check` passed. The
  database-free build exited 0 and generated 121/121 pages while all three
  database URL variables were empty. Prisma logged empty-URL validation errors
  on unrelated data-backed pages; live database behavior remains unverified.

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

## 2026-10-03 candidate-worktree recheck

- `npm test -- src/lib/typeshare-alignment.test.ts`: PASS, 7/7.
- With `DATABASE_URL`, `DIRECT_URL`, and `SEO_AUDIT_TEST_DATABASE_URL` empty,
  `npm run test:e2e -- tests/e2e/typeshare-alignment.spec.ts`: PASS, 24/24.
  This freshly verifies the single shared masthead, local Latest/Topics links,
  no duplicate account/language controls, bilingual routes, responsive layout,
  and keyboard navigation.
- Targeted ESLint and `git diff --check`: PASS. No runtime masthead change was
  needed because the candidate already matches the selected structure.
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
