# Phase 2B.2R Clean Visual Evidence

## Capture gate

The four screenshots were regenerated from the development-only route using a temporary Playwright harness. The harness removed only the `nextjs-portal` development indicator from the screenshot page DOM immediately before capture; it did not edit application source, CSS, Next config, or Root Layout.

Final browser result:

```text
SCREENSHOT_PASS=zh-home-integration-1440.png
SCREENSHOT_PASS=zh-home-integration-390.png
SCREENSHOT_PASS=en-home-integration-1440.png
SCREENSHOT_PASS=en-home-integration-390.png
NEXT_DEV_INDICATOR_VISIBLE=NO
CLEAN_VISUAL_EVIDENCE=PASS
```

## Files

| File | Dimensions | Bytes |
|---|---:|---:|
| `screenshots/zh-home-integration-1440.png` | 1440 x 3846 | 462461 |
| `screenshots/zh-home-integration-390.png` | 390 x 3514 | 168024 |
| `screenshots/en-home-integration-1440.png` | 1440 x 3956 | 476393 |
| `screenshots/en-home-integration-390.png` | 390 x 3681 | 161591 |

## Visual and interaction checks

The harness verified both locales and both widths, including the header, hero, five-product showcase surface, review section, brand-value section, and footer. It also verified:

- no normal-viewport horizontal overflow;
- content remains present under a 200% zoom simulation;
- `focus-visible` is reachable by keyboard;
- reduced-motion prevents review auto-advance;
- the outer `LOCAL CANDIDATE` label appears exactly once;
- no candidate state label is rendered inside the homepage content;
- all document images are complete before capture.

The screenshots were independently viewed after capture. No Next.js development indicator is visible. `LOCAL CANDIDATE` remains intentionally visible only as the outer preview marker.

