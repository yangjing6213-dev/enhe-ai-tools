import "../globals.css";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/account.css";
import "@/styles/redesign/site-refresh.css";
import type { Metadata } from "next";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { getCurrentLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  ...sharedRootMetadata,
  title: "ENHE AI 用户中心：管理订单、下载、课程和账号设置",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCurrentLocale();

  return (
    <RootDocument lang={locale === "en" ? "en-US" : "zh-CN"} disableLegacyVisualEffects>
      <PublicSiteChrome forceLocale={locale} showFooterMascot={false}>{children}</PublicSiteChrome>
    </RootDocument>
  );
}
