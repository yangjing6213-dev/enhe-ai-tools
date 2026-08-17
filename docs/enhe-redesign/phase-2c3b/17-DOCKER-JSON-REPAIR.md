# Phase 2C.3B-R Docker JSON Repair

## Authorized scope

The user authorized a byte-preserving backup and removal of consecutive leading `0x00` bytes from exactly these two Docker Desktop user files:

- `C:\Users\HU\AppData\Roaming\Docker\settings-store.json`
- `C:\Users\HU\.docker\daemon.json`

No JSON serialization, default replacement, factory reset, data purge, WSL removal, reinstall, or substitution from another machine was authorized.

## Current-byte prevalidation

Historical Docker Desktop logs named both expected paths after home-path normalization, but the current raw bytes did not support the premise that both files were valid JSON with only a removable leading-NUL run.

| Check | settings-store.json | daemon.json |
| --- | ---: | ---: |
| Before size | 104 bytes | 124 bytes |
| Before SHA-256 | `8c29c1ec87863a4532912351a494fed920800155e7b1771c5773f604fff7a5cc` | `7b8ec8dd836b564f0c85ad088fc744de820345204e154bc1503e04e9d6fdd9f1` |
| Leading NUL count | 0 | 124 |
| Total NUL count | 0 | 124 |
| Internal NUL after trim | 0 | 0 |
| Non-empty after trim | yes | no |
| UTF-8 or UTF-8-SIG decode | pass | pass for the empty byte sequence |
| Cleaned JSON parse | pass | fail |
| Cleaned JSON root | object | unavailable |
| Section 6 result | fail: leading NUL count is not greater than zero | fail: cleaned bytes are empty and not JSON |

No JSON body, key, or value was printed or copied into project documentation.

## Original-byte backup

```text
DOCKER_JSON_BACKUP_PATH=C:\Users\HU\Desktop\ENHE-Quarantine\docker-desktop-json-nul-repair-20260817T154430Z
DOCKER_JSON_BACKUP_STATUS=PASS
DOCKER_JSON_BACKUP_FILE_COUNT=2
DOCKER_JSON_BACKUP_HASH_VERIFIED=YES
BACKUP_DIRECTORY_ENTRY_COUNT=3
BACKUP_FILES_READONLY=YES
MANIFEST_SHA256=8546ac1647209e977baa6b27e1cb65ef4940ac507bae6d9fc240bc03b54bc963
SOURCE_HEAD=9441b13e678d501598ec8122ef3a6aadb46bba43
```

The two `.original` files are byte-identical to their sources. `manifest.json` contains only the authorized metadata fields. ACL owners are recorded in that manifest; the source ACL SDDL fingerprints remained:

```text
SETTINGS_STORE_ACL_SDDL_SHA256=01eec8de31f2142234d9076d570d5035ea02cace6074e0bf090c676ced52ef65
DAEMON_JSON_ACL_SDDL_SHA256=7f353b61a9df116d4ab1c7ac50bf66a0bc2373e47ed48ce0bdcd5eec45852b05
```

The populated backup directory is retained and was not deleted.

## Repair decision

Section 7 was not authorized to run because both files did not pass Section 6. In particular, stripping the 124 leading NUL bytes from `daemon.json` would produce an empty file rather than a JSON object. Replacing it with `{}`, a default configuration, or any inferred content would exceed the authorization.

```text
PHASE_2C_3B_R_STATUS=BLOCKED
REASON=DOCKER_JSON_CORRUPTION_NOT_LIMITED_TO_LEADING_NUL
DOCKER_JSON_REPAIR_STATUS=NOT_RUN_PREVALIDATION_FAILED

SETTINGS_STORE_BEFORE_SIZE=104
SETTINGS_STORE_BEFORE_SHA256=8c29c1ec87863a4532912351a494fed920800155e7b1771c5773f604fff7a5cc
SETTINGS_STORE_LEADING_NUL_COUNT=0
SETTINGS_STORE_INTERNAL_NUL_AFTER_TRIM=0
SETTINGS_STORE_CLEANED_JSON_VALID=YES
SETTINGS_STORE_AFTER_SIZE=104
SETTINGS_STORE_AFTER_SHA256=8c29c1ec87863a4532912351a494fed920800155e7b1771c5773f604fff7a5cc
SETTINGS_STORE_REPAIR=NOT_RUN_PREVALIDATION_FAILED

DAEMON_JSON_BEFORE_SIZE=124
DAEMON_JSON_BEFORE_SHA256=7b8ec8dd836b564f0c85ad088fc744de820345204e154bc1503e04e9d6fdd9f1
DAEMON_JSON_LEADING_NUL_COUNT=124
DAEMON_JSON_INTERNAL_NUL_AFTER_TRIM=0
DAEMON_JSON_CLEANED_JSON_VALID=NO_EMPTY_AFTER_TRIM
DAEMON_JSON_AFTER_SIZE=124
DAEMON_JSON_AFTER_SHA256=7b8ec8dd836b564f0c85ad088fc744de820345204e154bc1503e04e9d6fdd9f1
DAEMON_JSON_REPAIR=NOT_RUN_PREVALIDATION_FAILED

ONLY_LEADING_NUL_REMOVED=NO_REPAIR_EXECUTED
LEGAL_JSON_BYTES_PRESERVED=YES_SOURCE_FILES_UNCHANGED
JSON_CONTENT_PRINTED=NO
JSON_VALUES_CHANGED=NO
FACTORY_RESET_EXECUTED=NO
DOCKER_DATA_PURGED=NO
WSL_DISTRIBUTION_REMOVED=NO
DOCKER_REINSTALLED=NO
```
