# Previous Exit 2 Evidence and Root-Cause Boundary

The committed Phase 2C.5A-R evidence was read in full. It retains the previous exit code, output/helper/invoker hashes, strict Host Key result, a statement that sampling did not start, and deletion of temporary scripts. It does not retain the SSH argv structure, stderr category, failing command stage, proof that remote Bash began executing, a protocol start marker, or remote stdout content.

```text
PREVIOUS_EXIT2_ROOT_CAUSE=UNRESOLVED_INSUFFICIENT_RETAINED_EVIDENCE
PREVIOUS_REMOTE_AUDIT_EXIT_CODE=2
PREVIOUS_AUDIT_COMPLETION_STATUS=FAILED_BEFORE_SAMPLING_REMOTE_EXIT_2
PREVIOUS_AUDIT_TRANSPORT_STATUS=UNKNOWN_REMOTE_EXIT_2
PREVIOUS_STRICT_HOST_KEY_CHECK=PASS
PREVIOUS_HOST_KEY_MISMATCH=NO
```

No deleted temporary script was sought or recovered, and no unrelated user directory was scanned. The current R1 attempt does not retroactively prove whether the previous exit 2 was caused by a local invoker, remote Bash syntax, remote runtime logic, or SSH transport.

The current R1 preflight proves only that the new V2 Bash bytes were syntactically accepted remotely. It does not establish the cause of the earlier, different attempt.
