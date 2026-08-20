# Preserved State Quarantine

All twelve D3 history documents were read in full. D3 remains an immutable
BLOCKED record; D3R only closes its downstream container gate.

## Original artifact

The retained backup and quarantine copies were independently re-read before
Docker start and after final Docker stop. Both still matched the D3 identity:

```text
D3_QUARANTINED_FILE_PRESENT=YES
D3_QUARANTINED_FILE_SIZE=28
D3_QUARANTINED_FILE_SHA256=3addfb141cd7c9c4c6543a82191a3707ac29c7a041217782e61d4d91c691aee8
D3_QUARANTINED_FILE_ALL_ZERO=YES
D3_QUARANTINED_FILE_NUL_COUNT=28
D3_QUARANTINED_FILE_HASH_VERIFIED=YES
D3_QUARANTINED_FILE_CONTENT_CHANGED=NO
D3_ORIGINAL_COPY_HASH_VERIFIED=YES
STATE_FILE_QUARANTINE_PRESERVED=YES
STATE_FILE_QUARANTINE_ACTION_THIS_RUN=NONE
STATE_FILE_REPAIR_ACTION_THIS_RUN=NONE
```

No second candidate was selected. The quarantined file was not copied back,
renamed, edited, deleted, re-backed-up, or replaced.

## Active and protected state

The active basename was uniquely resolved by the existing lower-cased path
hash. Its body, path, keys, and values were not printed.

```text
ACTIVE_BASENAME_CANDIDATE_COUNT=1
ACTIVE_PATH_HASH_MATCH_COUNT=1
WINDOWS_DAEMON_ACTIVE_FORM=VALID_DOCKER_REGENERATED_FILE
WINDOWS_DAEMON_ACTIVE_SIZE=28
WINDOWS_DAEMON_ACTIVE_SHA256=eed023822ec34c38a5d03a917c13a5cf7e89b8a568fbe87148090e3ce0753aed
WINDOWS_DAEMON_ACTIVE_JSON_VALID=YES
WINDOWS_DAEMON_ACTIVE_NUL_COUNT=0
```

The four protected objects matched the D3 final fingerprints before start and
again after final stop:

```text
SETTINGS_DAT_CHANGED_THIS_RUN=NO
DAEMON_JSON_CHANGED_THIS_RUN=NO
SETTINGS_STORE_CHANGED_THIS_RUN=NO
CONTEXT_METADATA_CHANGED_THIS_RUN=NO
```

`settings.dat` was fingerprinted read-only and was not treated as JSON or as a
recovery candidate. No Docker configuration object was directly modified.
