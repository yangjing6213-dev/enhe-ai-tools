import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductShareCard } from "./product-share-card";
import { copyProductLink } from "./product-share-actions";
import { SiteQrCode } from "./site-qr-code";

Object.assign(globalThis, { React });
const qrValues = vi.hoisted(() => [] as string[]);
vi.mock("qrcode.react", () => ({ QRCodeSVG: ({ value, ...props }: { value: string }) => {
  qrValues.push(value); return <svg {...props} />;
} }));
afterEach(() => { vi.unstubAllEnvs(); qrValues.length = 0; });

describe("product sharing", () => {
  it.each(["software", "ai-skills", "ai-workflows", "skill-learning", "account-services"])("shares the canonical %s product URL without displaying a long URL", (type) => {
    vi.stubEnv("APP_URL", "https://www.enhe-tech.com.cn");
    const html = renderToStaticMarkup(<ProductShareCard locale="zh" title="产品示例" path={`/${type}/example`} />);
    expect(qrValues).toEqual([`https://www.enhe-tech.com.cn/${type}/example`]);
    expect(html).toContain("分享此产品");
    expect(html).toContain("复制产品链接");
    expect(html).not.toContain("https://www.enhe-tech.com.cn");
    expect(html).not.toContain("value=\"https");
  });
  it("keeps the English product route in its QR code", () => {
    vi.stubEnv("APP_URL", "https://www.enhe-tech.com.cn");
    const html = renderToStaticMarkup(<ProductShareCard locale="en" title="Example" path="/en/ai-skills/example" />);
    expect(qrValues[0]).toBe("https://www.enhe-tech.com.cn/en/ai-skills/example");
    expect(html).toContain("Copy product link");
  });
  it("copies the product URL and reports denied or missing clipboard access", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyProductLink("https://example.test/software/a", { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.test/software/a");
    await expect(copyProductLink("https://example.test/software/a", { writeText: vi.fn().mockRejectedValue(new Error("Denied")) })).resolves.toBe(false);
    await expect(copyProductLink("https://example.test/software/a", undefined)).resolves.toBe(false);
  });
  it("encodes the homepage rather than the current product in the footer", () => {
    vi.stubEnv("APP_URL", "https://www.enhe-tech.com.cn");
    const html = renderToStaticMarkup(<SiteQrCode locale="zh" />);
    expect(qrValues).toEqual(["https://www.enhe-tech.com.cn/"]);
    expect(html).toContain("扫码进入网站首页");
    expect(html).toContain('role="img"');
  });
});
