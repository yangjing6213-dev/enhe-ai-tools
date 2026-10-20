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
- `verified`: the user supplied the exact ordered ten-topic GitHub collection list and search directions: 工作效率、视频生成、内容创作、编程开发、学习教育、搜索研究、营销销售、办公自动化、情感陪伴、财务法律辅助.
- `implemented locally`: topics now persist search directions, batches snapshot them, the worker claim includes that snapshot, and an additive migration initializes/confirms the supplied list while explicitly keeping daily collection disabled.
- `verified locally`: focused admin/worker tests (15 passed), Prisma schema validation, typecheck, lint for changed TypeScript files, and fresh-install plus deployed-base migration paths passed with no schema drift; the migration also asserts exact topic order and that daily collection remains disabled.
- `verified locally`: the first full release check at 8 test workers hit timeouts in unrelated suites; rerunning the 8 affected files with 1 worker passed all 54 tests. The release check now uses 2 workers; the complete release check is pending.
- `verified`: first public release was deployed to `codex/forum-topic-dedup-20261019` at `794e4052b1b33e03418bf9a53e9214ac91f99263`; the full test, typecheck, lint, build, E2E, and live route checks were completed before deployment.
- `verified`: the existing local COS credential file and authorized two-bucket operations were tested earlier; the current upload helper supports private immutable objects, integrity checks, anonymous-denial checks, and optional full signed-read verification. Both custom-domain roots returned 403, so their COS bindings remain unverified.
- `verified`: production COS and worker settings were added without exposing credentials; the pre-change server `.env` backup remains preserved with root ownership and mode `0600`.
- `verified`: the new worker collector and license-safe archive pipeline passed focused tests, full unit tests, typecheck, lint, build, release migration checks, and E2E. It searches only the supplied ten topics, limits support to Node projects with lockfiles and allowlisted licenses, and runs upstream tests in a constrained container.
- `verified`: release `bec285e20be2108b9d57de88d23aa8332a6df59c` was pushed to `codex/forum-topic-dedup-20261019` and deployed. Production reported the database schema up to date and the app, database, SEO worker, and SEO scheduler healthy; live `/ai-workflows` and `/en/ai-workflows` both returned HTTP 200.
- `verified`: the Windows task `ENHE AI Workflow Collector` is enabled on a five-minute cadence under the signed-in HU account. Its first completed run exited `0` and logged `collection_disabled`; this confirms the daily collection switch remains off and no batch was started. The computer must remain awake and HU signed in for future polling.
- `verified`: no GitHub batch was started and no workflow product was created by this release. When collection is later enabled, generated entries remain pending administrator review; the collector runs upstream tests but does not independently validate every workflow's core behavior.

## Known dependencies for later phases

- Do not inspect or print secret values. COS access was checked with the user-designated credential file; continue exposing only set/unset or operation status.
- Payment, production database changes, COS access, and scheduled task activation are separate verified states; none is implied by the public page deployment.
- The production container currently has a legacy COS bucket setting. Do not silently redirect existing uploads; use explicit per-purpose bucket selection for new workflow assets and preserve legacy behavior.
- The `SEO_AUDIT_TEST_DATABASE_URL` and `DATABASE_URL` environment variables are unset locally; production-style release checks need an isolated test database, not the production database.
