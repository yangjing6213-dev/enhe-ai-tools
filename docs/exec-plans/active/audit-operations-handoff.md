# OPS-001—005 production remediation handoff

Status: LOCAL_PASS / PRODUCTION_NOT_RUN. The production environment has only been inspected, not changed by this worker. Root owns all production execution and final verification.

## Contract

- Scope: repair automatic backups, independent gateway ownership, conservative SSH/port restrictions, non-root resource-bounded runtime, retire exact historical drill containers.
- Preserve existing database volumes, uploads, current key-based SSH, the live 3030 promotion-manager proxy and unrelated hot-content services.
- Main agent owns production execution and deployment. This worker prepares code, an auditable operation package and isolated tests.
- Baseline: 7bc60da65492b85208065b9cad3952fd6f07ff1b; branch codex/full-audit-remediation-20261018.

## Evidence and decisions

- Cron currently runs as ubuntu; 86/103 dumps are root-owned. Existing chmod over all old archives aborts before a new backup is created. Backup/health/order-expiry jobs will be moved to root while preserving unrelated cron entries.
- Latest three dump hashes/archive directories passed read-only checks. Full database restore was not performed by this worker.
- Gateway hot-content-nginx uses the enhe-ai-tools-net and hot-content-os_default networks, and reads a bind-mounted configuration inside the old project directory. Copy its entire configuration unchanged rather than rebuilding selected routes. Keep original stopped gateway as recovery point.
- All current root locations overwrite X-Real-IP with $remote_addr. Keep this behavior; do not trust a client-supplied X-Forwarded-For prefix.
- node in the official Node image uses UID/GID1000. Current secret keys already belong to UID1000 and mode600. Upload/media/log directories currently belong to root; production preparation must fix those scoped mounts before deploying USER node. A new private-uploads mount persists private payment proofs under /app/private-uploads/payment-proofs; its root is mode700, separate from public uploads. Existing forum-media remains a nested dedicated mount.
- SSH password/root-password login will be disabled, but root public-key access remains available. Restrict only inbound eth0 ports3000/8000/5432/6379/3030; never change the INPUT policy or touch22/80/443. Do not flush existing firewall rules.
- Retire only12 explicitly identified temporary drill containers; retain three stable staging containers because their continued operational use has not been disproven. Do not delete volumes, images, whole old projects or shared gateway assets.

## Production sequence and acceptance

1. Finish local release checks, push the reviewed branch, verify the remote clean state and check out its exact approved SHA. Running containers still use the previous image. Run preparation using the now-present reviewed scripts; a separately uploaded package is also supported if it contains the matching enhe-install-cron.sh beside the Python entrypoint. New cron commands refer to the production repository, so the new shell files must already be checked out.
2. Create a separate fresh verified backup **before deploy.sh**: its `compose up -d db` occurs before its normal backup, and this release adds DB resource/log settings that can recreate the DB container. Allow a brief restart and preserve the existing external DB volume. Root must perform the existing isolated restore verification, then the normal release workflow with an explicit RELEASE_REF.
3. After full application acceptance, migrate the gateway, restrict access with timed rollback, and retire exact drill containers as separate phases. Keep their containers, images and volumes as recovery points. No Docker prune, volume deletion, shared-stack deletion, unrelated cron removal or firewall flush is included.

All operations below require root on the production host. The Python package uses exactly the same `deploy/enhe-ai-tools/runtime/enhe-operation.lock` as deployment/backup, and validates inherited fd9 when called inside the existing lock wrapper. Preflight checks required executables before mutations. `prepare-runtime` takes the full permission/cron/config snapshot before changes and compensates automatically on failure. System configuration and journal data stay root-only under `/opt/enhe-operations-backups/audit-20261018`. Repeating an already journaled phase refuses to overwrite its recovery point.

```sh
cd /opt/enhe-ai-tools
export APP_DIR=/opt/enhe-ai-tools
python3 deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py plan
python3 deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py prepare-runtime

# This separate backup must precede deploy.sh's DB recreation.
BACKUP_FILE="$(sh deploy/enhe-ai-tools/scripts/enhe-backup-db.sh)"
(cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "$BACKUP_FILE").sha256")
docker exec -i enhe-ai-tools-db pg_restore --list < "$BACKUP_FILE" >/dev/null
sh deploy/enhe-ai-tools/scripts/enhe-check-backup.sh
# Then the root-owned release workflow: isolated restore check and deploy.sh
# using the exact approved RELEASE_REF, never an unverified branch name.
```

Backup default retention is temporarily conservative (36500 days), matching the deployment preservation policy. This repair will not clean up the current 103 backups (~234 MiB). Define a shorter lifecycle only after a separate retention decision. The freshness monitor requires a valid checksum and an archive younger than26hours; site health alone cannot mask a stalled backup. Failed SMTP delivery does not set the suppression timer. No test emails were sent; SMTP/recipient presence was verified without exposing values. The existing alert mechanism depends on the app container being able to run the SMTP sender; an independent external availability monitor remains outside this operations repair.

After normal release, validate:

```sh
docker inspect -f '{{.Name}} user={{.Config.User}} memory={{.HostConfig.Memory}} pids={{.HostConfig.PidsLimit}} log={{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}' enhe-ai-tools-app enhe-ai-tools-seo-audit-worker enhe-ai-tools-seo-audit-scheduler enhe-ai-tools-db
docker exec enhe-ai-tools-app id
curl -fsS --max-time 15 http://127.0.0.1:3001/api/health
sh deploy/enhe-ai-tools/scripts/enhe-check-backup.sh
crontab -l | grep 'enhe-ai-tools launch operations'
crontab -u ubuntu -l | grep 'enhe-ai-tools launch operations' || true
```

Expected: app/worker/scheduler user1000:1000, rootless process UID1000, all health endpoints/worker heartbeat release identities good, DB original volume unchanged, bounded json-file logs10m×5, root has exactly three ENHE cron entries and ubuntu has none. New runtime cache and private upload writes must work through normal authorized application paths; do not create a real payment/order for a smoke test.

The preparation rollback is:

```sh
python3 /opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py rollback-runtime
```

Use it only together with a suitable application rollback, because restoring the original root-owned mount permissions while a non-root app continues to run can prevent writes. New files created after the snapshot are preserved. Application rollback and restart scripts now derive the user from the **verified immutable image**: the root/0/empty whitelist maps to0:0; node/1000 maps to1000:1000; any other user fails closed before Compose changes. Only a verified historical root image receives the single DAC_OVERRIDE capability needed to write current node-owned private mounts. The temporary mode600 Compose override is removed at exit; normal deployments remain hard-pinned to node with cap_drop ALL. Pre-migration recovery starts the original containers without changing their users, and validates the user whitelist before doing so. Existing deploy recovery commands remain the correct entry point; no automatic database restore was added.

Gateway phase and rollback:

```sh
python3 /opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py migrate-gateway
# Emergency rollback, if the automatic failed-canary rollback did not suffice:
python3 /opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py rollback-gateway
```

The new `/opt/enhe-edge/compose.json` pins the currently running immutable Nginx image and both original networks. The complete config is copied byte-for-byte; the package verifies expected 3030 routes and X-Real-IP override exist, runs `nginx -t` before switching, then tests trusted TLS/local HTTPS health and unchanged statuses for both promotion-manager prefixes. Read-only production verification found `/promotion-manager/` and `/api/promotion-manager/` both return404, including direct requests to127.0.0.1:3030 with the same Host header. The package preserves this existing edge/upstream agreement and rejects5xx/unreachable/mismatching outcomes; it does not claim that the3030 application's business interface is healthy. The old gateway is stopped with restart=no, never deleted. A failed canary restores the original container and certificate hook automatically. The renewal hook subsequently validates/reloads the active new gateway, with old-gateway fallback. Verify live external HTTPS, both promotion-manager route baselines, `docker exec enhe-edge-nginx nginx -t`, the existing certbot timer and hook before accepting. The certificate files remain in `/etc/letsencrypt`; no certificate/key content enters the journal or output.

Access phase:

```sh
python3 /opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py harden-access
```

This arms an automatic rollback in5minutes **before** changing SSH/firewall, verifies SSH syntax/effective settings, preserves public-key access including emergency root key access, and reloads SSH without restarting it. If a backup/deployment holds the project lock when the timer fires, only this emergency rollback waits until that operation finishes; it is not lost due to a lock conflict. Confirmation rechecks SSH/guard state and cancels both the timer and any waiting rollback service. Port drops apply only on incoming eth0 traffic to3000/8000/5432/6379/3030 in INPUT and DOCKER-USER. SSH22/HTTP80/HTTPS443, Docker bridge traffic to3030, unrelated firewall rules and default policies are unchanged. The dedicated systemd guard persists across boot/Docker restarts. Do not hold the project lock in an interactive session while waiting for another connection to confirm.

Open a **new key-only SSH connection** from the workstation with BatchMode=yes and StrictHostKeyChecking=yes; verify external HTTPS plus promotion-manager, then execute in that new connection:

```sh
sudo -n python3 /opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py confirm-access
# Manual emergency reversal (also run by the armed timer if not confirmed):
sudo -n python3 /opt/enhe-operations-backups/audit-20261018/operations.py rollback-access
```

Acceptance: fresh key authentication succeeds; `sshd -T` reports passwordauthentication=no, kbdinteractiveauthentication=no, pubkeyauthentication=yes and permitrootlogin=prohibit-password/without-password;80/443 remain reachable; tested private ports are not externally reachable; localhost/Docker3030 connectivity and measured route status baselines are preserved. Cloud firewall settings are not modified and remain a separate layer.

Historical drill phase:

```sh
python3 /opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py retire-legacy
# Restore exactly the previously recorded running/restart states:
python3 /opt/enhe-ai-tools/deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py rollback-legacy
```

The package contains the exact12 names from the audit (see `plan` output). It rechecks age, current identity, production DB target, Nginx references, retained-container links/URLs/network aliases and shared mounts before stopping anything. All three stable staging services and unrelated hot-content services are retained. Acceptance: these12 are stopped/restart=no, main/full health and other retained services remain normal, memory/process counts decrease, recovery manifest exists. No promised disk-space saving: images/volumes are deliberately retained.

## Executed local verification

- PASS: Linux offline Python tests,21/21: command secrecy, canonical/symlink bounds, exact candidate exclusions, shared mount/DB/reference guards, gateway canary failure rollback, existing upstream404 preservation while rejecting proxy failures, SSH validation/timer ordering, cron/permission compensation, journal overwrite refusal, global lock contention/inherited fd9, emergency rollback waiting for backup lock and cancellation of timer plus queued service.
- PASS: `scripts/test-backup-monitoring.sh` in isolated Debian container with no network: missing/incomplete/damaged/stale/fresh backups, invalid age, alert retry after SMTP failure, healthy recovery, root-first cron migration and preservation of unrelated jobs. SMTP/Docker mocked; no real email or production mutation.
- PASS: existing `scripts/test-release-shell-behavior.sh` in isolated Debian: global lock, legacy restart, same-second backup uniqueness, private new backup mode600, preservation of old recovery points and original-container recovery.
- PASS: `scripts/test-runtime-user-recovery.sh`: root legacy rollback/restart, node rollback/restart, only root gets DAC_OVERRIDE, unknown user refusal, temporary override removal, normal production node pin retained.
- PASS: real local Docker permission experiment with an isolated named volume: root+cap_drop ALL cannot actually write a node-owned mode700 private directory; root+only DAC_OVERRIDE can; node without added capabilities can. Temporary test volume removed. A prior shell `test -w` probe was not accepted as proof; actual writes were used.
- PASS: local derivative runtime image with UID1000, dropped capabilities and no-new-privileges can write cache/runtime/log/public/private directories and read required Prisma/worker/entrypoint files. This is a focused fixture, not the final full release image.
- PASS: `npx vitest run src/lib/enhe-start-source.test.ts src/lib/deploy-config.test.ts src/lib/release-workflow-source.test.ts src/lib/launch-readiness-source.test.ts`:56/56; existing Vite future-config warning only. Start-source checks use actual Compose calls and the precise heartbeat removal block, preserving identity-before-start and no-build requirements.
- PASS: Docker Compose config validation with synthetic environment and no real env-file resolution; `git diff --check` for owned changes.
- PASS (read-only production preflight): all required commands exist; node UID1000 can read current mounted secret files and audit engine; all12 candidate containers have no production-shared mount and no published port; retained-container link/env-name/shared-mount/network-alias URL conflict counts all0; Google-linked accounts/unrevoked sessions/active sessions all0 (aggregate only).
- PASS: Security worker independently reviewed the high-risk operations/user-recovery code. Its P2 finding (one-shot access rollback lost when backup held the lock) was fixed and independently re-reviewed; no remaining P1/P2 blocker in its reviewed scope.
- NOT_RUN by this worker: production preparation/deployment/gateway/access/retirement, real email delivery, restore of real database, final full application build/e2e. Root owns these gates and must append actual results.

Primary references checked: [Docker packet filtering](https://docs.docker.com/engine/network/packet-filtering-firewalls/), [Compose services](https://docs.docker.com/reference/compose-file/services/), [systemd-run transient timers](https://www.freedesktop.org/software/systemd/man/latest/systemd-run.html). Custom ingress rules do not modify or flush Docker-managed rules.
