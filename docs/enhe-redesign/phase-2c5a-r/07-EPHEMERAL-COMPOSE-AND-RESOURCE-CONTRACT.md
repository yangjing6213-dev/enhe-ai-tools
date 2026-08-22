# Ephemeral Compose and Resource Contract

## Project and service limits

```text
RC_COMPOSE_PROJECT=enhe-public-rc1-ephemeral
RC_MAX_WINDOW_MINUTES=90
RC_TOTAL_CPU_LIMIT=1.5
RC_TOTAL_MEMORY_LIMIT_MIB=1920
RC_TOTAL_DISK_BUDGET_BYTES=8000000000
RC_APP_IMAGE=enhe-ai-tools:phase2c4-public-rc1-78357d7
RC_DB_IMAGE=postgres:16-alpine
RC_DB_HEALTHCHECK=pg_isready
RESTART_POLICY=no
INIT=true
LOG_MAX_SIZE=10MiB
LOG_MAX_FILES=3
```

| Service | Exact image | CPU limit | Memory limit | Memory reservation | PIDs | Storage / health |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| RC app | `enhe-ai-tools:phase2c4-public-rc1-78357d7` | 1 CPU | 1280 MiB | 512 MiB | 256 | Writable layer within total disk budget |
| RC database | `postgres:16-alpine` | 0.5 CPU | 640 MiB | 256 MiB | 128 | 768 MiB tmpfs; no host bind; `pg_isready` healthcheck |

The 768 MiB tmpfs ceiling does not add to the 1920 MiB cgroup memory-limit total; the database's 640 MiB memory limit remains binding. No persistent database volume is authorized.

## Network contract

- The app joins a dedicated RC app network.
- The database joins a dedicated internal DB network.
- Only the RC app may bridge the app and internal DB networks.
- The app host bind is `127.0.0.1:3101`.
- The database host bind is `NONE`.
- No production network, container, volume, secret, service name, or Compose project is reused.
- No public-interface bind, Nginx attachment, DNS, domain, certificate, or crawler access is permitted.

## Exact resource ownership labels

```text
com.enhe.rc.id=ENHE-PHASE2C4-PUBLIC-RC1
com.enhe.ephemeral=true
com.enhe.phase=phase2c5b
```

Every RC-created container and network must carry all three exact labels. The wrapper must use an all-label match for create preflight, inspect, stop, and cleanup. Fuzzy project names, partial names, prefixes, substrings, or fewer than all three labels must never select a resource.

## Runtime behavior

- Both services use `restart: no` and `init: true`.
- Each service uses bounded logs: `10MiB` per file and three files.
- Health checks must be container-local and must not contact production services.
- RC app unhealthy for more than 120 seconds or RC database unhealthy for more than 60 seconds triggers teardown.
- Compose ownership labels and the exact project name are required on every RC-owned container and network.
- Create/start is forbidden when the project name, service names, loopback port, networks, or image identity conflict with existing runtime resources.
- The 90-minute timer starts before the first RC container is created and includes smoke, evidence capture, and cleanup.

```text
EPHEMERAL_COMPOSE_CONTRACT_STATUS=DEFINED_NOT_EXECUTED
RC_COMPOSE_CREATED=NO
RC_APP_STARTED=NO
RC_DATABASE_STARTED=NO
RC_PUBLIC_PORT_OPENED=NO
```
