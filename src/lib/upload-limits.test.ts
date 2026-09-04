import { describe, expect, it } from "vitest";
import {
  adminFileUploadBodySizeLimit,
  adminFileUploadMaxBytes,
  isUploadBodyLimitEnough,
  parseUploadSizeLimitToBytes
} from "@/lib/upload-limits";

describe("upload limits", () => {
  it("keeps the Next.js action body limit above the admin file upload limit", () => {
    expect(isUploadBodyLimitEnough(adminFileUploadBodySizeLimit, adminFileUploadMaxBytes)).toBe(true);
  });

  it("parses human readable upload limits", () => {
    expect(parseUploadSizeLimitToBytes("1mb")).toBe(1024 * 1024);
    expect(parseUploadSizeLimitToBytes("1.5gb")).toBe(1.5 * 1024 * 1024 * 1024);
  });
});
