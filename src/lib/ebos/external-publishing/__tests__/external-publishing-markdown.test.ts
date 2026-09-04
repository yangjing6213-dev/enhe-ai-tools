import { describe, expect, test } from "vitest";
import { buildExternalPublishingPack } from "../external-channel-publish-pack";
import { renderExternalPublishingPackMarkdown } from "../external-publishing-markdown";

describe("external publishing markdown", () => {
  test("contains the required 11 sections", () => {
    const markdown = renderExternalPublishingPackMarkdown(buildExternalPublishingPack({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-05T00:00:00.000Z"
    }));

    for (const heading of [
      "## 1. 当前状态",
      "## 2. 已验证的落地页",
      "## 3. 闲鱼发布包",
      "## 4. 淘宝发布包",
      "## 5. Whop 发布包",
      "## 6. 小红书发布包",
      "## 7. 微信发布包",
      "## 8. 人工触达话术",
      "## 9. 数据记录字段",
      "## 10. 回填流程",
      "## 11. 下一步命令"
    ]) {
      expect(markdown).toContain(heading);
    }
  });
});
