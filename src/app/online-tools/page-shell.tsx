import type { Metadata } from "next";
import { StructuredData } from "@/components/structured-data";
import { Container, EmptyState, SectionTitle } from "@/components/ui";
import { ToolCard } from "@/components/tool-card";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPublicToolCategories, getPublicToolListing } from "@/lib/public-content";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { resolveLocalizedToolCategoryName } from "@/lib/tool-localization";
import { buildBreadcrumbSchema, buildListingMetaDescription, buildMetadataTitle, buildPageMetadata } from "@/lib/seo";

export const onlineToolsPageRevalidate = publicPageCacheSeconds;
const accountServicesBasePath = "/account-services";

export async function generateOnlineToolsPageMetadata(forceLocale: Locale): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: t.listing.onlineTitle, brand: t.brand }),
    description: buildListingMetaDescription("account-services", forceLocale),
    path: accountServicesBasePath,
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale
  });
}

export async function OnlineToolsPageShell({
  searchParams,
  forceLocale
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  forceLocale: Locale;
}) {
  const params = await searchParams;
  const keyword = params.q;
  const categoryId = params.category;
  const sort = params.sort;
  const t = getDictionary(forceLocale);
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      { name: t.listing.onlineTitle, path: forceLocale === "en" ? `/en${accountServicesBasePath}` : accountServicesBasePath }
    ]
  });
  const [categories, tools] = await Promise.all([
    getPublicToolCategories("online"),
    getPublicToolListing("online", categoryId, keyword, undefined, sort)
  ]);

  return (
    <Container className="py-14">
      <StructuredData data={breadcrumbSchema} />
      <SectionTitle as="h1" title={t.listing.onlineTitle} intro={t.listing.onlineIntro} />
      <FilterBar categories={categories} locale={forceLocale} />
      {tools.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-3">{tools.map((tool) => <ToolCard key={tool.id} tool={tool} locale={forceLocale} />)}</div>
      ) : (
        <EmptyState title={t.listing.emptyTitle} text={t.listing.emptyText} />
      )}
    </Container>
  );
}

function FilterBar({ categories, locale }: { categories: { id: string; name: string }[]; locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <form className="filter-surface grid gap-3 md:grid-cols-[1fr_180px_140px]">
      <input name="q" placeholder={t.listing.searchPlaceholder} className="form-control-dark" />
      <select name="category" className="form-select-dark">
        <option value="">{t.listing.allCategories}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {resolveLocalizedToolCategoryName(category.name, "online", locale)}
          </option>
        ))}
      </select>
      <select name="sort" className="form-select-dark">
        <option value="latest">{t.listing.latest}</option>
        <option value="hot">{t.listing.hot}</option>
      </select>
      <button className="rounded-full bg-[#050505] px-5 py-3 font-bold text-white transition hover:bg-[#161616] md:col-span-3">{t.listing.filter}</button>
    </form>
  );
}
