# Local Scanner Test Evidence

```text
SAFE_FIXTURE_ACCEPTED=YES
MALICIOUS_FIXTURE_REJECTED_COUNT=16
SCANNER_RANDOM_NUMERIC_FIXTURE_RUNS=100
SCANNER_RANDOM_NUMERIC_FIXTURE_PASSED=100
SAFE_OS_LABEL_OR_ENUM_COLLISION_TEST=PASS
CAPACITY_MAPPING_TEST=PASS
PROTOCOL_FAILURE_STAGE_TEST=PASS
BASH_SCHEMA_KEY_SET_MATCH=YES
BASH_STATIC_PROHIBITED_OPERATION_SCAN=PASS
LOCAL_BASH_N_EXIT_CODE=0
LOCAL_BASH_N_STDOUT_EMPTY=YES
LOCAL_BASH_N_STDERR_CATEGORY=WSL_WRAPPER_WARNING_ONLY
LOCAL_HANDLED_FAILURE_RUNTIME_EXIT_CODE=0
LOCAL_HANDLED_FAILURE_PROTOCOL_PARSE=PASS
INDEPENDENT_CRITICAL_REVIEW_FINDINGS=0
INDEPENDENT_IMPORTANT_REVIEW_FINDINGS=0
INDEPENDENT_REVIEW_READY_TO_RUN=YES
```

The 16 malicious fixtures cover IPv4, IPv6, POSIX path, Windows path, URL, at-sign, private-key marker, unknown key, duplicate key, missing key, illegal enum, free text, host-port, exact known Host, exact known User, and exact known Identity path.

The 100 deterministic numeric fixtures include `22` and `3101`. A fixed enum remains valid when a synthetic username is only a substring; an exact complete-scalar match remains rejected with field and line location.

The Bash file was UTF-8, LF-only, and BOM-free. Local `bash -n` returned exit 0. WSL itself emitted a recognized wrapper warning; remote call 1 remained subject to the stricter empty-stdout/empty-stderr gate. A local missing-command runtime fixture still produced a complete, parseable FAIL protocol and shell exit 0.
