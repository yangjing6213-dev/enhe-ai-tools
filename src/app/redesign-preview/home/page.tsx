import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { EnheRedesignFooter } from "@/components/redesign/enhe-redesign-footer";
import { EnheRedesignHeader } from "@/components/redesign/enhe-redesign-header";
import { REDESIGN_EN_NAV_ITEMS, REDESIGN_ZH_NAV_ITEMS } from "@/components/redesign/navigation";
import type { RedesignLocale } from "@/components/redesign/types";
import { EnheRedesignHome } from "@/components/redesign/home/EnheRedesignHome";
import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import { resolveRedesignPreviewLocale } from "@/lib/redesign/home/home-preview-locale";

const HEADER_COPY = {
  zh: {
    currentLocaleLabel: "中文",
    alternateLocaleLabel: "EN",
    languageAriaLabel: "中文 / EN",
    loginLabel: "登录",
    menuTriggerLabel: "打开导航菜单",
    menuCloseLabel: "关闭导航菜单",
    userMenuLabel: "用户菜单",
  },
  en: {
    currentLocaleLabel: "EN",
    alternateLocaleLabel: "中文",
    languageAriaLabel: "English / 中文",
    loginLabel: "Log in",
    menuTriggerLabel: "Open navigation menu",
    menuCloseLabel: "Close navigation menu",
    userMenuLabel: "User menu",
  },
} satisfies Record<RedesignLocale, {
  currentLocaleLabel: string;
  alternateLocaleLabel: string;
  languageAriaLabel: string;
  loginLabel: string;
  menuTriggerLabel: string;
  menuCloseLabel: string;
  userMenuLabel: string;
}>;

export default async function RedesignHomePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const locale = resolveRedesignPreviewLocale(
    params,
    (await headers()).get("x-enhe-locale"),
  );
  const copy = HEADER_COPY[locale];
  const currentHref = `/redesign-preview/home?locale=${locale}`;
  const alternateHref = locale === "en"
    ? "/redesign-preview/home?locale=zh"
    : "/redesign-preview/home?locale=en";

  return (
    <div className="enhe-redesign-preview" lang={locale}>
      <EnheRedesignHeader
        locale={locale}
        homeHref={currentHref}
        brandLabel={HOME_COPY[locale].label}
        navItems={locale === "en" ? REDESIGN_EN_NAV_ITEMS : REDESIGN_ZH_NAV_ITEMS}
        currentHref={currentHref}
        alternateHref={alternateHref}
        currentLocaleLabel={copy.currentLocaleLabel}
        alternateLocaleLabel={copy.alternateLocaleLabel}
        languageAriaLabel={copy.languageAriaLabel}
        account={{ status: "guest", loginLabel: copy.loginLabel, loginHref: "#login" }}
        userMenuLabel={copy.userMenuLabel}
        menuId={`redesign-home-${locale}-menu`}
        menuTriggerLabel={copy.menuTriggerLabel}
        menuCloseLabel={copy.menuCloseLabel}
      />
      <p className="redesign-preview-state-label">LOCAL CANDIDATE</p>
      <EnheRedesignHome locale={locale} />
      <EnheRedesignFooter locale={locale} />
    </div>
  );
}
