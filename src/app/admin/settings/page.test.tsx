import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });
vi.mock("@/lib/db", () => ({
  prisma: { siteSetting: { findMany: () => [
    { id: "1", key: "alipay_qr", value: "private-alipay-fixture" },
    { id: "2", key: "wechat_qr", value: "private-wechat-fixture" },
    { id: "3", key: "site_name", value: "Fixture site name" },
    { id: "4", key: "managed_emoji_catalog", value: "emoji-json-fixture" },
    { id: "5", key: "home_product_showcase_v1", value: "showcase-json-fixture" },
    { id: "6", key: "footer_links", value: "footer-links-fixture" }
  ] } }
}));
vi.mock("@/app/admin/actions", () => ({ updateSiteSettingAction: vi.fn() }));
vi.mock("./announcement-form", () => ({ AnnouncementForm: () => null }));
vi.mock("./entry-notice-form", () => ({ EntryNoticeForm: () => null }));

import AdminSettingsPage from "./page";

describe("site settings editors", () => {
  it("links to dedicated editors once and leaves unrelated settings editable", async () => {
    const html = renderToStaticMarkup(await AdminSettingsPage());
    for (const path of ["payment-codes", "emojis", "product-demos"]) {
      expect(html.split(`href="/admin/${path}"`)).toHaveLength(2);
    }
    expect(html).not.toMatch(/alipay_qr|wechat_qr|managed_emoji_catalog|home_product_showcase_v1|private-(?:alipay|wechat)-fixture|(?:emoji|showcase)-json-fixture/);
    expect(html).toContain('value="site_name"');
    expect(html).toContain("Fixture site name");
    expect(html).toContain('value="footer_links"');
    expect(html).toContain("footer-links-fixture");
  });
});
