# Local Staging-Equivalent Acceptance

Acceptance used the traced standalone output built from the exact D4R runtime source. Static assets and public assets were copied into the nested standalone layout and byte/count checked. A temporary ignored bridge file only cleared the nested fetch cache and launched the generated server; it was removed with `.next`.

The disposable runtime used:

- One local PostgreSQL 16 Alpine container.
- tmpfs database storage with no bind, named, or anonymous volume.
- 49 tracked migrations.
- 25 synthetic local-only product fixtures for deterministic pagination.
- Process-only database and auth values.

Final route gate:

- Six formal resources returned 200: four pages, robots, and sitemap.
- Four prototype preview routes returned 404.
- Production bundle prototype references: 0.
- Console, page, and hydration errors: 0.

This proves local traced-standalone readiness. It does not prove network, TLS, object storage, external credentials, observability, or rollback behavior on a dedicated staging system.

- `LOCAL_STAGING_EQUIVALENT_ACCEPTANCE=PASS`
- `STAGING_SOURCE_READINESS=PASS`
- `STAGING_VISUAL_READINESS=PASS`
- `STAGING_MOTION_READINESS=PASS`
