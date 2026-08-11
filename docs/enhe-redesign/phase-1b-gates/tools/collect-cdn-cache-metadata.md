# Read-only CDN/cache metadata collection

Run only with an authorized operator account and configuration snapshot. Do not reload, purge, edit, or upload anything. Do not print cookies, authorization headers, complete object URLs, object keys, query values, or response bodies.

For each observed public page and each *hashed* delivery/object class, collect only:

- response status, content type, content length, `Cache-Control`, `ETag`, `Age`, `X-Cache`/provider cache status, and observation time;
- normalized host, protocol, path category (`page`, `public_media`, `upload`, `delivery_archive`, `signed_delivery`), and SHA-256 of the complete URL or key;
- whether the response required authentication, whether a signature query was present, and whether the address is immutable/public;
- CDN rule/configuration hash and the matching `/uploads` / `/api/uploads` proxy mapping category.

Suggested safe commands (adapt to the approved provider; keep output redacted):

```powershell
# Metadata only; never follow a download or save a response body.
curl.exe --head --max-time 20 --user-agent "ENHE-Redesign-ReadOnly-Audit/1.0" "https://www.enhe-tech.com.cn/<public-path>"
```

For object storage, use the provider's metadata/head operation against a pre-approved hash-to-object mapping. Record `HEAD_STATUS`, `CONTENT_TYPE`, `CONTENT_LENGTH`, `CACHE_CONTROL`, `ETAG`, `AUTH_REQUIRED`, `SIGNATURE_PRESENT`, and `URL_SHA256`; omit the address itself. The result must be joined to the SQL template output by `path_or_key_hash`, never by a copied private URL.

Closure requires an operator-signed snapshot proving that package objects are private or explicitly allowlisted, signed delivery has bounded TTL and non-public cache semantics, and all previously observed hashes have been purged or classified. A local `next.config.ts` or local Git SHA is not CDN evidence.
