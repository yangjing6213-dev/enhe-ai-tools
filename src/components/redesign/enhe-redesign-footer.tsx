import { Fragment } from "react";
import Image from "next/image";
import { ChevronDown, Github } from "lucide-react";
import { EnheRedesignBrandValue } from "./home/EnheRedesignBrandValue";
import type { ProductionFiling } from "@/lib/production-filing";
import type { RedesignFooterCopy, RedesignLocale } from "./types";

const FOOTER_COPY: Record<RedesignLocale, RedesignFooterCopy> = {
  zh: {
    ariaLabel: "网站页脚",
    columns: [
      {
        title: "帮助与服务",
        links: [
          { label: "帮助支持", href: "/about" },
          { label: "使用教程", href: "/skill-learning" },
          { label: "购买与下载", href: "/software" },
          { label: "产品更新", href: "/ai-news" },
        ],
      },
      {
        title: "合规条款",
        links: [
          { label: "用户协议", href: "/legal/user-agreement" },
          { label: "隐私政策", href: "/legal/privacy-policy" },
          { label: "退款规则", href: "/legal/membership-refund" },
          { label: "版权投诉", href: "/legal/copyright-complaint" },
          { label: "未成年人保护", href: "/legal/minor-protection" },
        ],
      },
      {
        title: "公司信息",
        links: [
          { label: "品牌档案", href: "/about" },
          { label: "联系邮箱", href: "mailto:292055066@qq.com" },
        ],
      },
    ],
    copyright: "© ENHE AI",
  },
  en: {
    ariaLabel: "Site footer",
    columns: [
      {
        title: "Help & Support",
        links: [
          { label: "Help Center", href: "/en/about" },
          { label: "Tutorials", href: "/en/skill-learning" },
          { label: "Purchase & Download", href: "/en/software" },
          { label: "Product Updates", href: "/en/ai-news" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms of Use", href: "/en/legal/user-agreement" },
          { label: "Privacy Policy", href: "/en/legal/privacy-policy" },
          { label: "Refund Policy", href: "/en/legal/membership-refund" },
          { label: "Copyright Complaints", href: "/en/legal/copyright-complaint" },
          { label: "Protection of Minors", href: "/en/legal/minor-protection" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "Brand Profile", href: "/en/about" },
          { label: "Contact Email", href: "mailto:292055066@qq.com" },
        ],
      },
    ],
    copyright: "© ENHE AI",
  },
};

export function EnheRedesignFooter({
  locale,
  filing,
}: {
  locale: RedesignLocale;
  filing?: ProductionFiling;
}) {
  const copy = FOOTER_COPY[locale];
  const filingEntries = [filing?.icp, filing?.publicSecurity].filter(
    (entry): entry is NonNullable<ProductionFiling["icp"]> => Boolean(entry),
  );

  return (
    <footer className="redesign-footer" aria-label={copy.ariaLabel}>
      <div className="redesign-footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <Image
              className="footer-brand-logo"
              src="/images/brand/enhe-footer-wordmark.png"
              alt={locale === "en" ? "ENHE brand" : "ENHE 品牌标志"}
              width={2172}
              height={724}
            />
            <nav className="footer-social-links" aria-label={locale === "en" ? "ENHE AI social media" : "ENHE AI 社交平台"}>
              <a href="https://github.com/yangjing6213-dev/yangjing6213-dev" target="_blank" rel="noreferrer" aria-label="GitHub">
                <Github aria-hidden="true" size={20} strokeWidth={1.8} />
              </a>
              <a href="https://x.com/Amenenhe_ai" target="_blank" rel="noreferrer" aria-label="X">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                  <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.81-7.66-6.66 7.66H.44l8.6-9.83L0 1.15h7.59l5.25 6.93 6.06-6.93Zm-1.29 19.49h2.04L6.49 3.24H4.3l13.31 17.4Z" />
                </svg>
              </a>
              <a href="https://xhslink.cn/o/1cljZ63UwT1" target="_blank" rel="noreferrer" aria-label="小红书">
                <svg aria-hidden="true" viewBox="0 0 40 32" width="27" height="22">
                  <rect x="1" y="1" width="38" height="30" rx="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <text x="20" y="21" fill="currentColor" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="sans-serif">小红书</text>
                </svg>
              </a>
            </nav>
          </div>
          <EnheRedesignBrandValue locale={locale} />
          <div className="footer-navigation">
            {copy.columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <details className="footer-group">
                  <summary className="footer-group-trigger">
                    <h3>{column.title}</h3>
                    <ChevronDown aria-hidden="true" size={18} />
                  </summary>
                  <div className="footer-group-links">
                    {column.links.map((link) => (
                      <a key={link.href} href={link.href}>
                        {link.label}
                      </a>
                    ))}
                  </div>
                </details>
              </nav>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copyright-filings">
            <span>{copy.copyright}</span>
            {filingEntries.map((entry, index) => (
              <Fragment key={`${entry.label}:${entry.href ?? "text"}`}>
                {index ? <span aria-hidden="true">·</span> : null}
                {entry.href ? (
                  <a href={entry.href} target="_blank" rel="noreferrer">
                    {entry.label}
                  </a>
                ) : (
                  <span>{entry.label}</span>
                )}
              </Fragment>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
