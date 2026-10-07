import "../globals.css";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/account.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EnheAccountShell } from "@/components/redesign/enhe-account-shell";
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
  const [locale, requestHeaders] = await Promise.all([getCurrentLocale(), headers()]);
  const pathname = (requestHeaders.get("x-enhe-pathname") ?? "/user").replace(/\/+$/, "");
  const isAccountHome = pathname === "/user";

  return (
    <RootDocument
      lang={locale === "en" ? "en-US" : "zh-CN"}
      disableLegacyVisualEffects={isAccountHome}
    >
      {isAccountHome ? (
        <EnheAccountShell locale={locale}>{children}</EnheAccountShell>
      ) : (
        <>
          <SiteHeader />
          <div className="fade-in">{children}</div>
          <SiteFooter />
        </>
      )}
    </RootDocument>
  );
}
