import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { EnheRedesignFooter } from "@/components/redesign/enhe-redesign-footer";
import { EnheRedesignHeader } from "@/components/redesign/enhe-redesign-header";
import { REDESIGN_NAV_ITEMS } from "@/components/redesign/navigation";
import { REDESIGN_PREVIEW_FILING } from "@/components/redesign/preview-filing";
import type { RedesignLocale } from "@/components/redesign/types";
import { EnheRedesignHome } from "@/components/redesign/home/EnheRedesignHome";
import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import { resolveRedesignPreviewLocale } from "@/lib/redesign/home/home-preview-locale";

const HEADER_COPY = {
  zh: {
    loginLabel: "登录",
    menuTriggerLabel: "打开导航菜单",
    menuCloseLabel: "关闭导航菜单",
    userMenuLabel: "用户菜单",
  },
  en: {
    loginLabel: "Log in",
    menuTriggerLabel: "Open navigation menu",
    menuCloseLabel: "Close navigation menu",
    userMenuLabel: "User menu",
  },
} satisfies Record<RedesignLocale, {
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
  const languageHrefs = {
    zh: "/redesign-preview/home?locale=zh",
    en: "/redesign-preview/home?locale=en",
  } as const;
  const currentHref = languageHrefs[locale];

  return (
    <div className="enhe-redesign-preview" lang={locale}>
      <EnheRedesignHeader
        locale={locale}
        homeHref={currentHref}
        brandLabel={HOME_COPY[locale].label}
        navItems={REDESIGN_NAV_ITEMS[locale]}
        languageHrefs={languageHrefs}
        account={{ status: "guest", loginLabel: copy.loginLabel, loginHref: "#login" }}
        userMenuLabel={copy.userMenuLabel}
        menuId={`redesign-home-${locale}-menu`}
        menuTriggerLabel={copy.menuTriggerLabel}
        menuCloseLabel={copy.menuCloseLabel}
      />
      <p className="redesign-preview-state-label">LOCAL CANDIDATE</p>
      <EnheRedesignHome locale={locale} />
      <EnheRedesignFooter locale={locale} filing={REDESIGN_PREVIEW_FILING[locale]} />
    </div>
  );
}
