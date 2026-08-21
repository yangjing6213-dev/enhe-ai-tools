# Cross-Module Interaction Matrix

## Main browser matrix

- Routes: `/`, `/en`, `/software`, `/en/software`.
- Widths: 320, 390, 480, 483, 484, 767, 768, 769, 1024, 1440.
- Modalities: pointer, keyboard, reduced motion.
- Main matrix cases: 120.
- Failed: 0.

## Category/support matrix

- Routes: 2.
- Mobile widths: 320, 390, 480, 483, 484, 767.
- Modalities: pointer, keyboard, reduced motion.
- Cases: 36.
- Failed: 0.
- Opening/open/closing/reopen support suppression: pass.
- Close/Escape/route-unmount restoration: pass.
- Resize to desktop while active: pass.

## Cross-module ownership

- Product stage plus mobile navigation preserves latest product state: pass.
- Category layer plus mobile navigation keeps at most one modal: pass.
- Maximum active modal dialogs: 1.
- Maximum active focus traps: 1.
- Body scroll lock cleanup: pass.
- Focus return: pass.

## Stress

- Category interruption/reopen: 30/30.
- Product latest-intent: 30/30.
- Mobile navigation close/resize: 30/30.
- Cross-module product/drawer flow: 20/20.
- Category/support reopen lifecycle: 30/30.
