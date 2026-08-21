# Validation Evidence

## TDD and focused checks

- Static contract RED: 3 expected failures for missing motion/origin/mobile lifecycle.
- Browser RED: 2 expected failures for missing pointer and keyboard motion attributes.
- Final category motion Vitest: 5/5 PASS, including direct execution of real Motion variant resolvers.
- Existing compatibility set: 22/22 PASS.
- Development Playwright: 14/14 PASS.
- Traced production standalone Playwright: 14/14 PASS.
- Covered widths: 1440, 1024, 768, 480, 390, 320; locales: zh and en.
- Covered open/close, outside pointer, Escape, Enter, Space, focus wrap/return, scroll lock,
  trigger origin, exact profile durations, pre-navigation reduced motion hydration,
  support collision, 320/390 overflow, console errors, and page errors.

One early browser run was blocked before assertions by a missing process-local database URL.
After the disposable database was connected, the expected RED was recorded. The first broad
suite then exposed three real compatibility regressions: SSR category markup removal, a legacy
keyboard source contract, and a public-TSX transition-source gate. All three were fixed and the
complete gates were rerun from zero.

## Final gates

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| Default full suite run 1 | 455 passed / 9 skipped files; 2222 passed / 90 skipped tests |
| Default full suite run 2 | 455 passed / 9 skipped files; 2222 passed / 90 skipped tests |
| Shuffle seed 21101 | 455 passed / 9 skipped files; 2222 passed / 90 skipped tests |
| Docker PostgreSQL migrations | 49 found; schema up to date |
| `npm run build` | PASS; compiled and generated 119/119 static pages |
| Formal standalone routes | 6/6 returned 200 |
| Motion preview routes | 4/4 returned 404 |
| Prototype-only production bundle markers | 0 |

Formal routes: `/`, `/en`, `/software`, `/en/software`, `/robots.txt`, `/sitemap.xml`.
Preview probes: `/redesign-preview/motion` and its `category-layer`, `product-stage`, and
`mobile-nav` children.

The only disposable PostgreSQL container used tmpfs, no mounts, and auto-remove. After stop,
container count returned to zero; the pre-existing 38 volumes, one image ID, and three network
IDs were unchanged. No production database was accessed.
