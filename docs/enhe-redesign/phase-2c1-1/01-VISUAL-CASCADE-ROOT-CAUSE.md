# Phase 2C.1.1 visual cascade root cause

Status: pre-fix diagnosis recorded before the implementation change.

## Verified DOM boundary

The candidate preview has a light root wrapper:

```tsx
<div className="enhe-redesign-preview" lang={locale}>
```

The production adapter rendered a fragment instead:

```tsx
<>
  <EnheRedesignPublicHeader ... />
  <div className="fade-in">{children}</div>
  <CustomerSupportWidget ... />
  <EnheRedesignPublicFooter ... />
</>
```

Therefore the production Header, the fade wrapper, the homepage sections, and the Footer had no production redesign root class. The existing root layout only controls the legacy visual-effect boundary; it does not provide a redesign canvas or typography boundary.

## Browser evidence before the fix

The formal routes were checked in the local development server at `http://127.0.0.1:3102/` and `/en` with Playwright at 1440x900 and 390x844. The same cascade was present in both locales.

| Element | Computed foreground | Resolved background | Contrast | Rect/visibility |
| --- | --- | --- | ---: | --- |
| Header | `rgb(255, 255, 255)` | `rgb(253, 253, 253)` | `1.02:1` | visible; 1440px header height 73px |
| ENHE AI brand | `rgb(255, 255, 255)` | `rgb(253, 253, 253)` | `1.02:1` | visible, but unreadable |
| Desktop nav text | `rgb(255, 255, 255)` | `rgb(253, 253, 253)` | `1.02:1` | visible at 1440px, unreadable |
| Login link | `rgb(255, 255, 255)` | `rgb(253, 253, 253)` | `1.02:1` | visible at 1440px, unreadable |
| Mobile menu button | `rgb(255, 255, 255)` | `rgb(253, 253, 253)` | `1.02:1` | visible at 390px, icon unreadable |
| Reviews section | `rgb(255, 255, 255)` | transparent over the body gradient | not a single solid-color ratio | visible, dark body canvas |
| Reviews title | `rgb(8, 8, 8)` | transparent over the body gradient | not a single solid-color ratio | visible, dark-on-dark |
| Reviews control | `rgb(8, 8, 8)` | transparent over the body gradient | not a single solid-color ratio | 44x44px, dark-on-dark |

The `.fade-in` element had `padding-top: 72px` on desktop. Its top began at y=73px and the hero began at y=145px, producing the empty dark band. At 390px the same legacy padding produced an observed approximately 68px gap before the hero.

Each measured element had an accessible name where applicable. The failure was visual cascade, not missing DOM or missing labels.

## CSS/source chain

1. `src/app/globals.css:64` sets `:root { color-scheme: dark; }`.
2. `src/app/globals.css:119-131` gives `body` the dark gradient and inherited `color: var(--foreground)`, which resolves to white.
3. `src/app/globals.css:1956-1958` gives the shared `.fade-in` wrapper `padding-top: 72px`. Its existing exceptions only recognize the legacy `.home-page-shell`; the new `.redesign-home-page` does not match that exception.
4. `src/components/public-site-chrome.tsx:58-66` renders the production shell without a redesign root wrapper and retains the shared `.fade-in` wrapper.
5. `src/styles/redesign/shell.css:127-132` sets the redesign Header background, but does not set its foreground color. `src/styles/redesign/shell.css:42-45` keeps Header links at `color: inherit`; inheritance therefore remains body white.
6. `src/styles/redesign/home.css:381-384` defines the reviews section without a background or foreground boundary. Its title at `393-400` and controls at `518-531` explicitly use near-black text, which is correct on the approved light canvas but incorrect over the inherited dark body canvas.

The stylesheet import order is not the primary cause: the public layouts import `globals.css` first and redesign styles afterwards. The relevant redesign rules either omitted the inherited foreground/background boundary or deliberately used `color: inherit`; no later generic selector had to win over an explicit redesign color.

## Root cause

The Phase 2C.1 production wiring copied the candidate components and CSS selectors but not the candidate's light root scope. This left the new shell and homepage mounted directly in the legacy dark document context. The missing production root boundary caused the Header and mobile controls to inherit white ink, the reviews section to remain transparent over the dark body, and the old `.fade-in` padding to survive as a blank band.

This is a production adapter/CSS scope defect. It is not caused by RootDocument, authentication, metadata, the homepage data, the review content, or the disabled legacy visual-effect components.

## Minimal-fix decision

The minimal fix is to add a production-only public-shell root class around the existing PublicSiteChrome output, give that scope the approved page background/ink/light color scheme, explicitly neutralize only the shared `.fade-in` top padding inside that scope, and scope the reviews surface to the same light tokens. No `!important`, inline style, globals.css change, root-layout change, content change, or preview change is required.
