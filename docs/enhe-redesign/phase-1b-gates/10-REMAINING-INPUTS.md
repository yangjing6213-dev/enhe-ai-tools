# Remaining Phase 1B inputs

| priority | owner | input | safe collection method | closure check |
|---:|---|---|---|---|
| P0 | release operator | production Git SHA or immutable image digest | deployment record or read-only host command; record hash only | matches the R-006 observation window and route behavior |
| P0 | database operator | File metadata inventory and File-to-tool/entitlement mapping | `collect-production-file-metadata-template.sql` in read-only transaction | all rows classified; no complete URL/body output |
| P0 | web operator | `/uploads` and `/api/uploads` proxy/Nginx mapping | config hash plus anonymous HEAD matrix | no unauthorized package response; media allowlist explicit |
| P0 | storage operator | COS bucket/prefix ACL and signed URL policy | policy summary, TTL, and cache rules; no credentials | package objects private or explicitly allowlisted |
| P0 | content owner | disposition of 17 observed public values | map by hash to product/file class, then purge/deny or allowlist | re-scan HTML/RSC and HEAD after remediation |
| P1 | integration owner | main-branch R-008 loader and old positive test | resolve on a branch containing the loader; preserve `AnalyticsTracker` | source test passes on merge result and no global `beforeInteractive` loader remains |
| P1 | SEO owner | 32 production-only route patterns, six Phase 1A core URL decisions, two missing `hreflang_en` partners, and eight `content-language=en-US` observations on non-`/en` paths | compare deployment route map, sitemap generator and canonical/hreflang policy | every URL and language signal classified as public, redirect, expected private, or removed by decision |
| P1 | commerce owner | payment/order/OAuth readiness evidence | separate authorized gate, not this audit | explicit approval and independent tests |

Until P0 inputs are supplied and verified, `PHASE_1B_OVERALL_STATUS=NOT_READY`.
