# Monolithic Runtime Heartbeat Test Review

审查对象：`deploy/enhe-ai-tools/scripts/runtime-heartbeat.test.mjs`。恢复到起始 HEAD 后，文件保持原有单体测试结构；失败尝试已备份到桌面隔离目录，未进入 Git 或结果 ZIP。

## 职责矩阵

| 职责 | 当前测试位置 | 真实进程 | 真实文件 | socket/端口 | 真实时间 | worker 负载 | 目标层 |
|---|---|---:|---:|---:|---:|---:|---|
| `LONG_JOB_CURRENT_RUN_ID_CONTRACT` | 720 秒 audit job 测试 | 是 | 是 | HTTP server | 是 | 是 | Heartbeat 核心 |
| `HEARTBEAT_REFRESH_CONTRACT` | 720 秒 audit job 测试 | 是 | 是 | HTTP server | 是 | 是 | Heartbeat 核心 |
| `SCHEDULER_REQUEST_CONTRACT` | fixture server 与 worker 请求 | 是 | 否 | 动态 HTTP 端口 | 是 | 是 | Heartbeat 核心/外部边界 |
| `STATE_FILE_ATOMIC_WRITE` | 读取 worker heartbeat 文件 | 是 | 是 | 否 | 是 | 是 | 状态文件 |
| `WINDOWS_RENAME_BEHAVIOR` | 间接由生产 writer 触发 | 是 | 是 | 否 | 是 | 是 | 状态文件 |
| `SYNTHETIC_ENGINE_STARTUP` | engine child 启动路径 | 是 | 是 | 否 | 是 | 是 | engine 协议 |
| `SYNTHETIC_ENGINE_READY` | engine ready HTTP 回调 | 是 | 否 | 动态 HTTP 端口 | 是 | 是 | engine 协议 |
| `SOCKET_OR_CLAIM_HANDSHAKE` | worker claim/heartbeat HTTP fixture | 是 | 否 | 动态 HTTP 端口 | 是 | 是 | 外部边界 |
| `CHILD_PROCESS_LIVENESS` | PID 探测 | 是 | 否 | 否 | 是 | 是 | engine 协议 |
| `CHILD_PROCESS_SHUTDOWN` | exit/close 与 kill 清理 | 是 | 否 | 否 | 是 | 是 | engine 协议 |
| `CLEANUP` | `afterEach`、child/server/temp 清理 | 是 | 是 | 是 | 是 | 是 | 各层独立 cleanup |

## 直接证据

- 原测试导入 `node:child_process`、`node:fs`、`node:http`，并在文件前段创建 child、server、临时目录全局集合。
- 原测试同时覆盖 worker/scheduler release identity、engine 生命周期、720 秒运行、状态文件读取和环境隔离。
- 生产 Worker 在 `seo-audit-worker.mjs:113` 发送 Heartbeat，在 `:217` 启动 engine，在 `:242` 建立 Heartbeat timer，在 `:346` 进入顶层 `main`。
- 生产 Scheduler 在 `seo-audit-scheduler.mjs:65` 进入顶层 `main`，并直接调用 `writeRuntimeHeartbeat`。

## 判断

事实：多个独立边界由同一测试文件和同一长任务串接。

推测：当前失败既可能来自 Windows 原子写入竞争，也可能来自 engine ready/worker 负载时序；单体失败不能把两者归因到同一根因。

结论：必须拆成三层；但核心层需要生产代码提供可测试边界，不能由测试 helper 复制生产逻辑替代。
