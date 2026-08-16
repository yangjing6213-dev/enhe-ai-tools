# 命令与门禁日志

以下只记录命令类别、公开本地路径和结果，不记录连接字符串、认证值或 secret。

| 阶段 | 命令 / 检查 | 结果 |
| --- | --- | --- |
| 来源 | `git branch --show-current`、`rev-parse`、status/index/log | 指定来源分支与 HEAD，clean |
| R3 | manifest 元数据/大小/SHA-256；ZIP size/hash/list/CRC | PASS；19 文件；CRC 0 |
| worktree | `git worktree add -b codex/enhe-support-exclusion-v1 ... f3a1f7a` | 新隔离 worktree |
| 数据库 | 唯一 `postgres:16-alpine`、49 migration、25 Tool fixture | PASS；无生产连接/seed |
| RED | Playwright 结构性碰撞三次 | 3/3 按预期失败；交叉 19px |
| 宽度 | 正式入口尺寸矩阵 | 16 条；最大 95.546875px |
| 文字模拟 | `mobile-support-r4-harness.mjs --mode simulate-text-scan` | 46,080 条；2 轮；失败 0；安全起点 481 |
| 生产全宽 | R4 harness full-width production | 16,440 条；失败 0；最小相关间距 12 |
| 全部产品 | R4 all-products matrix | 500 条；失败 0 |
| rail | R4 rail matrix | 126 条；失败 0 |
| 压力 | R4 stress，20 轮 | 20/20；360 条；失败 0 |
| 定向测试 | 4 个 Vitest 文件；Phase R4 Playwright | 23/23；15/15 |
| 安装 | `npm ci` | PASS；622 packages；仅弃用告警 |
| 静态 | `npm run lint`、`npm run typecheck` | PASS / PASS |
| 完整测试 | 默认两次；shuffle seed 21101 一次 | 2/2；1/1；每次 2,213 passed |
| build | `npm run build` | PASS；119 静态页面 |
| standalone | 13 个路由状态 + 60 行浏览器矩阵 | 13/13；60/60 |
| 截图 | 双语 fullPage 320/390/483/484/768/1440 | 14/14 人工复核 |
| Git | 精确 `git add -- <14 paths>`；首个 commit | `4662af4a...` |
| 清理 | Ctrl-C standalone；停止 `--rm` DB；端口/volume 检查 | 容器无残留；volume 38；端口无监听 |

## 保留的非最终失败

1. 源级 TDD 两轮 4/5 RED。
2. 第一次阈值扫描未强制文字模式，证据无效并废弃。
3. 第一轮完整测试有 2 个旧断点字符串断言失败。
4. 较早 shuffle 有一个无关 5 秒 timeout；定向、20 次重复与同 seed 完整重跑通过。
5. 第一次 standalone 页面因缺少进程级本地配置为 500；随后 health 为 503；修正仅当前进程配置后最终 13/13。
6. 一次只读汇总误把单轴 intersection 当二维碰撞，发现与 `pass=true` 矛盾后按水平与垂直同时交叉的正确口径重算。

没有用这些中间失败的产物支持最终 PASS。

