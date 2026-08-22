# Protocol V3 Threat Model

Protocol V3 removes every free-text output field. Remote stdout is limited to an allowlisted key and a field-specific scalar type: boolean, binary, unsigned integer, basis points, load milli-units, SHA-256, enum, numeric version, or epoch seconds.

The remote script never emits OS names or versions, kernel text, target/account data, paths, Docker names, image references, Compose names, logs, command errors, or arbitrary strings. OS version material, kernel release, Docker root path, and Docker object sets are hashed in remote memory before output.

The local parser applies five ordered gates:

1. byte safety: 128 KiB limit, strict UTF-8, no BOM/NUL/CR/control bytes, and 256-byte line limit;
2. structure: exact `KEY=VALUE`, key allowlist, uniqueness, mandatory fields, and Begin/End order;
3. field-specific type validation with no free-string type;
4. exact complete-scalar comparison for known connection values plus independent IP, absolute-path, URL, host-port, at-sign, and private-key-marker rules;
5. semantic completeness, sample count, resource fingerprints, restart delta, and capacity mapping.

The R1 username substring rule was removed. V3 never performs a case-insensitive username substring search over whole stdout; legitimate enums and numbers therefore cannot collide merely by containing a short account substring.
