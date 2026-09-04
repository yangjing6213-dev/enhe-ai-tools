import type { Metadata } from "next";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { AiApiPricingPage } from "@/features/enhe-api/components/public-pages";

export const metadata: Metadata = {
  title: "ENHE API 套餐 | ENHE AI",
  description: "查看 ENHE API Gateway 的 mock 套餐、额度、窗口和计费原则。"
};

export default function AiApiPricingRoute() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiApiPricingPage />
    </PublicSiteChrome>
  );
}
