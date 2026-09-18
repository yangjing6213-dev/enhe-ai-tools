# Recovery Baseline Development Contract

## Contract

- `task_id`: `RECOVERY-BASELINE-DEVELOPMENT`
- `task_name`: `Controlled recovery baseline and next-task preparation`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `branch`: `codex/enhe-recovery-baseline`
- `base_head`: `26b4f189d0d79d8e885e9f39205aca18bd2d04f1`
- `owner_acceptance`: `PENDING`

## Allowed paths under this contract

No business implementation paths are authorized by this baseline contract. The two governance files named in this contract are the only files created for recovery setup:

- `docs/exec-plans/MASTER_BACKLOG.md`
- `docs/exec-plans/active/recovery-baseline-development.md`

The proposed next business task is listed for review only and requires a separate approval before touching its proposed files.

## Proposed first formal business task

`E1-NB-R17` Skill-learning DB-free UNVERIFIED preview parity.

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

For the proposed R17 task, commands are pending separate approval and must include focused Vitest RED/GREEN, target ESLint, localhost route checks, and final status verification.

## Acceptance criteria

- New recovery worktree remains clean after governance commit.
- Only the two governance files are staged and committed.
- R16 commit remains the base HEAD ancestor and is not rewritten.
- No database, network, deployment or production operation occurs.
- Proposed R17 remains `PENDING` until owner approval; no code is changed by this contract.
- Evidence remains `UNVERIFIED`; publication remains `BLOCKED`.

## Failure handling and stop conditions

- Stop if any unexpected path is staged, any pre-existing change appears, or the worktree identity drifts.
- Stop if a command attempts database, network, SSH, Docker or deployment access.
- Do not repair or clean unrelated files; report the exact path and status.
- Stop after the governance commit and clean-worktree verification; do not start R17 automatically.
