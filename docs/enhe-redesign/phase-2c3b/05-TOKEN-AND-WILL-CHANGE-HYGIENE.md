# Token and Will-Change Hygiene

## Consumed tokens

Only two requested tokens were added, both with immediate production consumers:

- `--enhe-motion-standard: 240ms`
- `--enhe-ease-ui-move: cubic-bezier(0.4, 0, 0.2, 1)`

The review-card transition consumes both. The previous hard-coded `240ms ease` was removed.

## Performance and feedback cleanup

- Permanent `will-change: transform, opacity` was removed from review cards.
- Customer-support submit feedback now uses opacity rather than filter/brightness animation.
- No layout property, support position, support exclusion token, route, or pagination animation was introduced.
- No drawer, product-prototype, stagger, spring, or speculative token was added.

## Source-diff blocker scan

- `transition: all`: 0
- new `ease-in` UI entrance: 0
- new duration over 300 ms: 0
- `scale(0)`: 0
- animated width/height/margin/padding/top/left: 0
- permanent `will-change`: 0
- new keyframes or infinite decorative loops: 0
- new Motion/GSAP/WAAPI use: 0

`REVIEW_HARDCODED_240MS_REMOVED=YES`

`REVIEW_BARE_EASE_REMOVED=YES`

`PERMANENT_REVIEW_WILL_CHANGE_REMOVED=YES`

`SUPPORT_FILTER_TRANSITION_REMOVED=YES`
