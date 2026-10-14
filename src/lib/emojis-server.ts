import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { createAdminAuditCreateData, getAdminAuditRequestContext } from "@/lib/admin-audit";
import { defaultEmojis, emojiCatalogKey, EmojiCatalogError, maxEmojiEntries, parseEmojiCatalog, type EmojiEntry } from "./emojis";

export async function getAdminEmojiCatalog() {
  if (!process.env.DATABASE_URL?.trim()) return { entries: defaultEmojis, revision: "" };
  const setting = await prisma.siteSetting.findUnique({ where: { key: emojiCatalogKey } });
  return { entries: parseEmojiCatalog(setting?.value), revision: setting?.updatedAt.toISOString() ?? "" };
}

export const getPublicEmojiCatalog = unstable_cache(async () => {
  try {
    return (await getAdminEmojiCatalog()).entries;
  } catch {
    return defaultEmojis;
  }
}, ["managed-emojis"], { revalidate: 60, tags: ["managed-emojis"] });

export async function saveEmojiCatalog(entries: EmojiEntry[], revision: string, adminId: string, action: "update" | "add", targetId?: string) {
  if (!process.env.DATABASE_URL?.trim()) throw new EmojiCatalogError("当前没有连接数据库，暂时不能保存表情设置。");
  if (entries.length > maxEmojiEntries) throw new EmojiCatalogError(`最多保留 ${maxEmojiEntries} 个表情素材。`);
  const context = await getAdminAuditRequestContext();
  const catalog = await prisma.$transaction(async (tx) => {
    const current = await tx.siteSetting.findUnique({ where: { key: emojiCatalogKey } });
    if ((current?.updatedAt.toISOString() ?? "") !== revision) throw new EmojiCatalogError("另一位管理员刚修改了目录，请刷新后重试。");
    const value = JSON.stringify(entries);
    let savedRevision: string;
    if (current) {
      const result = await tx.siteSetting.updateMany({ where: { id: current.id, updatedAt: current.updatedAt, value: current.value }, data: { value } });
      if (result.count !== 1) throw new EmojiCatalogError("目录已变化，请刷新后重试。");
      const saved = await tx.siteSetting.findUnique({ where: { key: emojiCatalogKey } });
      if (!saved) throw new EmojiCatalogError("目录保存失败，请刷新后重试。");
      savedRevision = saved.updatedAt.toISOString();
    } else {
      const saved = await tx.siteSetting.create({ data: { key: emojiCatalogKey, value, description: "站内表情素材目录；停用素材保留历史显示" } });
      savedRevision = saved.updatedAt.toISOString();
    }
    await tx.adminAuditLog.create({ data: createAdminAuditCreateData({
      adminId, action: `emoji.${action}`, targetType: "emoji", targetId: targetId ?? emojiCatalogKey,
      summary: action === "add" ? "添加站内表情素材" : "更新表情名称、顺序与启用状态",
      metadata: { entries: entries.map(({ id, label, enabled, order }) => ({ id, label, enabled, order })) }
    }, context) });
    return { entries, revision: savedRevision };
  });
  try {
    revalidateTag("managed-emojis");
    revalidateTag("site-settings");
  } catch {
    // The transaction is committed. Bounded cache expiry still refreshes reads
    // if immediate invalidation is unavailable; do not report a failed save.
  }
  return catalog;
}
