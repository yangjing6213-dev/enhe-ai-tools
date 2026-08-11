PRODUCTION_FINGERPRINT_STATUS=COLLECTED
PRODUCTION_GIT_SHA=3497d1709a80b9c5a69d8c1b9eab41af2832f50f
PRODUCTION_GIT_CLEAN=NO
PRODUCTION_GIT_BRANCH=DETACHED_OR_EMPTY
PRODUCTION_IMAGE_ID=sha256:65fc9bedfe6bfd4f800231f3a0193373c0d06d897a88d99edccbbcd6cb7410f5
PRODUCTION_IMAGE_DIGEST=UNKNOWN
PRODUCTION_IMAGE_REVISION=3497d1709a80b9c5a69d8c1b9eab41af2832f50f
PRODUCTION_NEXT_BUILD_ID=BdhxhGCVCJYc9NF968ywC
PRODUCTION_MIGRATION_STATUS=COLLECTED_WITH_1_FAILED_OR_UNFINISHED

# Production fingerprint V3

## Git and runtime image

| field | observed value |
|---|---|
| Git last commit time | `2026-08-03T00:15:31+08:00` |
| host Git state | dirty; diff body was not read or emitted |
| app image created time | `2026-08-03T00:24:35.915158657+08:00` |
| container working directory | `/app` |
| Compose project/service labels | `enhe-ai-tools` / `app` |
| Git/image revision agreement | YES |

The immutable running image revision is the highest-priority authority. Its revision equals the production Git SHA and a locally available commit. A RepoDigest is unavailable, but the image ID, revision, source hashes, config hashes, BUILD_ID, and route fingerprints provide a consistent runtime mapping.

## Tracked configuration hashes

| file | SHA-256 | authoritative commit match |
|---|---|---|
| `package.json` | `611e5c3e501e4e044287abcd7dcd1f41db64312a2756d4cc4308006d765121a2` | YES |
| `package-lock.json` | `48a9aaf72de03e90357998351a463c63f347dd0bfe1fa041a66825a9b36a34a2` | YES |
| `prisma/schema.prisma` | `acf692e986f43cacfe16e3ab22cad30351b5c1645e13e57bd6b2a8f023fd928f` | YES |
| `Dockerfile` | `0f0f097886bdc3d48b5763cb0bd74052248ea0f41b0ab64f4432156348d2ae6d` | YES |
| `deploy/docker-compose.local.yml` | `8bfe8643b50e3b98175062e0b7402cce5302de88e95b84cd8d6a91f60d3aac3a` | YES |
| `deploy/enhe-ai-tools/docker-compose.yml` | `03b8e021812a03d3af26c61dd2b3c98200e08e4ba880f992811ce20b0af422f3` | YES |

## Container discovery

- App: exactly one running container found with `com.docker.compose.service=app`.
- DB: exactly one running container found with `com.docker.compose.service=db`.
- Exact-name fallback was not used.
- No fuzzy `grep … | head -n 1` selection was used.
- Container names are intentionally omitted from the user receipt.

## Migration fingerprint

| field | result |
|---|---|
| `_prisma_migrations` exists | YES |
| total | 50 |
| successful | 49 |
| failed or unfinished | 1 |
| latest migration | `20260727100000_add_seo_audit_schedule_notification_email` |
| latest finished at | `2026-07-31 09:10:00.691659+00` |
| migration-name set SHA-256 | `8a25089966ae3753cd201af321850b948356a973c4d20b465db8d78b38704f90` |

Every migration query used `BEGIN TRANSACTION READ ONLY`. Database credentials and connection strings remained inside the DB container and were not emitted.
