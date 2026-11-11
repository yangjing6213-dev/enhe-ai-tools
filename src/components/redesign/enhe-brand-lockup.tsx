import Image from "next/image";

export function EnheBrandLockup({ href, label }: { href: string; label: string }) {
  return (
    <a className="redesign-brand-lockup" href={href} aria-label={label}>
      <Image
        className="redesign-brand-mark"
        src="/images/brand/enhe-standard-black-preview.gif"
        alt=""
        width={800}
        height={266}
        sizes="(max-width: 420px) 156px, 200px"
        unoptimized
      />
    </a>
  );
}
