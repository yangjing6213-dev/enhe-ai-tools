import Image from "next/image";

export function PageCover({ src, alt }: { src: string; alt: string }) {
  return (
    <section className="enhe-page-cover" aria-label={alt}>
      <Image
        src={src}
        alt={alt}
        fill
        priority
        unoptimized
        sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1159px) calc(100vw - 40px), 1120px"
        className="enhe-page-cover-image"
      />
    </section>
  );
}
