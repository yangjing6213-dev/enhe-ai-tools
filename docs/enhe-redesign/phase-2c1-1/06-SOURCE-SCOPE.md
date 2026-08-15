# Source scope and non-goals

## Changed in the code commit

`574b674 fix(ui): restore production shell contrast and spacing` contains exactly four files:

- `src/components/public-site-chrome.tsx` — wraps the existing chrome output in `.enhe-redesign-production` without changing its children or data.
- `src/styles/redesign/shell.css` — adds the production light canvas/ink boundary, English font boundary, header ink scope, box sizing, and production-only `.fade-in` top-padding reset.
- `src/styles/redesign/home.css` — scopes the already-approved homepage and reviews surface/control colors to the production boundary.
- `src/components/redesign/production-visual-regression.test.ts` — source-level RED/GREEN regression coverage for the missing production root and visual tokens.

## Explicitly unchanged

- `src/app/globals.css` and the root layout.
- Homepage copy, product data, review data, media, and database records.
- Metadata, canonical URLs, hreflang, sitemap, robots, route guards, middleware, authentication, payment, OAuth, download, and product-detail behavior.
- Preview routes and candidate-only source assets.
- Package manifests, lockfiles, Prisma schema/migrations, and deployment configuration.
- Legacy visual-effect implementation outside the production redesign scope.

No `!important`, inline style, or selector-wide legacy rewrite was added. The production wrapper intentionally covers the existing `PublicSiteChrome` public surface so all wired public routes receive one coherent canvas boundary; it does not alter their content or route semantics.

