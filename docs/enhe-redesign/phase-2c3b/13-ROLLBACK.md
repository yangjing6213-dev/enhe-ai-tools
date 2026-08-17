# Rollback

Phase 2C.3B is isolated on `codex/enhe-motion-hygiene-v1`; it was not merged, pushed, or deployed. The safest rollback is therefore to leave the branch unused.

If these commits are later integrated and need an auditable rollback, revert the source commits in reverse order:

1. `9d02b11` - reduced motion and transition hygiene
2. `993d448` - review carousel accessibility state machine
3. `c432307` - production redesign fade removal

Use normal `git revert` commits in the integration branch. Do not use reset, forced checkout, or history rewriting. Re-run focused tests, the full suite, browser geometry/timeline checks, build, and standalone after any partial rollback because the test contracts intentionally span commit boundaries.

The documentation commit has no application runtime effect and may remain as historical evidence.
