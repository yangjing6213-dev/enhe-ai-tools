import Image from "next/image";

export function EnheBrandLockup({ href, label }: { href: string; label: string }) {
  return (
    <a className="redesign-brand-lockup" href={href} aria-label={label}>
      <Image
        className="redesign-brand-mark"
        src="/images/brand/enhe-infinity-animated-transparent.svg"
        alt=""
        width={1820}
        height={608}
        sizes="(max-width: 420px) 120px, 154px"
        unoptimized
      />
    </a>
  );
}
