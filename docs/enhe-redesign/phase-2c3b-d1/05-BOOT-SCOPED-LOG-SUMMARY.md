# Boot-scoped Log Summary

## Current boot separation

The local CLI advertises both `--boot` and `--since`, but rejected three absolute systemd-time representations. The authoritative collection therefore used `docker desktop logs --boot 0 --no-color`, then filtered each distinct boot source by the attempt's exact UTC start/end timestamps.

This avoids treating older NUL records as current. The two boot files have different hashes, and each exact window independently contains three NUL/daemon-load records while containing zero historical NUL records outside its window.

| Evidence | Attempt 1 | Attempt 2 |
|---|---:|---:|
| Boot source SHA-256 | `1e7de1…51c2` | `e2be85…3d40` |
| Current-window lines | 213 | 214 |
| Current-window error matches | 31 | 32 |
| Current-window NUL errors | 3 | 3 |
| Historical NUL errors | 0 | 0 |
| Relevant Windows events | 0 | 0 |

## Causal ordering

Both attempts share the same order:

1. `com.docker.backend` begins running services.
2. The backend encounters an invalid NUL character while loading/parsing daemon JSON.
3. About 60 seconds later, module startup reports a context deadline.
4. Later error-report/IPC paths repeat the same daemon failure and emit an unhandled error.
5. Named-pipe availability fails only after the backend has already failed to initialize the engine.

Therefore named-pipe absence is a downstream symptom, not the root cause.

Raw Docker logs, local host logs, and raw command outputs remain only in the quarantine directory. Git contains only hashes, counts, timestamps, components, classifications, and sanitized descriptions. An automatically copied non-log `settings.dat` artifact was deleted from the quarantine copy without reading it; the host source was untouched and the manifest asserts that no configuration body is present.
