import "../globals.css";
import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/site-refresh.css";
import type { Metadata } from "next";
import { RootDocument, sharedRootMetadata } from "@/app/root-layout-shared";
import {
  EnheRedesignPublicFooter,
  EnheRedesignPublicHeader,
} from "@/components/redesign/enhe-production-public-shell";
import { getCurrentLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  ...sharedRootMetadata,
  title: "登录或注册 ENHE AI 账号，管理购买、下载和学习进度",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCurrentLocale();

  return (
    <RootDocument lang={locale === "en" ? "en-US" : "zh-CN"}>
      <div className="enhe-redesign-production" lang={locale}>
        <a className="redesign-skip-link" href="#main-content">
          {locale === "en" ? "Skip to main content" : "跳到主要内容"}
        </a>
        <EnheRedesignPublicHeader locale={locale} />
        <div id="main-content" tabIndex={-1}>
          <div className="fade-in">{children}</div>
        </div>
        <EnheRedesignPublicFooter locale={locale} />
      </div>
    </RootDocument>
  );
}
