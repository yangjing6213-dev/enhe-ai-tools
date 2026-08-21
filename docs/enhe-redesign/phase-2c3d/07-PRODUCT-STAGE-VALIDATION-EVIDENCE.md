# Product Stage Validation Evidence

## TDD and regression sequence

- Unit RED: 5 expected failures before the resolver and production wiring existed.
- The first browser attempt was invalid because no disposable database URL was supplied.
- Valid browser RED: 18 expected product-stage failures after connecting the isolated database.
- An early broad run exposed an existing source scanner matching a local variable named
  `transition`; the local name was changed without weakening that scanner.
- Final focused set: 6 files and 42 tests passed.
- Final development product-stage Playwright: 19/19 passed.
- Final production standalone product-stage Playwright: 19/19 passed.

## Final gates

| Gate                                       | Result                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `npm run lint`                             | PASS                                                               |
| `npm run typecheck`                        | PASS                                                               |
| Focused Vitest                             | PASS, 6 files / 42 tests                                           |
| Default full suite run 1                   | PASS, 456 passed / 9 skipped files; 2227 passed / 90 skipped tests |
| Default full suite run 2                   | PASS, 456 passed / 9 skipped files; 2227 passed / 90 skipped tests |
| Shuffle seed 21101                         | PASS, 456 passed / 9 skipped files; 2227 passed / 90 skipped tests |
| Docker PostgreSQL migrations               | PASS, 49 found; schema up to date                                  |
| `npm run build`                            | PASS, compiled and generated 119/119 static pages                  |
| Formal standalone routes                   | PASS, 6/6 returned 200                                             |
| Motion preview routes                      | PASS, 4/4 returned 404                                             |
| Executable production JS prototype markers | PASS, 0 matches                                                    |

The 90 skipped tests are the repository's existing conditional PostgreSQL suites; this phase did
not add a skip or increase a timeout.

## Browser coverage

- Widths: 1440, 1024, 768, 480, 390, and 320
- Locales: Chinese `/` and English `/en`
- Pointer next/previous direction, exact 240ms profile, rapid `next-next-previous`, final media and
  copy, keyboard focus, keyboard plus reduced motion, exact 80ms opacity-only reduced profile,
  no horizontal overflow, no support-launcher collision, no console errors, and no page errors
- Server HTML asserted to contain exactly the default product layer for each locale

## Standalone and route evidence

Formal routes `/`, `/en`, `/software`, `/en/software`, `/robots.txt`, and `/sitemap.xml` returned 200. Preview probes `/redesign-preview/motion` and its `category-layer`, `product-stage`, and
`mobile-nav` children returned 404.

The first standalone probe returned 500 on dynamic pages because production validation had not
provided the required minimum-length `AUTH_SECRET`. That was an invalid test environment, not an
application result. The server was stopped and restarted with a process-local, test-only value;
no `.env` file or real secret was read or changed. The valid rerun produced the route and
Playwright results above.

The multiple-lockfile warning placed the traced server at
`.next/standalone/.worktrees/enhe-motion-product-stage-v1/server.js`; static and public assets were
copied only inside the generated `.next` artifact before startup. Executable server/client JS had
zero matches for the motion preview routes or `phase-2c3c`. Broad `.nft.json` scanning was excluded
from that executable-code claim because those files are dependency inventories and list source,
test, and documentation paths; route-level 404 probes independently prove that no motion preview
route is exposed.

## Disposable Docker cleanup

- Context: `desktop-linux`
- Container: `enhe-motion-product-stage-v1-gate`
- Database storage: 512MB tmpfs; `Mounts=[]`
- After stop: 0 containers, including 0 with the phase label
- All 38 pre-existing volume IDs unchanged
- Network IDs unchanged for `bridge`, `host`, and `none`
- `postgres:16-alpine` image unchanged at
  `sha256:75f5a96988cdf694a215073c3e9c001b706b371e2f94df3967f2efdec2787f6b`
