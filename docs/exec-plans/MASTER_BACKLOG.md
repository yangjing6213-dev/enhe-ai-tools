# ENHE Recovery Master Backlog

Status: CONTROLLED_RECOVERY
Worktree: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
Base HEAD: `26b4f189d0d79d8e885e9f39205aca18bd2d04f1`

## Current stage

正常开发前的受控恢复阶段。新 recovery worktree 是唯一开发主线；旧 worktree 的 207 项 dirty/untracked 状态保持冻结，不清理、不迁移、不覆盖。

## Completed

- `E1-NB-R16` Tutorials DB-free empty state：本地实现、focused test 4/4、目标 ESLint 和 localhost 验收已完成；仅本地关闭，不代表内容事实或生产发布已验证。
- Recovery baseline：branch、HEAD、clean worktree 和 R16 focused baseline 已验证。

## Current blockers and gates

- 教程一手内容仍未验证，`TUTORIAL_CONTENT_EVIDENCE=UNVERIFIED`。
- `PUBLISH_STATUS=BLOCKED`；未授权生产发布、部署或远程事实声明。
- `DATABASE_URL=UNSET`；本地开发须保持 DB-free 边界，不得连接真实数据库。
- 旧 worktree `C:\Users\HU\Documents\New project 2\.worktrees\enhe-phase2c5b-p0-runtime-assets-v1` 的 207 项状态受保护。

## Candidate tasks

| ID | State | Proposed scope | Acceptance |
|---|---|---|---|
| RECOVERY-BASELINE-DEVELOPMENT | ACTIVE / contract pending | Establish the clean recovery line and one approved next-task contract | Contract reviewed; no code change under baseline contract |
| E1-NB-R17 | PROPOSED / not authorized | Skill-learning DB-free UNVERIFIED preview parity; proposed files: `src/app/skill-learning/page-shell.tsx`, one focused test, one receipt | TDD RED/GREEN, localhost route checks, noindex/follow for unverified English, no database/network, scoped receipt |
| CONTENT-EVIDENCE-RECONCILIATION | BLOCKED | Reconcile first-party tutorial/content evidence only when an approved source is available | Source bytes/hash and publication approval independently verified |
| PHASE-2C.6 RELEASE | NOT APPROVED | Production publication/deployment | Separate production, database, deployment and factual-evidence approvals |

## Operating rules

- `UNVERIFIED` is not `FAILED`, but it never authorizes publication.
- Every implementation task needs a current contract with exact file ownership and tests before code changes.
- Do not touch the frozen old worktree or automatically classify its 207 entries.
- No push, deployment, production database access, SSH or Docker without separate approval.
