# Required Dedicated Staging Input Matrix

`PROVEN` means target-specific tracked evidence exists. A policy stated in this package is not treated as proof that a future target implements it. Because no candidate exists, every target-level item remains `MISSING`; no production resource was proposed as a Staging input.

`REQUIRED_STAGING_TARGET_TYPE=DEDICATED_HOST_OR_VM`. In addition to the 84 enumerated inputs below, the isolation contract categorically prohibits production host/VM/Docker, Compose, Nginx, database/user/schema, storage/prefix/CDN, Redis, SMTP, payment, OAuth, and analytics reuse.

## A. Host (11)

| # | Required input | Status |
| ---: | --- | --- |
| 1 | Independent Staging VM/server | `MISSING` |
| 2 | OS | `MISSING` |
| 3 | CPU | `MISSING` |
| 4 | RAM | `MISSING` |
| 5 | Disk | `MISSING` |
| 6 | Docker/container runtime | `MISSING` |
| 7 | Dedicated deployment directory | `MISSING` |
| 8 | Dedicated system user | `MISSING` |
| 9 | SSH connection reference | `MISSING` |
| 10 | Host fingerprint | `MISSING` |
| 11 | Resource limits | `MISSING` |

## B. Domain and TLS (6)

| # | Required input | Status |
| ---: | --- | --- |
| 12 | Dedicated Staging domain | `MISSING` |
| 13 | DNS ownership | `MISSING` |
| 14 | HTTPS | `MISSING` |
| 15 | Certificate strategy | `MISSING` |
| 16 | Proof that no production domain is used | `MISSING` |
| 17 | Proof that production DNS is not modified | `MISSING` |

## C. Database (8)

| # | Required input | Status |
| ---: | --- | --- |
| 18 | Dedicated PostgreSQL instance | `MISSING` |
| 19 | Dedicated database | `MISSING` |
| 20 | Dedicated database user | `MISSING` |
| 21 | Dedicated password reference | `MISSING` |
| 22 | Dedicated backup | `MISSING` |
| 23 | Proof that production personal/order/payment data is not copied | `MISSING` |
| 24 | 49-migration execution plan | `MISSING` |
| 25 | Database rollback strategy | `MISSING` |

## D. Data mode (1)

| # | Required input | Status |
| ---: | --- | --- |
| 26 | User-approved choice: `SANITIZED_PUBLIC_FIXTURES` or separately approved sanitized public production copy | `MISSING` |

Recommendation: `SANITIZED_PUBLIC_FIXTURES`. Recommendation is not approval.

## E. Object storage/media (8)

| # | Required input | Status |
| ---: | --- | --- |
| 27 | Independent Staging bucket | `MISSING` |
| 28 | Or an independent Staging prefix, with the unused alternative later marked not applicable | `MISSING` |
| 29 | Dedicated credential reference | `MISSING` |
| 30 | Public-media-only boundary | `MISSING` |
| 31 | Delivery packages prohibited | `MISSING` |
| 32 | Private files prohibited | `MISSING` |
| 33 | Production CDN prohibited | `MISSING` |
| 34 | Production file metadata prohibited | `MISSING` |

## F. Environment (8)

| # | Required input | Status |
| ---: | --- | --- |
| 35 | Staging-only environment | `MISSING` |
| 36 | Secure injection method | `MISSING` |
| 37 | Proof no environment file is committed | `MISSING` |
| 38 | Proof no production secret is used | `MISSING` |
| 39 | Proof values are never emitted | `MISSING` |
| 40 | Environment-variable name contract | `MISSING` |
| 41 | Secret owner | `MISSING` |
| 42 | Rotation policy | `MISSING` |

## G. External side effects (8)

| # | Required input | Status |
| ---: | --- | --- |
| 43 | Payment disabled or sandboxed | `MISSING` |
| 44 | OAuth disabled or dedicated test app | `MISSING` |
| 45 | SMTP disabled or mail sink | `MISSING` |
| 46 | Analytics disabled or dedicated Staging property | `MISSING` |
| 47 | Webhooks disabled | `MISSING` |
| 48 | Import jobs disabled | `MISSING` |
| 49 | Scheduler disabled | `MISSING` |
| 50 | Background-worker boundary | `MISSING` |

## H. Access (9)

| # | Required input | Status |
| ---: | --- | --- |
| 51 | Basic Auth or IP allowlist | `MISSING` |
| 52 | Non-public access | `MISSING` |
| 53 | Visible Staging header/badge | `MISSING` |
| 54 | Whole-site noindex contract | `MISSING` |
| 55 | `X-Robots-Tag` | `MISSING` |
| 56 | robots disallow all | `MISSING` |
| 57 | Exclusion from Search Console | `MISSING` |
| 58 | Exclusion from sitemap submission | `MISSING` |
| 59 | AI-crawler exclusion | `MISSING` |

## I. Runtime (10)

| # | Required input | Status |
| ---: | --- | --- |
| 60 | Dedicated Compose project | `MISSING` |
| 61 | Dedicated container names | `MISSING` |
| 62 | Dedicated network | `MISSING` |
| 63 | Dedicated volumes | `MISSING` |
| 64 | Dedicated ports | `MISSING` |
| 65 | Dedicated log directory | `MISSING` |
| 66 | Health check | `MISSING` |
| 67 | Readiness check | `MISSING` |
| 68 | Resource limit | `MISSING` |
| 69 | Restart policy | `MISSING` |

## J. Rollback (8)

| # | Required input | Status |
| ---: | --- | --- |
| 70 | Current Staging backup | `MISSING` |
| 71 | Previous immutable image | `MISSING` |
| 72 | Previous Compose manifest | `MISSING` |
| 73 | Database backup | `MISSING` |
| 74 | Rollback authority | `MISSING` |
| 75 | Rollback command/runbook | `MISSING` |
| 76 | Rollback time limit | `MISSING` |
| 77 | Health-failure threshold | `MISSING` |

For a confirmed first-ever Staging installation, items 70-72 may become `NOT_APPLICABLE_WITH_JUSTIFICATION` only when there is no prior Staging state and the approved rollback target is the verified empty baseline. The current run cannot apply that exception because no target or installation history is proven, so all three remain `MISSING`.

## K. Approval (7)

| # | Required input | Status |
| ---: | --- | --- |
| 78 | User approval | `MISSING` |
| 79 | Target owner | `MISSING` |
| 80 | Deployment operator | `MISSING` |
| 81 | Rollback operator | `MISSING` |
| 82 | Maintenance window | `MISSING` |
| 83 | Smoke owner | `MISSING` |
| 84 | Final acceptance owner | `MISSING` |

```text
REQUIRED_INPUT_COUNT=84
PROVEN_INPUT_COUNT=0
MISSING_INPUT_COUNT=84
NOT_APPLICABLE_WITH_JUSTIFICATION_COUNT=0
REJECTED_PRODUCTION_RESOURCE_COUNT=0
PRODUCTION_REFERENCE_REJECTION_COUNT=1
```

`REJECTED_PRODUCTION_RESOURCE_COUNT` counts only input-matrix rows proposed as Staging inputs and rejected for being production resources. The separately tracked production connection anchor was never proposed as an input; it is counted by `PRODUCTION_REFERENCE_REJECTION_COUNT`.
