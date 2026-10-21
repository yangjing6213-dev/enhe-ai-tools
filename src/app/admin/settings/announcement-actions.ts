"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { SITE_ANNOUNCEMENT_KEY, siteAnnouncementSchema, type SiteAnnouncementActionState } from "@/lib/site-announcement";

export async function saveSiteAnnouncementAction(_previous: SiteAnnouncementActionState, formData: FormData): Promise<SiteAnnouncementActionState> {
  const admin = await requireAdmin();
  const parsed = siteAnnouncementSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    zhText: formData.get("zhText") ?? "",
    enText: formData.get("enText") ?? "",
    zhHref: formData.get("zhHref") ?? "",
    enHref: formData.get("enHref") ?? "",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const value = JSON.stringify(parsed.data);
  await prisma.siteSetting.upsert({
    where: { key: SITE_ANNOUNCEMENT_KEY },
    update: { value },
    create: { key: SITE_ANNOUNCEMENT_KEY, value, description: "导航栏下方的中英文网站通知。" },
  });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "site.announcement.update",
    targetType: "site_setting",
    targetId: SITE_ANNOUNCEMENT_KEY,
    summary: "Updated bilingual site announcement.",
    metadata: { enabled: parsed.data.enabled },
  });
  revalidateTag("site-settings");
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { status: "success", message: parsed.data.enabled ? "通知已保存并启用。已关闭通知的访客会在下次访问时看到。" : "通知已保存，当前已关闭展示。" };
}
