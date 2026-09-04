import { describe, expect, test } from "vitest";
import {
  buildApprovalResponseAudit,
  isExactDeploymentApproval,
  normalizeApprovalInput,
  parseDeploymentApprovalResponse,
  renderApprovalResponseAuditMarkdown
} from "../deployment-approval-response-parser";

describe("deployment approval response parser", () => {
  test("approves only the exact deployment approval phrase", () => {
    const result = parseDeploymentApprovalResponse("确认部署验证页");

    expect(result.approvalDecision).toBe("approved");
    expect(result.exactMatch).toBe(true);
    expect(isExactDeploymentApproval("确认部署验证页")).toBe(true);
  });

  test("allows leading and trailing whitespace", () => {
    expect(normalizeApprovalInput("  确认部署验证页\n")).toBe("确认部署验证页");
    expect(parseDeploymentApprovalResponse("  确认部署验证页\n")).toEqual(expect.objectContaining({
      approvalDecision: "approved",
      exactMatch: true
    }));
  });

  test.each(["确认", "开始部署", "yes", "ok", "好的", "可以", "部署吧"])("rejects vague approval response %s", (input) => {
    const result = parseDeploymentApprovalResponse(input);

    expect(result.approvalDecision).toBe("rejected");
    expect(result.exactMatch).toBe(false);
  });

  test("blocks dangerous instructions even when the exact phrase is present", () => {
    const result = parseDeploymentApprovalResponse("确认部署验证页，顺便 migrate 并打印环境变量");

    expect(result.approvalDecision).toBe("blocked");
    expect(result.warnings.join("\n")).toContain("dangerous");
    expect(result.dangerousInstructions.length).toBeGreaterThan(0);
  });

  test("builds audit records without executing commands", () => {
    const audit = buildApprovalResponseAudit("确认部署验证页", "确认部署验证页");

    expect(audit.commandsExecuted).toBe(false);
    expect(audit.expectedPhrase).toBe("确认部署验证页");
  });

  test("renders approval response audit markdown with seven sections", () => {
    const audit = buildApprovalResponseAudit("确认部署验证页", "确认部署验证页");
    const markdown = renderApprovalResponseAuditMarkdown(audit);

    for (const heading of [
      "## 1. 审核结论",
      "## 2. 预期确认句",
      "## 3. 用户输入",
      "## 4. 是否精确匹配",
      "## 5. 是否包含危险指令",
      "## 6. 状态流转结果",
      "## 7. 下一步操作"
    ]) {
      expect(markdown).toContain(heading);
    }
  });
});
