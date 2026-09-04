import type { Metadata } from "next";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { BorderGlowController } from "@/components/border-glow-controller";
import { CursorGlow } from "@/components/cursor-glow";
import { InteractiveBackground } from "@/components/interactive-background";
import { TargetCursor } from "@/components/target-cursor";
import {
  defaultSiteDescription,
  getSiteBaseUrl,
  siteName
} from "@/lib/seo";

export const sharedRootMetadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  applicationName: siteName,
  title: siteName,
  description: defaultSiteDescription,
  robots: {
    index: true,
    follow: true
  },
  verification: {
    other: {
      "baidu-site-verification": "codeva-LZTyTXt0Fq"
    }
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/images/brand/enhe-icon-gradient-white-bg-cropped.png", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }]
  }
};

export function RootDocument({
  lang,
  children
}: Readonly<{ lang: "zh-CN" | "en-US"; children: React.ReactNode }>) {
  return (
    <html lang={lang}>
      <body>
        <InteractiveBackground />
        <CursorGlow />
        <BorderGlowController />
        <TargetCursor cursorColorOnTarget="var(--marketing-accent)" />
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
