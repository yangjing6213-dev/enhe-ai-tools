import { describe, expect, it } from "vitest";
import {
  canOpenProtectedDownloadEntry,
  canShowDownloadLinkArea,
  getDownloadLinkContent,
  linkifyDownloadLinkContent,
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

  it("turns http download URLs inside text into clickable link segments", () => {
    expect(
      linkifyDownloadLinkContent("下载地址：https://example.com/app.zip。备用：https://backup.example.com/app.zip 提取码：1234")
    ).toEqual([
      { type: "text", text: "下载地址：" },
      { type: "link", text: "https://example.com/app.zip", href: "https://example.com/app.zip" },
      { type: "text", text: "。备用：" },
      { type: "link", text: "https://backup.example.com/app.zip", href: "https://backup.example.com/app.zip" },
      { type: "text", text: " 提取码：1234" }
    ]);
  });

  it("keeps Feishu wiki query strings when linkifying tutorial links", () => {
    const url = "https://qcnerk9meslu.feishu.cn/wiki/CEqtwGF9BiOQXNkzEmVcWecGnWe?from=from_copylink";

    expect(linkifyDownloadLinkContent(`教程链接：${url}`)).toEqual([
      { type: "text", text: "教程链接：" },
      { type: "link", text: url, href: url }
    ]);
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

  it("never exposes a public direct download link for paid software", () => {
    expect(
      resolveSoftwareDownloadCtaHref({
        hasDownloadLink: true,
        showDownloadLinkArea: false,
        isDownloadPaid: true,
        hasDownloadPurchase: false,
        protectedDownloadHref: "/api/tools/tool-1/download",
        publicDownloadHref: "https://example.com/paid-app.zip"
      })
    ).toBe("#download-purchase");
  });
});

it("preserves authored delivery indentation, blank lines and emoji", () => {
  const content = "  您好 ✅\n\n    下载说明\n\n\n完成 👍🏽  ";
  expect(getDownloadLinkContent({ fileUrl: content })).toBe(content);
  expect(linkifyDownloadLinkContent(content).map(segment => segment.text).join("")).toBe(content);
});
