# Phase 2C.3B-D2 Manifest

## Outcome

`PHASE_2C_3B_D2R_STATUS=PASS`

`PHASE_2C_3B_D2_STATUS=PASS`

`PHASE_2C_3B_STATUS=BLOCKED`

The D2 read-only investigation proves an exact on-disk Docker state-file source for the current boot's backend NUL parse failure. No recovery action was performed. Motion hygiene remains passed, while the Docker engine and PostgreSQL gates remain blocked.

## D1 Evidence Availability and Limitation

- The original D1 quarantine directory was deleted by the user and could not be recovered from the Recycle Bin.
- No D1 raw manifest or raw boot log was reconstructed.
- The original D1 ZIP was restored from the original conversation upload, not recreated from Git.
- Stable streaming SHA-256, ZIP entry, CRC, extraction, path-safety, and per-file Git-blob checks passed.
- The restored 12-file ZIP is byte-for-byte consistent with the D1 directory in commit `aa83310340c3ef3f02427f02865800617343dfec`.
- The historical D1 root-cause layer is inherited only as a committed and packaged conclusion. D1 raw boot evidence cannot be independently re-read.
- Every current-boot and exact-source conclusion in D2 comes from newly collected D2 evidence.

`D1_ORIGINAL_ZIP_RESTORED_FROM_CONVERSATION_UPLOAD=YES`

`D1_ORIGINAL_ZIP_RECREATED_FROM_GIT=NO`

`D1_ZIP_SHA256_VERIFIED=YES`

`D1_ZIP_GIT_FILE_HASH_MATCH=YES`

`D1_RAW_QUARANTINE_AVAILABLE=NO`

`D1_RAW_QUARANTINE_DELETED_BY_USER=YES`

`D1_RAW_QUARANTINE_RECOVERABLE=NO`

`D1_RAW_MANIFEST_RECREATED=NO`

`D1_RAW_LOGS_RECREATED=NO`

`D1_COMMITTED_EVIDENCE_REVERIFIED=YES`

`D1_RAW_EVIDENCE_REVERIFIED=NO_RAW_ARTIFACTS_UNAVAILABLE`

`D1_EVIDENCE_CONFIDENCE=COMMITTED_SUMMARY_VERIFIED_RAW_ARTIFACTS_UNAVAILABLE`

`D1_HISTORICAL_ROOT_CAUSE_ACCEPTED=YES`

`D2_CURRENT_BOOT_EVIDENCE_REQUIRED=YES`

`D2_EXACT_NUL_SOURCE_MUST_BE_NEWLY_PROVEN=YES`

## D2 Evidence Boundary

`D2_RAW_EVIDENCE_DIRECTORY=C:\Users\<USER>\Desktop\ENHE-Quarantine\docker-backend-d2-20260819T130729Z`

`D2_RAW_EVIDENCE_DIRECTORY_CREATED=YES`

`D2_MANIFEST_SCOPE=D2_ONLY`

`D2_RAW_MANIFEST_ENTRY_COUNT=39`

The raw manifest intentionally excludes itself because a file cannot contain its own stable hash. Raw logs, state scans, command outputs, platform metadata, and research cache stay outside Git and outside the result ZIP.

## Committed Document Set

1. `00-PHASE-2C3B-D2-MANIFEST.md`
2. `01-INSTALLED-VERSION-AND-PLATFORM.md`
3. `02-LOCAL-DIAGNOSTIC-BUNDLE.md`
4. `03-DOCKER-STATE-NUL-SCAN.md`
5. `04-CONTEXT-AND-RUN-STATE-REVIEW.md`
6. `05-CONTROLLED-START-STATE-DIFF.md`
7. `06-VERSION-AND-ISSUE-CORRELATION.md`
8. `07-NUL-PROVENANCE-CLASSIFICATION.md`
9. `08-DOCKER-SUPPORT-READY-REPORT.md`
10. `09-DOCKER-DESKTOP-BUG-REPORT-DRAFT.md`
11. `10-SOURCE-SCOPE.md`
12. `11-COMMAND-LOG.md`
13. `12-FINAL-RECEIPT.md`

## Material Limitation

The controlled-start monitor collected three five-second samples and then failed with Windows `WinError 8`. Docker start was invoked exactly once and was not retried. The complete current-boot log, pre/post state snapshots, source correlation, and controlled stop were still obtained. The 240-second continuous-sampling contract was not met and is not represented as met.

## Safety Summary

No Docker configuration, WSL configuration, Registry value, Windows feature, VHDX content, Docker resource, application source, project secret, project `.env`, remote, or production system was changed. No diagnostic upload, Diagnostic ID, GitHub issue submission, push, deployment, build, migration, seed, container creation, image pull, or production database connection occurred.
