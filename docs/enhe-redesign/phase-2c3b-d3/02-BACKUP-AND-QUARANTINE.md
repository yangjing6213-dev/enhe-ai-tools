# Backup and Quarantine

## Stop and process gate

Before the Host mutation, `docker desktop status` could not retrieve a running status and the five authorized Docker-owned process classes had a combined count of `0`.

## Metadata collection note

The first metadata-only attempt stopped before backup because Windows PowerShell 5.1 auto-selected a PowerShell 7 `Microsoft.PowerShell.Security` module from the Codex runtime path. The resulting duplicate TypeData members prevented `Get-Acl` from loading. No source or destination file had been changed: source existed and both destinations were absent.

The root cause was confirmed read-only. Explicitly importing the system Windows PowerShell 5.1 Security module made `Get-Acl`, Owner SID, and SDDL retrieval succeed. The failed attempt record was preserved; the successful retry used a separate attempt record.

## Authorized operation

The successful attempt performed this exact order:

1. Re-resolve the single exact candidate.
2. Reconfirm matching Docker process count `0`.
3. Capture original Owner SID, SDDL, creation time, and modification time without printing them here.
4. Create a separate byte-for-byte backup and apply the source ACL/time metadata to it.
5. Verify backup size and SHA-256.
6. Move, rather than delete, the exact active file to the quarantine directory.
7. Verify source absence, quarantine presence, size, SHA-256, and equality with the backup.
8. Recheck four protected Docker files.

Results:

```text
EXACT_STATE_FILE_BACKUP_STATUS=PASS
EXACT_STATE_FILE_BACKUP_HASH_VERIFIED=YES
EXACT_STATE_FILE_QUARANTINE_STATUS=PASS
EXACT_STATE_FILE_REMOVED_FROM_ACTIVE_PATH=YES
QUARANTINED_FILE_HASH_VERIFIED=YES
QUARANTINED_FILE_CONTENT_CHANGED=NO
PROTECTED_FILE_COUNT=4
PROTECTED_FILES_UNCHANGED_DURING_QUARANTINE=YES
```

The original all-NUL bytes now remain in two separately verified files. They were not edited, deleted, restored, or exposed.
