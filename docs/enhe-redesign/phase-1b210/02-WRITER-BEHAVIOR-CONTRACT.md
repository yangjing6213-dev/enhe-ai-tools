# Writer Behavior Contract

The exported signature remains:

```js
writeRuntimeHeartbeat(path, identity, payload)
```

Preserved behavior:

- creates the target directory recursively;
- writes UTF-8 JSON to a temporary file in the target directory;
- retains payload fields and adds `releaseRef`, `startedAt`, and fresh `checkedAt`;
- atomically renames the temporary file to the exact target path;
- resolves after the rename and rejects filesystem errors to the caller;
- keeps the existing target path and JSON contract unchanged.

New guarantees:

- each invocation owns a unique temporary pathname containing the process id and a UUID;
- same-process writes to the same normalized absolute target are serialized in invocation order;
- Windows target-key comparison is case-insensitive;
- different target keys do not share a queue;
- a failed predecessor does not reject or permanently block later queued writes;
- the queue map removes a completed tail entry;
- cleanup attempts only remove the invocation's own temporary file and cannot mask the primary write/rename error.

