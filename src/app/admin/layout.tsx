import "../globals.css";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Container } from "@/components/ui";
import { getAdminDictionary } from "@/lib/admin-i18n";
import { getCurrentLocale } from "@/lib/i18n";

const adminNav = [
  ["dashboard", "/admin"],
  ["seoInsights", "/admin/seo-insights"],
  ["geoMonitoring", "/admin/geo-monitoring"],
  ["manuals", "/admin/manuals"],
  ["messages", "/admin/messages"],
  ["development", "/admin/development"],
  ["releases", "/admin/releases"],
  ["users", "/admin/users"],
  ["orders", "/admin/orders"],
  ["payments", "/admin/payments"],
  ["paymentCodes", "/admin/payment-codes"],
  ["refunds", "/admin/refunds"],
  ["software", "/admin/software"],
  ["onlineTools", "/admin/online-tools"],
  ["skillLearning", "/admin/skill-learning"],
  ["aiNews", "/admin/ai-news"],
  ["aiNewsKeywords", "/admin/ai-news/keywords"],
  ["categories", "/admin/categories"],
  ["tags", "/admin/tags"],
  ["tutorials", "/admin/tutorials"],
  ["faqs", "/admin/faqs"],
  ["changelogs", "/admin/changelogs"],
  ["comments", "/admin/comments"],
  ["files", "/admin/files"],
  ["licenseGenerator", "/admin/license-generator"],
  ["audit", "/admin/audit"],
  ["settings", "/admin/settings"]
] as const;

export const metadata = sharedRootMetadata;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [, locale] = await Promise.all([requireAdmin(), getCurrentLocale()]);
  const t = getAdminDictionary(locale);

  return (
    <RootDocument lang={locale === "en" ? "en-US" : "zh-CN"}>
      <SiteHeader />
      <div className="fade-in">
        <Container className="grid gap-6 py-10 lg:grid-cols-[260px_1fr]">
          <aside className="admin-shell-card h-fit p-4">
            <h1 className="px-3 py-2 text-lg font-black text-[var(--marketing-text)]">{t.layout.title}</h1>
            <nav className="mt-3 grid gap-1">
              {adminNav.map(([key, href]) => (
                <Link key={href} href={href} className="admin-nav-link">
                  {t.nav[key]}
                </Link>
              ))}
            </nav>
          </aside>
          <div>{children}</div>
        </Container>
      </div>
      <SiteFooter />
    </RootDocument>
  );
}
