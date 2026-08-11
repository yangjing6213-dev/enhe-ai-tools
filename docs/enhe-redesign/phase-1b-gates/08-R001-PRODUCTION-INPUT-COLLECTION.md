R001_PRODUCTION_FILE_INVENTORY=OPEN
R001_PRODUCT_DETAIL_AND_DOWNLOAD=BLOCKED

# R-001 production input collection contract

No production database, object store, CDN control plane, or deployment host was accessed in this audit. The following inputs remain required. Collection must be performed by an authorized operator in a read-only transaction or equivalent snapshot and must return hashes/flags, never complete private URLs or file bodies.

## Required metadata

| input | safe fields | required verification |
|---|---|---|
| File inventory | file id, storage type, SHA-256 of path/key, URL domain and protocol, absolute/public/signature flags, related tool id/slug/type/status, paid flag, MIME, size, created/updated timestamps | row count, duplicate hash review, no secret or body output |
| Deployment fingerprint | production Git SHA or immutable image digest, migration version, build timestamp | reconcile with deployment record and R-006 snapshot |
| Route and proxy map | `/uploads` and `/api/uploads` mapping, Nginx/CDN rules, config hashes | anonymous HEAD matrix for every observed object class |
| Storage policy | bucket/prefix ACL summary, public-read policy, signed URL TTL, CDN cache category | owner-approved policy snapshot and purge/deny test |
| Entitlement history | File-to-tool and File-to-order/entitlement relationship hashes | prove paid/unpaid and historical URL classifications without exposing values |

`tools/collect-production-file-metadata-template.sql` is a SELECT-only template. It intentionally does not enable extensions, run migrations, read file contents, or print URL values. Its domain extraction excludes query and fragment text, and it emits a separate `url_protocol` field. `tools/collect-cdn-cache-metadata.md` and `tools/collect-production-fingerprint.ps1` are collection instructions/tools only.

The repository route spelling is `src/app/api/uploads/[fileName]/route.ts`; do not infer a catch-all route from the earlier prompt notation.
