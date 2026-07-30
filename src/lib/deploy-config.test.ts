import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("isolated launch deployment contract", () => {
  it("uses one explicit untracked environment file contract", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");
    const example = read("deploy/enhe-ai-tools/.env.example");
    const readme = read("deploy/enhe-ai-tools/README.md");
    const scripts = [
      "deploy.sh",
      "deploy/enhe-ai-tools/scripts/enhe-backup-db.sh",
      "deploy/enhe-ai-tools/scripts/enhe-start.sh",
      "deploy/enhe-ai-tools/scripts/enhe-stop.sh",
    ].map(read);

    expect(compose).not.toContain("../../zpay.env");
    expect(compose).not.toMatch(/^\s*env_file:/m);
    expect(example).toContain("ZPAY_MODE=disabled");
    expect(example).toContain("AUDIT_WORKER_TOKEN_CURRENT=");
    expect(example).toContain("SEO_AUDIT_ANONYMOUS_HMAC_SECRET=");
    expect(example).toContain("SEO_AUDIT_MONITORING_SALES_ENABLED=false");
    expect(readme).toContain("deploy/enhe-ai-tools/.env");
    for (const script of scripts) {
      expect(script).toContain(
        'ENV_FILE="${ENHE_ENV_FILE:-$APP_DIR/deploy/enhe-ai-tools/.env}"',
      );
      expect(script).toContain('--env-file "$ENV_FILE"');
      expect(script).not.toContain('ENV_FILE="$APP_DIR/.env"');
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
    const dockerfile = read("deploy/enhe-ai-tools/Dockerfile");
    const worker = read("deploy/enhe-ai-tools/scripts/seo-audit-worker.mjs");
    const scheduler = read("deploy/enhe-ai-tools/scripts/seo-audit-scheduler.mjs");

    expect(compose).toMatch(/^\s{2}app:/m);
    expect(compose).toMatch(/^\s{2}seo-audit-worker:/m);
    expect(compose).toMatch(/^\s{2}seo-audit-scheduler:/m);
    expect(compose).toContain('"127.0.0.1:3001:3000"');
    expect(compose).toContain("AUDIT_WORKER_TOKEN_CURRENT");
    expect(compose).toContain("SEO_AUDIT_ANONYMOUS_HMAC_SECRET");
    expect(compose).toContain(
      "SEO_AUDIT_MONITORING_SALES_ENABLED: ${SEO_AUDIT_MONITORING_SALES_ENABLED:-false}",
    );
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

  it("backs up and verifies before migration without touching another stack", () => {
    const deploy = read("deploy.sh");
    const backup = read("deploy/enhe-ai-tools/scripts/enhe-backup-db.sh");
    const restore = read("deploy/enhe-ai-tools/scripts/enhe-restore-db.sh");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");
    const backupIndex = deploy.indexOf("enhe-backup-db.sh");
    const migrateIndex = deploy.indexOf("prisma migrate deploy");
    const recreateIndex = deploy.indexOf("--force-recreate");

    expect(backupIndex).toBeGreaterThan(-1);
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
    expect(restore).toContain("RESTORE_ENHE_AI_TOOLS");
    expect(restore).toContain("pg_restore --list");
    expect(rollback).toContain("ROLLBACK_ENHE_AI_TOOLS");
    expect(rollback).toContain("ROLLBACK_IMAGE");
  });

  it("fails closed on missing launch configuration and waits for the full runtime", () => {
    const deploy = read("deploy.sh");

    for (const key of [
      "POSTGRES_PASSWORD",
      "AUTH_COOKIE_NAME",
      "AUTH_SECRET",
      "APP_URL",
      "NEXT_PUBLIC_APP_URL",
      "AUDIT_WORKER_TOKEN_CURRENT",
      "SEO_AUDIT_ANONYMOUS_HMAC_SECRET",
      "SEO_AUDIT_ENGINE_HOST_PATH",
      "SEO_AUDIT_ENGINE_SHA256",
      "ZPAY_MODE",
    ]) {
      expect(deploy).toContain(`\${${key}:?${key} is required}`);
    }
    expect(deploy).toContain("sha256sum");
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
    expect(wrapper).toContain("git diff --quiet");
    expect(wrapper).toContain("git diff --cached --quiet");
  });

  it("preserves explicitly configured production mail and license settings", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");

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
      expect(compose).toContain(`${key}: \${${key}`);
    }
  });

  it("keeps runtime secrets out of Docker image build arguments", () => {
    const compose = read("deploy/enhe-ai-tools/docker-compose.yml");
    const dockerfile = read("deploy/enhe-ai-tools/Dockerfile");

    expect(dockerfile).not.toMatch(/^ARG (AUTH_SECRET|ZPAY_KEY|AUDIT_WORKER_TOKEN_CURRENT)=/m);
    expect(dockerfile).not.toMatch(/^ENV (AUTH_SECRET|ZPAY_KEY|AUDIT_WORKER_TOKEN_CURRENT)=/m);
    expect(compose).toContain("AUTH_SECRET: ${AUTH_SECRET}");
  });
});
