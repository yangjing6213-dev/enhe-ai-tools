# Mobile Navigation Validation Evidence

## TDD and failure disclosure

- The same initial RED target ran exactly three times before production implementation.
- Each initial RED exited 1 with six expected failures and one passing invariant.
- Those failures proved the missing pointer, keyboard, reduced-motion, interruption, and stacking
  contracts; none was a database or harness failure.
- Final motion-profile unit result: 7/7 passed.
- Final focused Vitest result: 11 files / 66 tests passed.
- Final development Playwright result: 49/49 passed.
- Final production Standalone Playwright result: 49/49 passed.

Review-driven REDs were kept separate from the three required initial RED runs. They exposed and
fixed focus-return ownership, incomplete animation endpoint capture, inverse mixed-modality
handoff, RAF-based normalization, stale WAAPI inferred origins, live `CSSStyleDeclaration`
snapshots, protocol-latency assertions, and repeated-close cancellation.

The production Standalone investigation was not hidden: one run was 44/48 because four pointer
close animations started from a stale 360px origin; a partial fix replayed those four as 2/4; an
explicit-keyframe fix made that replay 4/4 but the full run was 47/48 on Escape handoff; snapshot
and event-boundary corrections then passed the mixed test 3/3 and the full matrix 48/48. The final
independent review found the duplicate-close gap, its source contract failed RED as expected, and
the added browser case produced the final 49/49 result.

## Static and full-suite gates

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| Focused Vitest | PASS, 11 files / 66 tests |
| Required default full suite run 1 | PASS, 457 passed / 9 skipped files; 2234 passed / 90 skipped tests |
| Required default full suite run 2 | PASS, 457 passed / 9 skipped files; 2234 passed / 90 skipped tests |
| Shuffle seed 21101 | PASS, 457 passed / 9 skipped files; 2234 passed / 90 skipped tests |

The 90 skips are the repository's existing conditional PostgreSQL tests. This phase did not
reduce Vitest workers, force serial execution, raise a global timeout, or add a skip.

## Browser matrix

- Formal routes: `/`, `/en`, `/software`, `/en/software`
- Mobile widths: 320, 390, 480, 483, 484, and 767
- Desktop widths: 768, 769, 1024, and 1440
- Profiles: pointer, keyboard, and reduced motion
- Behaviors: open, close, Enter, Space, Escape, repeated close, overlay close, Tab, Shift+Tab,
  focus return, body lock, rapid intent reversal, immediate navigation, language switch, and
  breakpoint cleanup
- Regressions: bilingual order, support hit ownership, 483/484 boundary, Category Layer, Product
  Stage, root overflow, console errors, and page errors

```text
CONSOLE_ERROR_COUNT=0
PAGE_ERROR_COUNT=0
ROOT_HORIZONTAL_OVERFLOW=0
MOBILE_MENU_OVERLAP=NO
SUPPORT_TRIGGER_INTERCEPTS_MENU=NO
```

At 320px the inherited `min(360px, 100vw)` drawer fills the viewport. The overlay is mounted and
active behind it; geometry was not changed merely to expose backdrop pixels.

## Final visual evidence

| Screenshot | Pixels | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `zh-mobile-nav-open-390.png` | 390x844 | 11515 | `1413f937465cfd9ef1dc5e0ffaf3a4fe0d72ad4bf027fc4824534f68340e8dd1` |
| `en-mobile-nav-open-390.png` | 390x844 | 10258 | `c5b757595d387eeb8dccdde9b18449128563a5c53a7bcf4c691970046271648f` |
| `zh-mobile-nav-open-320.png` | 320x844 | 8122 | `21c25f76629d96915a6d38755538fef5371673fa08ade87fad7f1f1a7391f0bc` |
| `en-mobile-nav-open-320.png` | 320x844 | 7959 | `dbb052b7372c119cf795978b5eb28dec6955f6e84db52c61355a010cd0c281b1` |
| `zh-mobile-nav-support-boundary-483.png` | 483x900 | 27549 | `ab5c28d8a6bb31cd22e800fc7083cd2cf5f96016fcf471e78268d873eee63a40` |
| `en-mobile-nav-support-boundary-484.png` | 484x900 | 23543 | `76efef8670cd53d05f942257c0a3f4cc4ca795385037af559655b3243f31d6ed` |

All six use formal production routes with the drawer open. Navigation is complete, the overlay is
present, no Dev Indicator or root overflow appears, and the menu owns the support-button hit area.

| Video | Codec / pixels / duration | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `zh-directional-drawer-390.webm` | VP8 video only / 390x844 / 2.84s | 228575 | `0492d463ec9ccdc42a906bd508c6411e1661b38662b79a8780a167314bd2b71a` |
| `en-directional-drawer-390.webm` | VP8 video only / 390x844 / 2.84s | 208180 | `ba6aee31f29a0262152ef6a48a386a8483372b1d2ce86054f76faffa54af9f4b` |

Each WebM shows pointer open, close, and rapid open/close/open. `ffprobe` found one VP8 video
stream and no audio stream. Hashes differ. Extracted contact sheets were visually reviewed and
then removed.

## Docker, migrations, build, and Standalone

- Docker Desktop 4.86 provided Linux Engine 29.7.2 for the required primary gate.
- Pre-gate resources: 0 containers, 38 volumes, and only `bridge`, `host`, and `none` networks.
- Exactly one Docker container, `enhe-phase2c3d3-postgres`, used `postgres:16-alpine`, loopback
  port 9387, a 512MB tmpfs, and `Mounts=[]`.
- No active `.env` was read, no seed ran, and only process-local database variables were used.
- Migration deploy passed with all 49 existing migrations.
- The final `npm run build` compiled successfully in 34.7 seconds and generated 119/119 pages.
- Traced entry: `.next/standalone/.worktrees/enhe-motion-mobile-nav-v1/server.js`.

Post-review builds used a separate temporary native PostgreSQL 16 instance on loopback port 9388.
It received the same 49 migrations, no seed, and was deleted after verification. It was not a
second Docker container and did not alter the completed Docker gate.

| Standalone route group | Result |
| --- | --- |
| `/`, `/en`, `/software`, `/en/software`, `/robots.txt`, `/sitemap.xml` | 6/6 HTTP 200 |
| Motion preview root plus category-layer, product-stage, and mobile-nav children | 4/4 HTTP 404 |

The four formal application routes loaded 26 unique executable scripts. Their HTML and actual
chunks retained `origin-aware-layer`, `directional-slide`, `directional-drawer`, and
AnalyticsTracker. They contained no motion-prototype route reference, `fileUrl`, `filePath`,
delivery-address marker, or ByteDance Loader.

## Unconditional cleanup

```text
DISPOSABLE_DB_CONTAINER_REMOVED=YES
SUPPLEMENTAL_NATIVE_DB_REMOVED=YES
TEMP_DATABASE_ENV_RESTORED=YES
STANDALONE_PROCESS_REMOVED=YES
PHASE_LISTENER_COUNT_FINAL=0
PHASE_PROCESS_COUNT_FINAL=0
PREEXISTING_CONTAINERS_UNCHANGED=YES
PREEXISTING_VOLUMES_UNCHANGED=YES
PREEXISTING_NETWORKS_UNCHANGED=YES
POSTGRES_IMAGE_UNCHANGED=YES
DOCKER_DESKTOP_FINAL_STATUS=STOPPED
DOCKER_OWNED_PROCESS_COUNT_FINAL=0
PRODUCTION_DATABASE_ACCESSED=NO
```

The primary Docker resource snapshot returned to 0 containers, 38 volumes, the same three default
networks, and the same `postgres:16-alpine` image ID
`sha256:75f5a96988cdf694a215073c3e9c001b706b371e2f94df3967f2efdec2787f6b`.
