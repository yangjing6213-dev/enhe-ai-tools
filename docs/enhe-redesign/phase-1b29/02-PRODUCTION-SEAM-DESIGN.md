# Production Seam Design

`SEAM_DESIGN_STATUS=NOT_SELECTED_EARLY_BLOCK`

The authorized seam was not implemented because the required state-store gate failed first. Choosing an API before resolving the real writer defect would produce an unverified design and violate the instruction to stop immediately.

The candidate design remains intentionally bounded for a later authorized phase:

- one factory/controller in `deploy/enhe-ai-tools/scripts/`;
- no top-level environment reads, timers, child processes, sockets or database access;
- injected clock, timer functions and heartbeat writer;
- explicit current-run identity;
- serialized asynchronous writes;
- idempotent stop and protection against an old run clearing a newer run;
- Worker and Scheduler wrappers calling the same production seam;
- unchanged CLI, environment variable, JSON, claim, engine and HTTP protocols.

No seam API name, module path or signature is claimed as implemented in this blocked phase.
