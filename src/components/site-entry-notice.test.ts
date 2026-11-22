import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("site entry notice", () => {
  it("shows the notice only on a fresh homepage visit in the current tab session and offers bookmarking", () => {
    const component = readFileSync(resolve(root, "src/components/site-entry-notice.tsx"), "utf8");
    const favoriteButton = readFileSync(resolve(root, "src/components/favorite-site-button.tsx"), "utf8");
    const styles = readFileSync(resolve(root, "src/components/site-entry-notice.module.css"), "utf8");
    const qr = readFileSync(resolve(root, "src/components/site-qr-code.tsx"), "utf8");
    const chrome = readFileSync(resolve(root, "src/components/public-site-chrome.tsx"), "utf8");
    const config = readFileSync(resolve(root, "src/lib/site-entry-notice.ts"), "utf8");

    expect(chrome).toContain("<SiteEntryNotice locale={forceLocale} config={entryNoticeConfig} />");
    expect(component).toContain("usePathname");
    expect(component).toContain("isSiteEntryNoticeHomePath");
    expect(component).toContain("sessionStorage.getItem(SITE_ENTRY_NOTICE_SESSION_KEY)");
    expect(component).toContain("sessionStorage.setItem(SITE_ENTRY_NOTICE_SESSION_KEY, \"1\")");
    expect(component).toContain('localStorage.getItem("enhe-e2e-entry-notice-dismissed-v1")');
    expect(component).toContain("FavoriteSiteButton");
    expect(component).toContain('aria-modal="true"');
    expect(component).toContain('titleRef.current?.focus({ preventScroll: true })');
    expect(component).toContain("Got it");
    expect(component).toContain("我知道了");
    expect(favoriteButton).toContain("收藏本站");
    expect(favoriteButton).toContain("Ctrl+D");
    expect(component).not.toContain("autoFocus");
    expect(qr).toContain("扫码收藏网站");
    expect(qr).toContain("Scan to bookmark this site");
    expect(config).toContain("ENHE AI");
    expect(config).toContain("已下载或使用的数字服务通常不支持无理由退款");
    expect(styles).toContain(".dialog::backdrop");
    expect(styles).toContain("max-height");
  });
});
