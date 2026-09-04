import { describe, expect, test } from "vitest";
import { buildExternalPublishPack } from "../validation-external-publish-pack";

describe("validation external publish pack", () => {
  test("includes required external channels", async () => {
    const pack = await buildExternalPublishPack({
      targetDate: "2026-07-03",
      assetsDir: "docs/ebos/validation-assets"
    });
    const channels = pack.map((asset) => asset.channel);

    expect(channels).toEqual(expect.arrayContaining(["xianyu", "taobao", "whop", "xiaohongshu", "wechat"]));
  });

  test("each channel has required user action and fields to record", async () => {
    const pack = await buildExternalPublishPack({
      targetDate: "2026-07-03",
      assetsDir: "docs/ebos/validation-assets"
    });

    expect(pack.every((asset) => asset.requiredUserAction.length > 0)).toBe(true);
    expect(pack.every((asset) => asset.dataFieldsToRecord.length > 0)).toBe(true);
    expect(pack.find((asset) => asset.channel === "xianyu")?.dataFieldsToRecord).toEqual(expect.arrayContaining([
      "views",
      "messages",
      "orders",
      "revenue",
      "refundCount",
      "userFeedback"
    ]));
  });

  test("does not claim external publishing results", async () => {
    const pack = await buildExternalPublishPack({
      targetDate: "2026-07-03",
      assetsDir: "docs/ebos/validation-assets"
    });
    const text = pack.map((asset) => `${asset.copySummary}\n${asset.warnings.join("\n")}`).join("\n");

    expect(text).not.toContain("published successfully");
    expect(text).not.toContain("orders received");
    expect(text).toContain("Codex cannot log in");
  });
});
