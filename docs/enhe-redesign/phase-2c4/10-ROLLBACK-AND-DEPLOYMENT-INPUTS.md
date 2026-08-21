# Rollback and Deployment Inputs

No revert, tag, push, remote change, or deployment was performed.

## Rollback anchors

- RC runtime source / D4R start: `78357d74962276d3036975d2197e9c284eb053b1`
- Pre-motion baseline: `ad603985e40f1142e3ddff821e984abc14ebc207`

`PRE_MOTION_BASELINE=ad603985e40f1142e3ddff821e984abc14ebc207`

Returning the RC documentation HEAD to the D4R start `78357d74962276d3036975d2197e9c284eb053b1` requires no runtime-source change because the RC adds documentation/media only.

## D4R commit scopes

| Commit | Subject | Actual scope |
| --- | --- | --- |
| `fac9b688f78048109b58770cd8580a0dbd64363c` | `fix(ssr): expose all home product content without JavaScript` | `src/components/redesign/home/EnheRedesignProductShowcase.tsx`; `src/components/redesign/home/home-products.test.ts` |
| `73564f90a495a6a31f7b0b3b7343622c84d2eb61` | `fix(ui): suppress support launcher while category sheet is active` | `src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx`; `src/styles/redesign/shell.css`; `tests/category-motion.test.ts` |
| `6b861b58b66733f236cdd44b3ce102c2f8d8cc7a` | `test(motion): close targeted final production motion gates` | `src/lib/production-motion-final-source.test.ts`; `tests/e2e/production-motion-final-acceptance.spec.ts`; `tests/e2e/production-motion-final-performance.spec.ts` |
| `78357d74962276d3036975d2197e9c284eb053b1` | `docs(motion): close phase 2C.3D targeted production corrections` | 36 files under `docs/enhe-redesign/phase-2c3d-final-r1/`: 20 Markdown, 12 PNG, 4 WebM |

## Directed rollback order

1. `78357d74962276d3036975d2197e9c284eb053b1` — `docs(motion): close phase 2C.3D targeted production corrections`
2. `6b861b58b66733f236cdd44b3ce102c2f8d8cc7a` — `test(motion): close targeted final production motion gates`
3. `73564f90a495a6a31f7b0b3b7343622c84d2eb61` — `fix(ui): suppress support launcher while category sheet is active`
4. `fac9b688f78048109b58770cd8580a0dbd64363c` — `fix(ssr): expose all home product content without JavaScript`
5. `ac39487ecec451f2ef9408884fa17f8cffdf9ff3` — `docs(motion): close mobile navigation drawer implementation`
6. `49bbd837edbd5a5d39b13485ad628b477e09490c` — `feat(motion): implement directional mobile drawer`
7. `f895dbee6434eb07ec1414e06997353973b2c1c4` — `docs(motion): close product stage motion implementation`
8. `a7392be8b94e752eb46cd70ac80b54cc4f0fcba3` — `feat(motion): implement directional product stage transition`
9. `6f36cc1403c4a4404ac23cf049e20f3c97a124fd` — `docs(motion): close category layer motion implementation`
10. `5938b2f6da0c50a2dac08ea4d0bf31f367e169f3` — `feat(motion): implement category origin aware layer`

All rollback SHAs and subjects above were resolved directly from the repository. Reconfirm them before any future authorized rollback.

## Required Phase 2C.5 inputs

A future deployment requires explicit user authorization and a dedicated staging host/domain, database, object-storage/media boundary, environment, HTTPS, rollback authority, logs, health checks, and deployment approval. Credentials must be supplied out of band and must not be added to this package.
