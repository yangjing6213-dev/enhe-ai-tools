# Phase 2C.5A Baseline and Model Supersession

## Preserved evidence

```text
PREVIOUS_PHASE_2C5A_STATUS=COMPLETE_WITH_INPUT_REQUIRED_PRESERVED
PREVIOUS_PHASE_2C5A_EVIDENCE_MODIFIED=NO
PUBLIC_SURFACE_RELEASE_CANDIDATE_STATUS=PASS_UNCHANGED
RC_ID=ENHE-PHASE2C4-PUBLIC-RC1
DEDICATED_STAGING_TARGET_STATUS=NOT_PROVEN
STAGING_DEPLOYMENT_PLAN_SHA256=44cfb0ef4255baafa516914a0a047c4893369f9bb8f4cfe681985c85b9025f9f
ROLLBACK_PLAN_SHA256=a582f3116d95a321a8f97a6a96a0ca149708575b21365d4eebbbe0d61148629c
```

Phase 2C.5A remains an intact historical approval package. This follow-up neither edits its 17 files nor converts its missing dedicated-Staging evidence into proof. It supersedes only the deployment-model conclusion for the next approval decision: the selected RC validation model is now a temporary, logically isolated slot on the existing production host, subject to a fresh live capacity gate and zero-impact controls.

## Source baseline

| Anchor | Value |
| --- | --- |
| Source branch | `codex/enhe-phase2c5-staging-approval-v1` |
| Source HEAD | `96c26f82762ddd491a44269897d6bb5f4a7141a9` |
| Source tree | `67f497edaa69919c29f7bf28664a8d1909e56f7c` |
| Runtime HEAD | `78357d74962276d3036975d2197e9c284eb053b1` |
| Runtime tree | `5f488a621539ac2b70efa0dbe4797e3be689b4aa` |
| Production-source SHA-256 | `959ba31469cee929b70c66f9649d9029ded71f37985e3f0b8258ef1733a1dfab` |
| Package-lock SHA-256 | `c61883c10346b28695eea52fbe6fcd8493783d141710aed8245f05398d296ca3` |
| Migration-tree SHA-256 | `3e30a6ea9e3210abf97fc377cde1b85afdf8684d1214ac63a9fe6826e804c8dc` |

## Previous Phase 2C.5A archive receipt

```text
PREVIOUS_PHASE_2C5A_ZIP_SIZE=27439
PREVIOUS_PHASE_2C5A_ZIP_SHA256=53b39bce4dbdb7f71d48ad83d8b148ab26aaf73b3e920d08a4e5a253a4339549
PREVIOUS_PHASE_2C5A_ZIP_FILE_COUNT=17
PREVIOUS_PHASE_2C5A_ZIP_BAD_CRC=0
PREVIOUS_PHASE_2C5A_ZIP_GIT_SET_MATCH=YES
PREVIOUS_PHASE_2C5A_ZIP_GIT_HASH_MATCH=YES
PHASE2C5A_ZIP_INVALID_PATHS=0
PHASE2C5A_ZIP_GIT_MISMATCH_COUNT=0
```

## Locked model distinction

```text
UPGRADE_MODEL=IN_PLACE_EXISTING_SITE_UPGRADE
RC_VALIDATION_MODEL=SAME_HOST_EPHEMERAL_RC_VALIDATION
STAGING_HOST_MODEL=EXISTING_PRODUCTION_HOST_EPHEMERAL_ISOLATED_SLOT
STAGING_HOST_ISOLATION=LOGICAL_CONTAINER_ISOLATION
STAGING_PERSISTENCE=TEMPORARY_ACCEPTANCE_WINDOW
NEW_WEBSITE_CREATED=NO
SECOND_LONG_RUNNING_WEBSITE=NO
SECOND_LONG_RUNNING_DATABASE=NO
NEW_PUBLIC_STAGING_DOMAIN_REQUIRED=NO
```

The temporary RC is an acceptance instrument, not a second website. Phase 2C.5B may validate only that RC. Replacing the existing production runtime remains the separate `PHASE_2C_6_IN_PLACE_PRODUCTION_UPGRADE` decision.

```text
PHASE_1B_PRODUCT_DETAIL_STATUS=NOT_READY
PHASE_1B_COMMERCE_STATUS=NOT_READY
PHASE_1B_OVERALL_STATUS=NOT_READY
```

No RC result may be represented as readiness for these Phase 1B surfaces.
