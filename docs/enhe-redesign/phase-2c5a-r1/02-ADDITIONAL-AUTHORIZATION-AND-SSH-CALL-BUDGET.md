# Additional Authorization and SSH Call Budget

```text
ADDITIONAL_READ_ONLY_CAPACITY_AUDIT_AUTHORIZED=YES
SSH_INVOCATION_LIMIT=2
SSH_INVOCATION_COUNT=2
SSH_CALL_1_PURPOSE=REMOTE_BASH_SYNTAX_AND_TRANSPORT_PREFLIGHT
SSH_CALL_2_PURPOSE=FULL_READ_ONLY_CAPACITY_AUDIT
SSH_INVOCATION_LIMIT_EXCEEDED=NO
THIRD_SSH_CALL_EXECUTED=NO
RETRY_EXECUTED=NO
SCP_EXECUTED=NO
SFTP_EXECUTED=NO
REMOTE_TEMP_FILE_TRANSFERRED=NO
```

Both calls used one immutable in-memory byte buffer and the same strict connection options. Call 2 ran only after call 1 returned exit 0 with empty stdout and stderr. Call 2 was attempted once and was not retried after exit 2.

The local invoker passed arguments as an array to `subprocess.run`, used `input=script_bytes`, captured stdout/stderr, set `shell=False`, and did not assemble an SSH command through PowerShell quoting.
