# Performance and Animation Cleanup

## Traced Standalone metrics

| Surface | CLS delta | Active animations after settle | Detached active animations |
| --- | ---: | ---: | ---: |
| Category Layer | 0 | 0 | 0 |
| Product Stage | 0 | 0 | 0 |
| Mobile Navigation | 0 | 0 | 0 |
| SSR Product Fallback | 0 | 0 | 0 |

- Threshold for every required CLS delta: `<= 0.001`.
- Animated properties: `opacity`, `transform` only.
- Support suppression residual count after close/unmount: 0.
- `MOTION_LAYOUT_SHIFT_STATUS=PASS`.
- `ANIMATION_CLEANUP_STATUS=PASS`.

## Harness diagnosis

The first production performance run exposed two test-harness defects:

1. User-triggered drawer shifts marked `hadRecentInput=true` were incorrectly summed as CLS.
2. `sitemap.xml` was read through an HTML `body` locator and timed out because XML has no HTML body.

The final gate keeps the same `0.001` threshold and formal-route/prototype assertions. It filters recent-input shifts per the Layout Instability API and reads text/XML from the navigation response. The corrected performance file passes 4/4 and the combined production suite passes 185/185.
