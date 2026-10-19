import type { Metadata } from "next";

import { AiWorkflowDirectory } from "@/app/ai-workflows/workflow-directory";
import { Container, SectionTitle } from "@/components/ui";
import type { Locale } from "@/lib/dictionaries";
import { absoluteUrl, buildBreadcrumbSchema, buildLocalePath, buildPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

const pageCopy = {
  zh: {
    title: "AI 工作流",
    intro: "按真实任务发现可复用的 AI 工作流，先看适用场景，再核对运行要求与交付内容。",
    description: "ENHE AI 工作流按应用方向整理，首批项目尚未完成来源、授权、运行条件和交付内容的发布核验。",
  },
  en: {
    title: "AI Workflows",
    intro: "Find reusable AI workflows by real tasks. Start with the use case, then review runtime requirements and deliverables.",
    description: "ENHE AI workflows are organized by application area. The first items are not yet verified for publication.",
  },
} as const;

export function generateAiWorkflowsPageMetadata(locale: Locale): Metadata {
  const copy = pageCopy[locale];
  const path = buildLocalePath("/ai-workflows", locale);
  return buildPageMetadata({
    title: `${copy.title} - ENHE AI`,
    description: copy.description,
    path,
    locale: locale === "en" ? "en_US" : "zh_CN",
    localeKey: locale,
  });
}

export function AiWorkflowsPageShell({ forceLocale }: { forceLocale: Locale }) {
  const copy = pageCopy[forceLocale];
  const path = buildLocalePath("/ai-workflows", forceLocale);
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: forceLocale === "en" ? "Home" : "首页", path: buildLocalePath("/", forceLocale) },
      { name: copy.title, path },
    ],
  });
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.description,
    url: absoluteUrl(path),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
  };

  return (
    <main>
      <Container className="pt-12 pb-56 sm:pt-14 sm:pb-56">
        <StructuredData data={[breadcrumbSchema, collectionSchema]} />
        <SectionTitle as="h1" title={copy.title} titleClassName="redesign-bold-copy" intro={copy.intro} />
        <AiWorkflowDirectory locale={forceLocale} />
      </Container>
    </main>
  );
}
