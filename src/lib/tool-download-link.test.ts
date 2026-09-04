import { describe, expect, it } from "vitest";
import {
  canOpenProtectedDownloadEntry,
  canShowDownloadLinkArea,
  getDownloadLinkContent,
  resolveSoftwareDownloadCtaHref
} from "@/lib/tool-download-link";

describe("tool download link visibility", () => {
  it("shows free software download links when a link exists", () => {
    expect(canShowDownloadLinkArea({ hasDownloadLink: true, isDownloadPaid: false, hasDownloadPurchase: false })).toBe(true);
  });

  it("hides paid software download links until the user has purchased that software", () => {
    expect(canShowDownloadLinkArea({ hasDownloadLink: true, isDownloadPaid: true, hasDownloadPurchase: false })).toBe(false);
    expect(canShowDownloadLinkArea({ hasDownloadLink: true, isDownloadPaid: true, hasDownloadPurchase: true })).toBe(true);
  });

  it("does not show a download link area without configured link content", () => {
    expect(canShowDownloadLinkArea({ hasDownloadLink: false, isDownloadPaid: false, hasDownloadPurchase: true })).toBe(false);
  });

  it("keeps arbitrary download link content as display text", () => {
    expect(getDownloadLinkContent({ filePath: "中文下载说明：联系管理员获取", fileUrl: "中文下载说明：联系管理员获取" })).toBe(
      "中文下载说明：联系管理员获取"
    );
  });

  it("only opens protected download entries for real locators", () => {
    expect(canOpenProtectedDownloadEntry("中文下载说明：联系管理员获取")).toBe(false);
    expect(canOpenProtectedDownloadEntry("/uploads/app.zip")).toBe(true);
    expect(canOpenProtectedDownloadEntry("https://example.com/app.zip")).toBe(true);
    expect(canOpenProtectedDownloadEntry("cos://bucket/app.zip")).toBe(true);
  });

  it("routes purchased users to the download-link section and unpaid paid users to the purchase prompt", () => {
    expect(
      resolveSoftwareDownloadCtaHref({
        hasDownloadLink: true,
        showDownloadLinkArea: true,
        isDownloadPaid: true,
        hasDownloadPurchase: true,
        protectedDownloadHref: "/api/tools/tool-1/download"
      })
    ).toBe("#download-links");

    expect(
      resolveSoftwareDownloadCtaHref({
        hasDownloadLink: true,
        showDownloadLinkArea: false,
        isDownloadPaid: true,
        hasDownloadPurchase: false,
        protectedDownloadHref: "/api/tools/tool-1/download"
      })
    ).toBe("#download-purchase");

    expect(
      resolveSoftwareDownloadCtaHref({
        hasDownloadLink: false,
        showDownloadLinkArea: false,
        isDownloadPaid: false,
        hasDownloadPurchase: false,
        protectedDownloadHref: "/api/tools/tool-1/download"
      })
    ).toBe("/api/tools/tool-1/download");
  });
});
