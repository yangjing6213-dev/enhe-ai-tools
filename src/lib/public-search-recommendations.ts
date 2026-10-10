import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/dictionaries";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { resolveLocalizedToolCategoryName, resolveLocalizedToolIdentity } from "@/lib/tool-localization";

export type SearchRecommendation = {
  id: string;
  title: string;
  category: string;
  href: string;
  downloadCount: number;
};

const getMostDownloadedProducts = unstable_cache(
  async () => prisma.tool.findMany({
    where: {
      status: "published",
      type: { in: ["software", "ai_skill"] },
      downloadCount: { gt: 0 },
    },
    select: {
      id: true, slug: true, name: true, englishName: true, type: true,
      downloadCount: true, category: { select: { name: true } },
    },
    orderBy: [{ downloadCount: "desc" }, { id: "asc" }],
    take: 5,
  }),
  ["public-search-most-downloaded"],
  { revalidate: 300, tags: ["public-tools"] },
);

export async function getPublicSearchRecommendations(locale: Locale): Promise<SearchRecommendation[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  try {
    const products = await getMostDownloadedProducts();
    return products.map((product) => ({
      id: product.id,
      title: resolveLocalizedToolIdentity(product, locale).primaryName,
      category: resolveLocalizedToolCategoryName(product.category?.name, product.type, locale),
      href: buildCanonicalToolPath(product, locale),
      downloadCount: product.downloadCount,
    }));
  } catch {
    // Recommendations are optional; a failed read must not take down public navigation.
    console.error("[header-search] Download recommendations are temporarily unavailable.");
    return [];
  }
}
