import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EnheAccountShell } from "@/components/redesign/enhe-account-shell";
import "@/styles/redesign/account.css";

export const metadata: Metadata = {
  title: "ENHE AI user center for orders, downloads, courses, and account settings",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function EnglishUserLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const pathname = (requestHeaders.get("x-enhe-pathname") ?? "/en/user").replace(/\/+$/, "");

  if (pathname === "/en/user") {
    return <EnheAccountShell locale="en">{children}</EnheAccountShell>;
  }

  return (
    <>
      <SiteHeader forceLocale="en" />
      <div className="fade-in">{children}</div>
      <SiteFooter forceLocale="en" />
    </>
  );
}
