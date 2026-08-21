# Public Surface RC Scope

## In scope

- Shared public header and bilingual navigation.
- Shared public footer and bilingual filing display.
- Chinese home route `/` and English home route `/en`.
- Chinese software-list route `/software` and English route `/en/software`.
- Five-product home SSR and product-stage motion.
- Seven-category software selector and 12-item pagination contract.
- Mobile support-launcher exclusion behavior.
- Category layer, home product stage, and mobile navigation motion.
- Review-carousel accessibility and timer behavior already covered by the production gate.

## Out of scope

- Product-detail readiness, commerce readiness, payment, download, OAuth, admin, account mutation, publication, production data, and production deployment.
- Dedicated staging provisioning or connection.
- Any redesign prototype route or source.
- Product catalog content quality beyond the deterministic local acceptance fixtures.

This is a release candidate for the listed public surfaces only. It is not a declaration that the complete site is ready. Phase 1B product-detail, commerce, and overall status remain `NOT_READY`.

`PUBLIC_HEADER=IN_SCOPE`, `PUBLIC_FOOTER=IN_SCOPE`, `ZH_HOME_ROUTE=IN_SCOPE`, `EN_HOME_ROUTE=IN_SCOPE`, `ZH_SOFTWARE_ROUTE=IN_SCOPE`, `EN_SOFTWARE_ROUTE=IN_SCOPE`, `SUPPORT_EXCLUSION_SYSTEM=IN_SCOPE`, `CATEGORY_LAYER_MOTION=IN_SCOPE`, `HOME_PRODUCT_STAGE_MOTION=IN_SCOPE`, `MOBILE_NAVIGATION_MOTION=IN_SCOPE`, `MOTION_HYGIENE=IN_SCOPE`, `SSR_PRODUCT_FALLBACK=IN_SCOPE`, and `CATEGORY_SUPPORT_MODAL_OWNERSHIP=IN_SCOPE`.

`PRODUCT_DETAIL=OUT_OF_SCOPE_NOT_READY`, `DOWNLOAD_AND_ENTITLEMENT=OUT_OF_SCOPE_NOT_READY`, `PAYMENT_AND_REFUND=OUT_OF_SCOPE_NOT_READY`, `OAUTH=OUT_OF_SCOPE_NOT_READY`, `COUPON_AND_EXPLORER_PASS=OUT_OF_SCOPE_NOT_READY`, `USER_CENTER_REDESIGN=OUT_OF_SCOPE`, `ADMIN_REDESIGN=OUT_OF_SCOPE`, and `CONTENT_PHASE_3=OUT_OF_SCOPE`.

`PUBLIC_RC_SCOPE_STATUS=PASS`

`OUT_OF_SCOPE_BOUNDARY_STATUS=PASS`
