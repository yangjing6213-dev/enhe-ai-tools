import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("production release workflow", () => {
  it("protects the existing database and preserves a first-release rollback image", () => {
    const deploy = read("deploy.sh");
    const dockerfile = read("deploy/enhe-ai-tools/Dockerfile");

    expect(deploy).not.toContain('. "$ENV_FILE"');
    expect(deploy).toContain(
      'EXPECTED_DB_VOLUME="enhe-ai-tools_enhe-ai-tools-postgres-data"',
    );
    expect(deploy).toContain('docker volume inspect "$EXPECTED_DB_VOLUME"');
    expect(deploy).toContain("preflight-production-database.sql");
    expect(deploy).toContain('ROLLBACK_IMAGE_TAG="rollback-$RELEASE_REF-$previous_image_short"');
    expect(deploy).toContain('docker image tag "$previous_image_id"');
    expect(deploy).toContain("ROLLBACK_RELEASE_REF");
    expect(deploy).toContain("org.opencontainers.image.revision");
    expect(dockerfile).toContain("org.opencontainers.image.revision");
    expect(deploy.indexOf("enhe-backup-db.sh")).toBeLessThan(
      deploy.indexOf("prisma migrate deploy"),
    );
  });

  it("keeps the rollback image tag separate from the runtime release identity", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");
    const start = read("deploy/enhe-ai-tools/scripts/enhe-start.sh");

    expect(compose).toContain("enhe-ai-tools:${APP_IMAGE_TAG");
    expect(rollback).toContain('APP_IMAGE_TAG="$ROLLBACK_IMAGE"');
    expect(rollback).toContain('RELEASE_REF="$rollback_release_ref"');
    expect(rollback).toContain("ROLLBACK_RELEASE_REF");
    expect(rollback).not.toContain('${ROLLBACK_IMAGE#rollback-}');
    expect(rollback).not.toContain('RELEASE_REF="$ROLLBACK_IMAGE"');
    expect(start).toContain("APP_IMAGE_TAG");
    expect(start).toContain("{{.Config.Image}}");
  });

  it("trusts only OCI labels for verified rollback identity", () => {
    const deploy = read("deploy.sh");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");

    expect(deploy).not.toContain(
      "docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}'",
    );
    expect(rollback).not.toContain(
      "docker image inspect --format '{{range .Config.Env}}{{println .}}{{end}}'",
    );
  });

  it("quiesces every database writer before taking the rollback snapshot", () => {
    const deploy = read("deploy.sh");
    const quiesceIndex = deploy.indexOf(
      "compose stop seo-audit-worker seo-audit-scheduler app",
    );
    const backupIndex = deploy.indexOf("enhe-backup-db.sh");
    const migrateIndex = deploy.indexOf("prisma migrate deploy");

    expect(quiesceIndex).toBeGreaterThan(-1);
    expect(backupIndex).toBeGreaterThan(quiesceIndex);
    expect(migrateIndex).toBeGreaterThan(backupIndex);
  });

  it("cannot accept stale heartbeats or partially healthy runtime services", () => {
    const deploy = read("deploy.sh");

    expect(deploy).toContain("compose stop seo-audit-worker seo-audit-scheduler");
    expect(deploy).toContain("seo-audit-worker-heartbeat.json");
    expect(deploy).toContain("seo-audit-scheduler-heartbeat.json");
    expect(deploy.indexOf("compose stop seo-audit-worker seo-audit-scheduler")).toBeLessThan(
      deploy.indexOf("--force-recreate app seo-audit-worker seo-audit-scheduler"),
    );
    expect(deploy).toContain("enhe-ai-tools-seo-audit-worker");
    expect(deploy).toContain("enhe-ai-tools-seo-audit-scheduler");
    expect(deploy).toContain("Full runtime health check failed.");
  });

  it("runs Playwright against the production build without mutating remote file modes", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const playwright = read("playwright.config.ts");
    const vitest = read("vitest.config.ts");

    expect(wrapper).toContain("PLAYWRIGHT_USE_PRODUCTION_SERVER");
    expect(wrapper).toContain('http://localhost:$E2ePort');
    expect(wrapper).not.toContain('http://127.0.0.1:$E2ePort');
    expect(wrapper).toContain('npm -Arguments @("run", "test:e2e")');
    expect(wrapper).toContain('$env:ZPAY_MODE = "disabled"');
    expect(wrapper).toContain("NEXT_PUBLIC_SITE_URL");
    expect(wrapper).toContain("AUTH_SECRET");
    expect(wrapper).not.toContain("chmod +x");
    expect(wrapper).toContain("sh ./deploy.sh");
    expect(wrapper).toContain("git status --porcelain --untracked-files=all");
    expect(wrapper).toContain("PREVIOUS_RELEASE_REF");
    expect(wrapper).toContain("ToLowerInvariant");
    expect(playwright).toContain("PLAYWRIGHT_USE_PRODUCTION_SERVER");
    expect(playwright).toContain("start-production-e2e.cjs");
    expect(playwright).toContain("workers: useProductionServer ? 2 : undefined");
    expect(read("scripts/start-production-e2e.cjs")).toContain("fetch-cache");
    expect(vitest).toContain('".next/**"');
  });

  it("drills both fresh and main-to-release migration paths before pushing", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const drill = read("scripts/test-migration-paths.mjs");

    expect(wrapper).toContain("test-migration-paths.mjs");
    expect(drill).toContain("origin/main");
    expect(drill).toContain("migration_fresh");
    expect(drill).toContain("migration_upgrade");
    expect(drill).toContain("prisma");
    expect(drill).toContain("migrate");
    expect(drill).toContain("deploy");
    expect(drill).toContain("diff");
    expect(drill).toContain("--exit-code");
  });

  it("checks the production checkout before updating the release branch", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const remoteCleanGuard =
      'test -z "$(git status --porcelain --untracked-files=all)"';
    const remoteCleanIndex = wrapper.indexOf(remoteCleanGuard);
    const pushIndex = wrapper.indexOf(
      'Invoke-Native -FilePath git -Arguments @("push", "origin"',
    );

    expect(remoteCleanIndex).toBeGreaterThan(-1);
    expect(pushIndex).toBeGreaterThan(remoteCleanIndex);
  });

  it("serializes every production mutation with one inherited host lock", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");
    const lockHelper = read(
      "deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh",
    );
    const scripts = [
      read("deploy.sh"),
      read("deploy/enhe-ai-tools/scripts/enhe-backup-db.sh"),
      read("deploy/enhe-ai-tools/scripts/enhe-restore-db.sh"),
      read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh"),
      read("deploy/enhe-ai-tools/scripts/enhe-start.sh"),
    ];
    const lockPath = "deploy/enhe-ai-tools/runtime/enhe-operation.lock";

    expect(lockHelper).toContain("acquire_enhe_operation_lock");
    expect(lockHelper).toContain("flock -n 9");
    expect(lockHelper).toContain("/proc/self/fd/9");
    for (const script of scripts) {
      expect(script).toContain("enhe-operation-lock.sh");
      expect(script).toContain("acquire_enhe_operation_lock");
    }
    expect(wrapper).toContain(lockPath);
    expect(wrapper.indexOf("flock -n 9")).toBeLessThan(
      wrapper.indexOf('test -z "$(git status --porcelain --untracked-files=all)"'),
    );
    expect(wrapper).toContain("test-release-shell-behavior.sh");
  });

  it("drills the actual rollback image against a migrated database clone", () => {
    const deploy = read("deploy.sh");
    const drill = read(
      "deploy/enhe-ai-tools/scripts/enhe-verify-rollback-compatibility.sh",
    );
    const probe = read(
      "deploy/enhe-ai-tools/scripts/legacy-rollback-compatibility.cjs",
    );
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");
    const backupIndex = deploy.indexOf("enhe-backup-db.sh");
    const drillIndex = deploy.indexOf('sh "$ROLLBACK_COMPATIBILITY_SCRIPT"');
    const migrateIndex = deploy.indexOf("prisma migrate deploy");

    expect(drillIndex).toBeGreaterThan(backupIndex);
    expect(migrateIndex).toBeGreaterThan(drillIndex);
    expect(drill).toContain("pg_restore --exit-on-error");
    expect(drill).toContain("psql -v ON_ERROR_STOP=1");
    expect(drill).toContain('-Atqc "SELECT 1"');
    expect(drill).not.toContain(
      'pg_isready -U "$db_user" -d "$db_name"',
    );
    expect(drill).toContain("prisma migrate deploy");
    expect(drill).toContain("/api/health?scope=app");
    expect(drill).toContain("AUDIT_WORKER_TOKEN_CURRENT=rollback-compatibility-");
    expect(drill).toContain(
      "SEO_AUDIT_ANONYMOUS_HMAC_SECRET=rollback-compatibility-",
    );
    expect(drill).toContain('run_app_health_probe "$candidate_image"');
    expect(drill).toContain('run_app_health_probe "$rollback_image"');
    for (const model of [
      "user",
      "tool",
      "order",
      "paymentTransaction",
      "paymentProof",
      "toolPurchase",
      "adminAuditLog",
    ]) {
      expect(probe).toContain(`prisma.${model}.findFirst`);
    }
    expect(rollback).not.toContain("prisma migrate status");
  });

  it("restarts the exact previous containers when a pre-migration gate fails", () => {
    const deploy = read("deploy.sh");
    const recovery = read(
      "deploy/enhe-ai-tools/scripts/enhe-recover-pre-migration-runtime.sh",
    );
    const drillIndex = deploy.indexOf('sh "$ROLLBACK_COMPATIBILITY_SCRIPT"');
    const migrationStateIndex = deploy.indexOf("PRODUCTION_MIGRATION_STARTED=1");
    const migrateIndex = deploy.indexOf(
      "'cd /app && ./node_modules/.bin/prisma migrate deploy'",
    );

    expect(deploy).toContain("WRITER_QUIESCE_STARTED=1");
    expect(deploy).toContain("enhe-recover-pre-migration-runtime.sh");
    expect(deploy).toContain('if [ "$PRODUCTION_MIGRATION_STARTED" -eq 0 ]');
    expect(migrationStateIndex).toBeGreaterThan(drillIndex);
    expect(migrateIndex).toBeGreaterThan(migrationStateIndex);
    expect(recovery).toContain("PREVIOUS_APP_IMAGE_ID");
    expect(recovery).toContain("PREVIOUS_WORKER_IMAGE_ID");
    expect(recovery).toContain("PREVIOUS_SCHEDULER_IMAGE_ID");
    expect(recovery).toContain('docker start "$APP_CONTAINER"');
    expect(recovery).toContain('docker start "$WORKER_CONTAINER"');
    expect(recovery).toContain('docker start "$SCHEDULER_CONTAINER"');
  });

  it("does not evaluate administrator credentials through a shell", () => {
    const initializer = read("deploy/enhe-ai-tools/scripts/enhe-init-admin.sh");

    expect(initializer).not.toContain('. "$ENV_FILE"');
    expect(initializer).not.toContain("set -a");
    expect(initializer).toContain("node prisma/ensure-super-admin.js");
  });

  it("uses the same fixed production env files as Docker Compose", () => {
    const deploy = read("deploy.sh");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");
    const start = read("deploy/enhe-ai-tools/scripts/enhe-start.sh");
    const stop = read("deploy/enhe-ai-tools/scripts/enhe-stop.sh");

    for (const script of [deploy, rollback, start]) {
      expect(script).toContain("deploy/enhe-ai-tools/.env");
      expect(script).toContain("zpay.env");
      expect(script).not.toContain("ENHE_ENV_FILE");
      expect(script).not.toContain("ENHE_ZPAY_ENV_FILE");
    }
    expect(stop).not.toContain("docker compose");
  });
});
