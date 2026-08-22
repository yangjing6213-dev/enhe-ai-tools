# Same-Host Capacity Gate V2

## Recomputed gate

Every observed value is derived from the R2 authority JSON. Conditions A through J are conjunctive; all are required.

| ID | Required | Recomputed observed value | Result |
| --- | --- | --- | --- |
| A | Swap-out total `=0` | `0` | PASS |
| B | Exact average swap-in `<=1.0` pages/s | `16/60`, display `0.2666666667` | PASS |
| C | Exact maximum interval swap-in `<=1.0` pages/s | `7/10=0.7` | PASS |
| D | Exact swap-used ratio `<=2500` bps | exact `965.08929571431659157403714088661045690246341813266`; ceiling gate field `966` | PASS |
| E | Exact available-memory minimum ratio `>=5000` bps | exact `7174.4336993968744821893466462134635344395547870356`; floor gate field `7174` | PASS |
| F | Post-RC memory headroom `>=3221225472` bytes | `5781549056-2013265920=3768283136` | PASS |
| G | CPU idle min `>=5000` bps and load5 max `<=2000` milli | `9774`; `330` | PASS |
| H | OOM/filesystem/Docker/kernel fatal 24h all `=0` | `0/0/0/0` | PASS |
| I | Unhealthy/restarting `=0`; resource set unchanged; restart delta `=0` | `0/0/NO/0` | PASS |
| J | Original host, disk, inode, Docker-root, port, and RC-conflict thresholds | CPU `4`; memory `8058544128`; root total `190109507584`; root free `78999416832`; root used `5431`; inode free `8137`; Docker-root free `78999416832`; port free `YES`; project/resource `0/0` | PASS |

```text
SWAP_PRESSURE_GATE_VERSION=2
SWAP_PRESSURE_GATE_V2_CONDITION_COUNT=10
SWAP_PRESSURE_GATE_V2_PASS_COUNT=10
SWAP_PRESSURE_GATE_V2_FAIL_COUNT=0
SWAP_PRESSURE_GATE_V2_STATUS=PASS
MEMORY_PRESSURE_EVIDENCE_STATUS=NO_SUSTAINED_MEMORY_PRESSURE_OBSERVED
SAME_HOST_EPHEMERAL_RC_CAPACITY_STATUS=PASS_CONTEXTUAL_SWAP_PRESSURE_GATE_V2
SAME_HOST_EPHEMERAL_RC_ISOLATION_STATUS=PASS_UNCHANGED
STAGING_DEPLOYMENT_APPROVAL_READY=YES
APPROVAL_PHRASE_STATUS=AVAILABLE
PUBLIC_SURFACE_RELEASE_CANDIDATE_STATUS=PASS_UNCHANGED
```

The status is limited to the existing 60-second sample and 24-hour counters. It does not guarantee future conditions. Fresh pre-start evaluation and the V2 runtime stop/cleanup rules are mandatory.

## Source and archive anchors

```text
SOURCE_BRANCH=codex/enhe-phase2c5-same-host-rc-audit-r2
SOURCE_HEAD=fa94ac7b394c2cb63838e8456e56c4661efec973
SOURCE_TREE=67252addff00927146f2ebb88c23da2404c4cf81
START_HEAD=fa94ac7b394c2cb63838e8456e56c4661efec973
CAPACITY_AUTHORITY=docs/enhe-redesign/phase-2c5a-r2/capacity-audit-v3-manifest.json
HOST_CAPACITY_AUDIT_SHA256=793580d056cee6c1f156bd9de47f2aa2630125270f1e38f68291b5654bb2ca09
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
