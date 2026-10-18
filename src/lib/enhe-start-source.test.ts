import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("enhe-start runtime identity and health gates", () => {
  it("verifies the selected image before starting any service", () => {
    const start = read("deploy/enhe-ai-tools/scripts/enhe-start.sh");
    const firstStart = start.indexOf("compose up -d --no-build");
    const runtimeUser = start.indexOf('write_enhe_runtime_user_override "$image_id"');

    expect(start).toContain(
      'docker image inspect --format \'{{.Id}}\' "enhe-ai-tools:$APP_IMAGE_TAG"',
    );
    expect(start).toContain("org.opencontainers.image.revision");
    expect(start).toContain("ROLLBACK_RELEASE_REF");
    expect(start).toContain(
      'if [ "$image_release_ref" != "$expected_release_ref" ]',
    );
    expect(start).toContain('RELEASE_REF="$expected_release_ref"');
    expect(start).toContain(
      "APP_IMAGE_TAG must identify an existing immutable image.",
    );
    expect(start).toContain("Image release identity does not match RELEASE_REF.");
    expect(firstStart).toBeGreaterThan(-1);
    expect(runtimeUser).toBeGreaterThan(-1);
    expect(start.indexOf("docker image inspect")).toBeLessThan(runtimeUser);
    expect(start.indexOf('if [ "$image_release_ref" != "$expected_release_ref" ]')).toBeLessThan(runtimeUser);
    expect(runtimeUser).toBeLessThan(firstStart);
    expect(start).toContain(
      'docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -f "$runtime_user_override" "$@"',
    );
  });

  it("clears stale heartbeats and gates all runtime services plus app health", () => {
    const start = read("deploy/enhe-ai-tools/scripts/enhe-start.sh");
    const heartbeatClear = start.indexOf('rm -f \\\n  "$RUNTIME_DIR/seo-audit-worker-heartbeat.json"');
    const firstStart = start.indexOf("compose up -d --no-build");

    expect(start).toContain("seo-audit-worker-heartbeat.json");
    expect(start).toContain("seo-audit-scheduler-heartbeat.json");
    expect(start).toContain("rm -f");
    expect(start).toContain("container_is_healthy enhe-ai-tools-app");
    expect(start).toContain(
      "container_is_healthy enhe-ai-tools-seo-audit-worker",
    );
    expect(start).toContain(
      "container_is_healthy enhe-ai-tools-seo-audit-scheduler",
    );
    expect(start).toContain("fetch('http://127.0.0.1:3000/api/health')");
    expect(start).toContain("Full runtime health check failed.");
    expect(start).toContain("./node_modules/.bin/prisma migrate status");
    expect(heartbeatClear).toBeGreaterThan(-1);
    expect(firstStart).toBeGreaterThan(-1);
    expect(heartbeatClear).toBeLessThan(firstStart);
    expect(
      start.indexOf("fetch('http://127.0.0.1:3000/api/health')"),
    ).toBeLessThan(start.indexOf("./node_modules/.bin/prisma migrate status"));
  });

  it("starts without building and requires explicit identity for rollback tags", () => {
    const start = read("deploy/enhe-ai-tools/scripts/enhe-start.sh");

    const startCalls = [...start.matchAll(/^\s*compose up ([^\n]+)/gm)];
    expect(startCalls).toHaveLength(2);
    for (const call of startCalls) expect(call[1]).toContain("--no-build");
    expect(start).not.toMatch(/^\s*compose build\b/m);
    expect(start).toContain(
      "ROLLBACK_RELEASE_REF is required when APP_IMAGE_TAG is a rollback tag.",
    );
    expect(start).toContain(
      'expected_release_ref="$(printf \'%s\' "$ROLLBACK_RELEASE_REF"',
    );
    expect(start).toContain('rollback-*) should_inspect_current=0');
  });

  it("restores a persisted legacy app-only topology without trusting a label", () => {
    const start = read("deploy/enhe-ai-tools/scripts/enhe-start.sh");
    const rollback = read("deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh");

    expect(start).toContain("active-release.env");
    expect(start).toContain("RELEASE_IDENTITY_VERIFIED");
    expect(start).toContain("LEGACY_IMAGE_ID");
    expect(start).toContain('if [ "$release_identity_verified" = "0" ]');
    expect(start).toContain('rollback_topology="app-only"');
    expect(start).toContain("/api/health?scope=app");
    expect(rollback).toContain("LEGACY_IMAGE_ID=%s");
  });
});
