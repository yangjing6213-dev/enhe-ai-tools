# Controlled Start and State Diff

## Start Outcome

Docker Desktop was confirmed stopped before the only start invocation.

`CONTROLLED_START_UTC=2026-08-19T13:18:44.420021Z`

`DOCKER_START_INVOCATION_COUNT=1`

`CONTROLLED_START_RESULT=FAIL_ENGINE_UNAVAILABLE_WITH_SAMPLING_DEVIATION`

`CONTROLLED_START_DURATION_SECONDS=448.099`

`CONTROLLED_START_MAX_WAIT_CONTRACT_MET=NO`

The duration is the observed start-to-controlled-stop interval, not a claim that the requested 240-second monitor completed. Three five-second samples were captured. The monitor then failed while creating another child process with Windows `WinError 8`; the start was not retried. All three samples showed no usable engine connection.

## Current-Boot Evidence

The complete current-boot log was captured separately and retained only in quarantine.

`CURRENT_BOOT_NUL_ERROR_COUNT=1`

`CURRENT_BOOT_FIRST_NUL_TIME=2026-08-19T13:18:47.350474500Z`

`CURRENT_BOOT_FIRST_NUL_COMPONENT=com.docker.backend.exe`

`CURRENT_BOOT_FIRST_NUL_SANITIZED_CONTEXT=DAEMON_LOAD_JSON_NUL`

The first NUL parse event occurred about 2.93 seconds after the reconstructed start time. The event and the unique candidate basename occur on the same log line. The raw line is intentionally not reproduced.

## Pre/Post Snapshot Totals

`PRE_START_STATE_FILE_COUNT=41`

`POST_START_STATE_FILE_COUNT=41`

`STATE_FILE_CHANGED_COUNT=6`

`STATE_FILE_NEW_NUL_COUNT=0`

`STATE_FILE_BECAME_INVALID_JSON_COUNT=0`

The exact source did not become corrupt during this start: it was already all zero in the pre-start snapshot and remained byte-identical afterward.

## Changed Entries

| Basename | Change | Timing class | Interpretation |
| --- | --- | --- | --- |
| `inference.log` | content and write time | before first NUL | ordinary startup log activity; no Inference manager error |
| `settings-store.json` | write time only; content hash unchanged | before first NUL | Docker touched metadata; no configuration-content change |
| `daemon.json` | write time only; content hash unchanged | before first NUL | Docker touched metadata; valid content remained unchanged |
| `Docker Desktop.exe.log` | appended | after first NUL | downstream log activity |
| `com.docker.backend.exe.log` | appended | after first NUL | downstream log activity containing the source correlation |
| `docker-desktop.exe.log` | appended | after first NUL | downstream log activity |

No file newly gained NULs, no valid JSON became invalid, and no unauthorized file change was observed.

## VHDX and Stop Verification

VHDX content was explicitly excluded. Metadata-only size and write time were identical before and after the start.

`VHDX_CHANGED=NO_METADATA_CHANGE_OBSERVED`

The controlled stop exited successfully in 8.317 seconds. A later read-only check found no Docker process and no Desktop/engine pipe.

`DOCKER_STOPPED_AFTER_D2=YES`

`DOCKER_PROCESS_COUNT_AFTER_STOP=0`

`DOCKER_RESOURCE_MUTATION_COUNT=0`
