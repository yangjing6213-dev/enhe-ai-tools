# AI Workflows implementation

## Contract

- Add the public AI Workflows entry under the AI Skills navigation in Chinese and English.
- First release is a real, honest public directory page using the ten application directions supplied by the user. Do not invent products, prices, reviews, or download counts.
- After first deployment, continue the catalog, admin, payment, COS, GitHub collection, and scheduling scope from the attached implementation instructions.
- Preserve the dirty recovery-baseline worktree; implement from the clean deployed release base in `codex/ai-workflows-20261019`.

## Acceptance

- Chinese and English routes render with the public site header/footer and navigation links.
- The ten directions match the supplied screenshot; search filters them by localized title and task examples.
- Empty workflow state clearly explains that actual projects are still undergoing verification; no sample products or fabricated commercial data appear.
- Relevant unit tests, typecheck, lint, build, release checks, and browser checks are run and reported accurately.
- The directory deployment is a hard phase boundary; the remaining systems are developed after that deployed release.

## Progress

- `verified`: isolated worktree from deployed release commit `299d753d9ef869d4361cc667cc86b98b139f6689` on `codex/ai-workflows-20261019`.
- `verified`: public Chinese and English directory routes, 10 task directions, localized search, and explicit unverified-workflow empty state.
- `verified`: first release was pushed and deployed to `codex/forum-topic-dedup-20261019`; live Chinese/English routes and mobile width were checked.
- `verified`: first release passed full unit tests, typecheck, lint, build, E2E, and local browser checks before deployment.
- `verified`: the local COS credential file contains mapped non-empty SecretId/SecretKey fields; secrets were not printed. The E: run root exists and Codex non-interactive login is ready.
- `verified`: authorized COS HeadBucket checks passed for both named buckets. DNS resolves and HTTPS TLS validates for both custom domains, but each root URL returns 403; this does not establish COS domain binding or object-preview readiness.
- `verified`: production app has the legacy single-bucket COS variables, but not the new two-bucket/domain/3600-second settings. Its current legacy bucket is not either named bucket. The production container's mounted config file exists; no secret values were read.
- `verified locally`: database-backed workflow catalog and bilingual detail pages, admin product/topic/price controls, ratings/favorites/download accounting, version-bound delivery, one-time order entitlement, private COS upload/signing code, and lease-based worker API are implemented.
- `verified`: topic confirmation is now an explicit persisted gate; poll locks and rereads the setting/topic snapshot before creating or claiming work, edits invalidate queued/running batches, disabled daily collection can claim only a confirmed manual batch, and unique-date conflicts roll back before returning idle.
- `verified`: AI Workflow ZPAY payment callbacks create the exact purchased-version entitlement; the user center includes published AI Workflow products.
- `verified`: full unit suite passed (3,273 passed, 110 skipped), typecheck and lint passed; fresh-install and deployed-base migration paths passed with no schema drift. Final build/E2E/release checks are still pending for this release.
- `blocked for real daily production collection`: ordered topic attachment 2 is absent; the supplied ten page categories are not a substitute. Keep scheduled collection and manual batch requests disabled until the actual ordered topic list is provided.
- `verified`: the existing local COS credential file and authorized two-bucket operations were tested earlier; the current upload helper supports private immutable objects, integrity checks, anonymous-denial checks, and optional full signed-read verification. Both custom-domain roots returned 403, so their COS bindings remain unverified.
- `pending`: configure the production app's separate COS bucket/domain settings without committing secrets; use the existing backup-and-deploy process for additive migrations.
- `pending`: implement and validate the independent Windows execution program and one fixed 5-minute task. No local runner or scheduled task has been registered, and no unattended collection is claimed.

## Known dependencies for later phases

- Do not inspect or print secret values. COS access was checked with the user-designated credential file; continue exposing only set/unset or operation status.
- Payment, production database changes, COS access, and scheduled task activation are separate verified states; none is implied by the public page deployment.
- The production container currently has a legacy COS bucket setting. Do not silently redirect existing uploads; use explicit per-purpose bucket selection for new workflow assets and preserve legacy behavior.
- The `SEO_AUDIT_TEST_DATABASE_URL` and `DATABASE_URL` environment variables are unset locally; production-style release checks need an isolated test database, not the production database.
