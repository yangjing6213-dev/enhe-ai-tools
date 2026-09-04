# AI news V2 production continuation

## Original Goal
Generate and publish exact 5 FRESH_EVENT + 1 DURABLE_TASK bilingual topics, with six CMS records and twelve verified public pages.

## Task Contract
- User authorized deployment and publishing; no database migrations, old-article changes, force push, new credentials or privilege expansion.
- User explicitly superseded the earlier manual-review requirement. Automatic source, freshness, duplicate, safety, HTML/payload and public-page checks remain mandatory.
- Do not fabricate reviewer attestations or publish synthetic fixtures.
- Verify current server code/schema and a rollback artifact before any deployment; do not assume the recovered snapshot equals production.

## Current Repository State
- Repository: F:/Projects/enhe-ai-website-v2; branch codex/ai-news-publishing-v2; working HEAD pending commit after this continuation.
- Governing instructions: AGENTS.md and user's current explicit authorization.
- Remote: git@github-enhe:yangjing6213-dev/enhe-ai-tools.git.
- Existing implementation and test results: docs/superpowers/plans/2026-09-04-ai-news-publishing-v2.md and docs/ai-news-publishing-v2.md.

## Task Plan
| ID | Objective | Files likely affected | Acceptance criteria | Verification | Dependencies | Status |
|---|---|---|---|---|---|---|
| P1 | Verify noninteractive SSH | Local SSH agent only; no private-key edits | GitHub identity, repository access and server session confirmed | Bounded SSH with strict host-key checking | User locally unlocks keys | complete |
| P2 | Audit public release and server compatibility | Existing deploy files and release evidence | No secret publication; server baseline/schema and rollback documented | Independent static audit plus read-only server checks | P1 for server | in_progress |
| P3 | Replace manual attestation with automatic audit contract | Existing V2 contract/service/client/tests | No reviewer forgery; exact batch and all content checks preserved | Focused behavior and regression tests | P2 | complete |
| P4 | Push, deploy, generate and publish | Existing deployment/Codex workflow | Six new CMS records, twelve verified public pages; existing articles unchanged | Real snapshot, full audit, stage/promote and GET verification | P1-P3 | pending |

## Completed + Verified
- Both configured public keys are accepted by their destinations.
- Both private keys were unlocked by the user and are loaded in ssh-agent.
- GitHub SSH authentication succeeds with the system OpenSSH client; the target repository is empty and `git ls-remote` exits 0.
- Server SSH read-only session succeeds; no `.env` contents were read.
- Existing deployment configuration: 8 tests PASS; bash -n deploy.sh and app-entrypoint.sh PASS.

## Current Work
Independent read-only release audit; authenticated remote checks completed after the user unlocked both keys.

## Evidence
- ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -T git@github-enhe: GitHub authentication succeeded (shell access intentionally unavailable).
- git ls-remote origin: empty result, exit 0; no remote refs exist yet.
- ssh enhe-prod read-only probe: HEAD 3497d170, detached branch, four dirty entries, old HTTPS origin, compose env mode 600; no server writes.
- Server relay probe: `git ls-remote git@github.com:yangjing6213-dev/enhe-ai-tools.git` fails with publickey because server has no GitHub private key.
- node node_modules/vitest/vitest.mjs run src/lib/deploy-config.test.ts: 8/8 passed.
- Git Bash -n checks: 0,0.

## Remaining Work / Open Risks
Public repository history safety, production baseline compatibility, real PostgreSQL transaction verification, automatic article generation and publication are not yet verified.

Independent release audit is PARTIAL: fixed default-account material was removed from tracked seed/admin provisioning code and seed-only values are now environment-required. Historical object scanning is still limited; no production credential leak has been established by this static inspection. The general deploy wrapper pulls main by default, so deployment must use an explicitly verified release ref. Server dirty state and missing GitHub identity prevent safe in-place deployment until a clean or preserved checkout is provided.

## Important Decisions
The earlier claim that human review was an immutable platform requirement was incorrect. Respect the user's latest explicit instruction without weakening automated safeguards or inventing human approval.

## Final Acceptance
PARTIAL. No Push, deployment, migration or publication executed in this continuation; the next safe action is a reviewed push of the new baseline, followed by deployment only after the server checkout conflict is resolved.
