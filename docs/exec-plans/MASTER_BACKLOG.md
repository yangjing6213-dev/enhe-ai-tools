# ENHE Recovery Master Backlog

Status: CONTROLLED_RECOVERY
Worktree: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
Base HEAD: `26b4f189d0d79d8e885e9f39205aca18bd2d04f1`
Current development HEAD: `d186c7f2e74c85c702ce97bd3d4f2a74e8714f47`

Operating mode: `AUTONOMOUS_LOCAL_DEVELOPMENT`
Owner standing authorization: `APPROVED`
Execution policy: `ONE_TASK_AT_A_TIME=REQUIRED`
Push status: `NOT_PUSHED`
Publish status: `BLOCKED`
Content evidence: `UNVERIFIED`

## Current stage

正常开发前的受控恢复阶段。新 recovery worktree 是唯一开发主线；旧 worktree 的 207 项 dirty/untracked 状态保持冻结，不清理、不迁移、不覆盖。

Current local batch: `R27 -> R28 -> R29`
Batch progress: `1/3`

Analytics DB-free investigation: the observed `/api/analytics` 503 is the
existing fail-closed storage contract. The route explicitly reports a dropped
event as 503, while the browser sender ignores the response body and handles
network rejection. `R26` was therefore not created; no analytics code changed.

## Completed

- `E1-NB-R16` Tutorials DB-free empty state：本地实现、focused test 4/4、目标 ESLint 和 localhost 验收已完成；仅本地关闭，不代表内容事实或生产发布已验证。
- Recovery baseline：branch、HEAD、clean worktree 和 R16 focused baseline 已验证。
- `E1-NB-R17` Skill-learning DB-free UNVERIFIED preview parity：
  - `STATUS=COMPLETED_LOCAL_ONLY`
  - `IMPLEMENTATION=GREEN_FOCUSED`
  - `LOCAL_ACCEPTANCE=PASS`
  - `COMMIT=3c2a0f05c46b0f7160475794a47aed50cd339947`
  - `CONTENT_EVIDENCE=UNVERIFIED`
  - `PUBLISH_STATUS=BLOCKED`
  - DB-free settings/public-content guards 已通过；`/skill-learning`、`/en/skill-learning`、`/tutorials`、`/en/tutorials` 四个 localhost 路由已通过，R16 focused regression 已通过。
  - R17 已本地提交；该结论不代表内容事实已验证，也不代表允许发布。
- `E1-NB-R18` Account Services DB-free UNVERIFIED preview parity：
  - `STATUS=COMPLETED_LOCAL_ONLY`
  - `IMPLEMENTATION=GREEN_FOCUSED`
  - `LOCAL_ACCEPTANCE=PASS`
  - `COMMIT=5e04d35a53cc8c18df22d969556cef31b042ee1c`
  - `CONTENT_EVIDENCE=UNVERIFIED`
  - `PUBLISH_STATUS=BLOCKED`
  - `OWNER_ACCEPTANCE=PASS_LOCAL_ONLY`
  - Focused tests 22/22、目标 ESLint、`/account-services` 与 `/en/account-services` localhost 验收均通过；DB-free settings/public-content Prisma 查询为 0。
  - R18 已本地提交；该结论不代表服务内容已验证，也不代表允许发布。

- `E1-NB-R19` Product Paths DB-free UNVERIFIED preview parity:
  - `STATUS=COMPLETED_LOCAL_ONLY`
  - `IMPLEMENTATION=GREEN_FOCUSED`
  - `LOCAL_ACCEPTANCE=PASS`
  - `COMMIT=b0a39e9f2ff4a8424484db29447eaa3e12213868`
  - `CONTENT_EVIDENCE=UNVERIFIED`
  - `PUBLISH_STATUS=BLOCKED`
  - `OWNER_ACCEPTANCE=PASS_LOCAL_ONLY`
  - All six localized product-path routes passed localhost acceptance with DB-free Prisma query count 0, explicit UNVERIFIED state, noindex/follow, and no product cards or product-fact schemas.
  - R19 is committed locally only; it does not verify product facts and does not authorize publication.

## Current blockers and gates

- 教程一手内容仍未验证，`TUTORIAL_CONTENT_EVIDENCE=UNVERIFIED`。
- `PUBLISH_STATUS=BLOCKED`；未授权生产发布、部署或远程事实声明。
- `DATABASE_URL=UNSET`；本地开发须保持 DB-free 边界，不得连接真实数据库。
- 旧 worktree `C:\Users\HU\Documents\New project 2\.worktrees\enhe-phase2c5b-p0-runtime-assets-v1` 的 207 项状态受保护。

## Candidate tasks

| ID | State | Proposed scope | Acceptance |
|---|---|---|---|
| RECOVERY-BASELINE-DEVELOPMENT | COMPLETED | Established the clean recovery line and advanced the verified local baseline through R22 | `BASELINE_HEAD=d29e3dd88c0adf8c6c72764f3622572a1da89d7c`; local-only acceptance; publication blocked |
| E1-NB-R17 | COMPLETED_LOCAL_ONLY | Skill-learning DB-free UNVERIFIED preview parity with settings/public-content DB-free guards | Focused implementation and local acceptance passed; content remains unverified; commit `3c2a0f05c46b0f7160475794a47aed50cd339947` |
| E1-NB-R18 | COMPLETED_LOCAL_ONLY | Account Services DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; `OWNER_ACCEPTANCE=PASS_LOCAL_ONLY`; commit `5e04d35a53cc8c18df22d969556cef31b042ee1c`; content unverified and publication blocked |
| E1-NB-R19 | COMPLETED_LOCAL_ONLY | Product Paths DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; `OWNER_ACCEPTANCE=PASS_LOCAL_ONLY`; commit `b0a39e9f2ff4a8424484db29447eaa3e12213868`; content unverified and publication blocked |
| E1-NB-R20 | COMPLETED_LOCAL_ONLY | Software Catalog DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `697ebd78fbd78b0cf786b30295936e52d451cf64`; content unverified and publication blocked |
| E1-NB-R21 | COMPLETED_LOCAL_ONLY | Public Search DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `350ec0a3e0e1edd2b87de6cac391f1f6c197dd76`; content unverified and publication blocked |
| E1-NB-R22 | COMPLETED_LOCAL_ONLY | AI News Listing DB-free UNVERIFIED preview parity | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `d29e3dd88c0adf8c6c72764f3622572a1da89d7c`; content unverified and publication blocked |
| E1-NB-R23 | COMPLETED_LOCAL_ONLY | AI Trends DB-free UNVERIFIED preview boundary | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `0f304c46abf03ba1b9c6d1e928a7a04661c2f839`; content unverified and publication blocked |
| E1-NB-R24 | COMPLETED_LOCAL_ONLY | Bilingual public-shell skip-to-content navigation | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `c35eb6e7ac0094a7e2286baecb16f249f1fa254c`; desktop/mobile keyboard and layout acceptance passed; publication remains blocked |
| E1-NB-R25 | COMPLETED_LOCAL_ONLY | Replace machine-facing AI News answer labels | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `cb04661d189ca7e37f6116236ec15e8765271b6c`; news facts, JSON-LD, and indexing behavior unchanged; content unverified and publication blocked |
| E1-NB-R27 | COMPLETED_LOCAL_ONLY | AI Trends human-facing answer labels | `IMPLEMENTATION=GREEN_FOCUSED`; `LOCAL_ACCEPTANCE=PASS`; commit `d186c7f2e74c85c702ce97bd3d4f2a74e8714f47`; trend facts, sources, JSON-LD, metadata, and DB-free behavior unchanged; content unverified and publication blocked |
| E1-NB-R28 | AUTHORIZED | AI News Topic human-facing answer labels | Replace machine-facing bilingual topic labels without changing topic content, facts, JSON-LD, or indexing behavior |
| E1-NB-R29 | AUTHORIZED_WAITING_FOR_R28 | AI Topic Hub human-facing answer copy | Replace machine-facing hub/detail copy with user-facing guidance without changing topic data, links, JSON-LD, or indexing behavior |
| CONTENT-EVIDENCE-RECONCILIATION | BLOCKED | Reconcile first-party tutorial/content evidence only when an approved source is available | Source bytes/hash and publication approval independently verified |
| PHASE-2C.6 RELEASE | NOT APPROVED | Production publication/deployment | Separate production, database, deployment and factual-evidence approvals |

## Operating rules

- `UNVERIFIED` is not `FAILED`, but it never authorizes publication.
- Every implementation task needs a current contract with exact file ownership and tests before code changes.
- Do not touch the frozen old worktree or automatically classify its 207 entries; all 207 entries remain frozen after R18 closure.
- No push, deployment, production database access, SSH or Docker without separate approval.
