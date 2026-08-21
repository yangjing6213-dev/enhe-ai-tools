# Docker, Build, and Standalone

## Disposable database

- Docker Desktop starts in this phase: 1.
- Containers created: 1 (`postgres:16-alpine`).
- Binding: loopback-only random host port.
- Storage: tmpfs data directory.
- Bind mounts: 0.
- Named/anonymous volumes created: 0.
- Production seed: not run.
- Existing migrations applied: 49.
- Migration deploy: pass.
- Migration status: schema up to date.

## Build

- `npm run build`: pass.
- Static pages: 119/119.
- Package/lockfile/Prisma schema/migration changes: none.

## Traced Standalone

- Formal routes returning 200: 6/6 (`/`, `/en`, `/software`, `/en/software`, robots, sitemap).
- Preview routes returning 404: 4/4.
- Production bundle references Prototype: no.
- Production acceptance plus performance: 185/185.

## Cleanup

- Standalone processes/listeners removed: yes.
- Disposable database container removed: yes.
- Process-only database variables did not persist: yes.
- Pre-existing containers unchanged: yes (0 before, 0 after).
- Pre-existing volumes unchanged: yes (38 before, 38 after).
- Pre-existing networks unchanged: yes (same 3 default networks/IDs).
- Docker Desktop stopped: yes.
- Docker-owned processes after stop: 0.
- Production database accessed: no.
- Active `.env`/`.env.local` created, read, or modified: no.
