# Admin empty-tool guidance — 2026-10-01

Status: `verified_local_only` (task-specific behavior, TypeScript, and code review pass; release readiness is separate)

## Goal

Make the FAQ, tutorial, and changelog editors explain what to do when no tool can be selected, while keeping their current required-tool validation and save actions intact.

## Scope

- `src/app/admin/faqs/[id]/page.tsx`
- `src/app/admin/tutorials/[id]/page.tsx`
- `src/app/admin/changelogs/[id]/page.tsx`
- focused source and fixture tests
- a guarded, database-free Playwright empty-tools fixture and its browser test
- the minimal ES2017-compatible regex assertion correction in `src/lib/release-workflow-source.test.ts`, required to restore the repository TypeScript check
- this contract and the local closure receipt

## Acceptance

1. Each of the three editors shows an accessible explanation only when its tool list is empty.
2. The explanation links to `/admin/software/new`, which is the existing local product-creation entrypoint.
3. The tool selector stays required; server actions, authorization, and database behavior do not change.
4. The empty-tools fixture is opt-in, local-only, rejects production mode and any configured database URL, blocks browser writes and external requests, and is never enabled by default.
5. Focused tests, ESLint, typecheck, DB-free browser coverage at phone and desktop widths, `git diff --check`, and final diff/status review run before this contract is marked verified.

## Verification plan

- Add the source and fixture assertions first and confirm they fail for the missing empty-state behavior.
- Implement the smallest page and fixture changes.
- Run the focused source/fixture tests, lint, typecheck, and the isolated Playwright test.
- Review only this task's hunks, then refresh and independently re-audit the current-worktree receipt.

## Verification result (2026-10-01)

- TDD RED was observed: all three source cases failed because the guidance was absent, and the empty-tools fixture test returned its normal synthetic tool instead of an empty list.
- `npm test -- src/lib/admin-empty-tool-guidance-source.test.ts src/lib/admin-visual-db-fixture.test.ts`: PASS, 2 files / 20 tests.
- Targeted ESLint over the three editors, fixture, source tests, browser test, and dedicated config: PASS.
- `npx playwright test --config=playwright.admin-empty-tools.config.ts`: PASS, 1/1. It checked all three editors at 390px and 1280px, followed each link to the existing product-creation page, and observed no external request, app write, page error, console error, or horizontal overflow.
- Populated-fixture regression for `Admin content-management editors render across all design breakpoints`: PASS, 1/1 across the existing editor/width matrix, including an explicit assertion that the empty-state guidance stays absent when the synthetic tool exists.
- TypeScript initially reported TS1501 because `src/lib/release-workflow-source.test.ts:355` used `/s` while the already-dirty `tsconfig.json` targets `ES2017`. The pattern already uses `\s*` and has no dot wildcard, so `/s` was unnecessary. After removing only that flag, the existing release-workflow source tests passed 23/23 and `npx tsc --noEmit --pretty false` reported no errors. `package.json` defines `typecheck` as `tsc --noEmit`; no config or application runtime behavior changed.
- `rtk git diff --check`: PASS after final tracked-file edits; a separate trailing-whitespace scan of 11 task/code/document files found zero issues. The exact current paths and raw-byte hashes are reconciled in the receipt and independently re-audited as a separate governance check.

Review follow-up: independent code review found that the fixture guard did not reject `SEO_AUDIT_TEST_DATABASE_URL`. A new fixture test first failed because the fixture loaded when that URL alone was configured. The guard now rejects it, the test setup clears it between cases, and the focused suite passes 20/20. Both isolated admin browser configs explicitly clear this URL.

Independent source review completed with no unresolved Critical, Important, or Minor findings. The current-worktree receipt is refreshed and separately audited as a governance artifact; task ownership does not approve any path for release. Overall release readiness remains separate and partial.

## Boundaries

Local code and fixture validation only. No production database, `.env`, publishing, deployment, Git staging/commit/push, or business form submission.
