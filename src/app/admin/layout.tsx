import "../globals.css";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/forum.css";
import "@/styles/redesign/chat.css";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";
import { requireAdmin } from "@/lib/auth";
import { Container } from "@/components/ui";
import { HeaderAccountControls } from "@/components/header-account-controls";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getAdminDictionary } from "@/lib/admin-i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getCurrentLocale } from "@/lib/i18n";
import { AdminNav } from "@/app/admin/admin-nav";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";

export const dynamic = "force-dynamic";

const adminNav = [
  {
    label: { zh: "工作台", en: "Workspace" },
    items: [
      ["dashboard", "/admin"],
      ["messages", "/admin/messages"],
      ["manuals", "/admin/manuals"]
    ]
  },
  {
    label: { zh: "产品与交付", en: "Products and delivery" },
    items: [
      ["software", "/admin/software"],
      ["aiSkills", "/admin/ai-skills"],
      ["aiWorkflows", "/admin/ai-workflows"],
      ["onlineTools", "/admin/online-tools"],
      ["skillLearning", "/admin/skill-learning"],
      ["productDemos", "/admin/product-demos"],
      ["categories", "/admin/categories"],
      ["tags", "/admin/tags"],
      ["tutorials", "/admin/tutorials"],
      ["faqs", "/admin/faqs"],
      ["changelogs", "/admin/changelogs"],
      ["files", "/admin/files"],
      ["licenseGenerator", "/admin/license-generator"]
    ]
  },
  {
    label: { zh: "内容与社区", en: "Editorial and community" },
    items: [
      ["aiNews", "/admin/ai-news"],
      ["aiNewsTopics", "/admin/ai-news/topics"],
      ["aiNewsKeywords", "/admin/ai-news/keywords"],
      ["forum", "/admin/forum"],
      ["chatGroups", "/admin/chat-groups"],
      ["comments", "/admin/comments"],
      ["emojis", "/admin/emojis"]
    ]
  },
  {
    label: { zh: "交易与用户", en: "Transactions and users" },
    items: [
      ["orders", "/admin/orders"],
      ["payments", "/admin/payments"],
      ["refunds", "/admin/refunds"],
      ["paymentCodes", "/admin/payment-codes"],
      ["users", "/admin/users"]
    ]
  },
  {
    label: { zh: "搜索与曝光", en: "Search visibility" },
    items: [
      ["seoAudit", "/admin/seo-audit"],
      ["seoInsights", "/admin/seo-insights"],
      ["geoMonitoring", "/admin/geo-monitoring"]
    ]
  },
  {
    label: { zh: "站点维护", en: "Site maintenance" },
    items: [
      ["settings", "/admin/settings"],
      ["development", "/admin/development"],
      ["releases", "/admin/releases"],
      ["audit", "/admin/audit"]
    ]
  }
] as const;

export const metadata = sharedRootMetadata;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminUser = await requireAdmin();
  const locale = await getCurrentLocale();
  const t = getAdminDictionary(locale);
  const publicLabels = getDictionary(locale);

  return (
    <RootDocument lang={locale === "en" ? "en-US" : "zh-CN"}>
      <div className="enhe-redesign-production enhe-admin-shell enhe-reference-app-shell" lang={locale}>
        <a className="redesign-skip-link" href="#main-content">
          {locale === "en" ? "Skip to main content" : "跳到主要内容"}
        </a>
        <header className="admin-topbar">
          <div className="admin-topbar-inner">
            <a className="admin-topbar-brand" href={locale === "en" ? "/en" : "/"}>
              <span>ENHE AI</span>
              <small>{t.layout.title}</small>
            </a>
            <div className="admin-topbar-actions">
              <HeaderAccountControls
                labels={{ login: publicLabels.nav.login, userFallback: publicLabels.nav.userFallback }}
                locale={locale}
                initialUser={{
                  email: adminUser.email,
                  nickname: adminUser.nickname,
                  role: adminUser.role,
                }}
              />
              <LanguageSwitcher locale={locale} labels={publicLabels.language} />
              <a className="admin-topbar-home" href={locale === "en" ? "/en" : "/"}>
                {locale === "en" ? "View site" : "查看网站"}
              </a>
            </div>
          </div>
        </header>
        <SiteBreadcrumbs locale={locale === "en" ? "en" : "zh"} />
        <div className="fade-in">
          <Container className="enhe-admin-container grid gap-6 py-10">
            <aside className="admin-shell-card admin-sidebar h-fit p-4">
              <h2 className="admin-sidebar-title px-3 py-2 text-lg font-black">{t.layout.title}</h2>
              <AdminNav
                groups={adminNav.map(({ label, items }) => ({ label: label[locale], items }))}
                labels={t.nav}
                ariaLabel={locale === "en" ? "Admin navigation" : "后台导航"}
              />
            </aside>
            <main id="main-content" className="admin-main" tabIndex={-1}>
              {children}
            </main>
          </Container>
        </div>
      </div>
    </RootDocument>
  );
}
