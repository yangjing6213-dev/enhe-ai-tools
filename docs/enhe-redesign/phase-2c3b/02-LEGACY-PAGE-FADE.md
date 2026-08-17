# Legacy Page Fade Closure

## Verified source

The formal redesign shell emitted a direct `.fade-in` wrapper from `src/components/public-site-chrome.tsx`. The inherited global rule in `src/app/globals.css` applied `fade-in 0.45s ease both`, making the first formal page frame depend on a legacy opacity/translate entrance.

## Minimal fix

Only the wrapper class emitted by `PublicSiteChrome` was removed. The production root, child order, customer-support widget, fixed-layer geometry, global historical rule, private/auth/admin pages, and preview specimens were not changed. No replacement route animation was added.

## TDD and browser proof

- Three consecutive combined source/browser RED runs failed for the existing formal-route wrapper, as expected.
- Formal `/`, `/en`, `/software`, and `/en/software` pages now have no direct legacy wrapper.
- First-frame H1/core content computes to opacity `1` and transform `none`.
- `getAnimations()` has no legacy 450 ms formal-page entrance.
- Formal locale, route, and pagination navigation does not wait for an entrance animation.
- The software mobile fixed layer remains viewport-anchored and has no transformed containing ancestor.

`LEGACY_PAGE_FADE_RED_STATUS=EXPECTED_FAIL`

`LEGACY_PAGE_FADE_RED_RUNS=3`

`LEGACY_PAGE_FADE_RED_FAILED=3`

`LEGACY_PAGE_FADE_GREEN_STATUS=PASS`

`LEGACY_PAGE_FADE_STATUS=REMOVED_FROM_REDESIGN_PRODUCTION`
