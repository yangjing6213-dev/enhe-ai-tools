type FlatEnheLogoSvgProps = {
  className?: string;
  decorative?: boolean;
  label?: string;
};

export function FlatEnheLogoSvg({
  className,
  decorative = false,
  label = "ENHE AI"
}: FlatEnheLogoSvgProps) {
  return (
    <svg
      className={className}
      viewBox="0 -5 560 360"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : label}
    >
      <defs>
        <linearGradient id="referenceHeroLogoCyan" x1="111" y1="58" x2="331" y2="198" gradientUnits="userSpaceOnUse">
          <stop stopColor="#20BFF0" />
          <stop offset="0.58" stopColor="#55D9F8" />
          <stop offset="1" stopColor="#8BF5FF" />
        </linearGradient>
        <linearGradient id="referenceHeroLogoWhite" x1="160" y1="48" x2="502" y2="336" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.58" stopColor="#F7FAFF" />
          <stop offset="1" stopColor="#DDEBFF" />
        </linearGradient>
        <filter id="referenceHeroLogoGlow" x="-16%" y="-22%" width="132%" height="144%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.32 0 0 0 0 0.84 0 0 0 0 0.98 0 0 0 0.18 0"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="enhe-reference-logo" filter="url(#referenceHeroLogoGlow)">
        <rect className="enhe-reference-logo-slat enhe-reference-logo-slat-top" x="111" y="58" width="220" height="54" rx="1.5" fill="url(#referenceHeroLogoCyan)" />
        <rect className="enhe-reference-logo-slat enhe-reference-logo-slat-mid" x="111" y="148" width="168" height="54" rx="1.5" fill="url(#referenceHeroLogoCyan)" />
        <rect className="enhe-reference-logo-slat enhe-reference-logo-slat-bottom" x="111" y="238" width="220" height="54" rx="1.5" fill="url(#referenceHeroLogoWhite)" />
        <path className="enhe-flat-logo-stem" d="M381 58H449V292H381V202H329V148H381V58Z" fill="url(#referenceHeroLogoWhite)" />
      </g>
    </svg>
  );
}

export function HeroLogoMark({ label }: { label: string }) {
  return (
    <div className="enhe-hero-logo-button" role="img" aria-label={label}>
      <FlatEnheLogoSvg className="enhe-hero-logo-svg" label={label} />
    </div>
  );
}
