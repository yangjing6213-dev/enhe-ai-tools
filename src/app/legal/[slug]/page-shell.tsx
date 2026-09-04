import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/structured-data";
import { Container } from "@/components/ui";
import { legalPages } from "@/lib/legal";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPublicLegalPage } from "@/lib/public-content";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import {
  buildBreadcrumbSchema,
  buildMetadataTitle,
  buildMetaDescription,
  buildPageMetadata,
} from "@/lib/seo";

export const legalPageRevalidate = publicPageCacheSeconds;

export function generateLegalStaticParams() {
  return legalPages.map((page) => ({ slug: page.slug }));
}

export async function generateLegalPageMetadata(
  forceLocale: Locale,
  slug: string,
): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  const page = await getPublicLegalPage(forceLocale, slug);

  if (!page) {
    return buildPageMetadata({
      title: buildMetadataTitle({
        pageTitle: t.footer.helpSupport,
        brand: t.brand,
      }),
      description: t.listing.emptyText,
      path: `/legal/${slug}`,
      locale: forceLocale === "en" ? "en_US" : "zh_CN",
      localeKey: forceLocale,
    });
  }

  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: page.title, brand: t.brand }),
    description: buildLegalMetaDescription(page),
    path: `/legal/${slug}`,
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
}

function buildLegalMetaDescription(
  page: NonNullable<Awaited<ReturnType<typeof getPublicLegalPage>>>,
) {
  const firstParagraph = page.sections[0]?.paragraphs[0] ?? "";
  return buildMetaDescription(
    `${page.summary} ${firstParagraph}`,
    page.summary,
    150,
  );
}

export async function LegalPageShell({
  slug,
  forceLocale,
}: {
  slug: string;
  forceLocale: Locale;
}) {
  const t = getDictionary(forceLocale);
  const page = await getPublicLegalPage(forceLocale, slug);
  if (!page) notFound();
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      {
        name: t.footer.helpSupport,
        path:
          forceLocale === "en"
            ? "/en/legal/user-agreement"
            : "/legal/user-agreement",
      },
      {
        name: page.title,
        path: forceLocale === "en" ? `/en/legal/${slug}` : `/legal/${slug}`,
      },
    ],
  });

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={breadcrumbSchema} />
        <article className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold text-[var(--marketing-accent)]">
            ENHE Compliance
          </p>
          <h1 className="text-4xl font-semibold text-white">{page.title}</h1>
          <p className="mt-5 leading-8 text-[#8B95A7]">{page.summary}</p>
          <div className="mt-10 space-y-8">
            {page.sections.map((section) => (
              <section key={section.title} className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-[#E8EEF8]">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-8 text-[#A7B0C2]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </Container>
    </main>
  );
}
