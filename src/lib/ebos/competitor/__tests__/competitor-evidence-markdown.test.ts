import { describe, expect, test } from "vitest";
import { buildCompetitorEvidence } from "../competitor-evidence-builder";
import { renderCompetitorEvidenceMarkdown } from "../competitor-evidence-markdown";

const expectedHeadings = [
  "# ENHE Competitor Evidence Report",
  "## 1. 竞品分析总体评分",
  "## 2. 竞品种子与数据来源",
  "## 3. 竞品分类洞察",
  "## 4. 产品方向对比",
  "## 5. 价格与变现入口洞察",
  "## 6. SEO/GEO 页面结构洞察",
  "## 7. ENHE 差异化机会",
  "## 8. 产品缺口与内容缺口",
  "## 9. 推荐行动优先级",
  "## 10. 主要风险",
  "## 11. Codex 竞品行动任务",
  "## 12. 数据源限制与后续接入"
];

describe("competitor evidence markdown", () => {
  test("renders the required 12 Chinese report sections", async () => {
    const evidence = await buildCompetitorEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      includeNetworkSources: false
    });
    const markdown = renderCompetitorEvidenceMarkdown(evidence);
    const headings = markdown
      .split("\n")
      .filter((line) => line.startsWith("#"));

    expect(headings).toEqual(expectedHeadings);
    expect(markdown).toContain("manual seed");
    expect(markdown).toContain("不伪造竞品销量、流量或收入");
  });
});
