# Linux Swap Metric Semantics

## `pswpin`

Linux kernel `pswpin` is a cumulative counter of pages swapped into memory since boot. R2 sampled adjacent counter values and stored the difference for each 10-second interval.

```text
SAMPLE_INTERVAL_SECONDS=10
SAMPLE_COUNT=6
OBSERVATION_WINDOW_SECONDS=60
SWAP_IN_PAGE_DELTAS=0,7,5,3,0,1
HOST_SWAP_IN_TOTAL=16
SWAP_OUT_PAGE_DELTAS=0,0,0,0,0,0
HOST_SWAP_OUT_TOTAL=0
```

The unit is pages, not bytes. No page-size conversion was present in the R2 authority, so R3 does not invent one. `pswpin` is also not:

- current swap usage;
- swap-out activity;
- an OOM or fatal kernel event;
- a production-container health or restart result;
- proof that swapping persisted before or after the 60-second window;
- proof that the bounded RC will be pressure-free in the future.

## Permitted conclusion

The authority shows 16 pages swapped in across six intervals, no pages swapped out, substantial available-memory margin, and zero relevant 24-hour fatal counts. Under the project-specific contextual V2 gate, the permitted conclusion is limited to:

```text
MEMORY_PRESSURE_EVIDENCE_STATUS=NO_SUSTAINED_MEMORY_PRESSURE_OBSERVED
EVIDENCE_WINDOW_LIMITATION=EXISTING_60_SECOND_SAMPLE_AND_24_HOUR_COUNTS_ONLY
FUTURE_NO_PRESSURE_GUARANTEE=NO
```

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
