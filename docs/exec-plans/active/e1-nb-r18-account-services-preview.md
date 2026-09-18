# E1-NB-R18 Account Services Preview Contract

## Contract

- `task_id`: `E1-NB-R18`
- `task_name`: `Account Services DB-free UNVERIFIED preview parity`
- `base_head`: `960bc5ff971a1eb8fb87703bec07d31a36cbc71e`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `owner_acceptance`: `PASS_LOCAL_ONLY`
- `status`: `COMPLETED_LOCAL_ONLY`
- `execution_authorization`: `APPROVED`
- `implementation`: `GREEN_FOCUSED`
- `local_acceptance`: `PASS`
- `commit`: `5e04d35a53cc8c18df22d969556cef31b042ee1c`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`

R18 implementation and local acceptance are complete within this contract's exact file and operation boundaries. This local-only closure does not verify service content or authorize publication.

## Allowed business files

Only the following business/test/receipt paths were authorized and committed for R18:

1. `src/app/account-services/page-shell.tsx`
2. `src/lib/e1-nb-r18-account-services-preview.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r18-account-services-preview-receipt.json`

## Goal

Provide a DB-free local preview for the Chinese and English Account Services listing pages. When verified service data is unavailable, both pages must render an explicit `UNVERIFIED` empty state without fabricating service cards, service facts, or publication evidence.

## Acceptance criteria

- `/account-services` returns HTTP 200.
- `/en/account-services` returns HTTP 200.
- With `DATABASE_URL=UNSET`, both languages display an explicit `UNVERIFIED` state.
- No fabricated service cards or unverified service facts are rendered.
- Both DB-free pages use `noindex, follow`.
- Settings and public-content Prisma query counts are both 0.
- `DATABASE_URL` remains unset, and no real database connection occurs.
- When a database is configured, the existing data path and verified cards remain available and are not forced to `noindex`.
- Focused Vitest demonstrates a real RED before implementation and passes GREEN afterward.
- Target ESLint passes.
- `git diff --check` passes.
- The final diff remains limited to the three allowed business/test/receipt files.

## Validation plan

- Run the focused R18 Vitest file for RED and GREEN evidence.
- Run the existing settings and public-content DB-free focused regression tests.
- Run target ESLint only for the authorized changed source and test files.
- With `DATABASE_URL=UNSET`, check `/account-services` and `/en/account-services` on localhost for HTTP status, `UNVERIFIED`, `noindex, follow`, absence of fabricated content, and zero Prisma reads.
- Stop the local service, confirm no residual listener, run `git diff --check`, and verify the final Git scope.

## Forbidden operations and files

- Do not modify `src/lib/settings.ts`.
- Do not modify `src/lib/public-content.ts`.
- Do not modify sitemap, evidence, production configuration, database configuration, Prisma schema/migrations, R16 files, R17 code/tests/receipt, or any other path.
- Do not connect to a real database or change `DATABASE_URL`.
- Do not use external network access, SSH, Docker, deployment, production validation, publishing, or remote Git operations.
- Do not modify or inspect the frozen old worktree or its 207 protected entries.
- Do not use destructive Git operations such as reset, clean, stash, or forced checkout.

## Failure handling and stop conditions

- Stop if `execution_authorization` is no longer `APPROVED`; `owner_acceptance` remains a post-implementation acceptance gate.
- Stop and request scope review if a RED test proves a change outside the three allowed business/test/receipt files is required.
- Stop without commit if either route is not HTTP 200, Prisma queries are nonzero, any focused verification fails, or an unexpected path changes.
- Local acceptance never changes `CONTENT_EVIDENCE=UNVERIFIED` or `PUBLISH_STATUS=BLOCKED`.

## Completion result

- Focused tests: `22 passed`, `0 failed`.
- Target ESLint: `PASS`.
- `/account-services`: HTTP 200, explicit `UNVERIFIED`, `noindex, follow`.
- `/en/account-services`: HTTP 200, explicit `UNVERIFIED`, `noindex, follow`.
- Settings/public-content Prisma query counts: `0` with `DATABASE_URL=UNSET`.
- No service cards or Account Services Service/FAQPage/CollectionPage facts were emitted in the DB-free preview.
- Local commit: `5e04d35a53cc8c18df22d969556cef31b042ee1c`.
- Push and deployment: `NOT_RUN`.

## Next candidate task

- `task_id`: `E1-NB-R19`
- `task_name`: `Product Paths DB-free preview parity`
- `status`: `PROPOSED_WAITING_FOR_APPROVAL`
- `owner_acceptance`: `PENDING`
- `publish_status`: `BLOCKED`

R19 business files are not authorized by this R18 closure and must not be modified until separately approved.
