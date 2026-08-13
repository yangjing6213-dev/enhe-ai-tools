# Other Timeout Tests Review

## 附件规定的四文件

- `scripts/publish-ai-trend-briefing-html.test.ts`：创建独立临时目录，并通过 `execFile` 启动 `tsx` 子进程，子进程 timeout 为 10 秒。
- `src/lib/ai-news-translation-action.test.ts`：使用 Vitest mock，`beforeEach` 对 mock reset；测试动态 import action，没有发现 fake timer、fetch mock 或固定临时路径。
- `src/lib/schema-entity-reference.test.ts`：使用 `process.cwd()` 读取源码并动态 import 页面模块；没有写临时文件、env、fetch 或 timer 操作。
- `src/lib/google-search-console-source.test.ts`：原有逐文件同步 source scan 是本阶段唯一已修改项。

上述四文件修复后集合 30/30 通过，未发现需要同时修改四个文件的共享 test-only 根因。

## 额外失败测试

Heartbeat 测试使用 child process、临时目录、HTTP server、`Promise.race`、2 秒状态轮询和 15 秒局部 timeout；单独运行 20 次为 19/20。完整套件中还观察到公共内容数据库 fallback、公共新闻分页等测试 5 秒 timeout。

这些文件不在附件允许修改的四个稳定性文件中。修改它们或全局配置会扩大范围，故本阶段没有这样做。
