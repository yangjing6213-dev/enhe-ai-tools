import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  detectDeployDocs,
  detectDockerConfig,
  detectNextConfig,
  detectPackageScripts,
  readDeploymentConfig
} from "../deployment-config-reader";

async function fixtureRoot() {
  return mkdtemp(join(tmpdir(), "ebos-deployment-config-"));
}

describe("deployment config reader", () => {
  test("reads package scripts without modifying package.json", async () => {
    const scripts = detectPackageScripts({
      scripts: {
        lint: "eslint .",
        typecheck: "tsc --noEmit",
        build: "next build",
        start: "next start",
        test: "vitest run",
        "prisma:generate": "prisma generate"
      }
    });

    expect(scripts).toEqual(expect.objectContaining({
      lint: true,
      typecheck: true,
      build: true,
      start: true,
      test: true,
      "prisma:generate": true
    }));
  });

  test("missing Dockerfile does not crash and creates a warning", async () => {
    const rootDir = await fixtureRoot();
    const docker = await detectDockerConfig(rootDir);

    expect(docker.dockerfileDetected).toBe(false);
    expect(docker.dockerComposeDetected).toBe(false);
    expect(docker.warnings.join("\n")).toContain("Dockerfile");
  });

  test("detects deploy docs, docker config, and standalone next output", async () => {
    const rootDir = await fixtureRoot();
    await mkdir(join(rootDir, "deploy", "enhe-ai-tools"), { recursive: true });
    await writeFile(join(rootDir, "package.json"), JSON.stringify({
      scripts: { lint: "eslint .", typecheck: "tsc --noEmit", build: "next build", start: "node server.js", test: "vitest run", "prisma:generate": "prisma generate" }
    }), "utf8");
    await writeFile(join(rootDir, "next.config.ts"), "export default { output: \"standalone\" };\n", "utf8");
    await writeFile(join(rootDir, "Dockerfile"), "FROM node:24-alpine\n", "utf8");
    await writeFile(join(rootDir, "deploy", "enhe-ai-tools", "docker-compose.yml"), "services:\n  app:\n    image: app\n", "utf8");
    await writeFile(join(rootDir, "deploy", "enhe-ai-tools", "README.md"), "# deploy\n", "utf8");
    await writeFile(join(rootDir, ".env"), "AUTH_SECRET=super-secret-value\nDATABASE_URL=postgres://secret\n", "utf8");

    const summary = await readDeploymentConfig({ rootDir });

    expect(summary.packageManagerDetected).toBe("npm");
    expect(summary.nextConfigDetected).toBe(true);
    expect(summary.standaloneOutputDetected).toBe(true);
    expect(summary.dockerfileDetected).toBe(true);
    expect(summary.dockerComposeDetected).toBe(true);
    expect(summary.deployDocsDetected).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("super-secret-value");
  });

  test("detectNextConfig and detectDeployDocs return warnings when files are absent", async () => {
    const rootDir = await fixtureRoot();
    const next = await detectNextConfig(rootDir);
    const docs = await detectDeployDocs(rootDir);

    expect(next.nextConfigDetected).toBe(false);
    expect(next.warnings.length).toBeGreaterThan(0);
    expect(docs.deployDocsDetected).toBe(false);
    expect(docs.warnings.length).toBeGreaterThan(0);
  });
});
