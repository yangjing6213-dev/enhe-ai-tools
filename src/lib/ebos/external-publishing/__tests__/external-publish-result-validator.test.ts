import { describe, expect, test } from "vitest";
import {
  summarizeExternalPublishResults,
  validateExternalPublishResultInput
} from "../external-publish-result-validator";
import { buildExternalPublishResultInputTemplate } from "../external-publish-status-template";

describe("external publish result validator", () => {
  test("treats all-zero template as valid but not backfillable", () => {
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });
    const result = validateExternalPublishResultInput(input);

    expect(result.valid).toBe(true);
    expect(result.hasRealSignals).toBe(false);
    expect(result.canBackfill).toBe(false);
    expect(result.publishCoverage).toBe(0);
    expect(result.dataCoverage).toBe(0);
  });

  test("warns when published URL is missing", () => {
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });
    input.channelResults[0].published = true;

    const result = validateExternalPublishResultInput(input);

    expect(result.warnings).toContainEqual(expect.stringContaining("publishedUrl is empty"));
    expect(result.blockers).toEqual([]);
  });

  test("blocks impossible order and refund relationships", () => {
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });
    input.channelResults[0] = {
      ...input.channelResults[0],
      orders: 1,
      paidOrders: 2,
      refundCount: 3,
      revenue: 10,
      refundedAmount: 11
    };

    const result = validateExternalPublishResultInput(input);

    expect(result.valid).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining("paidOrders is greater than orders"),
      expect.stringContaining("refundCount is greater than paidOrders"),
      expect.stringContaining("refundedAmount is greater than revenue")
    ]));
  });

  test("detects real observed signals", () => {
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });
    input.channelResults[0] = {
      ...input.channelResults[0],
      published: true,
      publishedUrl: "https://example.com/listing",
      views: 10,
      messages: 1
    };

    const result = validateExternalPublishResultInput(input);
    const summary = summarizeExternalPublishResults(input);

    expect(result.hasRealSignals).toBe(true);
    expect(result.canBackfill).toBe(true);
    expect(summary.publishedChannels).toContain("xianyu");
    expect(summary.channelsWithData).toContain("xianyu");
  });
});
