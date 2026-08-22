# SSH Tunnel and RC Smoke Contract

## Access boundary

```text
RC_ACCESS=SSH_TUNNEL_LOOPBACK_ONLY
RC_APP_BIND=127.0.0.1:3101
RC_DB_HOST_BIND=NONE
PUBLIC_RC_ACCESS=NO
RC_MAX_WINDOW_MINUTES=90
PRODUCTION_MONITOR_INTERVAL_SECONDS=15
```

Phase 2C.5B may establish a tunnel only after fresh capacity evidence passes, deployment approval becomes available, the immutable image matches, and the isolated Compose preflight reports no conflict. The tunnel maps an operator-local loopback endpoint only to host loopback port 3101. It must not create a public listener or forward a database port.

Every production-monitor sample from the pre-start baseline through post-cleanup must carry an RFC 3339 UTC timestamp. Samples run every 15 seconds and evaluate every exact kill threshold; an absent or delayed sample blocks acceptance.

## Exact route expectations

The following routes must return HTTP 200 through the loopback-only tunnel:

- `/`
- `/en`
- `/software`
- `/en/software`
- `/robots.txt`
- `/sitemap.xml`

The following prototype preview routes must return HTTP 404:

- `/redesign-preview/motion`
- `/redesign-preview/motion/category-layer`
- `/redesign-preview/motion/product-stage`
- `/redesign-preview/motion/mobile-nav`

Any other exposed `/redesign-preview/**` route is a failure. Redirect, authorization fallback, or soft-404 content does not satisfy an expected 404.

## Required smoke matrix

Smoke must cover Header, Footer, Home, Software, Category, Product Stage, Mobile Nav, support entry, and support suppression-and-recovery as distinct checks across:

- viewports 320, 390, 483, 484, 768, and 1440;
- zh and en locales;
- pointer and keyboard interaction;
- reduced motion;
- no-JavaScript SSR;
- hydration;
- pagination;
- canonical and hreflang;
- JSON-LD;
- prototype isolation;
- absence of `fileUrl`, `filePath`, and delivery-address data.

Every matrix cell records route, locale, viewport, interaction/runtime mode, expected result, observed result, and timestamp. Missing cells remain `NOT_EXECUTED`; they cannot be inferred from neighboring widths or the other locale.

## Required zero-error thresholds

```text
RC_CONSOLE_ERROR_COUNT_REQUIRED=0
RC_PAGE_ERROR_COUNT_REQUIRED=0
RC_ROOT_HORIZONTAL_OVERFLOW_REQUIRED=0
RC_CONSOLE_ERROR_COUNT_OBSERVED=NOT_EXECUTED_APPROVAL_BLOCKED
RC_PAGE_ERROR_COUNT_OBSERVED=NOT_EXECUTED_APPROVAL_BLOCKED
RC_ROOT_HORIZONTAL_OVERFLOW_OBSERVED=NOT_EXECUTED_APPROVAL_BLOCKED
```

The required values are acceptance thresholds, not observations. Current observed values remain `NOT_EXECUTED_APPROVAL_BLOCKED`.

## Smoke sequence

1. Capture the sanitized production baseline fingerprint, health state, restart counters, resource state, and free-space state.
2. Verify the RC app and RC database become healthy within their defined thresholds.
3. Verify the tunnel reaches only the RC app and that direct public access is unavailable.
4. Execute every exact route expectation and every required smoke-matrix cell, including separate support-entry and support-suppression-and-recovery checks, Header/Footer/Home/Software/Category/Product Stage/Mobile Nav, prototype isolation, metadata, SSR/hydration, pagination, and sensitive-field absence.
5. Confirm response identity belongs to the locked RC image and not the production container.
6. Confirm payment, OAuth, SMTP, analytics, webhooks, imports, scheduler, and background workers remain disabled.
7. Confirm no real user, order, payment, download, private-file, or production object-storage data appears.
8. Observe production health, restart delta, memory available, load, and root free space throughout smoke.
9. Stop immediately on any runtime kill threshold, RC health timeout, identity mismatch, public exposure, side effect, or production delta.
10. Complete cleanup and verify the post-cleanup production fingerprint before acceptance.

No RC smoke result can authorize or substitute for the Phase 2C.6 production upgrade. The maximum 90-minute window includes launch, tunnel access, smoke, evidence capture, and cleanup.

```text
SSH_TUNNEL_CREATED=NO
RC_SMOKE_STARTED=NO
RC_SMOKE_STATUS=NOT_EXECUTED_APPROVAL_BLOCKED
RC_SMOKE_MATRIX_STATUS=NOT_EXECUTED
PRODUCTION_SMOKE_TARGETED=NO
```
