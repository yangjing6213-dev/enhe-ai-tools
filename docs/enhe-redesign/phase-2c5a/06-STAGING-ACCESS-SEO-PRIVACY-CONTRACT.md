# Staging Access, SEO, and Privacy Contract

A dedicated target must enforce the following at the Staging proxy/environment boundary without changing application source in Phase 2C.5A:

1. Dedicated Staging domain and HTTPS.
2. Basic Auth or an IP allowlist; public anonymous access is prohibited.
3. A visible Staging badge/header on every page.
4. Whole-site `noindex, nofollow, noarchive, noimageindex`.
5. Response-level `X-Robots-Tag` with the same policy.
6. `robots.txt` disallowing all crawlers.
7. No sitemap submission and no Search Console registration.
8. AI-crawler access prohibited.
9. Canonicals remain the formal production URLs; no Staging canonical is generated.
10. Production analytics and marketing events disabled.
11. Real payment disabled; only an explicitly approved sandbox may be enabled.
12. Real OAuth disabled; only a dedicated test app may be enabled.
13. Real email disabled; only a mail sink may be enabled.
14. Webhooks, imports, schedulers, and unapproved workers disabled.
15. Access logs must not contain secrets or protected data and must follow a defined retention policy.

```text
STAGING_ACCESS_MODE=REQUIRES_USER_SELECTION_BASIC_AUTH_OR_IP_ALLOWLIST
STAGING_ACCESS_CONTROL_STATUS=MISSING
STAGING_HTTPS_STATUS=MISSING
STAGING_SEO_PRIVACY_CONTRACT_STATUS=DEFINED_NOT_IMPLEMENTED
APPLICATION_SOURCE_IMPLEMENTATION=NOT_AUTHORIZED_IN_PHASE_2C5A
```
