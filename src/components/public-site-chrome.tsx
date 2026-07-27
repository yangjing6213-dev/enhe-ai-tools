import { StructuredData } from "@/components/structured-data";
import { CustomerSupportWidget } from "@/components/customer-support-widget";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCustomerSupportFaqs } from "@/lib/customer-support";
import { buildEnheOrganizationSchema } from "@/lib/brand-entity";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import {
  absoluteUrl,
  buildLanguageAlternates,
  buildLocalePath,
  buildWebsiteSchema,
  siteName
} from "@/lib/seo";
import {
  getEffectiveLocalizedHomeHeroIntro,
  getEffectiveSiteLogo,
  getSettingsMap
} from "@/lib/settings";

export async function PublicSiteChrome({
  children,
  forceLocale
}: React.PropsWithChildren<{ forceLocale: Locale }>) {
  const settings = await getSettingsMap();
  const t = getDictionary(forceLocale);
  const languageAlternates = buildLanguageAlternates("/");
  const siteLogo = getEffectiveSiteLogo(settings, "/images/brand/enhe-icon-gradient-white-bg-cropped.png");
  const siteDescription = getEffectiveLocalizedHomeHeroIntro(settings, forceLocale, t.home.intro);
  const organizationId = absoluteUrl("/#organization");
  const websiteId = absoluteUrl("/#website");

  // Emit locale-aware WebSite, Organization, and SearchAction schema on public pages only.
  const websiteSchema = buildWebsiteSchema({
    schemaType: "WebSite",
    id: websiteId,
    name: siteName,
    description: siteDescription,
    url: absoluteUrl("/"),
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    searchPathTemplate: buildLocalePath("/search?q={search_term_string}", forceLocale),
    publisherId: organizationId
  });
  const organizationSchema = buildEnheOrganizationSchema({
    description: siteDescription,
    logo: siteLogo,
    url: languageAlternates["x-default"],
    contactPoint: {
      email: "ENHEAI.life@protonmail.com",
      contactType: "customer support",
      availableLanguage: ["zh-CN", "en-US"]
    }
  });

  return (
    <>
      <StructuredData data={[websiteSchema, organizationSchema]} />
      <SiteHeader forceLocale={forceLocale} />
      <div className="fade-in">{children}</div>
      <CustomerSupportWidget locale={forceLocale} faqs={getCustomerSupportFaqs(forceLocale)} />
      <SiteFooter forceLocale={forceLocale} />
    </>
  );
}
