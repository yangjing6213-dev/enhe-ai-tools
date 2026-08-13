# Build and Preview Security

## Disposable PostgreSQL Build

The one-time Build used `postgres:16-alpine` in a temporary container with a random localhost port, tmpfs database storage, no Docker volume, no host mount, and no host-network mode. The process-only `DATABASE_URL` and `DIRECT_URL` pointed to that disposable database; no `.env` file was edited and no seed command ran.

Final successful run:

```text
TEMP_DB=codex-task6-phase2b1-7060cd870e
IMAGE=postgres:16-alpine
PORT=8129
TMPFS=yes
HOST_MOUNT=no
HOST_NETWORK=no
TEMP_DB_READY=PASS
MIGRATION_DIRECTORY_COUNT=49
prisma-migrate-deploy=exit 0
prisma-migrate-status=exit 0
production-build=exit 0
INTEGRATION_BUILD=PASS
```

The temporary container was stopped and removed in the `finally` path. The existing `codex-task6-local-red` container remained the same before and after: ID `7e89c645f118`, image `postgres:16-alpine`, status `Exited (255)`, port mapping `127.0.0.1:55436->5432/tcp`.

## Production-only checks

The standalone production server started from the actual traced server entry and returned:

```text
/redesign-preview/shell=404
/__redesign-preview/shell=404
/=200
/en=200
/robots.txt=200
/sitemap.xml=200
PREVIEW_PRODUCTION_STATUS=404
PRODUCTION_PUBLIC_STATUS=PASS
```

The production sitemap and robots body did not contain the preview route. The production process was stopped and temporary DB credentials were not persisted. During visual verification, a standalone-preview root-layout defect was found by screenshot review (`Missing <html> and <body> tags in the root layout`); the minimal layout fix and source regression test were then revalidated by Build and Dev Preview.
