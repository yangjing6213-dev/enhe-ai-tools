# 恩禾 ENHE AI工具站独立部署说明

这套部署文件专门用于新项目 `/opt/enhe-ai-tools`。它不会修改 `hot-content-os`，不会改现有 Nginx，也不会占用旧项目正在使用的宿主机端口。

## 端口与容器

旧项目已占用：

- `80`: hot-content-nginx
- `3000`: hot-content-frontend
- `8000`: hot-content-backend
- `5432`: hot-content-postgres
- `6379`: hot-content-redis

新项目固定使用：

- 项目目录：`/opt/enhe-ai-tools`
- App 容器名：`enhe-ai-tools-app`
- DB 容器名：`enhe-ai-tools-db`
- Next.js 容器内部端口：`3000`
- 宿主机测试端口：`3001:3000`
- PostgreSQL：只在 Docker 网络内部 `expose: "5432"`，不映射宿主机 `5432`

新项目不要使用宿主机 `80`、`3000`、`8000`、`5432`、`6379`。

## 准备目录

```bash
sudo mkdir -p /opt/enhe-ai-tools
sudo chown -R $USER:$USER /opt/enhe-ai-tools
```

把项目代码放到 `/opt/enhe-ai-tools` 后，复制环境变量示例即可。不要把 Compose 文件复制到项目根目录，避免误用默认 `docker compose` 影响已有项目：

```bash
cd /opt/enhe-ai-tools
cp deploy/enhe-ai-tools/.env.example ./.env
chmod +x deploy/enhe-ai-tools/scripts/*.sh
```

## 配置环境变量

编辑 `.env`：

```bash
nano /opt/enhe-ai-tools/.env
```

至少修改：

```env
POSTGRES_PASSWORD=换成强密码
AUTH_SECRET=换成长随机字符串
APP_URL=http://服务器IP:3001
NEXT_PUBLIC_APP_URL=http://服务器IP:3001
TENCENT_COS_SIGNED_URL_EXPIRES_SECONDS=600
```

正式绑定 HTTPS 域名后，请把 `APP_URL` 和 `NEXT_PUBLIC_APP_URL` 都改为 `https://你的域名`，这样 canonical、robots 和 sitemap 会输出正式域名。

如果使用腾讯云 COS 保存软件安装包，建议将 COS Bucket 设为私有读，并在后台文件记录中使用 `cos://bucket/key` 作为文件路径。用户下载时系统会先做 VIP / 付费权限校验，再生成短期签名下载链接。

数据库连接在 `docker-compose.yml` 中自动生成，连接到内部容器 `enhe-ai-tools-db:5432`，不会连接宿主机 `5432`。

如需管理员审核通知、健康告警和登录提醒邮件，请配置：

```env
ADMIN_ALERT_EMAILS=huqingwei5942@gmail.com
ADMIN_EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的邮箱
SMTP_PASSWORD=邮箱应用专用密码
SMTP_FROM=恩禾 ENHE AI <你的邮箱>
```

## 启动

推荐使用脚本：

```bash
/opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-start.sh
```

等价命令：

```bash
cd /opt/enhe-ai-tools
docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
```

App 容器启动默认跳过 Prisma migration 和超级管理员 upsert。只有显式设置 `RUN_PRISMA_MIGRATE=1` 时，entrypoint 才会执行：

```bash
npx prisma migrate deploy
```

页面更新、只读报告更新、EBOS 发布包更新不应启用该变量。

顶层 `deploy.sh` 同样默认跳过 migration 和 AI 资讯 seed；只有显式设置 `RUN_PRISMA_MIGRATE=1` 或 `RUN_AI_NEWS_SEED=1` 才会执行对应写入。`ENSURE_SUPER_ADMIN=1` 才会运行超级管理员 upsert。V2 文章发布不得启用这些变量。

## 首次导入演示数据

如果需要默认管理员、演示用户、套餐和示例工具：

```bash
/opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-seed.sh
```

默认账号：

- 管理员和普通用户的种子密码只从部署环境变量读取，仓库不提供默认密码。仅在明确运行种子脚本时设置 `ADMIN_SEED_PASSWORD`、`USER_SEED_PASSWORD` 和 `SUPER_ADMIN_PASSWORD_HASH`。

上线前请修改默认账号密码或删除演示用户。

## 访问测试

浏览器访问：

```text
http://服务器IP:3001
```

健康检查：

```bash
curl http://127.0.0.1:3001/api/health
```

正常响应示例：

```json
{
  "app": "enhe-ai-tools",
  "status": "ok",
  "database": "ok",
  "checkedAt": "2026-05-19T00:00:00.000Z"
}
```

## 上线运维保障

安装每日数据库备份和站点异常告警：

```bash
chmod +x /opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/*.sh
/opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-install-cron.sh
```

默认策略：

- 每天 03:15 备份 PostgreSQL 到 `/opt/enhe-ai-tools/backups/db`，保留 14 天。
- 每 5 分钟检查 `http://127.0.0.1:3001/api/health`，异常时通过 SMTP 发邮件。
- 健康告警 30 分钟内只发送一次，恢复后自动清除告警状态。

也可以手动执行：

```bash
/opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-backup-db.sh
/opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-health-watch.sh
```

## 日志与排查

查看 App 日志：

```bash
/opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-logs.sh app
```

查看数据库日志：

```bash
/opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-logs.sh db
```

查看容器状态：

```bash
cd /opt/enhe-ai-tools
docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps
```

## 端口验收清单

确认新项目只占用宿主机 `3001`：

```bash
ss -lntp | grep -E ':80|:3000|:3001|:8000|:5432|:6379'
```

预期：

- 旧项目仍占用 `80`、`3000`、`8000`、`5432`、`6379`
- 新项目只新增 `3001`
- 不应出现 `enhe-ai-tools-db` 监听宿主机 `5432`

检查 Compose 文件没有宿主机数据库映射：

```bash
grep -n '5432:5432' /opt/enhe-ai-tools/deploy/enhe-ai-tools/docker-compose.yml || echo 'OK: no host postgres port mapping'
```

## 停止新项目

只停止恩禾项目：

```bash
/opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-stop.sh
```

不要执行会影响全局 Docker 的清理命令，例如：

```bash
docker system prune
docker stop $(docker ps -q)
```

## 上传体积限制

后台文件管理用于上传软件安装包，应用侧 Server Action 请求体上限已经配置为 `520mb`，与后台文件上传 `500MB` 的业务限制保持一致。

如果后续把域名接入 Nginx 反向代理，也需要在对应 `server` 配置中加入或调整：

```nginx
client_max_body_size 520m;
```

否则超过 Nginx 默认限制的安装包会在到达 Next.js 应用前被拦截，浏览器可能显示 `Application error` 或上传请求中断。

## 暂不修改 Nginx

当前阶段只支持通过 `http://服务器IP:3001` 测试访问。暂时不要修改现有 Nginx，也不要改 `hot-content-nginx` 配置。
