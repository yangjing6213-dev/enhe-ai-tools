# ENHE Phase 2C.1 production wiring manifest

Date: 2026-08-15 (Asia/Shanghai)

```text
SOURCE_WORKTREE=C:\Users\HU\Documents\New project 2\.worktrees\enhe-homepage-integration-v1
SOURCE_BOUNDARY=3188f6a71e963a140b65ab11102fb28537bf7767
TARGET_WORKTREE=C:\Users\HU\Documents\New project 2\.worktrees\enhe-production-wiring-v1
TARGET_BRANCH=codex/enhe-production-wiring-v1
DEPLOYMENT_STARTED=NO
PUSHED=NO
PRODUCTION_WIRING_RED_STATUS=EXPECTED_FAIL
PRODUCTION_WIRING_GREEN_STATUS=PASS
PHASE_2C_1_STATUS=PASS
PUBLIC_SHELL_PRODUCTION_SOURCE_WIRING=PASS
HOMEPAGE_PRODUCTION_SOURCE_WIRING=PASS
PHASE_1B_PUBLIC_SHELL_STATUS=READY_FOR_STAGING_ACCEPTANCE
PRODUCTION_ROUTE_SOURCE_WIRED=YES
LIVE_PRODUCTION_CHANGED=NO
DEPLOYMENT_STARTED=NO
PHASE_1B_PRODUCT_DETAIL_STATUS=NOT_READY
PHASE_1B_COMMERCE_STATUS=NOT_READY
PHASE_1B_OVERALL_STATUS=NOT_READY
PHASE_2C_1_NEXT_ACTION=STAGING_ACCEPTANCE_OR_PHASE_2B3_SOFTWARE_CANDIDATE_INTEGRATION
```

This phase wires the approved public Header/Footer to the existing Chinese and English public shell and replaces only the production homepage body at `/` and `/en`. Product detail, commerce, private layouts, APIs, database models, Heartbeat, writer, deployment, and remote operations are out of scope.

The RED state was recorded before production source changes and failed because the production adapter, route wiring, path header, and public visual-effect boundary did not yet exist. The GREEN state was verified after implementation with focused tests, full-suite stability, development browser acceptance, production build, and traced standalone acceptance.
