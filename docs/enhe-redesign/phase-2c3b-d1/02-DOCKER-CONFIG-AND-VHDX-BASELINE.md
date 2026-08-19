# Docker Config and VHDX Baseline

No configuration body, key, or value was copied into this document or the evidence manifest.

## Docker configuration

| File | Size | JSON object | NUL count | SHA-256 |
|---|---:|---:|---:|---|
| settings store | 104 bytes | yes | 0 | `8c29c1ec87863a4532912351a494fed920800155e7b1771c5773f604fff7a5cc` |
| daemon configuration | 124 bytes | yes | 0 | `27369c832f1be7d067b379f3236a203993e7bec45135e58829a9273c3209f53c` |

- `DOCKER_CONFIG_VALID_BEFORE_DIAGNOSIS=YES`
- `DAEMON_JSON_VALID_BEFORE_DIAGNOSIS=YES`
- `DAEMON_JSON_SHA_MATCH=YES`

Python 3.14 streaming SHA-256 was used. No ACL, timestamp, serialization, or file content was changed.

## Docker VM disk

| Item | Source | R2 backup |
|---|---|---|
| Path SHA-256 | `b8b748d95cd2933edc32ce6a59fb7f4ef40f58f705c0d148dd22ca75632ee37a` | `121115fde3134d033d8dced8c5e81b2edf8998416b99cf3f08b8bd93110325c8` |
| File size | 6,251,610,112 bytes | 6,251,610,112 bytes |
| SHA-256 | `0fd690c66f28f23a2ef07304b4d0053fc130aecf1317b8796a7ccd1d31346fcf` | same |
| Attributes | Archive | ReadOnly, Archive |
| Compressed / encrypted / sparse | no / no / no | no / no / no |

- Source free space at baseline: 32,307,695,616 bytes.
- ACL owner query: `ACCESS_DENIED`; ACL was not changed.
- `Get-VHD`: `NOT_AVAILABLE`; no mount or repair was attempted.
- `VM_DISK_BACKUP_STILL_VALID=YES`

Python streaming rechecks after Attempt 1 and after final shutdown produced the same configuration and VHDX hashes. Therefore:

- `DOCKER_CONFIG_CHANGED=NO`
- `WSL_CONFIG_CHANGED=NO`
- `VHDX_CHANGED=NO`
