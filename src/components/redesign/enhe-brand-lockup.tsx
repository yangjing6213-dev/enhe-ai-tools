import Image from "next/image";

export function EnheBrandLockup({ href, label }: { href: string; label: string }) {
  return (
    <a className="redesign-brand-lockup" href={href} aria-label={label}>
      <Image
        className="redesign-brand-mark"
        src="/images/enhe-logo.svg"
        alt=""
        width={32}
        height={32}
        unoptimized
      />
      <span>ENHE AI</span>
    </a>
  );
}
