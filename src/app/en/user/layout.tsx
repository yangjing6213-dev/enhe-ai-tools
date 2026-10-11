import type { Metadata } from "next";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import "@/styles/redesign/account.css";

export const metadata: Metadata = {
  title: "ENHE AI user center for orders, downloads, courses, and account settings",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function EnglishUserLayout({ children }: { children: React.ReactNode }) {
  return <PublicSiteChrome forceLocale="en">{children}</PublicSiteChrome>;
}
