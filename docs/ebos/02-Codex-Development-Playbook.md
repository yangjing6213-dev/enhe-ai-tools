# Codex Development Playbook For EBOS

## Operating Assumptions

- EBOS is a documentation-first project until the data contract is agreed.
- Current business modules are live surfaces and must not be changed during Step 0.
- The repository may have unrelated uncommitted work. Preserve it.
- Prefer small, testable changes over broad refactors.

## Development Loop

1. Understand
   - Read `package.json`, `prisma/schema.prisma`, relevant `src/app` routes, and relevant `src/lib` modules.
   - State assumptions before coding when requirements are ambiguous.

2. Plan
   - Define the user-visible outcome.
   - Define the verification command or test before implementation.
   - Keep the plan scoped to the requested module.

3. Test First When Behavior Changes
   - For calculations, write Vitest unit tests first.
   - For route/API behavior, add focused route or integration tests when practical.
   - For UI/admin behavior, add component-safe checks and use Playwright for real flows.

4. Implement
   - Match existing project style.
   - Use Prisma types and structured data, not ad hoc string parsing, when reading DB-backed state.
   - Keep EBOS code in its own namespace until integration is intentionally approved.

5. Verify
   - Run the narrowest relevant test first.
   - Run broader checks before claiming completion.
   - Report commands that were unavailable or failed, with the reason.

## Project Conventions To Preserve

- App Router routes live under `src/app`.
- Shared business logic lives under `src/lib`.
- Admin pages live under `src/app/admin`.
- Public bilingual route surfaces exist in Chinese root routes and English `/en` routes.
- Database access uses `src/lib/db.ts` and Prisma.
- Existing admin access control should use server-side auth helpers such as `requireAdmin`.
- Tests use Vitest for unit logic and Playwright for e2e.
- Build runs `prisma generate && next build`.

## EBOS File Placement

Recommended future structure:

- `src/lib/ebos/`: scoring, report builders, data adapters, types.
- `src/app/admin/ebos/`: admin review UI after the report contract is stable.
- `scripts/generate-ebos-weekly-report.ts`: local report generation.
- `docs/ebos/`: project docs, specs, playbooks, and architecture.
- `tests` or colocated `*.test.ts`: focused tests for calculations and report builders.

## Validation Matrix

- Documentation-only changes:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`

- Pure calculation changes:
  - targeted Vitest file
  - `npm test`
  - `npm run typecheck`

- Prisma schema changes:
  - migration reviewed before execution
  - `npm run prisma:generate`
  - relevant tests
  - `npm run build`

- Admin UI changes:
  - relevant tests
  - `npm run lint`
  - `npm run typecheck`
  - Playwright smoke check if route behavior changes

## Coding Rules

- No speculative abstractions.
- No hidden third-party service calls in tests.
- No live production operations from development scripts.
- No `.env` or secret changes unless explicitly requested.
- No destructive git commands.
- No edits to unrelated dirty files.

## Reporting Rules

Every completion note should include:

- files changed,
- commands run,
- failures or skipped checks,
- key assumptions,
- next recommended step.

