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

    expect(compose).toContain("context: ../..");
    expect(compose).toContain("dockerfile: deploy/enhe-ai-tools/Dockerfile");
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

  it("runs Prisma and seed commands from /app inside the app container", () => {
    const deployScript = readFileSync(resolve(root, "deploy.sh"), "utf8");

    expect(deployScript).toContain("exec -T app sh -lc 'cd /app && ./node_modules/.bin/prisma migrate deploy'");
    expect(deployScript).toContain("exec -T app sh -lc 'cd /app && node prisma/seed-ai-news.cjs'");
  });

  it("uses the skip flag after the PowerShell deploy wrapper pulls on the server", () => {
    const deployWrapper = readFileSync(resolve(root, "scripts/push-and-deploy.ps1"), "utf8");

    expect(deployWrapper).toContain('@("pull", "--rebase", "origin", $Branch)');
    expect(deployWrapper).toContain("git -c http.version=HTTP/1.1 pull origin $Branch");
    expect(deployWrapper).toContain("SKIP_GIT_PULL=1 ./deploy.sh");
  });
});
