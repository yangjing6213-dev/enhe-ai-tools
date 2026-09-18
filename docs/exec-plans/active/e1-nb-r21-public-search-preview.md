# E1-NB-R21 Public Search Preview Contract

## Contract

- `task_id`: `E1-NB-R21`
- `task_name`: `Public Search DB-free UNVERIFIED preview parity`
- `base_head`: `9f1bfd1ba6e9aa39cea421cd29c1f23fccb9ab56`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `COMPLETED_LOCAL_ONLY`
- `execution_authorization`: `APPROVED_BY_OWNER_STANDING_AUTHORIZATION`
- `owner_acceptance`: `PASS_LOCAL_ONLY`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`
- `implementation`: `GREEN_FOCUSED`
- `local_acceptance`: `PASS`
- `commit`: `350ec0a3e0e1edd2b87de6cac391f1f6c197dd76`

## Completion record

- R21 focused tests passed 6/6; R16-R21 plus existing public-search, navigation-search, and software wiring regressions passed 47/47.
- Settings/public-content DB-free boundary regressions passed 10/10; target ESLint, typecheck, and `git diff --check` passed.
- `/search`, `/en/search`, `/search?q=ai`, and `/en/search?q=ai` returned HTTP 200 with visible `UNVERIFIED`, `noindex, follow`, no result cards, no ItemList schema, and no Prisma error markers.
- The standing-authorization scope expansion changed only the `searchPublicContent` entry boundary in `src/lib/public-search.ts`; configured multi-source reads remain covered.
- Receipt final external identity: 8038 bytes, SHA-256 `aebfd797049ed17e16de5bda0cb4fc238f326a95f1505c45aa3fcd3af85ac365`.
- Implementation commit `350ec0a3e0e1edd2b87de6cac391f1f6c197dd76` contains exactly four authorized files and has parent `0451e3d9e15226fd140ba40bbee60d9edca15ec2`.
- `CONTENT_EVIDENCE=UNVERIFIED`, `PUBLISH_STATUS=BLOCKED`, and `PUSH_STATUS=NOT_PUSHED` remain unchanged.

R21 applies the established DB-free local-preview safety pattern to the public search route. It does not verify search-result facts, connect a real database, or authorize publication.

## Verified route and call-chain scope

- Chinese routes: `/search` and `/search?q=ai`
- English routes: `/en/search` and `/en/search?q=ai`
- Shared page shell: `src/app/search/page-shell.tsx`
- Data flow: localized route wrapper -> `SearchPageShell` -> `searchPublicContent` -> Prisma tool/tutorial/news reads plus AI trend briefing summaries
- Existing regressions: `src/lib/public-search.test.ts` and `src/lib/public-navigation-search-source.test.ts`

## Initial allowed implementation files

1. `src/app/search/page-shell.tsx`
2. `src/lib/e1-nb-r21-public-search-preview.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r21-public-search-preview-receipt.json`

## Controlled shared-boundary expansion

- `src/lib/public-search.ts` may be added automatically only if the focused RED proves that `searchPublicContent` reaches Prisma or trend reads while `DATABASE_URL` is unset.
- The only permitted shared change is an early DB-free return of a type-compatible empty result from `searchPublicContent` after query normalization.
- Configured database reads must retain all existing tool, tutorial, news, trend, brand-result, localization, and error behavior.
- No other public-search function, shared UI component, settings/public-content guard, Prisma schema, database configuration, route wrapper, or production configuration may change.

## TDD acceptance criteria

- A focused RED proves the current DB-free read boundary is reached before any shared-boundary edit.
- With `DATABASE_URL=UNSET`, both locales render an explicit `UNVERIFIED` state for empty and non-empty query URLs.
- DB-free search returns no result cards and emits no fabricated tool, tutorial, news, trend, brand, ItemList, or search-result facts.
- Search metadata remains `noindex, follow` for both locales.
- DB-free Prisma tool/tutorial/news query count and AI trend briefing read count are 0.
- With a configured placeholder URL and mocked reads, the existing multi-source search path still executes without a real database connection.
- Existing query normalization, brand matching, public navigation/search source tests, and R16-R20 focused tests remain green.
- Target ESLint, project typecheck, and `git diff --check` pass.

## Localhost acceptance criteria

With `DATABASE_URL=UNSET`, telemetry disabled, and the server bound only to `127.0.0.1`:

- `/search`, `/en/search`, `/search?q=ai`, and `/en/search?q=ai` return HTTP 200.
- Every route visibly contains `UNVERIFIED` and emits `noindex, follow`.
- No route renders search-result cards, fabricated result facts, or ItemList schema.
- No Prisma or AI trend database error marker is emitted.
- The local service is stopped and its selected port has no residual listener.

## Validation commands

- `npx --no-install vitest run src/lib/e1-nb-r21-public-search-preview.test.tsx --reporter=verbose`
- Run `src/lib/public-search.test.ts`, `src/lib/public-navigation-search-source.test.ts`, and R16-R20 focused regressions.
- Run settings/public-content DB-free guard regressions because public chrome remains in the route path.
- `npx --no-install eslint src/app/search/page-shell.tsx src/lib/e1-nb-r21-public-search-preview.test.tsx` plus `src/lib/public-search.ts` if expanded.
- `npm run typecheck`
- Localhost-only HTTP checks for the four approved search URLs.
- `git diff --check`
- `git status --porcelain=v1 --untracked-files=all`

## Forbidden files and operations

- Do not modify `PublicSearchDialog`, route wrappers, existing tests, `settings.ts`, `public-content.ts`, sitemap, evidence, production configuration, database configuration, Prisma schema/migrations, or any other path.
- Do not access or modify the frozen old worktree.
- Do not use a real database, external network, SSH, Docker, deployment, publishing, or remote Git operations.
- Do not use reset, clean, stash, broad deletion, `git add .`, or push.
- Temporary test artifacts may be removed only under the owner's standing temporary-file policy.

## Failure handling and stop conditions

- Stop if branch, contract-commit HEAD, clean-worktree state, `DATABASE_URL=UNSET`, or route structure drifts before implementation.
- Automatically record the single `public-search.ts` scope expansion if the focused RED proves it necessary; do not expand any other shared file without a new risk review.
- Stop without implementation commit if any route is not HTTP 200, a DB-free data read occurs, a focused verification fails, or an unauthorized path changes.
- Local acceptance never changes `CONTENT_EVIDENCE=UNVERIFIED`, `PUBLISH_STATUS=BLOCKED`, or `PUSH_STATUS=NOT_PUSHED`.
