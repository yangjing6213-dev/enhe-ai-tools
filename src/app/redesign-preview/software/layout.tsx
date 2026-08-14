import type { Metadata } from "next";
import { headers } from "next/headers";

import "@/styles/redesign/tokens.css";
import "@/styles/redesign/shell.css";
import "@/styles/redesign/software.css";

export const metadata: Metadata = {
  title: "ENHE Software Preview",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
  },
};

export default async function RedesignSoftwarePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const htmlLocale = requestHeaders.get("x-enhe-html-locale");
  const locale =
    htmlLocale === "en" || htmlLocale === "zh"
      ? htmlLocale
      : requestHeaders.get("x-enhe-locale") === "en"
        ? "en"
        : "zh";

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
