# Unknown Files Handling Plan

- decision: `risky_unknown_requires_user_confirmation`
- unknownFilesMayBeCommitted: `false`

## Actions

- Confirm ownership of risky unknown files.
- Exclude generated/cache files from commits.
- Create separate cleanup/commit batches only after approval.

## Forbidden Actions

- git add unknown files
- delete untracked files without approval
- mix unknown files into EBOS report commit
