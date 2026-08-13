# Writer Callsite Ownership

Direct `writeRuntimeHeartbeat` callsites were audited with `git grep`.

| Source | Function / lifecycle point | Target source | Same-process concurrent calls in current flow | Cross-process same-target evidence |
|---|---|---|---|---|
| `seo-audit-scheduler.mjs:70` | `main`, successful enqueue | `SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE` | No; awaited loop | Not proven; separate scheduler env key |
| `seo-audit-scheduler.mjs:76` | `main`, enqueue failure | `SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE` | No; awaited loop | Not proven; separate scheduler env key |
| `seo-audit-worker.mjs:124` | `sendJobHeartbeat` | `SEO_AUDIT_WORKER_HEARTBEAT_FILE` | No in current awaited call chain | Not proven; separate worker env key |
| `seo-audit-worker.mjs:351` | `main`, engine verification blocked | `SEO_AUDIT_WORKER_HEARTBEAT_FILE` | No; startup path | Not proven |
| `seo-audit-worker.mjs:359` | `main`, initial healthy state | `SEO_AUDIT_WORKER_HEARTBEAT_FILE` | No; awaited before loop | Not proven |
| `seo-audit-worker.mjs:370` | `main`, claimed job | `SEO_AUDIT_WORKER_HEARTBEAT_FILE` | No; awaited before job processing | Not proven |
| `seo-audit-worker.mjs:377` | `main`, post-job idle state | `SEO_AUDIT_WORKER_HEARTBEAT_FILE` | No; `runEngine` awaits heartbeat chain | Not proven |
| `seo-audit-worker.mjs:382` | `main`, blocked catch path | `SEO_AUDIT_WORKER_HEARTBEAT_FILE` | No; awaited catch path | Not proven |

The worker timer serializes its own heartbeat requests through `heartbeatPromise`, but the exported writer must remain safe for direct concurrent callers and any future same-process lifecycle overlap. The scheduler and worker use distinct configured target variables. No evidence proved multiple independent processes legally writing one target with a required global order, so the cross-process protocol hard-stop did not apply.

