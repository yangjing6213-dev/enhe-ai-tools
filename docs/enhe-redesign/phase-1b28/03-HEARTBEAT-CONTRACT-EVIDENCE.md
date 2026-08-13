# Heartbeat Core Contract Evidence

`ARCHITECTURE_RED_STATUS=EXPECTED_FAIL`

## RED test

创建的 test-only RED 断言要求生产模块提供 `createHeartbeatRuntime`，并只导入 `runtime-heartbeat.mjs`，没有启动进程、socket 或真实状态文件。

执行：

```text
npm test -- deploy/enhe-ai-tools/scripts/runtime-heartbeat-contract.test.mjs
```

结果：

```text
1 test failed
expected 'undefined' to be 'function'
```

失败发生在 `typeof heartbeat.createHeartbeatRuntime` 断言，原因是生产模块没有该导出，而不是测试环境、网络、端口或文件系统错误。

## 生产导出证据

`deploy/enhe-ai-tools/scripts/runtime-heartbeat.mjs` 只导出：

- `loadRuntimeHeartbeatIdentity`；
- `writeRuntimeHeartbeat`。

Worker 的 Heartbeat 发送逻辑位于 `seo-audit-worker.mjs:113`，其 process/engine 生命周期位于 `:217-276`，顶层 `main` 位于 `:346`。Scheduler 的顶层 `main` 位于 `seo-audit-scheduler.mjs:65`。

## 结论

`CORE_CONTRACT_GREEN_STATUS=BLOCKED`

`CORE_CONTRACT_USES_CHILD_PROCESS=NOT_RUN`

`CORE_CONTRACT_USES_SOCKET=NOT_RUN`

`CORE_CONTRACT_USES_REAL_STATE_FILE=NOT_RUN`

`CORE_CONTRACT_USES_FAKE_CLOCK=NOT_RUN`

本阶段没有修改生产 Runtime Heartbeat，也没有把复制逻辑伪装成生产验证。
