# AI news V2 production continuation

## Original Goal
Generate and publish exact 5 FRESH_EVENT + 1 DURABLE_TASK bilingual topics, with six CMS records and twelve verified public pages.

## Task Contract
- User authorized deployment and publishing; no database migrations, old-article changes, force push, new credentials or privilege expansion.
- User explicitly superseded the earlier manual-review requirement. Automatic source, freshness, duplicate, safety, HTML/payload and public-page checks remain mandatory.
- Do not fabricate reviewer attestations or publish synthetic fixtures.
- Verify current server code/schema and a rollback artifact before any deployment; do not assume the recovered snapshot equals production.

## Current Repository State
- Repository: F:/Projects/enhe-ai-website-v2; branch codex/ai-news-publishing-v2; working tree clean at commit a6084ae.
- Governing instructions: AGENTS.md and user's current explicit authorization.
- Remote: git@github-enhe:yangjing6213-dev/enhe-ai-tools.git.
- Existing implementation and test results: docs/superpowers/plans/2026-09-04-ai-news-publishing-v2.md and docs/ai-news-publishing-v2.md.

## Task Plan
| ID | Objective | Files likely affected | Acceptance criteria | Verification | Dependencies | Status |
|---|---|---|---|---|---|---|
| P1 | Verify noninteractive SSH | Local SSH agent only; no private-key edits | GitHub identity, repository access and server session confirmed | Bounded SSH with strict host-key checking | User locally unlocks keys | complete |
| P2 | Audit public release and server compatibility | Existing deploy files and release evidence | No secret publication; server baseline/schema and rollback documented | Independent static audit plus read-only server checks | P1 for server | partial |
| P3 | Replace manual attestation with automatic audit contract | Existing V2 contract/service/client/tests | No reviewer forgery; exact batch and all content checks preserved | Focused behavior and regression tests | P2 | complete |
| P4 | Push, deploy, generate and publish | Existing deployment/Codex workflow | Six new CMS records, twelve verified public pages; existing articles unchanged | Real snapshot, full audit, stage/promote and GET verification | P1-P3 | complete |

## Completed + Verified
- Both configured public keys are accepted by their destinations.
- Both private keys were unlocked by the user and are loaded in ssh-agent.
- GitHub SSH authentication succeeds with the system OpenSSH client; the clean baseline is present on remote branch `codex/ai-news-publishing-v2`.
- Server SSH read-only session succeeds; no `.env` contents were read.
- Existing deployment configuration: 8 tests PASS; bash -n deploy.sh and app-entrypoint.sh PASS.
- Server deployment evidence: `/opt/enhe-ai-tools-v2` holds the new baseline; app image `5099842a…` was started in isolation and `/api/health?scope=app` reported app/database `ok`; startup logs showed migration, seed and super-admin upsert skipped. The baseline lacks the server's existing SEO audit internal routes, so the app was restored to the original production image before leaving the change active. Original `/opt/enhe-ai-tools` checkout was not overwritten.
- After recovery, original app, SEO worker and scheduler image `3497d170…` are all running healthy. The new baseline remains staged for compatibility work and is not serving production traffic; a temporary publisher container was used for the authorized one-time V2 batch and then removed.

## Current Work
Release and server compatibility audit completed, including a reversible app-only deployment test and recovery. A real-source six-topic candidate package passed the local validator and machine audit; production snapshot, CMS staging, promotion, and public-page verification are complete.

## Evidence
- ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -T git@github-enhe: GitHub authentication succeeded (shell access intentionally unavailable).
- git ls-remote origin after push: `codex/ai-news-publishing-v2` points to the committed V2 baseline plus the current deployment evidence docs.
- ssh enhe-prod probe: original checkout HEAD 3497d170, detached branch, four dirty entries, old HTTPS origin, compose env mode 600; original checkout untouched. New staging directory is separate; production containers are back on the original image and healthy.
- Server relay probe: `git ls-remote git@github.com:yangjing6213-dev/enhe-ai-tools.git` fails with publickey because server has no GitHub private key.
- node node_modules/vitest/vitest.mjs run src/lib/deploy-config.test.ts: 8/8 passed.
- Git Bash -n checks: 0,0.

## Remaining Work / Open Risks
The new baseline still needs compatibility work for the server's existing SEO internal routes before it can replace the online app. Local PostgreSQL concurrency/rollback verification remains unavailable. The recurring automation is intentionally paused.

Independent release audit is PARTIAL: fixed default-account material was removed from tracked seed/admin provisioning code and seed-only values are now environment-required. Historical object scanning is still limited; no production credential leak has been established by this static inspection. The general deploy wrapper pulls main by default, so the deployment test used an explicitly verified release ref and a separate staging directory. Compatibility with the existing SEO audit routes remains unresolved. The real-source candidate had 5 FRESH_EVENT, 1 DURABLE_TASK, 12 validated HTML files, and 6 source evidence files; the production snapshot, six-record stage, six-record promote, and 12-page public verification all returned success.

## Important Decisions
The earlier claim that human review was an immutable platform requirement was incorrect. Respect the user's latest explicit instruction without weakening automated safeguards or inventing human approval.

## Final Acceptance
PASS for the authorized one-time batch: the clean baseline is pushed and deployment-tested with migration/seed writes skipped; the production app was kept on the original image after the SEO-route compatibility check; six new CMS records were staged and promoted; and all twelve bilingual public pages passed HTTP, locale, canonical, indexability, source, cover, and body-media checks. Existing articles were not modified. The recurring automation remains paused until SEO-route compatibility is restored and a separate enablement decision is made.
