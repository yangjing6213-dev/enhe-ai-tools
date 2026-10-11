import "../globals.css";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/site-refresh.css";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { getCurrentLocale } from "@/lib/i18n";

export const metadata = sharedRootMetadata;

export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCurrentLocale();

  return (
    <RootDocument lang={locale === "en" ? "en-US" : "zh-CN"} disableLegacyVisualEffects>
      <PublicSiteChrome forceLocale={locale}>{children}</PublicSiteChrome>
    </RootDocument>
  );
}
