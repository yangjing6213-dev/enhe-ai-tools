import { EnheBrandLockup } from "./enhe-brand-lockup";
import { EnheRedesignLanguageSwitch } from "./enhe-redesign-language-switch";
import { EnheRedesignMobileMenu } from "./enhe-redesign-mobile-menu";
import type { RedesignAccount, RedesignLocale, RedesignNavItem } from "./types";

export function EnheRedesignHeader({
  locale,
  homeHref,
  brandLabel,
  navItems,
  currentHref,
  alternateHref,
  currentLocaleLabel,
  alternateLocaleLabel,
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
  currentHref: string;
  alternateHref: string;
  currentLocaleLabel: string;
  alternateLocaleLabel: string;
  languageAriaLabel?: string;
  account: RedesignAccount;
  userMenuLabel: string;
  sticky?: boolean;
  menuId: string;
  menuTriggerLabel: string;
  menuCloseLabel: string;
}) {
  return (
    <header className="redesign-header" data-sticky={sticky} data-locale={locale}>
      <div className="redesign-header-inner">
        <div className="redesign-brand-region">
          <EnheBrandLockup href={homeHref} label={brandLabel} />
          <span className="redesign-brand-label">{brandLabel}</span>
        </div>
        <nav className="redesign-desktop-nav" aria-label={locale === "en" ? "Primary navigation" : "主导航"}>
          {navItems.map((item) => (
            <a key={item.href} className="redesign-nav-link" href={item.href}>
              {item.kind === "search" ? <span className="redesign-search-icon" aria-hidden="true" /> : null}
              <span>{item.label}</span>
            </a>
          ))}
          <EnheRedesignLanguageSwitch
            currentHref={currentHref}
            alternateHref={alternateHref}
            currentLabel={currentLocaleLabel}
            alternateLabel={alternateLocaleLabel}
            currentLocale={locale}
            alternateLocale={locale === "en" ? "zh" : "en"}
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
          <EnheRedesignLanguageSwitch
            currentHref={currentHref}
            alternateHref={alternateHref}
            currentLabel={currentLocaleLabel}
            alternateLabel={alternateLocaleLabel}
            currentLocale={locale}
            alternateLocale={locale === "en" ? "zh" : "en"}
            ariaLabel={languageAriaLabel}
          />
          <EnheRedesignMobileMenu
            menuId={menuId}
            triggerLabel={menuTriggerLabel}
            closeLabel={menuCloseLabel}
            navItems={navItems}
            account={account}
          />
        </div>
      </div>
    </header>
  );
}
