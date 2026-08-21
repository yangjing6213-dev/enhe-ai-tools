# Animation and Independent Review

## Review findings

| Priority | Finding | Resolution | Status |
| --- | --- | --- | --- |
| Important | Initial `useReducedMotion` could disagree between SSR and first hydration render when reduce was already enabled. | Removed the hook, retained hydration-safe media-query state, and added a pre-navigation reduce test with zero console/page errors. | CLOSED |
| Important | Early tests trusted data attributes without executing the real variants. | Added resolver tests for pointer, keyboard, and reduced targets, duration, easing, and transform presence. | CLOSED |
| Minor | Keyboard/reduced variants carried an identity transform and reduced motion reused pointer easing. | Non-pointer variants now omit transform; reduced motion is 80ms linear opacity-only. | CLOSED |
| Compatibility | Conditional unmount removed seven server-rendered category links. | Closed markup remains hidden/inert and exit animation completes before `hidden` is restored. | CLOSED |

## Motion craft verdict

- Cause and effect: desktop origin is tied to the trigger.
- Travel: 4px desktop and 12px mobile; no scale-from-zero.
- Timing: 190/230ms pointer, 100ms keyboard, 80ms reduced.
- Easing: restrained cubic curve for pointer/keyboard; linear for reduced motion.
- Performance: opacity and transform only; no layout animation, spring, bounce, blur,
  rotation, permanent `will-change`, or `transition: all`.
- Input and accessibility: pointer, keyboard, reduced motion, focus containment/return,
  modal semantics, outside close, and existing swipe close remain coherent.

`REVIEW_ANIMATIONS_VERDICT=PASS`

An independent read-only reviewer reported no critical issues. Its two important findings and
one minor finding are closed above, followed by focused, full-suite, build, and production
standalone reruns.
