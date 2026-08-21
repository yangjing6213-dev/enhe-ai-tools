# Release Candidate Provenance

## Authoritative source

- Source branch: `codex/enhe-motion-final-correction-v1`
- Source HEAD: `78357d74962276d3036975d2197e9c284eb053b1`
- Source tree: `5f488a621539ac2b70efa0dbe4797e3be689b4aa`
- RC branch: `codex/enhe-phase2c4-public-rc1`
- RC start HEAD: `78357d74962276d3036975d2197e9c284eb053b1`
- Source worktree was clean before and after acceptance.

The D4R result archive was independently validated before the RC worktree was created:

- Size: `2917323` bytes
- SHA-256: `efdd65f359a1cad8cf4aaf1189d7fd92d0055fa10bd4efe43b0e889adf086cc3`
- File count: `36`
- Bad CRC entries: `0`
- Invalid paths: `0`
- Raw-byte mismatches against Git blobs: `0`.
- Raw-byte mismatches against the authoritative source worktree: `0`.
- Raw-byte mismatches against the RC worktree: `20`, all Markdown EOL materialization only.

The archive contains 20 Markdown, 12 PNG, and 4 WebM files. A fresh four-way check compared every ZIP entry with Git blob bytes, the authoritative source worktree, and the RC worktree. ZIP, Git blobs, and source-worktree files matched all 36 byte-for-byte. The RC worktree materialized the 20 Markdown files as CRLF while ZIP/Git/source used LF; the 16 media files still matched. Both worktrees remained Git-clean because Git-normalized content is identical. Therefore `D4R_ZIP_GIT_DOCUMENT_HASH_MATCH=YES` refers to Git document blobs, not raw RC-checkout bytes.

- `PHASE_2C_3D_4R_STATUS=PASS`
- `PHASE_2C_3D_4_STATUS=PASS_SUPERSEDED_BY_D4R`
- `PHASE_2C_3D_STATUS=PASS`
- `PHASE_2C_3_STATUS=PASS`
- `PREVIOUS_PHASE_2C3D4_STATUS=BLOCKED_PRESERVED`
- `PREVIOUS_D4_EVIDENCE_MODIFIED=NO`
- `D4R_MARKDOWN_COUNT=20`
- `D4R_SCREENSHOT_COUNT=12`
- `D4R_VIDEO_COUNT=4`
- `D4R_ZIP_INVALID_PATHS=0`
- `D4R_ZIP_GIT_DOCUMENT_SET_MATCH=YES`
- `D4R_ZIP_GIT_MISMATCH_COUNT=0`

## Immutable input hashes

- `package.json`: `ccea1fdf7b1995d7a15a5f924f762b4a4d678ae72d36d71f801c5073e3ba4e75`
- `package-lock.json`: `c61883c10346b28695eea52fbe6fcd8493783d141710aed8245f05398d296ca3`
- `Dockerfile`: `aaf8d1967e4ef7e6d55f67d562b408f03f3ace8803640f49f3915882ced7df7a`
- Next configuration: `ff5bcf923efbbf1b5c563c0613b68005730baf61ca6743ecf55125273433c178`
- Prisma schema: `e477ada9b59f69e50fb7328520910a1153e9b1b0a074b561f74a8b4c1f312519`
- Migration tree, 50 tracked files: `3e30a6ea9e3210abf97fc377cde1b85afdf8684d1214ac63a9fe6826e804c8dc`
- Production-source aggregate, 1105 files: `959ba31469cee929b70c66f9649d9029ded71f37985e3f0b8258ef1733a1dfab`

Exact hash fields: `PACKAGE_JSON_SHA256=ccea1fdf7b1995d7a15a5f924f762b4a4d678ae72d36d71f801c5073e3ba4e75`, `DOCKERFILE_SHA256=aaf8d1967e4ef7e6d55f67d562b408f03f3ace8803640f49f3915882ced7df7a`, `NEXT_CONFIG_SHA256=ff5bcf923efbbf1b5c563c0613b68005730baf61ca6743ecf55125273433c178`, and `PRISMA_SCHEMA_SHA256=e477ada9b59f69e50fb7328520910a1153e9b1b0a074b561f74a8b4c1f312519`.

## Aggregate-hash procedure

The canonical file lists are generated from this exact HEAD, not manually copied:

- Production list: `git ls-files -z -- src/app src/components src/styles src/lib`; 1105 paths; sorted path-list SHA-256 `de863508d78d97a236fb6eb5994cb5fc5b2a7f95cd1a4327dd3206a8d5176a80`.
- Migration list: `git ls-files -z -- prisma/migrations`; 50 paths; sorted path-list SHA-256 `524b09a97543a9d198831e9733320a46879cd772700263b508f684398d77d4b7`.

For each aggregate, decode the NUL-delimited paths as UTF-8, remove the terminal empty item, sort by repository-relative path, then feed SHA-256 with: UTF-8 path bytes, one NUL byte, raw file bytes, one NUL byte, repeated for every file. The path-list digest is SHA-256 over the same sorted paths joined by LF with no trailing LF. Single-file hashes are SHA-256 over raw bytes only. This procedure reproduces both aggregate hashes above without storing a duplicate 1105-line manifest.

The Phase 2C.3C prototype directory is not present in the current tree. Its historical commit was consulted only as a contract source and was not copied into this RC.
