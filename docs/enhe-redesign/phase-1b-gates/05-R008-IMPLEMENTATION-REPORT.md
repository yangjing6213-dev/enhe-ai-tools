R008_DESIGN_DECISION=REMOVE_FROM_GLOBAL_BEFOREINTERACTIVE
R008_STATUS=OPEN
R008_PHASE1B_GATE=BLOCKED
R008_REASON=BASELINE_DID_NOT_CONTAIN_MAIN_LOADER

# R-008 global external script decision and implementation evidence

## Current branch observation

At `START_HEAD=f49dd3886f6fff4d05b692c793757398dbc756fa`, `src/app/root-layout-shared.tsx` contains no `next/script` import, no ByteDance loader URL, no `ttzz-push-loader`, and no `beforeInteractive`. `<AnalyticsTracker />` remains present. The file is byte-identical to the redesign branch merge-base blob; consequently this branch has no legitimate root-layout deletion hunk to commit.

The local `next.config.ts` still contains a Report-Only CSP host allowlist for `https://lf1-cdn-tos.bytegoofy.com`. That host allowlist is not a script load and was not changed because the task authorizes only `root-layout-shared.tsx` plus one R-008 test file.

The local `main` branch is different: its root layout contains the loader, `next/script`, and `strategy="beforeInteractive"`; its historical `geo-brand-profile-source.test.ts` also positively asserts that loader. This is a branch-integration blocker, not evidence that the redesign branch removed it.

## TDD evidence

The new source-contract test is `src/lib/r008-external-script-source.test.ts`.

- RED: `R008_SOURCE_REF=main npm test -- src/lib/r008-external-script-source.test.ts` exited 1 as expected because the main root-layout source contains the ByteDance URL (1 failed test; the assertions report booleans and do not dump source text).
- GREEN: `npm test -- src/lib/r008-external-script-source.test.ts` exited 0 against the current redesign worktree (1/1 test).

The RED run uses the real `main` blob through `git show`; it does not edit or check out that branch. No replacement analytics script was introduced and `AnalyticsTracker` was not modified.

## Verification results

| command | observed result |
|---|---|
| `npm test -- src/lib/r008-external-script-source.test.ts` | exit 0; 1 file and 1 test passed |
| `npm run lint` | exit 0; ESLint completed without errors |
| `npm run typecheck` | exit 2; failed on existing missing modules/types: `@/components/product-video-player`, `normalizeMediaSrc`, `skills/ebos/skill-registry.json`, one implicit-any diagnostic, and `@/lib/tool-category-groups` |
| `npm test` | final post-hardening run failed: 7 failed assertions across 8 files, 1,141 tests passed; failures are existing SEO/content contracts or missing `tool-category-groups` resolution |
| `npm run build` | failed after successful `prisma generate`; Next compilation could not resolve `@/components/product-video-player` and `@/lib/tool-category-groups` |

These failures are recorded as baseline blockers and were not fixed because the task forbids unrelated source, dependency, schema, and package changes. Passing lint and the focused test are insufficient to close R-008.

## Gate decision

The current branch satisfies the static absence contract, but it does not contain a production-code deletion commit that can resolve the loader introduced on `main`, and the old positive test on `main` remains unaddressed. Under the fail-closed contract, `R008_STATUS=OPEN` and `R008_PHASE1B_GATE=BLOCKED`; the test is a merge-time regression guard, not a claim of closure.
