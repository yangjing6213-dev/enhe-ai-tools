# Collision-Safe Output Scanner

```text
PROTOCOL_V3_OUTPUT_ACCEPTED=YES
FORBIDDEN_FINDING_RULE=NONE
FORBIDDEN_FINDING_LINE_NUMBER=0
FORBIDDEN_FINDING_KEY=NONE
FORBIDDEN_FINDING_KEY_SHA256=NONE
FORBIDDEN_FINDING_RAW_OUTPUT_SHA256=NOT_APPLICABLE_OUTPUT_ACCEPTED
```

The parser compares known Host/Alias, User, and Identity-path values only against a complete parsed scalar. It does not scan whole stdout for username substrings. IP syntax, Windows/POSIX absolute paths, URL schemes, host-port syntax, `@`, and private-key markers have independent rules.

On rejection, evidence can retain only rule, line number, allowlisted key or key hash, expected value type, and raw-output SHA-256. It never retains the value or a matching fragment. This audit had no forbidden finding.
