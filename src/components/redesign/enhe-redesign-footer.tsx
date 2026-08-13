import type { RedesignFooterColumn, RedesignLocale } from "./types";

const ZH_COLUMNS: ReadonlyArray<RedesignFooterColumn> = [
  {
    title: "帮助与服务",
    links: [
      { label: "帮助支持", href: "/about" },
      { label: "使用教程", href: "/skill-learning" },
    ],
  },
  {
    title: "合规条款",
    links: [
      { label: "用户协议", href: "/legal/user-agreement" },
      { label: "隐私政策", href: "/legal/privacy-policy" },
    ],
  },
  {
    title: "公司信息",
    links: [{ label: "品牌档案", href: "/about" }],
  },
];

const EN_COLUMNS: ReadonlyArray<RedesignFooterColumn> = [
  {
    title: "Help & support",
    links: [
      { label: "Support", href: "/en/about" },
      { label: "Tutorials", href: "/en/skill-learning" },
    ],
  },
  {
    title: "Terms & policies",
    links: [
      { label: "Terms of Use", href: "/en/legal/user-agreement" },
      { label: "Privacy Policy", href: "/en/legal/privacy-policy" },
    ],
  },
  {
    title: "Company information",
    links: [{ label: "Brand profile", href: "/en/about" }],
  },
];

export function EnheRedesignFooter({
  locale,
  brandLine,
  tagline,
  columns,
  copyright,
}: {
  locale: RedesignLocale;
  brandLine: string;
  tagline: string;
  columns?: ReadonlyArray<RedesignFooterColumn>;
  copyright: string;
}) {
  const resolvedColumns = columns ?? (locale === "en" ? EN_COLUMNS : ZH_COLUMNS);

  return (
    <footer className="redesign-footer">
      <div className="redesign-footer-inner">
        <div className="footer-grid">
          <div>
            <h2>{brandLine}</h2>
            <p>{tagline}</p>
          </div>
          {resolvedColumns.map((column) => (
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
          <p>{copyright}</p>
          <p>{locale === "en" ? "ENHE AI" : "ENHE AI"}</p>
        </div>
      </div>
    </footer>
  );
}
