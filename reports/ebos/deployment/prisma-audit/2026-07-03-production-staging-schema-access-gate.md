# Production/Staging Schema Access Gate

- accessDecision: `manual_readonly_query_pack_required`
- productionDbCheck: `not_performed_access_unavailable`
- stagingDbCheck: `not_performed_access_unavailable`
- secretPrinted: `false`
- writeCommandsExecuted: `false`
- migrationExecuted: `false`
- seedExecuted: `false`
- safeToRunMigration: `false`

## Blockers

- No explicitly authorized production/staging readonly database connection is available without secret input.
- productionDbCheck and stagingDbCheck remain unavailable.

## Next Actions

- Run the query pack manually in production and staging readonly sessions.
- Record environment label, query output, and backup evidence before any migration release decision.
