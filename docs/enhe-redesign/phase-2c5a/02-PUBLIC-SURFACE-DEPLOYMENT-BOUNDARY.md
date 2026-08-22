# Public Surface Deployment Boundary

The only valid release label is `PUBLIC_SURFACE_RELEASE_CANDIDATE`. No full-site, full-production, or all-feature readiness claim is permitted.

## In scope

| Surface | Status |
| --- | --- |
| Public header and footer | `IN_SCOPE` |
| Chinese and English home routes | `IN_SCOPE` |
| Chinese and English software-list routes | `IN_SCOPE` |
| Support exclusion system | `IN_SCOPE` |
| Category layer motion | `IN_SCOPE` |
| Home product-stage motion | `IN_SCOPE` |
| Mobile-navigation motion | `IN_SCOPE` |
| Motion hygiene | `IN_SCOPE` |
| Five-product SSR fallback | `IN_SCOPE` |
| Category/support modal ownership | `IN_SCOPE` |

## Out of scope

| Surface | Status |
| --- | --- |
| Product detail | `OUT_OF_SCOPE_NOT_READY` |
| Private download and entitlement | `OUT_OF_SCOPE_NOT_READY` |
| Payment and refund | `OUT_OF_SCOPE_NOT_READY` |
| OAuth | `OUT_OF_SCOPE_NOT_READY` |
| Coupon and Explorer Pass | `OUT_OF_SCOPE_NOT_READY` |
| User-center redesign | `OUT_OF_SCOPE` |
| Admin redesign | `OUT_OF_SCOPE` |
| Content Phase 3 | `OUT_OF_SCOPE` |

A future Staging deployment may not weaken these boundaries or treat public-surface acceptance as proof of the unready product-detail, commerce, download, payment, or identity systems.

## Mandatory isolation model

`REQUIRED_STAGING_TARGET_TYPE=DEDICATED_HOST_OR_VM`. A future target must not reuse any production host, VM, Docker host, Compose project, Nginx virtual host, database, database user, schema, object-storage bucket, object-storage prefix, CDN, Redis instance, SMTP configuration, payment configuration, OAuth application, or analytics property. An independent Staging instance in the same cloud account is acceptable; another Compose project on the production host is not.

```text
PUBLIC_RC_SCOPE_STATUS=PASS
OUT_OF_SCOPE_BOUNDARY_STATUS=PASS
PHASE_1B_PRODUCT_DETAIL_STATUS=NOT_READY
PHASE_1B_COMMERCE_STATUS=NOT_READY
PHASE_1B_OVERALL_STATUS=NOT_READY
```
