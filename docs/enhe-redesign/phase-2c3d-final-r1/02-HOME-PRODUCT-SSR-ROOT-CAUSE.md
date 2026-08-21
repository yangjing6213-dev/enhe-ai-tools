# Home Product SSR Root Cause

## Verified root cause

`EnheRedesignProductShowcase` server-prerendered the same initial state used by its interactive client model: `HOME_PRODUCTS[0]`. The remaining four products existed in the canonical data source but were created only after client-side state changes.

This was not a missing database row, locale mismatch, product-order error, or media failure. The server owner correctly rendered the component, but the component's initial render contract represented one interactive slide, not the complete no-JavaScript content set.

## RED evidence

- Runs: 3.
- Failed runs: 3.
- Routes: `/`, `/en`.
- Missing IDs per route: 4 (`infinitetalk`, `ai-voice`, `lumi-os`, `faceswap-studio`).
- Default visible product: `ultimate-edition`.

## Constraint

The interactive stage must remain a single visible/focusable product surface when JavaScript is enabled. Rendering five permanently hidden interactive slides would create duplicate semantics, focus targets, media requests, and hydration risk, so that approach was rejected.
