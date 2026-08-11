-- R-001 metadata-only template. Run only in an authorized read-only transaction.
-- This query requires pgcrypto to already be enabled; it must not enable extensions.
-- It returns hashes and flags, never complete URL values, keys, secrets, or file bodies.

SELECT
  f.id AS file_id,
  CASE WHEN f.file_path LIKE 'cos://%' OR COALESCE(f.file_url, '') LIKE 'https://%.cos.%'
       THEN 'cos' ELSE 'local_or_other' END AS storage_type,
  encode(digest(COALESCE(f.file_path, ''), 'sha256'), 'hex') AS path_or_key_hash,
  CASE
    WHEN f.file_url ~* '^https?://([^/?#]+)' THEN substring(f.file_url FROM '^https?://([^/?#]+)')
    WHEN f.file_path ~* '^https?://([^/?#]+)' THEN substring(f.file_path FROM '^https?://([^/?#]+)')
    ELSE NULL
  END AS url_domain,
  CASE
    WHEN f.file_url ~* '^(https?)://' THEN lower(substring(f.file_url FROM '^(https?)://'))
    WHEN f.file_path ~* '^(https?)://' THEN lower(substring(f.file_path FROM '^(https?)://'))
    ELSE NULL
  END AS url_protocol,
  (COALESCE(f.file_url, '') ~* '^https?://' OR COALESCE(f.file_path, '') ~* '^https?://') AS is_absolute_url,
  (COALESCE(f.file_url, '') LIKE '/uploads/%' OR COALESCE(f.file_path, '') LIKE '/uploads/%') AS is_public_path,
  (COALESCE(f.file_url, '') ~* '[?&](X-Amz-|Signature|Expires|token|sig)=') AS has_signature_query,
  f.tool_id AS related_tool_id,
  t.slug AS related_tool_slug,
  t.type AS related_tool_type,
  t.status AS related_tool_status,
  t.is_download_paid AS is_download_paid,
  f.mime_type,
  f.file_size,
  f.created_at,
  f.updated_at
FROM files AS f
LEFT JOIN tools AS t ON t.id = f.tool_id
ORDER BY f.created_at, f.id;

-- Required operator-side companion fields (collect separately, still hash-only):
-- deployment SHA/image digest, migration version, proxy mapping, bucket ACL,
-- signed URL TTL, cache policy, primary-download relation, and entitlement mapping.
