import Image from "next/image";

export function EnheBrandLockup({ href, label }: { href: string; label: string }) {
  return (
    <a className="redesign-brand-lockup" href={href} aria-label={label}>
      <Image
        className="redesign-brand-mark"
        src="/images/brand/enhe-footer-wordmark.png"
        alt=""
        width={434}
        height={145}
        unoptimized
      />
    </a>
  );
}
