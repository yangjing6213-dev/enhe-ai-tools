# Immutable Image Archive Contract

## Locked identity

```text
RC_IMAGE_TAG=enhe-ai-tools:phase2c4-public-rc1-78357d7
MUTABLE_TAG_LATEST_ALLOWED=NO
SERVER_BUILD_ALLOWED=NO
IMAGE_BUILD_LOCATION=LOCAL
IMAGE_TRANSFER_MODEL=DOCKER_SAVE_HASH_SECURE_COPY_DOCKER_LOAD
RC_IMAGE_ARCHIVE_SHA256=NOT_EXECUTED
RC_IMAGE_ID=NOT_EXECUTED
RC_IMAGE_CONFIG_DIGEST=NOT_EXECUTED
RC_IMAGE_LABEL_STATUS=NOT_EXECUTED
RC_IMAGE_POST_ACCEPTANCE_POLICY=PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL
```

The immutable image must be built from runtime HEAD `78357d74962276d3036975d2197e9c284eb053b1` and runtime tree `5f488a621539ac2b70efa0dbe4797e3be689b4aa`. The source package-lock SHA-256 is `c61883c10346b28695eea52fbe6fcd8493783d141710aed8245f05398d296ca3`, and the production-source aggregate SHA-256 is `959ba31469cee929b70c66f9649d9029ded71f37985e3f0b8258ef1733a1dfab`.

## Required OCI labels

| Exact label | Required value |
| --- | --- |
| `org.opencontainers.image.revision` | `78357d74962276d3036975d2197e9c284eb053b1` |
| `org.opencontainers.image.created` | RFC 3339 UTC local-build timestamp recorded in the archive receipt |
| `com.enhe.rc.id` | `ENHE-PHASE2C4-PUBLIC-RC1` |
| `com.enhe.runtime.source-tree` | `5f488a621539ac2b70efa0dbe4797e3be689b4aa` |
| `com.enhe.production-source-sha256` | `959ba31469cee929b70c66f9649d9029ded71f37985e3f0b8258ef1733a1dfab` |
| `com.enhe.package-lock-sha256` | `c61883c10346b28695eea52fbe6fcd8493783d141710aed8245f05398d296ca3` |
| `com.enhe.migration-tree-sha256` | `3e30a6ea9e3210abf97fc377cde1b85afdf8684d1214ac63a9fe6826e804c8dc` |

All seven labels are mandatory. The pre-save inspection records the archive SHA-256, image ID, image config digest, and all seven exact label values. After transfer and Docker load, the wrapper must require exact pre/post equality for `RC_IMAGE_ARCHIVE_SHA256`, `RC_IMAGE_ID`, `RC_IMAGE_CONFIG_DIGEST`, and every label value before any Compose create. Missing, substituted, or mismatched values stop execution.

## Phase 2C.5B archive sequence

1. Reconfirm the approved source HEAD, tree, lockfile hash, and production-source hash locally.
2. Build the image locally with the exact locked tag; never add or resolve `latest`.
3. Record the local image ID, repository digest when available, platform, created timestamp, and image size as non-secret evidence.
4. Export the exact image with Docker save to a uniquely named RC archive.
5. Record the archive byte size and SHA-256 before transfer.
6. Use only a separately authorized secure-copy path to transfer that archive during Phase 2C.5B.
7. Load the archive on the host without invoking a server build.
8. Recompute the received server-archive SHA-256 and require exact equality with the local archive SHA-256 before Docker load.
9. Verify exact pre/post-load equality for image ID, image config digest, and all seven OCI label values before any Compose create or start.

Any source, archive, image, tag, platform, or digest mismatch stops execution before RC creation. A tag string alone is not proof of image identity.

## Disk and retention boundary

- The archive, loaded image, writable layers, logs, and other RC-owned additions must fit within the total `8000000000`-byte disk budget.
- Docker-root free space must be at least `40000000000` bytes before load and remain above the runtime kill floor.
- The transferred server archive is always deleted during cleanup.
- The uniquely loaded immutable RC image is preserved by default after acceptance under `RC_IMAGE_POST_ACCEPTANCE_POLICY=PRESERVE_FOR_PHASE_2C6_UPGRADE_APPROVAL`, pending a later Phase 2C.6 approval decision or an explicit user deletion instruction.
- Preserving the image does not mean Phase 2C.6 is approved and does not authorize production use.
- No registry push, mutable retag, production image replacement, or production container recreation is authorized.

```text
IMMUTABLE_IMAGE_CONTRACT_STATUS=DEFINED_NOT_EXECUTED
LOCAL_IMAGE_BUILT=NO
IMAGE_ARCHIVE_CREATED=NO
IMAGE_TRANSFERRED=NO
IMAGE_LOADED_ON_HOST=NO
POST_LOAD_OCI_LABEL_VERIFICATION_REQUIRED=YES
PRODUCTION_IMAGE_CHANGED=NO
```
