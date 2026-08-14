# Phase 2C.1 production build and standalone acceptance

Status: PASS

Build command: `npm run build`

Evidence:

- disposable PostgreSQL `postgres:16-alpine` container;
- 49 migrations applied with `prisma migrate deploy`;
- no seed command executed;
- database data directory was tmpfs with no host mount;
- database was reachable only through a loopback-published temporary port for this acceptance;
- `DATABASE_URL`, `DIRECT_URL`, and the temporary auth secret were process-only values;
- Next build compiled, linted/typechecked, generated 118 static pages, finalized traces, and exited 0;
- traced server was started from `.next/standalone/.worktrees/enhe-production-wiring-v1/server.js` after copying only generated static/public assets into that traced root;
- formal public routes returned 200 in standalone;
- `/robots.txt` and `/sitemap.xml` returned 200;
- `/redesign-preview/home`, `/redesign-preview/shell`, `/redesign-preview/software`, and `/__redesign-preview/shell` all returned 404 in production mode.

The temporary standalone process and database were stopped and removed. No existing database container, deployment target, or production service was touched.
