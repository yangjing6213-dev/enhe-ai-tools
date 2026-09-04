# Production / Staging Manual Schema Check Kit

- reportType: production_staging_manual_schema_check_kit
- targetDate: 2026-07-03
- generatedAt: 2026-07-08T01:14:00+08:00
- readonlyQueryPack: reports/ebos/deployment/prisma-audit/2026-07-03-production-staging-schema-readonly-query-pack.sql
- queryCount: 12
- allQueriesAreSelect: true
- sqlExecuted: false
- secretPrinted: false
- migrationExecuted: false

## Forbidden SQL

- INSERT
- UPDATE
- DELETE
- CREATE
- ALTER
- DROP
- TRUNCATE

## Production Steps

1. Use explicitly authorized production readonly access only.
2. Confirm the environment label is production before running any query.
3. Run only the 12 SELECT statements from the query pack.
4. Record present/missing result for each expected object.
5. Do not print connection string, account, password, host, token, or DATABASE_URL.

## Staging Steps

1. Use explicitly authorized staging readonly access only.
2. Confirm the environment label is staging before running any query.
3. Run the same 12 SELECT statements.
4. Record present/missing result for each expected object.
5. Compare staging with production, but do not treat staging as production proof.

## Result Rules

- already applied: All 12 expected objects are present in the checked environment.
- partially applied: Some expected objects are present and some are missing, or production/staging disagree.
- missing: All expected objects for a migration are missing, or a required base table/enum is missing.

## Migration Release Mode

- A target environment is missing required objects.
- Backup evidence exists.
- Rollback plan exists.
- Dedicated confirmation phrase is supplied: ?????????.
- Migration release runbook names exact migration files.

## Duplicate Cleanup

- Production and staging both already contain all expected objects.
- Files are proven duplicate or accidental artifacts.
- User explicitly approves cleanup.
- Hashes and current status are recorded first.

## Why Migration Cannot Run Now

- productionDbCheck is not performed in this step.
- stagingDbCheck is not performed in this step.
- No production/staging secret was requested or used.
- No backup evidence or rollback plan was supplied for execution.
- The current task is manual kit finalization only.
