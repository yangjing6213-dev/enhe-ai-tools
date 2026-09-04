import "../globals.css";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentLocale } from "@/lib/i18n";

export const metadata = sharedRootMetadata;

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCurrentLocale();

  return (
    <RootDocument lang={locale === "en" ? "en-US" : "zh-CN"}>
      <SiteHeader />
      <div className="fade-in">{children}</div>
      <SiteFooter />
    </RootDocument>
  );
}
