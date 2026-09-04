# AGENTS.md

## Project Context

This repository powers the ENHE AI tools website and admin system. EBOS is the new ENHE Business OS layer for weekly business inspection, SEO/GEO review, product performance review, revenue/traffic diagnosis, market opportunity planning, weekly reports, and monthly strategic reviews.

Current EBOS phase: Step 0, project startup and development rules. Do not write EBOS business functionality until the data contract and implementation step are explicitly requested.

## Working Rules

- Read the relevant code and docs before changing files.
- State assumptions when requirements are ambiguous.
- Prefer the smallest change that satisfies the task.
- Touch only files directly required by the task.
- Preserve unrelated uncommitted changes.
- Match existing project style even when a different style would be possible.
- Do not refactor adjacent code unless the task requires it.
- Remove only unused code introduced by your own change.

## EBOS Development Rules

- Keep EBOS code isolated under a clear namespace such as `src/lib/ebos`, `src/app/admin/ebos`, `scripts/generate-ebos-*`, and `docs/ebos`.
- Start with read-only analysis and deterministic report generation before adding UI, persistence, schedules, or automation.
- Use existing Prisma models and `src/lib/db.ts` for database reads.
- Do not add a Prisma migration until the EBOS data model is documented and reviewed.
- Every EBOS conclusion must be tied to observed data, an explicit external source snapshot, or a clearly marked assumption.
- Every EBOS recommendation must include a target surface and a verification check.

## Testing Rules

- For business logic or scoring changes, add focused Vitest tests before implementation when practical.
- For route or API behavior, add targeted tests or smoke checks.
- For admin UI changes, run lint, typecheck, and a browser check when the route changes.
- Before completion, run the relevant commands from `package.json`.
- Broad validation commands for EBOS work are:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- If a command is unavailable, too slow, or blocked by environment, report that clearly.

## Security And Operations Rules

- Do not commit secrets or edit `.env` unless explicitly requested.
- Do not run production deployment, production database migration, payment/refund operation, user mutation, or content publishing unless explicitly requested.
- Admin functionality must enforce server-side authorization.
- Payment, refund, user, and VIP changes must be auditable.
- External integrations must document credentials, rate limits, retries, and failure modes before implementation.

## Commit Rules

- Do not create a git commit unless the user asks.
- Keep commits scoped to one coherent task.
- Mention tests run in the commit or handoff notes.
- Recommended commit prefix for this project: `ebos:`, `admin:`, `seo:`, `geo:`, `content:`, `product:`, `payments:`, `infra:`, or `docs:`.

## Prohibited Actions

- No speculative features.
- No broad rewrites during EBOS setup.
- No destructive git commands such as `git reset --hard` or forced checkout of user work.
- No direct production deploys without explicit instruction.
- No fabricated metrics, rankings, or market claims.
- No hidden network calls in tests.
- No automatic publishing or payment operations from EBOS by default.

## Completion Checklist

- Files changed are limited to the requested scope.
- Existing dirty worktree changes are preserved.
- Tests or validation commands were run and reported.
- Any skipped checks or failures are explained.
- Next recommended step is clear.

