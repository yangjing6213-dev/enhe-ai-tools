# R2 Capacity Evidence Baseline

## Authority and preservation

The only numeric authority for this R3 capacity decision is:

```text
CAPACITY_AUTHORITY=docs/enhe-redesign/phase-2c5a-r2/capacity-audit-v3-manifest.json
HOST_CAPACITY_AUDIT_SHA256=793580d056cee6c1f156bd9de47f2aa2630125270f1e38f68291b5654bb2ca09
R2_CAPACITY_DATA_CHANGED=NO
R2_PROTOCOL_CHANGED=NO
R2_MANIFEST_CHANGED=NO
R2_RAW_CAPACITY_EVIDENCE_REUSED=YES
```

No value from chat was used as a capacity input. R2 evidence remains byte-for-byte outside this R3 directory and its historical conclusion remains preserved:

```text
PREVIOUS_PHASE_2C5A_R2_STATUS=COMPLETE_WITH_CAPACITY_REMEDIATION_REQUIRED_PRESERVED
PREVIOUS_R2_CAPACITY_GATE=HOST_SWAP_IN_TOTAL_EQUALS_ZERO
PREVIOUS_R2_CAPACITY_GATE_RESULT=FAIL_16
PREVIOUS_R2_EVIDENCE_MODIFIED=NO
PREVIOUS_R2_CAPACITY_DATA_CHANGED=NO
R2_CAPACITY_GATE_POLICY_SUPERSEDED=YES
```

## Observed authority values

| Field | Value |
| --- | ---: |
| Host CPU cores | 4 |
| Host memory total bytes | 8058544128 |
| Host memory available minimum bytes | 5781549056 |
| Host CPU idle minimum bps | 9774 |
| Host load5 maximum milli | 330 |
| Host swap total bytes | 2084564992 |
| Host swap used bytes | 201179136 |
| Host swap-in total pages | 16 |
| Host swap-out total pages | 0 |
| Root total bytes | 190109507584 |
| Root free bytes | 78999416832 |
| Root used bps | 5431 |
| Root inode free bps | 8137 |
| Docker-root free bytes | 78999416832 |
| Unhealthy containers | 0 |
| Restarting containers | 0 |
| Resource set changed during audit | NO |
| Restart count delta | 0 |
| OOM events over 24h | 0 |
| Filesystem errors over 24h | 0 |
| Docker fatal events over 24h | 0 |
| Kernel fatal events over 24h | 0 |
| Loopback port 3101 free | YES |
| Existing ephemeral RC project count | 0 |
| Existing RC resource count | 0 |

The six adjacent 10-second deltas are:

| Interval | Swap in pages | Swap out pages |
| ---: | ---: | ---: |
| 1 | 0 | 0 |
| 2 | 7 | 0 |
| 3 | 5 | 0 |
| 4 | 3 | 0 |
| 5 | 0 | 0 |
| 6 | 1 | 0 |

## R2 archive receipt

```text
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
```

## Source and operation anchors

```text
SOURCE_BRANCH=codex/enhe-phase2c5-same-host-rc-audit-r2
SOURCE_HEAD=fa94ac7b394c2cb63838e8456e56c4661efec973
SOURCE_TREE=67252addff00927146f2ebb88c23da2404c4cf81
START_HEAD=fa94ac7b394c2cb63838e8456e56c4661efec973
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
