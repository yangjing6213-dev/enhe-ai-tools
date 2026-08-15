import { headers } from "next/headers";
import { getHeaderUserSnapshot } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { buildLanguageSwitcherHref, buildLocalePath } from "@/lib/seo";
import { PRODUCTION_FILING } from "@/lib/production-filing";
import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import { EnheRedesignFooter } from "./enhe-redesign-footer";
import { EnheRedesignHeader } from "./enhe-redesign-header";
import { REDESIGN_NAV_ITEMS } from "./navigation";
import type { RedesignAccount, RedesignLanguageHrefs } from "./types";

function toRedesignLocale(locale: Locale) {
  return locale === "en" ? "en" : "zh";
}

export async function EnheRedesignPublicHeader({
  locale,
  languageHrefs,
}: {
  locale: Locale;
  languageHrefs?: RedesignLanguageHrefs;
}) {
  const [requestHeaders, user] = await Promise.all([headers(), getHeaderUserSnapshot()]);
  const redesignLocale = toRedesignLocale(locale);
  const pathname = requestHeaders.get("x-enhe-pathname") ?? buildLocalePath("/", locale);
  const t = getDictionary(locale);
  const account: RedesignAccount = user
    ? {
        status: "authenticated",
        displayName: user.nickname?.trim() || user.email || t.nav.user,
        avatarLabel: t.nav.user,
        userLabel: t.nav.user,
        userHref: buildLocalePath("/user", locale),
        isAdmin: user.role === "admin",
        adminLabel: t.nav.admin,
        adminHref: buildLocalePath("/admin", locale),
      }
    : {
        status: "guest",
        loginLabel: t.nav.login,
        loginHref: buildLocalePath("/login", locale),
      };

  return (
    <EnheRedesignHeader
      locale={redesignLocale}
      homeHref={buildLocalePath("/", locale)}
      brandLabel={HOME_COPY[redesignLocale].label}
      navItems={REDESIGN_NAV_ITEMS[redesignLocale]}
      languageHrefs={
        languageHrefs ?? {
          zh: buildLanguageSwitcherHref(pathname, "zh"),
          en: buildLanguageSwitcherHref(pathname, "en"),
        }
      }
      account={account}
      userMenuLabel={t.nav.user}
      sticky={false}
      menuId={`enhe-public-menu-${redesignLocale}`}
      menuTriggerLabel={t.nav.menu}
      menuCloseLabel={t.nav.closeMenu}
    />
  );
}

export function EnheRedesignPublicFooter({ locale }: { locale: Locale }) {
  const redesignLocale = toRedesignLocale(locale);

  return <EnheRedesignFooter locale={redesignLocale} filing={PRODUCTION_FILING[redesignLocale]} />;
}
