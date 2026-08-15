import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { EnheRedesignFooter } from "@/components/redesign/enhe-redesign-footer";
import { EnheRedesignHeader } from "@/components/redesign/enhe-redesign-header";
import { REDESIGN_EN_NAV_ITEMS, REDESIGN_ZH_NAV_ITEMS } from "@/components/redesign/navigation";
import { EnheRedesignSoftwarePreviewCatalog } from "@/components/redesign/software/EnheRedesignSoftwarePreviewCatalog";
import type { RedesignLocale } from "@/components/redesign/types";
import { resolveRedesignPreviewLocale } from "@/lib/redesign/home/home-preview-locale";
import { SOFTWARE_COPY } from "@/lib/redesign/software/software-copy";

const HEADER_COPY = {
  zh: {
    languageAriaLabel: "中文 / EN",
    loginLabel: "登录",
    menuTriggerLabel: "打开导航菜单",
    menuCloseLabel: "关闭导航菜单",
    userMenuLabel: "用户菜单",
  },
  en: {
    languageAriaLabel: "English / 中文",
    loginLabel: "Log in",
    menuTriggerLabel: "Open navigation menu",
    menuCloseLabel: "Close navigation menu",
    userMenuLabel: "User menu",
  },
} satisfies Record<
  RedesignLocale,
  {
    languageAriaLabel: string;
    loginLabel: string;
    menuTriggerLabel: string;
    menuCloseLabel: string;
    userMenuLabel: string;
  }
>;

export default async function RedesignSoftwarePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const locale = resolveRedesignPreviewLocale(params, (await headers()).get("x-enhe-locale"));
  const copy = HEADER_COPY[locale];
  const brandLabel = SOFTWARE_COPY[locale].page.label;
  const currentHref = `/redesign-preview/software?locale=${locale}`;
  const languageHrefs = {
    zh: "/redesign-preview/software?locale=zh",
    en: "/redesign-preview/software?locale=en",
  } as const;

  return (
    <div className="enhe-redesign-preview">
      <EnheRedesignHeader
        locale={locale}
        homeHref={currentHref}
        brandLabel={brandLabel}
        navItems={locale === "en" ? REDESIGN_EN_NAV_ITEMS : REDESIGN_ZH_NAV_ITEMS}
        languageHrefs={languageHrefs}
        languageAriaLabel={copy.languageAriaLabel}
        account={{ status: "guest", loginLabel: copy.loginLabel, loginHref: "#login" }}
        userMenuLabel={copy.userMenuLabel}
        menuId={`redesign-software-${locale}-menu`}
        menuTriggerLabel={copy.menuTriggerLabel}
        menuCloseLabel={copy.menuCloseLabel}
      />
      <p className="redesign-preview-state-label">LOCAL CANDIDATE</p>
      <EnheRedesignSoftwarePreviewCatalog locale={locale} />
      <EnheRedesignFooter locale={locale} />
    </div>
  );
}
