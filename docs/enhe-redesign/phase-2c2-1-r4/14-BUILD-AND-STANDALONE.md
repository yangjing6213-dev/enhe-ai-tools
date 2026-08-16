# Build 与 standalone

## Build

`npm run build` 在本轮一次性 PostgreSQL 与最终源码上通过，生成 119 个静态页面。唯一非阻塞告警是机器上存在多个 lockfile 导致 Next.js 推断 workspace root；没有编译、类型、路由或数据错误。

`PHASE_2C21R4_BUILD=PASS`

## Standalone 路由

最终 traced standalone 共 13/13 通过：

- 200：`/`、`/en`、`/software`、`/en/software`、`/software?page=2`、`/en/software?page=2`
- 200：`/robots.txt`、`/sitemap.xml`、`/manifest.webmanifest`、`/api/health?scope=app`
- 404：`/redesign-preview/home`、`/redesign-preview/shell`、`/redesign-preview/software`

Standalone 的 60 行正式浏览器矩阵、12 行分数边界矩阵、16 行入口尺寸矩阵与 14 张截图均来自最终 build。

`PHASE_2C21R4_STANDALONE=PASS`

`STANDALONE_CRITICAL_INTERSECTION_COUNT=0`

`STANDALONE_MIN_HORIZONTAL_GAP_PX=12`

`STANDALONE_TEXT_CLIPPING_COUNT=0`

## 失败与纠正历史

第一次 standalone 启动缺少测试进程所需的临时本地认证配置，页面返回 500；补齐仅存在于启动进程内的非生产配置后页面恢复。随后健康检查因缺少本地 worker/release 配置返回 503；改用 `scope=app` 并补齐同类进程级本地配置后，最终 13/13 通过。未读取、创建或修改 `.env`，没有把失败尝试记作 PASS。

## 一次性数据库与清理

- 容器：`enhe-phase2c21r4-b1d17052`
- 绑定：`127.0.0.1:1605`
- 镜像：`postgres:16-alpine`
- migration：49
- 安全 Tool fixture：25；其他业务表无记录
- 无宿主挂载、无命名 volume、未加入项目网络、未运行生产 seed
- standalone、容器与 fixture 已停止/删除；3114、3115、1605 无监听
- Docker volume 数清理前后均为 38

`DISPOSABLE_DB_CONTAINER_REMOVED=YES`

`TEMP_DATABASE_ENV_RESTORED=YES`

`TEMP_FIXTURE_REMOVED=YES`

`PRODUCTION_DATABASE_ACCESSED=NO`

