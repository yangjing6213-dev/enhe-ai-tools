# Remote Audit Protocol V2

## Locked protocol

- Bash shebang, `set -u`, `set -o pipefail`, and `LC_ALL=C`.
- No global errexit.
- No remote file, directory, or temporary-file creation.
- No Docker mutation, database command, interactive sudo, deployment, build, migration, seed, Compose, or Nginx command.
- Output restricted to structured key/value records.
- Container, Volume, Network, and Docker-root identifiers normalized and hashed in remote memory before output.
- One CPU baseline followed by six sequential ten-second samples.
- Begin/end Docker resource fingerprints and restart totals.
- Current-user journal query, with only noninteractive read-only journal fallback.

## Actual disposition

```text
REMOTE_AUDIT_SCRIPT_SHA256=38abd13ca34a57ba853024369e72ae4ea460f68a25c9844d1bb88b80b8a26243
LOCAL_SSH_INVOKER_SHA256=7c5b99b28b43770203eab7e4804efdcb33408752738a9cea30193c847e18a4d6
SSH_CALL_1_SCRIPT_SHA256=38abd13ca34a57ba853024369e72ae4ea460f68a25c9844d1bb88b80b8a26243
SSH_CALL_2_SCRIPT_SHA256=38abd13ca34a57ba853024369e72ae4ea460f68a25c9844d1bb88b80b8a26243
SAME_SCRIPT_BYTES_BOTH_CALLS=YES
AUDIT_PROTOCOL_VERSION=NOT_ACCEPTED_AUDIT_OUTPUT_REJECTED
AUDIT_COMPLETE=NOT_ACCEPTED_AUDIT_OUTPUT_REJECTED
AUDIT_CORE_METRICS_COMPLETE=NOT_ACCEPTED_AUDIT_OUTPUT_REJECTED
AUDIT_SAMPLE_COUNT=NOT_ACCEPTED_AUDIT_OUTPUT_REJECTED
```

Call 1 proves remote Bash syntax acceptance for these exact bytes. Call 2 returned exit 2. Because its stdout was rejected before protocol parsing, no protocol marker or metric is accepted, even though stdout was non-empty.
