# Staging Data and Storage Contract

## Recommended mode

```text
STAGING_DATA_MODE_RECOMMENDATION=SANITIZED_PUBLIC_FIXTURES
STAGING_DATA_MODE_APPROVED=NO
```

The first deployment should use deterministic, public-only fixtures. A sanitized public production copy requires separate, explicit approval and is not approved by this package.

## Fixture boundary

A future fixture set may create only public test Tool records. It must not create or copy real users, orders, payments, `PaymentProof`, `DownloadLog`, analytics user data, `AdminAuditLog`, sessions, OAuth identities, `fileUrl`, `filePath`, private delivery addresses, permanent object-storage addresses, production buckets, production object keys, or production seed data.

Fixtures must be idempotent, removable, count-audited, and content-hash-audited. The fixture generator, counts, expected hashes, cleanup check, and owning operator must be reviewed in Phase 2C.5B before execution.

## Storage boundary

- Use an independent Staging bucket or independent Staging prefix.
- Use a dedicated credential and least-privilege policy.
- Store public test media only.
- Do not use production CDN, private delivery packages, production file metadata, or production object identifiers.
- Define retention, deletion, and post-Smoke cleanup before deployment.
- Never print credential values or storage locations in Git artifacts.

No fixture, database, bucket, prefix, media object, or credential was created or accessed in Phase 2C.5A.
