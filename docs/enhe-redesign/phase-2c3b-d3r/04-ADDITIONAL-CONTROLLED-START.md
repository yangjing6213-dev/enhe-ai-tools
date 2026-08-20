# Additional Controlled Docker Start

## Start authority and result

Docker-owned process count was zero before start. The active and protected files
had already passed their read-only gates. The CLI advertised synchronous
`--timeout`, so no concurrent status polling was used.

```text
D3R_ADDITIONAL_DOCKER_START_AUTHORIZED=YES
D3R_DOCKER_START_ATTEMPT_LIMIT=1
D3R_ADDITIONAL_DOCKER_START_ATTEMPTS=1
D3R_CONTROLLED_START_ATTEMPTS=1
D3R_CONTROLLED_START_DURATION_SECONDS=6.422
D3R_CONTROLLED_START_SAMPLE_COUNT=0_SYNCHRONOUS_TIMEOUT_MODE
D3R_CONTROLLED_START_MAX_PROBE_DURATION_MS=0_SYNCHRONOUS_TIMEOUT_MODE
DOCKER_DESKTOP_START_EXIT_CODE=0
DOCKER_DESKTOP_RECOVERY=PASS
DOCKER_SERVER_CONNECTED=YES
DOCKER_ENGINE_OSTYPE=linux
DOCKER_CONTEXT=desktop-linux
```

The current boot was read once after recovery and again after all application
gates. Raw log bodies were not retained in Git or the result ZIP.

```text
CURRENT_BOOT_FINAL_RAW_BYTES=263714
CURRENT_BOOT_FINAL_RAW_NUL_BYTES=0
CURRENT_BOOT_WINDOWS_DAEMON_NUL_ERRORS=0
CURRENT_BOOT_WINDOWS_DAEMON_JSON_ERRORS=0
CURRENT_BOOT_BACKEND_FATAL_ERRORS=0
```

No retry, Engine switch, service restart, WSL shutdown, configuration change,
Docker update, downgrade, reinstall, reset, or purge occurred.
