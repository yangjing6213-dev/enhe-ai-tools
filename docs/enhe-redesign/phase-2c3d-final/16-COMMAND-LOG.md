# Command Log

日期：2026-08-21。命令中的临时数据库凭据未记录。生产起点均为 ac39487ecec451f2ef9408884fa17f8cffdf9ff3；测试内容提交后对应 bd5d194c4d635f2192167bca07379d58457034db。

| 脱敏命令或命令族 | Exit | 关键输出 |
| --- | ---: | --- |
| git branch --show-current；git rev-parse HEAD；git status --porcelain=v1 -uall | 0 | source branch/head 精确匹配且 clean |
| Python streaming ZIP verifier | 0 | size 502018；SHA-256 b7170c...15b37；12 files；bad CRC 0；invalid paths 0 |
| D3 ZIP Markdown set/hash comparator | 0 | set match YES；hash match YES |
| git worktree add -b codex/enhe-motion-final-acceptance-v1 ... ac39487... | 0 | 独立 worktree 创建 |
| npm ci | 0 | 622 packages；既有 warning |
| npx vitest run final source + 3 motion unit files | 0 | 4 files；24/24 PASS |
| npm run lint | 0 | PASS |
| npm run typecheck | 0 | prisma generate + tsc --noEmit PASS |
| npx playwright test final acceptance/performance --list | 0 | 137 cases |
| Playwright 120-case route/width/modality matrix | 0 | 120/120 PASS |
| Playwright SSR targeted | 1 | 2 PASS / 2 FAIL；首页缺 4 产品 ID |
| Playwright software cross geometry targeted | 1 | 0 PASS / 2 FAIL；每路由交叉 1936 px² |
| Docker Desktop start | 0 | 全阶段 1 次；Engine 29.7.2 Linux |
| docker run --rm，loopback random port，tmpfs，postgres:16-alpine | 0 | 单一容器；mounts [] |
| prisma migrate deploy；prisma migrate status | 0 | 49 migrations；schema up to date |
| Docker Build/Standalone/performance/media | 未执行 | blocked upstream |
| docker stop enhe-phase2c3d4-postgres | 0 | --rm 容器删除 |
| docker ps/volume/network boundary checks | 0 | 0 containers；38 volumes；3 networks，集合未变 |
| PowerShell Remove-Item 三个已核验精确临时路径 | 0 | test-results、D3 临时目录、fixture 脚本删除 |
| docker desktop stop；process/port checks | 0 | Docker-owned process 0；3108/3118 listeners 0 |

原始 Playwright test-results 按无条件清理合同删除，未保留为交付物；本表保留脱敏命令、退出状态与关键输出。关键 Git 操作均使用显式路径暂存；未使用 git add .、git add -A、reset --hard、Push、deploy 或 Remote 修改。
