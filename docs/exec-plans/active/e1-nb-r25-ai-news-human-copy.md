# E1-NB-R25 AI News Human-facing Copy Contract

## Contract

- `task_id`: `E1-NB-R25`
- `task_name`: `Replace machine-facing AI News answer labels`
- `contract_base_head`: `ee6e0e112dc32f7ed37c2dfd17b20b5890b53c4d`
- `execution_base_head`: `aa774cf0a40f975c6367961a9c6e0ce2c6fc73a7`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `COMPLETED_LOCAL_ONLY`
- `execution_authorization`: `APPROVED`
- `owner_acceptance`: `PASS_LOCAL_ONLY`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`

## Allowed files

1. `src/app/ai-news/page-shell.tsx`
2. `src/lib/e1-nb-r25-ai-news-human-copy.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r25-ai-news-human-copy-receipt.json`

## Acceptance criteria

- Chinese configured-content rendering uses `核心结论`; English uses `Key takeaway`.
- Source and rendered output no longer contain `可摘录答案` or `Extractable answer`.
- News body copy, factual data, JSON-LD, and indexing rules remain unchanged.
- R22, AI News SEO, and pagination regressions pass.
- DB-free `/ai-news` and `/en/ai-news` remain HTTP 200 with visible `UNVERIFIED` and `noindex, follow`.
- Focused RED/GREEN, target ESLint, typecheck, and `git diff --check` pass.

## Validation

- Focused configured-content render test with mocks and no real database.
- R22 plus AI News SEO/pagination regressions.
- Target ESLint and `npm run typecheck`.
- Localhost-only DB-free checks for `/ai-news` and `/en/ai-news`.
- `git diff --check` and exact scope/status checks.

## Forbidden operations

No news-body/fact/schema/indexing change, real database, network, SSH, Docker, deployment, push/PR, production configuration, content import, old-worktree access, destructive Git, broad staging, or deletion of pre-existing files.

## Failure handling

Do not commit implementation unless every acceptance gate passes. Stop if the change requires factual-content judgment, schema/indexing changes, or unauthorized scope. Content evidence and publication status remain unchanged.

## Completion

- `implementation`: `GREEN_FOCUSED`
- `local_acceptance`: `PASS`
- `commit`: `cb04661d189ca7e37f6116236ec15e8765271b6c`
- `receipt_bytes`: `4780`
- `receipt_sha256`: `28f620d60d65f9857e5da037da9adb4c720be80cb1815ad6177fd06caa1e7d24`
- `batch_progress`: `3/3`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`
