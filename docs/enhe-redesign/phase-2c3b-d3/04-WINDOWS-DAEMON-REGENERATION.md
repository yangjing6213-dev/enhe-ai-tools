# Windows Daemon State Regeneration

## Regenerated active form

Docker automatically regenerated the active state file. The regenerated file was checked read-only and was not manually created or copied from quarantine.

```text
WINDOWS_DAEMON_ACTIVE_FORM=DOCKER_REGENERATED_VALID_JSON
REGENERATED_EXISTS=YES
REGENERATED_SIZE=28
REGENERATED_SHA256=eed023822ec34c38a5d03a917c13a5cf7e89b8a568fbe87148090e3ce0753aed
REGENERATED_TOTAL_NUL_COUNT=0
REGENERATED_UTF8_DECODE=PASS
REGENERATED_JSON_PARSE=PASS
REGENERATED_JSON_ROOT=OBJECT
```

The body, field names, values, and full active path are omitted. The original all-NUL artifact remains quarantined with its original SHA-256.

## Other key-file observations

The quarantine operation itself left all four protected fingerprints unchanged. During the subsequent normal Docker runtime start/stop lifecycle, Docker Desktop automatically rewrote `settings-store.json`: its metadata changed from 104 bytes and SHA-256 `8c29c1ec87863a4532912351a494fed920800155e7b1771c5773f604fff7a5cc` to 172 bytes and SHA-256 `7d39ea094a4c214b52089fff2b28565b5231fac8ca1e91aa28fe29f18d1ce166`. The final file remained nonempty, contained zero NUL bytes, decoded successfully, and parsed as a JSON object.

This runtime-authored write is not represented as an unchanged hash:

```text
CODEX_DIRECT_SETTINGS_STORE_MODIFICATION=NO
DOCKER_RUNTIME_SETTINGS_STORE_WRITE_OBSERVED=YES
SETTINGS_STORE_FINAL_VALID_JSON=YES
```

The final read-only fingerprints for `daemon.json`, `settings.dat`, and context metadata matched D2. No second file was quarantined or repaired.
