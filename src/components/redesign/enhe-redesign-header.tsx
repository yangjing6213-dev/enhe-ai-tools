import { EnheBrandLockup } from "./enhe-brand-lockup";
import { EnheRedesignLanguageSwitch } from "./enhe-redesign-language-switch";
import { EnheRedesignMobileMenu } from "./enhe-redesign-mobile-menu";
import { isExactCurrentPage } from "./navigation";
import type { RedesignAccount, RedesignLanguageHrefs, RedesignLocale, RedesignNavItem } from "./types";

export function EnheRedesignHeader({
  locale,
  homeHref,
  brandLabel,
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
  brandLabel: string;
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
          <span className="redesign-brand-label">{brandLabel}</span>
        </div>
        <nav className="redesign-desktop-nav" aria-label={locale === "en" ? "Primary navigation" : "主导航"}>
          {navItems.map((item) =>
            item.children?.length ? (
              <details key={item.href} className="redesign-nav-dropdown">
                <summary
                  className="redesign-nav-link"
                >
                  <span>{item.label}</span>
                </summary>
                <div className="redesign-nav-dropdown-panel">
                  {item.children.map((child) => (
                    <a
                      key={child.href}
                      href={child.href}
                      aria-current={isCurrentPath(child.href) ? "page" : undefined}
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              </details>
            ) : (
              <a
                key={item.href}
                className="redesign-nav-link"
                href={item.href}
                aria-current={isCurrentPath(item.href) ? "page" : undefined}
              >
                <span>{item.label}</span>
              </a>
            ),
          )}
          <EnheRedesignLanguageSwitch
            localeHrefs={languageHrefs}
            currentLocale={locale}
            ariaLabel={languageAriaLabel}
          />
          {account.status === "guest" ? (
            <a className="redesign-login-link" href={account.loginHref}>
              {account.loginLabel}
            </a>
          ) : (
            <details className="redesign-account-menu">
              <summary className="redesign-avatar-trigger" aria-label={account.avatarLabel}>
                {account.displayName}
              </summary>
              <div className="redesign-avatar-menu" role="menu" aria-label={userMenuLabel}>
                <a href={account.userHref} role="menuitem">
                  {account.userLabel}
                </a>
                {account.isAdmin ? <a href={account.adminHref} role="menuitem">{account.adminLabel}</a> : null}
              </div>
            </details>
          )}
        </nav>
        <div className="redesign-mobile-actions">
          <EnheRedesignMobileMenu
            menuId={menuId}
            triggerLabel={menuTriggerLabel}
            closeLabel={menuCloseLabel}
            navItems={navItems}
            account={account}
            pathname={currentPathname}
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
