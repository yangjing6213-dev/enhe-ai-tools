PHASE_1B_2_1_STATUS=BLOCKED
REASON=PRISMA_GENERATE_MODIFIED_TRACKED_SOURCE

PRISMA_ROOT_CAUSE=GENERATE_NOT_RUN_BEFORE_TYPECHECK
PRISMA_ROOT_CAUSE=POSTINSTALL_NOT_DEFINED

# Prisma Client bootstrap diagnosis

## Verified project contract

| item | observed value |
|---|---|
| locked `prisma` version | `6.19.3` |
| locked `@prisma/client` version | `6.19.3` |
| generator provider | `prisma-client-js` |
| generator output | not configured; Prisma default |
| generator binary targets | not configured; Prisma default |
| generator preview features | not configured |
| datasource provider | `postgresql` |
| datasource environment names | `DATABASE_URL` only; value not read |
| npm `ignore-scripts` | `false` |
| root `postinstall` | not defined |
| root `prepare` | not defined |
| root `prebuild` | not defined |
| `typecheck` | `tsc --noEmit`; no generate step |
| `build` | includes `prisma generate` before `next build` |
| project bootstrap script | `npm run prisma:generate` |

The project script is:

```text
node --import tsx scripts/build-ai-news-topic-seed.mjs && prisma generate
```

The root project has no lifecycle script that guarantees this command runs after `npm ci`. The installed `@prisma/client` dependency has its own postinstall hook, but the retained install result proves that hook did not leave a schema-derived Client. The historical reason that dependency hook did not persist a generated Client is not recoverable from the current npm logs, so this report does not claim that lifecycle scripts were disabled or that datasource configuration caused the earlier result.

## Client before bootstrap

| evidence | value |
|---|---|
| `.prisma/client/index.d.ts` | exists; 3,989 bytes; SHA-256 `71DF692065D79C5B044002F8A68EBA33E934859859094BAB2F334F64A467F428` |
| `.prisma/client/default.d.ts` | exists; 3,989 bytes; same SHA-256 |
| `InputJsonValue` | absent |
| `NewsArticleGetPayload` | absent |
| `Order` | absent |
| `PrismaClient` | present |

This is the generic Prisma stub, not a Client generated from the repository schema.

## Bootstrap result

`npm run prisma:generate` completed with exit code 0. Prisma reported Client `6.19.3` generated in 524 ms. No temporary datasource environment value was used, and no database command or connection was made.

| evidence | before | after |
|---|---:|---:|
| `.prisma/client/index.d.ts` size | 3,989 | 4,901,221 |
| `.prisma/client/index.d.ts` SHA-256 | `71DF692065D79C5B044002F8A68EBA33E934859859094BAB2F334F64A467F428` | `DADF54B00ED6C6804DC84A548500ADD248096AFAE2CD31C9092487F95851D804` |
| `InputJsonValue` | NO | YES |
| `NewsArticleGetPayload` | NO | YES |
| `Order` | NO | YES |
| `PrismaClient` | YES | YES |

The hypothesis that an explicit local generate step restores the project model types is supported. Typecheck was not run afterward because the same project script crossed the tracked-source safety boundary.

## Forbidden tracked side effect

Before the command, `prisma/seed-ai-news-topics-data.cjs` was 29,053 bytes with SHA-256 `A411D35E0A84151E9BEF95555C4B3E8E24B45084F780B1B37F4653919CE196BB`.

After the command, it was 28,393 bytes with SHA-256 `1F8B1EBB218C54E39495FB8A65D0B1D5EDE216EC7A3A0B460399C8B6C89FE1AC`, and Git reported:

```text
 M prisma/seed-ai-news-topics-data.cjs
```

The normalized Git diff contained no content hunk, which is consistent with a serialization or line-ending-only rewrite, but the changed raw size, changed SHA-256, and porcelain status prove a tracked working-tree mutation. The Phase 1B.2.1 contract requires an immediate stop for any such mutation. The file was not restored, deleted, staged, or committed.

## Classification

- `GENERATE_NOT_RUN_BEFORE_TYPECHECK`: verified. The direct typecheck command has no bootstrap step.
- `POSTINSTALL_NOT_DEFINED`: verified for the root project.
- `POSTINSTALL_PRESENT_BUT_SCRIPTS_DISABLED`: rejected; current npm configuration reports `false` for `ignore-scripts`.
- `DATASOURCE_ENV_REQUIRED_FOR_GENERATE`: rejected; direct generate succeeded with no datasource environment value.
- `CUSTOM_GENERATOR_OUTPUT_NOT_BOOTSTRAPPED`: rejected; generator output is not customized.

The authoritative lint, focused tests, full tests, typecheck-after-generate, and build were not run after this safety failure. No conclusion about their pass/fail state is permitted from this run.
