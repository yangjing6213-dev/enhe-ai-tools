# Command Log

This is a sanitized command ledger. Process-local connection/auth values are intentionally omitted.

## Baseline and scope

- `git branch --show-current`
- `git rev-parse HEAD`
- `git status --short --branch`
- `git status --porcelain=v1 -uall`
- `git log --oneline -15`
- `git show --name-only --format= <Phase-2C.3A-HEAD>`
- SHA-256 checks for six required `SKILL.md` files
- bounded reads of Phase 2C.3A evidence, production source, and related tests

## TDD and focused verification

- focused Vitest source-contract/component runs before and after each source change
- three consecutive combined legacy-fade RED runs
- focused Playwright motion-hygiene runs
- Chromium combination covering `motion-hygiene`, `customer-support`, and `mobile-support-trigger`

## Broad gates

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test` (twice)
- shuffled `npm test` with seed `21101` (once)
- `npm run build` with process-local disposable database values
- traced `node server.js` with process-local test values
- HTTP status probe for six formal/discovery routes and all three preview routes

## Browser and evidence

- local Next development server on loopback
- Playwright 36-combination route/viewport matrix
- independent normal/reduced-motion carousel timelines
- six full-page PNG captures
- PNG decode, dimensions, byte size, SHA-256, and visual inspection

## Docker and cleanup

- `docker desktop status`
- `docker desktop start`
- repeated `docker version`
- read-only Docker Desktop log inspection
- native PostgreSQL stop and `pg_isready` no-response verification
- absolute-path-guarded deletion of the worktree-only temporary directory

No reset, clean, stash, checkout, switch, merge, rebase, fetch, pull, push, deployment, production migration, production seed, or remote mutation was executed.
