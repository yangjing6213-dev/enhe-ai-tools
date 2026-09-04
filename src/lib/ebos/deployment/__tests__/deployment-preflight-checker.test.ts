import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  buildProductionDeploymentPreflightReport,
  calculateDeploymentReadinessScore,
  checkEnvironmentKeyNames,
  checkValidationRoutesInBuild
} from "../deployment-preflight-checker";

async function fixtureRoot() {
  const rootDir = await mkdtemp(join(tmpdir(), "ebos-deployment-preflight-"));
  await writeFile(join(rootDir, "package.json"), JSON.stringify({
    scripts: { lint: "eslint .", typecheck: "tsc --noEmit", build: "next build", start: "node server.js", test: "vitest run", "prisma:generate": "prisma generate" }
  }), "utf8");
  await writeFile(join(rootDir, "next.config.ts"), "export default { output: \"standalone\" };\n", "utf8");
  return rootDir;
}

async function addRoutes(rootDir: string) {
  await mkdir(join(rootDir, "src", "app", "(zh-public)", "validation", "ai-prompt-kit"), { recursive: true });
  await mkdir(join(rootDir, "src", "app", "en", "validation", "ai-prompt-kit"), { recursive: true });
  await writeFile(join(rootDir, "src", "app", "(zh-public)", "validation", "ai-prompt-kit", "page.tsx"), "export default function Page() { return null; }\n", "utf8");
  await writeFile(join(rootDir, "src", "app", "en", "validation", "ai-prompt-kit", "page.tsx"), "export default function Page() { return null; }\n", "utf8");
}

async function addDeployConfig(rootDir: string) {
  await mkdir(join(rootDir, "deploy", "enhe-ai-tools"), { recursive: true });
  await writeFile(join(rootDir, "Dockerfile"), "FROM node:24-alpine\n", "utf8");
  await writeFile(join(rootDir, "deploy", "enhe-ai-tools", "docker-compose.yml"), "services:\n  app:\n    image: app\n", "utf8");
  await writeFile(join(rootDir, "deploy", "enhe-ai-tools", "README.md"), "# deploy\n", "utf8");
}

describe("deployment preflight checker", () => {
  test("blocks when validation routes are missing", async () => {
    const rootDir = await fixtureRoot();
    const report = await buildProductionDeploymentPreflightReport({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      rootDir,
      buildPassed: true
    });

    expect(report.readinessStatus).toBe("blocked");
    expect(report.blockers.join("\n")).toContain("/validation/ai-prompt-kit");
  });

  test("passes route checks when page files exist", async () => {
    const rootDir = await fixtureRoot();
    await addRoutes(rootDir);

    const checks = await checkValidationRoutesInBuild({ rootDir });

    expect(checks.every((check) => check.status === "pass")).toBe(true);
    expect(checks.map((check) => check.evidence).join("\n")).toContain("/en/validation/ai-prompt-kit");
  });

  test("marks missing Docker or deploy config as needs_fixes instead of blocked", async () => {
    const rootDir = await fixtureRoot();
    await addRoutes(rootDir);
    const report = await buildProductionDeploymentPreflightReport({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      rootDir,
      buildPassed: true
    });

    expect(report.readinessStatus).toBe("needs_fixes");
    expect(report.blockers).toHaveLength(0);
    expect(report.warnings.join("\n")).toContain("Docker");
  });

  test("calculates high readiness score when routes and deployment config are present", async () => {
    const rootDir = await fixtureRoot();
    await addRoutes(rootDir);
    await addDeployConfig(rootDir);

    const report = await buildProductionDeploymentPreflightReport({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      rootDir,
      buildPassed: true,
      configuredEnvKeys: ["DATABASE_URL", "AUTH_SECRET", "APP_URL", "NEXT_PUBLIC_APP_URL", "SMTP_HOST"]
    });

    expect(report.readinessStatus).toBe("ready_to_deploy");
    expect(calculateDeploymentReadinessScore(report)).toBeGreaterThanOrEqual(85);
  });

  test("environment checks only report key names and never secret values", () => {
    const checks = checkEnvironmentKeyNames({
      configuredKeys: ["DATABASE_URL", "AUTH_SECRET", "APP_URL", "NEXT_PUBLIC_APP_URL"],
      envExampleKeys: ["SMTP_PASSWORD"]
    });
    const text = JSON.stringify(checks);

    expect(text).toContain("AUTH_SECRET");
    expect(text).not.toContain("super-secret");
    expect(text).not.toContain("postgres://");
  });
});
