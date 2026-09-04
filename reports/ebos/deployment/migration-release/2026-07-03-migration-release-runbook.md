# EBOS Migration Release Mode Runbook

## 1. 当前结论
- targetDate: 2026-07-03
- 当前只是 runbook，不执行 migration，不运行 Prisma 命令，不打印 secret。
- 页面、文案、报告、外部发布包、synthetic report 更新默认不需要 migration。

## 2. Migration Guard 规则
- migrationGuardVariable: RUN_PRISMA_MIGRATE
- defaultMigrationBehavior: skip_unless_explicit
- explicitEnableValue: 1
- RUN_PRISMA_MIGRATE 不是 1 时，app entrypoint 必须跳过 prisma migrate deploy。

## 3. 什么时候允许 RUN_PRISMA_MIGRATE=1
- 本轮有明确 Prisma migration 文件。
- migration 内容已 review。
- 已确认数据库备份。
- 已确认回滚策略。
- 用户明确回复 migration 专用确认句：确认执行数据库迁移。
- 生产部署确实需要 schema 变更。

## 4. 什么时候禁止运行 migration
- EBOS 页面更新。
- 验证页文案更新。
- 报告脚本更新。
- external publishing pack 更新。
- synthetic report 更新。
- 没有 migration 文件的普通发布。
- 只是 Docker 重启。
- 只是 Nginx reload。

## 5. 专用确认句
- 专用确认句：确认执行数据库迁移
- 确认执行真实部署命令 不等于允许 migration。
- 确认部署验证页 不等于允许 migration。
- 只有 确认执行数据库迁移 才允许进入 migration release mode。

## 6. 迁移前检查清单
- manual_required | Dedicated migration confirmation phrase received | required=true | blockerIfMissing=true | User must reply exactly: 确认执行数据库迁移.
- manual_required | Deployment confirmation phrases are not reused | required=true | blockerIfMissing=true | 确认执行真实部署命令 and 确认部署验证页 do not authorize database migration.
- manual_required | Production release requires a schema change | required=true | blockerIfMissing=true | Migration release mode is allowed only when the production release cannot work without a reviewed schema change.
- manual_required | New Prisma migration file exists | required=true | blockerIfMissing=true | Confirm there is an explicit Prisma migration file for this release.
- manual_required | Migration file reviewed | required=true | blockerIfMissing=true | Review migration SQL and Prisma schema diff before enabling RUN_PRISMA_MIGRATE=1.
- manual_required | Database backup evidence confirmed | required=true | blockerIfMissing=true | Record backup timestamp, location, and restore owner without printing secrets.
- manual_required | No critical table or field deletion confirmed | required=true | blockerIfMissing=true | Confirm the migration does not delete critical payment, order, user, product, or revenue data.
- manual_required | No destructive SQL confirmed | required=true | blockerIfMissing=true | Scan for DROP TABLE, DROP COLUMN, TRUNCATE, DELETE FROM, ALTER TYPE, and DROP INDEX.
- manual_required | Maintenance window confirmed | required=true | blockerIfMissing=true | Confirm a release window and the person responsible for monitoring production.
- manual_required | Rollback strategy confirmed | required=true | blockerIfMissing=true | Document app rollback, data restore criteria, and stop conditions before migration.

## 7. 执行计划
- manual_required | Set RUN_PRISMA_MIGRATE=1 only for the approved migration release | required=true | blockerIfMissing=true | RUN_PRISMA_MIGRATE must remain unset or 0 for EBOS page, copy, report, Docker-only, or Nginx-only releases.
- manual_required | Run only the reviewed migration command | required=true | blockerIfMissing=true | The migration command remains high risk and must be run only after the dedicated approval phrase and backup evidence.
- manual_required | Record migration result without secrets | required=true | blockerIfMissing=true | Record success/failure, migration names, timestamps, and errors. Do not print environment values.

## 8. 迁移后验证
- manual_required | Run post-migration smoke test | required=true | blockerIfMissing=true | Run smoke checks after migration and before marking the release healthy.
- manual_required | Verify orders, payments, login, and product pages | required=true | blockerIfMissing=true | Confirm order creation, payment paths, login/session behavior, product detail pages, and revenue views still work.
- pending | Refresh EBOS reports after verification | required=false | blockerIfMissing=false | Regenerate EBOS weekly/monthly reports only after observed migration and smoke test evidence exists.

## 9. 回滚方案
- manual_required | Application rollback version identified | required=true | blockerIfMissing=true | Identify the previous commit/image that can run against the current or restored database.
- manual_required | Database restore criteria defined | required=true | blockerIfMissing=true | Define when to restore backup, who approves restore, and how restore success is verified.
- manual_required | User impact and data loss window documented | required=true | blockerIfMissing=true | Document the possible data loss window and customer-impact notes before release.

## 10. 风险与阻塞项
- This runbook does not execute migration.
- 确认执行真实部署命令 does not authorize migration.
- 确认部署验证页 does not authorize migration.
- Only 确认执行数据库迁移 allows entering migration release mode.
- Do not print secrets, database URLs, cookies, tokens, or .env contents.

## 11. 下一步操作
- Keep RUN_PRISMA_MIGRATE unset or 0 for page, copy, report, and read-only EBOS releases.
- Before any real migration, generate risk audit and attach backup evidence.
- Ask for the dedicated confirmation phrase only after migration review, backup evidence, and rollback plan are ready.
