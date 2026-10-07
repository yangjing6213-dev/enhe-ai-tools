import type { Locale } from "@/lib/dictionaries";
import {
  EnheRedesignPublicFooter,
  EnheRedesignPublicHeader,
} from "@/components/redesign/enhe-production-public-shell";

export function EnheAccountShell({
  children,
  locale,
}: React.PropsWithChildren<{ locale: Locale }>) {
  return (
    <div className="enhe-redesign-production enhe-account-shell" lang={locale}>
      <a className="redesign-skip-link" href="#main-content">
        {locale === "en" ? "Skip to main content" : "跳到主要内容"}
      </a>
      <EnheRedesignPublicHeader locale={locale} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <EnheRedesignPublicFooter locale={locale} />
    </div>
  );
}
