import { describe, expect, test } from "vitest";
import { buildMarketEvidence } from "../market-evidence-builder";
import { renderMarketEvidenceMarkdown } from "../market-evidence-markdown";

describe("market evidence markdown", () => {
  test("renders all required sections and marks manual input as observation seeds", async () => {
    const evidence = await buildMarketEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z"
    });
    const markdown = renderMarketEvidenceMarkdown(evidence);

    expect(markdown).toContain("# ENHE Market Evidence Report");
    for (const heading of [
      "## 1. 市场机会总体评分",
      "## 2. 市场信号来源",
      "## 3. 热门主题与用户问题",
      "## 4. 产品机会评分",
      "## 5. 推荐产品方向",
      "## 6. 与 ENHE 当前产品的契合度",
      "## 7. 收益验证优先级",
      "## 8. 主要风险",
      "## 9. 增长机会",
      "## 10. Codex 市场行动任务",
      "## 11. 数据源限制与后续接入"
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("manual input 为观察种子");
  });
});
