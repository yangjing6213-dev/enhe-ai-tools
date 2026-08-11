# R-008 authoritative integration decision

R008_INTEGRATION_STATUS=BLOCKED_PRODUCTION_BASELINE
R008_CURRENT_REDESIGN_STATIC_ABSENCE=CONFIRMED
R008_LOCAL_MAIN_LOADER_PRESENT=YES
R008_TEST_CONTRACTS_DIVERGENT=YES
R008_ROOT_OR_TEST_FILES_MODIFIED_IN_PHASE_1B0=NO

## Decision

`PASS` is not permitted. This audit has no current production Git SHA, immutable image digest/revision, or route-manifest fingerprint obtained from the running production host. The current redesign branch proves only local static absence. It does not prove which source is running in production.

`BLOCKED_PRODUCTION_BASELINE` is the controlling status because the first mandatory closure condition is missing. Source and test divergence is also confirmed and remains a second blocker. If a later read-only production fingerprint identifies the authoritative source, the status must still remain blocked until that source and its test contract agree.

## Required comparison

| evidence | verified observation | consequence |
|---|---|---|
| Current production fingerprint | Unavailable. The historical operator-entered deployment record reports commit `f3500ddf45a65211b017930b48324659ca1795a6` for 2026-07-05, but it is not a current host fingerprint and contains no immutable image digest, route-manifest hash, migration status, or configuration hashes. | Current production source remains unknown. The historical SHA is provenance only, not closure evidence. |
| Current redesign root layout | `redesign/typeshare-v1` at `ef9465b8c8b5010233f0117f5456bce347d499a4`; `src/app/root-layout-shared.tsx` blob `ed36c974b0416641d379321d8189659b79184a40`. Static scan finds no ByteDance loader, `next/script` loader instance, or `beforeInteractive`. | Confirms local absence only. |
| Local `main` root layout | Local `main` at `33048847b3ff9253b15aee916cb07ba04a31ab4f`; root-layout blob `df5b62df7186ffaae9b00ee2c80c19aa9184d50f`. Static scan finds the loader, `next/script`, and `beforeInteractive`. The existing `origin/main` tracking ref also has a loader-bearing but different root blob. | Confirms source divergence. Local `main` cannot be treated as equivalent to redesign. |
| Historical reported deployment tree | The reported `f3500dd...` tree has root-layout blob `55f9b1a5694caf09a23971c07e22774e95d4335b`, which statically contains the loader, `next/script`, and `beforeInteractive`. | Even the historical deployment candidate does not prove R-008 closure. Its current production relevance is unknown. |
| Old positive test | `main:src/lib/geo-brand-profile-source.test.ts:50-55` positively requires the loader id, `beforeInteractive`, external loader source, and initialization id. | The older baseline enforces presence. |
| New negative test | `src/lib/r008-external-script-source.test.ts:21-26` reads the requested ref or current root source and requires the loader URL and `beforeInteractive` to be absent. | The redesign baseline enforces absence. It is a regression guard, not production proof. |

## Gate logic

The following closure proof is still required:

1. A current, read-only production fingerprint identifies the running Git SHA or immutable image revision/digest and route manifest.
2. That fingerprint maps to an authoritative source tree whose root layout contains no loader.
3. The authoritative tree contains the negative R-008 contract and no contradictory positive contract.
4. The negative contract passes on that authoritative tree.

Until all four conditions are satisfied:

```text
R008_INTEGRATION_STATUS=BLOCKED_PRODUCTION_BASELINE
R008_STATUS=OPEN
```

No root-layout or test source was edited in Phase 1B.0.
