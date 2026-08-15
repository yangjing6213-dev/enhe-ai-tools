import { StructuredData } from "@/components/structured-data";
import { CustomerSupportWidget } from "@/components/customer-support-widget";
import {
  EnheRedesignPublicFooter,
  EnheRedesignPublicHeader,
} from "@/components/redesign/enhe-production-public-shell";
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
    returnPolicyPath: buildLocalePath("/legal/membership-refund", forceLocale),
    contactPoint: {
      email: "ENHEAI.life@protonmail.com",
      contactType: "customer support",
      availableLanguage: ["zh-CN", "en-US"]
    }
  });

  return (
    <div className="enhe-redesign-production" lang={forceLocale}>
      <StructuredData data={[websiteSchema, organizationSchema]} />
      <EnheRedesignPublicHeader locale={forceLocale} />
      <div className="fade-in">{children}</div>
      <CustomerSupportWidget locale={forceLocale} faqs={getCustomerSupportFaqs(forceLocale)} />
      <EnheRedesignPublicFooter locale={forceLocale} />
    </div>
  );
}
