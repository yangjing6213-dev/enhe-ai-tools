# GSC Test Isolation Evidence

## 基线

`src/lib/google-search-console-source.test.ts` 使用 `process.cwd()`，通过 `git ls-files` 获取 tracked 文件，再对约 1,630 个文件执行同步 `readFileSync`。该测试已有单测试例 15 秒局部 timeout；这不是全局配置改动。

基线结果：

- GSC 单独 20 次：20/20
- 正确四文件集合 20 次：20/20
- 初始完整套件指定 seed：可捕获失败，但失败测试名并不恒定为 GSC

## 修复

提交 `7acebac` 只修改该测试：使用 `git grep -I -l --fixed-strings` 直接返回命中文件，再保留扩展名和存在性过滤；退出码 1 被解释为空命中，其他错误继续抛出。原排除 `src/lib/redirect-url.test.ts` 仍然存在。

## GREEN

- GSC 修复后 50/50
- 正确四文件集合修复后 30/30
- 修复后 GSC 单次详细运行 6/6；source-scan 测试体约 0.4 秒

该修复只降低测试自身的同步扫描负载，不改变生产代码或测试框架并发策略。
