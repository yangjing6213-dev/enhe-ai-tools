# R1 Output Rejection Boundary

```text
R1_BASH_SYNTAX_AND_TRANSPORT_PREFLIGHT=PASS
R1_FULL_AUDIT_EXIT_CODE=2
R1_FULL_AUDIT_STDERR_EMPTY=YES
R1_FULL_AUDIT_STDOUT_NONEMPTY=YES
R1_OUTPUT_SCANNER_RAN_BEFORE_PROTOCOL_PARSE=YES
R1_RAW_OUTPUT_AVAILABLE=NO
R1_RAW_OUTPUT_RECOVERY_ATTEMPTED=NO
R1_EXACT_FORBIDDEN_MATCH_FIELD=UNRESOLVED
R1_ACTUAL_SECRET_LEAK=NOT_PROVEN
R1_LONG_RUNTIME_OBSERVED=YES
R1_FULL_SAMPLING_PROVEN=NO
```

R1 retained only the scanner category `KNOWN_CONNECTION_VALUE`; it destroyed raw stdout as required. That category cannot prove which field matched or that a connection value was actually disclosed. It must not be relabeled as `CONFIRMED_SECRET_LEAK`.

R2 did not recover, search for, reconstruct, infer, or guess the discarded R1 output. R1 evidence and its blocked classification remain unchanged.
