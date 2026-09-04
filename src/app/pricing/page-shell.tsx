import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PackageOpen } from "lucide-react";
import { StructuredData } from "@/components/structured-data";
import { Container, SectionTitle } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { buildBreadcrumbSchema, buildListingMetaDescription, buildMetadataTitle, buildPageMetadata } from "@/lib/seo";

export const pricingPageRevalidate = publicPageCacheSeconds;

export async function generatePricingPageMetadata(forceLocale: Locale): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  return buildPageMetadata({
    title: buildMetadataTitle({
      pageTitle: forceLocale === "en" ? "Paid downloads" : "付费下载",
      brand: t.brand
    }),
    description: buildListingMetaDescription("pricing", forceLocale),
    path: "/pricing",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale
  });
}

export async function PricingPageShell({ forceLocale }: { forceLocale: Locale }) {
  const t = getDictionary(forceLocale);
  const copy =
    forceLocale === "en"
      ? {
          title: "AI tool purchase guide",
          intro:
            "Paid downloads are now purchased per tool. Open a software detail page, confirm the price, submit payment proof, and the download link will appear after review approval.",
          cardTitle: "Buy from the software page",
          cardText: "Each paid desktop app has its own price and unlocks only that app's download-link content.",
          cta: "View AI software apps",
          guidanceTitle: "Before you buy",
          purchaseGuidance: "Open the software, course, or service detail page first. The detail page shows the current price, access scope, delivery notes, and related guidance.",
          paymentReview: "After payment, submit the required proof through the page workflow. ENHE AI reviews the order and unlocks the matching download, course, or service access after approval.",
          afterSalesBoundary: "Paid access follows the description on each detail page. Third-party platform services must follow the official rules of that platform, and support is limited to usage guidance and delivery assistance."
        }
      : {
          title: "AI 工具购买说明",
          intro:
            "ENHE AI 现在改为按具体软件付费下载。进入软件详情页确认价格，提交付款凭证，后台审核通过后即可查看该软件的下载链接内容。",
          cardTitle: "前往AI软件应用购买",
          cardText: "每个收费软件都有独立价格，购买后只解锁该软件的下载链接内容。",
          cta: "查看AI软件应用",
          guidanceTitle: "购买前需要确认",
          purchaseGuidance: "请先进入软件、课程或服务详情页，查看当前价格、权益范围、交付方式与相关使用说明。",
          paymentReview: "完成支付后，按页面流程提交相应凭证。ENHE AI 审核通过后，会解锁对应的下载、课程或服务权限。",
          afterSalesBoundary: "付费权益以各详情页说明为准。涉及第三方平台的服务，请以对应平台官方规则为准，支持范围以使用建议与交付协助为主。"
        };
  const breadcrumbSchema = buildBreadcrumbSchema({
    schemaType: "BreadcrumbList",
    items: [
      { name: t.nav.home, path: forceLocale === "en" ? "/en" : "/" },
      { name: copy.title, path: forceLocale === "en" ? "/en/pricing" : "/pricing" }
    ]
  });

  return (
    <main>
      <Container className="py-14">
      <StructuredData data={breadcrumbSchema} />
      <SectionTitle as="h1" title={copy.title} intro={copy.intro} />
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
            className="purchase-guide-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold !text-[#050505] transition"
          >
            {copy.cta}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { title: copy.guidanceTitle, text: copy.purchaseGuidance },
          { title: forceLocale === "en" ? "Payment review" : "支付审核", text: copy.paymentReview },
          { title: forceLocale === "en" ? "Support boundary" : "售后边界", text: copy.afterSalesBoundary }
        ].map((item) => (
          <article key={item.title} className="surface-panel p-5">
            <h2 className="text-lg font-semibold text-[var(--marketing-text)]">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">{item.text}</p>
          </article>
        ))}
      </section>
      </Container>
    </main>
  );
}
