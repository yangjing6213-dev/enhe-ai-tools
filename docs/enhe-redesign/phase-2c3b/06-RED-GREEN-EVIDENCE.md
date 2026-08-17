# Red-Green Evidence

## Legacy formal-page fade

The source-contract and browser assertions were executed three consecutive times before production code changed. All three failed for the direct `.fade-in` wrapper on formal redesign routes. After removing only that wrapper, focused unit and Chromium checks passed.

## Review carousel accessibility

Tests were added first for focus entry, focusout beyond 6000 ms, explicit continue, live-region mode, explicit pause precedence, manual next/previous, visibility, reduced motion, and cleanup. The pre-fix state failed because focusout could clear the pause condition and the live region was permanently polite. The minimum focus-latch/live-state implementation then passed unit and browser checks.

## Reduced motion and transition hygiene

Tests were added before source changes for the missing product loading override, support launcher/spinner behavior, required token consumption, permanent `will-change`, and filter/brightness feedback. They failed on the old source and passed after the scoped CSS/component changes.

## Harness-only corrections

Two temporary visual-harness assumptions were corrected without production changes: a case-insensitive copy scan incorrectly matched ordinary lowercase review prose containing “preview”, and a reduced-motion timeline incorrectly waited for every lazy image. Both checks were narrowed to their actual acceptance contracts. A customer-support status locator was also scoped to its dialog after a strict-locator collision with an unrelated product-loading status. No product threshold, timer, timeout, or production behavior was relaxed.

`TDD_SEQUENCE=RED_THEN_GREEN`

`FAILURES_HIDDEN=NO`
