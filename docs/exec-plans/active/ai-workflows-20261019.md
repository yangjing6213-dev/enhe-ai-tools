# AI Workflows implementation

## Contract

- Add the public AI Workflows entry under the AI Skills navigation in Chinese and English.
- First release is a real, honest public directory page using the ten application directions supplied by the user. Do not invent products, prices, reviews, or download counts.
- Keep the first release independent of database, payment, COS, GitHub credentials, and scheduler changes. Continue those systems only after the page is deployed, per the user's requested order.
- Preserve the dirty recovery-baseline worktree; implement from the clean deployed release base in `codex/ai-workflows-20261019`.

## Acceptance

- Chinese and English routes render with the public site header/footer and navigation links.
- The ten directions match the supplied screenshot; search filters them by localized title and task examples.
- Empty workflow state clearly explains that actual projects are still undergoing verification; no sample products or fabricated commercial data appear.
- Relevant unit tests, typecheck, lint, build, release checks, and browser checks are run and reported accurately.
- Push and deploy the page before implementing the remaining catalog, admin, payment, storage, GitHub collection, and scheduling scope.

## Progress

- `verified`: isolated clean worktree from production release commit `8a1f709abf855a077ed7e46623dc572c6d6ce8a5`.
- `verified`: public Chinese and English directory routes, 10 task directions, localized search, and explicit unverified-workflow empty state.
- `verified`: focused tests (20/20), typecheck, targeted lint, desktop/mobile browser checks, search interaction, and no horizontal overflow.
- `pending`: guarded push/deploy to the existing release branch.
- `pending`: continue backend/admin/delivery/collection/scheduler scope after deployment.

## Known dependencies for later phases

- Do not inspect or print secret values. Later COS/collector setup will require presence checks for the user-designated credential file and Windows `E:` workspace, plus verified account/config access.
- Payment, production database changes, COS access, and scheduled task activation are separate verified states; none is implied by the public page deployment.
