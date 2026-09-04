import { describe, expect, test } from "vitest";
import { auditDeploymentCommands } from "../deployment-command-auditor";
import { buildDeploymentOperatorChecklist } from "../deployment-operator-checklist";

function commandAudit() {
  return auditDeploymentCommands({
    targetDate: "2026-07-03",
    deploymentPlanMarkdown: `
## Local Commands
- ready | Run lint locally | npm run lint
## Server Commands
- manual_required | Manual confirmation required | Server path must be confirmed.
## Docker Commands
- ready | Build compose stack | docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
## Verification Commands
- ready | Run post-launch check | npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn
## Rollback Steps
- Scoped rollback only; do not reset database.
`,
    executionRunbookMarkdown: `
## 4. 用户确认后才能执行的服务器命令
- nginx | approval=true | nginx -t && nginx -s reload | Nginx reload.
`
  });
}

describe("deployment operator checklist", () => {
  test("contains every deployment operator phase", () => {
    const report = buildDeploymentOperatorChecklist({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "approved_not_executed",
      approvedByUser: true,
      commandAudit: commandAudit()
    });
    const phases = new Set(report.operatorChecklist.map((item) => item.phase));

    expect(phases).toEqual(new Set([
      "local_precheck",
      "server_deploy",
      "docker_restart",
      "nginx_reload",
      "post_launch_check",
      "status_update",
      "rollback"
    ]));
  });

  test("assigns local work to Codex and server work to the user or manual path", () => {
    const report = buildDeploymentOperatorChecklist({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "approved_not_executed",
      approvedByUser: true,
      commandAudit: commandAudit()
    });

    expect(report.operatorChecklist.filter((item) => item.phase === "local_precheck").every((item) => item.actor === "codex_local")).toBe(true);
    expect(report.operatorChecklist
      .filter((item) => ["server_deploy", "docker_restart", "nginx_reload"].includes(item.phase))
      .every((item) => item.actor === "user_server" || item.actor === "manual_required")).toBe(true);
    expect(report.operatorChecklist
      .filter((item) => ["server_deploy", "docker_restart", "nginx_reload"].includes(item.phase))
      .every((item) => item.approvalRequired)).toBe(true);
  });

  test("does not include destructive database commands", () => {
    const report = buildDeploymentOperatorChecklist({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "approved_not_executed",
      approvedByUser: true,
      commandAudit: commandAudit()
    });

    expect(report.operatorChecklist.map((item) => item.command ?? "").join("\n")).not.toMatch(/migrate reset|DROP DATABASE/i);
  });
});
