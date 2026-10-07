import Link from "next/link";
import { AdminSection } from "@/app/admin/admin-ui";
import { getCurrentLocale } from "@/lib/i18n";

const copy = {
  zh: {
    title: "套餐功能已停用",
    intro: "当前项目已取消统一套餐功能，后台不再维护套餐。需要收费的软件请在 AI软件应用 或 AI账号服务 管理中设置价格。",
    stateLabel: "功能状态",
    status: "已停用",
    cta: "去管理应用"
  },
  en: {
    title: "Plans are disabled",
    intro: "Membership sales are no longer active. Configure paid software and prices from the tool management pages instead.",
    stateLabel: "Feature status",
    status: "Disabled",
    cta: "Manage tools"
  }
} as const;

export default async function AdminPlansPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <div className="enhe-admin-content-management enhe-admin-plans">
        <section className="enhe-admin-plans-disabled-card" aria-label={t.title}>
          <div className="enhe-admin-plans-status">
            <span>{t.stateLabel}</span>
            <strong>{t.status}</strong>
          </div>
          <Link href="/admin/software" className="enhe-admin-plans-cta">
            {t.cta}
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </AdminSection>
  );
}
