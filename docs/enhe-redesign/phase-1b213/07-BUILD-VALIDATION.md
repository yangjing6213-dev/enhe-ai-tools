# Build Validation

## Pre-build checks

- Prisma migration directory count: 49
- `DATABASE_URL` present before attempt: no
- `DIRECT_URL` present before attempt: no
- Production database accessed: no
- Existing package and lockfile were not modified by `npm ci`

## Result

The disposable PostgreSQL build could not start because Docker Desktop’s Linux engine named pipe was unavailable. The observed error was that the Docker API could not be reached at `npipe:////./pipe/dockerDesktopLinuxEngine`; no container was created.

Therefore:

- `PRE_R008_BUILD=BLOCKED_DOCKER_DAEMON_UNAVAILABLE`
- `DISPOSABLE_DB_CONTAINER_REMOVED=NOT_APPLICABLE`
- `TEMP_DATABASE_ENV_RESTORED=YES_NO_VALUES_SET`
- `PRODUCTION_DATABASE_ACCESSED=NO`
- `R008_EXECUTED=NO`
- `FINAL_BUILD=NOT_RUN_BLOCKED`

The build and R-008 were intentionally not bypassed.
