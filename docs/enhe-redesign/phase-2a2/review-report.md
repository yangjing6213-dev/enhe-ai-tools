# ENHE Phase 2A.2 Homepage Candidate Review Report

Date: 2026-08-14

## Final receipt

```text
PHASE_2A_2_STATUS=PASS
PHASE_2A_2_VISUAL_STATUS=PASS
PHASE_2A_2_BUILD_STATUS=PASS
HOMEPAGE_CANDIDATE_STATUS=READY_FOR_REVIEW
HOMEPAGE_CANDIDATE_MERGE_STATUS=BLOCKED_BY_HEARTBEAT_R008_AND_REVIEW
WORKTREE_PATH=C:\Users\HU\Documents\New project 2\.worktrees\enhe-public-shell-candidate-v1
BRANCH=codex/enhe-public-shell-candidate-v1
START_HEAD=878a4bb
HERO_COMMIT=bf74792
PRODUCT_SHOWCASE_COMMIT=c533b4f
REVIEWS_COMMIT=0ed0e4f
REGRESSION_TEST_COMMIT=6a7c470
DOCS_COMMIT=FIFTH_COMMIT_CREATED_AT_HANDOFF
FINAL_HEAD=FIFTH_COMMIT_CREATED_AT_HANDOFF
HOME_CANDIDATE_RED_STATUS=EXPECTED_FAIL
HOME_CANDIDATE_GREEN_STATUS=PASS
LOCKED_COPY_MATCH=YES
CTA_ROUTES=/software;/en/software
PRODUCT_COUNT=5
PRODUCT_ORDER_MATCH=YES
PRODUCT_AUTO_ROTATION=NO
REVIEW_COUNT=5
REVIEW_LABEL=Example experience feedback / approved Chinese example label
REVIEW_AUTO_INTERVAL_MS=5000
REVIEW_MANUAL_RESUME_MS=6000
REDUCED_MOTION_AUTO_TIMER=NO
HERO_TESTS=3
PRODUCT_SHOWCASE_TESTS=7
REVIEWS_TESTS=6
REDUCED_MOTION_TESTS=1 source assertion plus browser verification
PREVIEW_TESTS=10
FOCUSED_CANDIDATE_TESTS=36
FULL_TESTS=441 files passed, 9 skipped; 2129 tests passed, 90 skipped
BUILD=PASS
PREVIEW_DEV_HTTP_STATUS=200
PREVIEW_PRODUCTION_EXPECTED_STATUS=404
PREVIEW_PRODUCTION_ACTUAL_STATUS=404
PREVIEW_NOINDEX=YES
PREVIEW_NOFOLLOW=YES
PREVIEW_IN_SITEMAP=NO
SCREENSHOT_COUNT=4
SCREENSHOT_WIDTHS=1440,390
SCREENSHOT_DIMENSIONS=zh 1440x3846; zh 390x3514; en 1440x3956; en 390x3681
ROOT_LAYOUT_CHANGED=NO
GLOBALS_CSS_CHANGED=NO
PRODUCTION_HOME_CHANGED=NO
PRODUCTION_NAVIGATION_CHANGED=NO
PRODUCTION_SITEMAP_CHANGED=NO
R008_CHANGED=NO
PACKAGE_CHANGED=NO
LOCKFILE_CHANGED=NO
PRISMA_CHANGED=NO
MIDDLEWARE_CHANGED=NO
PRODUCTION_DATA=NO
WORKTREE_CLEAN=YES after the fifth commit
UNAUTHORIZED_PATHS=NONE
PUSHED=NO
RESULT_ZIP_PATH=C:\Users\HU\Desktop\ENHE-Phase2A.2-Homepage-Candidate-Results.zip
RESULT_ZIP_SIZE=RECORDED_IN_HANDOFF
RESULT_ZIP_SHA256=RECORDED_IN_HANDOFF
RESULT_ZIP_FILE_COUNT=RECORDED_IN_HANDOFF
ZIP_BAD_CRC=NO
```

The documentation commit hash cannot be written into the tree that creates that same hash without changing the hash. The symbolic `FIFTH_COMMIT_CREATED_AT_HANDOFF` values above are intentional; the exact fifth hash is supplied in the handoff and verified by `git log`.

## Implemented candidate

- A server-rendered, guarded `/redesign-preview/home` composition now connects the approved header, bilingual hero, manual five-product stage, five-record example review carousel, brand-value block, and approved footer.
- The product stage starts at `01 / 05`, wraps manually, has synchronized copy/media/detail links, uses local approved media, and has no automatic rotation or audio.
- The review island starts at the approved middle record, keeps all five articles in the DOM, labels each record as example feedback, uses 5000 ms automatic rotation, 6000 ms manual-resume delay, pause guards, pointer drag, keyboard controls, cleanup, and no reduced-motion automatic timer.
- Inactive review articles use `aria-hidden`; controls have visible focus states and at least 44 px targets.
- The page is candidate-only. It does not add production navigation, sitemap entries, structured review data, database reads, API calls, orders, payments, downloads, OAuth, or user data.

## Locale and routing evidence

The existing middleware handles `?locale=zh|en` by redirecting 308, removing the query, setting the locale cookie, and forwarding `x-enhe-locale`. The candidate page resolves the explicit query first and uses the middleware header fallback. Middleware itself was not changed. Invalid values resolve to Chinese in the candidate helper. The browser matrix verified both final localized pages after this redirect behavior.

The preview route has noindex, nofollow, noarchive, and noimageindex metadata and calls `notFound()` in production. A temporary nested standalone production server returned HTTP 404 for the preview route; the temporary server and its log were stopped and removed. The preview layout has standalone `<html><body>` tags because this repository has no top-level App Router layout; no production layout was modified.

## TDD and automated verification

The first candidate test runs produced the expected module/route RED states. Minimal implementation slices then produced GREEN results. Later verification also caught a real App Router page-export/type failure and the missing standalone preview document wrapper; both were fixed within the allowed candidate scope and rechecked.

Fresh commands and results:

- `rtk npm run lint`: PASS.
- `rtk npm run typecheck`: PASS.
- Five-file candidate suite: 5 files, 36 tests, PASS.
- `rtk npm test`: 441 files passed, 9 skipped; 2129 tests passed, 90 skipped.
- `rtk git diff --check`: PASS.
- The full suite emitted existing test-environment warnings for missing Baidu token and SMTP configuration; these tests passed and no candidate change was made for them.

## Browser and visual verification

Playwright checked Chinese and English at 1440x900 and 390x844. Each matrix cell returned 200, contained one exact H1, the expected locale root, the correct CTA route, five products, five reviews, one active review, complete localized footer copy, no horizontal overflow, loaded product media, empty console-error/page-error collections, and 44 px or larger interactive targets.

Interactions verified:

- Product next/previous wraparound through all five records, ArrowRight keyboard movement, synchronized content, and image-error fallback.
- Review automatic movement after 5000 ms.
- Manual interaction remains stable during the 6000 ms resume delay and then resumes on the following 5000 ms interval.
- Pause remains stable; continue resumes; ArrowLeft changes the record; pointer drag changes the record.
- Reduced motion leaves manual controls available and prevents automatic movement.

The four inspected full-page screenshots contain header, hero, product stage, reviews, value block, and footer with no mixed locale or mobile clipping:

- `screenshots/zh-home-candidate-1440.png`: 1440x3846, 521527 bytes.
- `screenshots/zh-home-candidate-390.png`: 390x3514, 175849 bytes.
- `screenshots/en-home-candidate-1440.png`: 1440x3956, 529967 bytes.
- `screenshots/en-home-candidate-390.png`: 390x3681, 170969 bytes.

## Build evidence

Docker Linux Engine was available. A temporary no-volume `postgres:16-alpine` container applied all 49 existing migrations without seed data. `npm run build` then passed, including Next.js compilation, type checking, and static page generation. The temporary database container was removed. The first build attempt correctly exposed an invalid extra page export; the helper was moved to the allowed `src/lib/redesign/home` namespace, and the second build passed.

The build emitted the existing Next workspace-root warning because multiple lockfiles exist above the checkout. Package and lockfiles were not changed. The production guard was verified using the nested standalone output created by this workspace-tracing layout.

## Approved local media hashes

```text
ultimate-edition.png 3999F505428FB8B1DDE77B8A1D0E9A1660F7CCC9DEA7D327D2B4115FAF7661E0
infinitetalk.png     221FC48890B7073A9325581C43E0168E11EAD8DDE3A7C4224523381AF46ED55E
ai-voice.png         3AB6C5740F7FFB7124730760D6195B3365C43390C4655384EABC0C49185C7A04
lumi-os.png          B5214D584E148F7E5E7E33A405BD440B6EFC6A0B8EAA1A4FA878736B630FF888
faceswap-studio.png  069FDE5F1C96836B8C9E5737982FBC7063F38E08531A487E7A826C2A8AEE07C7
```

## Exact-commit sequence note

The required five commit messages and order are preserved. The Task 1 accessibility correction was carried into the next still-required commit; Task 2 quality corrections were carried into the review commit; and the final review/locale/layout corrections plus regression updates were carried into the regression-test commit. This avoided amend/history rewrite while keeping the final tree verified. The fifth commit contains the documentation, report, checklist, allowed-path manifest, and four screenshots.

## Merge and non-actions

This is a review-ready isolated candidate, not a production merge authorization. The independently gated Heartbeat/R-008 and broader scope-review conditions remain outside this task and were not bypassed. No push, deployment, production database access, production data mutation, middleware edit, sitemap edit, package edit, Prisma edit, or remote change was performed.
