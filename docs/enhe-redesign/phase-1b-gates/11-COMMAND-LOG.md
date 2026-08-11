# Phase 1B read-only command log

All commands ran in `C:\Users\HU\Documents\New project 2\.worktrees\redesign-typeshare-v1` unless noted. No command below reads secret values or writes remote/production state.

| command or action | result |
|---|---|
| `git branch --show-current; git rev-parse HEAD; git status --porcelain` | Phase 1A baseline was clean at `f49dd3886f6fff4d05b692c793757398dbc756fa`; task B resumed at `e6f2d5559151b19b49cd37e6e77eba1bc78e2393` with only the authorized Phase 1B paths plus the now-quarantined temporary directory |
| `git diff --exit-code -- docs/enhe-redesign/phase-1a-input` | exit 0; input directory unchanged |
| `collect-public-url-baseline.ps1 -MaxConcurrency 1 -DelayMilliseconds 350` | sitemap 200, 528 unique URLs, 528/528 page fetches, 0 errors, UA fixed; evidence in 01/02 |
| `collect-local-route-inventory.ps1` | 145 route/redirect/generator/configuration rows in 03 |
| `collect-r006-diff.ps1` | after adding the missing-partner rule, exit 0; `DIFF_ROWS=534`, `MATCHED_ROWS=494`; 04 records 494 `MATCHED`, 2 `LANGUAGE_PARTNER_MISSING`, 32 `CODE_PRODUCTION_DRIFT`, and 6 `NEEDS_DECISION` |
| `git show main:src/app/root-layout-shared.tsx` (source only) | main contains historical ByteDance loader; output not copied here and query value redacted |
| `R008_SOURCE_REF=main npm test -- src/lib/r008-external-script-source.test.ts --reporter=dot` | RED exit 1; 1 test failed on the known loader URL, with booleanized assertions (no source dump) |
| `npm test -- src/lib/r008-external-script-source.test.ts --reporter=dot` | GREEN exit 0; 1 test passed on current redesign source |
| source scans of public shell/header/footer/listing/card | no File field reads in the scoped public shell; see 06 |
| hash-only public value scan and metadata-only HEAD probes | 17 unique observations; no bodies downloaded; see 06/07 |
| `npm run lint` | exit 0; ESLint completed without errors |
| `npm run typecheck` | exit 2; existing missing `@/components/product-video-player`, `normalizeMediaSrc`, `skills/ebos/skill-registry.json`, `@/lib/tool-category-groups`, plus one implicit-any diagnostic |
| `npm test -- --reporter=json` | final post-hardening run exit 1; 7 failed assertions across 8 files, 1,141 passed tests (599 passed suites, 15 failed suites). Failed files: `src/gateway/app.test.ts`, `src/lib/ai-geo-foundations-source.test.ts`, `src/lib/home-ai-news-label.test.ts`, `src/lib/public-content-canonical-slugs.test.ts`, `src/lib/public-content-db-fallback.test.ts`, `src/lib/seo-followup-source.test.ts`, `src/lib/site-audit-regressions.test.ts`, `src/lib/ebos/skills/__tests__/skill-registry.test.ts` |
| `npm run build` | exit 1; `prisma generate` succeeded, then Next compilation failed to resolve `@/components/product-video-player` and `@/lib/tool-category-groups` |
| `npm run lint` and `npm run typecheck` rerun after the focused-test source hardening | lint remained exit 0; typecheck remained blocked by the same baseline errors |
| final `npm run lint` and focused R-008 test | lint exit 0; focused test exit 0 with 1/1 passed |

## Recovery and evidence-integrity checks

| check | result |
|---|---|
| authorized temporary-directory manifest before first move | 2 JSON files: `deployment/post-launch/2026-07-03-optimized-page-redeploy-check.json` (3 bytes, SHA-256 `CA3D163BAB055381827226140568F3BEF7EAAC187CEBD76878E0B63E9E442356`) and `deployment/post-launch/2026-07-03-optimized-validation-page-redeploy.json` (706 bytes, SHA-256 `3821E003023A2F1C6E318936354998C26812430416720AE1CAB583539C7E5DE6`) |
| first quarantine move | source moved to `C:\Users\HU\Desktop\ENHE-Quarantine\tmp-ebos-optimized-redeploy-test-20260811-025331`; source absent; relative paths, sizes and SHA-256 identical |
| full-test side effect | the existing EBOS post-launch test recreates the same two-file directory under `process.cwd()`; no R-008 test writes it |
| second quarantine move | regenerated directory moved to `C:\Users\HU\Desktop\ENHE-Quarantine\tmp-ebos-optimized-redeploy-test-20260811-030328`; same two-file manifest and hashes verified |
| third quarantine move after final full test | regenerated directory moved to `C:\Users\HU\Desktop\ENHE-Quarantine\tmp-ebos-optimized-redeploy-test-20260811-032201`; same two-file manifest and hashes verified |
| PowerShell collector syntax parse | all Phase 1B `.ps1` collectors parsed with zero syntax errors |
| CSV structural validation | 02=`528x26`, 03=`145x8`, 04=`534x6`, 07=`18` data rows; no malformed records; all observed SHA-256 fields are 64 hex characters |
| secret/private-value scan | no secrets, cookies, credentials, complete private delivery URLs, or JSON bodies were written to the gate artifacts; only hash/domain/protocol/path-class metadata is retained |
| `git diff --check` | exit 0 |
| `git apply --check --unidiff-zero 12-R008-CODE-PATCH.diff` | unified-diff syntax parsed; expected exit 1 because the new R-008 test already exists in the working tree; the root section is explicitly marked a non-applicable redacted handoff note |
| scoped `src` source scan for ByteDance URL/loader/`beforeInteractive` | 0 duplicate loader hits outside the R-008 negative-contract test; root still contains `<AnalyticsTracker />` |

The R-006 CSV reconciliation was rechecked after correction: `MATCHED=494`, `CODE_PRODUCTION_DRIFT=32`, `NEEDS_DECISION=6`, `LANGUAGE_PARTNER_MISSING=2` (total 534). The two missing English partners are `/ai-news/agentic-ai` and `/ai-news/openai-workspace-agents-chatgpt-ai`; eight non-`/en` rows also reported `content-language=en-US` and remain an SEO-owner input.

Prohibited actions not run: Prisma migration/db push/seed, database connection, payment/refund/OAuth, deployment, Docker/Nginx mutation, remote change, push, checkout/switch/merge/rebase/reset/restore/clean/stash, and `git add .`.
