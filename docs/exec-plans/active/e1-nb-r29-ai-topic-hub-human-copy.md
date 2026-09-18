# E1-NB-R29 AI Topic Hub Human-facing Copy Contract

## Contract

- `task_id`: `E1-NB-R29`
- `task_name`: `AI Topic Hub human-facing answer copy`
- `contract_base_head`: `3a3b385d854d104ef80051f74529e41802cde517`
- `execution_base_head`: `4f546434c01e4fbb9633ec826de1156dbbd844e3`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `COMPLETED_LOCAL_ONLY`
- `execution_authorization`: `APPROVED`
- `owner_acceptance`: `PASS_LOCAL_ONLY`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`

## Allowed files

1. `src/app/ai-topics/page-shell.tsx`
2. `src/lib/e1-nb-r29-ai-topic-hub-human-copy.test.tsx`
3. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r29-ai-topic-hub-human-copy-receipt.json`

## Acceptance criteria

- Chinese detail label uses `核心结论`; English uses `Key takeaway`.
- Hub copy describes user decisions and next steps without machine-facing `可摘录答案`, `direct answers`, or answer-engine optimization claims.
- Topic records, comparison rows, links, facts, JSON-LD, metadata, and indexing remain unchanged.
- Hub/detail focused and existing topic regressions pass.
- `/ai-topics`, `/en/ai-topics`, and one bilingual detail pair return HTTP 200 without old machine-facing copy.
- Focused RED/GREEN, target ESLint, typecheck, and `git diff --check` pass.

## Forbidden operations

No topic-data or factual edit, database, schema, migration, network, SSH, Docker,
deployment, push/PR, production configuration, old-worktree access, destructive
Git, broad staging, or deletion of pre-existing files.

## Completion

- `implementation`: `GREEN_FOCUSED`
- `local_acceptance`: `PASS`
- `commit`: `5f7dc711f1288fa1e425f32a81286ba7f037852c`
- `receipt_bytes`: `5583`
- `receipt_sha256`: `99fed6015107c76e58ab940ef6800e044189cdf2e2c5830b60533ed0a532529d`
- `batch_progress`: `3/3`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`
