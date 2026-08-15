import { Fragment } from "react";
import type { ProductionFiling } from "@/lib/production-filing";
import type { RedesignFooterCopy, RedesignLocale } from "./types";

const FOOTER_COPY: Record<RedesignLocale, RedesignFooterCopy> = {
  zh: {
    ariaLabel: "网站页脚",
    brandLine: "ENHE AI",
    brandIntro: ["一站式AI平台", "给人生加一个 AI 外挂"],
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
    brandLine: "ENHE AI",
    brandIntro: ["The All-in-One AI Platform.", "An AI upgrade for everyday life"],
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
          <div>
            <h2>{copy.brandLine}</h2>
            {copy.brandIntro.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {copy.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3>{column.title}</h3>
              {column.links.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <div className="footer-bottom">
          <p>{copy.copyright}</p>
          {filingEntries.length ? (
            <p>
              {filingEntries.map((entry, index) => (
                <Fragment key={`${entry.label}:${entry.href ?? "text"}`}>
                  {index ? " · " : null}
                  {entry.href ? (
                    <a href={entry.href} target="_blank" rel="noreferrer">
                      {entry.label}
                    </a>
                  ) : (
                    entry.label
                  )}
                </Fragment>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
