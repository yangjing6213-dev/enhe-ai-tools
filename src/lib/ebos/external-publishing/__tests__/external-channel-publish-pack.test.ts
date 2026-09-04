import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  buildChannelPublishAsset,
  buildExternalPublishingPack,
  buildTrackingFields,
  DEFAULT_EXTERNAL_PUBLISHING_CHANNELS
} from "../external-channel-publish-pack";
import { writeExternalPublishResultInputTemplate } from "../external-publish-status-template";

describe("external channel publish pack", () => {
  test("generates publish assets for the six default channels", () => {
    const pack = buildExternalPublishingPack({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-05T00:00:00.000Z"
    });

    expect(pack.channels).toEqual(DEFAULT_EXTERNAL_PUBLISHING_CHANNELS);
    expect(pack.publishAssets).toHaveLength(6);
    expect(pack.verifiedLandingPages).toContain("https://www.enhe-tech.com.cn/validation/ai-prompt-kit");
    expect(pack.publishAssets.every((asset) => asset.title.length > 0)).toBe(true);
    expect(pack.publishAssets.every((asset) => asset.dataFieldsToRecord.length > 0)).toBe(true);
    expect(pack.safetyWarnings.join("\n")).toContain("Do not invent");
  });

  test("builds channel-specific tracking fields", () => {
    expect(buildTrackingFields("xianyu")).toEqual(expect.arrayContaining(["views", "messages", "orders", "revenue"]));
    expect(buildTrackingFields("xiaohongshu")).toEqual(expect.arrayContaining(["views", "saves", "shares", "leads"]));
    expect(buildTrackingFields("manual_outreach")).toEqual(expect.arrayContaining(["positiveReplies", "negativeReplies"]));
  });

  test("uses optimized free-sample and pricing-validation copy", () => {
    const manual = buildChannelPublishAsset("manual_outreach");
    const xiaohongshu = buildChannelPublishAsset("xiaohongshu");
    const xianyu = buildChannelPublishAsset("xianyu");
    const whop = buildChannelPublishAsset("whop");

    expect(manual.longDescription).toContain("我整理了 5 个可以免费领取的 AI Prompt 样例");
    expect(xiaohongshu.longDescription).toContain("我整理了 20 个能直接用的 AI 提示词，免费送");
    expect(xiaohongshu.longDescription).toContain("不会写提示词？我做了一套可复制的 AI 模板");
    expect(xiaohongshu.longDescription).toContain("做副业/自媒体/产品上架，这些 Prompt 真的能省时间");
    expect(xianyu.priceSuggestion).toContain("0 元");
    expect(xianyu.priceSuggestion).toContain("19 元");
    expect(xianyu.priceSuggestion).toContain("49 元");
    expect(xianyu.priceSuggestion).toContain("99 元");
    expect(whop.longDescription).toContain("Free samples");
  });

  test("does not overwrite an existing result input unless forced", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ebos-external-pack-"));
    const filePath = join(dir, "2026-07-03-external-publish-result-input.json");
    const original = "{\"keep\":\"existing real user input\"}\n";

    try {
      await writeFile(filePath, original, "utf8");
      const result = await writeExternalPublishResultInputTemplate({
        targetDate: "2026-07-03",
        filePath
      });

      expect(result.written).toBe(false);
      expect(result.skippedReason).toContain("already exists");
      await expect(readFile(filePath, "utf8")).resolves.toBe(original);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
