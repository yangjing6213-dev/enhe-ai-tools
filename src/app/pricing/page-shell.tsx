import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, PackageOpen } from "lucide-react";
import { StructuredData } from "@/components/structured-data";
import { Container, SectionTitle } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import {
  getPricingOfferItems,
  type PricingOfferItem,
} from "@/lib/pricing-offers";
import { enheOrganizationReference } from "@/lib/brand-entity";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildListingMetadataTitle,
  buildListingMetaDescription,
  buildPageMetadata,
} from "@/lib/seo";

export const pricingPageRevalidate = publicPageCacheSeconds;

export async function generatePricingPageMetadata(forceLocale: Locale): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  return buildPageMetadata({
    title: buildListingMetadataTitle("pricing", forceLocale, t.brand),
    description: buildListingMetaDescription("pricing", forceLocale),
    path: "/pricing",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale
  });
}

function getSchemaItemType(type: "software" | "ai_skill" | "account_service" | "course") {
  if (type === "software" || type === "ai_skill") return "SoftwareApplication";
  if (type === "course") return "Course";
  return "Service";
}

function formatPrice(price: number) {
  return price.toFixed(2);
}

export function buildPricingOfferCatalogSchema(
  forceLocale: Locale,
  pricingOfferItemsForLocale: PricingOfferItem[],
) {
  const isEnglish = forceLocale === "en";
  const pricingUrl = absoluteUrl(forceLocale === "en" ? "/en/pricing" : "/pricing");
  let position = 0;

  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: isEnglish ? "ENHE AI pricing and service offers" : "ENHE AI报价与服务目录",
    description: buildListingMetaDescription("pricing", forceLocale),
    url: pricingUrl,
    inLanguage: isEnglish ? "en-US" : "zh-CN",
    provider: enheOrganizationReference,
    itemListElement: pricingOfferItemsForLocale.flatMap((item) =>
      item.offers.map((offer) => ({
        "@type": "Offer",
        position: (position += 1),
        name:
          item.offers.length > 1
            ? `${item.localized.name} - ${offer.name}`
            : item.localized.name,
        description: item.localized.description,
        price: formatPrice(offer.price),
        priceCurrency: "CNY",
        url: absoluteUrl(item.path),
        itemOffered: {
          "@type": getSchemaItemType(item.type),
          name: item.localized.name,
          description: item.localized.description,
          url: absoluteUrl(item.path),
        },
      })),
    ),
  };
}

export async function PricingPageShell({ forceLocale }: { forceLocale: Locale }) {
  await connection();
  const t = getDictionary(forceLocale);
  const pricingOfferItemsForLocale = await getPricingOfferItems(forceLocale);
  const copy =
    forceLocale === "en"
      ? {
          title: "AI pricing and purchase entry",
          intro:
            "Review current prices, delivery notes, and support boundaries before opening the matching product, course, or service page.",
          cardTitle: "Buy from the detail page",
          cardText:
            "Each paid item has its own price, access scope, and review workflow. The detail page is the final source before purchase.",
          cta: "Browse all products",
          currentPrice: "Current price",
          viewOffer: "View details",
          guidanceTitle: "Before you buy",
          purchaseGuidance:
            "Open the matching detail page first. Confirm the price, access scope, system or platform requirements, and delivery notes.",
          paymentReview:
            "After payment, submit the required proof through the page workflow. ENHE AI reviews the order and unlocks the matching access after approval.",
          afterSalesBoundary:
            "Paid access follows the description on each detail page. Third-party platform services must follow the official rules of that platform.",
        }
      : {
          title: "AI报价与购买入口",
          intro:
            "购买前先看清当前价格、交付方式和服务边界，再进入对应的软件、课程或服务详情页操作。",
          cardTitle: "从详情页确认后购买",
          cardText:
            "每个付费项目都有独立价格、权益范围和审核流程。下单前以对应详情页说明为准。",
          cta: "浏览全部产品",
          currentPrice: "当前价格",
          viewOffer: "查看详情",
          guidanceTitle: "购买前需要确认",
          purchaseGuidance:
            "请先进入对应详情页，确认价格、权益范围、设备或平台要求、交付方式与相关使用说明。",
          paymentReview:
            "完成支付后，按页面流程提交相应凭证。ENHE AI 审核通过后，会解锁对应的下载、课程或服务权限。",
          afterSalesBoundary:
            "付费权益以各详情页说明为准。涉及第三方平台的服务，请以对应平台官方规则为准。",
        };
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      { name: copy.title, path: forceLocale === "en" ? "/en/pricing" : "/pricing" }
    ]
  });
  const pricingOfferCatalogSchema = buildPricingOfferCatalogSchema(
    forceLocale,
    pricingOfferItemsForLocale,
  );

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={[breadcrumbSchema, pricingOfferCatalogSchema]} />
        <SectionTitle as="h1" title={copy.title} intro={copy.intro} />
        <PricingBuyerAnswerCard copy={copy} />

        <section className="surface-panel mt-8 p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <PackageOpen className="mt-1 text-[var(--marketing-accent)]" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-[var(--marketing-text)]">{copy.cardTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--marketing-muted)]">{copy.cardText}</p>
              </div>
            </div>
            <Link
              href={forceLocale === "en" ? "/en/software" : "/software"}
                  className="purchase-guide-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold !text-[#050505] transition-colors"
            >
              {copy.cta}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {pricingOfferItemsForLocale.map((item) => (
            <article key={item.slug} className="surface-panel p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--marketing-accent)]">
                    {item.localized.category}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--marketing-text)]">
                    {item.localized.name}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
                    {item.localized.description}
                  </p>
                  <p className="mt-3 text-xs leading-6 text-[var(--marketing-soft-text)]">
                    {item.localized.delivery}
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                  <span className="block text-xs font-semibold text-[var(--marketing-muted)]">
                    {copy.currentPrice}
                  </span>
                  {item.offers.map((offer) => (
                    <div key={offer.id} className="mt-1">
                      {item.offers.length > 1 ? (
                        <span className="block text-xs text-[var(--marketing-muted)]">
                          {offer.name}
                        </span>
                      ) : null}
                      <strong className="block text-lg text-[var(--marketing-text)]">
                        ¥{formatPrice(offer.price)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href={item.path}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--marketing-accent)]"
              >
                {copy.viewOffer}
                <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </section>

        <details className="content-fold pricing-guidance-fold">
          <summary>
            <div className="content-fold-summary-copy">
              <strong className="text-lg font-semibold text-[var(--marketing-text)]">
                {copy.guidanceTitle}
              </strong>
            </div>
          </summary>
          <div className="content-fold-body pricing-guidance-grid">
          {[
            { title: copy.guidanceTitle, text: copy.purchaseGuidance },
            { title: forceLocale === "en" ? "Payment review" : "支付审核", text: copy.paymentReview },
            { title: forceLocale === "en" ? "Support boundary" : "售后边界", text: copy.afterSalesBoundary }
          ].map((item) => (
            <article key={item.title} className="surface-panel p-5">
              <strong className="text-lg font-semibold text-[var(--marketing-text)]">{item.title}</strong>
              <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{item.text}</p>
            </article>
          ))}
          </div>
        </details>
      </Container>
    </main>
  );
}

function PricingBuyerAnswerCard({
  copy,
}: {
  copy: {
    guidanceTitle: string;
    purchaseGuidance: string;
  };
}) {
  return (
    <section className="surface-panel-soft mt-6 p-5" aria-label={copy.guidanceTitle}>
      <strong className="text-sm font-black text-[var(--marketing-text)]">
        {copy.guidanceTitle}
      </strong>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--marketing-muted)]">
        {copy.purchaseGuidance}
      </p>
    </section>
  );
}
