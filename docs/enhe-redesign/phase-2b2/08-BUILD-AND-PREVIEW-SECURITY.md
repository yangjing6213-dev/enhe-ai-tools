# Build and Preview Security

## Required production-build gate

The required disposable PostgreSQL build could not start because Docker Desktop's Linux engine was unavailable:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
The system cannot find the file specified.
```

The default Docker context was also unavailable at `npipe:////./pipe/docker_engine`. Docker Desktop processes existed, but the server API was not reachable. `docker desktop start` reported that Docker Desktop was already running; the engine remained unavailable after a bounded wait.

Consequences:

- no temporary `postgres:16-alpine` container was created;
- no migration deployment was run against a substitute database;
- `npm run build` was not run without the disposable database, because that would risk loading an unapproved environment/database configuration;
- no traced standalone production server was started;
- production-preview 404 checks are therefore **BLOCKED**, not passed.

The existing `codex-task6-local-red` container was not stopped, modified, deleted, or used. Its before/after container identity could not be queried because the Docker API was unavailable.

## No secret exposure

No environment file was read, no database credential value was printed, and no production database or deployment operation was attempted.

