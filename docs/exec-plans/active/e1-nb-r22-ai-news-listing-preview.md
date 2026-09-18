# E1-NB-R22 AI News Listing Preview Contract

## Contract

- `task_id`: `E1-NB-R22`
- `task_name`: `AI News Listing DB-free UNVERIFIED preview parity`
- `base_head`: `2ed781c36b37461ca560802fd90e9f9f837a0fa5`
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
- `commit`: `d29e3dd88c0adf8c6c72764f3622572a1da89d7c`

## Completion record

- R22 focused tests passed 7/7; R16-R22 plus relevant AI News, public-content, search/navigation, and software wiring regressions passed 70/70.
- Settings/public-content DB-free boundary regressions passed 10/10; target ESLint, typecheck, and `git diff --check` passed.
- `/ai-news`, `/en/ai-news`, `/ai-news?q=ai`, and `/en/ai-news?q=ai` returned HTTP 200 with visible `UNVERIFIED`, `noindex, follow`, no AI News result/filter/topic components, and no AI News CollectionPage, ItemList, or FAQPage JSON-LD.
- The standing-authorization expansion changed only the four named public-content entry guards and the three configured-path test fixtures recorded above; no assertion was weakened.
- Receipt final external identity: 11159 bytes, SHA-256 `21b5dabdae003d20906b790615b64c2274d4d73efd3e4026f7b9cc67609be81e`.
- Implementation commit `d29e3dd88c0adf8c6c72764f3622572a1da89d7c` contains exactly seven authorized files and has parent `7fd7275571d0e77bf26b94e087ba12738c67563b`.
- `CONTENT_EVIDENCE=UNVERIFIED`, `PUBLISH_STATUS=BLOCKED`, and `PUSH_STATUS=NOT_PUSHED` remain unchanged.

R22 applies the established DB-free local-preview safety pattern to the bilingual AI News listing. It does not verify article facts, change article details or topics, connect a real database, or authorize publication.

## Verified route and call-chain scope

- Chinese routes: `/ai-news` and `/ai-news?q=ai`
- English routes: `/en/ai-news` and `/en/ai-news?q=ai`
- Shared page shell: `src/app/ai-news/page-shell.tsx`
- Data flow: localized route wrapper -> `AiNewsPageShell` -> public news listing/categories/tags/discovery and configured topic readers
- Existing regressions: AI News pagination, SEO, discovery, topic configuration, public-content news pagination, and public navigation/search source tests

## Initial allowed implementation files

1. `src/app/ai-news/page-shell.tsx`
2. `src/lib/e1-nb-r22-ai-news-listing-preview.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r22-ai-news-listing-preview-receipt.json`

## Controlled shared-boundary expansion

- `src/lib/public-content.ts` may be added automatically only if the focused RED proves that public AI News listing, category, tag, or discovery readers reach Prisma while `DATABASE_URL` is unset.
- The permitted shared change is limited to DB-free type-compatible empty returns at `getPublicNewsListing`, `getPublicNewsCategories`, `getPublicNewsTags`, and `getPublicAiNewsDiscovery`.
- Configured database reads, P1001/environment fallback, English indexability filtering, pagination, and unknown-error propagation must remain unchanged.
- No topic configuration module, article-detail shell, shared UI component, settings guard, Prisma schema, database configuration, route wrapper, or production configuration may change.

## Controlled regression-fixture expansion

The first relevant regression run proved that three existing tests exercised configured-database behavior without declaring a configured `DATABASE_URL`. Standing authorization therefore adds only these direct test dependencies:

1. `src/lib/ai-news-listing-seo.test.ts`
2. `src/lib/ai-news-pagination-page-shell.test.tsx`
3. `src/lib/public-content-news-pagination.test.ts`

The permitted change is limited to setting a non-routable placeholder `DATABASE_URL` for configured-path cases and restoring the environment afterward. Assertions, product behavior, pagination rules, and coverage may not be weakened.

## TDD acceptance criteria

- Focused RED evidence proves the current DB-free public-content reads before any shared edit.
- With `DATABASE_URL=UNSET`, both locales render an explicit `UNVERIFIED` state for empty and filtered listing URLs.
- DB-free metadata is `noindex, follow` and uses a safe local-preview description.
- The DB-free shell emits no news cards, topic/keyword collections, CollectionPage, ItemList, FAQ, or article-fact structured data.
- AI News public-content Prisma query count and configured-topic reader count are 0 in DB-free route execution.
- With a configured placeholder URL and mocked data, the existing listing path remains available without a real database connection.
- Existing R16-R21 focused tests and AI News focused regressions remain green.
- Target ESLint, project typecheck, and `git diff --check` pass.

## Localhost acceptance criteria

With `DATABASE_URL=UNSET`, telemetry disabled, and the server bound only to `127.0.0.1`:

- `/ai-news`, `/en/ai-news`, `/ai-news?q=ai`, and `/en/ai-news?q=ai` return HTTP 200.
- Every route visibly contains `UNVERIFIED` and emits `noindex, follow`.
- No route renders news-card links, topic/keyword collections, CollectionPage, ItemList, FAQ schema, or Prisma errors.
- The local service is stopped and its selected port has no residual listener.

## Validation commands

- `npx --no-install vitest run src/lib/e1-nb-r22-ai-news-listing-preview.test.tsx --reporter=verbose`
- Run R16-R21 focused regressions plus relevant AI News listing, pagination, SEO, discovery, topic, and public-content tests.
- Run settings/public-content DB-free boundary regressions.
- `npx --no-install eslint src/app/ai-news/page-shell.tsx src/lib/e1-nb-r22-ai-news-listing-preview.test.tsx` plus `src/lib/public-content.ts` if expanded.
- `npm run typecheck`
- Localhost-only HTTP checks for the four approved AI News URLs.
- `git diff --check`
- `git status --porcelain=v1 --untracked-files=all`

## Forbidden files and operations

- Do not modify article-detail/topic shells, topic configuration, shared UI components, route wrappers, existing tests, `settings.ts`, sitemap, evidence, production configuration, database configuration, Prisma schema/migrations, or any other path.
- Do not access or modify the frozen old worktree.
- Do not use a real database, external network, SSH, Docker, deployment, publishing, or remote Git operations.
- Do not use reset, clean, stash, broad deletion, `git add .`, or push.

## Failure handling and stop conditions

- Stop if branch, contract-commit HEAD, clean-worktree state, `DATABASE_URL=UNSET`, or route structure drifts before implementation.
- Automatically record the single `public-content.ts` scope expansion if the focused RED proves it necessary; do not expand another shared file without a new risk review.
- Stop without implementation commit if any route is not HTTP 200, a DB-free content read occurs, a focused verification fails, or an unauthorized path changes.
- Local acceptance never changes `CONTENT_EVIDENCE=UNVERIFIED`, `PUBLISH_STATUS=BLOCKED`, or `PUSH_STATUS=NOT_PUSHED`.
