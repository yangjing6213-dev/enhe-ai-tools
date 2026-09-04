import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { Container, EmptyState, SectionTitle } from "@/components/ui";
import { ToolCard } from "@/components/tool-card";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import {
  getPublicToolCategories,
  getPublicToolListing,
} from "@/lib/public-content";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { resolveLocalizedToolCategoryName } from "@/lib/tool-localization";
import {
  buildBreadcrumbSchema,
  buildListingMetaDescription,
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";

export const accountServicesPageRevalidate = publicPageCacheSeconds;

const accountServicesGeoSections = {
  zh: [
    {
      title: "AI账号服务如何合规使用",
      body: "AI账号服务应围绕订阅咨询、账号使用支持、访问说明和平台规则提醒展开。使用第三方平台前，请以对应平台官方政策为准，避免把账号服务理解为绕过规则或替代官方授权。",
    },
    {
      title: "适合哪些用户咨询",
      body: "适合需要了解AI工具订阅、访问方式、使用边界、交付说明和售后范围的用户。对于企业、团队或长期使用者，建议先确认工具是否适合自己的工作流，再决定是否需要账号使用支持。",
    },
    {
      title: "如何与工具和课程配合",
      body: "账号服务不是孤立入口。更稳妥的路径是先选择AI软件应用，学习对应AI技能课程，再根据实际访问和订阅需求咨询账号服务，让工具、方法和合规使用形成闭环。",
    },
  ],
  en: [
    {
      title: "How to use AI account services compliantly",
      body: "AI account services should focus on subscription guidance, account usage support, access notes, and platform policy reminders. For third-party platforms, users should follow the official platform rules.",
    },
    {
      title: "Who should request guidance",
      body: "This section is for users who need clarity on AI tool subscriptions, access methods, delivery notes, after-sales boundaries, and usage constraints before adopting a tool.",
    },
    {
      title: "How services connect to tools and courses",
      body: "Account guidance works best after users choose the right AI software app and learn the workflow. The goal is to connect tools, skills, access support, and compliant usage.",
    },
  ],
} as const;

export async function generateAccountServicesPageMetadata(
  forceLocale: Locale,
): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  return buildPageMetadata({
    title: buildMetadataTitle({
      pageTitle: t.listing.onlineTitle,
      brand: t.brand,
    }),
    description: buildListingMetaDescription("account-services", forceLocale),
    path: "/account-services",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });
}

export async function AccountServicesPageShell({
  searchParams,
  forceLocale,
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
      {
        name: t.listing.onlineTitle,
        path:
          forceLocale === "en" ? "/en/account-services" : "/account-services",
      },
    ],
  });
  const [categories, tools] = await Promise.all([
    getPublicToolCategories("online"),
    getPublicToolListing("online", categoryId, keyword, undefined, sort),
  ]);

  return (
    <main>
      <Container className="py-14">
        <StructuredData data={breadcrumbSchema} />
        <SectionTitle
          as="h1"
          title={t.listing.onlineTitle}
          intro={t.listing.onlineIntro}
        />
        <AccountServicesGeoBlock forceLocale={forceLocale} />
        <FilterBar categories={categories} locale={forceLocale} />
        {tools.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} locale={forceLocale} />
            ))}
          </div>
        ) : (
          <EmptyState title={t.listing.emptyTitle} text={t.listing.emptyText} />
        )}
      </Container>
    </main>
  );
}

function AccountServicesGeoBlock({ forceLocale }: { forceLocale: Locale }) {
  const sections = accountServicesGeoSections[forceLocale];
  const links = [
    {
      label: { zh: "选择 AI 软件应用", en: "Choose AI software apps" },
      href: buildLocalePath("/software", forceLocale),
    },
    {
      label: { zh: "学习 AI 技能课程", en: "Learn AI skill courses" },
      href: buildLocalePath("/skill-learning", forceLocale),
    },
    {
      label: { zh: "阅读 AI 前沿资讯", en: "Read AI news" },
      href: buildLocalePath("/ai-news", forceLocale),
    },
  ];

  return (
    <section className="glass mt-8 rounded-2xl p-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-white/10 bg-white/8 p-5"
          >
            <h2 className="text-lg font-black leading-snug text-[var(--marketing-text)]">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--marketing-muted)]">
              {section.body}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-sm font-bold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]"
          >
            {item.label[forceLocale]}
          </Link>
        ))}
      </div>
    </section>
  );
}

function FilterBar({
  categories,
  locale,
}: {
  categories: { id: string; name: string }[];
  locale: Locale;
}) {
  const t = getDictionary(locale);

  return (
    <form className="filter-surface grid gap-3 md:grid-cols-[1fr_180px_140px]">
      <input
        name="q"
        placeholder={t.listing.searchPlaceholder}
        className="form-control-dark"
      />
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
      <button className="rounded-full bg-[#050505] px-5 py-3 font-bold text-white transition hover:bg-[#161616] md:col-span-3">
        {t.listing.filter}
      </button>
    </form>
  );
}
