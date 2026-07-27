import type { Metadata } from "next";
import Script from "next/script";
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
  children
}: Readonly<{ lang: "zh-CN" | "en-US"; children: React.ReactNode }>) {
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
        <Script id="ttzz-push-loader" strategy="beforeInteractive">
          {`(function(){
var el = document.createElement("script");
el.src = "https://lf1-cdn-tos.bytegoofy.com/goofy/ttzz/push.js?652842526127c7f5c8a21cd07be103ebd207b2db5502593c3b7f249e75721c9545f9b46c8c41e6235de98982cdddb9785e566c8c06b0b36aec55fccc04fff972a6c09517809143b97aad1198018b8352";
el.id = "ttzz";
var s = document.getElementsByTagName("script")[0];
s.parentNode.insertBefore(el, s);
})(window);`}
        </Script>
      </head>
      <body>
        <InteractiveBackground />
        <CursorGlow />
        <BorderGlowController />
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
