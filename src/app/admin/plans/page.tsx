import Link from "next/link";
import { AdminSection } from "@/app/admin/admin-ui";
import { getCurrentLocale } from "@/lib/i18n";

const copy = {
  zh: {
    title: "套餐功能已停用",
    intro: "当前项目已取消统一套餐功能，后台不再维护套餐。需要收费的软件请在 AI软件应用 或 AI账号服务 管理中设置价格。",
    cta: "去管理应用"
  },
  en: {
    title: "Plans are disabled",
    intro: "Membership sales are no longer active. Configure paid software and prices from the tool management pages instead.",
    cta: "Manage tools"
  }
} as const;

export default async function AdminPlansPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <Link href="/admin/software" className="inline-flex rounded-full bg-[#7AA7FF] px-5 py-3 text-sm font-semibold text-[#07101f]">
        {t.cta}
      </Link>
    </AdminSection>
  );
}
