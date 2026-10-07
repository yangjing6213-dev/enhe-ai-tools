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
    description: buildLegalMetaDescription(page, forceLocale),
    path: `/legal/${slug}`,
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
}

const legalMetaDescriptionOverrides: Partial<
  Record<string, Partial<Record<Locale, string>>>
> = {
  "user-agreement": {
    zh: "阅读 ENHE AI 用户协议，了解注册、浏览、下载、AI账号服务、评论、会员购买、内容提交、使用责任、禁止行为、售后处理和服务边界，使用前先确认基本规则。",
    en: "Read the ENHE AI User Agreement for rules on registration, browsing, downloads, AI account services, comments, purchases, and usage responsibilities.",
  },
  "privacy-policy": {
    zh: "查看 ENHE AI 隐私政策，了解注册、订单、支付凭证、评论、下载记录、工具使用信息和安全风控数据的收集、使用、保存、共享与保护方式，判断哪些信息会被处理。",
    en: "Review the ENHE AI Privacy Policy for registration, order, payment proof, comment, download, usage, and security data handling.",
  },
  "membership-refund": {
    zh: "了解 ENHE AI 会员服务与退款规则，包括 VIP 权益、软件下载付费、人工审核、付款凭证、退款条件、不可退款情形、售后联系和处理方式，购买前先判断权益和风险。",
    en: "Review ENHE AI membership and refund rules for VIP benefits, paid downloads, payment proof review, refund conditions, and after-sales handling.",
  },
  disclaimer: {
    zh: "阅读 ENHE AI 免责声明，了解网站服务边界、AI工具使用风险、第三方服务、知识产权、会员付费、未成年人保护、用户决策责任和责任限制说明，使用前判断风险。",
    en: "Read the ENHE AI disclaimer for service boundaries, tool risks, third-party services, intellectual property, paid membership, and liability limits.",
  },
  "copyright-complaint": {
    zh: "查看 ENHE AI 版权投诉指引，了解权利人提交侵权投诉所需的权利证明、侵权链接、身份材料、联系渠道、核验流程、补充材料和处理方式，便于快速准备有效材料。",
    en: "See the ENHE AI copyright complaint guide for required materials, contact steps, verification process, and how infringement reports are handled.",
  },
  "minor-protection": {
    zh: "了解 ENHE AI 未成年人保护规则，包括未成年人使用、会员付费、软件下载限制、监护人申诉材料、退款核验、补充证明和平台处理流程，便于监护人提交有效申请。",
    en: "Rules for minors' use, payments, downloads, and guardian complaint handling. Review consent, payment limits, and complaint steps before paid use.",
  },
};

function buildLegalMetaDescription(
  page: NonNullable<Awaited<ReturnType<typeof getPublicLegalPage>>>,
  locale: Locale,
) {
  const override = legalMetaDescriptionOverrides[page.slug]?.[locale];
  if (override) return override;

  const supportingText = page.sections
    .flatMap((section) => section.paragraphs)
    .slice(0, 2)
    .join(" ");
  return buildMetaDescription(
    `${page.summary} ${supportingText}`,
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
    <main className="enhe-editorial-page">
      <Container className="py-14">
        <StructuredData data={breadcrumbSchema} />
        <article className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold text-[var(--marketing-accent)]">
            ENHE Compliance
          </p>
          <h1 className="text-4xl font-semibold text-[var(--marketing-text)]">{page.title}</h1>
          <p className="mt-5 leading-8 text-[var(--marketing-muted)]">{page.summary}</p>
          <div className="mt-10 space-y-8">
            {page.sections.map((section) => (
              <section key={section.title} className="surface-panel rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-[var(--marketing-text)]">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-8 text-[var(--marketing-muted)]">
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
