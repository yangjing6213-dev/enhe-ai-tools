# Reduced-Motion Coverage

## Product stage

Under `prefers-reduced-motion: reduce`, product-state changes use a 1 ms opacity transition, the loading state remains at full opacity, and loading no longer scales. Required content remains immediately visible.

## Review carousel

Automatic rotation remains disabled under reduced motion. Review transitions resolve immediately and previous/next/pause controls remain usable.

## Customer support

- The launcher no longer performs a hover lift under reduced motion.
- Fixed positioning, 44 x 44 compact size, safe-area offsets, 52/104 px exclusion reserves, and the 483/484 breakpoint are unchanged.
- The submit button no longer animates brightness/filter.
- The loading spinner becomes a static icon under reduced motion, while the visible submission status text remains present.

No new reduced-motion-triggered behavior, keyframes, route motion, category motion, product-stage prototype, or navigation-drawer animation was added.

`REDUCED_MOTION_PRODUCT_STATUS=PASS`

`REDUCED_MOTION_REVIEW_STATUS=PASS`

`REDUCED_MOTION_SUPPORT_STATUS=PASS`
