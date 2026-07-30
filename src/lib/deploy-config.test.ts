import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("server deployment compose config", () => {
  it("runs the standalone Next server in production start mode", () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const startScript = readFileSync(resolve(root, "scripts/start-standalone.cjs"), "utf8");

    expect(packageJson.scripts?.start).toBe("node scripts/start-standalone.cjs");
    expect(startScript).toContain("copyStandaloneAsset");
    expect(startScript).toContain('".next/static"');
    expect(startScript).toContain('"public"');
    expect(startScript).toContain('"server.js"');
  });

  it("builds the app image from the repository root", () => {
    const compose = readFileSync(resolve(root, "deploy/enhe-ai-tools/docker-compose.yml"), "utf8");
    const dockerfile = readFileSync(resolve(root, "deploy/enhe-ai-tools/Dockerfile"), "utf8");

    expect(compose).toContain("context: ../..");
    expect(compose).toContain("dockerfile: deploy/enhe-ai-tools/Dockerfile");
    expect(compose).toContain("AI_TRENDS_REVALIDATE_TOKEN: ${AI_TRENDS_REVALIDATE_TOKEN:-}");
    expect(dockerfile).toContain("COPY --from=builder /app/src ./src");
    expect(dockerfile).toContain("COPY --from=builder /app/tsconfig.json ./tsconfig.json");
  });

  it("persists CSP reports outside the replaceable app container", () => {
    const compose = readFileSync(resolve(root, "deploy/enhe-ai-tools/docker-compose.yml"), "utf8");
    const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
    const logrotate = readFileSync(
      resolve(root, "deploy/enhe-ai-tools/logrotate/enhe-csp-report"),
      "utf8",
    );

    expect(compose).toContain(
      "CSP_REPORT_LOG_PATH: ${CSP_REPORT_LOG_PATH:-/app/logs/csp-report.jsonl}",
    );
    expect(compose).toContain("./logs:/app/logs");
    expect(gitignore).toContain("/deploy/enhe-ai-tools/logs/");
    expect(logrotate).toContain("daily");
    expect(logrotate).toContain("maxsize 10M");
    expect(logrotate).not.toMatch(/^\s*size\s/m);
  });

  it("defines a bounded proxy rate limit for the public CSP collector", () => {
    const httpConfig = readFileSync(
      resolve(root, "deploy/enhe-ai-tools/nginx/csp-report-rate-limit-http.conf"),
      "utf8",
    );
    const locationConfig = readFileSync(
      resolve(root, "deploy/enhe-ai-tools/nginx/csp-report-rate-limit-location.conf"),
      "utf8",
    );

    expect(httpConfig).toContain(
      "limit_req_zone $binary_remote_addr zone=enhe_csp_report_per_ip:10m rate=1r/s;",
    );
    expect(locationConfig).toContain("location = /api/csp-report");
    expect(locationConfig).toContain(
      "limit_req zone=enhe_csp_report_per_ip burst=10 nodelay;",
    );
    expect(locationConfig).toContain("limit_req_status 429;");
    expect(locationConfig).toContain("client_max_body_size 32k;");
  });

  it("keeps AUTH_SECRET runtime-only during Docker builds", () => {
    const compose = readFileSync(resolve(root, "deploy/enhe-ai-tools/docker-compose.yml"), "utf8");
    const dockerfile = readFileSync(resolve(root, "deploy/enhe-ai-tools/Dockerfile"), "utf8");

    expect(dockerfile).not.toMatch(/^ARG AUTH_SECRET=/m);
    expect(dockerfile).not.toMatch(/^ENV AUTH_SECRET=/m);
    expect(dockerfile).not.toContain("AUTH_SECRET");
    expect(compose).toContain("AUTH_SECRET: ${AUTH_SECRET}");
    expect(compose).not.toMatch(/^\s{8}AUTH_SECRET:\s*\$\{AUTH_SECRET\}\s*$/m);
  });

  it("keeps the shared Tencent Cloud nginx proxy aligned with admin upload limits", () => {
    const deployScript = readFileSync(resolve(root, "deploy.sh"), "utf8");

    expect(deployScript).toContain("client_max_body_size 520m");
    expect(deployScript).toContain("/opt/hot-content-os/app/hot-content-os/infra/nginx/default.conf");
    expect(deployScript).toContain("docker compose -f /opt/hot-content-os/app/hot-content-os/docker-compose.yml up -d --force-recreate nginx");
    expect(deployScript).toContain("enhe-ai-tools-app:3000");
  });

  it("preserves public proxy headers for form and server-action redirects", () => {
    const deployScript = readFileSync(resolve(root, "deploy.sh"), "utf8");

    expect(deployScript).toContain("proxy_set_header X-Forwarded-Host $host");
    expect(deployScript).toContain("proxy_set_header X-Forwarded-Proto https");
  });

  it("can skip the internal git pull when the caller already verified the server head", () => {
    const deployScript = readFileSync(resolve(root, "deploy.sh"), "utf8");

    expect(deployScript).toContain("SKIP_GIT_PULL");
    expect(deployScript).toContain('if [ "${SKIP_GIT_PULL:-0}" = "1" ]; then');
    expect(deployScript).toContain("git -c http.version=HTTP/1.1 pull origin main");
  });

  it("waits for the app health endpoint after recreating the container", () => {
    const deployScript = readFileSync(resolve(root, "deploy.sh"), "utf8");

    expect(deployScript).toContain("for attempt in $(seq 1 30)");
    expect(deployScript).toContain('"status":"ok"');
    expect(deployScript).toContain("docker logs --tail=80 enhe-ai-tools-app");
  });

  it("deploys migrations before replacing the app container", () => {
    const deployScript = readFileSync(resolve(root, "deploy.sh"), "utf8");
    const migrationCommand =
      "run --rm --no-deps --entrypoint sh app -lc 'cd /app && ./node_modules/.bin/prisma migrate deploy'";
    const appStartCommand = "up -d app";

    expect(deployScript).toContain("up -d db");
    expect(deployScript).toContain("build app");
    expect(deployScript).toContain(migrationCommand);
    expect(deployScript.indexOf(migrationCommand)).toBeLessThan(
      deployScript.indexOf(appStartCommand),
    );
    expect(deployScript).toContain("exec -T app sh -lc 'cd /app && node prisma/seed-ai-news.cjs'");
  });

  it("uses the skip flag after the PowerShell deploy wrapper pulls on the server", () => {
    const deployWrapper = readFileSync(resolve(root, "scripts/push-and-deploy.ps1"), "utf8");

    expect(deployWrapper).toContain('@("pull", "--rebase", "origin", $Branch)');
    expect(deployWrapper).toContain("git -c http.version=HTTP/1.1 pull origin $Branch");
    expect(deployWrapper).toContain("SKIP_GIT_PULL=1 ./deploy.sh");
  });
});
