import { LanguageToggle } from "@/components/language-toggle";
import { LayoutDashboard, Menu, Search } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { PublicNavLink } from "@/components/public-nav-link";

type MobileNavItem = {
  label: string;
  href: string;
  icon?: "search";
  children?: ReadonlyArray<{
    label: string;
    href: string;
    description?: string;
  }>;
};

type MobileNavMenuProps = {
  labels: {
    menu: string;
    admin?: string;
  };
  navItems: ReadonlyArray<MobileNavItem>;
  showAdmin: boolean;
  loginItem?: readonly [string, string];
  userCenterItem?: readonly [string, string];
  languageItems?: ReadonlyArray<{ label: string; href: string; locale: "zh" | "en"; active: boolean }>;
};

export function MobileNavMenu({
  labels,
  navItems,
  showAdmin,
  loginItem,
  userCenterItem,
  languageItems = []
}: MobileNavMenuProps) {
  return (
    <details className="mobile-nav group relative lg:hidden">
      <summary
        className="mobile-nav-trigger cursor-target inline-flex cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden"
        aria-label={labels.menu}
      >
        <Menu size={18} />
      </summary>
      <div className="mobile-nav-panel absolute right-0 top-12 z-50 w-64 overflow-hidden p-2">
        {navItems.map((item) =>
          item.children?.length ? (
            <div key={item.href} className="mobile-nav-group">
              <PublicNavLink href={item.href} prefetch={false} className="mobile-nav-link mobile-nav-parent-link cursor-target">
                {item.label}
              </PublicNavLink>
              <div className="mobile-nav-submenu">
                {item.children.map((child) => (
                  <PublicNavLink
                    key={child.href}
                    href={child.href}
                    exact={child.href === item.href}
                    prefetch={false}
                    className="mobile-nav-sublink cursor-target"
                  >
                    <span>{child.label}</span>
                  </PublicNavLink>
                ))}
              </div>
            </div>
          ) : (
            <PublicNavLink key={item.href} href={item.href} prefetch={false} className="mobile-nav-link cursor-target">
              {item.icon === "search" ? <Search size={16} aria-hidden="true" /> : null}
              {item.label}
            </PublicNavLink>
          )
        )}
        {loginItem ? (
          <PrefetchLink href={loginItem[1]} prefetch={false} className="mobile-nav-link cursor-target">
            {loginItem[0]}
          </PrefetchLink>
        ) : null}
        {userCenterItem ? (
          <PrefetchLink href={userCenterItem[1]} prefetch={false} className="mobile-nav-link mobile-nav-user-center cursor-target">
            {userCenterItem[0]}
          </PrefetchLink>
        ) : null}
        {languageItems.length ? (
          <LanguageToggle locale={languageItems.find(item => item.active)?.locale ?? "zh"}
            hrefs={{ zh: languageItems.find(item => item.locale === "zh")?.href ?? "/", en: languageItems.find(item => item.locale === "en")?.href ?? "/en" }}
            label="中文 / EN" className="mobile-nav-language" />
        ) : null}
        {showAdmin ? (
          <PrefetchLink href="/admin" prefetch={false} className="mobile-nav-link mobile-nav-admin cursor-target">
            <LayoutDashboard size={16} />
            {labels.admin ?? "Admin"}
          </PrefetchLink>
        ) : null}
      </div>
    </details>
  );
}
