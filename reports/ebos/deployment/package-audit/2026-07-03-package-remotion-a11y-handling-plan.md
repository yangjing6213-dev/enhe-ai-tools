# Package / Remotion / A11y Handling Plan

- decision: `blocked_until_package_audit`
- safeToCommitPackage: `false`

## Actions

- Do not commit package files in EBOS report batch.
- Keep Remotion/a11y changes separate from EBOS closure reports.
- Require user approval and dedicated package audit before any dependency commit.

## Forbidden Actions

- npm install
- git add package.json
- git add package-lock.json
- git commit package changes without approval
