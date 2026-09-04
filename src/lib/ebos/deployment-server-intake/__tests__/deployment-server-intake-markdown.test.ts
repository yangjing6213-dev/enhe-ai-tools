import { describe, expect, test } from "vitest";
import { renderServerDeploymentCommandPackMarkdown } from "../deployment-server-intake-markdown";
import type { EbosServerDeploymentCommandPack } from "../deployment-server-intake-types";

describe("server intake markdown", () => {
  test("renders 10 sections and does not claim deployment", () => {
    const pack: EbosServerDeploymentCommandPack = {
      packType: "server_deployment_command_pack",
      targetDate: "2026-07-03",
      generatedAt: "2026-07-05T01:00:00.000Z",
      currentDeploymentStatus: "executing",
      manualRequiredCommands: ["docker compose ps"],
      commandGroups: [
        {
          groupId: "docker",
          title: "Docker 命令",
          environment: "docker",
          commands: ["docker compose ps"],
          expectedOutcome: "容器状态可见。",
          failureHandling: "失败则停止并记录 failures。",
          evidenceToCollect: ["非 secret 输出摘要"],
          rollbackNote: "必要时使用 scoped rollback。",
          riskLevel: "high",
          approvalRequired: true
        }
      ],
      executionOrder: ["docker_commands", "status_recording"],
      resultInputTemplatePath: "reports/ebos/deployment/execution/command-results/2026-07-03-server-deployment-result.json",
      safetyWarnings: ["不要打印 secret。"],
      rollbackNotes: ["不要 reset 数据库。"],
      nextCommands: ["npx tsx scripts/check-ebos-server-deployment-result-input.ts --date 2026-07-03"]
    };
    const markdown = renderServerDeploymentCommandPackMarkdown(pack);

    for (const title of [
      "## 1. 当前状态",
      "## 2. 服务器执行顺序",
      "## 3. Server 命令",
      "## 4. Docker 命令",
      "## 5. Nginx 命令",
      "## 6. 需要收集的执行结果",
      "## 7. 如何填写 server-deployment-result.json",
      "## 8. 失败处理",
      "## 9. 回滚提示",
      "## 10. 下一步命令"
    ]) {
      expect(markdown).toContain(title);
    }
    expect(markdown).toContain("执行结果必须来自真实服务器");
    expect(markdown).not.toContain("已部署");
  });
});
