# Docker Desktop Bug Report Draft — Not Submitted

## Proposed Title

Windows 4.86.0 backend cannot start when Docker-owned `windows-daemon.json` is an all-zero JSON state file

## Summary

On Windows build 26200 with WSL 2.6.3, Docker Desktop 4.86.0 build 236216 fails before the engine becomes available. A pre-start, read-only scan found the Docker-owned state file `windows-daemon.json` to be 28 bytes of NUL and invalid JSON. On the single controlled start, `com.docker.backend.exe` emitted one daemon-load NUL parse event that named the candidate basename on the same event line.

The active daemon configuration and settings store remained valid, NUL-free, and content-hash stable. Docker context metadata was valid. No current-boot stale-socket/error-1920 signature was present.

## Environment

- Docker Desktop `4.86.0` build `236216`, all-users install.
- Bundled engine/CLI `29.7.2`.
- Backend SHA-256 `951a96fab7e1d922c042633b121440a9c1bf22c777cd411b67763c5cdd2eb505`.
- Windows `25H2`, build `26200.9168`.
- WSL `2.6.3.0`, kernel `6.6.87.2-1`.
- Insider enrollment `NOT_CONFIRMED`; no active channel metadata observed.

## Minimal Reproduction

1. Stop Docker Desktop and verify no Docker process remains.
2. Observe, without changing it, that the Docker-owned `windows-daemon.json` is all zero and invalid JSON.
3. Start Docker Desktop once.
4. Observe that the engine never becomes available and the backend reports a daemon-load NUL JSON parse failure naming that basename.
5. Stop Docker Desktop.

The diagnostic team did not create the corrupt file and does not know which Docker writer or interrupted operation originally zero-filled it.

## Expected Behavior

Docker Desktop should validate this Docker-owned state file before consumption, preserve or restore the last valid state atomically, and provide a safe, explicit recovery path instead of blocking the entire engine startup on an all-zero file.

## Actual Behavior

The backend consumes the all-zero file, fails JSON parsing, and never exposes a usable engine connection.

## Sanitized Evidence

- Candidate basename: `windows-daemon.json`.
- Candidate path hash: `f66dab6d82e50c35c18a8571827a1893ae69e29942a713cbb19a0da8c1a9e9b8`.
- Candidate SHA-256: `3addfb141cd7c9c4c6543a82191a3707ac29c7a041217782e61d4d91c691aee8`.
- Candidate size/NUL profile: 28 bytes, all zero.
- Current-boot NUL event count: 1.
- First component: `com.docker.backend.exe`.
- Correlation: same event line, unique candidate basename; the full absolute path was not printed.
- Active daemon configuration SHA-256: `27369c832f1be7d067b379f3236a203993e7bec45135e58829a9273c3209f53c`, unchanged and valid.
- Local diagnostic bundle: not created because the no-Diagnostic-ID requirement could not be met.

## Questions for Docker Engineering

1. Which Desktop component owns writes to this state file in 4.86.0?
2. Are those writes atomic and protected against interruption or zero-length/all-zero replacement?
3. What is the vendor-approved backup/quarantine and rollback procedure for this exact file?
4. Is a fix planned or present in a later version, and which release explicitly covers this signature?

`BUG_REPORT_DRAFT_CREATED=YES`

`BUG_REPORT_SUBMITTED=NO`

`DIAGNOSTIC_UPLOADED=NO`
