# Production Surface Boundary

The integration is intentionally a candidate/preview integration, not a production wiring change.

```text
PUBLIC_HEADER_REPLACED=NO
PUBLIC_FOOTER_REPLACED=NO
PUBLIC_HOME_REPLACED=NO
PUBLIC_PRODUCT_DETAIL_REPLACED=NO
COMMERCE_SURFACE_CHANGED=NO
PRISMA_CHANGED=NO
ROOT_LAYOUT_CHANGED=NO
GLOBAL_STYLES_CHANGED=NO
PACKAGE_OR_LOCKFILE_CHANGED=NO
HEARTBEAT_OR_WRITER_CHANGED=NO
BYTE_DANCE_LOADER_PRESENT=NO
ANALYTICS_TRACKER_RETAINED=YES
```

No public production navigation link points to the preview. No order, payment, download, file URL/path, or backend data access is introduced by the candidate. A regular guest has no backend entry; the admin preview state shows the backend entry only under the avatar menu.

