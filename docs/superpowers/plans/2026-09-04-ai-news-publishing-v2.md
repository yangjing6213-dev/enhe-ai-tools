# ENHE AI News Publishing V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a recoverable, audited six-topic bilingual stage/promote path to the actual website, with an offline artifact audit and public-page verification.

**Architecture:** Extend the existing authenticated `/api/admin/ai-news/import` route and importer. Store batch ownership, digests and publication receipts in the existing `AdminAuditLog`, using serializable transactions; add no schema or dependencies. Keep V2 disabled by default and use an automatic audit attestation bound to the artifact, validator and history digests.

**Tech Stack:** Existing Next.js, Prisma/PostgreSQL, Zod, TypeScript, tsx, Vitest; external unchanged Python HTML validator.

**Spec:** User authorization ENHE-AI-NEWS-AUTOMATION-V2-IMPLEMENTATION-20260904 and “请继续，要实现文章在网站发布”; constraints reproduced below.

## Global Constraints

- Exactly 5 FRESH_EVENT + 1 DURABLE_TASK; 6 topic packages, 12 localized HTML files, 6 CMS records, 12 public pages.
- Never rewrite existing articles; only newly created batch-owned drafts may be promoted.
- No production migration, existing-article modification, secret/permission changes, or production schedule activation. Push and deployment are explicitly authorized only for the new `codex/ai-news-publishing-v2` baseline after preflight.
- Source and validator processes receive no publishing credentials. Source text is data, never executable instructions.
- Existing validators and test assertions remain unchanged; no new dependencies.
- Candidate slugs and HTML canonical hints never become final canonical URLs.
- Code provenance: clean isolated clone at bc66ea5032a414a1870bcb6890faeee1a8da08c1 from frozen website snapshot. Original dirty snapshot and unrelated Company OS work are preserved.

## Task 1: Transactional website batch service

**Files:** `src/lib/ai-news-import.ts`, pure `ai-news-import-schema.ts`, new `ai-news-batch-contract.ts`, `ai-news-batch.ts`, `ai-news-batch.test.ts`.

**Interfaces:** `handleAiNewsBatch(raw: unknown)` accepts `format: "batch-v2"` and `operation: "snapshot" | "stage" | "promote"`; stage carries exact-six payloads and an automatic audit, promote carries runSlot and the same digest-bound audit. Replies return persisted IDs and canonical slugs, never inferred success counts.

- [x] Read website AGENTS, importer, Prisma models, canonical helper and adjacent tests. Generate local Prisma client without connecting to a database. Baseline: 23 existing targeted tests pass.
- [x] Add failing tests for quantity/classification, bilingual completeness, duplicate event/source rejection, stale history, ownership and drift, replay conflicts and transaction rollback. Run `npm test -- src/lib/ai-news-batch.test.ts` and observe failure before implementation.
- [x] Reuse importer through an explicit transaction seam. Add pure schemas/digests and ledger-based serializable stage/promote with bounded conflict retries. Record all six ownership IDs and immutable-content digests; require current snapshot and automatic audit attestation before mutation.
- [x] Re-run new service and old import tests; inspect actual transaction arguments. PostgreSQL isolation is not represented as proven by mocks.

## Task 2: Authenticated route and offline publishing client

**Files:** existing `src/app/api/admin/ai-news/import/route.ts`, new adjacent batch route test, existing `scripts/publish-ai-news-html.ts`, new `scripts/ai-news-batch-client.ts` and its tests.

**Interfaces:** existing single HTML command remains valid. V2 uses `--manifest <file> --phase audit|snapshot|stage|promote|verify --receipt <file>`; default phase audit. Manifest references 12 contained local HTML files; both locale files must yield the same bilingual payload. External validator path is explicit and invoked with one file, in a credential-free child environment.

- [x] Add failing route/client tests: disabled/auth gates, no redirect credential forwarding, no network before 12 HTML/6 payload audits, atomic receipt/retry, only actual server-derived URLs, false-publication detection.
- [x] Implement default-disabled route extension with generic errors and cache invalidation after commit. Implement client checks, immutable digest-bound receipts and exact public-page verification; never log response bodies or credentials.
- [x] Run new tests and preserve existing single-file CLI/route tests unchanged.

## Task 3: Verification and production handoff

**Files:** `docs/ai-news-publishing-v2.md`, non-secret manifest/config examples under `config/ai-news-v2/`, optional nonproduction workflow only if it can run the actual validator safely.

- [x] Document exact commands, source evidence and automatic audit contract, no automatic rollback of public articles, retry recovery, deployment prerequisite and feature-flag boundaries. Do not activate production scheduling.
- [x] Run focused tests, changed-file ESLint, typecheck and applicable build. Inspect diff/status and scan changed files for accidental secrets. Record unrelated baseline failures separately.
- [x] Obtain independent read-only review if available, fix substantiated defects, and report PASS/PARTIAL with a single concrete production gate. No commit unless requested.

## Execution notes

2026-09-04: Actual website repository was absent from the original working folder and recovered from a local migration snapshot. Earlier Company OS automation is an offline audit only and cannot publish website content. Production database integration, source review of six real articles and twelve live-page verification remained mandatory gates after local tests passed.

2026-09-05 update: Automatic audit attestation is implemented and approval files are removed. Seed scripts no longer contain fixed default credentials; seed-only values are environment-required. Focused V2 tests (61), changed-file lint, typecheck, validator-backed loopback integration, and shell syntax checks pass. GitHub SSH authentication succeeds and the clean baseline is pushed to `codex/ai-news-publishing-v2`. The original production checkout remains detached/dirty and was not overwritten; a separate `/opt/enhe-ai-tools-v2` staging directory deployment-tested app image `5099842a…` with migration/seed/super-admin upsert skipped. Because the recovered baseline lacks the server's existing SEO audit internal routes, the online app was restored to the original image; app, worker, and scheduler are healthy on `3497d170…`. Using a temporary publisher container, a real production snapshot (249 records), six-topic candidate, six-record stage, six-record promote, and twelve live-page verification all passed. The batch receipt is `output/ai-news-v2-production-candidate/receipt.json`; recurring publishing automation remains paused. Overall one-time business objective is PASS; replacing the online app and enabling recurring publishing remain gated by SEO-route compatibility.
