import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("site entry notice", () => {
  it("shows the bilingual notice and homepage QR once per browser session", () => {
    const component = readFileSync(resolve(root, "src/components/site-entry-notice.tsx"), "utf8");
    const styles = readFileSync(resolve(root, "src/components/site-entry-notice.module.css"), "utf8");
    const qr = readFileSync(resolve(root, "src/components/site-qr-code.tsx"), "utf8");
    const chrome = readFileSync(resolve(root, "src/components/public-site-chrome.tsx"), "utf8");

    expect(chrome).toContain("<SiteEntryNotice locale={forceLocale} />");
    expect(component).toContain("sessionStorage");
    expect(component).toContain('aria-modal="true"');
    expect(qr).toContain("扫码收藏网站");
    expect(qr).toContain("Scan to bookmark this site");
    expect(component).toContain("ENHE AI");
    expect(component).toContain("已下载或使用的数字服务通常不支持无理由退款");
    expect(styles).toContain(".dialog::backdrop");
    expect(styles).toContain("max-height");
  });
});
