# 恩禾 ENHE AI工具站

会员制自研电脑软件与在线网页工具平台，技术栈为 Next.js + TypeScript + Tailwind CSS + Prisma + PostgreSQL。

## 项目结构

- `src/app`：前台、用户中心、后台、API 路由
- `src/components`：导航、工具卡片、通用 UI
- `src/lib`：Prisma、认证、会员、订单、权限、设置
- `prisma/schema.prisma`：数据库模型
- `prisma/seed.ts`：演示数据和默认管理员
- `public/images`：默认工具图、收款码占位图
- `docker/nginx.conf`：腾讯云服务器 Nginx 反向代理示例

## 开发计划

1. 初始化项目、Tailwind、Prisma、PostgreSQL、基础 Layout、首页。
2. 用户注册、登录、退出、用户中心、管理员角色。
3. 会员套餐、会员状态判断、会员中心展示。
4. 工具分类、电脑软件工具、在线网页工具、工具列表、工具详情。
5. 工具详情页独立教程模块。
6. 订单创建、唯一订单号、支付页、收款码展示、支付截图提交。
7. 后台支付审核、审核通过自动开通 VIP、审核驳回。
8. 软件下载权限、在线工具使用权限、下载记录、使用记录。
9. 评论区、评论审核、删除。
10. Docker、Nginx、腾讯云部署配置。

## 本地运行

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Docker 部署

```bash
docker compose -f deploy/docker-compose.local.yml up -d --build
docker compose -f deploy/docker-compose.local.yml exec app npx prisma migrate deploy
docker compose -f deploy/docker-compose.local.yml exec app npx prisma db seed
```

腾讯云部署时建议：

- 使用云服务器安全组开放 80/443。
- PostgreSQL 可使用同机容器或腾讯云数据库。
- 上传文件支持本地落盘或腾讯云 COS。COS 文件可使用 `cos://bucket/key` 作为文件路径，下载时由服务端生成短期签名 URL，签名有效期通过 `TENCENT_COS_SIGNED_URL_EXPIRES_SECONDS` 配置。
- 将 `docker/nginx.conf` 放入 Nginx 配置，反代到 `app:3000` 或服务器本机 `127.0.0.1:3000`。
- 根目录不再放置 `docker-compose.yml`，避免服务器在项目根目录误执行默认 Compose。腾讯云独立部署请使用 `deploy/enhe-ai-tools/docker-compose.yml`。

## 权限说明

下载软件与在线工具使用入口都经过 `src/app/api/tools/[id]/*` 路由，路由内调用 `assertToolAccess` 在服务端校验登录、发布状态和 VIP 状态，不依赖前端隐藏按钮。
