# Protocol V3 Schema

```text
ENHE_AUDIT_PROTOCOL_VERSION=3
ENHE_AUDIT_BEGIN=1
AUDIT_COMPLETE=1
ENHE_AUDIT_END=1
PROTOCOL_V3_SCHEMA_STATUS=PASS
PROTOCOL_V3_TYPE_STATUS=PASS
PROTOCOL_V3_CONNECTION_DATA_SCAN_STATUS=PASS
```

Required groups:

| Group | Types |
| --- | --- |
| Audit epochs and completeness | epoch seconds, binary, uint, fixed enums |
| Host identity boundary | `LINUX`, architecture enum, OS/kernel SHA-256 |
| CPU, memory, disk, inode, swap, load, uptime | uint, basis points, load milli-units |
| Docker baseline | numeric version, storage-driver enum, root SHA-256/free bytes |
| Production resources | counts, begin/end/canonical SHA-256, restart totals/delta |
| Six samples | CPU idle bps, memory bytes, load milli, swap counters, normalized production CPU bps, production memory bytes |
| Stability | four uint counters, status enum, explicit counts-valid boolean |
| Port and RC collision | booleans and uint counts |
| Result | PASS/FAIL, fixed failure-stage enum, fixed failure-code enum |

V3 adds begin/end Docker set hashes so the local parser can independently verify `PRODUCTION_RESOURCE_SET_CHANGED_DURING_AUDIT`. It also adds `HOST_STABILITY_COUNTS_VALID`; numeric placeholders are never treated as observed stability evidence unless this flag is true and log status is `PASS_LOGS_READ`.

Capacity shortfall is evaluated locally. The fixed failure-code enum has no capacity-threshold code, so V3 does not falsely label a capacity failure as a parse or command failure.
