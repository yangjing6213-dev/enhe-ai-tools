import { describe, expect, it } from "vitest";
import { parseSiteEntryNotice, siteEntryNoticeSchema } from "./site-entry-notice";

describe("site entry notice settings", () => {
  it("keeps the existing bilingual announcement enabled when no saved setting exists", () => {
    const config = parseSiteEntryNotice(undefined);

    expect(config.enabled).toBe(true);
    expect(config.zhTitle).toBe("本站最新公告通知");
    expect(config.enTitle).toBe("Latest Site Announcement");
    expect(config.zhBody).toContain("本站部分自制软件可能尚未上架应用市场");
    expect(config.enBody).toContain("Some software made by ENHE AI may not be listed in app stores");
    expect(config.zhEnding).toContain("联系客服");
  });

  it("accepts edited bilingual text and preserves the saved notice revision", () => {
    const defaults = parseSiteEntryNotice(undefined);
    const edited = {
      ...defaults,
      version: 4,
      zhTitle: "最新公告",
      zhBody: "更新后的正文",
      zhEnding: "更新后的结尾",
    };

    expect(siteEntryNoticeSchema.safeParse(edited).success).toBe(true);
    expect(parseSiteEntryNotice(JSON.stringify(edited))).toEqual(edited);
  });

  it("falls back safely when the stored setting is malformed", () => {
    expect(parseSiteEntryNotice("not json")).toEqual(parseSiteEntryNotice(undefined));
  });
});
