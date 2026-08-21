# Category and Support Correction

## Implementation

The category root now publishes `data-layer-rendered` from the existing lifecycle state. A mobile-only production-shell rule hides the closed support widget while that value is true.

The rule is deliberately narrow:

- Mobile category layer only (`width < 768px`).
- Rendered lifecycle, including opening/open/closing/reopen.
- Closed launcher only (`data-support-open="false"`).
- Native `display: none`; no support-position animation or replacement geometry.

## Verified behavior

- While category active: support visible=no, focusable=no, rectangle area=0.
- Category layer owns the previous support hit point=yes.
- After close or route unmount: support restores to its exact baseline rectangle=yes.
- Mobile-to-desktop resize while active: category becomes nonmodal and support restores=yes.
- Body scroll lock, Escape close, focus return, and single-modal/focus-trap contracts pass.

## Unchanged contracts

- Default support position/size: unchanged.
- Support token: unchanged.
- 483/484 breakpoint: unchanged.
- Unified support exclusion geometry: unchanged.
- D1 category animation parameters: unchanged.
