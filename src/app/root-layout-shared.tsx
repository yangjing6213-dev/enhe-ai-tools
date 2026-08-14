import type { Metadata } from "next";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { BorderGlowController } from "@/components/border-glow-controller";
import { CursorGlow } from "@/components/cursor-glow";
import { InteractiveBackground } from "@/components/interactive-background";
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
      "baidu-site-verification": "codeva-LZTyTXt0Fq",
      "bytedance-verification-code": "YuXYrV9zCcX3P66dp5/H"
    }
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }]
  }
};

export function RootDocument({
  lang,
  children,
  disableLegacyVisualEffects = false
}: Readonly<{
  lang: "zh-CN" | "en-US";
  children: React.ReactNode;
  disableLegacyVisualEffects?: boolean;
}>) {
  return (
    <html lang={lang}>
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="ENHE AI LLM guidance"
        />
        <link
          rel="alternate"
          type="text/markdown"
          href="/okf/index.md"
          title="ENHE AI Open Knowledge Format"
        />
      </head>
      <body>
        {!disableLegacyVisualEffects ? (
          <>
            <InteractiveBackground />
            <CursorGlow />
            <BorderGlowController />
          </>
        ) : null}
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
