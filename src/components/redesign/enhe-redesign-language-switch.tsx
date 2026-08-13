import type { RedesignLocale } from "./types";

export function EnheRedesignLanguageSwitch({
  currentHref,
  alternateHref,
  currentLabel,
  alternateLabel,
  currentLocale,
  alternateLocale,
  ariaLabel,
}: {
  currentHref: string;
  alternateHref: string;
  currentLabel: string;
  alternateLabel: string;
  currentLocale: RedesignLocale;
  alternateLocale: RedesignLocale;
  ariaLabel: string;
}) {
  return (
    <span className="redesign-language-switch" aria-label={ariaLabel}>
      <a className="redesign-language-link" href={currentHref} aria-current="page" lang={currentLocale}>
        {currentLabel}
      </a>
      <span className="redesign-language-separator" aria-hidden="true">
        /
      </span>
      <a className="redesign-language-link" href={alternateHref} lang={alternateLocale}>
        {alternateLabel}
      </a>
    </span>
  );
}
