# Three-Layer Test Separation Design

## 目标架构

### Layer 1: Heartbeat core contract

验证 `currentRunId` 保持、Heartbeat 刷新、720 秒逻辑、旧 run 不清空新 run、停止后 cleanup。测试必须使用可控时钟、内存状态 adapter、可控 Scheduler 响应，并禁止 child process、socket、真实状态文件和真实等待。

### Layer 2: state-file atomicity

直接调用生产 `writeRuntimeHeartbeat`，每个测试使用 `os.tmpdir()` 下唯一目录，覆盖单次写入、同路径连续更新、至少 20 次并发、不同路径并发、rename 失败清理、JSON 可解析和临时文件无残留。

### Layer 3: synthetic engine protocol

使用独立 test-only child fixture，协议明确包含 `READY`、`HOLD`、`RELEASE`、`ABORT`、`ERROR`，验证 ACK、存活、退出、close、启动错误和 50 次启停无残留。该层不得承担 Heartbeat 业务断言。

## 当前无法落地的边界

生产 `runtime-heartbeat.mjs` 目前只导出身份加载和状态写入函数。Worker/Scheduler 的 Heartbeat 核心逻辑埋在顶层进程脚本中，未导出可注入核心函数；直接导入 Worker/Scheduler 会触发其 `main()` 与外部边界。

因此，Layer 1 无法同时满足“调用真实生产核心逻辑”和“禁止 child process、socket、真实状态文件”的要求。创建 test-only 复制品会违反附件明确禁止项，修改生产实现又超出本阶段允许范围。

## 恢复前提

后续阶段需先由负责人明确生产 seam 方案，例如把纯 Heartbeat 生命周期编排提取为无进程副作用的生产模块，并由 Worker/Scheduler 调用；该生产变更完成后，重新执行 RED、GREEN、压力和完整套件门禁。本阶段不做该变更。
