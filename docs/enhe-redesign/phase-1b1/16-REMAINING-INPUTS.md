REMAINING_INPUT_STATUS=OPEN
P0_CONTAINMENT_REQUIRED=YES

# Remaining inputs after Phase 1B.1

| priority | owner | remaining input/action | closure evidence |
|---:|---|---|---|
| P0 | product/content owners | approve the 15 rows in `08-R001-OWNER-CLASSIFICATION.md` | explicit classification, owner, action, and verification per observation hash |
| P0 | storage/content owner | trace the 13 unknown hashes to current, legacy, static, or cache sources | hash-only mapping; no raw private address in artifacts |
| P0 | delivery/security owner | approve short-lived signed delivery and public/private cache policy | anonymous access matrix, TTL, cache category, entitlement checks |
| P0 release gate | database/release operator | review the one failed or unfinished migration without changing it in this phase | authorized migration diagnosis and clean release-gate result |
| P0 release gate | release operator | explain/reconcile the dirty production host worktree | immutable deployment record; do not overwrite host state |
| P1 SEO | SEO/content owner | resolve 8 language mismatches and 2 missing language partners | corrected public headers/hreflang and anonymous recheck |
| P1 IA/SEO | route owners | decide 301/410 for removed legacy paths using Search Console/backlink evidence | signed owner matrix and post-change HTTP verification |
| P1 route owner | product/content owner | decide five local-only public route patterns | keep/index/noindex/remove decision with verification |
| implementation authorization | engineering owner | create a clean integration worktree at `3497d170...` | clean branch/worktree and baseline validation results |

No password, private key, database URL, payment/OAuth secret, complete private address, or object key is requested. Public-shell integration planning can proceed independently; product-detail/download and commerce cannot.
