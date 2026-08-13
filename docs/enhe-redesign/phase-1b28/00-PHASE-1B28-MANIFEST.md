# ENHE Phase 1B.2.8 Manifest

PHASE_1B_2_8_STATUS=BLOCKED
AUTHORITATIVE_BASELINE_STATUS=BLOCKED_RUNTIME_HEARTBEAT_TEST_ARCHITECTURE
TEST_ARCHITECTURE_DECISION=THREE_LAYER_SEPARATION

## Handoff acceptance

CODEX_ACCOUNT_HANDOFF=OFFICIAL_OPENAI_API_ACCOUNT
PREVIOUS_CODEX_CONTEXT_AVAILABLE=NO
HANDOFF_PROMPT_SELF_CONTAINED=YES
REDESIGN_WORKTREE_VERIFIED=YES
INTEGRATION_WORKTREE_VERIFIED=YES
INVESTIGATION_WORKTREE_VERIFIED=YES
R008_PATCHES_PRESERVED=YES
CREDENTIAL_VALUES_PRINTED=NO

## Scope

本阶段只调查 Runtime Heartbeat 测试架构。R-008、公共壳、产品详情、下载、支付、OAuth、优惠券、数据库业务和生产环境均未进入本阶段。

调查 worktree：`C:\Users\HU\Documents\New project 2\.worktrees\enhe-runtime-heartbeat-c37569a`

分支：`codex/enhe-runtime-heartbeat-c37569a`

起始 HEAD：`c37569a85ebacd04bd70a8884295852fe5733e42`

## Blocking decision

生产 `runtime-heartbeat.mjs` 仅导出 `loadRuntimeHeartbeatIdentity` 与 `writeRuntimeHeartbeat`。Worker 和 Scheduler 的核心循环在模块顶层启动，未提供可注入、可控时钟、可替换外部边界的生产函数。核心 RED 测试因此稳定失败，无法在不修改生产实现的情况下满足 Phase 1B.2.8 的核心契约要求。

依据附件第 24 节，记录：

`PHASE_1B_2_8_STATUS=BLOCKED`

`REASON=CORE_CONTRACT_NOT_TESTABLE_WITHOUT_PRODUCTION_REFACTOR`

## Evidence files

| 文件 | 作用 |
|---|---|
| 01-MONOLITHIC-TEST-ARCHITECTURE-REVIEW.md | 原单体职责与耦合证据 |
| 02-TEST-SEPARATION-DESIGN.md | 三层拆分目标与阻塞边界 |
| 03-HEARTBEAT-CONTRACT-EVIDENCE.md | RED 失败与核心导出证据 |
| 04-STATE-STORE-ATOMICITY-EVIDENCE.md | 状态写入层未执行说明 |
| 05-ENGINE-PROTOCOL-EVIDENCE.md | engine 协议层未执行说明 |
| 06-FULL-SUITE-STABILITY.md | 压力与完整套件未执行说明 |
| 07-BUILD-VALIDATION.md | lint/typecheck/build 未执行说明 |
| 08-PHASE-1B28-READINESS.md | 阻塞就绪结论与恢复前提 |
| 09-COMMAND-LOG.md | 可复核命令记录 |
| 10-FINAL-RECEIPT.md | 结构化最终回执 |
| 11-HEARTBEAT-TEST-ARCHITECTURE.patch | 本阶段未产生实现补丁的记录 |
