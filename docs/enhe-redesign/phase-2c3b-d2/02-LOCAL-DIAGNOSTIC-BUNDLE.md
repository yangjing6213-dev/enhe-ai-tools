# Local Diagnostic Bundle Decision

## Capability Result

The installed diagnostic help was inspected before any gather command. The Desktop CLI surface exposes upload-oriented diagnosis. The lower-level gather command can collect locally, but its help states that omitting an ID causes an ID to be generated. It provides no documented mode that simultaneously guarantees local-only collection and no Diagnostic ID.

The task's two-value capability enum does not precisely describe this tool behavior. The required value below is the closest allowed value; the actual blocker was mandatory ID generation, not evidence that local gather would necessarily upload.

`LOCAL_DIAGNOSTIC_GATHER_CAPABILITY=UNAVAILABLE_UPLOAD_ONLY`

`LOCAL_DIAGNOSTIC_GATHER_BLOCK_REASON=DIAGNOSTIC_ID_ALWAYS_GENERATED`

`LOCAL_DIAGNOSTIC_BUNDLE_CREATED=NO_UPLOAD_ONLY_TOOL`

`LOCAL_DIAGNOSTIC_BUNDLE_PATH=NOT_CREATED`

`LOCAL_DIAGNOSTIC_BUNDLE_SIZE=0`

`LOCAL_DIAGNOSTIC_BUNDLE_SHA256=NOT_CREATED`

`LOCAL_DIAGNOSTIC_BUNDLE_FILE_COUNT=0`

`LOCAL_DIAGNOSTIC_UPLOAD_OCCURRED=NO`

`DIAGNOSTIC_ID_CREATED=NO`

No gather command was run. No support URL was opened by a local tool, no upload task was created, and no diagnostic material entered Git or the result ZIP.

## Manual Evidence Substitute

The investigation used bounded, read-only evidence instead:

- exact installed version and binary hashes;
- Docker-owned state-file metadata/NUL/JSON classification without content disclosure;
- context metadata integrity checks without names or endpoints;
- socket-like run-state attribute checks without opening sockets;
- one controlled start and controlled stop;
- current-boot log correlation retained only in quarantine;
- pre/post state hashes and timestamps;
- official release/support pages and allowed public Docker issue repositories.
