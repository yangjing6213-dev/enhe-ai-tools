import { z } from "zod";

export const SITE_ANNOUNCEMENT_KEY = "site_announcement";

function safeAnnouncementHref(href: string) {
  if (!href) return true;
  if (/[\u0000-\u0020\u007f\\]/u.test(href)) return false;
  if (href.startsWith("/")) return !href.startsWith("//");
  try {
    const url = new URL(href);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const link = z.string().trim().max(2000, "链接不能超过 2000 个字符。").refine(safeAnnouncementHref, "链接请使用 / 开头的站内路径或完整的 http/https 网址。");

export const siteAnnouncementSchema = z.object({
  enabled: z.boolean(),
  zhText: z.string().trim().max(240, "中文通知最多 240 个字符。"),
  enText: z.string().trim().max(240, "英文通知最多 240 个字符。"),
  zhHref: link,
  enHref: link,
}).refine((value) => !value.enabled || (value.zhText.length > 0 && value.enText.length > 0), {
  message: "启用通知时，请填写中文和英文文案。",
});

export type SiteAnnouncementConfig = z.infer<typeof siteAnnouncementSchema>;
export type SiteAnnouncementActionState = { status: "idle" | "success" | "error"; message: string };

export function parseSiteAnnouncement(value: string | undefined): SiteAnnouncementConfig {
  if (value) {
    try {
      const parsed = siteAnnouncementSchema.safeParse(JSON.parse(value));
      if (parsed.success) return parsed.data;
    } catch {
      // Malformed settings must never publish an invalid notice or unsafe link.
    }
  }
  return { enabled: false, zhText: "", enText: "", zhHref: "", enHref: "" };
}
