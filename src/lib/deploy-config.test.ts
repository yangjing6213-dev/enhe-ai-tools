import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("isolated launch deployment contract", () => {
  it("pins PostgreSQL to the existing external production volume", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");

    expect(compose).toMatch(
      /enhe-ai-tools-postgres-data:\s*\n\s+external:\s+true\s*\n\s+name:\s+enhe-ai-tools_enhe-ai-tools-postgres-data/,
    );
  });

  it("injects the complete app runtime environment from required env files", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");
    const example = read("deploy/enhe-ai-tools/.env.example");
    const app =
      compose.match(/  app:\r?\n[\s\S]*?(?=\r?\n  seo-audit-worker:)/)?.[0] ?? "";

    expect(app).toMatch(
      /env_file:\s*\n\s+- \.env\s*\n\s+- \.\.\/\.\.\/zpay\.env/,
    );
    expect(app).not.toContain("path:");
    expect(app).not.toContain("required:");
    expect(app).not.toContain("ENHE_ENV_FILE");
    expect(app).not.toContain("ENHE_ZPAY_ENV_FILE");
    expect(app).not.toMatch(/^\s+ZPAY_(PID|KEY|CHANNEL_ID):/m);
    expect(app).not.toMatch(/^\s+(?:CSP_REPORT_LOG_PATH|LUMI_LICENSE_PRIVATE_KEY_FILE):/m);
    expect(app).toContain(
      "RELEASE_REF: ${RELEASE_REF:?RELEASE_REF is required}",
    );
    expect(app).toContain("HOSTNAME: 0.0.0.0");
    expect(example).toContain("ZPAY_MODE=disabled");
    expect(example).toContain("AUDIT_WORKER_TOKEN_CURRENT=");
    expect(example).toContain("SEO_AUDIT_ANONYMOUS_HMAC_SECRET=");
    expect(example).toContain("SEO_AUDIT_MONITORING_SALES_ENABLED=false");
    for (const key of [
      "POSTGRES_USER",
      "POSTGRES_DB",
      "POSTGRES_PASSWORD",
      "AI_NEWS_IMPORT_TOKEN",
      "OPENAI_API_KEY",
      "OPENAI_BASE_URL",
      "OPENAI_MODEL",
      "SMTP_CONNECTION_TIMEOUT_MS",
      "SMTP_GREETING_TIMEOUT_MS",
      "SMTP_SOCKET_TIMEOUT_MS",
      "AI_TRENDS_REVALIDATE_TOKEN",
      "BAIDU_PUSH_TOKEN",
      "BAIDU_PUSH_SITE_URL",
    ]) {
      expect(example).toMatch(new RegExp(`^${key}=`, "m"));
    }
  });

  it("never creates or resets an administrator during app startup", () => {
    const entrypoint = read("deploy/enhe-ai-tools/scripts/app-entrypoint.sh");
    const initializer = read("prisma/ensure-super-admin.js");
    const initScript = read("deploy/enhe-ai-tools/scripts/enhe-init-admin.sh");

    expect(entrypoint).not.toContain("ensure-super-admin");
    expect(entrypoint).not.toContain("prisma migrate deploy");
    expect(initializer).toContain("ADMIN_BOOTSTRAP_EMAIL");
    expect(initializer).toContain("ADMIN_BOOTSTRAP_PASSWORD");
    expect(initializer).toContain("ADMIN_BOOTSTRAP_CONFIRM");
    expect(initializer).toContain("bcrypt.hash");
    expect(initializer).toContain("prisma.user.create");
    expect(initializer).not.toContain("prisma.user.upsert");
    expect(initializer).not.toMatch(/\$2[aby]\$\d{2}\$/);
    expect(initializer).not.toContain("Sadmin");
    expect(initScript).toContain("node prisma/ensure-super-admin.js");
  });

  it("runs app, worker, and scheduler as isolated services", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");
    const example = read("deploy/enhe-ai-tools/.env.example");
    const dockerfile = read("deploy/enhe-ai-tools/Dockerfile");
    const worker = read("deploy/enhe-ai-tools/scripts/seo-audit-worker.mjs");
    const scheduler = read("deploy/enhe-ai-tools/scripts/seo-audit-scheduler.mjs");

    expect(compose).toMatch(/^\s{2}app:/m);
    expect(compose).toMatch(/^\s{2}seo-audit-worker:/m);
    expect(compose).toMatch(/^\s{2}seo-audit-scheduler:/m);
    expect(compose).toContain('"127.0.0.1:3001:3000"');
    expect(compose).toContain("AUDIT_WORKER_TOKEN_CURRENT");
    expect(example).toContain("SEO_AUDIT_ANONYMOUS_HMAC_SECRET=");
    expect(example).toContain("SEO_AUDIT_MONITORING_SALES_ENABLED=false");
    expect(compose).toContain("seo-audit-worker.mjs");
    expect(compose).toContain("seo-audit-scheduler.mjs");
    expect(compose.match(/healthcheck:/g)?.length).toBeGreaterThanOrEqual(4);
    expect(dockerfile).toContain("python3");
    expect(dockerfile).toContain("deploy/enhe-ai-tools/scripts");
    expect(worker).toContain("SEO_AUDIT_ENGINE_SHA256");
    expect(worker).toContain("/api/internal/seo-audit/jobs/claim");
    expect(worker).toContain("/heartbeat");
    expect(worker).toContain("/complete");
    expect(worker).toContain("/fail");
    expect(worker).toContain('status: "blocked"');
    expect(worker.indexOf("verifyEngine")).toBeLessThan(
      worker.indexOf("/api/internal/seo-audit/jobs/claim"),
    );
    expect(scheduler).toContain(
      "/api/internal/seo-audit/schedules/enqueue",
    );
    expect(scheduler).toContain("SEO_AUDIT_SCHEDULER_HEARTBEAT_FILE");
  });

  it("binds every runtime service to one release ref and checks it in sidecar health", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");
    const releaseEnv = "RELEASE_REF: ${RELEASE_REF:?RELEASE_REF is required}";

    expect(compose.split(releaseEnv)).toHaveLength(4);
    expect(compose.match(/process\.env\.RELEASE_REF/g)).toHaveLength(2);
    expect(
      compose.match(/p\.releaseRef===process\.env\.RELEASE_REF/g),
    ).toHaveLength(2);
    expect(compose.match(/\[0-9a-fA-F\]\{40\}/g)).toHaveLength(2);
  });

  it("backs up and verifies before migration without touching another stack", () => {
    const deploy = read("deploy.sh");
    const backup = read("deploy/enhe-ai-tools/scripts/enhe-backup-db.sh");
    const restore = read("deploy/enhe-ai-tools/scripts/enhe-restore-db.sh");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");
    const backupIndex = deploy.indexOf("enhe-backup-db.sh");
    const quiesceIndex = deploy.indexOf(
      "compose stop seo-audit-worker seo-audit-scheduler app",
    );
    const migrateIndex = deploy.indexOf("prisma migrate deploy");
    const recreateIndex = deploy.indexOf("--force-recreate");

    expect(backupIndex).toBeGreaterThan(-1);
    expect(quiesceIndex).toBeGreaterThan(-1);
    expect(backupIndex).toBeGreaterThan(quiesceIndex);
    expect(migrateIndex).toBeGreaterThan(backupIndex);
    expect(recreateIndex).toBeGreaterThan(migrateIndex);
    expect(deploy).toContain("pg_restore --list");
    expect(deploy).toContain("ROLLBACK");
    expect(deploy).toContain("RESTORE");
    expect(deploy).not.toContain("seed-ai-news");
    expect(deploy).not.toContain("hot-content");
    expect(deploy).not.toContain("nginx");
    expect(deploy).not.toContain("git pull");
    expect(backup).toContain("--format=custom");
    expect(backup).toContain("pg_restore --list");
    expect(backup).toContain("sha256sum");
    expect(backup).toContain('DB_CONTAINER="enhe-ai-tools-db"');
    expect(backup).not.toContain("ENHE_DB_CONTAINER");
    expect(restore).toContain("RESTORE_ENHE_AI_TOOLS");
    expect(restore).toContain("pg_restore --list");
    expect(restore).toContain('DB_CONTAINER="enhe-ai-tools-db"');
    expect(restore).toContain(
      'EXPECTED_DB_VOLUME="enhe-ai-tools_enhe-ai-tools-postgres-data"',
    );
    expect(restore).toContain('mounted_db_volume=');
    expect(restore).not.toContain("ENHE_DB_CONTAINER");
    expect(rollback).toContain("ROLLBACK_ENHE_AI_TOOLS");
    expect(rollback).toContain("ROLLBACK_IMAGE");
    expect(rollback).toContain("/api/health?scope=app");
  });

  it("creates private database backups without evaluating env files as shell", () => {
    const backup = read("deploy/enhe-ai-tools/scripts/enhe-backup-db.sh");

    expect(backup).toMatch(/^umask 077$/m);
    expect(backup).not.toMatch(/^\s*(?:\.|source)\s+['"]?\$ENV_FILE/m);
    expect(backup).not.toContain("set -a");
    expect(backup).toContain("$POSTGRES_USER");
    expect(backup).toContain("$POSTGRES_DB");
    expect(backup).toContain("sh -lc");
  });

  it("restores a fresh database and leaves application containers stopped on failure", () => {
    const restore = read("deploy/enhe-ai-tools/scripts/enhe-restore-db.sh");
    const stopIndex = restore.indexOf("docker stop");
    const disconnectIndex = restore.indexOf("pg_terminate_backend");
    const dropIndex = restore.indexOf("dropdb --if-exists --force");
    const createIndex = restore.indexOf("createdb");
    const restoreIndex = restore.indexOf("pg_restore --exit-on-error");

    expect(restore).not.toMatch(/^\s*(?:\.|source)\s+['"]?\$ENV_FILE/m);
    expect(restore).not.toContain("set -a");
    expect(stopIndex).toBeGreaterThan(-1);
    expect(disconnectIndex).toBeGreaterThan(stopIndex);
    expect(dropIndex).toBeGreaterThan(disconnectIndex);
    expect(createIndex).toBeGreaterThan(dropIndex);
    expect(restoreIndex).toBeGreaterThan(createIndex);
    expect(restore).toContain("remain stopped");
    expect(restore).not.toMatch(/docker (?:start|restart)/);
  });

  it("keeps runtime data and untracked env files out of the Docker context", () => {
    const dockerignore = read(".dockerignore");
    const patterns = new Set(
      dockerignore.split(/\r?\n/).map((line) => line.trim()),
    );

    for (const directory of [
      "backups",
      "runtime",
      "uploads",
      "logs",
      "secrets",
    ]) {
      expect(patterns).toContain(directory);
      expect(patterns).toContain(`**/${directory}`);
    }
    expect(patterns).toContain(".env");
    expect(patterns).toContain(".env.*");
    expect(patterns).toContain("**/.env");
    expect(patterns).toContain("**/.env.*");
    expect(patterns).toContain("!.env.example");
    expect(patterns).toContain("!**/.env.example");
  });

  it("validates launch configuration inside the app image and waits for the full runtime", () => {
    const deploy = read("deploy.sh");

    expect(deploy).toContain("compose run --rm --no-deps app");
    expect(deploy).toContain("validate-deploy-config.ts");
    expect(deploy).not.toMatch(/^\s*(?:\.|source)\s+['"]?\$ENV_FILE/m);
    expect(deploy).not.toContain("set -a");
    expect(deploy).toContain("Full runtime health check failed.");
    expect(deploy).not.toContain("/api/health?scope=app");
  });

  it("requires a clean explicit release ref and always runs full checks", () => {
    const wrapper = read("scripts/push-and-deploy.ps1");

    expect(wrapper).toContain("ReleaseRef");
    expect(wrapper).toContain("git status --porcelain");
    expect(wrapper).toContain('npm -Arguments @("test")');
    expect(wrapper).toContain('npm -Arguments @("run", "typecheck")');
    expect(wrapper).toContain('npm -Arguments @("run", "lint")');
    expect(wrapper).toContain('npm -Arguments @("run", "build")');
    expect(wrapper).not.toContain('@("add", "-A")');
    expect(wrapper).not.toContain("SkipChecks");
    expect(wrapper).not.toContain("RunBuild");
    expect(wrapper).toMatch(/ValidatePattern\('\^\[0-9a-fA-F\]\{40\}\$'\)/);
    expect(wrapper).not.toContain("git commit");
    expect(wrapper).toContain("SEO_AUDIT_TEST_DATABASE_URL");
    expect(wrapper).toContain("$env:DATABASE_URL = $TestDatabaseUrl");
    expect(wrapper).toContain("git status --porcelain --untracked-files=all");
    expect(wrapper).not.toContain("git diff --quiet");
    expect(wrapper).not.toContain("git diff --cached --quiet");
  });

  it("preserves production mail and license settings in the injected env contract", () => {
    const example = read("deploy/enhe-ai-tools/.env.example");

    for (const key of [
      "ADMIN_ALERT_EMAILS",
      "ADMIN_EMAIL_NOTIFICATIONS_ENABLED",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_SECURE",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_FROM",
      "LUMI_LICENSE_PRIVATE_KEY_FILE",
    ]) {
      expect(example).toMatch(new RegExp(`^${key}=`, "m"));
    }
  });

  it("keeps runtime secrets out of Docker image build arguments", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");
    const dockerfile = read("deploy/enhe-ai-tools/Dockerfile");

    expect(dockerfile).not.toMatch(/^ARG (AUTH_SECRET|ZPAY_KEY|AUDIT_WORKER_TOKEN_CURRENT)=/m);
    expect(dockerfile).not.toMatch(/^ENV (AUTH_SECRET|ZPAY_KEY|AUDIT_WORKER_TOKEN_CURRENT)=/m);
    expect(compose).toContain("- .env");
  });
});
