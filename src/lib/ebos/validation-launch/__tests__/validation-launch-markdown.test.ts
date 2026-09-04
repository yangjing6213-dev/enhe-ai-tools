import { describe, expect, test } from "vitest";
import { renderValidationLaunchRunbookMarkdown } from "../validation-launch-markdown";
import { buildValidationLaunchRunbook } from "../validation-launch-runbook";

describe("validation launch markdown", () => {
  test("renders 11 required headings", () => {
    const markdown = renderValidationLaunchRunbookMarkdown(buildValidationLaunchRunbook({
      targetDate: "2026-07-03"
    }));

    for (const heading of [
      "# ENHE Validation Launch Operator Runbook",
      "## 1. 发布目标",
      "## 2. 当前准备状态",
      "## 3. 验证页检查",
      "## 4. CTA Tracking 检查",
      "## 5. 验证素材检查",
      "## 6. 外部渠道发布步骤",
      "## 7. 数据填报与导入步骤",
      "## 8. Codex 可执行命令",
      "## 9. 用户最少动作",
      "## 10. 回滚与风险",
      "## 11. 下一步复盘"
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  test("is user-friendly and includes commands plus minimum actions", () => {
    const markdown = renderValidationLaunchRunbookMarkdown(buildValidationLaunchRunbook({
      targetDate: "2026-07-03"
    }));

    expect(markdown).toContain("npm run lint");
    expect(markdown).toContain("npx tsx scripts/generate-ebos-validation-report.ts --date 2026-07-03");
    expect(markdown).toContain("确认发布验证页");
    expect(markdown).toContain("不会替你编造");
  });
});
