# Phase 2C.1 public shell wiring

Status: PASS

The existing `PublicSiteChrome` now renders the approved candidate Header and Footer for the Chinese and English public shell. The adapter is server-side and derives the current pathname from middleware plus the signed header session snapshot.

Changed source boundaries:

- `src/components/public-site-chrome.tsx`: public shell adapter; existing structured data, settings, support widget, and page children remain in place.
- `src/components/redesign/enhe-production-public-shell.tsx`: typed locale copy, nav, language switch, guest/account state, and server-derived admin state.
- `src/components/redesign/enhe-redesign-header.tsx`, `enhe-redesign-mobile-menu.tsx`, `navigation.ts`, and `types.ts`: approved navigation and exactly two AI Skill children.
- `src/middleware.ts`: forwards the request pathname for exact locale alternates.
- `src/styles/redesign/shell.css`: production-safe direct shell selectors, dropdown styles, focus styles, and reduced-motion rules; preview scope remains available only to the local preview route.

Verified behavior:

- Public Chinese and English routes use the redesign Header/Footer.
- The AI Skill dropdown contains only AI prompts and AI Skill.
- Guest navigation exposes login and no admin entry.
- Locale switches preserve the corresponding route, including listing and search routes.
- Existing private, order, auth, and admin layouts retain `SiteHeader`/`SiteFooter`.
- No production HTML contains the preview root or Preview/Candidate labels.
