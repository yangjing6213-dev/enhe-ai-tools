# Production Fix Design

The root cause was a temporary pathname built only from the target path and `process.pid`. Concurrent calls in one Node process therefore shared one temporary file and could rename or remove it before another caller used it.

The minimal fix has two parts:

1. Build `<target>.<pid>.<randomUUID()>.tmp`, preserving the target directory and avoiding collisions across calls and processes.
2. Store a promise chain in a `Map` keyed by `resolve(path)`, lowercased on Windows. A caller waits for the previous chain, runs its own write/rename, and removes the map entry only if it is still the tail. The predecessor rejection is caught only for queue continuation; the current caller still receives its own error.

The write/rename is unchanged in contract. The `finally` block removes only the invocation's temporary path with `force: true`; cleanup errors are intentionally ignored so they cannot replace the original filesystem error. No global lock, external dependency, worker change, scheduler change, or cross-process ordering protocol was added.

