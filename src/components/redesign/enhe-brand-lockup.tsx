import Image from "next/image";

export function EnheBrandLockup({ href, label }: { href: string; label: string }) {
  return (
    <a className="redesign-brand-lockup" href={href} aria-label={label}>
      <Image
        className="redesign-brand-mark"
        src="/images/enhe-logo-white.png"
        alt=""
        width={434}
        height={145}
        sizes="(max-width: 420px) 120px, 154px"
      />
    </a>
  );
}
