# EBOS Weekly Friday Operating Cycle

This runbook defines the local Friday EBOS operating cycle. It is not a system scheduler and does not create cron, Windows Task Scheduler, Docker, Nginx, SSH, migration, seed, external publishing, or backfill apply actions.

## Local Command

```bash
npx tsx scripts/run-ebos-weekly-operating-cycle.ts --date YYYY-MM-DD
```

## Safe Steps

1. Generate validation report.
2. Generate revenue evidence.
3. Generate decision report.
4. Generate weekly report.
5. Generate monthly review.
6. Check external real data status.
7. Check migration safeToRunMigration.
8. Read dirty risk state.
9. Output next week actions.

## Hard Stops

- Do not run Prisma migration.
- Do not run seed.
- Do not run deployment commands.
- Do not use backfill apply unless real data and approval are present.
- Do not create a real scheduler without user confirmation.
