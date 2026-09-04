# Remaining Dirty Final Decision

- totalDirty: `212`
- stagedCount: `0`
- gitAddExecuted: `false`
- gitCommitExecuted: `false`

## Decision Matrix

|category|fileCount|decision|
|---|---|---|
|package|2|blocked_until_package_audit|
|prisma_migrations|3|blocked_until_migration_release|
|seed|2|quarantine|
|admin_api_core|52|blocked_until_admin_api_core_review|
|unknown|116|quarantine|
|ebos_reports_generated_this_round|24|safe_report_only_commit|

## Next Actions

- Commit EBOS report-only files separately only after final quality gate passes.
- Keep all high-risk dirty files out of report commits.
