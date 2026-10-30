"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import {
  SITE_ENTRY_NOTICE_KEY,
  parseSiteEntryNotice,
  siteEntryNoticeInputSchema,
  type SiteEntryNoticeActionState,
} from "@/lib/site-entry-notice";

export async function saveSiteEntryNoticeAction(
  _previous: SiteEntryNoticeActionState,
  formData: FormData,
): Promise<SiteEntryNoticeActionState> {
  const admin = await requireAdmin();
  const parsed = siteEntryNoticeInputSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    zhTitle: formData.get("zhTitle") ?? "",
    enTitle: formData.get("enTitle") ?? "",
    zhBody: formData.get("zhBody") ?? "",
    enBody: formData.get("enBody") ?? "",
    zhEnding: formData.get("zhEnding") ?? "",
    enEnding: formData.get("enEnding") ?? "",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "弹窗设置无效。" };

  const existing = await prisma.siteSetting.findUnique({ where: { key: SITE_ENTRY_NOTICE_KEY }, select: { value: true } });
  const previous = parseSiteEntryNotice(existing?.value);
  const next = { ...parsed.data, version: previous.version + 1 };
  const value = JSON.stringify(next);

  await prisma.siteSetting.upsert({
    where: { key: SITE_ENTRY_NOTICE_KEY },
    update: { value },
    create: { key: SITE_ENTRY_NOTICE_KEY, value, description: "进入网站时显示的中英文公告弹窗。" },
  });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "site.entry_notice.update",
    targetType: "site_setting",
    targetId: SITE_ENTRY_NOTICE_KEY,
    summary: "Updated the bilingual site entry notice.",
    metadata: { enabled: next.enabled, version: next.version },
  });
  revalidateTag("site-settings");
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: next.enabled ? "进入网站公告弹窗已保存并启用。" : "进入网站公告弹窗已保存并关闭。",
  };
}
