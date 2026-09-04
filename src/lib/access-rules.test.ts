import { describe, expect, it } from "vitest";
import {
  canDownloadPaidTool,
  canUsePaidOnlineTool,
  getDownloadRateLimitConfig,
  isDownloadRateLimitExceeded
} from "@/lib/access-rules";

describe("access rules", () => {
  it("allows free software downloads without a purchase", () => {
    expect(canDownloadPaidTool({ isDownloadPaid: false, hasDownloadPurchase: false })).toBe(true);
  });

  it("requires a matching purchase for paid software downloads", () => {
    expect(canDownloadPaidTool({ isDownloadPaid: true, hasDownloadPurchase: false })).toBe(false);
    expect(canDownloadPaidTool({ isDownloadPaid: true, hasDownloadPurchase: true })).toBe(true);
  });

  it("requires a matching purchase for paid online account services", () => {
    expect(canUsePaidOnlineTool({ servicePrice: 195, hasToolPurchase: false })).toBe(false);
    expect(canUsePaidOnlineTool({ servicePrice: 195, hasToolPurchase: true })).toBe(true);
    expect(canUsePaidOnlineTool({ servicePrice: 0, hasToolPurchase: false })).toBe(true);
  });

  it("parses download rate limit settings with safe defaults", () => {
    expect(getDownloadRateLimitConfig({ DOWNLOAD_RATE_LIMIT_MAX: "5", DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS: "30" })).toEqual({
      max: 5,
      windowSeconds: 30
    });
    expect(getDownloadRateLimitConfig({ DOWNLOAD_RATE_LIMIT_MAX: "0", DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS: "-1" })).toEqual({
      max: 10,
      windowSeconds: 60
    });
  });

  it("detects when download attempts exceed the configured window limit", () => {
    expect(isDownloadRateLimitExceeded(9, 10)).toBe(false);
    expect(isDownloadRateLimitExceeded(10, 10)).toBe(true);
  });
});
