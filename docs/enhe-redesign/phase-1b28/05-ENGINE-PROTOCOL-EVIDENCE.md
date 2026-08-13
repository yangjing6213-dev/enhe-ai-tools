# Synthetic Engine Protocol Evidence

`ENGINE_PROTOCOL_STATUS=NOT_RUN_DUE_CORE_BLOCK`

原单体测试通过真实 child process、fixture HTTP server 和 Python shim 触发 engine 生命周期；生产 Worker 在 `seo-audit-worker.mjs:217` 使用 `spawn` 启动实际 engine。该路径同时连接 claim、Heartbeat、状态文件与 cleanup，无法作为独立协议证据。

本阶段没有创建新的 synthetic engine fixture，没有运行 `READY/HOLD/RELEASE/ABORT/ERROR` 协议测试，也没有运行 50 次启停压力测试。这样避免把未完成的 engine 层结果误报为 Heartbeat 核心契约结果。

`ENGINE_PROTOCOL_USES_EXPLICIT_READY_HOLD_RELEASE=NOT_RUN`

恢复条件：先完成核心生产 seam 的负责人评审；随后单独创建 test-only fixture，使用随机临时标识和明确 ACK，确保 `RELEASE` 后 `await close`，并在 finally 中 kill/清理。
