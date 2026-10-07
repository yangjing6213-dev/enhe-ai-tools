# Release runtime dependency repair — 2026-10-07

## Current remediation status — 2026-10-07

- The advisory exception was declined. Independent review found the previous local-directory override was malformed in `package-lock.json`: npm's virtual tree had no braces version and omitted `braces` from the audit request; the fork's `fill-range` dependencies were also absent. The audit-zero statement below was provisional and is superseded by this correction.
- Replaced the directory link with the first-party local tarball `vendor/braces-3.0.4-enhe.0.tgz`, declared directly in devDependencies and referenced by the `braces` override. The lock now records version `3.0.4-enhe.0`, tarball integrity, and `fill-range@7.1.1` → `to-regex-range@5.0.1` → `is-number@7.0.0`. Docker copies the tarball before `npm ci`.
- TDD: the lock-integrity test failed against the malformed lock; a second test reproduced an invalid-AST expansion path that reset the depth counter. After repairing both, the focused security suite passes 10/10.
- Scope extension: independent review confirmed local Compose uses the repository-root `Dockerfile`, which also needs the local archive before `npm install`. Added it to the owned paths, added a source regression check that first failed and now passes, and copied the archive before its install step.
- Scope extension: the DB-free Playwright run exposed a test-only serialization assumption: source token `#ffffff` becomes equivalent browser output `#fff`. Added `tests/e2e/typeshare-alignment.spec.ts` to the owned paths and now compare the rendered RGB color; the focused suite passed 24/24 without changing page CSS.
- PASS: clean installs in the release worktree and a separate temporary directory each installed 590 packages and audited with zero vulnerabilities. Both trees show local `braces@3.0.4-enhe.0` at the root and under the lint dependency chain. Captured npm's actual bulk-audit request and confirmed it contains `braces: ["3.0.4-enhe.0"]`; a fresh official-registry full audit reports zero vulnerabilities.
- PASS: fresh release Docker build includes the local tarball, audits zero, prunes 451 development packages, audits zero in the production layer, and builds image `enhe-braces-local-check:20261007132515`. Final-image audit with `--omit=dev` reports zero vulnerabilities; runtime checks confirm `braces`, `micromatch`, `fast-glob`, `eslint-config-next`, `vitest`, and `vite` are absent while Prisma and `tsx` remain available.
- PASS: root local Docker dependency stage `enhe-local-deps-check:20261007134635` built successfully; its `npm install` audited zero vulnerabilities and the image resolved `braces@3.0.4-enhe.0` and `fill-range` from `/app/node_modules`.
- PASS: database-free Playwright full run had 305 passed, 56 skipped, and 8 failures caused only by comparing the minified token text `#fff` to source spelling `#ffffff`. The 8 failed route cases passed in the focused 24-test TypeShare suite after the assertion was changed to compare computed RGB color. Combined unique E2E evidence: 313 passed, 56 skipped, zero remaining failures.
- PASS: full unit suite after Prisma client generation: 488 files passed, 9 skipped; 2,481 tests passed, 90 skipped. `npm run lint` and `npm run typecheck` pass.
- PASS: final-image HTTP smoke: `/`, `/about` and `/ai-news` all returned 200 in a temporary local container using only loopback placeholder database URLs and a dummy local auth secret. The initial attempt returned 500 because the required test-only `AUTH_SECRET` was omitted; the corrected local run passed. No production settings were read.
- PASS: Gitleaks scanned all 22 in-scope text/source files with the existing exact-path SHA-256 false-positive disposition; no new secret findings. The local archive digest matches the package-lock integrity record.
- PASS: independent read-only review found no additional P0–P2 issues. It confirmed the root Dockerfile copies the local package before install and the TypeShare assertion still requires rendered white, allowing only equivalent browser color serialization.
- NOT_RUN: production database access/migration, Git commit, GitHub push and Tencent deployment. Production remains on the old healthy image pending the complete local release workflow and exact candidate review.

## Contract

Goal: complete the authorized GitHub update and Tencent Cloud deployment using a release whose runtime excludes vulnerable development tools and whose complete dependency findings have an explicit disposition. Preserve website behavior, content, production data and environment files.

Owned paths: package.json, package-lock.json, scripts/push-and-deploy.ps1, src/lib/release-workflow-source.test.ts, tests/e2e/typeshare-alignment.spec.ts, docs/tencent-cloud-push-deploy-workflow.md, deploy/enhe-ai-tools/Dockerfile, Dockerfile, vitest.config.ts, tests/security/braces-depth.test.ts, vendor/braces/** and this plan. Implementation changes outside these paths require evidence of compatibility failures and a scope update. No forced Git operation, remote history rewrite, credential exposure, environment edit, content publishing or unrelated cleanup.

## Evidence and status

- verified: release 7a0b0e2 pushed to codex/enhe-recovery-baseline; full local checks passed (2468 unit tests, 90 skipped; production E2E 237 passed, 132 skipped; lint/typecheck/build; migration paths and deployment shell checks).
- verified: mobile stress wait correction passed 10 repetitions and read-only review; changed test completion checks, not production menu behavior.
- failed: server HTTPS fetch lacked noninteractive credentials. Verified current-release objects were transferred over authorized SSH instead of historical objects.
- failed: ordinary server account could not read root-owned 0600 configuration. Existing sudo authorization was used without changing configuration contents or permissions.
- failed: fresh official-registry runtime audit found 19 advisories (4 critical, 8 high, 7 moderate). Server image build was stopped before writer shutdown or production migration.
- verified: old app image 1aa5a367c5b9cd87765ff4e759a41c4f3aa2daa8 remains running/healthy; local server health returned HTTP 200. Remote Git checkout 7a0b0e2 is not evidence of runtime cutover.
- verified: release workflow now fails before build/push on high/critical runtime advisories. Source regression failed before implementation, then passed 30/30.
- in_progress: smallest compatible dependency upgrades, primary-source compatibility checks and focused validation.
- pending: fresh full release gate, secret and diff checks, scoped commit/push, exact snapshot transfer, guarded server deployment, backup/rollback and active-runtime verification.

## Acceptance

1. Actual production dependency image has no high/critical findings and excludes lint/test tools. Complete-tree audit includes dev/optional/peer and has no high/critical findings. If no upstream fix exists, any local fork must contain a reviewed source fix, preserve package behavior, carry upstream attribution/license, pass adversarial depth and compatibility checks, and remain visible as a project-maintained dependency.
2. Focused compatibility checks plus full tests, lint, typecheck, production build/E2E and migration/shell gates pass. Skips stay separately reported.
3. GitHub SHA, server checkout, OCI image revision and active runtime match; app/worker/scheduler and public health checks pass. Record backup and rollback identities without secrets.

Stop on genuine security findings, unknown ownership, unexpected production data effects, migration/backup failure, repository access restriction or failed health gates. Do not weaken tests or bypass checks to publish.

## Isolation correction

Runtime dependencies now audit at zero. Complete tree has five high findings propagated from one unpatched braces advisory (GHSA-vfj7-8cjw-p6xm). Vitest4.1.11 removes prior critical test-tool findings; existing Next lint checks retained. Production-deps stage prunes development dependencies; Prisma and tsx remain available as runtime dependencies for deployment and workers. Source regression: first failed, then 31/31 passed. Full dependency gate remains fail-closed, including explicit include flags; deployment still paused pending verification/disposition.

## Compatibility correction

Vitest4/Vite8 preserved Next tsconfig JSX, producing real import-analysis/JSX failures (35 suites failed). Test-only oxc.jsx runtime classic restores existing React.createElement semantics without altering assertions or product behavior. Focused54 passed; fresh full run487 files/2470 tests passed,90 skipped. Typecheck passed. Production build and dependency-image checks in progress.

## Final local verification — 2026-10-07

- PASS: fresh unit tests 487 files / 2470 tests, 90 skipped; production E2E 237 passed, 132 skipped; lint, typecheck, production build (121 routes), source regressions and diff check.
- PASS: final Linux image enhe-security-review-local:20261007 built successfully. Actual final image dependency audit reports zero runtime vulnerabilities; eslint-config-next, @next/eslint-plugin-next, fast-glob, micromatch, braces, vitest and vite are absent. Prisma 6.19.3 Linux CLI runs with network disabled; tsx and application runtime packages resolve.
- PASS: DB-free final-image browser HTTP smoke checks /, /about and /ai-news return 200. Temporary smoke container stopped and removed.
- NOT_RUN: production-connected health verification of repaired image. Local /api/health?scope=app returns 503 because this deliberately DB-free container has no database, worker configuration or release identity; route explicitly requires them even for app scope. This is not a passing health result.
- FAIL: complete dependency audit still reports five high findings propagated from unpatched build-tool advisory GHSA-vfj7-8cjw-p6xm. No exception or bypass implemented. Proposed disposition, pending owner decision: permit only this exact advisory for the documented development-only chain, bind to reviewed lockfile and verify absence from final image; reject all other high/critical findings. This is a new security risk decision, not renewed GitHub/deployment permission.
- PASS: fresh remote read-only health returns 200; server Git checkout remains 7a0b0e2e4a700a63376104bd32df5bd418503fa9. Repaired changes are local/uncommitted and have not been pushed or deployed. Production migration remains NOT_RUN.
- Remaining: disposition decision, update release gate only if approved, focused regression/review of that change, scoped commit/push and guarded deployment with actual runtime/rollback verification. Existing valid verification is reused unless affected by subsequent changes.

## Owner decision brief — exact development-tool advisory exception (declined)

- Advisory: GHSA-vfj7-8cjw-p6xm / CVE-2026-93687, GitHub-reviewed HIGH, CVSS 8.7. It affects `braces` <=3.0.3; GitHub lists no patched release. The described impact is Node.js process availability through stack exhaustion when parsing deeply nested brace patterns; no confidentiality or integrity impact is listed. Source: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm (reviewed 2026-10-07).
- Current exact lockfile chain: `eslint-config-next@15.5.27` → `@next/eslint-plugin-next@15.5.27` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`. A fresh official-registry complete audit reports five HIGH package records, all propagated from this one advisory; 0 critical, 0 moderate, 0 low. The final Linux runtime image has none of these five packages and its runtime-only audit reports 0 vulnerabilities.
- Remaining exposure if accepted: a developer or CI lint operation that processes attacker-controlled brace patterns could crash its Node.js process. The evidence does not establish that such untrusted patterns reach the lint tool in this project; do not represent that as impossible.
- Proposed narrow control, pending owner decision: permit only GHSA-vfj7-8cjw-p6xm and only the five package records in the chain above, bound to SHA-256 `135124673E20DE76C9DAB359061ED0F82270AF7C6C8F6E4FE3B8959441AEBB12` for `package-lock.json`; keep full dev/optional/peer audit enabled and fail on every other advisory, any changed chain/version, any new finding, any production-image occurrence, or any audit/registry error. Recheck GitHub advisory status and image package absence for every release. Expire the exception as soon as a patched `braces` release can be adopted, or when this lockfile changes; require a new owner decision to renew it.
- Owner decision on 2026-10-07: declined the exception and requested a real repair before release continues. No exception has been activated and no gate weakened.
- Official npm has no release newer than 3.0.3, and upstream fix PR #72 is closed without merge. Its review thread reports compatibility changes, so it is not copied blindly. A local MIT-licensed derivative of the published 3.0.3 package is now being evaluated as the narrow repair: fixed nesting cap across parsed input and recursive AST operations, with a local version identifier outside the advisory's affected range. The package remains in the complete dependency audit; the audit rule itself remains unchanged.
- TDD evidence: new `tests/security/braces-depth.test.ts` first ran against unmodified braces@3.0.3: 5 intended safety checks failed because the vulnerable parser/AST operations accepted depth 101; the depth-100 boundary check passed. This confirms the targeted behavior is missing before the patch.
- Acceptance for this repair: no braces version <=3.0.3 in the resolved dependency tree; complete npm audit 0 high/critical; the five regression checks pass; all prior relevant lint/typecheck/unit/E2E/build gates rerun only when affected by final changes; final image remains free of development lint/test packages.
