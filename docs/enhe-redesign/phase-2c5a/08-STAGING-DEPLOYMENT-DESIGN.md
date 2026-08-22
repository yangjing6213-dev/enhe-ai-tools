# Recommended Staging Deployment Design

No deployment model was executed in Phase 2C.5A.

## Model comparison

| Rank | Model | Strengths | Principal risks | Phase 2C.5B gate |
| ---: | --- | --- | --- | --- |
| 1 | Immutable image + Staging-only registry | Reproducible digest, clean provenance, simple rollback | Requires isolated registry namespace and credentials | Preferred after target/registry approval |
| 2 | OCI image archive + secure copy | No registry dependency; still digestable | Transfer integrity, custody, and remote import must be proved | Acceptable with archive hash and authorized secure-copy channel |
| 3 | Remote source build | Lowest local artifact handling | Toolchain drift, unknown working tree, source mutation, and weak rollback | Last resort; requires pinned source and hermetic build proof |

```text
RECOMMENDED_DEPLOYMENT_MODEL=IMMUTABLE_IMAGE_STAGING_ONLY_REGISTRY
STAGING_DEPLOYMENT_PLAN_STATUS=DEFINED_NOT_APPROVED
STAGING_DEPLOYMENT_STARTED=NO
```

## Immutable provenance contract

- RC ID: `ENHE-PHASE2C4-PUBLIC-RC1`.
- Runtime source HEAD: `78357d74962276d3036975d2197e9c284eb053b1`.
- Runtime source tree: `5f488a621539ac2b70efa0dbe4797e3be689b4aa`.
- Evidence HEAD: `f99017624fe81b33cd511f36ad17c85dd09cc864`.
- Evidence tree: `815e169ba8bce943deb5e9cf6423c9c4fee2c9a8`.
- Production-source aggregate SHA-256: `959ba31469cee929b70c66f9649d9029ded71f37985e3f0b8258ef1733a1dfab`.
- Package-lock SHA-256: `c61883c10346b28695eea52fbe6fcd8493783d141710aed8245f05398d296ca3`.
- Migration-tree SHA-256: `3e30a6ea9e3210abf97fc377cde1b85afdf8684d1214ac63a9fe6826e804c8dc`.

The image must carry OCI labels for RC ID, runtime HEAD/tree, evidence HEAD/tree, production-source hash, build time, and build-tool versions. Phase 2C.5B may deploy only an immutable digest. `latest`, an unpinned branch, unverified `git pull`, and unknown remote source builds are prohibited.

## Future execution sequence

1. Reverify the RC source and package hashes locally.
2. Build once from the exact runtime source in an isolated build environment.
3. Record image digest and OCI labels; reject any mismatch.
4. Publish only to a Staging-only registry namespace, or export a hashed OCI archive under the approved fallback.
5. Verify the dedicated target identity and production mismatch before connection.
6. Inject Staging-only environment references without printing values.
7. Start the dedicated database/runtime under an isolated Compose project.
8. Run the 49 tracked migrations; do not run production seed.
9. Gate on readiness, health, logs, and the full Smoke contract.
10. Retain the previous digest and database backup until final acceptance.

Any failed identity, digest, migration, health, privacy, or Smoke gate stops execution and invokes the separately authorized rollback policy.
