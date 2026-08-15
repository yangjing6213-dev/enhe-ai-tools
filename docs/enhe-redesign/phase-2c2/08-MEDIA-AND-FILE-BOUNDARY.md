# Media and file boundary

Commit 006e50448579308b4f2075cd3868bde70e5483b8 moves the changed catalog cards to optimized Next.js image rendering while preserving explicit dimensions, aspect ratio, localized alt text, and a load-failure fallback.

The catalog receives opaque public media identifiers. A cached public cover projection selects only id and coverImage and is invalidated with public-tools. The image route accepts canonical local public paths under /images/ and /api/uploads/; external URLs, traversal, and non-canonical paths are rejected.

The new catalog does not query, return, serialize, or render fileUrl, filePath, object keys, delivery archives, or permanent download addresses. An inherited src compatibility response remains for pre-existing detail/tool-card consumers; the new catalog never emits or relies on it. Product-detail and download implementations were not modified.

No image domain was added to Next.js configuration. Focused media tests, source-boundary tests, lint, HTML inspection, and browser checks passed. CHANGED_CATALOG_IMG_LINT_WARNING_COUNT=0.
