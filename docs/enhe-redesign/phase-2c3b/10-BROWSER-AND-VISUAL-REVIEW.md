# Browser and Visual Review

## Browser matrix

All 36 route/viewport combinations passed for six formal routes (`/`, `/en`, both software routes, and both page-2 routes) across 320 x 844, 390 x 844, 483 x 900, 484 x 900, 768 x 900, and 1440 x 900.

Verified in every applicable record:

- HTTP 200, visible H1/header/footer, first-frame transform `none`, no direct legacy fade.
- No root horizontal overflow, console error, or page error.
- Support remains fixed; compact mode is 44 x 44 with 52 px reserve through 483 px, and expanded mode starts at 484 px with 104 px reserve.
- Software pages show 12 products, four new releases, three featured products, and working pagination from a 25-record disposable fixture set.
- The mobile category panel remains fixed with no transformed ancestor.
- Mobile navigation, category, pagination, focus, keyboard, and support checks passed.

## Independent timeline

- Automatic review advance observed after 5100 ms.
- Focus changed `aria-live` from `off` to `polite` and stopped rotation.
- Focusout plus 6100 ms did not resume.
- Explicit continue resumed and restored `aria-live="off"`.
- Reduced motion did not auto-rotate across the equivalent 12000 ms check.

## Screenshots

| File | Pixel dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `zh-home-motion-hygiene-1440.png` | 1440 x 3728 | 445621 | `2ed917545f96def7089537652b00885e88ee3a5f8a44562a0360611f7e0ae599` |
| `zh-home-motion-hygiene-390.png` | 390 x 3449 | 184330 | `45c850a264fe0182371ffd4092fd6452df92b7ed8822b1d4c325f789f977a5a6` |
| `en-home-motion-hygiene-1440.png` | 1440 x 3864 | 459267 | `4048a402a30114c60ebf97d46e2fcdbe49e73b75db23f1cda1d94a694f690ea5` |
| `en-home-motion-hygiene-390.png` | 390 x 3649 | 191288 | `6ea45b2fefe4f582294629f682740eebd6a2135f733199049716ae87fd593bca` |
| `zh-software-motion-hygiene-390.png` | 390 x 9296 | 263144 | `2f9547a70014af58af2d6199c43b4020528ae1a2be411ba11e8e2cc8674f3b5b` |
| `en-software-motion-hygiene-390.png` | 390 x 9813 | 285460 | `bd795daea2e5ef1d6e1165ec59db9857516275257e5c07dfb27b067780b703c8` |

All six PNGs decoded successfully and were visually inspected. The Next.js portal was removed only from screenshot capture. No application state was altered by the capture harness. No Candidate/Preview UI label, support collision, clipped shell, blank band, or horizontal overflow was observed.

`BROWSER_MATRIX_RECORDS=36`

`SCREENSHOT_COUNT=6`

`BROWSER_AND_VISUAL_STATUS=PASS`
