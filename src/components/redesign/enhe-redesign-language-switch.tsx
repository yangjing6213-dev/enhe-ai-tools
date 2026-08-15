import type { RedesignLanguageHrefs, RedesignLocale } from "./types";

export function EnheRedesignLanguageSwitch({
  localeHrefs,
  currentLocale,
  ariaLabel,
}: {
  localeHrefs: RedesignLanguageHrefs;
  currentLocale: RedesignLocale;
  ariaLabel: string;
}) {
  return (
    <span className="redesign-language-switch" aria-label={ariaLabel}>
      <a
        className="redesign-language-link"
        href={localeHrefs.zh}
        aria-current={currentLocale === "zh" ? "page" : undefined}
        lang="zh"
      >
        中文
      </a>
      <span className="redesign-language-separator" aria-hidden="true">
        /
      </span>
      <a
        className="redesign-language-link"
        href={localeHrefs.en}
        aria-current={currentLocale === "en" ? "page" : undefined}
        lang="en"
      >
        EN
      </a>
    </span>
  );
}
