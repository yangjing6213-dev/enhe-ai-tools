# EBOS Migration Release Mode

## 1. 为什么需要 Migration Release Mode

Step 21.5 已经把 `prisma migrate deploy` 放到 `RUN_PRISMA_MIGRATE=1` 之后。本文件定义什么时候才允许把这个变量打开，避免 EBOS 页面更新、报告更新、验证页文案更新、Docker 重启或 Nginx reload 意外触发数据库迁移。

本模式只服务真实 schema 变更发布。没有明确 Prisma migration 文件、没有备份证据、没有 rollback 方案、没有专用确认句时，默认保持 migration skipped。

## 2. RUN_PRISMA_MIGRATE 的规则

- 默认值必须是 unset 或 `0`。
- 只有 `RUN_PRISMA_MIGRATE=1` 才允许 entrypoint 执行 `npx prisma migrate deploy`。
- `RUN_PRISMA_MIGRATE=1` 只能用于经过审批的 migration release。
- 本 runbook 不执行 migration，不读取 `.env`，不打印 secret。

## 3. 哪些发布禁止 migration

- EBOS 页面更新。
- 验证页文案更新。
- 报告脚本更新。
- external publishing pack 更新。
- synthetic report 更新。
- 没有 migration 文件的普通发布。
- 只是 Docker 重启。
- 只是 Nginx reload。

## 4. 哪些发布允许 migration

- 本轮有明确 Prisma migration 文件。
- migration 内容已 review。
- 已确认数据库备份。
- 已确认 rollback 策略。
- 用户明确回复专用确认句。
- 生产发布确实需要 schema 变更。

## 5. 专用确认句

专用确认句是：

```text
确认执行数据库迁移
```

以下确认句不授权 migration：

- `确认执行真实部署命令`
- `确认部署验证页`

只有 `确认执行数据库迁移` 才允许进入 migration release mode。

## 6. 备份证据要求

迁移前必须记录真实备份证据，包括备份时间、备份位置、恢复负责人、恢复验证方式。不要记录数据库密码、连接串、token、cookie 或 `.env` 内容。

## 7. 回滚要求

迁移前必须确认应用回滚版本、数据库恢复条件、停止条件、用户影响说明和数据丢失窗口。没有 rollback 方案时，不允许运行 migration。

## 8. 迁移后验证

迁移后至少验证：

- smoke test。
- 登录/session。
- 订单创建。
- 支付路径。
- 产品详情页。
- revenue/admin 相关读路径。

## 9. 风险边界

`prisma migrate deploy` 仍是 high risk command。它需要专用确认句、备份证据、review 记录和 rollback 计划。本阶段只建立 runbook、audit、checklist、报告和测试，不执行真实 migration。

