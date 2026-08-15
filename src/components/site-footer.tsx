import Image from "next/image";
import { ChevronDown, Mail, Music2, NotebookText, Youtube, type LucideIcon } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Container } from "@/components/ui";
import { companyProfile } from "@/lib/company-profile";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getCurrentLocale } from "@/lib/i18n";
import { legalPages } from "@/lib/legal";
import { PRODUCTION_FILING } from "@/lib/production-filing";
import { buildLocalePath } from "@/lib/seo";
import { getEffectiveFooterCopyright, getEffectiveLocalizedSiteName, getSettingsMap } from "@/lib/settings";

const footerSocialLinks: { label: string; href?: string; icon: LucideIcon }[] = [
  { label: "Gmail", href: companyProfile.email.href, icon: Mail },
  { label: "小红书", href: companyProfile.phone.href, icon: NotebookText },
  { label: "抖音", icon: Music2 },
  { label: "YouTube", href: "https://www.youtube.com/@ENHE-AI", icon: Youtube }
];

export async function SiteFooter({ forceLocale }: { forceLocale?: Locale }) {
  const [locale, settings] = await Promise.all([forceLocale ? Promise.resolve(forceLocale) : getCurrentLocale(), getSettingsMap()]);
  const t = getDictionary(locale);
  const siteName = getEffectiveLocalizedSiteName(settings, locale, t.footer.siteName);
  const copyright = getEffectiveFooterCopyright(settings, t.footer.copyright);
  const contactLabels =
    locale === "en"
      ? { company: "Company", address: "Address", phone: "Phone", email: "Email" }
      : { company: "公司名称", address: "地址", phone: "电话", email: "邮箱" };
  const filing = PRODUCTION_FILING[locale];
  const companyName = companyProfile.name[locale];
  const companyAddress = companyProfile.address[locale];
  const footerGroups = [
    {
      title: locale === "en" ? "Explore" : "平台入口",
      links: [
        { label: t.nav.home, href: buildLocalePath("/", locale) },
        { label: t.nav.aiNews, href: buildLocalePath("/ai-news", locale) },
        { label: t.nav.software, href: buildLocalePath("/software", locale) },
        { label: t.nav.onlineTools, href: buildLocalePath("/account-services", locale) },
        { label: t.nav.skillLearning, href: buildLocalePath("/skill-learning", locale) }
      ]
    },
    {
      title: locale === "en" ? "Resources" : "资源支持",
      links: [
        {
          label: locale === "en" ? "Build Your Own X Navigator" : "Build Your Own X 项目导航器",
          href: buildLocalePath("/build-your-own-x", locale)
        },
        { label: t.nav.aiTrends, href: buildLocalePath("/ai-trends", locale) },
        { label: t.nav.pricing, href: buildLocalePath("/pricing", locale) },
        { label: t.nav.tutorials, href: buildLocalePath("/tutorials", locale) },
        { label: t.footer.helpSupport, href: buildLocalePath("/legal/user-agreement", locale) }
      ]
    },
    {
      title: locale === "en" ? "Security & Legal" : "合规条款",
      links: legalPages.map((page) => ({
        label: t.footer.legal[page.slug as keyof typeof t.footer.legal],
        href: buildLocalePath(`/legal/${page.slug}`, locale)
      }))
    }
  ];

  return (
    <footer className="site-footer">
      <Container className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-brand-block">
            <div className="site-footer-brand-row">
              <Image
                src="/images/brand/enhe-icon-gradient-transparent-cropped.png"
                alt={`${siteName} logo`}
                width={48}
                height={32}
                className="site-footer-logo"
                unoptimized
              />
              <p className="site-footer-brand-name">{siteName}</p>
            </div>
          </div>

          <div className="site-footer-newsletter" aria-label={locale === "en" ? "ENHE AI contact channels" : "ENHE AI 联系渠道"}>
            <div className="site-footer-newsletter-socials">
              {footerSocialLinks.map(({ label, href, icon: Icon }) =>
                href ? (
                  <a key={label} href={href} className="site-footer-social-link cursor-target" aria-label={label}>
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  </a>
                ) : (
                  <span key={label} className="site-footer-social-link is-muted" role="img" aria-label={label}>
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="site-footer-grid">
          {footerGroups.map((group) => (
            <nav key={group.title} className="site-footer-group" aria-label={group.title}>
              <details className="site-footer-disclosure">
                <summary className="site-footer-group-title">
                  <span>{group.title}</span>
                  <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />
                </summary>
                <ul className="site-footer-link-list">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <PrefetchLink href={link.href} className="site-footer-link cursor-target">
                        {link.label}
                      </PrefetchLink>
                    </li>
                  ))}
                </ul>
              </details>
            </nav>
          ))}

          <address id="footer-contact" className="site-footer-contact not-italic">
            <details className="site-footer-disclosure">
              <summary className="site-footer-group-title">
                <span>{locale === "en" ? "Company" : "公司信息"}</span>
                <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />
              </summary>
              <dl className="site-footer-company-list">
                <div className="site-footer-company-row">
                  <dt>{contactLabels.company}</dt>
                  <dd>{companyName}</dd>
                </div>
                <div className="site-footer-company-row">
                  <dt>{contactLabels.address}</dt>
                  <dd>{companyAddress}</dd>
                </div>
                <div className="site-footer-company-row">
                  <dt>{contactLabels.phone}</dt>
                  <dd>
                    <a href={companyProfile.phone.href} className="site-footer-link cursor-target">
                      {companyProfile.phone.value}
                    </a>
                  </dd>
                </div>
                <div className="site-footer-company-row">
                  <dt>{contactLabels.email}</dt>
                  <dd>
                    <a href={companyProfile.email.href} className="site-footer-link cursor-target">
                      {companyProfile.email.value}
                    </a>
                  </dd>
                </div>
                <div className="site-footer-company-row">
                  <dt>{locale === "en" ? "Profile" : "档案"}</dt>
                  <dd>
                    <PrefetchLink href={buildLocalePath("/about", locale)} className="site-footer-link cursor-target">
                      {locale === "en" ? "ENHE AI brand profile" : "恩禾ENHE AI 品牌档案"}
                    </PrefetchLink>
                  </dd>
                </div>
              </dl>
            </details>
          </address>
        </div>

        <div className="site-footer-gradient-mark" aria-hidden="true">
          <span className="site-footer-gradient-word">ENHE AI</span>
        </div>

        <div className="site-footer-bottom">
          <p>{copyright}</p>
          <div className="site-footer-filings">
            <a
              href={filing.publicSecurity.href}
              target="_blank"
              rel="noreferrer"
              className="site-footer-filing-link cursor-target"
            >
              <Image src="/images/beian-icon.png" alt={filing.publicSecurityAlt} width={18} height={20} unoptimized />
              <span>{filing.publicSecurity.label}</span>
            </a>
            <a href={filing.icp.href} target="_blank" rel="noreferrer" className="site-footer-filing-link cursor-target">
              {filing.icp.label}
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
