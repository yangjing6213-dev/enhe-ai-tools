# Zero Swap-In Gate Root Cause

## Finding

R2 was contract-correct: its approved gate required `HOST_SWAP_IN_TOTAL=0`, the observed total was 16, and it therefore returned `FAIL_16`. R3 does not alter that result.

The engineering-model defect was treating any nonzero short-window `pswpin` delta as sufficient proof that a bounded same-host RC lacked capacity. That single scalar omitted direction, rate, current swap occupancy, available-memory margin, post-RC headroom, CPU/load margin, fatal-event counts, production health, restart stability, and resource/disk conflicts.

```text
PREVIOUS_PHASE_2C5A_R2_STATUS=COMPLETE_WITH_CAPACITY_REMEDIATION_REQUIRED_PRESERVED
PREVIOUS_R2_CAPACITY_GATE=HOST_SWAP_IN_TOTAL_EQUALS_ZERO
PREVIOUS_R2_CAPACITY_GATE_RESULT=FAIL_16
PREVIOUS_R2_EVIDENCE_MODIFIED=NO
PREVIOUS_R2_CAPACITY_DATA_CHANGED=NO
R2_CAPACITY_GATE_POLICY_SUPERSEDED=YES
R2_RAW_CAPACITY_EVIDENCE_REUSED=YES
ROOT_CAUSE=OVER_BROAD_ZERO_SWAP_IN_ADMISSION_RULE
```

## Corrected decision model

The V2 model requires A through J simultaneously: no swap-out, bounded exact swap-in rates, bounded current swap use, sufficient available-memory ratio and post-RC headroom, CPU/load margin, zero fatal counts, stable healthy production resources, and the original host/disk/inode/port/conflict thresholds.

This correction is deliberately narrow. It changes no Linux setting, host resource, Swap allocation, `swappiness`, R2 file, application source, deployment source, package, lockfile, Prisma model, schema, or migration. It also does not turn the existing sample into a guarantee about future pressure.

## Source and archive anchors

```text
SOURCE_BRANCH=codex/enhe-phase2c5-same-host-rc-audit-r2
SOURCE_HEAD=fa94ac7b394c2cb63838e8456e56c4661efec973
SOURCE_TREE=67252addff00927146f2ebb88c23da2404c4cf81
START_HEAD=fa94ac7b394c2cb63838e8456e56c4661efec973
CAPACITY_AUTHORITY=docs/enhe-redesign/phase-2c5a-r2/capacity-audit-v3-manifest.json
R2_ZIP_STATUS=PASS
R2_ZIP_SIZE=20544
R2_ZIP_SHA256=f5b2822df702bcaa92856e9c99772daa595b4cf844aa0b7f6388fbf950117c46
R2_ZIP_FILE_COUNT=18
R2_ZIP_MARKDOWN_COUNT=17
R2_ZIP_JSON_COUNT=1
R2_ZIP_BAD_CRC=0
R2_ZIP_INVALID_PATH_COUNT=0
R2_ZIP_GIT_FILE_SET_MATCH=YES
R2_ZIP_GIT_FILE_HASH_MATCH=YES
R2_ZIP_GIT_MISMATCH_COUNT=0
R2_CAPACITY_DATA_CHANGED=NO
R2_PROTOCOL_CHANGED=NO
R2_MANIFEST_CHANGED=NO
SSH_INVOCATION_LIMIT=0
SSH_INVOCATION_COUNT=0
NETWORK_ACCESS_COUNT=0
REMOTE_MUTATION_OR_ACCESS=NO
APPLICATION_OR_DEPLOYMENT_SOURCE_CHANGED=NO
RC_OR_PRODUCTION_DEPLOYMENT_STARTED=NO
PUSHED=NO
REMOTE_CHANGED=NO
TAG_CREATED=NO
```
