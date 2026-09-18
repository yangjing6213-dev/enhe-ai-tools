# E1-NB-R23 AI Trends Preview Contract

## Contract

- `task_id`: `E1-NB-R23`
- `task_name`: `AI Trends DB-free UNVERIFIED preview boundary`
- `base_head`: `ee6e0e112dc32f7ed37c2dfd17b20b5890b53c4d`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `AUTHORIZED`
- `execution_authorization`: `APPROVED`
- `owner_acceptance`: `PENDING`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`

## Allowed files

1. `src/lib/ai-trends.ts`
2. `src/app/ai-trends/page-shell.tsx`
3. `src/lib/e1-nb-r23-ai-trends-preview.test.tsx`
4. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r23-ai-trends-preview-receipt.json`

Existing direct `ai-trends` regression tests may change only when the implementation changes their declared behavior contract. At most two direct call-chain files may be added under standing authorization when a focused RED proves they are required; the reason and regression coverage must be recorded.

## Acceptance criteria

- With `DATABASE_URL=UNSET`, AI Trends public readers return type-compatible `[]` or `null` and do not call Prisma.
- `/ai-trends` and `/en/ai-trends` return HTTP 200 with visible `UNVERIFIED` and `noindex, follow`.
- DB-free topic pages do not render trend rankings, scores, source claims, or trend-fact schema.
- A configured placeholder URL plus Prisma mocks preserves the existing data-backed behavior, P1001 fallback, and unknown-error propagation.
- Daily archive/detail regressions, focused RED/GREEN, target ESLint, typecheck, and `git diff --check` pass.
- No Prisma schema, migration, production configuration, sitemap, or evidence file changes.

## Validation

- `npx --no-install vitest run src/lib/e1-nb-r23-ai-trends-preview.test.tsx --reporter=verbose`
- Run existing `src/lib/ai-trends*.test.ts` direct regressions.
- Target ESLint for changed TypeScript/TSX files.
- `npm run typecheck`
- Localhost-only checks for `/ai-trends` and `/en/ai-trends` with `DATABASE_URL=UNSET`.
- `git diff --check` and exact scope/status checks.

## Forbidden operations

No real database, Prisma schema/migration, network, SSH, Docker, deployment, push/PR, secret modification, first-party content import, old-worktree access, destructive Git, broad staging, or deletion of pre-existing files.

## Failure handling

Do not commit implementation unless every acceptance gate passes. Any scope expansion beyond two direct files, real content requirement, or production/remote dependency stops execution. Local acceptance never changes `CONTENT_EVIDENCE=UNVERIFIED`, `PUBLISH_STATUS=BLOCKED`, or `PUSH_STATUS=NOT_PUSHED`.
