# Build, test, and side-effect report

TYPECHECK_STATUS=BLOCKED_BASELINE_MISSING
BUILD_STATUS=BLOCKED_BASELINE_MISSING
FULL_TEST_STATUS=FAILED_EXISTING_BASELINE
FULL_TEST_RERUN_IN_PHASE_1B0=NO
TMP_SIDE_EFFECT_CONFIRMED=YES
TMP_DIRECTORY_PRESENT_AT_REVIEW=NO
SIDE_EFFECT_FIXED_IN_PHASE_1B0=NO

## Evidence boundary

This report uses the latest committed Phase 1B validation evidence at `ef9465b8c8b5010233f0117f5456bce347d499a4` plus read-only source/ref inspection. It does not rerun the full test suite, typecheck, or build.

The command contracts are `package.json:10` (`prisma generate && next build`), `package.json:13` (`tsc --noEmit`), and `package.json:23` (`vitest run`). `tsconfig.json:7,12,17-22` enables strict checking, JSON module resolution, the `@/* -> ./src/*` alias, and repository-wide TypeScript inclusion. `vitest.config.ts:5-8` has no global teardown and excludes only the normal defaults, E2E tests, and `.worktrees/**`.

## Typecheck failures

The latest committed result is exit code 2. It records all of the following missing modules or symbols plus one implicit-any diagnostic.

| missing module or symbol | static evidence | baseline trace | status |
|---|---|---|---|
| `@/components/product-video-player` | Imported by `src/app/tools/[slug]/page-shell.tsx:10`; the target file is absent from redesign and `feature/enhe-api-gateway`. | Present on local `main`; the original worktree has a different untracked variant. Production match is unknown. | `MISSING_CURRENT_BASELINE` |
| `normalizeMediaSrc` from `@/lib/media` | Imported and used at `src/app/tools/[slug]/page-shell.tsx:18,258`; current `src/lib/media.ts:1-30` exports no such function. | `main:src/lib/media.ts:23` contains the export. The original worktree has an uncommitted third media variant. Production match is unknown. | `MISSING_CURRENT_BASELINE` |
| `skills/ebos/skill-registry.json` | Imported by `src/lib/ebos/skills/__tests__/skill-registry.test.ts:4`; the JSON file is absent from redesign and the feature branch. | Present on local `main`. The TypeScript registry still exists, so this is a missing test/registry artifact, not proof of a production runtime defect. | `MISSING_CURRENT_BASELINE` |
| `@/lib/tool-category-groups` | Imported by `src/lib/public-content.ts:17`; the target file is absent from redesign and the feature branch. | Present on local `main`; the original worktree untracked file hash-matches the main blob. Production match is unknown. | `MISSING_CURRENT_BASELINE` |
| One implicit-any diagnostic | The corrected committed log records one diagnostic but does not preserve its file, line, symbol, or compiler text. | Cannot be attributed safely without a later focused typecheck on an approved authoritative baseline. | `UNLOCATED_IN_PRIOR_LOG` |

No missing item is reconstructed in this phase. Copying from `main` would be unsafe before production/source authority is resolved because `main`, redesign, and the dirty original worktree contain different variants.

## Build failures

The latest committed build result is exit code 1. `prisma generate` succeeded; Next compilation then failed to resolve exactly these modules:

| module | importer | baseline trace |
|---|---|---|
| `@/components/product-video-player` | `src/app/tools/[slug]/page-shell.tsx:10` | Missing on redesign/feature; present on `main`; production match unknown. |
| `@/lib/tool-category-groups` | `src/lib/public-content.ts:17` | Missing on redesign/feature; present on `main`; production match unknown. |

The historical July build-success record belongs to an earlier source tree. In particular, the reported `f3500dd...` tree predates the `tool-category-groups` import, so it cannot establish that the current redesign tree builds.

## Full-test failures

The last full run recorded 7 failed assertions across 8 files, with 1,141 passing tests, 599 passing suites, and 15 failed suites. The file count and suite count are different metrics.

| failed file | traceable to the known missing baseline? | evidence-based classification |
|---|---|---|
| `src/gateway/app.test.ts` | Not proven | No direct import of the four known missing artifacts. The committed log does not retain the failed assertion. |
| `src/lib/ai-geo-foundations-source.test.ts` | Not proven | Static source-contract test; no direct import of the known missing artifacts. |
| `src/lib/home-ai-news-label.test.ts` | Not proven | Source/copy contract; no direct import of the known missing artifacts. |
| `src/lib/public-content-canonical-slugs.test.ts` | Yes | Dynamically imports `@/lib/public-content` at lines 40 and 65; that module imports the missing `@/lib/tool-category-groups`. |
| `src/lib/public-content-db-fallback.test.ts` | Yes | Dynamically imports `@/lib/public-content` at line 42; that module imports the missing `@/lib/tool-category-groups`. |
| `src/lib/seo-followup-source.test.ts` | Not proven | Reads source text, including `public-content.ts`, but does not resolve its missing import. The assertion text is not retained. |
| `src/lib/site-audit-regressions.test.ts` | Not proven | No direct import of the four known missing artifacts; failed assertion details are unavailable. |
| `src/lib/ebos/skills/__tests__/skill-registry.test.ts` | Yes | Line 4 directly imports the absent `skills/ebos/skill-registry.json`. |

`Not proven` does not mean unrelated. It means the available log and static import graph are insufficient to attribute the failure without guessing.

## `tmp-ebos-optimized-redeploy-test` side effect

The unique source hit is:

```text
src/lib/ebos/post-launch/__tests__/optimized-page-redeploy-checker.test.ts:72
```

The test was introduced by commit `a529b905d3aaf55bbb022088a7e6de109ff44497`.

- Line 1 imports `mkdir` and `writeFile`; there is no `rm`/`rmSync`/`unlink` import.
- Line 72 uses `join(process.cwd(), "tmp-ebos-optimized-redeploy-test")`.
- Lines 73-76 create the nested directory and begin writing the two JSON fixtures; the second write ends at line 96.
- Lines 98-105 read and assert the generated data; the test ends at line 106.
- There is no `try/finally`, `afterEach`, `afterAll`, or removal call in the file.
- `.gitignore:1-19` does not ignore this directory, so a full run exposes the leak as an untracked worktree change.
- The prior command log records that the full suite recreated the same two-file directory three times. The R-008 focused test did not create it.

At this review point the directory is absent because the prior artifacts were moved outside the worktree. It will be recreated by the unchanged test on another full run.

## Minimal later repair

For the test side effect, change only:

```text
src/lib/ebos/post-launch/__tests__/optimized-page-redeploy-checker.test.ts
```

Use Node's system temporary directory:

```ts
const reportsRoot = await mkdtemp(join(tmpdir(), "enhe-ebos-optimized-redeploy-"));
try {
  // existing fixture writes and assertions
} finally {
  await rm(reportsRoot, { recursive: true, force: true });
}
```

This requires only `mkdtemp`/`rm` from `node:fs/promises` and `tmpdir` from `node:os`. The production reader already accepts an explicit `reportsRoot` at `src/lib/ebos/post-launch/optimized-page-redeploy-checker.ts:196-200`, so no production file needs to change. Adding the directory to `.gitignore` is not recommended because that would hide rather than remove the side effect.

For the build/typecheck baseline, the smallest candidate source set is:

```text
src/components/product-video-player.tsx
src/lib/media.ts
src/lib/tool-category-groups.ts
skills/ebos/skill-registry.json
```

That set must be selected from an approved authoritative baseline, not copied automatically from the dirty original worktree or local `main`. The five full-test files classified `Not proven` require their retained assertion output or later focused runs before a minimal repair scope can be named. No such repair is performed in Phase 1B.0.
