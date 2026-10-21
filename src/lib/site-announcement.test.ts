import { describe, expect, it } from "vitest";
import { parseSiteAnnouncement, siteAnnouncementSchema } from "./site-announcement";

const announcement = { enabled: true, zhText: "查看新工具", enText: "Explore new tools", zhHref: "/software", enHref: "/en/software" };

describe("site announcement", () => {
  it("reads bilingual content and supports optional links", () => {
    expect(parseSiteAnnouncement(JSON.stringify(announcement))).toEqual(announcement);
    expect(siteAnnouncementSchema.parse({ ...announcement, zhHref: "", enHref: "https://example.com/news?q=ai" }).zhHref).toBe("");
  });
  it("keeps absent or malformed settings disabled", () => {
    for (const value of [undefined, "", "{", "null", JSON.stringify({ ...announcement, enText: "" })]) {
      expect(parseSiteAnnouncement(value).enabled).toBe(false);
    }
    expect(siteAnnouncementSchema.safeParse({ ...announcement, enabled: false, zhText: "", enText: "" }).success).toBe(true);
  });
  it.each(["javascript:alert(1)", "data:text/html,hi", "//example.com", "/\\example.com", "https://user:pass@example.com", "http://", "https://example.com\n/path"])("rejects unsafe link %s", (href) => {
    expect(siteAnnouncementSchema.safeParse({ ...announcement, zhHref: href }).success).toBe(false);
  });
  it("requires both languages and limits announcement length", () => {
    expect(siteAnnouncementSchema.safeParse({ ...announcement, enText: " " }).success).toBe(false);
    expect(siteAnnouncementSchema.safeParse({ ...announcement, zhText: "a".repeat(241) }).success).toBe(false);
  });
});
