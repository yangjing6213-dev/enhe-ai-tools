# SSR and Hydration Evidence

## No-JavaScript matrix

- Routes: `/`, `/en`.
- Widths: 320, 390, 768, 1440.
- Cases: 8.
- Failures: 0.
- Product IDs: 5 unique IDs in canonical order.
- Header, footer, H1, product links, and root overflow checks: pass.
- Initial product media: only `ultimate-edition`.

## JavaScript-enabled hydration

- Cases: 2.
- `<noscript>` descendants in the live DOM: 0.
- Current interactive product layers: 1.
- Focusable current product CTA: 1.
- Next-product transition: pass.
- Console/page/hydration errors: 0.
- Additional hidden product media requests: 0.

## Layout stability

- SSR product fallback CLS delta: `0` for `/` and `/en`.
- A separate full-page diagnostic observed `0.0010843364072212537` on the English Hero H1 due to a 2px font-position shift; source attribution placed it outside `.redesign-home-products`, so it is not counted as fallback/hydration displacement.

The fallback is content-only progressive enhancement. It does not add animation, hidden media, client state, or a second interactive surface.
