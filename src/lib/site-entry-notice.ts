import { z } from "zod";

export const SITE_ENTRY_NOTICE_KEY = "site_entry_notice";

export const DEFAULT_SITE_ENTRY_NOTICE = {
  enabled: true,
  version: 1,
  zhTitle: "本站最新公告通知",
  enTitle: "Latest Site Announcement",
  zhBody: [
    "感谢您访问 ENHE AI 官网。",
    "本站部分自制软件可能尚未上架应用市场，部分安全软件可能出现误报。介意请勿下载；下载前请核对产品页面说明。",
    "本站资源包含 AI 开发应用、Skills、虚拟服务等；各产品的审核状态、功能与运行要求以对应产品页面为准。",
    "数字商品下载或服务开通后通常视为已交付；已开通、已下载或使用的数字服务通常不支持无理由退款。未交付、重复付款、质量问题等情形，按法律规定及本站退款规则处理。",
    "请认真阅读系统与配置要求，确认设备满足要求后再付款。",
  ].join("\n\n"),
  enBody: [
    "Thank you for visiting the ENHE AI website.",
    "Some software made by ENHE AI may not be listed in app stores, and security software may report a false positive. If this is a concern, please do not download it; review the product page first.",
    "The site offers AI development apps, Skills, and virtual services. Review status, features, and system requirements are shown on each product page.",
    "A digital product download or service activation is generally treated as delivery. Activated, downloaded, or used digital services are generally not eligible for no-reason refunds. Non-delivery, duplicate payment, quality issues, and other cases are handled under applicable law and the published refund rules.",
    "Read the system requirements carefully and confirm your device meets them before paying.",
  ].join("\n\n"),
  zhEnding: "如有任何疑问，请联系客服：",
  enEnding: "Questions? Contact",
} as const;

export const siteEntryNoticeSchema = z.object({
  enabled: z.boolean(),
  version: z.number().int().positive().default(1),
  zhTitle: z.string().trim().min(1, "请填写中文弹窗标题。").max(80, "中文标题最多 80 个字符。"),
  enTitle: z.string().trim().min(1, "请填写英文弹窗标题。").max(120, "英文标题最多 120 个字符。"),
  zhBody: z.string().trim().min(1, "请填写中文弹窗正文。").max(3000, "中文正文最多 3000 个字符。"),
  enBody: z.string().trim().min(1, "请填写英文弹窗正文。").max(4000, "英文正文最多 4000 个字符。"),
  zhEnding: z.string().trim().max(240, "中文结尾最多 240 个字符。"),
  enEnding: z.string().trim().max(320, "英文结尾最多 320 个字符。"),
});

export const siteEntryNoticeInputSchema = siteEntryNoticeSchema.omit({ version: true });

export type SiteEntryNoticeConfig = z.infer<typeof siteEntryNoticeSchema>;
export type SiteEntryNoticeActionState = { status: "idle" | "success" | "error"; message: string };

export function parseSiteEntryNotice(value: string | undefined): SiteEntryNoticeConfig {
  if (value) {
    try {
      const parsed = siteEntryNoticeSchema.safeParse(JSON.parse(value));
      if (parsed.success) return parsed.data;
    } catch {
      // Keep the existing safe announcement if a stored value is malformed.
    }
  }
  return DEFAULT_SITE_ENTRY_NOTICE;
}
