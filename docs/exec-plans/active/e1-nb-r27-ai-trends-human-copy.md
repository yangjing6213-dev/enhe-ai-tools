# E1-NB-R27 AI Trends Human-facing Copy Contract

## Contract

- `task_id`: `E1-NB-R27`
- `task_name`: `AI Trends human-facing answer labels`
- `contract_base_head`: `3a3b385d854d104ef80051f74529e41802cde517`
- `execution_base_head`: `06749bbf36b53a81fa35ae968d465bd991434ea0`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `COMPLETED_LOCAL_ONLY`
- `execution_authorization`: `APPROVED`
- `owner_acceptance`: `PASS_LOCAL_ONLY`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`

## Allowed files

1. `src/app/ai-trends/page-shell.tsx`
2. `src/lib/e1-nb-r27-ai-trends-human-copy.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r27-ai-trends-human-copy-receipt.json`

## Acceptance criteria

- Configured-content Chinese uses `核心结论`; English uses `Key takeaway`.
- Source and rendered output no longer contain `可摘录答案` or `Extractable answer`.
- Trend copy, rankings, sources, JSON-LD, metadata, and DB-free behavior remain unchanged.
- R23 and direct AI Trends regressions pass.
- DB-free `/ai-trends` and `/en/ai-trends` remain HTTP 200, UNVERIFIED, and `noindex, follow`.
- Focused RED/GREEN, target ESLint, typecheck, and `git diff --check` pass.

## Forbidden operations

No factual-content edit, database, schema, migration, network, SSH, Docker,
deployment, push/PR, production configuration, old-worktree access, destructive
Git, broad staging, or deletion of pre-existing files.

## Completion

- `implementation`: `GREEN_FOCUSED`
- `local_acceptance`: `PASS`
- `commit`: `d186c7f2e74c85c702ce97bd3d4f2a74e8714f47`
- `receipt_bytes`: `4902`
- `receipt_sha256`: `e9977cdd7119d1468ee7a359eb15c4de5fd8be75617749007c723d1e8764109e`
- `batch_progress`: `1/3`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`
