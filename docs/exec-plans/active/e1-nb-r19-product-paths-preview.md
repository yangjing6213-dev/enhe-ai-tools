# E1-NB-R19 Product Paths Preview Contract

## Contract

- `task_id`: `E1-NB-R19`
- `task_name`: `Product Paths DB-free preview parity`
- `base_head`: `6e8b6352f4dee89c6acb69de67bdc5f403367184`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `AUTHORIZED`
- `execution_authorization`: `APPROVED`
- `owner_acceptance`: `PENDING`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`

R19 implementation is authorized only within this contract's initial file scope. This contract does not authorize publication, production access, or a shared public-content boundary change.

## Read-only path confirmation

The repository defines exactly three product-path slugs in `src/lib/product-paths.ts`:

1. `work-efficiency`
2. `media-generation`
3. `future-ai`

The shared Chinese and English dynamic route wrappers exist at:

- `src/app/(zh-public)/product-paths/[slug]/page.tsx`
- `src/app/en/product-paths/[slug]/page.tsx`

Together they expose these six localhost routes:

1. `/product-paths/work-efficiency`
2. `/en/product-paths/work-efficiency`
3. `/product-paths/media-generation`
4. `/en/product-paths/media-generation`
5. `/product-paths/future-ai`
6. `/en/product-paths/future-ai`

The verified call chain is:

`Chinese/English dynamic route wrapper` → `src/app/product-paths/[slug]/page-shell.tsx` → `ProductPathPageShell` → `getPublicToolsByCategoryNames` → `getCachedPublicToolsByCategoryNames` → `prisma.tool.findMany`.

Existing directly related tests are:

- `src/lib/product-paths.test.ts`
- `src/lib/public-content-db-fallback.test.ts`

The existing public-content DB-free test does not currently cover `getPublicToolsByCategoryNames`. This is a test target, not advance authorization to edit the shared boundary.

## Initial allowed implementation files

Only these files may be created or modified during the initial R19 TDD cycle:

1. `src/app/product-paths/[slug]/page-shell.tsx`
2. `src/lib/e1-nb-r19-product-paths-preview.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r19-product-paths-preview-receipt.json`

## Conditional shared-boundary escalation

- `src/lib/public-content.ts` is not in the initial allowed scope and must not be modified by default.
- The first focused RED must determine whether `getPublicToolsByCategoryNames` still calls Prisma when `DATABASE_URL` is unset.
- If that RED proves a shared DB-free boundary gap, stop before changing `src/lib/public-content.ts` and request a separate, exact scope expansion.
- Any additional shared-boundary test file must also be named in that scope request before modification.
- `src/lib/settings.ts` is never authorized by this contract.

## TDD acceptance criteria

The focused R19 test must first produce a behaviorally relevant RED and then pass GREEN after the minimum authorized implementation:

- All three confirmed slugs render an explicit DB-free `UNVERIFIED` empty state in both Chinese and English.
- DB-free metadata for all six route variants is `noindex, follow`.
- Empty previews render no product cards, ItemList, CollectionPage product facts, or other unverified product claims.
- Unknown slugs retain the existing not-found behavior.
- When configured data is supplied without a real database connection, the existing product cards and indexable metadata behavior remain available.
- The RED phase separately records whether the shared `getPublicToolsByCategoryNames` boundary attempts a Prisma read with `DATABASE_URL=UNSET`.
- R16, R17, and R18 focused regression tests remain green.
- Existing `src/lib/product-paths.test.ts` remains green without modification unless a separate scope expansion is approved.
- Target ESLint passes for the authorized changed source and focused test.
- `git diff --check` passes and the final diff contains no unauthorized path.

## Localhost acceptance criteria

With `DATABASE_URL=UNSET` and external network access disabled:

- All six confirmed routes return HTTP 200.
- Every route displays an explicit `UNVERIFIED` marker.
- Every route emits `noindex, follow`.
- No route renders a product card, ItemList, CollectionPage product facts, or other fabricated product facts. Site-wide root-layout schema may remain only if it contains no product-path claims.
- Settings Prisma query count is 0.
- Public-content Prisma query count is 0.
- No real database connection, database write, migration, or seed occurs.
- The local server is stopped after verification and the selected port has no residual listener.

## Validation commands

- `npx --no-install vitest run src/lib/e1-nb-r19-product-paths-preview.test.tsx --reporter=verbose`
- `npx --no-install vitest run src/lib/e1-nb-r19-product-paths-preview.test.tsx src/lib/product-paths.test.ts src/lib/e1-nb-r18-account-services-preview.test.tsx src/lib/e1-nb-r17-skill-learning-preview.test.tsx src/lib/e1-nb-r16-tutorials-preview.test.tsx --reporter=verbose`
- Run the existing public-content DB-free focused test read-only when checking the shared boundary.
- `npx --no-install eslint src/app/product-paths/[slug]/page-shell.tsx src/lib/e1-nb-r19-product-paths-preview.test.tsx`
- Perform localhost-only HTTP checks for the six routes listed above.
- `git diff --check`
- `git status --porcelain=v1 --untracked-files=all`

## Forbidden files and operations

- Do not modify `src/lib/public-content.ts` without a separately approved scope expansion based on focused RED evidence.
- Do not modify `src/lib/settings.ts`, `src/lib/product-paths.ts`, either route wrapper, existing tests, sitemap, evidence, production configuration, database configuration, Prisma schema/migrations, R16/R17/R18 files, or any other path.
- Do not access a real database or change `DATABASE_URL`.
- Do not access external networks, SSH, Docker, production, deployment, publishing, or remote Git operations.
- Do not inspect or modify the frozen old worktree or its protected entries.
- Do not use destructive Git operations such as reset, clean, stash, or forced checkout.
- Do not push.

## Failure handling and stop conditions

- Stop if the live branch, worktree, or base HEAD drifts before implementation.
- Stop if the slug set is no longer exactly `work-efficiency`, `media-generation`, and `future-ai`, or if either locale wrapper is missing.
- Stop and request scope expansion if RED proves that `src/lib/public-content.ts` must change.
- Stop without commit if any of the six routes is not HTTP 200, any Prisma query occurs in DB-free mode, any focused verification fails, or any unauthorized path changes.
- Local acceptance never changes `CONTENT_EVIDENCE=UNVERIFIED` or `PUBLISH_STATUS=BLOCKED`.
