# R-001 public/private file boundary

`R001_PHASE1A_PUBLIC_DESIGN_BOUNDARY=PASS`
`R001_PRODUCTION_FILE_INVENTORY=OPEN`
`R001_PRODUCT_DETAIL_AND_DOWNLOAD=BLOCKED`

## Boundary template

- Public media allowlist: brand logo, approved marketing cover, original avatar/illustration, and non-sensitive static documentation image.
- Private delivery types: paid archives, installers, license files, signed exports, and order-specific attachments.
- Public components must never read `File.fileUrl`, `File.filePath`, provider keys, signed URLs, order IDs, or private storage metadata.
- Route-to-file matrix columns: route, auth, file class, storage key class, response policy, cache policy, audit event, and owner.
- Scans: HTML, RSC payload, public API JSON, JSON-LD, CDN cache, unauthenticated request, historical permanent URLs, and historical order mapping.
- Signed URL policy: short TTL, least privilege, one entitlement, explicit expiry response, and no indexing/caching of private responses.
- Operations: download log, anomalous-frequency review, expiry cleanup, and historical-order migration mapping.

The public shell and home must not read the two private file fields above. Product details and downloads remain blocked until the production inventory, ACL proof, CDN check, and unauthenticated denial test are complete.

## Phase 1A.2 public-media evidence

Seven 1672×941 images were copied from public `https://www.enhe-tech.com.cn/api/uploads/**` URLs displayed by ENHE public catalog pages into `prototype/assets/product-media/`. `prototype/assets/product-media-manifest.json` freezes each public source URL, local path and SHA-256, with `publicAsset=true` and `containsDeliveryData=false`. The prototype reads only these local copies. No `File.fileUrl`, `File.filePath`, order record, delivery package, private object key, signed URL or permanent download address was read. This evidence passes the Phase 1A public design boundary only; it does not close the production inventory or product-detail/download gates above.
