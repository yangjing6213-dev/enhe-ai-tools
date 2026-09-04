# Admin / API / Core Handling Plan

- decision: `blocked_until_admin_api_core_review`
- canCommitTogether: `false`

## Actions

- Split admin/API/core review by functional area.
- Run dedicated tests before any commit for these files.

## Forbidden Actions

- git add src/app/admin
- git add src/app/api
- git add src/lib non-EBOS files in EBOS report commit
