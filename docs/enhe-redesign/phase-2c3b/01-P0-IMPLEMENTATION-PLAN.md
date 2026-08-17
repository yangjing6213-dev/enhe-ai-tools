# Phase 2C.3B P0 Implementation Plan

## Scope lock

This plan applies the Phase 2C.3A findings only. It does not reopen the repository-wide motion audit, add motion opportunities, create a prototype, or implement the three selected Phase 2C.3C targets.

The controlling carousel contract is the detailed Phase 2C.3B accessibility contract: focus entry latches rotation off, focusout does not resume it, and only the explicit resume control clears that latch. This resolves the contradictory shorthand in the input that mentions focusout auto-resume.

## Motion personality

- Purposeful: motion communicates state or navigation only.
- Calm: no replacement page entrance or decorative loop is introduced.
- Interruptible: user pause and focus pause override timers.
- Accessible: reduced motion removes nonessential spatial movement while preserving visible state and controls.

## P0-A — remove the production page fade

Verified source:

- `src/components/public-site-chrome.tsx:70` wraps every formal redesign page body in `.fade-in`.
- `src/app/globals.css:1956-1958` gives `.fade-in` a `0.45s` opacity/translate entrance.
- Historical/private and preview rules also use `.fade-in`; those are outside this removal.

Implementation:

1. Add source-contract and Playwright assertions for `/`, `/en`, `/software`, and `/en/software`.
2. Record three consecutive expected RED runs against the current wrapper.
3. Remove only the `.fade-in` wrapper emitted by `PublicSiteChrome`; keep the production root and support widget order unchanged.
4. Do not globally delete `.fade-in`, add a replacement transition, or alter fixed-layer positioning/z-index.

Verification:

- Formal pages have no direct `.fade-in` body wrapper.
- First-frame H1/core content computes to opacity `1` and transform `none`.
- `getAnimations()` contains no legacy `450ms` page entrance.
- Formal route, locale, page-2, SSR, and category navigation remain immediately available.
- The software category overlay/panel remains viewport-fixed and outside a transformed containing block.

## P0-B — align review rotation with focus and live-region rules

Verified source:

- `src/components/redesign/home/EnheRedesignExperienceReviews.tsx:58` exposes only a user-facing `isPaused` state.
- The effect starts the `5000ms` interval at line 126 and the `6000ms` manual-resume timeout at line 143.
- Current focusout handling is installed at lines 220-221 and clears/resumes the focus pause.
- The review track is permanently `aria-live="polite"` at line 259.

Implementation:

1. Add failing state-machine tests before changing production code.
2. Add the minimum state/ref distinction for active rotation, explicit user pause, and focus-pause latch.
3. Focus entry clears both interval and pending manual-resume timeout and sets the latch.
4. Focusout leaves the latch set and does not resume.
5. Explicit resume clears explicit pause and focus latch, then restarts the interval when visibility and reduced-motion permit.
6. Keep `REVIEW_AUTO_INTERVAL_MS=5000` and `REVIEW_MANUAL_RESUME_MS=6000` unchanged.
7. Bind live-region mode to rotation state: `off` while rotating, `polite` while paused/manual.
8. Preserve pointer, visibility, keyboard, unmount cleanup, order, copy, stars, and SSR content.

Verification:

- Fake-timer/component tests cover initial rotation, focus entry, focusout beyond 6000ms, explicit resume, explicit pause precedence, manual navigation, visibility, reduced motion, and cleanup.
- Browser checks repeat the focus/latch/live-region timeline on both locale home routes.

## P0-C — complete reduced-motion coverage

Verified source:

- `src/styles/redesign/home.css:282-294` transitions product opacity/transform and scales its loading state.
- The existing reduced-motion block begins at `src/styles/redesign/home.css:606` but does not override product loading scale.
- `src/components/customer-support-widget.tsx:302` rotates a visual loading icon.
- The launcher has a hover lift at `src/components/customer-support-widget.tsx:379`; the redesign reduced-motion block at `src/styles/redesign/shell.css:720` does not suppress it.
- Review automatic rotation already checks `prefers-reduced-motion`; manual controls remain available.

Implementation:

1. Under reduced motion, make product state changes immediate/short-opacity only and remove loading scale.
2. Suppress support launcher lift without changing its fixed geometry, breakpoints, safe area, or exclusion tokens.
3. Keep support submission status text and a static loader icon while stopping pure visual spin.
4. Keep the review timer disabled under reduced motion and retain manual controls.

Verification:

- Source tests and browser emulation assert product transform removal, static support loading indication, no launcher lift, review timer pause, and unchanged support geometry.

## P0-D — transition and performance hygiene

Verified source:

- `src/styles/redesign/tokens.css:33-34` has fast/panel timing only.
- `src/styles/redesign/home.css:448` hard-codes `240ms ease` for review movement.
- `src/styles/redesign/home.css:449` permanently applies `will-change: transform, opacity` to every review card.
- `src/components/customer-support-widget.tsx:299` transitions filter/opacity and applies hover brightness.

Implementation:

1. Add only the consumed tokens `--enhe-motion-standard: 240ms` and `--enhe-ease-ui-move: cubic-bezier(0.4, 0, 0.2, 1)`.
2. Consume both tokens in the review transition.
3. Remove permanent review `will-change` entirely.
4. Replace support submit filter/brightness feedback with opacity-only transition; preserve business state.

Verification:

- No hard-coded review `240ms`, bare review `ease`, permanent review `will-change`, support filter transition, or support brightness hover remains.
- Strict `review-animations` review checks purpose, frequency, easing, duration, origin, interruptibility, performance, accessibility, cohesion, tokens, reduced motion, pointer gating, and cleanup before broad gates.

## Fixed Phase 2C.3C inputs — not implemented here

1. `CATEGORY_LAYER_AND_MOBILE_SHEET`
2. `HOME_PRODUCT_STAGE_TRANSITION`
3. `MOBILE_NAVIGATION_DRAWER`

## Commit and gate order

1. Legacy fade RED x3, minimal fix, focused green, commit 1.
2. Review APG RED, minimal state-machine fix, focused green, commit 2.
3. Reduced-motion/token/will-change/support hygiene tests and fix, focused green, commit 3.
4. Strict animation review; correct any finding before broad validation.
5. Focused matrix, `npm ci`, lint, typecheck, default full suite twice, shuffled full suite with seed `21101`.
6. Browser matrix and six full-page screenshots.
7. Disposable PostgreSQL 16 build and traced standalone verification; guaranteed cleanup.
8. Evidence documentation and docs-only commit 4; create docs-only ZIP.

No new dependency, Motion, GSAP, WAAPI, keyframe, deployment, push, remote mutation, production data access, or prototype is authorized.
