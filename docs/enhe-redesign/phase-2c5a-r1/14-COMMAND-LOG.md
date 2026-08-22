# Command Log

| Step | Sanitized operation | Result |
| ---: | --- | --- |
| 1 | Verify source branch, HEAD, tree, clean state, and required history | PASS |
| 2 | Stream-hash and extract/compare the previous result ZIP in a validated system-temp directory | PASS; temporary extraction deleted |
| 3 | Read committed previous-exit evidence and classify retained root-cause boundary | `UNRESOLVED_INSUFFICIENT_RETAINED_EVIDENCE` |
| 4 | Verify R1 worktree/branch absence and create the isolated worktree at the locked start commit | PASS |
| 5 | Statically parse the tracked connection contract and existing resolver literals | Candidate count 1; fingerprint unchanged; Identity file exists; body not read |
| 6 | Build temporary Bash/Python files and validate UTF-8, LF, no BOM, Bash/Python syntax, protocol parser, capacity mapping, and static prohibited operations | PASS |
| 7 | Offline specification review, correct three blockers, then offline code-quality review | Final review PASS |
| 8 | SSH call 1: remote Bash syntax/transport preflight using complete stdin bytes | exit 0; empty stdout/stderr |
| 9 | SSH call 2: one full read-only audit using the same stdin bytes | exit 2; stderr empty; stdout rejected by forbidden-data scanner |
| 10 | Delete both local temporary execution files | PASS |

## SSH receipts

```text
SSH_INVOCATION_LIMIT=2
SSH_INVOCATION_COUNT=2
SSH_CALL_1_EXIT_CODE=0
SSH_CALL_1_DURATION_MS=1165
SSH_CALL_1_STDOUT_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
SSH_CALL_1_STDERR_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
SSH_CALL_2_EXIT_CODE=2
SSH_CALL_2_DURATION_MS=89090
SSH_CALL_2_STDOUT_SHA256=91f404dc52c06efdda7cbad3c2117894d7bfd900a712c3a66ad2a837b4e137a9
SSH_CALL_2_STDERR_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
SSH_CALL_2_STDERR_CATEGORY=REMOTE_COMMAND_NONZERO
SSH_CALL_2_FORBIDDEN_OUTPUT_FINDING=KNOWN_CONNECTION_VALUE
RAW_SSH_OUTPUT_WRITTEN_TO_GIT=NO
RAW_SSH_OUTPUT_RETAINED=NO
THIRD_SSH_CALL_EXECUTED=NO
```

Local command-compatibility failures before SSH included a PowerShell/RTK tree-expression rewrite, an unavailable hashing cmdlet, a missing WSL Bash target, and an initial empty-key resolver assumption. Each was corrected locally through non-network alternatives and consumed no SSH call.
