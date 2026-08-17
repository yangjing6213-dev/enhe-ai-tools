# Phase 2C.3B-R2 Daemon Default Rebuild

## Safety backups

Docker Desktop was stopped before backup and both configuration files passed repeated exclusive-open checks.

```text
DOCKER_VM_DISK_FOUND=YES
DOCKER_VM_DISK_PATH_HASH=b8b748d95cd2933edc32ce6a59fb7f4ef40f58f705c0d148dd22ca75632ee37a
DOCKER_VM_DISK_SIZE=6251610112
DOCKER_VM_DISK_SHA256=0fd690c66f28f23a2ef07304b4d0053fc130aecf1317b8796a7ccd1d31346fcf
DOCKER_VM_DISK_BACKUP_PATH=C:\Users\HU\Desktop\ENHE-Quarantine\docker-desktop-vm-backup-20260817T161545Z
DOCKER_VM_DISK_BACKUP_STATUS=PASS
DOCKER_VM_DISK_BACKUP_HASH_VERIFIED=YES

R2_DOCKER_CONFIG_BACKUP_PATH=C:\Users\HU\Desktop\ENHE-Quarantine\docker-daemon-recovery-r2-20260817T161545Z
R2_DOCKER_CONFIG_BACKUP_STATUS=PASS
R2_DOCKER_CONFIG_BACKUP_FILE_COUNT=2
R2_DOCKER_CONFIG_BACKUP_HASH_VERIFIED=YES
R2_DOCKER_CONFIG_DIRECTORY_ENTRY_COUNT_AFTER_QUARANTINE=3
R2_DOCKER_CONFIG_FILES_READONLY=YES
```

The VM disk was copied as raw bytes without mounting it. Source and backup size and streaming SHA-256 matched. Both previous Phase 2C.3B-R backups remain unchanged.

## Default rebuild attempt

The active all-NUL file was moved, not deleted, to:

`C:\Users\HU\Desktop\ENHE-Quarantine\docker-daemon-recovery-r2-20260817T161545Z\daemon.json.all-nul.quarantined`

Its size remained 124 bytes and SHA-256 remained `7b8ec8dd836b564f0c85ad088fc744de820345204e154bc1503e04e9d6fdd9f1`. The active path was absent before the first start.

Docker Desktop then created a new default configuration file. The generated file is a valid UTF-8 JSON object, contains zero NUL bytes, and retained the prior ACL fingerprint. Its body, field names, and values are intentionally omitted.

```text
CORRUPT_DAEMON_QUARANTINED=YES
ACTIVE_DAEMON_JSON_PRESENT_BEFORE_FIRST_START=NO
DEFAULT_REBUILD_FIRST_ATTEMPT=FAIL_CONTEXT_DEADLINE_EXCEEDED
DAEMON_DEFAULT_CONFIG_FORM=DOCKER_GENERATED_FILE
DAEMON_EMPTY_OBJECT_FALLBACK_USED=NO_CONDITIONS_NOT_MET

ACTIVE_DAEMON_JSON_PRESENT=YES
ACTIVE_DAEMON_JSON_VALID=YES
ACTIVE_DAEMON_JSON_SIZE=124
ACTIVE_DAEMON_JSON_SHA256=27369c832f1be7d067b379f3236a203993e7bec45135e58829a9273c3209f53c
ACTIVE_DAEMON_JSON_NUL_COUNT=0
ACTIVE_DAEMON_JSON_TOP_LEVEL_KEY_COUNT=2
ACTIVE_DAEMON_JSON_SOURCE=DOCKER_GENERATED_FILE
```

## Why no second attempt ran

The first start reached its 180-second deadline without exposing the Linux API. Post-generation checks still found NUL-class log records, WSL/VM-class errors, and other independent errors; no log record established that a missing or empty `daemon.json` was the unique blocker. Therefore the six mandatory fallback conditions were not met. No empty-object file was created and no second start was attempted.

```text
DAEMON_NUL_ERROR_LOG_COUNT_AFTER_RECOVERY=6
DAEMON_PARSE_ERROR_LOG_COUNT_AFTER_RECOVERY=0
SETTINGS_STORE_PARSE_ERROR_LOG_COUNT_AFTER_RECOVERY=0
DAEMON_MISSING_OR_EMPTY_ERROR_LOG_COUNT=0
WSL_OR_VM_ERROR_LOG_COUNT=2
OTHER_INDEPENDENT_ERROR_LOG_COUNT=33
BACKEND_EXIT_ERROR_LOG_COUNT=0

FACTORY_RESET_EXECUTED=NO
DOCKER_DATA_PURGED=NO
WSL_DISTRIBUTION_REMOVED=NO
DOCKER_REINSTALLED=NO
```

The original custom Docker Engine options remain unrecoverable. The generated default file proves only that Docker could create a syntactically valid local configuration; it does not prove the Linux Engine is operational. Before any real Docker deployment, private Registry, proxy, or mirror use, the user must review Docker Engine settings.
