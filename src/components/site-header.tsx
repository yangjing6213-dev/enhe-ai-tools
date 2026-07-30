import Image from "next/image";
import { Search } from "lucide-react";
import { Suspense } from "react";
import { HeaderAdminNavLink } from "@/components/header-admin-nav-link";
import { HeaderAccountControls } from "@/components/header-account-controls";
import { HeaderSessionGate } from "@/components/header-session-gate";
import { BackNavigationBar } from "@/components/back-navigation-bar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PrefetchLink } from "@/components/prefetch-link";
import { PublicNavDropdown } from "@/components/public-nav-dropdown";
import { PublicNavLink } from "@/components/public-nav-link";
import { Container } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getCurrentLocale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { getEffectiveLocalizedSiteName, getSettingsMap } from "@/lib/settings";
import {
  buildSoftwareCategoryHref,
  softwareNavCategories,
} from "@/lib/software-category-navigation";

export function SiteHeader({ forceLocale }: { forceLocale?: Locale }) {
  return (
    <Suspense fallback={null}>
      <SiteHeaderContent forceLocale={forceLocale} />
    </Suspense>
  );
}

async function SiteHeaderContent({ forceLocale }: { forceLocale?: Locale }) {
  const [locale, settings] = await Promise.all([
    forceLocale ? Promise.resolve(forceLocale) : getCurrentLocale(),
    getSettingsMap(),
  ]);
  const headerUser = null;
  const t = getDictionary(locale);
  const brand = getEffectiveLocalizedSiteName(settings, locale, t.brand);
  const brandWordmark = brand.includes("ENHE") ? "ENHE AI" : brand;
  const homeHref = buildLocalePath("/", locale);
  const navItems = [
    { label: t.nav.home, href: homeHref },
    {
      label: t.nav.software,
      href: buildLocalePath("/software", locale),
      children: softwareNavCategories.map((category) => ({
        label: category.label[locale],
        href: buildSoftwareCategoryHref(category.name, locale),
        description: category.description[locale],
      })),
    },
    {
      label: t.nav.aiSkill,
      href: buildLocalePath("/ai-skills", locale),
    },
    { label: t.nav.aiNews, href: buildLocalePath("/ai-news", locale) },
    { label: t.nav.aiTrends, href: buildLocalePath("/ai-trends", locale) },
    {
      label: t.nav.skillLearning,
      href: buildLocalePath("/skill-learning", locale),
      children: [
        {
          label: t.nav.skillLearning,
          href: buildLocalePath("/skill-learning", locale),
          description:
            locale === "en"
              ? "AI workflows, prompts, and practical courses"
              : "AI 工作流、提示词与实战课程",
        },
        {
          label: t.nav.onlineTools,
          href: buildLocalePath("/account-services", locale),
          description:
            locale === "en"
              ? "Account service guidance and access notes"
              : "AI账号服务咨询与使用说明",
        },
        {
          label:
            locale === "en"
              ? "Build Your Own X Navigator"
              : "Build Your Own X 项目导航器",
          href: buildLocalePath("/build-your-own-x", locale),
          description:
            locale === "en"
              ? "Free project selector for hands-on developers"
              : "免费项目筛选器，适合动手提升工程能力",
        },
        {
          label:
            locale === "en"
              ? "AI Prompt Management System"
              : "AI提示词管理系统",
          href: buildLocalePath(
            "/skill-learning/ai-prompt-management",
            locale,
          ),
          description:
            locale === "en"
              ? "Free searchable bilingual prompt library"
              : "免费可搜索的中英文提示词库",
        },
      ],
    },
    { label: t.nav.about, href: buildLocalePath("/about", locale) },
    {
      label: t.nav.search,
      href: buildLocalePath("/search", locale),
      icon: "search",
    },
  ] as const;

  return (
    <>
      <header className="site-header-transparent sticky top-0 z-50">
        <Container className="site-header-inner flex max-w-none items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <PrefetchLink
            href={buildLocalePath("/", locale)}
            prefetch={false}
            className="site-brand cursor-target group"
            aria-label={brand}
          >
            <span className="site-brand-mark" aria-hidden="true">
              <Image
                src="/images/brand/enhe-icon-gradient-transparent-cropped.png"
                alt={`${brandWordmark} logo`}
                width={92}
                height={60}
                className="site-brand-logo site-brand-logo-dark"
                priority
                unoptimized
              />
            </span>
            <span className="site-brand-wordmark">{brandWordmark}</span>
          </PrefetchLink>

          <nav
            className="site-primary-nav hidden items-center lg:flex"
            aria-label="Primary navigation"
          >
            {navItems.map((item) =>
              "children" in item ? (
                <PublicNavDropdown
                  key={item.href}
                  href={item.href}
                  label={item.label}
                >
                  {item.children.map((child) => (
                    <PublicNavLink
                      key={child.href}
                      href={child.href}
                      exact={child.href === item.href}
                      className="site-nav-dropdown-link cursor-target"
                    >
                      <span>{child.label}</span>
                      <small>{child.description}</small>
                    </PublicNavLink>
                  ))}
                </PublicNavDropdown>
              ) : (
                <PublicNavLink
                  key={item.href}
                  href={item.href}
                  prefetch={item.href === homeHref ? false : undefined}
                  className="site-nav-link cursor-target"
                >
                  {"icon" in item && item.icon === "search" ? (
                    <Search size={15} strokeWidth={1.8} aria-hidden="true" />
                  ) : null}
                  <span>{item.label}</span>
                </PublicNavLink>
              ),
            )}
            <HeaderAdminNavLink
              locale={locale}
              label={t.nav.admin}
              initialUser={headerUser}
            />
          </nav>

          <div className="site-header-actions flex items-center gap-2">
            <HeaderAccountControls
              labels={{ login: t.nav.login, userFallback: t.nav.userFallback }}
              locale={locale}
              initialUser={headerUser}
            />
            <PrefetchLink href={buildLocalePath("/login", locale)} className="sr-only">
              {t.nav.login}
            </PrefetchLink>
            <LanguageSwitcher locale={locale} labels={t.language} />
            <HeaderSessionGate
              locale={locale}
              labels={{
                admin: t.nav.admin,
                login: t.nav.login,
                menu: t.nav.menu,
                user: t.nav.user,
                zh: t.language.zh,
                en: t.language.en,
              }}
              navItems={navItems}
              initialUser={headerUser}
            />
          </div>
        </Container>
      </header>
      <BackNavigationBar locale={locale} />
    </>
  );
}
