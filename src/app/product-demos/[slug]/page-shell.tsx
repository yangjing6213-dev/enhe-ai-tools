import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { StructuredData } from "@/components/structured-data";
import { ButtonLink, Container, SectionTitle } from "@/components/ui";
import { ToolCard } from "@/components/tool-card";
import type { Locale } from "@/lib/dictionaries";
import {
  buildProductDemoBreadcrumbItems,
  buildProductDemoMetadataTitle,
  buildProductDemoPath,
  buildProductDemoVideoObjectSchema,
  getLocalizedProductDemoDescription,
  getLocalizedProductDemoFaq,
  getLocalizedProductDemoProductType,
  getLocalizedProductDemoTags,
  getLocalizedProductDemoTitle,
  getProductDemoCategoryLabel,
  getProductDemoCoverImage,
  getProductDemoRelatedProductHref,
  getProductDemoVideoUrl,
  getPublicProductDemoBySlug,
} from "@/lib/product-demos";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildLocalePath,
  buildPageMetadata,
  buildProductStructuredData,
  buildToolStructuredData,
} from "@/lib/seo";
import {
  buildLocalizedToolOfferName,
  buildLocalizedToolPreviewText,
  buildLocalizedToolTutorialItems,
  resolveLocalizedToolCategoryName,
  resolveLocalizedToolIdentity,
} from "@/lib/tool-localization";
import { getPrimaryToolPrice } from "@/lib/tool-price-specs";

export const productDemoDetailPageRevalidate = 300;

const detailCopy = {
  zh: {
    listing: "工具功能演示",
    productIntro: "产品简短介绍",
    shows: "这个视频展示了什么？",
    audience: "这个产品适合谁？",
    functions: "核心功能有哪些？",
    preparation: "使用前需要准备什么？",
    relatedProduct: "相关产品",
    relatedTutorials: "相关教程",
    faq: "FAQ",
    transcript: "视频文字稿",
    viewProduct: "购买/查看产品",
    viewDemoListing: "查看更多演示",
    source: "来源或说明",
    noVideo: "当前视频地址尚未配置，请在后台补充视频地址后发布。",
    fallbackVideoText: "您的浏览器不支持内嵌视频播放。",
    sourceText: "本页面用于展示 ENHE AI 产品演示内容，视频、文字稿、FAQ 与关联产品由后台维护。",
  },
  en: {
    listing: "Tool Function Demos",
    productIntro: "Product summary",
    shows: "What does this video show?",
    audience: "Who is this product for?",
    functions: "Core functions",
    preparation: "What to prepare before use",
    relatedProduct: "Related product",
    relatedTutorials: "Related tutorials",
    faq: "FAQ",
    transcript: "Video transcript",
    viewProduct: "Buy / view product",
    viewDemoListing: "More demos",
    source: "Source and notes",
    noVideo: "This demo has no configured video URL. Add the video URL in admin before publishing.",
    fallbackVideoText: "Your browser does not support embedded video playback.",
    sourceText: "This page presents ENHE AI product demo content. Video, transcript, FAQ, and related products are maintained in the admin panel.",
  },
} as const;

type ProductDemoDetailPageShellProps = {
  slug: string;
  forceLocale: Locale;
};

export async function generateProductDemoDetailMetadata(
  forceLocale: Locale,
  slug: string,
): Promise<Metadata> {
  const demo = await getPublicProductDemoBySlug(slug);
  const path = buildProductDemoPath(demo?.slug ?? slug, forceLocale);

  if (!demo) {
    return buildPageMetadata({
      title: forceLocale === "en" ? "Product Demo - ENHE AI" : "产品效果演示 - 恩禾ENHE AI",
      description: forceLocale === "en" ? "ENHE AI product demo page." : "ENHE AI 产品效果演示页面。",
      path,
      locale: forceLocale === "en" ? "en_US" : "zh_CN",
      localeKey: forceLocale,
    });
  }

  return buildPageMetadata({
    title: buildProductDemoMetadataTitle(demo, forceLocale),
    description: getLocalizedProductDemoDescription(demo, forceLocale),
    path,
    image: getProductDemoCoverImage(demo),
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
}

export async function ProductDemoDetailPageShell({ slug, forceLocale }: ProductDemoDetailPageShellProps) {
  const demo = await getPublicProductDemoBySlug(slug);
  if (!demo) notFound();

  const copy = detailCopy[forceLocale];
  const coverImage = getProductDemoCoverImage(demo);
  const videoUrl = getProductDemoVideoUrl(demo);
  const localizedTitle = getLocalizedProductDemoTitle(demo, forceLocale);
  const localizedDescription = getLocalizedProductDemoDescription(demo, forceLocale);
  const localizedProductType = getLocalizedProductDemoProductType(demo, forceLocale);
  const localizedTags = getLocalizedProductDemoTags(demo, forceLocale);
  const faqItems = getLocalizedProductDemoFaq(demo, forceLocale);
  const relatedProductHref = getProductDemoRelatedProductHref(demo, forceLocale);
  const relatedProduct = demo.relatedProduct;
  const localizedRelatedProductName = relatedProduct
    ? resolveLocalizedToolIdentity(relatedProduct, forceLocale).primaryName
    : "";
  const relatedProductLocalizationInput = relatedProduct
    ? {
        slug: relatedProduct.slug,
        name: relatedProduct.name,
        englishName: relatedProduct.englishName,
        shortDescription: relatedProduct.shortDescription,
        content: relatedProduct.content,
        type: relatedProduct.type,
        categoryName: relatedProduct.category?.name,
      }
    : null;
  const localizedRelatedProductDescription = relatedProductLocalizationInput
    ? buildLocalizedToolPreviewText(
        relatedProductLocalizationInput,
        forceLocale,
      )
    : localizedDescription;
  const localizedRelatedProductCategory = relatedProduct
    ? resolveLocalizedToolCategoryName(
        relatedProduct.category?.name,
        relatedProduct.type,
        forceLocale,
      )
    : "";
  const localizedRelatedProductPriceSpecs = relatedProduct
    ? relatedProduct.priceSpecs.map((spec, index) => ({
        name: buildLocalizedToolOfferName(
          spec.name,
          relatedProduct.type,
          forceLocale,
          index,
        ),
        price: Number(spec.price),
      }))
    : [];
  const localizedRelatedTutorials =
    relatedProduct && relatedProductLocalizationInput
      ? buildLocalizedToolTutorialItems(
          relatedProduct.tutorials,
          relatedProductLocalizationInput,
          forceLocale,
        )
      : [];
  const productPrice = relatedProduct
    ? getPrimaryToolPrice(relatedProduct.priceSpecs, relatedProduct.downloadPrice)
    : 0;
  const breadcrumbSchema = buildBreadcrumbSchema({
    items: buildProductDemoBreadcrumbItems(demo, forceLocale),
  });
  const videoObjectSchema = buildProductDemoVideoObjectSchema(demo, forceLocale);
  const faqSchema = faqItems.length ? buildFaqSchema({ items: faqItems }) : null;
  const relatedProductSchema = relatedProduct
    ? relatedProduct.type === "software"
      ? buildProductStructuredData({
          name: localizedRelatedProductName,
          description: localizedRelatedProductDescription,
          url: relatedProductHref,
          image: relatedProduct.coverImage,
          category: localizedRelatedProductCategory,
          price: productPrice > 0 ? productPrice : null,
          priceSpecs: localizedRelatedProductPriceSpecs,
        })
      : buildToolStructuredData({
          schemaType: relatedProduct.type === "online" ? "Service" : "Course",
          name: localizedRelatedProductName,
          description: localizedRelatedProductDescription,
          url: relatedProductHref,
          image: relatedProduct.coverImage,
          category: localizedRelatedProductCategory,
          price: productPrice > 0 ? productPrice : null,
          priceSpecs: localizedRelatedProductPriceSpecs,
        })
    : null;
  const functionItems = [
    localizedProductType,
    ...localizedTags,
    getProductDemoCategoryLabel(demo.category, forceLocale),
  ].filter((item): item is string => Boolean(item));

  return (
    <main>
      <Container className="py-14">
        <StructuredData
          data={[
            breadcrumbSchema,
            videoObjectSchema,
            ...(faqSchema ? [faqSchema] : []),
            ...(relatedProductSchema ? [relatedProductSchema] : []),
          ]}
        />
        <nav className="mb-6 flex flex-wrap gap-3" aria-label={forceLocale === "en" ? "Breadcrumb" : "面包屑导航"}>
            <Link href={buildLocalePath("/product-demos", forceLocale)} className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-[var(--marketing-muted)] transition-[border-color,color] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-text)]">
            {copy.listing}
          </Link>
        </nav>

        <article className="product-demo-detail-hero">
          <SectionTitle
            as="h1"
            title={localizedTitle}
            intro={localizedDescription}
          />
          <div className="product-demo-video-frame">
            {videoUrl ? (
              <video controls preload="metadata" poster={coverImage ?? undefined}>
                <source src={videoUrl} />
                {copy.fallbackVideoText}
              </video>
            ) : (
              <div className="aspect-video p-6 text-sm leading-7 text-[var(--marketing-muted)]">
                {copy.noVideo}
              </div>
            )}
          </div>

          <div className="product-demo-detail-grid">
            <div className="grid gap-4">
              <section className="product-demo-detail-section">
                <h2>{copy.productIntro}</h2>
                <p>{localizedDescription}</p>
              </section>
              <section className="product-demo-detail-section">
                <h2>{copy.shows}</h2>
                <p>{demo.transcript || localizedDescription}</p>
              </section>
              <section className="product-demo-detail-section">
                <h2>{copy.audience}</h2>
                <p>
                  {forceLocale === "en"
                    ? `This demo is for users evaluating ${getProductDemoCategoryLabel(demo.category, forceLocale)} workflows before choosing a product.`
                    : `这条演示适合正在评估${getProductDemoCategoryLabel(demo.category, forceLocale)}工作流、希望先看到真实效果再选择产品的用户。`}
                </p>
              </section>
              <section className="product-demo-detail-section">
                <h2>{copy.functions}</h2>
                {functionItems.length ? (
                  <ul>
                    {functionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{localizedDescription}</p>
                )}
              </section>
              <section className="product-demo-detail-section">
                <h2>{copy.preparation}</h2>
                <p>
                  {forceLocale === "en"
                    ? "Review the product page, pricing or access notes, and any related tutorial before trying the workflow."
                    : "使用前建议先查看关联产品详情、价格或访问说明，并结合相关教程确认操作步骤。"}
                </p>
              </section>
              {faqItems.length ? (
                <section className="product-demo-detail-section">
                  <h2>{copy.faq}</h2>
                  <div className="mt-4 grid gap-3">
                    {faqItems.map((item) => (
                      <details key={item.question} className="content-fold">
                        <summary>
                          <h3 className="text-base font-black text-[var(--marketing-text)]">{item.question}</h3>
                        </summary>
                        <div className="content-fold-body">
                          <p>{item.answer}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}
              {demo.transcript ? (
                <section className="product-demo-detail-section">
                  <h2>{copy.transcript}</h2>
                  <p className="whitespace-pre-line">{demo.transcript}</p>
                </section>
              ) : null}
              <section className="product-demo-detail-section">
                <h2>{copy.source}</h2>
                <p>{copy.sourceText}</p>
              </section>
            </div>

            <aside className="product-demo-sidebar">
              <section className="product-demo-detail-section">
                <h2>{copy.relatedProduct}</h2>
                <p>{localizedRelatedProductDescription}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ButtonLink href={relatedProductHref} className="product-demo-primary-link">
                    {copy.viewProduct}
                  </ButtonLink>
                  <ButtonLink href={buildLocalePath("/product-demos", forceLocale)} variant="ghost" className="product-demo-secondary-link">
                    {copy.viewDemoListing}
                  </ButtonLink>
                </div>
              </section>
              {localizedRelatedTutorials.length ? (
                <section className="product-demo-detail-section">
                  <h2>{copy.relatedTutorials}</h2>
                  <div className="mt-4 grid gap-3">
                    {localizedRelatedTutorials.slice(0, 4).map((tutorial) => (
                      <Link key={tutorial.id} href={`${relatedProductHref}#tool-tutorials`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--marketing-accent)] hover:text-white">
                        {tutorial.title}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
              {relatedProduct ? (
                <ToolCard tool={relatedProduct} locale={forceLocale} />
              ) : null}
            </aside>
          </div>
        </article>
      </Container>
    </main>
  );
}
