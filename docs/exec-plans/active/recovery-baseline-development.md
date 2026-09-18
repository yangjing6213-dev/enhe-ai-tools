# Recovery Baseline Development Contract

## Contract

- `task_id`: `RECOVERY-BASELINE-DEVELOPMENT`
- `task_name`: `Controlled recovery baseline and next-task preparation`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `branch`: `codex/enhe-recovery-baseline`
- `base_head`: `26b4f189d0d79d8e885e9f39205aca18bd2d04f1`
- `initial_owner_acceptance`: `PENDING`
- `baseline_status`: `COMPLETED`
- `baseline_head`: `3c2a0f05c46b0f7160475794a47aed50cd339947`
- `owner_acceptance`: `PASS_LOCAL_ONLY`
- `next_task`: `E1-NB-R18`
- `old_worktree`: `FROZEN`
- `publish_status`: `BLOCKED`

The original recovery base and pending acceptance above are retained as history. The current completion state reflects the clean recovery line after the locally committed R17 work.

## Allowed paths under this contract

No business implementation paths are authorized by this baseline contract. The two governance files named in this contract are the only files created for recovery setup:

- `docs/exec-plans/MASTER_BACKLOG.md`
- `docs/exec-plans/active/recovery-baseline-development.md`

The proposed next business task is listed for review only and requires a separate approval before touching its proposed files.

## Historical first formal business task proposal

`E1-NB-R17` Skill-learning DB-free UNVERIFIED preview parity.

This proposal was subsequently approved, implemented, locally accepted, and committed as `3c2a0f05c46b0f7160475794a47aed50cd339947`. Content evidence remains `UNVERIFIED`, and publication remains `BLOCKED`.

Proposed file range, pending separate approval:

- `src/app/skill-learning/page-shell.tsx`
- `src/lib/e1-nb-r17-skill-learning-preview.test.tsx`
- `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r17-skill-learning-preview-receipt.json`

## Forbidden operations

- Modify business code under this baseline contract.
- Modify the frozen old worktree or its 207 dirty/untracked entries.
- Network, SSH, Docker, deployment or production access.
- Real database access, migration, seed or writes.
- `git reset`, `git clean`, `git stash`, destructive checkout, `git push` or remote mutation.
- Modify `.env`, `package-lock.json`, Prisma schema/migrations or evidence manifests.

## Validation commands

For recovery setup only:

- `git status --porcelain=v1 --untracked-files=all`
- `git diff --check`
- `git diff --cached --name-only`
- `Test-Path .git/index.lock`

The historical R17 task used focused Vitest RED/GREEN, target ESLint, localhost route checks, and final status verification. Its completed local result does not authorize publication.

## Acceptance criteria

- New recovery worktree remains clean after governance commit.
- Only the two governance files are staged and committed.
- R16 commit remains the base HEAD ancestor and is not rewritten.
- No database, network, deployment or production operation occurs.
- R17 is `COMPLETED_LOCAL_ONLY` at commit `3c2a0f05c46b0f7160475794a47aed50cd339947`; R18 remains pending separate owner approval.
- Evidence remains `UNVERIFIED`; publication remains `BLOCKED`.

## Failure handling and stop conditions

- Stop if any unexpected path is staged, any pre-existing change appears, or the worktree identity drifts.
- Stop if a command attempts database, network, SSH, Docker or deployment access.
- Do not repair or clean unrelated files; report the exact path and status.
- Stop after the governance commit and clean-worktree verification; do not start R18 automatically.
