# Phase 2C.4 RC Baseline Verification

## Authoritative source

- Scope token: `PUBLIC_SURFACE_RELEASE_CANDIDATE`
- RC ID: `ENHE-PHASE2C4-PUBLIC-RC1`
- Source worktree: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-phase2c4-public-rc1`
- Source branch: `codex/enhe-phase2c4-public-rc1`
- Source HEAD: `f99017624fe81b33cd511f36ad17c85dd09cc864`
- Source tree: `815e169ba8bce943deb5e9cf6423c9c4fee2c9a8`
- Runtime source HEAD: `78357d74962276d3036975d2197e9c284eb053b1`
- Runtime source tree: `5f488a621539ac2b70efa0dbe4797e3be689b4aa`
- Production-source aggregate SHA-256: `959ba31469cee929b70c66f9649d9029ded71f37985e3f0b8258ef1733a1dfab`
- Package-lock SHA-256: `c61883c10346b28695eea52fbe6fcd8493783d141710aed8245f05398d296ca3`
- Migration-tree SHA-256: `3e30a6ea9e3210abf97fc377cde1b85afdf8684d1214ac63a9fe6826e804c8dc`

The source worktree was Git-clean. The RC documentation commit changes only `docs/enhe-redesign/phase-2c4/**`. The local ancestor chain contains the four D4R commits, the D1/D2/D3 production-motion commits, motion hygiene, the component-scoped support exclusion system, bilingual software integration, R-008 closure, and the final Heartbeat Seam and concurrency-safe Writer work.

## RC archive verification

```text
RC_ZIP_STATUS=PASS
RC_ZIP_SIZE=2646200
RC_ZIP_SHA256=b10d242d70893031a1c15790db5c6cce8e3d49cf2e77c53bde980ed4a5288ebe
RC_ZIP_FILE_COUNT=28
RC_ZIP_MARKDOWN_COUNT=17
RC_ZIP_JSON_COUNT=1
RC_ZIP_SCREENSHOT_COUNT=8
RC_ZIP_VIDEO_COUNT=2
RC_ZIP_BAD_CRC=0
RC_ZIP_INVALID_PATHS=0
RC_ZIP_GIT_DOCUMENT_SET_MATCH=YES
RC_ZIP_GIT_DOCUMENT_HASH_MATCH=YES
RC_ZIP_GIT_MISMATCH_COUNT=0
RC_ZIP_MEDIA_HASH_MATCH=YES
RC_ZIP_MEDIA_MISMATCH_COUNT=0
```

The archive was hashed by streaming SHA-256, checked entry-by-entry for CRC and path safety, extracted to a system temporary directory, compared byte-for-byte with the RC Git document blobs, and checked against every media size/hash in `release-candidate-manifest.json`.

```text
RC_BASELINE_STATUS=PASS
PUBLIC_SURFACE_RELEASE_CANDIDATE_STATUS=PASS_UNCHANGED
SOURCE_WORKTREE_CLEAN=YES
DEPLOYMENT_STARTED=NO
PUSHED=NO
TAG_CREATED=NO
REMOTE_CHANGED=NO
```
