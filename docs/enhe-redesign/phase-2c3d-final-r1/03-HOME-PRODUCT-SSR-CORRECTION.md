# Home Product SSR Correction

## Implementation

The existing component now emits a semantic `<noscript><ol>` generated directly from the canonical `HOME_PRODUCTS` array. Each item contains the product ID, localized name, localized description, and localized detail link.

## Progressive enhancement model

- JavaScript disabled: the canonical five-product list is usable and linkable.
- JavaScript enabled: the browser does not create descendant elements from the `<noscript>` fallback; the existing one-slide interactive stage remains the only product UI.
- Media: the fallback contains no images or videos, so it cannot request hidden product media.
- Data/order: both fallback and interactive stage use the same `HOME_PRODUCTS` source.

## Result

- Canonical product IDs: 5/5 on both locales and all tested widths.
- Order match: yes.
- Default visible stage: `ultimate-edition`.
- Duplicate interactive product UI: 0.
- Duplicate focusable product CTA: 0.
- Additional hidden media requests: 0.
- Hydration errors: 0.

No Server wrapper, data clone, new dependency, or speculative abstraction was needed.
