import { AdminContentShell, AdminSection } from "@/app/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminEmojiCatalog } from "@/lib/emojis-server";
import { EmojiCatalogEditor } from "./emoji-catalog-editor";

export default async function AdminEmojisPage() {
  await requireAdmin();
  const catalog = await getAdminEmojiCatalog();
  return (
    <AdminSection title="表情素材" intro="站内用户可以选择这里启用的表情，用于正文、留言和用户名。只有管理员可以添加素材。">
      <AdminContentShell>
        <EmojiCatalogEditor initialEntries={catalog.entries} initialRevision={catalog.revision} />
      </AdminContentShell>
    </AdminSection>
  );
}
