# Header contrast evidence

## Before the fix

The production header had inherited white ink from the legacy dark document context while its redesign surface resolved to `rgb(253, 253, 253)`. Playwright measured `rgb(255, 255, 255)` on `rgb(253, 253, 253)`, or `1.02:1`, for the header, brand, desktop navigation, login link, and mobile-menu icon. The elements were present and named, but visually unreadable.

## After the fix

The production adapter now provides `.enhe-redesign-production`. That scope sets the approved page background, dark text token, and `color-scheme: light`; the header is explicitly scoped to the same text token.

The final production acceptance measured the following for both `/` and `/en`:

| Surface | Foreground | Background | Contrast | Visibility |
| --- | --- | --- | ---: | --- |
| Header | `rgb(8, 8, 8)` | `rgb(253, 253, 253)` | `19.69:1` | visible; y=0, height=73px |
| ENHE AI brand | `rgb(8, 8, 8)` | `rgb(253, 253, 253)` | `19.69:1` | visible and named |
| Desktop navigation/login | `rgb(8, 8, 8)` | `rgb(253, 253, 253)` | `19.69:1` | visible at 1440px |
| Mobile-menu button | `rgb(8, 8, 8)` | `rgb(253, 253, 253)` | `19.69:1` | visible at 390px |

The desktop navigation is visible at 1440px. At 390px the mobile menu is visible, the desktop navigation is hidden, opening and Escape-closing the menu both pass, and there is no horizontal overflow.

