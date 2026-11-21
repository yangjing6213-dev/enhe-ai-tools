import Image from "next/image";

export function EnheBrandLockup({ href, label, mobileWhite = false }: { href: string; label: string; mobileWhite?: boolean }) {
  return (
    <a className="redesign-brand-lockup" href={href} aria-label={label}>
      <Image
        className="redesign-brand-mark redesign-brand-mark--dark"
        src="/images/brand/enhe-standard-black-preview.gif"
        alt=""
        width={800}
        height={266}
        sizes="(max-width: 420px) 156px, 200px"
        unoptimized
      />
      {mobileWhite ? <Image
        className="redesign-brand-mark redesign-brand-mark--mobile-white"
        src="/images/brand/enhe-standard-white-plain-1024.gif"
        alt=""
        width={1024}
        height={341}
        sizes="(max-width: 767px) 152px, 200px"
        unoptimized
      /> : null}
    </a>
  );
}
