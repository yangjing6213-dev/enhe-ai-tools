# Docker Support-Ready Report

## Problem Summary

Docker Desktop 4.86.0 build 236216 on Windows build 26200 with WSL 2.6.3 fails to bring up the engine. Historical D1 evidence classified the failure layer as `DOCKER_BACKEND_INTERNAL_FAILURE`. D2 independently reproduced one current-boot backend NUL JSON parse event and resolved it to an all-zero Docker-owned `windows-daemon.json` state file.

## Environment

- Windows build: `26200.9168`, display version `25H2`.
- Insider status: `NOT_CONFIRMED`; no active channel metadata observed.
- WSL: `2.6.3.0`; kernel `6.6.87.2-1`.
- Docker Desktop: `4.86.0` build `236216`; all-users installation.
- Bundled engine/CLI: `29.7.2`.
- Backend SHA-256: `951a96fab7e1d922c042633b121440a9c1bf22c777cd411b67763c5cdd2eb505`.
- Official latest Desktop release at review time: `4.87.0`.

## Reproduction Evidence

Historical D1 committed evidence records two controlled starts, both failing before engine recovery and each showing three boot-scoped backend NUL daemon-load events. D1 raw logs are no longer available and this limitation is explicit.

D2 invoked `docker desktop start` once. The engine remained unavailable. The complete current-boot log contained one backend daemon-load NUL event at 2026-08-19T13:18:47.350474500Z. The same event line named the unique all-zero source candidate. Docker was then stopped, with zero Docker processes in the final check.

The D2 sampling monitor failed after three samples with Windows `WinError 8`; it was not retried. Current-boot log and pre/post state evidence were collected separately.

## Configuration and Source Integrity

- Active daemon configuration: valid JSON object, zero NULs, unchanged SHA-256 `27369c832f1be7d067b379f3236a203993e7bec45135e58829a9273c3209f53c`.
- Settings store: valid JSON object, zero NULs, unchanged content hash.
- Context metadata: one scanned; valid, NUL-free; endpoint metadata valid.
- Exact candidate: `windows-daemon.json`, 28 bytes, all zero, SHA-256 `3addfb141cd7c9c4c6543a82191a3707ac29c7a041217782e61d4d91c691aee8`, path hash `f66dab6d82e50c35c18a8571827a1893ae69e29942a713cbb19a0da8c1a9e9b8`.
- VHDX: content excluded; metadata unchanged.

No Docker configuration body, key, value, context endpoint, credential, account, IP, proxy, token, username, private URL, or raw diagnostic text is included.

## Classification and Version Correlation

`DOCKER_NUL_PROVENANCE_CLASS=EXACT_ON_DISK_DOCKER_STATE_FILE`

`DOCKER_NUL_PROVENANCE_STATUS=PROVEN`

Docker public issues confirm that the named state file is consumed/overwritten by Docker, but no issue matches the complete 4.86.0/build-26200/all-zero-file/backend-load signature. Build-26200 stale-socket reports have a different component and error. Docker 4.87.0 release notes do not identify a fix for this observed signature.

## Diagnostic Availability

No local diagnostic bundle is available. The installed gather help indicates that an ID is generated when none is supplied, so the no-Diagnostic-ID hard gate prevented collection.

`LOCAL_DIAGNOSTIC_BUNDLE_SHA256=NOT_CREATED`

`DIAGNOSTIC_ID_CREATED=NO`

`DIAGNOSTIC_UPLOADED=NO`

## Excluded Layers and Unperformed Actions

The active daemon/settings configuration, context metadata, WSL platform probes, virtualization layer, VHDX metadata, current-boot inference manager, and stale-socket signature do not explain the observed event. No configuration edit, state-file delete/move, WSL command that mutates state, VHDX access, update, downgrade, reinstall, factory reset, resource creation, container action, upload, or issue submission occurred.

## Authorization Required

`PHASE_2C_3B_D2_NEXT_ACTION=AUTHORIZE_BACKUP_AND_QUARANTINE_EXACT_DOCKER_STATE_FILE`

Support may alternatively advise a vendor-approved recovery path. No action should be taken until the exact single-file backup/quarantine operation and rollback evidence are explicitly authorized.
