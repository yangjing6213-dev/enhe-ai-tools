import Image from "next/image";
import { EnheAccountMenu } from "./enhe-account-menu";
import { EmojiText } from "@/components/emoji-text";
import { EnheHeaderAvatar } from "./enhe-header-avatar";
import { EnheBrandLockup } from "./enhe-brand-lockup";
import { EnheHeaderSearch } from "./enhe-header-search";
import type { SearchRecommendation } from "@/lib/public-search-recommendations";
import { EnheRedesignLanguageSwitch } from "./enhe-redesign-language-switch";
import { EnheRedesignThemeSwitch } from "./enhe-redesign-theme-switch";
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
                <NavigationMenuItem
                  key={item.href}
                  className={
                    item.href === (locale === "en" ? "/en/ai-trends" : "/ai-trends")
                      ? "redesign-nav-trends-anchor"
                      : undefined
                  }
                >
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
                  {item.href === (locale === "en" ? "/en/ai-trends" : "/ai-trends") ? (
                    <span className="redesign-hanging-mascot" aria-hidden="true">
                      <span className="redesign-mascot-cord" />
                      <Image
                        src="/images/mascots/enhe-welcome-tag.webp"
                        alt=""
                        width={512}
                        height={512}
                        className="redesign-hanging-mascot-image"
                      />
                    </span>
                  ) : null}
                </NavigationMenuItem>
              ),
            )}
            <NavigationMenuItem>
              {account.status === "guest" ? (
                <PrefetchLink className="redesign-login-link" href={account.loginHref} prefetch={false}>
                  {account.loginLabel}
                </PrefetchLink>
              ) : (
                <EnheAccountMenu>
                  <summary className="redesign-avatar-trigger" aria-label={account.avatarLabel}>
                    <EnheHeaderAvatar name={account.displayName} />
                    <span className="redesign-header-user-name"><EmojiText text={account.displayName} /></span>
                  </summary>
                  <div className="redesign-avatar-menu" role="menu" aria-label={userMenuLabel}>
                    <PrefetchLink href={account.userHref} prefetch={false} role="menuitem">
                      {account.userLabel}
                    </PrefetchLink>
                    {account.isAdmin ? <PrefetchLink href={account.adminHref} prefetch={false} role="menuitem">{account.adminLabel}</PrefetchLink> : null}
                  </div>
                </EnheAccountMenu>
              )}
            </NavigationMenuItem>
            <NavigationMenuItem>
              <EnheRedesignLanguageSwitch
                localeHrefs={languageHrefs}
                currentLocale={locale}
                ariaLabel={languageAriaLabel}
              />
            </NavigationMenuItem>
            <NavigationMenuItem>
              <EnheRedesignThemeSwitch locale={locale} />
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
          <EnheRedesignThemeSwitch locale={locale} />
        </div>
      </div>
    </header>
  );
}
