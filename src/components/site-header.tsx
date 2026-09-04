import Image from "next/image";
import { HeaderAdminNavLink } from "@/components/header-admin-nav-link";
import { HeaderAccountControls } from "@/components/header-account-controls";
import { HeaderSessionGate } from "@/components/header-session-gate";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PrefetchLink } from "@/components/prefetch-link";
import { Container } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getCurrentLocale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { getEffectiveLocalizedSiteName, getSettingsMap } from "@/lib/settings";

type SiteNavItem = {
  label: string;
  href: string;
  children?: ReadonlyArray<{ label: string; href: string }>;
};

export async function SiteHeader({ forceLocale }: { forceLocale?: Locale }) {
  const [locale, settings] = await Promise.all([
    forceLocale ? Promise.resolve(forceLocale) : getCurrentLocale(),
    getSettingsMap(),
  ]);
  const headerUser = null;
  const t = getDictionary(locale);
  const brand = getEffectiveLocalizedSiteName(settings, locale, t.brand);
  const brandWordmark = brand.includes("ENHE") ? "ENHE AI" : brand;
  const skillLearningChildren = [
    { label: t.nav.skillLearning, href: buildLocalePath("/skill-learning", locale) },
    { label: t.nav.onlineTools, href: buildLocalePath("/account-services", locale) },
    {
      label: locale === "en" ? "Build Your Own X Navigator" : "Build Your Own X 项目导航器",
      href: buildLocalePath("/skill-learning/build-your-own-x", locale)
    },
    {
      label: locale === "en" ? "AI Prompt Management System" : "AI提示词管理系统",
      href: buildLocalePath("/skill-learning/ai-prompt-management", locale)
    }
  ] as const;
  const navItems: SiteNavItem[] = [
    { label: t.nav.home, href: buildLocalePath("/", locale) },
    { label: t.nav.aiNews, href: buildLocalePath("/ai-news", locale) },
    { label: t.nav.aiTrends, href: buildLocalePath("/ai-trends", locale) },
    { label: t.nav.software, href: buildLocalePath("/software", locale) },
    { label: t.nav.skillLearning, href: buildLocalePath("/skill-learning", locale), children: skillLearningChildren },
    { label: locale === "en" ? "Search" : "搜索", href: buildLocalePath("/search", locale) }
  ];

  return (
    <header className="site-header-transparent sticky top-0 z-50">
      <Container className="site-header-inner flex max-w-none items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <PrefetchLink href={buildLocalePath("/", locale)} className="site-brand cursor-target group" aria-label={brand}>
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

        <nav className="site-primary-nav hidden items-center lg:flex" aria-label="Primary navigation">
          {navItems.map(({ label, href, children }) =>
            children?.length ? (
              <div key={href} className="site-nav-dropdown group relative">
                <PrefetchLink href={href} className="site-nav-link cursor-target" aria-haspopup="true">
                  {label}
                </PrefetchLink>
                <div className="pointer-events-none absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-3 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                  <div className="site-nav-dropdown-panel">
                    {children.map((item) => (
                      <PrefetchLink key={item.href} href={item.href} className="site-nav-dropdown-link cursor-target">
                        {item.label}
                      </PrefetchLink>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <PrefetchLink key={href} href={href} className="site-nav-link cursor-target">
                {label}
              </PrefetchLink>
            )
          )}
          <HeaderAdminNavLink locale={locale} label={t.nav.admin} initialUser={headerUser} />
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
          <PrefetchLink href={buildLocalePath("/user", locale)} className="site-user-center-cta cursor-target hidden sm:inline-flex">
            {t.nav.user}
          </PrefetchLink>
          <LanguageSwitcher locale={locale} labels={t.language} />
          <HeaderSessionGate
            locale={locale}
            labels={{ admin: t.nav.admin, login: t.nav.login, menu: t.nav.menu, user: t.nav.user, zh: t.language.zh, en: t.language.en }}
            navItems={navItems}
            initialUser={headerUser}
          />
        </div>
      </Container>
    </header>
  );
}
