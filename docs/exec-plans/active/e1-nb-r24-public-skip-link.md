# E1-NB-R24 Public Skip Link Contract

## Contract

- `task_id`: `E1-NB-R24`
- `task_name`: `Bilingual public-shell skip-to-content navigation`
- `contract_base_head`: `ee6e0e112dc32f7ed37c2dfd17b20b5890b53c4d`
- `execution_base_head`: `255a233b49efb7d3bc47e6bb7e7f795771dfb929`
- `branch`: `codex/enhe-recovery-baseline`
- `worktree`: `C:\Users\HU\Documents\New project 2\.worktrees\enhe-recovery-baseline`
- `status`: `COMPLETED_LOCAL_ONLY`
- `execution_authorization`: `APPROVED`
- `owner_acceptance`: `PASS_LOCAL_ONLY`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`

## Allowed files

1. `src/components/public-site-chrome.tsx`
2. `src/styles/redesign/shell.css`
3. `src/lib/e1-nb-r24-public-skip-link.test.tsx`
4. `docs/enhe-redesign/english-rewrite/e1-p3-d1/e1-nb-r24-public-skip-link-receipt.json`

`src/lib/public-a11y-smoke-source.test.ts` may be used instead of the dedicated focused test, but not in addition without demonstrated need.

## Acceptance criteria

- Chinese and English skip-link labels are correct and the link is first-focusable.
- Enter activates exactly one content target; the target is focusable without creating nested `main` elements.
- The link is visually hidden by default and visible under `:focus-visible`.
- Header, content, support widget, and Footer order remain unchanged.
- `/`, `/en`, `/software`, and `/en/software` return HTTP 200 with no desktop/mobile horizontal overflow or layout displacement.
- Public-shell/a11y focused regressions, target ESLint, typecheck, and `git diff --check` pass.

## Validation

- Focused Vitest RED/GREEN for source/rendered public-shell behavior.
- Public shell and accessibility direct regressions.
- Target ESLint and `npm run typecheck`.
- Localhost keyboard/browser checks at desktop and mobile viewports for four routes.
- `git diff --check` and exact scope/status checks.

## Forbidden operations

No database, network, SSH, Docker, deployment, push/PR, production configuration, content import, old-worktree access, destructive Git, broad staging, or deletion of pre-existing files.

## Failure handling

Do not commit implementation unless every acceptance gate passes. Stop on unauthorized scope, duplicate content targets, nested `main`, regression, or high-risk dependency. Publication remains blocked.

## Completion

- `implementation`: `GREEN_FOCUSED`
- `local_acceptance`: `PASS`
- `commit`: `c35eb6e7ac0094a7e2286baecb16f249f1fa254c`
- `receipt_bytes`: `5108`
- `receipt_sha256`: `0b9c1a8d258baa287b477ec550df99a2e429333d51f32f7f857fe6fa52b4e572`
- `batch_progress`: `2/3`
- `content_evidence`: `UNVERIFIED`
- `publish_status`: `BLOCKED`
- `push_status`: `NOT_PUSHED`
