# Cleanup and Rollback

## Cleanup

The standalone server was terminated before the exact labeled PostgreSQL
container was removed. The loopback port stopped listening. No other Node,
container, volume, image, network, database, WSL, or Windows service process was
targeted.

```text
DOCKER_GATE_CONTAINER_REMOVED=YES
DOCKER_GATE_RESIDUAL_CONTAINER_COUNT=0
DOCKER_GATE_VOLUME_COUNT_CREATED=0
STANDALONE_PROCESS_REMOVED=YES
STANDALONE_LISTENER_COUNT_FINAL=0
TEMP_DATABASE_ENV_RESTORED=YES
PREEXISTING_CONTAINERS_UNCHANGED=YES
PREEXISTING_VOLUMES_UNCHANGED=YES
PRODUCTION_DATABASE_ACCESSED=NO
DOCKER_DESKTOP_STOP_EXIT_CODE=0
DOCKER_DESKTOP_FINAL_STATUS=STOPPED
DOCKER_OWNED_PROCESS_COUNT_FINAL=0
FINAL_DOCKER_ENGINE_CONNECTED=NO
```

The standalone PowerShell session ended after its child process was stopped, so
its process-local values could not persist. The migration/Build PowerShell
session separately reported successful environment restoration.

## Rollback

D3R adds documentation only. Its Git rollback is an isolated revert of the D3R
documentation commit reported in the handoff. Such a revert does not restore the
known-corrupt all-NUL file and does not recreate the removed container.

The original quarantine must remain preserved. Restoring, editing, deleting, or
replacing it is outside D3R and would require separate authorization while
Docker is stopped.
