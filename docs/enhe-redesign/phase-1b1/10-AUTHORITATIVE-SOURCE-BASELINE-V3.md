AUTHORITATIVE_SOURCE_BASELINE=CONFIRMED_WITH_RUNTIME_IMAGE
AUTHORITATIVE_BASELINE_SHA=3497d1709a80b9c5a69d8c1b9eab41af2832f50f
AUTHORITATIVE_LOCAL_REF=codex/product-payment-image-skill-release-20260802
PRODUCTION_RUNTIME_IMAGE_ID=sha256:65fc9bedfe6bfd4f800231f3a0193373c0d06d897a88d99edccbbcd6cb7410f5
PRODUCTION_HOST_GIT_CLEAN=NO
MISSING_SOURCE_RECOVERY_SOURCE=3497d1709a80b9c5a69d8c1b9eab41af2832f50f

# Authoritative source baseline V3

## Confirmation chain

1. The running app image OCI revision is `3497d1709a80b9c5a69d8c1b9eab41af2832f50f`.
2. The production project Git HEAD reports the same SHA.
3. That commit exists locally and is the exact tip of `codex/product-payment-image-skill-release-20260802`.
4. All six required production source-file hashes match the local commit byte-for-byte.
5. Production `package.json`, lockfile, Prisma schema, Dockerfile, and both tracked Compose files also match that commit.
6. The running BUILD_ID and route-manifest hashes were collected independently.

The host worktree is dirty, so it is not itself a safe integration workspace. The running image and exact local commit provide the authority without copying any host or dirty-worktree file.

## Candidate comparison

| candidate | required source matches | conclusion |
|---|---:|---|
| current redesign `a4bfb51...` | 0/6 exact, 3/6 present | incomplete and not authoritative |
| local `main` `33048847...` | 4/6 exact, 6/6 present | source candidate only; not the exact runtime source |
| local `feature/enhe-api-gateway` | 0/6 exact, 3/6 present | incomplete and not authoritative |
| historical `f3500ddf...` | 3/6 exact, 4/6 present | historical only |
| production/runtime `3497d170...` | 6/6 exact | authoritative |

Existing local refs with the same six source variants include `origin/main` and other refs, but only the exact production commit is selected as the clean integration base.

## Formerly missing source items

| item | authoritative state | recovery source |
|---|---|---|
| `src/components/product-video-player.tsx` | present, clean tracked, production/local hash match | authoritative SHA |
| `src/lib/tool-category-groups.ts` | present, clean tracked, production/local hash match | authoritative SHA |
| `normalizeMediaSrc` in `src/lib/media.ts` | definition-bearing file present, clean tracked, production/local hash match | authoritative SHA |
| `skills/ebos/skill-registry.json` | present, clean tracked, production/local hash match | authoritative SHA |

The dirty original worktree and ad hoc file copies are explicitly rejected as recovery sources.
