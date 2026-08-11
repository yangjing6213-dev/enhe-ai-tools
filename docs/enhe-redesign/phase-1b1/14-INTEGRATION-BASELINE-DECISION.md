INTEGRATION_BASELINE_STATUS=READY_TO_CREATE_WHEN_AUTHORIZED
INTEGRATION_BASELINE_SHA=3497d1709a80b9c5a69d8c1b9eab41af2832f50f
RECOMMENDED_INTEGRATION_BRANCH=codex/enhe-phase1b-integration-3497d170
INTEGRATION_WORKTREE_CREATED=NO

# Clean integration baseline decision

The next implementation should start from the exact runtime-image revision, not from the incomplete redesign branch, local `main`, or the dirty original worktree.

Recommended later sequence:

1. Create a new clean worktree and `codex/enhe-phase1b-integration-3497d170` at the authoritative SHA.
2. Bring the approved Phase 1A design records into that branch as an isolated docs-only commit with provenance to the existing approved design commits.
3. Verify the four recovered source items directly from the authoritative commit; do not copy dirty or untracked files.
4. Establish a clean lint, typecheck, build, focused R-008, and full-test baseline. Reassess the known EBOS temporary-directory side effect on this source.
5. Implement R-008 on the authoritative branch while preserving `AnalyticsTracker`.
6. Only then begin the approved public-shell work.
7. Keep product-detail/download work blocked until R-001 owner approval and delivery/cache gates close.

This phase did not create a branch/worktree, cherry-pick, merge, rebase, or alter source history.
