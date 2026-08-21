# Docker, Build, and Standalone

Docker Desktop started successfully once from an initially disconnected state and was stopped once after cleanup. The Linux Engine reported version `29.7.2` while active.

## PostgreSQL gate

- Gate containers created: 1.
- Image: existing `postgres:16-alpine`.
- Data storage: tmpfs, 256 MiB, no bind/named/anonymous volume.
- Migration directories / SQL files deployed: 49.
- `prisma migrate deploy`: pass.
- `prisma migrate status`: schema up to date.
- Production database access: no.
- Production migration or seed: no.
- Local synthetic fixtures: 25, destroyed with the container.

## Build

- Node: `v24.14.0`.
- npm: `11.9.0`.
- Build: pass.
- Build ID: `XW2sFw32Br7G9npwDuTIT`.
- Static pages: 119/119.
- Duration: 156598 ms.
- Generated standalone static files: 228, exact source/destination hash match.
- Copied public files: 491, exact source/destination hash match.

The generated standalone root was nested because Next detected another lockfile above the isolated worktree. The temporary ignored bridge used only the generated output and was deleted during cleanup.

The first manual production start lacked a minimum-length process-only auth value, so formal HTML pages returned 500 while robots and sitemap remained 200. A generated process-only value fixed the harness; no file was changed. Final standalone acceptance passed six formal 200s, four preview 404s, and the 185-case production browser gate.

- `DOCKER_MIGRATION_DEPLOY=PASS`
- `DOCKER_GATE_NAMED_VOLUME_CREATED=NO`
- `DOCKER_GATE_BIND_MOUNT_CREATED=NO`
- `DOCKER_SERVER_VERSION=29.7.2`
- `NODE_VERSION=v24.14.0`
- `NPM_VERSION=11.9.0`
- `DOCKER_MIGRATION_STATUS=SCHEMA_UP_TO_DATE`
- `DOCKER_BUILD=PASS`
- `DOCKER_STANDALONE=PASS`
