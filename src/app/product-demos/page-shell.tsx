import type { Metadata } from "next";
import React from "react";
import { StructuredData } from "@/components/structured-data";
import { ProductDemoCard } from "@/components/product-demo-card";
import { ProductDemoFilterGrid } from "@/components/product-demo-filter-grid";
import { ContentlessState } from "@/components/redesign/contentless-state";
import { Container, EmptyState, SectionTitle } from "@/components/ui";
import type { Locale } from "@/lib/dictionaries";
import {
  buildProductDemoListingPath,
  getPublicProductDemos,
  getLocalizedProductDemoTitle,
  getProductDemoCategoryLabel,
  normalizeProductDemoCategory,
  productDemoCategories,
  type ProductDemoFilter,
} from "@/lib/product-demos";
import {
  absoluteUrl,
  applyFilteredListingRobots,
  buildBreadcrumbSchema,
  buildLocalePath,
  buildPageMetadata,
} from "@/lib/seo";

export const productDemoListingPageRevalidate = 300;

const listingCopy = {
  zh: {
    title: "工具功能演示",
    intro: "通过视频了解 ENHE AI 工具、AI智能体、本地部署应用、AI语音、AI视频和AI工作流的真实使用效果。",
    description:
      "通过视频了解 ENHE AI 工具、AI智能体、本地部署应用、AI语音、AI视频和AI工作流的真实使用效果，先看功能边界、适用任务、教程路径和购买前判断依据，再决定是否使用或咨询。",
    all: "全部",
    emptyTitle: "暂无已发布的视频演示",
    emptyText: "后台发布产品演示后，这里会自动展示已上线内容。",
  },
  en: {
    title: "Tool Function Demos",
    intro: "Watch real ENHE AI tool workflows, AI agents, local apps, AI voice, AI video, and practical automation demos.",
    description:
      "Watch ENHE AI demos for agents, local apps, AI voice, AI video, and automation. Review feature boundaries, task fit, tutorials, and purchase signals.",
    all: "All",
    emptyTitle: "No published product demos yet",
    emptyText: "Published product demos from the admin panel will appear here automatically.",
  },
} as const;

export async function generateProductDemoListingMetadata(
  forceLocale: Locale,
  searchParams: Promise<Record<string, string | undefined>> = Promise.resolve({}),
): Promise<Metadata> {
  const copy = listingCopy[forceLocale];
  const isDbFreePreview = !process.env.DATABASE_URL?.trim();
  const metadata = buildPageMetadata({
    title: forceLocale === "en" ? "Tool Function Demos - ENHE AI" : "工具功能演示 - 恩禾ENHE AI",
    description: copy.description,
    path: "/product-demos",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });

  const filteredMetadata = applyFilteredListingRobots(
    metadata,
    await searchParams,
    ["type"],
  );
  return isDbFreePreview
    ? { ...filteredMetadata, robots: { index: false, follow: true } }
    : filteredMetadata;
}

export async function ProductDemoListingPageShell({
  forceLocale,
  searchParams,
}: {
  forceLocale: Locale;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const copy = listingCopy[forceLocale];
  if (!process.env.DATABASE_URL?.trim()) {
    return (
      <ContentlessState
        locale={forceLocale}
        className="product-demo-page"
        eyebrow={copy.title}
        title={copy.title}
        intro={copy.intro}
        statusLabel="UNVERIFIED"
        stateTitle={forceLocale === "en" ? "Demo content is being prepared" : "演示内容准备中"}
        statusText={
          forceLocale === "en"
            ? "Published product demos will appear after their content and media are verified."
            : "产品演示内容和媒体完成核验后，再展示可访问的演示。"
        }
        primaryAction={{
          href: buildLocalePath("/", forceLocale),
          label: forceLocale === "en" ? "Return to ENHE AI home" : "返回 ENHE AI 首页",
        }}
        secondaryActions={[
          {
            href: buildLocalePath("/ai-news", forceLocale),
            label: forceLocale === "en" ? "Read AI News" : "阅读 AI 资讯",
          },
        ]}
      />
    );
  }

  const params = await searchParams;
  const activeCategory = normalizeProductDemoCategory(params.type);
  const demos = await getPublicProductDemos(activeCategory);
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: forceLocale === "en" ? "Home" : "首页", path: buildLocalePath("/", forceLocale) },
      { name: copy.title, path: buildLocalePath("/product-demos", forceLocale) },
    ],
  });
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.description,
    url: absoluteUrl(buildLocalePath("/product-demos", forceLocale)),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: demos.map((demo, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: getLocalizedProductDemoTitle(demo, forceLocale),
        url: absoluteUrl(buildLocalePath(`/product-demos/${demo.slug}`, forceLocale)),
      })),
    },
  };
  const filters = [
    {
      value: "all" as const,
      label: copy.all,
      href: buildProductDemoListingPath(forceLocale),
    },
    ...productDemoCategories.map((category) => ({
      value: category,
      label: getProductDemoCategoryLabel(category, forceLocale),
      href: buildProductDemoListingPath(forceLocale, category),
    })),
  ];

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, collectionSchema]} />
        <div className="product-demo-page-hero">
          <SectionTitle as="h1" title={copy.title} intro={copy.intro} />
        </div>
        <ProductDemoFilterGrid
          activeCategory={activeCategory}
          filters={filters}
          filterAriaLabel={forceLocale === "en" ? "Product demo filters" : "产品演示筛选"}
          items={demos.map((demo) => ({
            id: demo.id,
            content: <ProductDemoCard demo={demo} locale={forceLocale} />,
          }))}
          emptyState={<EmptyState title={copy.emptyTitle} text={copy.emptyText} />}
        />
      </Container>
    </main>
  );
}
