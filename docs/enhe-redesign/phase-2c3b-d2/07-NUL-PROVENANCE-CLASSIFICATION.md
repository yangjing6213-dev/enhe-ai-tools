# NUL Provenance Classification

## Verified Evidence Chain

1. Before Docker start, a Docker-owned per-user state file named `windows-daemon.json` existed as a 28-byte, all-zero, invalid JSON file.
2. Its SHA-256 was `3addfb141cd7c9c4c6543a82191a3707ac29c7a041217782e61d4d91c691aee8`; its path hash was `f66dab6d82e50c35c18a8571827a1893ae69e29942a713cbb19a0da8c1a9e9b8`.
3. It was the only scanned file with that basename.
4. Approximately 2.93 seconds after the only start invocation, `com.docker.backend.exe` produced a daemon-load NUL JSON parse event.
5. The candidate basename appears on that exact event line. The full absolute path is not printed in the raw log.
6. The installed backend binary contains the candidate basename, and public Docker evidence independently confirms that Docker consumes this file.
7. Active daemon/settings text configuration remained valid, NUL-free, and content-hash stable. Context metadata was valid and NUL-free.
8. No current-boot Inference manager, stale socket, secrets-engine, AF_UNIX, or error-1920 pattern was observed.

## Evidence Discipline

Facts 1–5 are direct D2 observations. Resolving the basename to the path hash uses the unique scanned basename, Docker ownership class, installed backend consumer string, and documented Docker file role. Because the raw log omits the full absolute path, that limitation is retained; no claim is made about the writer that originally zero-filled the file.

## Classification

`EXACT_NUL_SOURCE_CANDIDATE=YES`

`EXACT_NUL_SOURCE_PATH_HASH=f66dab6d82e50c35c18a8571827a1893ae69e29942a713cbb19a0da8c1a9e9b8`

`EXACT_NUL_SOURCE_BASENAME=windows-daemon.json`

`EXACT_NUL_SOURCE_SHA256=3addfb141cd7c9c4c6543a82191a3707ac29c7a041217782e61d4d91c691aee8`

`EXACT_NUL_SOURCE_CORRELATION=EXACT_PATH_AND_TIME`

`EXACT_NUL_SOURCE_CORRELATION_QUALIFIER=SAME_EVENT_LINE_UNIQUE_BASENAME_FULL_ABSOLUTE_PATH_NOT_LOGGED`

`DOCKER_NUL_PROVENANCE_CLASS=EXACT_ON_DISK_DOCKER_STATE_FILE`

`DOCKER_NUL_PROVENANCE_STATUS=PROVEN`

This is not classified as a version-specific Docker bug: no public result matches the full signature/environment and no fixed version is identified. It is not classified as corrupt context metadata or a build-26200 socket defect because those evidence requirements are not met.

## Only Authorized Next Action

`PHASE_2C_3B_D2_NEXT_ACTION=AUTHORIZE_BACKUP_AND_QUARANTINE_EXACT_DOCKER_STATE_FILE`

That action was not executed. A later recovery phase would require explicit authorization, a byte-for-byte backup with hash verification, an exact single-file target, Docker fully stopped, and a post-action controlled verification. D2 does not authorize deletion, broad directory cleanup, configuration editing, update, downgrade, reinstall, WSL reset, or factory reset.
