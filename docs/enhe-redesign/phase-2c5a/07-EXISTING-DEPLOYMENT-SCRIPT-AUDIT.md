# Existing Deployment Script Audit

This is a static, read-only audit. Script bodies were not copied into this package and no script was executed. The tracked environment-template body was not read.

## Orchestrators and runtime helpers

| scriptPath | pullBehavior | buildBehavior | migrationBehavior | seedBehavior | nginxBehavior | restartBehavior | rollbackBehavior | productionHardCoding | stagingSafe | requiredChanges |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `scripts/push-and-deploy.ps1` | Fetches and checks out a requested remote revision; no `git pull` | Delegates remote deployment | Delegated | None observed | None | Delegated | Retains previous release reference but no dedicated-Staging rollback contract | Yes; production-only connection and project contract | `NO` | Never reuse target; create a separate Staging wrapper and require candidate-ID mismatch before connection |
| `deploy.sh` | None | Compose build | Runs migration preflight/deploy paths | No automatic seed observed | None | Compose start plus health checks | Preserves recovery state and has rollback/recovery branches | Yes; current Compose/environment/release layout | `NO_AS_IS` | Bind a dedicated Compose project, environment, volumes, logs, ports, image digest, backup, and failure policy |
| `deploy/enhe-ai-tools/scripts/app-entrypoint.sh` | None | None | None | None | None | Process entry only | None | Package-bound | `CONDITIONAL` | Use only under the approved isolated runtime and digest |
| `deploy/enhe-ai-tools/scripts/enhe-backup-db.sh` | None | None | None | None | None | None | Creates DB backup input | Package-bound | `CONDITIONAL` | Dedicated DB only; hash backup and prohibit production target |
| `deploy/enhe-ai-tools/scripts/enhe-health-watch.sh` | None | None | None | None | None | Health monitoring | Failure reporting only | Environment-bound | `CONDITIONAL` | Dedicated logs/endpoint, no production notification channel, strict failure threshold |
| `deploy/enhe-ai-tools/scripts/enhe-init-admin.sh` | None | None | None | None | None | None | None | Mutates administrative state | `NO` | Disable for public-surface Staging unless separately authorized |
| `deploy/enhe-ai-tools/scripts/enhe-install-cron.sh` | None | None | None | None | None | Installs scheduled health task | None | Host scheduler mutation | `NO` | Disable; scheduler installation requires separate authority |
| `deploy/enhe-ai-tools/scripts/enhe-logs.sh` | None | None | None | None | None | Reads runtime logs | None | Compose-bound | `CONDITIONAL` | Dedicated log directory, retention, redaction, and target-specific labels |
| `deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh` | None | None | None | None | None | None | Operation-lock cleanup | Shared lock semantics | `CONDITIONAL` | Dedicated lock namespace/path and fail-closed cleanup |
| `deploy/enhe-ai-tools/scripts/enhe-recover-pre-migration-runtime.sh` | None | None | Recovery around migration state | None | None | May restore runtime | Pre-migration recovery | Runtime-bound | `CONDITIONAL` | Dedicated target, prior digest, backup hash, rollback authority, health gate |
| `deploy/enhe-ai-tools/scripts/enhe-restore-db.sh` | None | None | Restore support | None | None | None | Database restore | Contains production-oriented guards/layout | `NO_AS_IS` | Separate Staging-only restore wrapper and explicit backup/authority checks |
| `deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh` | None | None | Migration compatibility checks | None | None | Compose rollback/restart and health | App rollback | Compose/environment-bound | `CONDITIONAL` | Dedicated project, previous digest/manifest, isolated env, health threshold, operator approval |
| `deploy/enhe-ai-tools/scripts/enhe-seed.sh` | None | None | None | Runs seed when invoked | None | None | None | Mutates data | `NO` | Do not invoke; replace with reviewed sanitized public fixtures in a later phase |
| `deploy/enhe-ai-tools/scripts/enhe-start.sh` | None | None | Includes migration/start preflight | Does not itself approve data mode | None | Compose start and health | Preserves rollback inputs | Compose/environment-bound | `NO_AS_IS` | Invoke only through separate Staging wrapper after all target inputs are proved |
| `deploy/enhe-ai-tools/scripts/enhe-stop.sh` | None | None | None | None | None | Stops package runtime | None | Compose-bound | `CONDITIONAL` | Exact dedicated project/labels only; never fuzzy-match containers |
| `deploy/enhe-ai-tools/scripts/enhe-verify-rollback-compatibility.sh` | None | None | Verifies migration compatibility | None | None | Health/compatibility probes | Rollback verifier | Runtime/volume-bound | `CONDITIONAL` | Dedicated volumes, backup, previous digest, and target identity required |
| `deploy/enhe-ai-tools/scripts/legacy-rollback-compatibility.cjs` | None | None | Compatibility helper | None | None | None | Legacy rollback helper | Legacy package semantics | `NO_AS_IS` | Use only if a reviewed Staging rollback path explicitly requires it |
| `deploy/enhe-ai-tools/scripts/preflight-production-database.sql` | None | None | Readiness/preflight SQL | None | None | None | None | Explicit production-oriented database contract | `NO` | Do not execute on Staging; create a Staging-specific read-only preflight if required |

## Heartbeat, tests, and background-job scripts

| scriptPath | pullBehavior | buildBehavior | migrationBehavior | seedBehavior | nginxBehavior | restartBehavior | rollbackBehavior | productionHardCoding | stagingSafe | requiredChanges |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `deploy/enhe-ai-tools/scripts/runtime-heartbeat-contract.test.mjs` | None | None | None | None | None | Test only | Test only | No target | `NOT_A_DEPLOYER` | No deployment use |
| `deploy/enhe-ai-tools/scripts/runtime-heartbeat-engine-fixture.mjs` | None | None | None | None | None | Fixture only | Fixture only | No target | `NOT_A_DEPLOYER` | No deployment use |
| `deploy/enhe-ai-tools/scripts/runtime-heartbeat-engine-protocol.test.mjs` | None | None | None | None | None | Test only | Test only | No target | `NOT_A_DEPLOYER` | No deployment use |
| `deploy/enhe-ai-tools/scripts/runtime-heartbeat-lifecycle.mjs` | None | None | None | None | None | Lifecycle helper | Stop/cleanup lifecycle | Runtime-bound | `CONDITIONAL` | Isolated state/log paths and owner policy |
| `deploy/enhe-ai-tools/scripts/runtime-heartbeat-state-store.test.mjs` | None | None | None | None | None | Test only | Test only | No target | `NOT_A_DEPLOYER` | No deployment use |
| `deploy/enhe-ai-tools/scripts/runtime-heartbeat.mjs` | None | None | None | None | None | Runtime heartbeat | Fail/cleanup state | Production-mode semantics exist | `CONDITIONAL` | Dedicated state/log path; no production endpoint or notification |
| `deploy/enhe-ai-tools/scripts/runtime-heartbeat.test.mjs` | None | None | None | None | None | Test only | Test only | No target | `NOT_A_DEPLOYER` | No deployment use |
| `deploy/enhe-ai-tools/scripts/seo-audit-scheduler.mjs` | None | None | None | None | None | Scheduler | None | External side-effect surface | `NO` | Disable in first Staging deployment |
| `deploy/enhe-ai-tools/scripts/seo-audit-worker.mjs` | None | None | None | None | None | Background worker | None | External side-effect surface | `NO` | Disable in first Staging deployment |
| `deploy/enhe-ai-tools/scripts/validate-deploy-config.ts` | None | None | Static validation | None | None | None | None | No target | `READ_ONLY_VALIDATOR` | Re-run only against a future Staging-specific manifest without secret values |

## Root EBOS deployment/redeployment artifacts

These tracked files were read because their names and contents are deployment-related. They generate, parse, audit, or record EBOS production workflow artifacts; they are not the public-surface Staging deployer and must not be invoked by Phase 2C.5B.

| scriptPath | pullBehavior | buildBehavior | migrationBehavior | seedBehavior | nginxBehavior | restartBehavior | rollbackBehavior | productionHardCoding | stagingSafe | requiredChanges |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `scripts/approve-ebos-deployment-execution.ts` | None | None | None | None | None | None | None | Production approval contract | `NOT_A_STAGING_DEPLOYER` | Exclude from public-surface Staging execution |
| `scripts/audit-ebos-deployment-commands.ts` | None | None | Audits command/migration artifacts | None | None | None | None | EBOS deployment contract | `NOT_A_STAGING_DEPLOYER` | Keep as read-only EBOS audit only |
| `scripts/check-ebos-deployment-execution-status.ts` | None | None | None | None | None | None | None | EBOS approval/execution state | `NOT_A_STAGING_DEPLOYER` | Exclude |
| `scripts/check-ebos-optimized-page-redeploy.ts` | None | None | None | None | None | None | None | Redeploy verification workflow | `NOT_A_STAGING_DEPLOYER` | Exclude; no live checks in Phase 2C.5A/5B without separate authority |
| `scripts/check-ebos-production-deployment-preflight.ts` | None | None | Checks production migration preflight | None | Checks production Nginx preflight | None | None | Explicit production contract | `NOT_A_STAGING_DEPLOYER` | Do not reuse; create Staging-specific preflight |
| `scripts/check-ebos-server-deployment-result-input.ts` | None | None | None | None | Validates recorded Nginx result input | None | None | Server-result contract | `NOT_A_STAGING_DEPLOYER` | Exclude |
| `scripts/generate-ebos-deployment-approval-gate.ts` | None | None | None | None | None | None | None | Production approval artifacts | `NOT_A_STAGING_DEPLOYER` | Exclude; Phase 2C.5 uses its own approval receipt |
| `scripts/generate-ebos-deployment-execution-runbook.ts` | None | None | Documents migration behavior | None | Documents only | Documents only | Documents rollback only | Production runbook | `NOT_A_STAGING_DEPLOYER` | Exclude |
| `scripts/generate-ebos-deployment-operator-checklist.ts` | None | None | Checklist only | None | Checklist only | Checklist only | Checklist only | Production operator workflow | `NOT_A_STAGING_DEPLOYER` | Exclude |
| `scripts/generate-ebos-optimized-validation-page-redeploy-report.ts` | Records source/build evidence only | Reports build requirements | None | None | Reports Nginx evidence | None | None | Production redeploy report | `NOT_A_STAGING_DEPLOYER` | Exclude |
| `scripts/generate-ebos-production-deployment-execution-report.ts` | None | None | Reports only | None | Reports only | Reports only | Reports only | Explicit production contract | `NOT_A_STAGING_DEPLOYER` | Exclude |
| `scripts/generate-ebos-production-deployment-plan.ts` | Plans only | Plans only | Plans only | None | Plans only | Plans only | Plans rollback only | Explicit production contract | `NOT_A_STAGING_DEPLOYER` | Do not reuse as Staging plan |
| `scripts/generate-ebos-server-deployment-command-pack.ts` | None | None | Generates command text only | None | Generates Nginx command text only | Generates command text only | None | Server command-pack contract | `NOT_A_STAGING_DEPLOYER` | Exclude; executable command packs require separate authority |
| `scripts/parse-ebos-deployment-approval-response.ts` | None | None | None | None | None | None | None | EBOS approval parser | `NOT_A_STAGING_DEPLOYER` | Exclude |
| `scripts/record-ebos-server-deployment-result.ts` | None | None | Records result only | None | Records result only | Records result only | Records result only | Production/server result contract | `NOT_A_STAGING_DEPLOYER` | Exclude |
| `scripts/start-ebos-production-deployment-execution.ts` | None | None | Starts approval-state workflow, not migration here | None | Production precondition only | None | None | Explicit production contract | `NOT_A_STAGING_DEPLOYER` | Never invoke for public-surface Staging |

## Docker, Compose, Nginx, and log configuration

Non-script artifacts use the same audit columns. Their “behavior” describes declarative capability; none was executed.

| scriptPath | pullBehavior | buildBehavior | migrationBehavior | seedBehavior | nginxBehavior | restartBehavior | rollbackBehavior | productionHardCoding | stagingSafe | requiredChanges |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Dockerfile` | None | Defines production-mode standalone build | None | None | None | None | None | Production runtime mode, no target identity | `CONDITIONAL_BUILD_INPUT_ONLY` | Build pinned digest only; never treat as target contract |
| `deploy/enhe-ai-tools/Dockerfile` | None | Defines package runtime build | None | None | None | None | None | Package-bound | `CONDITIONAL_BUILD_INPUT_ONLY` | Immutable digest plus Staging-only wrapper |
| `deploy/docker-compose.local.yml` | None | Declarative local runtime only | None | None | None | Declares restart behavior | None | Local/development contract | `NO_AS_STAGING_TARGET` | Do not reuse as dedicated Staging |
| `deploy/enhe-ai-tools/docker-compose.yml` | None | No deployment build proof | Declarative DB/runtime only | No automatic seed proof | None | Declares restart and health behavior | No automatic rollback | Existing package environment/volumes/names | `NO_AS_IS` | Derive separate Staging manifest with isolated project, env, network, volumes, ports, side effects, and digest |
| `deploy/enhe-ai-tools/.env.example` | `NOT_READ_POLICY` | `NOT_READ_POLICY` | `NOT_READ_POLICY` | `NOT_READ_POLICY` | `NOT_READ_POLICY` | `NOT_READ_POLICY` | `NOT_READ_POLICY` | `NOT_READ_POLICY` | `NOT_READ_POLICY` | `NOT_READ_POLICY` |
| `deploy/enhe-ai-tools/README.md` | None | Documentation only | Documentation only | Documentation only | Documentation only | Documentation only | Documentation only | Existing package documentation | `NOT_A_DEPLOYER` | Do not treat documentation as target proof |
| `docker/nginx.conf` | None | None | None | None | Generic Nginx configuration | None | None | No dedicated Staging identity/TLS/access/noindex | `NO_AS_IS` | Create dedicated Staging virtual-host/proxy contract |
| `deploy/enhe-ai-tools/nginx/csp-report-rate-limit-http.conf` | None | None | None | None | CSP-report rate-limit fragment | None | None | Package fragment only | `NO_AS_STAGING_TARGET` | Include only after Staging log/privacy review |
| `deploy/enhe-ai-tools/nginx/csp-report-rate-limit-location.conf` | None | None | None | None | CSP-report location fragment | None | None | Package fragment only | `NO_AS_STAGING_TARGET` | Include only after Staging proxy review |
| `deploy/enhe-ai-tools/logrotate/enhe-csp-report` | None | None | None | None | None | Log-rotation declaration | None | Existing log path/retention contract | `NO_AS_IS` | Dedicated log path, retention, ownership, and redaction proof |

## Blocking findings

- Unpinned `git pull`: not present. The production orchestrator fetches and verifies an explicit release reference before detached checkout.
- Automatic seed: not present in the main deployment path. The separate seed script remains prohibited for the first Staging deployment.
- Automatic production Nginx mutation/reload: not present; tracked Nginx material is static and incomplete for Staging.
- Fuzzy container selection: not found; Compose service selection is used.
- Existing remote orchestration is bound to a production-only connection reference.
- Existing production Compose, environment, fixed container names, and external volumes are core Staging blockers.
- The deployment performs an on-target build, in-place source checkout, and forced container recreation.
- Health checks exist, but health failure yields manual recovery guidance rather than an automatic approved rollback.
- `deploy.sh` contains pipelines without `pipefail` and selected best-effort probes; the Staging wrapper must fail closed.
- No dedicated host/domain/TLS/access/log/registry/backup/rollback authority exists.
- Seed, admin initialization, cron, scheduler, worker, and other side effects must remain disabled.
- Health and rollback helpers exist, but they do not establish target identity or production separation.
- No fuzzy resource selection is permitted in a future wrapper; exact project, label, digest, and backup identities are mandatory.

```text
EXISTING_DEPLOYMENT_SCRIPT_STAGING_SAFETY=REQUIRES_SEPARATE_STAGING_WRAPPER
EXISTING_PRODUCTION_ORCHESTRATOR_REUSABLE_AS_STAGING=NO
DEPLOYMENT_SCRIPT_MODIFIED=NO
DEPLOYMENT_SCRIPT_EXECUTED=NO
```
