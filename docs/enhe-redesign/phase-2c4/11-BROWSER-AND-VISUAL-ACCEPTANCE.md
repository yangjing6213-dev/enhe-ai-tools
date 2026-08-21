# Browser and Visual Acceptance

## Browser matrix

- Matrix: 4 routes × 10 widths × 3 modalities = 120 cases.
- Matrix failures: 0.
- Full production Playwright gate: 185/185 passed.
- Root horizontal overflow: 0.
- Console errors: 0.
- Page errors: 0.
- Hydration errors: 0.

## Screenshots

All eight full-page PNGs were opened and visually inspected.

| File | Dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `en-rc-home-1440.png` | 1440×3864 | 441612 | `19a99711c9c72cb98a40d9f0d5d8ac9f7fdf0536b0fa8eec18d43904949e5597` |
| `en-rc-home-390.png` | 390×3649 | 173398 | `92f5d7d7f308f5f2a447e83a029e59bc90b0508e00cedf017102e141bb1c7489` |
| `en-rc-software-1440.png` | 1440×4448 | 229822 | `87ba7e14cab78070f7fa1359e66edac6e0ed0a046e5238d1f91e3b44e1977f00` |
| `en-rc-software-390.png` | 390×10475 | 321147 | `2a765321ac8c14093aa4fa321a1b9addeeab9f681455fd1c62388d7421e7ef4d` |
| `zh-rc-home-1440.png` | 1440×3728 | 421440 | `9f9cc752515220564431d3d6269d6e02e5a4a5b0bb735cbf41889d5ab04c4563` |
| `zh-rc-home-390.png` | 390×3449 | 169448 | `e9cb8cf90c47ad85bc616148cac2c991aaef89aa0a15a05ce9770fd18184969a` |
| `zh-rc-software-1440.png` | 1440×4435 | 214889 | `a4b42db2a8ac8c4fab28660a7f5d81ef5241fe66052c8e0767aa28c93e9a5ddb` |
| `zh-rc-software-390.png` | 390×10085 | 301399 | `13ecc6d4602dacc6d0c68bb5fef42d7d3dca0dd5e47630df23b74924c3d30fe8` |

The software images intentionally show synthetic local fixture text. Adjacent cards clipped by the existing horizontal product tracks are not root-page overflow; programmatic root overflow remained 0.

## Videos

| File | Stream | Duration | Bytes | SHA-256 |
| --- | --- | ---: | ---: | --- |
| `en-rc-mobile-flow-390.webm` | VP8, 390×844, 25 fps, no audio | 3.56 s | 313488 | `b9a4e8cb7fa00310adb4b917bd0c5c77fc3545c4f5411a0d11363aed786c66b5` |
| `zh-rc-mobile-flow-390.webm` | VP8, 390×844, 25 fps, no audio | 3.68 s | 271941 | `1b1bf112d95ab85f054ef94bd81a742d2e3dc76e558ffc6f4e7085b95035ecf0` |

Dense frame sheets confirmed product direction, bilingual mobile navigation, category Sheet motion, support suppression while the Sheet is open, and restoration after close. Bad files: 0. Duplicate hashes: 0.
