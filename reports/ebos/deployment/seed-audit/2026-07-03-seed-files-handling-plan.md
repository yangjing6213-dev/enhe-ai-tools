# Seed Files Handling Plan

- decision: `quarantine_until_dedicated_seed_review`
- productionSeedAllowed: `false`

## Actions

- Review seed diffs separately.
- Do not run seed in production.
- Require explicit approval before any seed commit.

## Forbidden Actions

- npm run prisma:seed
- tsx prisma/seed.ts
- git add prisma/seed.ts
- git add prisma/seed-lumios.ts
