# Command Log

| Step | Sanitized operation | Result |
| ---: | --- | --- |
| 1 | Verify R1 branch, HEAD, tree, clean state, and required history | PASS |
| 2 | Stream-hash R1 ZIP; verify CRC, paths, file set, and each Git blob hash | PASS |
| 3 | Create isolated R2 worktree at locked R1 commit | PASS |
| 4 | Read required R1 evidence and preserve unresolved rejection boundary | PASS |
| 5 | Parse tracked connection source in memory; verify one unchanged candidate and Identity file existence without reading its body | PASS |
| 6 | Build temporary V3 Bash, Python parser/invoker, and tests outside Git | PASS |
| 7 | Run safe/malicious fixtures, 100 numeric fixtures, capacity/failure mapping, schema-key equality, Python compile, static prohibited-operation scan, and local Bash syntax/runtime checks | PASS |
| 8 | Independent Critical/Important review | PASS; 0 Critical, 0 Important |
| 9 | SSH call 1: complete-script stdin to remote Bash syntax preflight | exit 0; stdout/stderr empty |
| 10 | SSH call 2: same script bytes, one full read-only audit | exit 0; stderr empty; stdout accepted |
| 11 | Normalize and hash Parsed JSON; evaluate capacity thresholds | Protocol PASS; one capacity gate FAIL |

Local development diagnostics before SSH included PowerShell tree-expression quoting, PowerShell parameter binding, Bash parameter-expansion braces, and WSL wrapper stderr classification. Each was corrected and re-tested locally; none consumed an SSH invocation.

```text
SSH_CALL_1_DURATION_MS=1209
SSH_CALL_2_DURATION_MS=77483
SSH_CALL_2_STDOUT_SHA256=82bb9e7411548fd7978fdf0f95b2ad7805ef63af386cb21d88f40285747106dd
SSH_CALL_2_STDERR_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
RAW_SSH_OUTPUT_WRITTEN_TO_GIT=NO
RAW_SSH_OUTPUT_RETAINED=NO
THIRD_SSH_CALL_EXECUTED=NO
RETRY_EXECUTED=NO
```
