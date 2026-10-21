import type { Metadata } from "next";

import { AiWorkflowDirectory } from "@/app/ai-workflows/workflow-directory";
import { Container, SectionTitle } from "@/components/ui";
import type { Locale } from "@/lib/dictionaries";
import { absoluteUrl, buildBreadcrumbSchema, buildLocalePath, buildPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildAiWorkflowCatalogOrderBy,
  buildAiWorkflowCatalogWhere,
  parseAiWorkflowCatalogFilters,
} from "@/lib/ai-workflows/catalog";
import type { AiWorkflowCatalogCard } from "@/app/ai-workflows/workflow-directory";
import { resolveAiWorkflowDeliveryMode } from "@/lib/ai-workflows/rules";

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

export async function AiWorkflowsPageShell({
  forceLocale,
  searchParams = {},
}: {
  forceLocale: Locale;
  searchParams?: Record<string, string | undefined>;
}) {
  const copy = pageCopy[forceLocale];
  const path = buildLocalePath("/ai-workflows", forceLocale);
  const filters = parseAiWorkflowCatalogFilters(searchParams);
  const viewer = process.env.DATABASE_URL?.trim() ? await getCurrentUser() : null;
  let products: AiWorkflowCatalogCard[] = [];
  let topicOptions: { id: string; name: string; englishName: string | null }[] = [];
  let total = 0;
  let pageCount = 1;

  if (process.env.DATABASE_URL?.trim()) {
    const [rows, topics] = await Promise.all([
      prisma.tool.findMany({
        where: buildAiWorkflowCatalogWhere(filters),
        orderBy: buildAiWorkflowCatalogOrderBy(filters.sort === "rating" || filters.sort === "downloads" ? "recommended" : filters.sort),
        include: {
          tagLinks: { include: { tag: { select: { name: true } } }, orderBy: { tag: { sortOrder: "asc" } } },
          aiWorkflowCandidate: { include: { topic: { select: { name: true, englishName: true } } } },
          _count: { select: { aiWorkflowFavorites: true } },
        },
      }),
      prisma.aiWorkflowTopic.findMany({
        where: { isEnabled: true },
        select: { id: true, name: true, englishName: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);
    topicOptions = topics;
    const ids = rows.map((row) => row.id);
    const [ratings, downloadEvents, favorites] = ids.length ? await Promise.all([
      prisma.aiWorkflowReview.groupBy({ by: ["toolId"], where: { toolId: { in: ids }, status: "approved" }, _avg: { rating: true }, _count: { id: true } }),
      prisma.aiWorkflowDownloadEvent.groupBy({ by: ["toolId"], where: { toolId: { in: ids } }, _count: { id: true } }),
      viewer ? prisma.aiWorkflowFavorite.findMany({ where: { userId: viewer.id, toolId: { in: ids } }, select: { toolId: true } }) : Promise.resolve([]),
    ]) : [[], [], []];
    const ratingByTool = new Map(ratings.map((row) => [row.toolId, { average: row._avg.rating, count: row._count.id }]));
    const downloadsByTool = new Map(downloadEvents.map((row) => [row.toolId, row._count.id]));
    const favoriteIds = new Set(favorites.map((row) => row.toolId));
    const cards = rows.map((row) => {
      const rating = ratingByTool.get(row.id);
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        englishName: row.englishName,
        shortDescription: row.shortDescription,
        coverImage: row.coverImage,
        isDownloadPaid: row.isDownloadPaid && Number(row.downloadPrice) > 0,
        price: Number(row.downloadPrice),
        favoriteCount: row._count.aiWorkflowFavorites,
        isFavorite: favoriteIds.has(row.id),
        downloadCount: downloadsByTool.get(row.id) ?? 0,
        ratingAverage: rating?.average ?? null,
        reviewCount: rating?.count ?? 0,
        projectType: row.aiWorkflowCandidate?.projectType ?? "workflow",
        deliveryMode: row.aiWorkflowCandidate
          ? resolveAiWorkflowDeliveryMode({
              candidateStatus: row.aiWorkflowCandidate.status,
              candidateFileId: row.aiWorkflowCandidate.fileId,
              toolFileId: row.downloadFileId,
            })
          : "package",
        githubStars: row.aiWorkflowCandidate?.githubStars ?? null,
        verifiedEnvironments: row.aiWorkflowCandidate?.verifiedEnvironments ?? [],
        topic: row.aiWorkflowCandidate?.topic ?? null,
        tags: row.tagLinks.map((link) => link.tag.name),
        systemRequirement: row.systemRequirement,
        createdAt: row.createdAt,
      };
    });
    if (filters.sort === "downloads") cards.sort((left, right) => right.downloadCount - left.downloadCount || right.createdAt.getTime() - left.createdAt.getTime());
    if (filters.sort === "rating") cards.sort((left, right) => (right.ratingAverage ?? -1) - (left.ratingAverage ?? -1) || right.reviewCount - left.reviewCount || right.createdAt.getTime() - left.createdAt.getTime());
    if (filters.sort === "price") cards.sort((left, right) => left.price - right.price || right.createdAt.getTime() - left.createdAt.getTime());
    if (filters.sort === "recommended") cards.sort((left, right) => (right.githubStars ?? -1) - (left.githubStars ?? -1) || right.createdAt.getTime() - left.createdAt.getTime());
    total = cards.length;
    pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
    const page = Math.min(filters.page, pageCount);
    products = cards.slice((page - 1) * filters.pageSize, page * filters.pageSize).map(({ createdAt: _createdAt, ...card }) => card);
  }
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
    numberOfItems: total,
  };

  return (
    <main>
      <Container className="pt-12 pb-56 sm:pt-14 sm:pb-56">
        <StructuredData data={[breadcrumbSchema, collectionSchema]} />
        <SectionTitle as="h1" title={copy.title} titleClassName="redesign-bold-copy" intro={copy.intro} />
        <AiWorkflowDirectory locale={forceLocale} filters={filters} items={products} topics={topicOptions} total={total} pageCount={pageCount} />
      </Container>
    </main>
  );
}
