# Reviews surface contrast evidence

## Before the fix

The reviews section had no production background or foreground boundary. It remained transparent over the legacy dark body gradient while its title and controls used near-black ink. This produced dark-on-dark content and no single valid solid-background contrast ratio.

The same missing boundary also left the page dependent on the legacy document canvas. The failure was cascade scope, not missing reviews content or accessible names.

## After the fix

The production scope now pins `.redesign-home-reviews` to `var(--enhe-page-bg)` and `var(--enhe-text)`, and pins the review controls to the same dark text token. The homepage data, review copy, card structure, and controls were not changed.

Final Playwright measurements:

| Locale | Viewport | Reviews surface | Reviews title/control contrast | Visible |
| --- | ---: | --- | ---: | --- |
| zh | 1440px | `rgb(253, 253, 253)` | `19.69:1` | yes; section y=1875px |
| zh | 390px | `rgb(253, 253, 253)` | `19.69:1` | yes; section y=1281px |
| en | 1440px | `rgb(253, 253, 253)` | `19.69:1` | yes; section y=1985px |
| en | 390px | `rgb(253, 253, 253)` | `19.69:1` | yes; section y=1449px |

The controls remain 44x44px and have accessible names. Keyboard focus, reduced-motion stability, and the signed user account-menu snapshot also passed in the final acceptance run.

