# E1-NB-R28 AI News Topic Human-facing Copy Contract

## Contract

- `task_id`: `E1-NB-R28`
- `task_name`: `AI News Topic human-facing answer labels`
- `contract_base_head`: `3a3b385d854d104ef80051f74529e41802cde517`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `AUTHORIZED_WAITING_FOR_R27`
- `execution_authorization`: `APPROVED`
- `owner_acceptance`: `PENDING`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`

## Allowed files

1. `src/app/ai-news/topics/[slug]/page-shell.tsx`
2. `src/lib/e1-nb-r28-ai-news-topic-human-copy.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r28-ai-news-topic-human-copy-receipt.json`

## Acceptance criteria

- Configured-content Chinese uses `核心结论`; English uses `Key takeaway`.
- Source and rendered topic output no longer contain `可摘录答案` or `Extractable answer`.
- Topic content, related articles, facts, JSON-LD, metadata, and indexing remain unchanged.
- AI News topic, R22, SEO, and pagination regressions pass.
- Focused RED/GREEN, target ESLint, typecheck, localhost smoke, and `git diff --check` pass.

## Forbidden operations

No factual-content edit, database, schema, migration, network, SSH, Docker,
deployment, push/PR, production configuration, old-worktree access, destructive
Git, broad staging, or deletion of pre-existing files.
