# E1-NB-R20 Software Catalog Preview Contract

## Contract

- `task_id`: `E1-NB-R20`
- `task_name`: `Software Catalog DB-free UNVERIFIED preview parity`
- `base_head`: `7ff8d32b8295b94b40f42e333b15a9272cca9803`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `AUTHORIZED`
- `execution_authorization`: `APPROVED_BY_OWNER_STANDING_AUTHORIZATION`
- `owner_acceptance`: `PENDING`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`

R20 applies the established DB-free local-preview safety pattern to the public software catalog. It does not verify product facts, connect a real database, or authorize publication.

## Verified route and call-chain scope

- Chinese route: `/software`
- English route: `/en/software`
- Shared page shell: `src/app/software/page-shell.tsx`
- Data flow: locale route wrapper -> `SoftwarePageShell` -> `getProductionSoftwareCatalog` -> `getPublicSoftwareCatalogRows` -> `prisma.tool.findMany`
- Existing catalog regression: `src/app/software/software-production-wiring.test.tsx`

## Initial allowed implementation files

1. `src/app/software/page-shell.tsx`
2. `src/lib/e1-nb-r20-software-catalog-preview.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r20-software-catalog-preview-receipt.json`

## Controlled shared-boundary expansion

- `src/lib/public-content.ts` may be added automatically only if the first focused RED proves that `getPublicSoftwareCatalogRows` calls Prisma while `DATABASE_URL` is unset.
- The only permitted shared change is an early DB-free return of a type-compatible empty array for `getPublicSoftwareCatalogRows`.
- Configured database reads must retain their existing query and error behavior.
- No other public-content reader, Prisma schema, database configuration, or shared UI component may change.
- No more than this one shared module is anticipated; any additional shared file requires a new risk review under the standing-authorization limits.

## TDD acceptance criteria

- A focused RED proves the current DB-free Prisma call before any shared-boundary edit.
- With `DATABASE_URL=UNSET`, both locale variants render an explicit `UNVERIFIED` state.
- DB-free metadata is `noindex, follow` for `/software` and `/en/software`.
- The DB-free shell emits no product cards, production-catalog claims, CollectionPage, or ItemList product facts.
- Configured fixture data preserves the existing production catalog and indexable metadata behavior without a real database connection.
- Invalid search parameters retain the existing not-found behavior.
- R16, R17, R18, and R19 focused tests remain green.
- Existing software production wiring tests remain green without modification.
- Target ESLint and `git diff --check` pass.

## Localhost acceptance criteria

With `DATABASE_URL=UNSET`, telemetry disabled, and the server bound only to `127.0.0.1`:

- `/software` returns HTTP 200.
- `/en/software` returns HTTP 200.
- Both pages visibly contain `UNVERIFIED` and emit `noindex, follow`.
- Neither page renders product cards, the production catalog marker, CollectionPage, or ItemList product facts.
- Settings and public-content Prisma query counts are 0, supported by focused spies and absence of runtime Prisma error markers.
- No real database, external network, SSH, Docker, deployment, or production validation is used.
- The local service is stopped and its selected port has no residual listener.

## Validation commands

- `npx --no-install vitest run src/lib/e1-nb-r20-software-catalog-preview.test.tsx --reporter=verbose`
- `npx --no-install vitest run src/lib/e1-nb-r20-software-catalog-preview.test.tsx src/app/software/software-production-wiring.test.tsx src/lib/e1-nb-r19-product-paths-preview.test.tsx src/lib/e1-nb-r18-account-services-preview.test.tsx src/lib/e1-nb-r17-skill-learning-preview.test.tsx src/lib/e1-nb-r16-tutorials-preview.test.tsx --reporter=verbose`
- Run settings/public-content DB-free focused tests when the shared boundary is checked.
- `npx --no-install eslint src/app/software/page-shell.tsx src/lib/e1-nb-r20-software-catalog-preview.test.tsx` plus `src/lib/public-content.ts` if expanded.
- Localhost-only HTTP checks for `/software` and `/en/software`.
- `git diff --check`
- `git status --porcelain=v1 --untracked-files=all`

## Forbidden files and operations

- Do not modify software components, route wrappers, existing tests, `settings.ts`, sitemap, evidence, production configuration, database configuration, Prisma schema/migrations, or any other path.
- Do not access or modify the frozen old worktree.
- Do not use a real database, external network, SSH, Docker, deployment, publishing, or remote Git operations.
- Do not use reset, clean, stash, broad deletion, `git add .`, or push.
- Temporary test artifacts may be removed only under the owner's explicit standing temporary-file policy.

## Failure handling and stop conditions

- Stop if branch, contract-commit HEAD, clean-worktree state, `DATABASE_URL=UNSET`, or route structure drifts before implementation.
- Automatically record the single `public-content.ts` scope expansion if the focused RED proves it necessary; do not expand any other shared file without a new risk review.
- Stop without commit if either route is not HTTP 200, a Prisma query occurs in DB-free mode, a focused verification fails, or an unauthorized path changes.
- Local acceptance never changes `CONTENT_EVIDENCE=UNVERIFIED`, `PUBLISH_STATUS=BLOCKED`, or `PUSH_STATUS=NOT_PUSHED`.
