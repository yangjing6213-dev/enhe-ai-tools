# Motion and Cross-Module Acceptance

## Approved motion modules

### Category layer

- Pointer timing: 190 ms desktop, 230 ms mobile.
- Keyboard timing: 100 ms.
- Reduced-motion timing: 80 ms.
- Origin-aware presentation, single dialog, single focus trap, focus return, Escape close, outside close, and cleanup passed.

### Home product stage

- Pointer timing: 240 ms.
- Keyboard timing: 0 ms.
- Reduced-motion timing: 80 ms.
- Directional next/previous behavior, five-product SSR, accessible controls, and cleanup passed.

### Mobile navigation

- Drawer timing: 230 ms open / 190 ms close.
- Overlay timing: 180 ms open / 160 ms close.
- Keyboard timing: 100 ms.
- Reduced-motion timing: 80 ms.
- Directional drawer, focus containment/return, Escape close, outside close, and settled cleanup passed.

## Cross-module behavior

- Support trigger: 44×44 icon at widths up to 483 px; text presentation from 484 px.
- Category Sheet suppresses the mobile support launcher while active and restores it after close.
- Support-trigger intersection count: 0.
- Support-suppression residual count: 0.
- Review carousel timer: 5000 ms; resume delay: 6000 ms.
- Active modal-dialog maximum: 1.
- Active focus-trap maximum: 1.
- Relevant active animations after settle: 0.

Pointer, keyboard, and reduced-motion profiles all passed. `CATEGORY_LAYER_STATUS`, `HOME_PRODUCT_STAGE_STATUS`, `MOBILE_NAVIGATION_STATUS`, `SUPPORT_EXCLUSION_STATUS`, and `REVIEW_CAROUSEL_STATUS` are all `PASS`.

Accessibility closure: `ARIA_SELECTED_MISUSE_COUNT=0`, `FOCUS_RETURN_STATUS=PASS`, `BODY_SCROLL_LOCK_STATUS=PASS`, `ESCAPE_STATUS=PASS`, and `ARIA_LIVE_STATUS=PASS`.
