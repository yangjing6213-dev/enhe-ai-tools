-- R-001 V2: metadata-only, hash-only File inventory.
-- Run with psql by an authorized operator.  This file never prints a URL,
-- path, object key, signature value, user/order data, or file contents.
-- Do not enable pgcrypto here; it must already exist.

\set ON_ERROR_STOP on
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '60s';

SELECT EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
) AS pgcrypto_available \gset

\if :pgcrypto_available
SELECT
  f.id AS file_id,
  CASE
    WHEN COALESCE(f.file_url, '') ~* '(cos\.|\.cos\.|^cos://)'
      OR COALESCE(f.file_path, '') ~* '(cos\.|\.cos\.|^cos://)'
      THEN 'cos'
    ELSE 'local_or_other'
  END AS storage_type,

  CASE WHEN NULLIF(btrim(f.file_url), '') IS NOT NULL
    THEN encode(digest(f.file_url, 'sha256'), 'hex') END AS file_url_sha256,
  CASE WHEN NULLIF(btrim(f.file_path), '') IS NOT NULL
    THEN encode(digest(f.file_path, 'sha256'), 'hex') END AS file_path_sha256,
  CASE
    WHEN NULLIF(btrim(f.file_url), '') IS NOT NULL
      THEN encode(digest(f.file_url, 'sha256'), 'hex')
    WHEN NULLIF(btrim(f.file_path), '') IS NOT NULL
      THEN encode(digest(f.file_path, 'sha256'), 'hex')
  END AS effective_address_sha256,

  CASE WHEN NULLIF(btrim(f.file_url), '') ~* '^[a-z][a-z0-9+.-]*://([^/?#]+)'
    THEN lower(substring(btrim(f.file_url) FROM '^[a-z][a-z0-9+.-]*://([^/?#]+)')) END AS file_url_domain,
  CASE WHEN NULLIF(btrim(f.file_path), '') ~* '^[a-z][a-z0-9+.-]*://([^/?#]+)'
    THEN lower(substring(btrim(f.file_path) FROM '^[a-z][a-z0-9+.-]*://([^/?#]+)')) END AS file_path_domain,
  CASE WHEN NULLIF(btrim(f.file_url), '') ~* '^([a-z][a-z0-9+.-]*)://'
    THEN lower(substring(btrim(f.file_url) FROM '^([a-z][a-z0-9+.-]*)://')) END AS file_url_protocol,
  CASE WHEN NULLIF(btrim(f.file_path), '') ~* '^([a-z][a-z0-9+.-]*)://'
    THEN lower(substring(btrim(f.file_path) FROM '^([a-z][a-z0-9+.-]*)://')) END AS file_path_protocol,
  (NULLIF(btrim(f.file_url), '') ~* '^[a-z][a-z0-9+.-]*://') AS file_url_is_absolute,
  (NULLIF(btrim(f.file_path), '') ~* '^[a-z][a-z0-9+.-]*://') AS file_path_is_absolute,
  (NULLIF(btrim(f.file_url), '') LIKE '/uploads/%') AS file_url_is_public_path,
  (NULLIF(btrim(f.file_path), '') LIKE '/uploads/%') AS file_path_is_public_path,
  (NULLIF(btrim(f.file_url), '') ~* '[?&](x-amz-[^=&]+|signature|expires|token|sig)=') AS file_url_has_signature,
  (NULLIF(btrim(f.file_path), '') ~* '[?&](x-amz-[^=&]+|signature|expires|token|sig)=') AS file_path_has_signature,

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
\else
\echo R001_METADATA_QUERY_STATUS=BLOCKED
\echo REASON=PGCRYPTO_NOT_AVAILABLE
\endif

ROLLBACK;
