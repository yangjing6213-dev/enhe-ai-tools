# Phase 1B.2.13R Docker and R-008 Resume

本文件是 Phase 1B.2.13R 的 continuation receipt。此前 00–14 文件记录的是 Docker daemon 不可用时的历史阻塞状态；本文件及 16–17 文件记录恢复后的实际结果。

## Authoritative baseline

- Worktree: `.worktrees/enhe-full-suite-stability-v1`
- Branch: `codex/enhe-full-suite-stability-v1`
- Baseline HEAD before R-008: `5b500653b5d5845737d28d36587097d922eba28e`
- Seam ancestors: `85cb3dc` and `64d1e72`
- GSC fix ancestor: `7acebac`
- Lifecycle module: `deploy/enhe-ai-tools/scripts/runtime-heartbeat-lifecycle.mjs`
- Baseline was clean and `src/app/root-layout-shared.tsx` still contained the global ByteDance loader.

## Docker recovery

`docker desktop start` was run once after the initial daemon check. The Linux engine then reported `OSType=linux`, Server `29.7.2`, context `desktop-linux`, and Desktop status `running`.

The pre-existing container was inspected without stopping, deleting, or reusing it:

`codex-task6-local-red` → ID `7e89c645f118`, image `postgres:16-alpine`, port `127.0.0.1:55436->5432/tcp`.

Its static ID/image/port identity was unchanged after both build gates. It remained outside the disposable-container workflow.

The first disposable attempt was rejected before migrations because the image exposed an anonymous data volume. That explicitly created temporary container and its exact anonymous volume were removed; no application gate ran in that attempt. The compliant retries used container tmpfs at `/var/lib/postgresql/data`, with no host bind or Docker volume.

## Pre-R-008 gate

Disposable container `codex-task6-pre-r008-235927` used a random localhost port and tmpfs only. `pg_isready` passed after 2 seconds. All 49 Prisma migrations applied and `prisma migrate status` reported the database up to date. `npm run build` passed. The temporary container was removed and the current-process `DATABASE_URL` and `DIRECT_URL` presence was restored.

Only after this build passed was R-008 started.

## R-008 TDD and scope

The RED test failed because the existing `ttzz-push-loader` was still present. The minimal production change then removed the `next/script` import and the external ByteDance loader from `src/app/root-layout-shared.tsx`. `AnalyticsTracker`, ByteDance verification metadata, other layouts, routes, sitemap, robots, canonical and hreflang behavior were not changed.

The GREEN test passed and scans all `src/app/**/layout.tsx` files for the external ByteDance URL and duplicate `beforeInteractive` loader. The exact code/test commit is `1175061304ee9fda9968cc1b9e932ee5a919d93d` (`fix(layout): remove global ByteDance loader`).
