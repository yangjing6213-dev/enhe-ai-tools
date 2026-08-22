# Remote Bash Syntax Preflight

```text
SSH_CALL_1_PURPOSE=REMOTE_BASH_SYNTAX_AND_TRANSPORT_PREFLIGHT
SSH_CALL_1_REMOTE_COMMAND=BASH_N_EQUIVALENT
SSH_CALL_1_EXIT_CODE=0
SSH_CALL_1_DURATION_MS=1165
SSH_CALL_1_STDOUT_EMPTY=YES
SSH_CALL_1_STDERR_EMPTY=YES
SSH_CALL_1_STDOUT_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
SSH_CALL_1_STDERR_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
STRICT_HOST_KEY_CHECK=PASS
HOST_KEY_MISMATCH=NO
PREFLIGHT_STATUS=PASS
```

The preflight parsed the complete audit script without executing its body. Empty stdout/stderr and exit 0 permitted the single full audit call. This preflight was required because the previous phase retained too little evidence to distinguish transfer/quoting, Bash syntax, SSH transport, and runtime failures.
