R006_AUTHORITATIVE_STATUS=NO_CODE_PRODUCTION_DRIFT_WITH_OPEN_DECISIONS
R006_REMAINING_DRIFT_COUNT=0
R006_OWNER_DECISION_COUNT=10
NGINX_LOG_AGGREGATION_STATUS=COLLECTED

# R-006 old-URL owner decision matrix

Two readable Nginx access-log files were aggregated inside production. Queries were removed before comparison; no IP, user agent, cookie, referer, body, or raw log line left the server. All listed-path counts were zero in the available log window, whose date range cannot be inferred from zero matches.

| path | current HTTP | sitemap | aggregate requests | first/last | confirmed IA decision | suggested disposition | Search Console/backlink data | final owner status |
|---|---:|---|---:|---|---|---|---|---|
| `/online-tools` | 301 → 200 | no | 0 | — | AI account-service public content removed | REMOVE; 301/410 target pending | required | PENDING |
| `/account-services` | 200 | yes | 0 | — | AI account-service public content removed | REMOVE; 301/410 pending | required | PENDING |
| `/build-your-own-x` | 200 | yes | 0 | — | Build Your Own X removed | REMOVE; 301/410 pending | required | PENDING |
| `/skill-learning/build-your-own-x` | 404 | no | 0 | — | Build Your Own X removed | REMOVE; 410 versus retained 404 pending | required | PENDING |
| `/en/build-your-own-x` | 200 | yes | not collected; outside authorized log set | — | Build Your Own X removed | REMOVE; 301/410 pending | required | PENDING |
| `/help` | 404 | no | 0 | — | create | CREATE | not required for creation | IA_CONFIRMED |
| `/en/help` | 404 | no | 0 | — | create | CREATE | not required for creation | IA_CONFIRMED |
| `/updates` | 404 | no | 0 | — | create | CREATE | not required for creation | IA_CONFIRMED |
| `/en/updates` | 404 | no | 0 | — | create | CREATE | not required for creation | IA_CONFIRMED |
| `/ai-topics` | 200 | yes | 0 | — | no removal decision in this phase | KEEP recommended | only if disposition changes | OWNER_CONFIRM_KEEP |
| `/product-demos` | 200 | yes | 0 | — | no removal decision in this phase | KEEP recommended | only if disposition changes | OWNER_CONFIRM_KEEP |

Zero observed requests is not proof of zero traffic: only two currently readable log files were available, and Search Console/external-link history was not collected. No redirect or deletion is authorized by this matrix.

The V3 owner-decision count of 10 is defined as `CORE_REDIRECT=1 + CORE_404_REMOVE=1 + NEEDS_OWNER_DECISION=3 + LOCAL_ONLY_NEEDS_REVIEW=5`. The five local-only review patterns are the four localized AI-trends daily patterns plus `/en/online-tools`.
