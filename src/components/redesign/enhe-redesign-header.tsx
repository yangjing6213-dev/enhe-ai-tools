import { EnheBrandLockup } from "./enhe-brand-lockup";
import { EnheHeaderSearch } from "./enhe-header-search";
import type { SearchRecommendation } from "@/lib/public-search-recommendations";
import { EnheRedesignLanguageSwitch } from "./enhe-redesign-language-switch";
import { EnheRedesignMobileMenu } from "./enhe-redesign-mobile-menu";
import { PrefetchLink } from "@/components/prefetch-link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { isExactCurrentPage } from "./navigation";
import type { RedesignAccount, RedesignLanguageHrefs, RedesignLocale, RedesignNavItem } from "./types";

export function EnheRedesignHeader({
  locale,
  homeHref,
  searchRecommendations,
  navItems,
  currentPathname,
  languageHrefs,
  languageAriaLabel = "中文 / EN",
  account,
  userMenuLabel,
  sticky = false,
  menuId,
  menuTriggerLabel,
  menuCloseLabel,
}: {
  locale: RedesignLocale;
  homeHref: string;
  searchRecommendations?: readonly SearchRecommendation[];
  navItems: ReadonlyArray<RedesignNavItem>;
  currentPathname?: string;
  languageHrefs: RedesignLanguageHrefs;
  languageAriaLabel?: string;
  account: RedesignAccount;
  userMenuLabel: string;
  sticky?: boolean;
  menuId: string;
  menuTriggerLabel: string;
  menuCloseLabel: string;
}) {
  const isCurrentPath = (href: string) => {
    return isExactCurrentPage(currentPathname, href);
  };

  return (
    <header
      className="redesign-header"
      id="top"
      data-sticky={sticky}
      data-locale={locale}
      data-home={isExactCurrentPage(currentPathname, homeHref)}
    >
      <div className="redesign-header-inner">
        <div className="redesign-brand-region">
          <EnheBrandLockup
            href={homeHref}
            label={locale === "en" ? "ENHE AI home" : "ENHE AI 首页"}
          />
        </div>
        <EnheHeaderSearch locale={locale} recommendations={searchRecommendations} />
        <NavigationMenu
          className="redesign-desktop-nav"
          aria-label={locale === "en" ? "Primary navigation" : "主导航"}
          viewport={false}
        >
          <NavigationMenuList className="redesign-desktop-nav-list">
            {navItems.map((item) =>
              item.children?.length ? (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuTrigger
                    className="redesign-nav-link"
                    aria-current={isCurrentPath(item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="redesign-nav-menu-content">
                    <NavigationMenuLink asChild>
                      <PrefetchLink className="redesign-nav-dropdown-item" href={item.href} prefetch={false} aria-current={isCurrentPath(item.href) ? "page" : undefined}>
                        {locale === "en" ? `All ${item.label}` : `查看全部${item.label}`}
                      </PrefetchLink>
                    </NavigationMenuLink>
                    {item.children.map((child) => (
                      <NavigationMenuLink key={child.href} asChild>
                        <PrefetchLink className="redesign-nav-dropdown-item" href={child.href} prefetch={false} aria-current={isCurrentPath(child.href) ? "page" : undefined}>
                          {child.label}
                        </PrefetchLink>
                      </NavigationMenuLink>
                    ))}
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild>
                    <PrefetchLink
                      className="redesign-nav-link"
                      href={item.href}
                      prefetch={false}
                      aria-current={isCurrentPath(item.href) ? "page" : undefined}
                    >
                      <span>{item.label}</span>
                    </PrefetchLink>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ),
            )}
            <NavigationMenuItem>
              {account.status === "guest" ? (
                <PrefetchLink className="redesign-login-link" href={account.loginHref} prefetch={false}>
                  {account.loginLabel}
                </PrefetchLink>
              ) : (
                <details className="redesign-account-menu">
                  <summary className="redesign-avatar-trigger" aria-label={account.avatarLabel}>
                    {account.displayName}
                  </summary>
                  <div className="redesign-avatar-menu" role="menu" aria-label={userMenuLabel}>
                    <PrefetchLink href={account.userHref} prefetch={false} role="menuitem">
                      {account.userLabel}
                    </PrefetchLink>
                    {account.isAdmin ? <PrefetchLink href={account.adminHref} prefetch={false} role="menuitem">{account.adminLabel}</PrefetchLink> : null}
                  </div>
                </details>
              )}
            </NavigationMenuItem>
            <NavigationMenuItem>
              <EnheRedesignLanguageSwitch
                localeHrefs={languageHrefs}
                currentLocale={locale}
                ariaLabel={languageAriaLabel}
              />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="redesign-mobile-actions">
          <EnheRedesignMobileMenu
            menuId={menuId}
            triggerLabel={menuTriggerLabel}
            closeLabel={menuCloseLabel}
            navItems={navItems}
            account={account}
            pathname={currentPathname}
            locale={locale}
          />
          <EnheRedesignLanguageSwitch
            localeHrefs={languageHrefs}
            currentLocale={locale}
            ariaLabel={languageAriaLabel}
          />
        </div>
      </div>
    </header>
  );
}
