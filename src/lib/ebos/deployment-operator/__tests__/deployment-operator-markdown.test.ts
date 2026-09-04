import { describe, expect, test } from "vitest";
import { auditDeploymentCommands } from "../deployment-command-auditor";
import { buildDeploymentOperatorChecklist } from "../deployment-operator-checklist";
import { renderDeploymentOperatorChecklistMarkdown } from "../deployment-operator-markdown";

describe("deployment operator markdown", () => {
  test("renders the 11 required sections without claiming deployment", () => {
    const report = buildDeploymentOperatorChecklist({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "approved_not_executed",
      approvedByUser: true,
      commandAudit: auditDeploymentCommands({
        targetDate: "2026-07-03",
        deploymentPlanMarkdown: `
## Local Commands
- ready | Run lint locally | npm run lint
## Server Commands
- manual_required | Manual confirmation required | Server path must be confirmed.
`,
        executionRunbookMarkdown: `
## 4. 用户确认后才能执行的服务器命令
- nginx | approval=true | nginx -t && nginx -s reload | Nginx reload.
`
      })
    });
    const markdown = renderDeploymentOperatorChecklistMarkdown(report);

    for (const title of [
      "## 1. 当前部署状态",
      "## 2. 本次部署范围",
      "## 3. 命令安全审计",
      "## 4. 本地预检查步骤",
      "## 5. 服务器部署步骤",
      "## 6. Docker / Nginx 步骤",
      "## 7. 上线后验证步骤",
      "## 8. 状态更新规则",
      "## 9. 回滚步骤",
      "## 10. 禁止事项",
      "## 11. 下一步确认"
    ]) {
      expect(markdown).toContain(title);
    }
    expect(markdown).not.toContain("已部署");
    expect(markdown).not.toContain("cat .env");
  });
});
