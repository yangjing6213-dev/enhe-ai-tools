# Remote Protocol V3 Preflight

```text
SSH_INVOCATION_LIMIT=2
SSH_INVOCATION_COUNT=2
SSH_CALL_1_PURPOSE=REMOTE_PROTOCOL_V3_BASH_SYNTAX_PREFLIGHT
SSH_CALL_1_EXIT_CODE=0
SSH_CALL_1_DURATION_MS=1209
SSH_CALL_1_STDOUT_EMPTY=YES
SSH_CALL_1_STDERR_EMPTY=YES
SSH_CALL_1_STDOUT_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
SSH_CALL_1_STDERR_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
STRICT_HOST_KEY_CHECK=PASS
HOST_KEY_MISMATCH=NO
REMOTE_AUDIT_V3_SCRIPT_SHA256=c570b56d2998e44abcc72291aef4b12942bb56662c72d6f8e382f9ea93b80a7f
SAME_SCRIPT_BYTES_BOTH_CALLS=YES
```

Call 1 sent the complete Bash bytes through SSH stdin to remote `bash -n`. It did not execute the script body. Exit 0 plus empty stdout and stderr authorized call 2.

Both calls used BatchMode, IdentitiesOnly, strict Host Key checking, 10-second connect timeout, 15-second keepalive, two missed-keepalive limit, password and interactive authentication disabled, and forwarding disabled. No target, account, port tuple, or Identity path is retained.
