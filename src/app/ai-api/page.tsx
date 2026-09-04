import type { Metadata } from "next";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { AiApiLandingPage } from "@/features/enhe-api/components/public-pages";

export const metadata: Metadata = {
  title: "ENHE API Gateway | ENHE AI",
  description: "ENHE API 是面向中文开发者和 AI 编程工具用户的统一 AI 模型 API 服务。"
};

export default function AiApiPage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiApiLandingPage />
    </PublicSiteChrome>
  );
}
