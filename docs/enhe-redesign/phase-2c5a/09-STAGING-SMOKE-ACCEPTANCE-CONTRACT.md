# Staging Smoke Acceptance Contract

These checks apply only after a future, explicitly approved Phase 2C.5B deployment.

## Infrastructure

- HTTPS and the approved access-control mode are active.
- App and database health/readiness pass.
- CPU, memory, disk, restart policy, and log location match the target contract.
- Running image digest and OCI labels match the approved RC.
- No production host, database, storage, analytics, mail, payment, or OAuth resource is referenced.

## Formal routes

| Route | Expected result |
| --- | --- |
| `/` | 200 |
| `/en` | 200 |
| `/software` | 200 |
| `/en/software` | 200 |
| `/robots.txt` | 200 and disallow all |
| `/sitemap.xml` | 200 behind access control; production canonical URLs only, no Staging/preview URL, and never submitted |

The authoritative RC preview set is:

- `/redesign-preview/motion`
- `/redesign-preview/motion/category-layer`
- `/redesign-preview/motion/product-stage`
- `/redesign-preview/motion/mobile-nav`

All four must return 404. A static route-manifest check must also fail acceptance if any additional exposed `/redesign-preview/**` route exists.

## SEO and privacy

- Whole-site noindex metadata and `X-Robots-Tag` are present.
- `robots.txt` disallows all crawling.
- Canonicals remain the formal production URLs; no Staging canonical appears.
- No production analytics, marketing event, payment, email, OAuth, webhook, import, scheduler, or worker side effect occurs.

## Public-surface UI matrix

Validate Chinese and English at widths 320, 390, 483, 484, 768, and 1440 for header, footer, home, software list, category layer, five-product stage, mobile navigation, and support launcher. Exercise pointer, keyboard, reduced-motion, and no-JS profiles. Confirm one active dialog/focus trap maximum, focus return, body-scroll cleanup, no launcher collision, no horizontal overflow, and settled animations.

## Security

Rendered HTML, logs, and browser requests must expose no `fileUrl`, `filePath`, delivery address, private package, production secret, production database, or production storage reference.

## Rollback drill

Run a desktop rehearsal first and record it separately as `ROLLBACK_DESKTOP_REHEARSAL_STATUS`; it cannot close runtime acceptance. Phase 2C.5B must then perform an authorized runtime rollback drill (or the approved first-install empty-baseline teardown) and record `ROLLBACK_RUNTIME_DRILL_STATUS=PASS`, backup/digest identities, elapsed time, restored health, and residual-resource checks without recording secret values.

```text
STAGING_SMOKE_CONTRACT_STATUS=DEFINED_NOT_EXECUTED
STAGING_CONNECTION_ATTEMPTED=NO
STAGING_DEPLOYMENT_STARTED=NO
```
