# Seed Files Separate Audit

- seedExecuted: `false`
- productionSeedAllowed: `false`
- touchesRealUsers: `true`
- touchesRealOrders: `true`
- touchesRealRevenue: `true`
- secretReferenceDetected: `true`

## Files

|path|riskLevel|recommendation|
|---|---|---|
|prisma/seed.ts|high|quarantine_or_separate_seed_audit_required|
|prisma/seed-lumios.ts|high|quarantine_or_separate_seed_audit_required|
