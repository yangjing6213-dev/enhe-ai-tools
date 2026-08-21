# Phase 2C.3D-2 Manifest

## Baseline

- Worktree: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-motion-product-stage-v1`
- Branch: `codex/enhe-motion-product-stage-v1`
- Start HEAD: `6f36cc1403c4a4404ac23cf049e20f3c97a124fd`
- Code HEAD: `a7392be8b94e752eb46cd70ac80b54cc4f0fcba3`
- Approved production variant: `directional-slide`

## Design provenance

The required `docs/enhe-redesign/phase-2c3c` files were not present at the start HEAD. They were
read without copying from the clean prototype commit
`82bb4c2c34a9481a60ec566134931895e3020f62` with `git show`. The selection sheet in that older
snapshot did not record a selected product-stage variant. The Phase 2C.3D-2 user instruction is
the later and controlling approval for `directional-slide`.

## Code commit scope

- `src/components/redesign/home/EnheRedesignProductShowcase.tsx`
- `src/components/redesign/home/EnheRedesignProductStageMotion.module.css`
- `src/lib/motion/product-stage-motion.ts`
- `tests/product-stage-motion.test.ts`
- `tests/e2e/product-stage-motion.spec.ts`

## Preserved boundaries

- Product order, copy, media, links, and CTA data are unchanged.
- Category Layer, mobile navigation, Header, Footer, customer support, and support exclusion zones
  are unchanged.
- SEO, routes, canonical metadata, hreflang, robots, sitemap, Prisma, migrations, packages, and
  Docker source are unchanged.
- No motion preview implementation was copied into production.
- No push or deployment was started.
