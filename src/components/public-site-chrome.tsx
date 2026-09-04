import { StructuredData } from "@/components/structured-data";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import {
  buildLanguageAlternates,
  buildLocalePath,
  buildOrganizationSchema,
  buildWebsiteSchema
} from "@/lib/seo";
import {
  getEffectiveLocalizedHomeHeroIntro,
  getEffectiveLocalizedSiteName,
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
  const inLanguage = forceLocale === "en" ? "en-US" : "zh-CN";
  const siteDisplayName = getEffectiveLocalizedSiteName(settings, forceLocale, t.footer.siteName);
  const siteLogo = getEffectiveSiteLogo(settings, "/images/brand/enhe-icon-gradient-white-bg-cropped.png");
  const siteDescription = getEffectiveLocalizedHomeHeroIntro(settings, forceLocale, t.home.intro);

  // Emit locale-aware WebSite, Organization, and SearchAction schema on public pages only.
  const websiteSchema = buildWebsiteSchema({
    schemaType: "WebSite",
    name: siteDisplayName,
    description: siteDescription,
    url: languageAlternates[inLanguage],
    inLanguage: forceLocale === "en" ? "en-US" : "zh-CN",
    searchPathTemplate: buildLocalePath("/search?q={search_term_string}", forceLocale)
  });
  const organizationSchema = buildOrganizationSchema({
    schemaType: "Organization",
    name: siteDisplayName,
    description: siteDescription,
    logo: siteLogo,
    url: languageAlternates[inLanguage],
    sameAs: [
      "https://www.enhe-tech.com.cn/about",
      "https://www.enhe-tech.com.cn/ai-news",
      "https://www.enhe-tech.com.cn/software"
    ],
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
      <SiteFooter forceLocale={forceLocale} />
    </>
  );
}
