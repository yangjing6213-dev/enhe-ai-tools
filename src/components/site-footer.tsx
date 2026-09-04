import Image from "next/image";
import { Mail, Music2, NotebookText, Youtube, type LucideIcon } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Container } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getCurrentLocale } from "@/lib/i18n";
import { legalPages } from "@/lib/legal";
import { buildLocalePath } from "@/lib/seo";
import { getEffectiveFooterCopyright, getEffectiveLocalizedSiteName, getSettingsMap } from "@/lib/settings";

const companyContact = {
  name: "深圳市龙岗区恩禾网络科技工作室",
  address: "深圳市龙岗区横岗街道塘坑社区宸和路51号中联展数字电商产业园C栋C305",
  englishName: "Shenzhen Longgang District Enhe Network Technology Studio",
  englishAddress: "Room C305, Building C, Zhonglianzhan Digital E-commerce Industrial Park, 51 Chenhe Road, Tangkeng Community, Henggang Street, Longgang District, Shenzhen",
  phone: "15715097597",
  phoneHref: "tel:15715097597",
  email: "ENHEAI.life@protonmail.com",
  emailHref: "mailto:ENHEAI.life@protonmail.com"
};

const footerSocialLinks: { label: string; href?: string; icon: LucideIcon }[] = [
  { label: "Gmail", href: companyContact.emailHref, icon: Mail },
  { label: "小红书", icon: NotebookText },
  { label: "抖音", icon: Music2 },
  { label: "YouTube", icon: Youtube }
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
  const filingCopy =
    locale === "en"
      ? {
          publicSecurityAlt: "Public security filing icon",
          publicSecurity: "Fujian Public Security Record No. 35030302900035",
          icp: "ICP Filing: Min ICP No. 2025092404-2"
        }
      : {
          publicSecurityAlt: "备案图标",
          publicSecurity: "闽公网安备 35030302900035号",
          icp: "闽ICP备2025092404号-2"
        };
  const companyName = locale === "en" ? companyContact.englishName : companyContact.name;
  const companyAddress = locale === "en" ? companyContact.englishAddress : companyContact.address;
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
        { label: t.nav.updates, href: buildLocalePath("/#updates", locale) },
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
            <p className="site-footer-summary">
              {locale === "en"
                ? "AI software, account services, skill learning, and frontier AI insight in one ENHE AI hub."
                : "汇集AI前沿资讯、AI软件应用、AI账号服务与AI技能学习，让用户从信息判断走向可执行成果。"}
            </p>
            <div className="site-footer-socials" aria-label={locale === "en" ? "ENHE AI social channels" : "ENHE AI 社交渠道"}>
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

          <div className="site-footer-newsletter" aria-label={locale === "en" ? "Contact ENHE AI" : "联系 ENHE AI"}>
            <p className="site-footer-kicker">{locale === "en" ? "Contact" : "联系咨询"}</p>
            <a href={companyContact.emailHref} className="site-footer-contact-button cursor-target">
              {companyContact.email}
            </a>
          </div>
        </div>

        <div className="site-footer-grid">
          {footerGroups.map((group, index) => (
            <nav key={group.title} className="site-footer-group" aria-label={group.title}>
              <h2 className="site-footer-group-title site-footer-group-title-desktop">{group.title}</h2>
              <details className="site-footer-disclosure" open={index < 2}>
                <summary className="site-footer-group-title">{group.title}</summary>
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
            <h2 className="site-footer-group-title site-footer-group-title-desktop">{locale === "en" ? "Company" : "公司信息"}</h2>
            <details className="site-footer-disclosure">
              <summary className="site-footer-group-title">{locale === "en" ? "Company" : "公司信息"}</summary>
              <span>
                {contactLabels.company}: {companyName}
              </span>
              <span>
                {contactLabels.address}: {companyAddress}
              </span>
              <a href={companyContact.phoneHref} className="site-footer-link cursor-target">
                {contactLabels.phone}: {companyContact.phone}
              </a>
              <a href={companyContact.emailHref} className="site-footer-link cursor-target">
                {contactLabels.email}: {companyContact.email}
              </a>
            </details>
          </address>
        </div>

        <div className="site-footer-gradient-mark" aria-hidden="true">
          <Image
            src="/images/brand/enhe-icon-gradient-transparent-cropped.png"
            alt={`${siteName} gradient logo`}
            width={96}
            height={64}
            className="site-footer-gradient-icon"
            unoptimized
          />
          <span className="site-footer-gradient-word">ENHE AI</span>
        </div>

        <div className="site-footer-bottom">
          <p>{copyright}</p>
          <div className="site-footer-filings">
            <a
              href="https://beian.mps.gov.cn/#/query/webSearch?code=35030302900035"
              target="_blank"
              rel="noreferrer"
              className="site-footer-filing-link cursor-target"
            >
              <Image src="/images/beian-icon.png" alt={filingCopy.publicSecurityAlt} width={18} height={20} unoptimized />
              <span>{filingCopy.publicSecurity}</span>
            </a>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="site-footer-filing-link cursor-target">
              {filingCopy.icp}
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
