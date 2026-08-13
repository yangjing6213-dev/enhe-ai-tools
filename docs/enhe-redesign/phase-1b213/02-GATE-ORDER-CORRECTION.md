# Gate Order Correction

Phase 1B.2.12 treated Writer-only 5/5 as a prerequisite to Seam reapply. That was circular: the Writer-only full suite included the monolithic Heartbeat integration test, while the Seam’s purpose is to separate lifecycle contracts and synthetic engine behavior from that integration path.

Phase 1B.2.13 therefore uses this order:

1. Verify the clean stability baseline and the existing GSC test-only fix.
2. Cherry-pick the already completed Heartbeat Seam and Heartbeat test-architecture commits.
3. Run focused lint/typecheck and Heartbeat/GSC/deploy/SEO pressure checks.
4. Measure the final architecture with default and fixed shuffle runs.
5. Only after the full suite passes, run the disposable PostgreSQL build gate.
6. Only after build passes, execute R-008 RED/GREEN.

The final quality gates remain strict: default 5/5, shuffle 3/3, lint, typecheck, build, and post-R-008 verification. No global timeout, worker reduction, serialization, skip, retry masking, or production-code change was used.
