# Controlled Docker Recovery

## Single start

Exactly one `docker desktop start` invocation was made. The first sample at elapsed second `0` had no Docker process and no server connection. The second sample at elapsed second `10` showed the start command exited `0`, the server probe was ready, and Server OS was `linux`.

Post-start checks passed:

```text
CONTROLLED_START_INVOCATION_COUNT=1
DOCKER_DESKTOP_START_EXIT_CODE=0
DOCKER_SERVER_CONNECTED=YES
DOCKER_ENGINE_OSTYPE=linux
DOCKER_CONTEXT=desktop-linux
```

`docker desktop status` returned successfully after recovery. The named-pipe existence probe was not used as the authority because that filesystem-style probe remained false while the Docker server API and Linux Server OS were both confirmed live.

## Current boot

The current boot log was collected once and retained only in the external quarantine evidence directory. Its sanitized analysis was:

```text
CURRENT_BOOT_RAW_BYTES=136390
CURRENT_BOOT_RAW_NUL_BYTES=0
CURRENT_BOOT_WINDOWS_DAEMON_LINES=0
CURRENT_BOOT_TARGET_NUL_OR_JSON_ERROR_LINES=0
CURRENT_BOOT_ANALYSIS=PASS
```

No log body is included in Git or the result ZIP.

## Why execution stopped later

After Engine recovery, the container-gate orchestrator applied an over-broad filename guard before taking the required Docker resource pre-baseline. The guard matched tracked `.env.example`; it did not read the file body and no exact `.env` existed. The failure path stopped Docker Desktop successfully. D3's one-start limit prohibits an unapproved second start, so the PostgreSQL/Build track remained not run.

`DOCKER_ENGINE_RECOVERY=PASS`

`SECOND_DOCKER_START_ATTEMPTED=NO`
