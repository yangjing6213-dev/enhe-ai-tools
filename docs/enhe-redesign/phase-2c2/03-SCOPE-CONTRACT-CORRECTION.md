# Phase 2C.2 scope contract correction

## Why the first run stopped

The first hard gate reported `SOFTWARE_INTEGRATION_COMMIT_SCOPE_INVALID`. Source commit `bbfe441c60c74c34117a5f40d6e3150b6323c53e` contained the candidate code and also added `docs/enhe-redesign/phase-2a3/design.md`. The earlier allowlist did not authorize that document, so creating a target branch or cherry-picking would have exceeded the approved scope. Stopping was correct.

## Why the second run stopped

The second hard gate reported `PHASE2A3_DESIGN_DOCUMENT_VERSION_DRIFT`. The document in `bbfe441` had Blob `011cb6997f2eb127a4f3ebb9d68daebc2865f07f`; the reviewed boundary `3a747330929930d461ff5e9ff012241286c4e35d` had Blob `30421d2813ca50d31e4e6aa9da59afd6bab0e1b2`. Commit `ef4d3204c6f5e6f05d4d363217e61bd2277a81d6` introduced the only intervening document change: two additions and two deletions. Continuing from the stale document would have used an unreviewed implementation contract. Stopping was correct.

## R2 authorization and execution

R2 authorized exactly one historical document exception: `docs/enhe-redesign/phase-2a3/design.md`. It did not authorize the rest of `docs/**`. Both the initial and reviewed Blobs passed a restricted-data scan covering private-key markers, credential assignments and URLs, permanent cloud or delivery URLs, real tokens/provider keys/object-storage secrets, and server credentials. The scanner emitted category counts only; every category count was zero and no source text was printed.

`bbfe441` was therefore cherry-picked unchanged. The one document was immediately synchronized to the reviewed Blob and committed alone before any later candidate code commit was applied. No pure-code replacement commit was created because the now-authorized source commit and both document versions passed the security gate.

Recorded outcomes:

- `INITIAL_DESIGN_RESTRICTED_SCAN=PASS`
- `REVIEWED_DESIGN_RESTRICTED_SCAN=PASS`
- `RESTRICTED_SCAN_OUTPUT_CONTAINS_SOURCE_TEXT=NO`
- `SCOPE_EXCEPTION_STATUS=AUTHORIZED_EXACT_SINGLE_FILE`
- `ADDITIONAL_DOC_PATHS_AUTHORIZED=NO`
- `SOURCE_DOC_COMMITS_CHERRY_PICKED=NO`

No source worktree, remote, deployment, production environment, or production database was modified.
