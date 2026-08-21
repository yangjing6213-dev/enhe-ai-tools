# Source Scope

Baseline: `dfa5d8b8fe277129934c8d1ec13eda2851d3e970`

## Authorized production changes

1. `src/components/redesign/home/EnheRedesignProductShowcase.tsx`
2. `src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx`
3. `src/styles/redesign/shell.css`

## Direct and final-gate tests

1. `src/components/redesign/home/home-products.test.ts`
2. `tests/category-motion.test.ts`
3. `src/lib/production-motion-final-source.test.ts`
4. `tests/e2e/production-motion-final-acceptance.spec.ts`
5. `tests/e2e/production-motion-final-performance.spec.ts`

## Confirmed unchanged

- D1 Category motion parameters: unchanged.
- D2 Product motion parameters: unchanged.
- D3 Mobile Navigation motion parameters: unchanged.
- Product data/order/pagination/detail/download/payment/OAuth: unchanged.
- Navigation labels/order/routes: unchanged.
- Support default position/size/token/breakpoint/exclusion geometry: unchanged.
- Package and lockfile: unchanged.
- Prisma schema, migrations, and seed source: unchanged.
- Sitemap, robots, SEO routes: unchanged.
- Prototype production wiring: absent.
- Historical D4 documents: unchanged.

- `UNAUTHORIZED_PRODUCTION_PATH_COUNT=0`
- Production files changed: 3 of allowed maximum 6.
