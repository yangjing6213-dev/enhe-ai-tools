# Root-cause Classification

## Decision

`DOCKER_ROOT_CAUSE_CLASS=DOCKER_BACKEND_INTERNAL_FAILURE`

`DOCKER_ROOT_CAUSE_STATUS=PROVEN`

`ROOT_CAUSE_FIRST_FATAL_TIME=2026-08-19T02:47:56.2073081Z`

`ROOT_CAUSE_PROVIDER=com.docker.backend.exe`

`ROOT_CAUSE_EVENT_ID=NOT_APPLICABLE_NO_WINDOWS_EVENT`

`ROOT_CAUSE_ERROR_CODE=JSON_INVALID_CHARACTER_NUL`

`ROOT_CAUSE_EVIDENCE_COUNT=12`

## Class review

| Class | Result | Evidence |
|---|---|---|
| A Host virtualization/feature disabled | rejected | Firmware virtualization and Hypervisor are active; WSL system executes. Elevated feature/BCD details remain unreadable, not proven disabled. |
| B WSL service/platform failure | rejected | Both WSL system probes exit 0; no corresponding fatal Windows event. |
| C WSL kernel/version incompatibility | rejected | No current boot message requests an update or reports incompatibility. |
| D VHDX attach/filesystem failure | rejected | No current VHDX error; source equals backup and remains hash-stable; VM disk was not modified. |
| E HCS/vmcompute failure | rejected | vmcompute remains Running; no HCS error or Windows event. |
| F HNS/network provisioning failure | rejected | HNS remains Running; the VM never reaches basic engine startup and no HNS failure appears. |
| G Docker backend internal failure | **proven** | Both boots reproduce an immediate backend daemon-load NUL/JSON failure and later unhandled IPC failure while lower layers stay healthy. |
| H Stale WSL state recovered by shutdown | rejected | Attempt 2 fails identically after the one authorized shutdown. |
| I Startup slower than prior timeout | rejected | Neither attempt connects by 240 seconds. |
| J Insufficient evidence | not selected | The allowed G-layer evidence contract is satisfied. |

## Twelve supporting facts

1. The active daemon file is a valid 124-byte JSON object with zero NUL bytes and the expected SHA-256.
2. The settings store is also a valid JSON object with zero NUL bytes.
3. Both files retain the same hashes after both attempts.
4. `wsl --system ... true` exits 0.
5. `wsl --system ... uname -a` exits 0.
6. Firmware virtualization and the Hypervisor are active.
7. WslService, vmcompute, HNS, and HvHost remain Running.
8. The VM disk equals its verified backup, has no current error, and remains unchanged.
9. Attempt 1 emits the backend daemon-load NUL error about one second after attempt start.
10. Attempt 2 emits the same error after an authorized WSL shutdown.
11. Neither attempt has a corresponding HCS, HNS, VHDX, WSL, or Windows-event fatal error.
12. Deadlines and named-pipe failures occur later and are causally downstream.

The proven conclusion is the failing layer, not the exact hidden origin of the stale NUL-bearing daemon representation inside Docker Desktop. The active on-disk daemon file is demonstrably not corrupt during either attempt. This unresolved internal provenance is why another configuration rewrite is not justified.
