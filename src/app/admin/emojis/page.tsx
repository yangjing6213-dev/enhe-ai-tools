import { AdminContentShell, AdminSection } from "@/app/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminEmojiCatalog } from "@/lib/emojis-server";
import { EmojiCatalogEditor } from "./emoji-catalog-editor";

export default async function AdminEmojisPage() {
  await requireAdmin();
  const catalog = await getAdminEmojiCatalog();
  return (
    <AdminSection title="表情素材" intro="启用的表情可在共创 AI 话题的评论和回复，以及产品详情页的用户评论中选择。只有管理员可以添加素材。">
      <AdminContentShell>
        <EmojiCatalogEditor initialEntries={catalog.entries} initialRevision={catalog.revision} />
      </AdminContentShell>
    </AdminSection>
  );
}
