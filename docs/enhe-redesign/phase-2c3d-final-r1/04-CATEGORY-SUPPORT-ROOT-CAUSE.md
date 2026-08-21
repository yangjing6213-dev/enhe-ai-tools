# Category and Support Root Cause

## Verified root cause

The category interaction has two state dimensions:

- `open` controls the active interaction/ARIA state.
- `layerRendered` keeps the overlay and panel mounted until exit animation completion.

The support launcher had no ownership rule tied to that rendered lifecycle. During mobile opening, open, closing, or rapid reopen, the 44×44 closed launcher remained visible and focusable under the rendered category layer. At 390×844 Keyboard reopen, its entire rectangle intersected the category surface (`44 × 44 = 1936 px²`).

## Why z-index was not the fix

Changing stacking order would leave one control visually or interactively competing with the modal surface. It would not remove the launcher's hit target, tab stop, or accessibility exposure. The category sheet owns the mobile interaction while it is rendered; the background launcher must therefore be temporarily unavailable.

## RED evidence

- Runs: 3.
- Failed runs: 3.
- Routes: `/software`, `/en/software`.
- Intersection per failed route: `1936 px²`.
