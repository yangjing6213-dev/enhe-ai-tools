import { describe, expect, test } from "vitest";
import {
  auditDeploymentCommands,
  classifyDeploymentCommand,
  detectDangerousDeploymentCommand,
  detectMigrationCommand,
  detectSecretExposureRisk
} from "../deployment-command-auditor";

const safePlanMarkdown = `
# ENHE Production Deployment Plan

## Local Commands
- ready | Run lint locally | npm run lint
- ready | Run typecheck locally | npm run typecheck
- ready | Run production build locally | npm run build

## Server Commands
- manual_required | Manual confirmation required | Server project path must be confirmed before SSH or deployment commands are run.

## Docker Commands
- ready | Build and start production compose stack on server | docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build

## Verification Commands
- ready | Run public post-launch validation routes check | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn

## Rollback Steps
- Scoped rollback only; do not reset the whole worktree.
`;

const runbookMarkdown = `
# ENHE Production Deployment Execution Runbook

## 4. 用户确认后才能执行的服务器命令
- nginx | approval=true | nginx -t && nginx -s reload | Nginx reload is listed as an approval-required production operation.
`;

describe("deployment command auditor", () => {
  test("detects dangerous destructive commands", () => {
    expect(detectDangerousDeploymentCommand("rm -rf /var/www/enhe")).toBe(true);
    expect(detectDangerousDeploymentCommand("docker volume rm enhe_data")).toBe(true);
    expect(detectDangerousDeploymentCommand("DROP DATABASE enhe")).toBe(true);
  });

  test("detects prisma migration commands", () => {
    expect(detectMigrationCommand("npx prisma migrate reset")).toBe(true);
    expect(detectMigrationCommand("npx prisma migrate deploy")).toBe(true);
  });

  test("detects secret exposure commands", () => {
    expect(detectSecretExposureRisk("cat .env")).toBe(true);
    expect(detectSecretExposureRisk("Get-Content .env")).toBe(true);
    expect(detectSecretExposureRisk("printenv")).toBe(true);
  });

  test("marks server, docker, and nginx commands as manual required", () => {
    const audit = auditDeploymentCommands({
      targetDate: "2026-07-03",
      deploymentPlanMarkdown: safePlanMarkdown,
      executionRunbookMarkdown: runbookMarkdown
    });

    expect(audit.serverCommands.every((command) => command.manualRequired)).toBe(true);
    expect(audit.dockerCommands.every((command) => command.manualRequired)).toBe(true);
    expect(audit.nginxCommands.every((command) => command.manualRequired)).toBe(true);
    expect(audit.manualRequiredCommands.length).toBeGreaterThanOrEqual(3);
  });

  test("keeps safe command plans safe to proceed", () => {
    const audit = auditDeploymentCommands({
      targetDate: "2026-07-03",
      deploymentPlanMarkdown: safePlanMarkdown,
      executionRunbookMarkdown: runbookMarkdown
    });

    expect(audit.safeToProceed).toBe(true);
    expect(audit.dangerousCommandsDetected).toHaveLength(0);
    expect(audit.migrationCommandsDetected).toHaveLength(0);
    expect(audit.secretExposureRisks).toHaveLength(0);
    expect(audit.commandsAudited).toBeGreaterThan(0);
  });

  test("classifies deployment commands by command content", () => {
    expect(classifyDeploymentCommand("npm run build")).toBe("local");
    expect(classifyDeploymentCommand("docker compose ps")).toBe("docker");
    expect(classifyDeploymentCommand("nginx -t && nginx -s reload")).toBe("nginx");
    expect(classifyDeploymentCommand("ssh deploy@example.com")).toBe("server");
  });
});
